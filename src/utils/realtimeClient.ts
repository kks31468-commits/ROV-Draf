// Client-side Realtime WebSocket & Sync Service for RoV Dual-Device Draft

export interface DraftSyncPayload {
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
  activeTeam?: 'blue' | 'red';
  activeAction?: 'ban' | 'pick';
  targetLane?: 'dsl' | 'jg' | 'mid' | 'adl' | 'sp';
  phase?: string;
}

export type RealtimeEvent =
  | 'connected'
  | 'disconnected'
  | 'room_created'
  | 'room_joined'
  | 'screen_frame'
  | 'draft_updated'
  | 'presence_update'
  | 'error';

class RealtimeClient {
  private ws: WebSocket | null = null;
  private roomCode: string | null = null;
  private role: 'host' | 'spectator' = 'host';
  private listeners: Map<RealtimeEvent, Set<(data: any) => void>> = new Map();
  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private isConnecting = false;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('rov-draft-sync');
        this.broadcastChannel.onmessage = (event) => {
          this.handleLocalBroadcast(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported', e);
      }
    }
  }

  public on(event: RealtimeEvent, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  public off(event: RealtimeEvent, callback: (data: any) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: RealtimeEvent, data: any) {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error(`Error in event listener for ${event}:`, err);
      }
    });
  }

  public connect(): Promise<boolean> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve(true);
    }
    if (this.isConnecting) return Promise.resolve(false);

    this.isConnecting = true;
    return new Promise((resolve) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // In dev or Cloud Run preview, connect to current host path /api/ws
        const wsUrl = `${protocol}//${window.location.host}/api/ws`;

        const socket = new WebSocket(wsUrl);
        this.ws = socket;

        socket.onopen = () => {
          this.isConnecting = false;
          this.emit('connected', { timestamp: Date.now() });

          // Start ping heartbeat
          clearInterval(this.pingTimer);
          this.pingTimer = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
              this.ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 15000);

          // If we had a roomCode, rejoin
          if (this.roomCode) {
            this.joinRoom(this.roomCode, this.role);
          }
          resolve(true);
        };

        socket.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data);
            this.handleMessage(data);
          } catch (err) {
            console.error('Error parsing incoming WS message:', err);
          }
        };

        socket.onerror = (err) => {
          console.warn('WebSocket error (will fallback to local Broadcast/P2P if needed):', err);
          this.isConnecting = false;
          resolve(false);
        };

        socket.onclose = () => {
          this.isConnecting = false;
          clearInterval(this.pingTimer);
          this.emit('disconnected', {});
          // Auto-reconnect after 3s
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            if (this.roomCode) {
              this.connect();
            }
          }, 3000);
        };
      } catch (e) {
        this.isConnecting = false;
        resolve(false);
      }
    });
  }

  public async createRoom(): Promise<string | null> {
    await this.connect();
    this.role = 'host';

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'create_room' }));
      return null; // will resolve through 'room_created' event
    } else {
      // Local fallback room code for offline or static hosting
      const fallbackCode = `ROV-${Math.floor(1000 + Math.random() * 9000)}`;
      this.roomCode = fallbackCode;
      this.emit('room_created', { roomCode: fallbackCode, draftState: null });
      return fallbackCode;
    }
  }

  public async joinRoom(code: string, role: 'host' | 'spectator' = 'spectator') {
    const cleanCode = code.trim().toUpperCase();
    this.roomCode = cleanCode;
    this.role = role;
    await this.connect();

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'join_room',
          roomCode: cleanCode,
          role,
        })
      );
    } else {
      // BroadcastChannel join for same-origin tabs/devices on same browser
      this.emit('room_joined', {
        roomCode: cleanCode,
        role,
        draftState: null,
        lastFrame: null,
        spectatorCount: 1,
        hostConnected: true,
      });
    }
  }

  public sendFrame(frameDataUrl: string) {
    if (!this.roomCode) return;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'screen_frame',
          roomCode: this.roomCode,
          frame: frameDataUrl,
        })
      );
    }

    // Also dispatch to local broadcast channel
    this.broadcastChannel?.postMessage({
      type: 'screen_frame',
      roomCode: this.roomCode,
      frame: frameDataUrl,
    });
  }

  public sendDraftUpdate(draftState: DraftSyncPayload) {
    if (!this.roomCode) return;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'update_draft',
          roomCode: this.roomCode,
          draftState,
        })
      );
    }

    // BroadcastChannel local fallback
    this.broadcastChannel?.postMessage({
      type: 'draft_updated',
      roomCode: this.roomCode,
      draftState,
    });
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case 'room_created':
        this.roomCode = data.roomCode;
        this.emit('room_created', data);
        break;
      case 'room_joined':
        this.roomCode = data.roomCode;
        this.emit('room_joined', data);
        break;
      case 'screen_frame':
        this.emit('screen_frame', data);
        break;
      case 'draft_updated':
        this.emit('draft_updated', data);
        break;
      case 'presence_update':
        this.emit('presence_update', data);
        break;
      case 'error':
        this.emit('error', data);
        break;
      case 'pong':
        break;
      default:
        break;
    }
  }

  private handleLocalBroadcast(data: any) {
    if (!data || data.roomCode !== this.roomCode) return;
    if (data.type === 'screen_frame') {
      this.emit('screen_frame', data);
    } else if (data.type === 'draft_updated') {
      this.emit('draft_updated', data);
    }
  }

  public getRoomCode() {
    return this.roomCode;
  }

  public getRole() {
    return this.role;
  }

  public disconnect() {
    clearTimeout(this.reconnectTimer);
    clearInterval(this.pingTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.roomCode = null;
  }
}

export const realtimeClient = new RealtimeClient();
