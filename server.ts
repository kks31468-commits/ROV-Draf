import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Initialize Express & HTTP server
const app = express();
app.use(express.json({ limit: '20mb' }));

const server = http.createServer(app);

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Real-Time Room Storage
export interface RoomDraftState {
  blueBans: (string | null)[];
  redBans: (string | null)[];
  bluePicks: {
    dsl: string | null;
    jg: string | null;
    mid: string | null;
    adl: string | null;
    sp: string | null;
  };
  redPicks: {
    dsl: string | null;
    jg: string | null;
    mid: string | null;
    adl: string | null;
    sp: string | null;
  };
  activeTeam: 'blue' | 'red';
  activeAction: 'ban' | 'pick';
  targetLane: 'dsl' | 'jg' | 'mid' | 'adl' | 'sp';
  phase: string;
}

interface RoomRecord {
  code: string;
  hostWs: WebSocket | null;
  spectators: Set<WebSocket>;
  draftState: RoomDraftState;
  lastFrame: string | null;
  createdAt: number;
  lastActive: number;
}

const rooms = new Map<string, RoomRecord>();

// Helper to generate readable 4-digit code e.g. "ROV-8392"
function generateRoomCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `ROV-${num}`;
}

function getDefaultDraftState(): RoomDraftState {
  return {
    blueBans: [null, null, null, null, null],
    redBans: [null, null, null, null, null],
    bluePicks: { dsl: null, jg: null, mid: null, adl: null, sp: null },
    redPicks: { dsl: null, jg: null, mid: null, adl: null, sp: null },
    activeTeam: 'blue',
    activeAction: 'ban',
    targetLane: 'adl',
    phase: 'Ban Phase 1',
  };
}

// WebSocket Server attached to the same HTTP server on port 3000
const wss = new WebSocketServer({ server, path: '/api/ws' });

interface ClientMeta {
  roomCode?: string;
  role?: 'host' | 'spectator';
  isAlive: boolean;
}

const clientMetaMap = new WeakMap<WebSocket, ClientMeta>();

wss.on('connection', (ws: WebSocket) => {
  clientMetaMap.set(ws, { isAlive: true });

  ws.on('pong', () => {
    const meta = clientMetaMap.get(ws);
    if (meta) meta.isAlive = true;
  });

  ws.on('message', async (rawData: string) => {
    try {
      const data = JSON.parse(rawData.toString());
      const meta = clientMetaMap.get(ws) || { isAlive: true };

      // 1. Create Room (Host creates room from mobile)
      if (data.type === 'create_room') {
        let code = generateRoomCode();
        while (rooms.has(code)) {
          code = generateRoomCode();
        }

        const room: RoomRecord = {
          code,
          hostWs: ws,
          spectators: new Set(),
          draftState: getDefaultDraftState(),
          lastFrame: null,
          createdAt: Date.now(),
          lastActive: Date.now(),
        };

        rooms.set(code, room);
        meta.roomCode = code;
        meta.role = 'host';
        clientMetaMap.set(ws, meta);

        ws.send(
          JSON.stringify({
            type: 'room_created',
            roomCode: code,
            draftState: room.draftState,
          })
        );
        return;
      }

      // 2. Join Room (Tablet joins as spectator or Host reconnects)
      if (data.type === 'join_room') {
        const rawCode = String(data.roomCode || '').trim().toUpperCase();
        // Support with or without ROV- prefix
        const code = rawCode.startsWith('ROV-') ? rawCode : `ROV-${rawCode}`;
        const room = rooms.get(code);

        if (!room) {
          ws.send(
            JSON.stringify({
              type: 'error',
              message: `ไม่พบห้อง ${code} กรุณาตรวจสอบรหัสห้องบนมือถือ`,
            })
          );
          return;
        }

        const role = data.role === 'host' ? 'host' : 'spectator';
        meta.roomCode = code;
        meta.role = role;
        clientMetaMap.set(ws, meta);

        if (role === 'host') {
          room.hostWs = ws;
        } else {
          room.spectators.add(ws);
        }
        room.lastActive = Date.now();

        // Send current room state to newly joined client
        ws.send(
          JSON.stringify({
            type: 'room_joined',
            roomCode: code,
            role,
            draftState: room.draftState,
            lastFrame: room.lastFrame,
            spectatorCount: room.spectators.size,
            hostConnected: !!(room.hostWs && room.hostWs.readyState === WebSocket.OPEN),
          })
        );

        // Notify room of presence update
        broadcastToRoom(room, {
          type: 'presence_update',
          spectatorCount: room.spectators.size,
          hostConnected: !!(room.hostWs && room.hostWs.readyState === WebSocket.OPEN),
        });
        return;
      }

      // 3. Screen Frame Broadcast (Host streams screen frame -> Tablet spectators)
      if (data.type === 'screen_frame') {
        const code = meta.roomCode || data.roomCode;
        if (!code) return;
        const room = rooms.get(code);
        if (!room) return;

        room.lastFrame = data.frame;
        room.lastActive = Date.now();

        // Broadcast frame directly to all spectators in the room
        const frameMsg = JSON.stringify({
          type: 'screen_frame',
          frame: data.frame,
          timestamp: Date.now(),
        });

        for (const spec of room.spectators) {
          if (spec.readyState === WebSocket.OPEN) {
            spec.send(frameMsg);
          }
        }
        return;
      }

      // 4. Draft State Update (Host or Tablet updates pick/ban)
      if (data.type === 'update_draft') {
        const code = meta.roomCode || data.roomCode;
        if (!code) return;
        const room = rooms.get(code);
        if (!room) return;

        if (data.draftState) {
          room.draftState = { ...room.draftState, ...data.draftState };
          room.lastActive = Date.now();

          // Broadcast to everyone in the room (both host & spectators)
          broadcastToRoom(room, {
            type: 'draft_updated',
            draftState: room.draftState,
            sourceRole: meta.role,
          });
        }
        return;
      }

      // 5. Ping / Pong
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', time: Date.now() }));
        return;
      }
    } catch (err) {
      console.error('WebSocket message handling error:', err);
    }
  });

  ws.on('close', () => {
    const meta = clientMetaMap.get(ws);
    if (!meta || !meta.roomCode) return;

    const room = rooms.get(meta.roomCode);
    if (!room) return;

    if (meta.role === 'host') {
      if (room.hostWs === ws) {
        room.hostWs = null;
      }
    } else {
      room.spectators.delete(ws);
    }

    // Broadcast updated presence
    broadcastToRoom(room, {
      type: 'presence_update',
      spectatorCount: room.spectators.size,
      hostConnected: !!(room.hostWs && room.hostWs.readyState === WebSocket.OPEN),
    });

    // Auto-clean room if completely empty after 2 hours
    if (!room.hostWs && room.spectators.size === 0) {
      setTimeout(() => {
        const r = rooms.get(meta.roomCode!);
        if (r && !r.hostWs && r.spectators.size === 0) {
          rooms.delete(meta.roomCode!);
        }
      }, 1000 * 60 * 60 * 2);
    }
  });
});

function broadcastToRoom(room: RoomRecord, msg: any) {
  const payload = JSON.stringify(msg);
  if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
    room.hostWs.send(payload);
  }
  for (const spec of room.spectators) {
    if (spec.readyState === WebSocket.OPEN) {
      spec.send(payload);
    }
  }
}

// Keep-alive heartbeat every 25s
setInterval(() => {
  wss.clients.forEach((ws) => {
    const meta = clientMetaMap.get(ws);
    if (!meta) return;
    if (!meta.isAlive) {
      ws.terminate();
      return;
    }
    meta.isAlive = false;
    ws.ping();
  });
}, 25000);

// API Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    activeRooms: rooms.size,
    timestamp: Date.now(),
  });
});

app.get('/api/room/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms.get(code) || rooms.get(`ROV-${code}`);
  if (!room) {
    return res.status(404).json({ exists: false });
  }
  return res.json({
    exists: true,
    code: room.code,
    spectatorCount: room.spectators.size,
    hostConnected: !!(room.hostWs && room.hostWs.readyState === WebSocket.OPEN),
    hasFrame: !!room.lastFrame,
  });
});

// Gemini Vision Screen Scan Endpoint
app.post('/api/ai/scan-screen', async (req, res) => {
  try {
    const { imageBase64, currentDraftState } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64' });
    }

    if (!ai) {
      // Fallback if no Gemini key: provide smart heuristic draft response
      return res.json({
        success: true,
        detectedHeroes: [],
        coachingAdvice: 'โหมดระบบออฟไลน์: กรุณาเลือกฮีโร่บนกระดานเพื่อวิเคราะห์เคาน์เตอร์และคอมโบแบบทันที',
      });
    }

    // Clean base64 prefix
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `You are an elite Arena of Valor / RoV esports draft analyst.
Analyze this game screenshot from an RoV match or draft screen.
1. Identify any RoV heroes visible in the draft slots (Blue team picks/bans, Red team picks/bans).
2. Give 2-3 short, actionable tactical drafting tips in Thai (ภาษาไทย) for the current draft situation (e.g. recommend counter picks, highlight synergy combos, point out team damage vulnerability).
Format your response as valid JSON with keys:
{
  "detectedHeroes": [
    { "name": "EnglishHeroName", "team": "blue"|"red", "type": "pick"|"ban", "lane": "dsl"|"jg"|"mid"|"adl"|"sp" }
  ],
  "coachingAdvice": "คำแนะนำแบบสั้นกระชับเป็นภาษาไทย",
  "priorityThreat": "ฮีโร่ฝ่ายตรงข้ามที่อันตรายที่สุดและตัวแก้ทาง"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: cleanBase64,
          },
        },
        prompt,
      ],
    });

    const text = response.text || '';
    let parsed: any = null;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      parsed = { coachingAdvice: text };
    }

    return res.json({
      success: true,
      analysis: parsed || { coachingAdvice: text },
    });
  } catch (error: any) {
    console.error('AI Screen Scan Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to scan screen',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 RoV Meta Drafter server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
