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
} from 'lucide-react';
import { realtimeClient, DraftSyncPayload } from '../utils/realtimeClient';
import { Hero, Lane } from '../types/rov';
import { ALL_HEROES } from '../data/allHeroes';
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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureIntervalRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Start Screen Sharing
  const startScreenShare = async () => {
    setErrorMessage(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('เบราว์เซอร์นี้ยังไม่รองรับ getDisplayMedia กรุณาใช้ปุ่ม "เปิดกล้องส่องจอ" แทน');
      }

      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          frameRate: { ideal: 5, max: 15 },
        },
        audio: false,
      });

      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      setStreamMode('screen');
      setIsStreaming(true);
      startFrameCapture();

      // Listen for stream stop (user clicks stop share banner)
      mediaStream.getVideoTracks()[0].onended = () => {
        stopStreaming();
      };
    } catch (err: any) {
      console.warn('Screen share start failed:', err);
      setErrorMessage(err.message || 'ไม่สามารถเปิดแชร์หน้าจอได้ กรุณาลองใช้กล้องส่องจอแทน');
    }
  };

  // Start Camera Stream
  const startCameraStream = async () => {
    setErrorMessage(null);
    try {
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
      setErrorMessage(err.message || 'ไม่สามารถเปิดกล้องได้');
    }
  };

  // Start Demo Stream
  const startDemoStream = () => {
    setErrorMessage(null);
    setIsStreaming(true);
    setStreamMode('demo');

    // Create demo draft canvas frame
    const demoCanvas = document.createElement('canvas');
    demoCanvas.width = 720;
    demoCanvas.height = 405;
    const ctx = demoCanvas.getContext('2d');

    let tick = 0;
    clearInterval(captureIntervalRef.current);
    captureIntervalRef.current = setInterval(() => {
      if (!ctx) return;
      tick++;

      // Draw stylized RoV Draft Screen simulation
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 720, 405);

      // Gradient background
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

      // Live Timer Center
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

      // Downscale to 640px max width for rapid, low-bandwidth transmission
      const targetWidth = Math.min(640, vWidth);
      const targetHeight = Math.round((vHeight / vWidth) * targetWidth);

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

      // Compress to lightweight JPEG quality 0.6
      const frameData = canvas.toDataURL('image/jpeg', 0.6);
      setPreviewFrame(frameData);
      setFrameCount((prev) => prev + 1);

      // Transmit to room participants
      realtimeClient.sendFrame(frameData);
    }, 1500); // User requested acceptable delay: ~1.5s per frame
  };

  // Stop Streaming
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
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hidden Video element for video capture */}
      <video ref={videoRef} playsInline muted autoPlay className="hidden" />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 border border-sky-800/50 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-500/20 border border-sky-400/40 rounded-xl text-sky-400">
              <Smartphone className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-wide">
                  โหมดมือถือ (Mobile Broadcaster)
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ห้องพร้อมใช้งาน
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                แชร์ภาพหน้าจอจากมือถือ เพื่อให้แท็บเล็ตของคุณวิเคราะห์ดราฟท์แบบเรียลไทม์
              </p>
            </div>
          </div>

          {/* Quick Room Code Display */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end bg-slate-950/70 border border-sky-500/30 px-4 py-2.5 rounded-xl">
            <div>
              <div className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">
                รหัสห้องสำหรับแท็บเล็ต
              </div>
              <div className="text-2xl font-black text-white tracking-widest font-mono">
                {roomCode}
              </div>
            </div>
            <button
              onClick={copyRoomLink}
              className="p-2.5 bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 rounded-lg transition-colors border border-sky-500/30"
              title="คัดลอกลิงก์ห้อง"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Left = QR & Pairing Instructions, Right = Screen Share Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pairing Box */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-3 text-slate-300 font-semibold text-sm">
            <Users className="w-4 h-4 text-sky-400" />
            แท็บเล็ตที่เชื่อมต่ออยู่:
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                spectatorCount > 0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {spectatorCount > 0 ? `${spectatorCount} เครื่อง (เชื่อมต่อแล้ว)` : 'รอแท็บเล็ตเข้าห้อง...'}
            </span>
          </div>

          {/* QR Code */}
          {qrCodeUrl ? (
            <div className="p-3 bg-slate-950 border-2 border-sky-500/40 rounded-2xl shadow-inner relative group">
              <img
                src={qrCodeUrl}
                alt={`QR Code for room ${roomCode}`}
                className="w-48 h-48 rounded-xl object-contain"
              />
              <div className="text-[11px] text-slate-400 mt-2 font-mono">
                เปิดกล้องบนแท็บเล็ตส่อง QR นี้เพื่อเข้าห้องทันที
              </div>
            </div>
          ) : (
            <div className="w-48 h-48 flex items-center justify-center bg-slate-950 rounded-2xl text-slate-500 text-xs">
              กำลังสร้าง QR Code...
            </div>
          )}

          <div className="mt-4 w-full text-left bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1.5 text-slate-400">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              วิธีเชื่อมต่อกับแท็บเล็ตใน 3 วินาที:
            </div>
            <div>1. นำแท็บเล็ตมาเปิดกล้องสแกน QR ด้านบน</div>
            <div>
              2. หรือบนแท็บเล็ตเข้าเว็บนี้แล้วพิมพ์รหัส{' '}
              <strong className="text-sky-300 font-mono">{roomCode}</strong>
            </div>
            <div>3. กดปุ่มแชร์จอด้านขวาเพื่อเริ่มส่งภาพแบบสดๆ</div>
          </div>
        </div>

        {/* Stream Controls */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
              <Video className="w-5 h-5 text-sky-400" />
              การแชร์ภาพไปยังแท็บเล็ต
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              เลือกวิธีที่สะดวกที่สุดในการส่งภาพหน้าจอ RoV ให้แท็บเล็ตดูสด
            </p>

            {errorMessage && (
              <div className="mb-4 p-3 bg-rose-950/60 border border-rose-700/60 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Stream Buttons */}
            <div className="space-y-3">
              {/* Option 1: Share Screen */}
              <button
                onClick={isStreaming && streamMode === 'screen' ? stopStreaming : startScreenShare}
                className={`w-full py-3.5 px-4 rounded-xl font-bold flex items-center justify-between text-sm transition-all shadow-lg ${
                  isStreaming && streamMode === 'screen'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/30'
                    : 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-sky-900/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    {isStreaming && streamMode === 'screen' ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Video className="w-5 h-5" />
                    )}
                  </div>
                  <div className="text-left">
                    <div>
                      {isStreaming && streamMode === 'screen'
                        ? 'หยุดแชร์หน้าจอ (Stop Screen)'
                        : '🎥 เริ่มแชร์หน้าจอมือถือ (Live Screen)'}
                    </div>
                    <div className="text-[11px] font-normal opacity-80">
                      เหมาะที่สุดเวลาเปิดเกม RoV บนเครื่องนี้
                    </div>
                  </div>
                </div>
                {isStreaming && streamMode === 'screen' ? (
                  <span className="w-3 h-3 rounded-full bg-white animate-ping" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>

              {/* Option 2: Camera Stream */}
              <button
                onClick={isStreaming && streamMode === 'camera' ? stopStreaming : startCameraStream}
                className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-between text-sm transition-all border ${
                  isStreaming && streamMode === 'camera'
                    ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Camera className="w-5 h-5 text-indigo-400" />
                  <div className="text-left">
                    <div>
                      {isStreaming && streamMode === 'camera'
                        ? 'ปิดกล้อง (Stop Camera)'
                        : '📸 เปิดกล้องส่องหน้าจอเกม (Camera Stream)'}
                    </div>
                    <div className="text-[11px] font-normal text-slate-400">
                      ใช้กล้องมือถือส่องไปที่หน้าจอเล่นเกมได้ทันที
                    </div>
                  </div>
                </div>
              </button>

              {/* Option 3: Demo Stream */}
              <button
                onClick={isStreaming && streamMode === 'demo' ? stopStreaming : startDemoStream}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-between transition-all border ${
                  isStreaming && streamMode === 'demo'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                    : 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-amber-400" />
                  <span>
                    {isStreaming && streamMode === 'demo'
                      ? 'หยุดทดสอบตัวอย่าง'
                      : '🎮 ทดสอบภาพดราฟท์จำลอง (Demo Match Stream)'}
                  </span>
                </div>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                  สำหรับลองทดสอบ
                </span>
              </button>

              {/* Option 4: Snap photo upload */}
              <label className="w-full py-2 px-3 rounded-xl text-xs font-medium bg-slate-950/60 hover:bg-slate-800 border border-dashed border-slate-700 text-slate-400 flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-sky-400" />
                <span>หรือแตะเพื่ออัปโหลดรูปแคปหน้าจอดราฟท์ล่าสุด</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Active Broadcast Monitor */}
          {previewFrame ? (
            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  กำลังส่งภาพ (ส่งแล้ว {frameCount} เฟรม)
                </span>
                <span className="text-[11px] text-slate-500">ดีเลย์ส่ง ~1.5 วิ</span>
              </div>
              <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-video max-h-36 mx-auto">
                <img
                  src={previewFrame}
                  alt="Live Screen Stream"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-slate-950/50 rounded-xl border border-slate-800/50 text-center text-xs text-slate-500">
              ยังไม่ได้เริ่มแชร์หน้าจอ กดปุ่มด้านบนเพื่อเริ่มถ่ายทอดสด
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
