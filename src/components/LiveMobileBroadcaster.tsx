import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  Video,
  Camera,
  Upload,
  Play,
  Pause,
  Copy,
  Check,
  Users,
  Wifi,
  Sparkles,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Eye,
  Search,
  Swords,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { realtimeClient, DraftSyncPayload } from '../utils/realtimeClient';
import { Hero, Lane } from '../types/rov';
import { ALL_HEROES, LANE_CONFIG } from '../data/allHeroes';
import { HeroAvatar } from './HeroAvatar';

interface Props {
  roomCode: string;
  onSwitchToSpectator: (code: string) => void;
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

export const LiveMobileBroadcaster: React.FC<Props> = ({
  roomCode,
  onSwitchToSpectator,
  draftState,
  onUpdateDraftState,
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamMode, setStreamMode] = useState<'screen' | 'camera' | 'demo' | null>(null);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [previewFrame, setPreviewFrame] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasDisplayMedia, setHasDisplayMedia] = useState(true);

  // Quick Draft selector on mobile
  const [quickSearch, setQuickSearch] = useState('');
  const [quickTeam, setQuickTeam] = useState<'blue' | 'red'>('blue');
  const [quickAction, setQuickAction] = useState<'pick' | 'ban'>('pick');
  const [quickLane, setQuickLane] = useState<Lane>('adl');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureIntervalRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Detect getDisplayMedia support
  useEffect(() => {
    const isSupported =
      typeof navigator !== 'undefined' &&
      !!(navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function');
    setHasDisplayMedia(isSupported);
  }, []);

  // Generate QR code for tablet to join
  useEffect(() => {
    if (!roomCode) return;
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('room', roomCode);
    currentUrl.searchParams.set('role', 'spectator');
    currentUrl.searchParams.set('tab', 'live');

    QRCode.toDataURL(currentUrl.toString(), {
      width: 240,
      margin: 1,
      color: { dark: '#0284c7', light: '#0f172a' },
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error('QR Gen error:', err));
  }, [roomCode]);

  // Listen to presence updates
  useEffect(() => {
    const unsubPresence = realtimeClient.on('presence_update', (data) => {
      if (typeof data.spectatorCount === 'number') {
        setSpectatorCount(data.spectatorCount);
      }
    });

    const unsubDraft = realtimeClient.on('draft_updated', (data) => {
      if (data.draftState) {
        onUpdateDraftState(data.draftState);
      }
    });

    return () => {
      unsubPresence();
      unsubDraft();
      stopStreaming();
    };
  }, []);

  const copyRoomLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomCode);
    url.searchParams.set('role', 'spectator');
    url.searchParams.set('tab', 'live');
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Start Screen Sharing with multiple fallbacks
  const startScreenShare = async () => {
    setErrorMessage(null);
    try {
      const nav = navigator as any;
      const getDisplay =
        navigator.mediaDevices?.getDisplayMedia?.bind(navigator.mediaDevices) ||
        nav.getDisplayMedia?.bind(nav);

      if (!getDisplay) {
        throw new Error(
          'มือถือระบบนี้ไม่อนุญาตให้เว็บแชร์หน้าจอของแอปเกม RoV ทางออกที่ดีที่สุดคือใช้ปุ่ม "เปิดกล้องส่องจอ" หรือ "แคปรูปหน้าจอส่ง" ด้านล่างครับ'
        );
      }

      let mediaStream: MediaStream | null = null;
      try {
        mediaStream = await getDisplay({
          video: true,
          audio: false,
        });
      } catch (err1) {
        // Retry with relaxed constraints
        mediaStream = await getDisplay({
          video: { frameRate: { ideal: 5, max: 10 } },
        });
      }

      if (!mediaStream) {
        throw new Error('ไม่สามารถเข้าถึงหน้าจอได้');
      }

      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      setStreamMode('screen');
      setIsStreaming(true);
      startFrameCapture();

      // Listen for stream stop
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          stopStreaming();
        };
      }
    } catch (err: any) {
      console.warn('Screen share failed:', err);
      setErrorMessage(
        err.message ||
          'ระบบของมือถือไม่อนุญาตให้เบราว์เซอร์แชร์หน้าจอแอปเกม แนะนำให้ใช้ปุ่ม "เปิดกล้องส่องจอ" หรือ "อัปโหลดภาพแคปหน้าจอ" แทนครับ'
      );
    }
  };

  // Start Camera Stream (Super reliable on all phones)
  const startCameraStream = async () => {
    setErrorMessage(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('ไม่สามารถเปิดกล้องบนเบราว์เซอร์นี้ได้');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      setStreamMode('camera');
      setIsStreaming(true);
      startFrameCapture();
    } catch (err: any) {
      console.warn('Camera start failed:', err);
      setErrorMessage(
        'กรุณากดยินยอมให้เว็บใช้กล้อง (Permission) หรือใช้ตัวเลือกส่งรูปแคปหน้าจอแทน'
      );
    }
  };

  // Start Demo Stream
  const startDemoStream = () => {
    setErrorMessage(null);
    setIsStreaming(true);
    setStreamMode('demo');

    const demoCanvas = document.createElement('canvas');
    demoCanvas.width = 720;
    demoCanvas.height = 405;
    const ctx = demoCanvas.getContext('2d');

    let tick = 0;
    clearInterval(captureIntervalRef.current);
    captureIntervalRef.current = setInterval(() => {
      if (!ctx) return;
      tick++;

      // Background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 720, 405);
      const grad = ctx.createLinearGradient(0, 0, 720, 405);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e1b4b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 720, 405);

      // Header Banner
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(150, 10, 420, 38);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RoV BAN & PICK PHASE 1 (LIVE DEMO)', 360, 34);

      // Blue Team Slots (Left)
      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('BLUE TEAM', 30, 75);

      const blueHeroes = ['Florentino', 'Nakroth', 'Liliana', 'Hayate', 'Helen'];
      blueHeroes.forEach((name, i) => {
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.fillRect(30, 90 + i * 55, 180, 45);
        ctx.strokeRect(30, 90 + i * 55, 180, 45);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(name, 50, 118 + i * 55);
      });

      // Red Team Slots (Right)
      ctx.fillStyle = '#e11d48';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('RED TEAM', 690, 75);

      const redHeroes = ['Yena', 'Aoi', 'Tulen', 'Capheny', 'Teeri'];
      redHeroes.forEach((name, i) => {
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#e11d48';
        ctx.lineWidth = 2;
        ctx.fillRect(510, 90 + i * 55, 180, 45);
        ctx.strokeRect(510, 90 + i * 55, 180, 45);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(name, 670, 118 + i * 55);
      });

      // Timer
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      const sec = Math.max(0, 30 - (tick % 30));
      ctx.fillText(`00:${sec < 10 ? '0' : ''}${sec}`, 360, 200);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('🔴 สตรีมสดจากมือถือ (Live Test Stream)', 360, 230);

      const dataUrl = demoCanvas.toDataURL('image/jpeg', 0.65);
      setPreviewFrame(dataUrl);
      setFrameCount((prev) => prev + 1);
      realtimeClient.sendFrame(dataUrl);
    }, 1500);
  };

  // Continuous frame capture loop
  const startFrameCapture = () => {
    clearInterval(captureIntervalRef.current);

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    captureIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !ctx || videoRef.current.readyState < 2) return;

      const video = videoRef.current;
      const vWidth = video.videoWidth || 720;
      const vHeight = video.videoHeight || 405;

      const targetWidth = Math.min(640, vWidth);
      const targetHeight = Math.round((vHeight / vWidth) * targetWidth);

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

      const frameData = canvas.toDataURL('image/jpeg', 0.6);
      setPreviewFrame(frameData);
      setFrameCount((prev) => prev + 1);

      realtimeClient.sendFrame(frameData);
    }, 1500);
  };

  const stopStreaming = () => {
    clearInterval(captureIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setStreamMode(null);
  };

  // Handle Snapshot File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPreviewFrame(dataUrl);
      setFrameCount((prev) => prev + 1);
      realtimeClient.sendFrame(dataUrl);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  // Mobile Quick-Tap Draft selection
  const handleQuickHeroSelect = (hero: Hero) => {
    if (quickAction === 'ban') {
      if (quickTeam === 'blue') {
        const nextBans = [...draftState.blueBans];
        const emptyIdx = nextBans.findIndex((b) => b === null);
        if (emptyIdx !== -1) {
          nextBans[emptyIdx] = hero;
        } else {
          nextBans[0] = hero;
        }
        const updated = { ...draftState, blueBans: nextBans };
        onUpdateDraftState(updated);
        realtimeClient.sendDraftUpdate(updated as any);
      } else {
        const nextBans = [...draftState.redBans];
        const emptyIdx = nextBans.findIndex((b) => b === null);
        if (emptyIdx !== -1) {
          nextBans[emptyIdx] = hero;
        } else {
          nextBans[0] = hero;
        }
        const updated = { ...draftState, redBans: nextBans };
        onUpdateDraftState(updated);
        realtimeClient.sendDraftUpdate(updated as any);
      }
    } else {
      // Pick for specific lane
      if (quickTeam === 'blue') {
        const nextPicks = { ...draftState.bluePicks, [quickLane]: hero };
        const updated = { ...draftState, bluePicks: nextPicks };
        onUpdateDraftState(updated);
        realtimeClient.sendDraftUpdate(updated as any);
      } else {
        const nextPicks = { ...draftState.redPicks, [quickLane]: hero };
        const updated = { ...draftState, redPicks: nextPicks };
        onUpdateDraftState(updated);
        realtimeClient.sendDraftUpdate(updated as any);
      }
    }
  };

  const filteredHeroes = ALL_HEROES.filter((h) => {
    if (!quickSearch) return true;
    const q = quickSearch.toLowerCase();
    return (
      h.name.toLowerCase().includes(q) ||
      h.nameTh.toLowerCase().includes(q) ||
      h.primaryLane.toLowerCase().includes(q) ||
      h.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Hidden Video element for video capture */}
      <video ref={videoRef} playsInline muted autoPlay className="hidden" />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 border border-sky-800/50 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-500/20 border border-sky-400/40 rounded-xl text-sky-400">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                  โหมดมือถือ (Mobile Broadcaster)
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ห้องพร้อม
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                รหัสห้องสำหรับแท็บเล็ต:{' '}
                <strong className="text-white font-mono text-sm">{roomCode}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end bg-slate-950/70 border border-sky-500/30 px-3 py-2 rounded-xl">
            <div className="text-left">
              <div className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">
                รหัสเชื่อมต่อแท็บเล็ต
              </div>
              <div className="text-xl font-black text-white tracking-widest font-mono">
                {roomCode}
              </div>
            </div>
            <button
              onClick={copyRoomLink}
              className="p-2 bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 rounded-lg transition-colors border border-sky-500/30"
              title="คัดลอกลิงก์ห้อง"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Tablet Presence & QR Box */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* QR & Pairing (4 cols) */}
        <div className="md:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-3 text-slate-300 font-semibold text-xs">
            <Users className="w-4 h-4 text-sky-400" />
            แท็บเล็ตในห้อง:
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                spectatorCount > 0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {spectatorCount > 0 ? `${spectatorCount} เครื่อง (เชื่อมต่อแล้ว)` : 'รอแท็บเล็ตเข้าห้อง...'}
            </span>
          </div>

          {qrCodeUrl ? (
            <div className="p-2.5 bg-slate-950 border border-sky-500/40 rounded-2xl shadow-inner relative group">
              <img
                src={qrCodeUrl}
                alt={`QR Code for room ${roomCode}`}
                className="w-40 h-40 rounded-xl object-contain"
              />
              <div className="text-[10px] text-slate-400 mt-1.5 font-mono">
                นำแท็บเล็ตมาสแกน QR เพื่อเข้าห้องทันที
              </div>
            </div>
          ) : (
            <div className="w-40 h-40 flex items-center justify-center bg-slate-950 rounded-2xl text-slate-500 text-xs">
              กำลังสร้าง QR...
            </div>
          )}
        </div>

        {/* Broadcasting Options & Controls (7 cols) */}
        <div className="md:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
              <Video className="w-4 h-4 text-sky-400" />
              เลือกวิธีส่งภาพหน้าจอ RoV ไปยังแท็บเล็ต
            </h3>

            {/* Why mobile restricts direct screen recording */}
            <div className="mb-3 p-2.5 bg-sky-950/40 border border-sky-800/40 rounded-xl text-xs text-sky-200">
              <span className="font-semibold text-sky-300">💡 คำแนะนำสำหรับผู้เล่นมือถือ:</span> บนระบบ iOS และ Android เบราว์เซอร์จะจำกัดการอัดหน้าจอของแอปอื่นเพื่อความปลอดภัย คุณสามารถเลือกวิธีที่สะดวกที่สุดได้ทันที:
            </div>

            {errorMessage && (
              <div className="mb-3 p-3 bg-rose-950/70 border border-rose-700/70 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* The 4 Transmission Methods */}
            <div className="space-y-2.5">
              {/* Method 1: Camera Stream (Most reliable on all phones) */}
              <button
                onClick={isStreaming && streamMode === 'camera' ? stopStreaming : startCameraStream}
                className={`w-full py-3 px-3.5 rounded-xl font-bold flex items-center justify-between text-xs transition-all shadow-md ${
                  isStreaming && streamMode === 'camera'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/30'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-white/20 rounded-lg">
                    {isStreaming && streamMode === 'camera' ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-sm">
                      {isStreaming && streamMode === 'camera'
                        ? 'ปิดกล้อง (Stop Camera)'
                        : '📸 เปิดกล้องส่องหน้าจอเกม (แนะนำสำหรับมือถือ)'}
                    </div>
                    <div className="text-[10px] font-normal opacity-90">
                      ใช้กล้องมือถือส่องไปที่หน้าจอเล่นเกม ภาพจะขึ้นแท็บเล็ตสดทันที
                    </div>
                  </div>
                </div>
                {isStreaming && streamMode === 'camera' ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>

              {/* Method 2: Snap Screenshot Upload */}
              <label className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-950/80 hover:bg-slate-800 border border-dashed border-sky-500/50 text-sky-300 flex items-center justify-between cursor-pointer transition-colors">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-sky-400" />
                  <div className="text-left">
                    <div>แคปรูปดราฟท์ใน RoV แล้วส่งเข้าแท็บเล็ต (Snap Photo)</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      แคปหน้าจอดราฟท์ แล้วแตะที่นี่เพื่อส่งภาพให้แท็บเล็ตสแกนทันที
                    </div>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="text-[10px] bg-sky-900/60 px-2 py-1 rounded text-sky-200">
                  เลือกรูป
                </span>
              </label>

              {/* Method 3: Direct getDisplayMedia if available */}
              {hasDisplayMedia && (
                <button
                  onClick={isStreaming && streamMode === 'screen' ? stopStreaming : startScreenShare}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all border ${
                    isStreaming && streamMode === 'screen'
                      ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                      : 'bg-slate-950/60 hover:bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-sky-400" />
                    <span>
                      {isStreaming && streamMode === 'screen'
                        ? 'หยุดแชร์หน้าจอ'
                        : '🎥 แชร์หน้าจอมือถือโดยตรง (Direct Screen Share)'}
                    </span>
                  </div>
                </button>
              )}

              {/* Method 4: Demo Stream */}
              <button
                onClick={isStreaming && streamMode === 'demo' ? stopStreaming : startDemoStream}
                className={`w-full py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-between transition-all border ${
                  isStreaming && streamMode === 'demo'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                    : 'bg-slate-950/40 hover:bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {isStreaming && streamMode === 'demo'
                      ? 'หยุดทดสอบตัวอย่าง'
                      : '🎮 เล่นภาพตัวอย่างหน้าจอดราฟท์ RoV (Demo Stream)'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">ทดสอบระบบ</span>
              </button>
            </div>
          </div>

          {/* Active Broadcast Monitor */}
          {previewFrame && (
            <div className="mt-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  กำลังส่งภาพไปยังแท็บเล็ต ({frameCount} เฟรม)
                </span>
                <span className="text-[10px] text-slate-500">ดีเลย์ส่ง ~1.5 วิ</span>
              </div>
              <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-video max-h-32 mx-auto">
                <img
                  src={previewFrame}
                  alt="Live Screen Stream"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Extra Feature: Mobile Quick Tap Draft Controller */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              แป้นกดดราฟท์มือถือด่วน (แตะแล้วขึ้นจอแท็บเล็ตทันที)
            </h3>
            <p className="text-[11px] text-slate-400">
              แตะชื่อฮีโร่เพื่อส่งข้อมูลตรงเข้าจอแท็บเล็ต ให้ AI วิเคราะห์เคาน์เตอร์ได้ทันที
            </p>
          </div>

          {/* Quick Selectors */}
          <div className="flex items-center gap-2">
            {/* Team Toggle */}
            <div className="flex rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setQuickTeam('blue')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  quickTeam === 'blue' ? 'bg-sky-600 text-white' : 'text-slate-400'
                }`}
              >
                🔵 ทีมเรา
              </button>
              <button
                onClick={() => setQuickTeam('red')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  quickTeam === 'red' ? 'bg-rose-600 text-white' : 'text-slate-400'
                }`}
              >
                🔴 ศัตรู
              </button>
            </div>

            {/* Action Toggle */}
            <div className="flex rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setQuickAction('pick')}
                className={`px-2 py-1 rounded-md transition-all ${
                  quickAction === 'pick' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                พิค
              </button>
              <button
                onClick={() => setQuickAction('ban')}
                className={`px-2 py-1 rounded-md transition-all ${
                  quickAction === 'ban' ? 'bg-red-700 text-white' : 'text-slate-400'
                }`}
              >
                แบน
              </button>
            </div>
          </div>
        </div>

        {/* Lane Selector if Pick */}
        {quickAction === 'pick' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] text-slate-400 shrink-0 font-medium">ตำแหน่ง:</span>
            {(['dsl', 'jg', 'mid', 'adl', 'sp'] as Lane[]).map((lane) => (
              <button
                key={lane}
                onClick={() => setQuickLane(lane)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] shrink-0 transition-all ${
                  quickLane === lane
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {LANE_CONFIG[lane].short} ({LANE_CONFIG[lane].labelTh})
              </button>
            ))}
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="ค้นหาชื่อฮีโร่ภาษาอังกฤษหรือไทยเพื่อแตะส่งเข้าแท็บเล็ต เช่น Florentino, Nakroth, Liliana..."
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl text-xs text-white outline-none"
          />
        </div>

        {/* Hero Quick Tap Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-56 overflow-y-auto pr-1">
          {filteredHeroes.slice(0, 32).map((hero) => (
            <button
              key={hero.id}
              onClick={() => handleQuickHeroSelect(hero)}
              className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-sky-500 transition-all text-center flex flex-col items-center gap-1 group active:scale-95"
            >
              <HeroAvatar hero={hero} size="sm" showTier={false} />
              <span className="text-[10px] font-semibold text-slate-300 truncate w-full group-hover:text-sky-300">
                {hero.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
