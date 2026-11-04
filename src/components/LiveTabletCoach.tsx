import React, { useState, useEffect, useMemo } from 'react';
import {
  Tv,
  Sparkles,
  Maximize2,
  Minimize2,
  Users,
  Shield,
  Swords,
  AlertTriangle,
  RefreshCw,
  Zap,
  CheckCircle2,
  TrendingUp,
  Brain,
  Info,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { Hero, Lane, DamageType } from '../types/rov';
import { ALL_HEROES, LANE_CONFIG, getHeroById } from '../data/allHeroes';
import { calculateRecommendations, analyzeTeamComp } from '../utils/draftEngine';
import { realtimeClient, DraftSyncPayload } from '../utils/realtimeClient';
import { HeroAvatar } from './HeroAvatar';

interface Props {
  roomCode: string;
  onLeaveRoom: () => void;
  draftState: {
    blueBans: (Hero | null)[];
    redBans: (Hero | null)[];
    bluePicks: Record<Lane, Hero | null>;
    redPicks: Record<Lane, Hero | null>;
    activeTeam: 'blue' | 'red';
    activeAction: 'ban' | 'pick';
  };
  onUpdateDraftState: (state: any) => void;
  onSelectHeroDetail?: (hero: Hero) => void;
}

export const LiveTabletCoach: React.FC<Props> = ({
  roomCode,
  onLeaveRoom,
  draftState,
  onUpdateDraftState,
  onSelectHeroDetail,
}) => {
  const [liveFrame, setLiveFrame] = useState<string | null>(null);
  const [lastFrameTime, setLastFrameTime] = useState<number>(Date.now());
  const [isHostConnected, setIsHostConnected] = useState(true);
  const [spectatorCount, setSpectatorCount] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScanningAI, setIsScanningAI] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(
    'ระบบ AI ผู้ช่วยดราฟท์พร้อมทำงานแล้ว: เมื่อมือถือแชร์หน้าจอหรือเลือกตัว ฮีโร่แก้ทางและคอมโบจะอัปเดตให้อัตโนมัติ'
  );
  const [selectedLaneTab, setSelectedLaneTab] = useState<Lane | 'all'>('all');
  const [targetSlot, setTargetSlot] = useState<{ team: 'blue' | 'red'; lane: Lane } | null>({
    team: 'blue',
    lane: 'adl',
  });

  // Calculate live team picks
  const bluePicksList = useMemo(() => Object.values(draftState.bluePicks), [draftState.bluePicks]);
  const redPicksList = useMemo(() => Object.values(draftState.redPicks), [draftState.redPicks]);
  const allBannedHeroes = useMemo(
    () => [...draftState.blueBans, ...draftState.redBans].filter((h): h is Hero => h !== null),
    [draftState.blueBans, draftState.redBans]
  );

  // Recommendations for Blue Team (Ally) vs Red Team (Enemy)
  const recommendations = useMemo(() => {
    return calculateRecommendations({
      myPicks: bluePicksList,
      enemyPicks: redPicksList,
      bannedHeroes: allBannedHeroes,
      targetLane: selectedLaneTab === 'all' ? null : selectedLaneTab,
    });
  }, [bluePicksList, redPicksList, allBannedHeroes, selectedLaneTab]);

  // Team Comp Analysis for Blue
  const blueAnalysis = useMemo(() => analyzeTeamComp(bluePicksList), [bluePicksList]);
  const redAnalysis = useMemo(() => analyzeTeamComp(redPicksList), [redPicksList]);

  // Subscribe to WebSocket events
  useEffect(() => {
    const unsubFrame = realtimeClient.on('screen_frame', (data) => {
      if (data.frame) {
        setLiveFrame(data.frame);
        setLastFrameTime(Date.now());
      }
    });

    const unsubDraft = realtimeClient.on('draft_updated', (data) => {
      if (data.draftState) {
        onUpdateDraftState(data.draftState);
      }
    });

    const unsubPresence = realtimeClient.on('presence_update', (data) => {
      if (typeof data.hostConnected === 'boolean') {
        setIsHostConnected(data.hostConnected);
      }
      if (typeof data.spectatorCount === 'number') {
        setSpectatorCount(data.spectatorCount);
      }
    });

    const unsubJoined = realtimeClient.on('room_joined', (data) => {
      if (data.lastFrame) {
        setLiveFrame(data.lastFrame);
      }
      if (data.draftState) {
        onUpdateDraftState(data.draftState);
      }
    });

    return () => {
      unsubFrame();
      unsubDraft();
      unsubPresence();
      unsubJoined();
    };
  }, []);

  // Request AI Scan of current live frame
  const handleScanScreenAI = async () => {
    if (!liveFrame) {
      setAiAdvice('ยังไม่มีภาพหน้าจอจากมือถือ กรุณากดเริ่มแชร์หน้าจอบนมือถือก่อนครับ');
      return;
    }

    setIsScanningAI(true);
    setAiAdvice('🤖 กำลังส่งภาพไปยัง AI เพื่อตรวจจับฮีโร่และวิเคราะห์กลยุทธ์การดราฟท์...');

    try {
      const response = await fetch('/api/ai/scan-screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: liveFrame,
          currentDraftState: draftState,
        }),
      });

      const resData = await response.json();
      if (resData.success && resData.analysis) {
        const advice = resData.analysis.coachingAdvice || 'ตรวจจับภาพหน้าจอเรียบร้อยแล้ว';
        const threat = resData.analysis.priorityThreat
          ? `\n⚠️ ฮีโร่ที่ต้องระวัง: ${resData.analysis.priorityThreat}`
          : '';
        setAiAdvice(advice + threat);

        // If heroes were detected, apply them
        if (Array.isArray(resData.analysis.detectedHeroes) && resData.analysis.detectedHeroes.length > 0) {
          const newDraft = { ...draftState };
          for (const item of resData.analysis.detectedHeroes) {
            const matched = ALL_HEROES.find(
              (h) => h.name.toLowerCase() === item.name?.toLowerCase() || h.id.toLowerCase() === item.name?.toLowerCase()
            );
            if (matched && item.lane && ['dsl', 'jg', 'mid', 'adl', 'sp'].includes(item.lane)) {
              if (item.team === 'red') {
                newDraft.redPicks[item.lane as Lane] = matched;
              } else {
                newDraft.bluePicks[item.lane as Lane] = matched;
              }
            }
          }
          onUpdateDraftState(newDraft);
          realtimeClient.sendDraftUpdate(newDraft as any);
        }
      } else {
        setAiAdvice(resData.coachingAdvice || 'วิเคราะห์สถานะดราฟท์ปัจจุบันเรียบร้อย');
      }
    } catch (err: any) {
      console.warn('AI Scan failed:', err);
      setAiAdvice(
        '💡 แนะนำตามเมต้าปัจจุบัน: หากศัตรูมีตัวล้วงสูง ให้หยิบ Aleister หรือ Arum กันแครี่ หรือเลือกฮีโร่เทียร์ S+ จากตารางแนะนำด้านขวา'
      );
    } finally {
      setIsScanningAI(false);
    }
  };

  // One-click pick recommendation from tablet to sync to game
  const handleApplyRecommendation = (hero: Hero) => {
    const lane = selectedLaneTab !== 'all' ? selectedLaneTab : hero.primaryLane;
    const newBluePicks = { ...draftState.bluePicks, [lane]: hero };
    const updated = { ...draftState, bluePicks: newBluePicks };
    onUpdateDraftState(updated);
    realtimeClient.sendDraftUpdate(updated as any);
  };

  return (
    <div className="space-y-4">
      {/* Top Tablet Header Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/40 rounded-xl text-indigo-400">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">
                จอแท็บเล็ต: โค้ช AI วิเคราะห์สด (Tablet AI Spectator)
              </h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 font-mono">
                ห้อง: {roomCode}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isHostConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                {isHostConnected ? 'มือถือเชื่อมต่ออยู่ (สัญญาณดี)' : 'มือถือขาดการเชื่อมต่อ'}
              </span>
              <span>•</span>
              <span>แท็บเล็ตในห้อง: {spectatorCount} เครื่อง</span>
              {liveFrame && (
                <>
                  <span>•</span>
                  <span className="text-slate-500">ดีเลย์สตรีม ~1.2 วิ</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleScanScreenAI}
            disabled={isScanningAI || !liveFrame}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
              isScanningAI
                ? 'bg-amber-600/50 text-amber-200 cursor-wait'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-900/30'
            }`}
          >
            {isScanningAI ? (
              <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
            ) : (
              <Brain className="w-4 h-4 text-purple-200" />
            )}
            <span>{isScanningAI ? 'AI กำลังสแกน...' : '🤖 สแกนจอด้วย AI Vision'}</span>
          </button>

          <button
            onClick={onLeaveRoom}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
          >
            ออกจากห้อง
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left = Mirrored Phone Screen, Right = Real-time AI Coach */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Phone Screen Live Feed & Live Pick Slots (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Mirrored Screen Frame Viewport */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="bg-slate-900/90 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-white">ภาพสดจากจอมือถือ (Live Mirrored Screen)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">
                  {liveFrame ? 'กำลังฉายภาพสด' : 'รอการส่งภาพจากมือถือ...'}
                </span>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                  title="เต็มหน้าจอ"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Video Canvas Display */}
            <div
              className={`relative bg-slate-950 flex items-center justify-center ${
                isFullscreen ? 'fixed inset-0 z-50 p-4 bg-slate-950' : 'aspect-video min-h-[260px]'
              }`}
            >
              {liveFrame ? (
                <img
                  src={liveFrame}
                  alt="Live screen share from mobile"
                  className="max-h-full max-w-full object-contain shadow-lg"
                />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
                    <Tv className="w-8 h-8 text-sky-500/60 animate-pulse" />
                  </div>
                  <div className="text-sm font-semibold text-slate-300">
                    รอภาพหน้าจอจากมือถือ...
                  </div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    เปิดเว็บนี้บนมือถือของคุณ เข้าห้องรหัส{' '}
                    <span className="text-sky-400 font-bold font-mono">{roomCode}</span> แล้วกดปุ่ม{' '}
                    <span className="text-slate-300 font-medium">"เริ่มแชร์หน้าจอมือถือ"</span>
                  </p>
                </div>
              )}

              {/* Close Fullscreen button */}
              {isFullscreen && (
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="absolute top-6 right-6 p-3 bg-slate-900/90 text-white rounded-xl border border-slate-700 shadow-xl"
                >
                  <Minimize2 className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>

          {/* Synchronized Live Draft Slots (Blue Team vs Red Team) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Swords className="w-4 h-4 text-sky-400" />
                สถานะการดราฟท์ (5 แบน / 5 พิค)
              </h3>
              <span className="text-[11px] text-slate-400">
                แตะที่ช่องเพื่อเลือกตัว หรือให้ AI ตรวจจับอัตโนมัติ
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Blue Team (Ally) */}
              <div className="bg-sky-950/30 border border-sky-800/40 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-sky-300 font-bold border-b border-sky-800/30 pb-1.5">
                  <span>🔵 ทีมเรา (Blue Team)</span>
                  <span className="text-[10px] text-sky-400/80">แบน 5 / พิค 5</span>
                </div>

                {/* 5 Bans */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">แบน:</span>
                  {draftState.blueBans.map((b, i) => (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-lg border border-red-800/60 bg-slate-950 overflow-hidden relative shrink-0"
                      title={b ? `แบน: ${b.name}` : `แบนช่องที่ ${i + 1}`}
                    >
                      {b ? (
                        <>
                          <HeroAvatar hero={b} size="sm" showTier={false} />
                          <div className="absolute inset-0 bg-red-950/70 flex items-center justify-center text-red-400 text-[10px] font-bold">
                            ✕
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600 text-[10px]">
                          {i + 1}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 5 Picks */}
                <div className="space-y-1.5 pt-1">
                  {(['dsl', 'jg', 'mid', 'adl', 'sp'] as Lane[]).map((lane) => {
                    const hero = draftState.bluePicks[lane];
                    const cfg = LANE_CONFIG[lane];
                    return (
                      <div
                        key={lane}
                        onClick={() => hero && onSelectHeroDetail?.(hero)}
                        className={`flex items-center justify-between p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          hero
                            ? 'bg-slate-950 border-sky-600/40 hover:border-sky-500'
                            : 'bg-slate-950/50 border-dashed border-slate-800 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-900/60 text-sky-300">
                            {LANE_CONFIG[lane].short}
                          </span>
                          {hero ? (
                            <span className="font-semibold text-slate-200">
                              {hero.nameTh} ({hero.name})
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">ยังไม่เลือกฮีโร่</span>
                          )}
                        </div>
                        {hero && <HeroAvatar hero={hero} size="sm" showTier={false} />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Red Team (Enemy) */}
              <div className="bg-rose-950/30 border border-rose-800/40 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-rose-300 font-bold border-b border-rose-800/30 pb-1.5">
                  <span>🔴 ศัตรู (Red Team)</span>
                  <span className="text-[10px] text-rose-400/80">แบน 5 / พิค 5</span>
                </div>

                {/* 5 Bans */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">แบน:</span>
                  {draftState.redBans.map((b, i) => (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-lg border border-red-800/60 bg-slate-950 overflow-hidden relative shrink-0"
                      title={b ? `แบน: ${b.name}` : `แบนช่องที่ ${i + 1}`}
                    >
                      {b ? (
                        <>
                          <HeroAvatar hero={b} size="sm" showTier={false} />
                          <div className="absolute inset-0 bg-red-950/70 flex items-center justify-center text-red-400 text-[10px] font-bold">
                            ✕
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600 text-[10px]">
                          {i + 1}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 5 Picks */}
                <div className="space-y-1.5 pt-1">
                  {(['dsl', 'jg', 'mid', 'adl', 'sp'] as Lane[]).map((lane) => {
                    const hero = draftState.redPicks[lane];
                    const cfg = LANE_CONFIG[lane];
                    return (
                      <div
                        key={lane}
                        onClick={() => hero && onSelectHeroDetail?.(hero)}
                        className={`flex items-center justify-between p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          hero
                            ? 'bg-slate-950 border-rose-600/40 hover:border-rose-500'
                            : 'bg-slate-950/50 border-dashed border-slate-800 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-900/60 text-rose-300">
                            {LANE_CONFIG[lane].short}
                          </span>
                          {hero ? (
                            <span className="font-semibold text-slate-200">
                              {hero.nameTh} ({hero.name})
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">ยังไม่เลือกฮีโร่</span>
                          )}
                        </div>
                        {hero && <HeroAvatar hero={hero} size="sm" showTier={false} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Live Coach Engine & Counter Recommendations (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* AI Coach Banner */}
          <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-indigo-700/50 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>เอไอวิเคราะห์สถานการณ์ดราฟท์สด</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-indigo-500/20 text-xs text-slate-300 whitespace-pre-line leading-relaxed">
              {aiAdvice}
            </div>

            {/* Live Warnings */}
            {blueAnalysis.warnings.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {blueAnalysis.warnings.map((w, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg text-[11px] flex items-start gap-2 ${
                      w.level === 'danger'
                        ? 'bg-rose-950/60 text-rose-300 border border-rose-800/50'
                        : w.level === 'warning'
                        ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50'
                        : 'bg-sky-950/60 text-sky-300 border border-sky-800/50'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div>
                      <strong>{w.title}:</strong> {w.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lane Filter Tabs */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                ฮีโร่แนะนำหยิบทันที (Best Picks)
              </h4>
              <span className="text-[10px] text-slate-400">คำนวณจากเคาน์เตอร์และคอมโบ</span>
            </div>

            {/* Lane Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedLaneTab('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                  selectedLaneTab === 'all'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                ทุกเลน
              </button>
              {(['dsl', 'jg', 'mid', 'adl', 'sp'] as Lane[]).map((lane) => (
                <button
                  key={lane}
                  onClick={() => setSelectedLaneTab(lane)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                    selectedLaneTab === lane
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {LANE_CONFIG[lane].short}
                </button>
              ))}
            </div>

            {/* Recommended Hero List */}
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {recommendations.slice(0, 6).map((rec, index) => {
                const hero = rec.hero;
                return (
                  <div
                    key={hero.id}
                    className="p-3 bg-slate-950/70 hover:bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-xl transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <HeroAvatar hero={hero} size="md" />
                        <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center shadow">
                          #{index + 1}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-sm">
                            {hero.nameTh} ({hero.name})
                          </span>
                          <span className="text-[10px] font-bold px-1.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                            {hero.tier}
                          </span>
                        </div>
                        <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>
                            {rec.reasons[0]?.text || 'สมดุลทีมยอดเยี่ยม เหมาะกับเมต้า'}
                          </span>
                        </div>
                        {rec.counterTargets.length > 0 && (
                          <div className="text-[10px] text-sky-400 mt-0.5">
                            แก้ทาง:{' '}
                            {rec.counterTargets.map((c) => c.nameTh).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[11px] font-mono font-bold text-amber-400">
                        {Math.round(rec.score)} pts
                      </span>
                      <button
                        onClick={() => handleApplyRecommendation(hero)}
                        className="px-2.5 py-1 bg-sky-600/30 hover:bg-sky-600 border border-sky-500/40 text-sky-300 hover:text-white rounded-lg text-[10px] font-bold transition-all"
                        title="คลิกเพื่อเลือกฮีโร่นี้ลงในทีมเรา"
                      >
                        หยิบตัวนี้
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
