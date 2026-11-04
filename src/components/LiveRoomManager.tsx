import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Tv,
  ArrowRight,
  Sparkles,
  QrCode,
  ShieldCheck,
  Zap,
  Wifi,
  HelpCircle,
} from 'lucide-react';
import { LiveMobileBroadcaster } from './LiveMobileBroadcaster';
import { LiveTabletCoach } from './LiveTabletCoach';
import { realtimeClient } from '../utils/realtimeClient';
import { Hero, Lane } from '../types/rov';
import { ALL_HEROES } from '../data/allHeroes';

interface Props {
  onSelectHeroDetail?: (hero: Hero) => void;
  draftState: {
    blueBans: (Hero | null)[];
    redBans: (Hero | null)[];
    bluePicks: Record<Lane, Hero | null>;
    redPicks: Record<Lane, Hero | null>;
    activeTeam: 'blue' | 'red';
    activeAction: 'ban' | 'pick';
  };
  onUpdateDraftState: (state: any) => void;
}

export const LiveRoomManager: React.FC<Props> = ({
  onSelectHeroDetail,
  draftState,
  onUpdateDraftState,
}) => {
  const [activeMode, setActiveMode] = useState<'lobby' | 'host' | 'spectator'>('lobby');
  const [roomCode, setRoomCode] = useState<string>('');
  const [joinInputCode, setJoinInputCode] = useState<string>('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Check URL query parameters for direct QR scan join (?room=ROV-1234&role=spectator)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get('room');
    const urlRole = params.get('role');

    if (urlRoom) {
      setRoomCode(urlRoom.toUpperCase());
      if (urlRole === 'spectator') {
        joinAsSpectator(urlRoom.toUpperCase());
      }
    }

    const unsubCreated = realtimeClient.on('room_created', (data) => {
      if (data.roomCode) {
        setRoomCode(data.roomCode);
        setActiveMode('host');
        setIsConnecting(false);
      }
    });

    const unsubJoined = realtimeClient.on('room_joined', (data) => {
      if (data.roomCode) {
        setRoomCode(data.roomCode);
        setActiveMode(data.role === 'host' ? 'host' : 'spectator');
        setIsConnecting(false);
      }
    });

    const unsubError = realtimeClient.on('error', (err) => {
      setJoinError(err.message || 'ไม่สามารถเข้าร่วมห้องได้');
      setIsConnecting(false);
    });

    return () => {
      unsubCreated();
      unsubJoined();
      unsubError();
    };
  }, []);

  // Host: Create New Room from Mobile
  const handleCreateRoom = async () => {
    setIsConnecting(true);
    setJoinError(null);
    try {
      const code = await realtimeClient.createRoom();
      if (code) {
        setRoomCode(code);
        setActiveMode('host');
        setIsConnecting(false);
      }
    } catch (err: any) {
      setJoinError(err.message || 'สร้างห้องไม่สำเร็จ');
      setIsConnecting(false);
    }
  };

  // Spectator: Join Room from Tablet
  const joinAsSpectator = async (codeToJoin?: string) => {
    const targetCode = (codeToJoin || joinInputCode).trim().toUpperCase();
    if (!targetCode) {
      setJoinError('กรุณากรอกรหัสห้อง เช่น ROV-1234 หรือเลข 4 หลัก');
      return;
    }

    setIsConnecting(true);
    setJoinError(null);
    try {
      await realtimeClient.joinRoom(targetCode, 'spectator');
      setRoomCode(targetCode);
      setActiveMode('spectator');
      setIsConnecting(false);
    } catch (err: any) {
      setJoinError(err.message || 'เข้าห้องไม่สำเร็จ');
      setIsConnecting(false);
    }
  };

  const handleLeaveRoom = () => {
    realtimeClient.disconnect();
    setActiveMode('lobby');
    setRoomCode('');
    setJoinInputCode('');
  };

  // If already in host mode (Mobile View)
  if (activeMode === 'host' && roomCode) {
    return (
      <LiveMobileBroadcaster
        roomCode={roomCode}
        onSwitchToSpectator={(code) => joinAsSpectator(code)}
        draftState={draftState}
        onUpdateDraftState={onUpdateDraftState}
      />
    );
  }

  // If already in spectator mode (Tablet View)
  if (activeMode === 'spectator' && roomCode) {
    return (
      <LiveTabletCoach
        roomCode={roomCode}
        onLeaveRoom={handleLeaveRoom}
        draftState={draftState}
        onUpdateDraftState={onUpdateDraftState}
        onSelectHeroDetail={onSelectHeroDetail}
      />
    );
  }

  // Lobby: Choose device role
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title & Introduction */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ระบบจับคู่อุปกรณ์ 2 หน้าจอ (Dual-Device Live AI Coach)</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
          แชร์จอจากมือถือ 📱 แล้วดู AI ช่วยดราฟท์บนแท็บเล็ต 🖥️
        </h2>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">
          เปิดเกม RoV บนมือถือแล้วแชร์ภาพหน้าจอ ระบบจะส่งภาพสดไปยังแท็บเล็ตพร้อมวิเคราะห์เคาน์เตอร์พิคและคอมโบให้ทันที
        </p>
      </div>

      {joinError && (
        <div className="p-3 bg-rose-950/70 border border-rose-800/80 rounded-xl text-rose-300 text-xs text-center font-medium">
          {joinError}
        </div>
      )}

      {/* Two Role Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Mobile Phone (Broadcaster) */}
        <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all group">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
              <Smartphone className="w-6 h-6" />
            </div>

            <div>
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                สำหรับเครื่องเล่นเกม
              </span>
              <h3 className="text-xl font-bold text-white mt-0.5">
                ฉันใช้ "มือถือ" (ส่งภาพหน้าจอ)
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                สร้างห้องเพื่อรับรหัสและ QR Code จากนั้นกดปุ่มแชร์หน้าจอมือถือ (หรือใช้กล้องส่องจอ)
                ภาพจะถูกส่งไปยังแท็บเล็ตของคุณแบบสดๆ
              </p>
            </div>

            <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                สร้างห้องดราฟท์คู่หูได้ทันที
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                มี QR Code ให้แท็บเล็ตสแกนเข้าใน 2 วินาที
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                แชร์จอตรง หรือเปิดกล้องส่องจอได้ตามสะดวก
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <button
              onClick={handleCreateRoom}
              disabled={isConnecting}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-sky-900/30 flex items-center justify-center gap-2 transition-all"
            >
              <Smartphone className="w-4 h-4" />
              <span>{isConnecting ? 'กำลังสร้างห้อง...' : 'สร้างห้องส่งจอ (โหมดมือถือ)'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card 2: Tablet (Spectator & AI Coach) */}
        <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all group">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
              <Tv className="w-6 h-6" />
            </div>

            <div>
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                สำหรับเครื่องโค้ชผู้ช่วย
              </span>
              <h3 className="text-xl font-bold text-white mt-0.5">
                ฉันใช้ "แท็บเล็ต" (ดูจอมือถือ & AI วิเคราะห์)
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                เข้าห้องเพื่อรับชมภาพถ่ายทอดสดจากมือถือ พร้อมให้ AI Vision สแกนฮีโร่
                และคำนวณตัวแก้ทาง (Counter) + คอมโบแนะนำแบบเรียลไทม์
              </p>
            </div>

            {/* Input Room Code */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-slate-300">
                ใส่รหัสห้องที่แสดงบนหน้าจอมือถือ:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="เช่น ROV-1234 หรือ 1234"
                  value={joinInputCode}
                  onChange={(e) => setJoinInputCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && joinAsSpectator()}
                  className="flex-1 bg-slate-950 border border-slate-700 focus:border-indigo-500 text-white font-mono text-sm uppercase px-3 py-2.5 rounded-xl outline-none"
                />
                <button
                  onClick={() => joinAsSpectator()}
                  disabled={isConnecting || !joinInputCode.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors shrink-0"
                >
                  เข้าห้อง
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 text-center">
            <span className="text-[11px] text-slate-400">
              หรือใช้กล้องบนแท็บเล็ตส่อง QR Code ที่ปรากฏบนมือถือเพื่อเข้าห้องอัตโนมัติ
            </span>
          </div>
        </div>
      </div>

      {/* Guide step-by-step footer */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-200 font-semibold">
          <HelpCircle className="w-4 h-4 text-sky-400 shrink-0" />
          <span>ขั้นตอนการใช้งานง่ายๆ:</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-slate-300">
          <span>1. มือถือสร้างห้อง</span>
          <span className="text-slate-600">→</span>
          <span>2. แท็บเล็ตส่อง QR</span>
          <span className="text-slate-600">→</span>
          <span>3. มือถือกดแชร์หน้าจอ</span>
          <span className="text-slate-600">→</span>
          <span className="text-emerald-400 font-semibold">4. แท็บเล็ตดูสดและรับคำแนะนำ AI ทันที!</span>
        </div>
      </div>
    </div>
  );
};
