import React, { useState, useMemo } from 'react';
import { Hero, Lane, DraftState, TeamAnalysis } from './types/rov';
import { ALL_HEROES, LANE_CONFIG, getHeroById } from './data/allHeroes';
import { calculateRecommendations, analyzeTeamComp } from './utils/draftEngine';
import { DraftBoard } from './components/DraftBoard';
import { HeroPickerGrid } from './components/HeroPickerGrid';
import { DraftAssistant } from './components/DraftAssistant';
import { HeroDetailModal } from './components/HeroDetailModal';
import { CounterMatrixView } from './components/CounterMatrixView';
import { MetaTierListView } from './components/MetaTierListView';
import { CompBuilderView } from './components/CompBuilderView';
import { DraftSummaryModal } from './components/DraftSummaryModal';
import { soundManager } from './utils/audio';
import { LiveRoomManager } from './components/LiveRoomManager';
import {
  Swords,
  Trophy,
  Sparkles,
  RotateCcw,
  Volume2,
  VolumeX,
  Share2,
  Layers,
  HelpCircle,
  ExternalLink,
  Globe,
  Check,
  Link,
  Smartphone,
  Tv,
} from 'lucide-react';

type NavTab = 'draft' | 'counters' | 'tierlist' | 'builder' | 'live-room';

export default function App() {
  const [navTab, setNavTab] = useState<NavTab>('draft');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Draft State (Single Standard Mode: 5 bans per team = 10 bans total)
  const [blueBans, setBlueBans] = useState<(Hero | null)[]>([null, null, null, null, null]);
  const [redBans, setRedBans] = useState<(Hero | null)[]>([null, null, null, null, null]);
  const [bluePicks, setBluePicks] = useState<Record<Lane, Hero | null>>({
    adl: null,
    mid: null,
    dsl: null,
    jg: null,
    sp: null,
  });
  const [redPicks, setRedPicks] = useState<Record<Lane, Hero | null>>({
    adl: null,
    mid: null,
    dsl: null,
    jg: null,
    sp: null,
  });

  const [activeTeam, setActiveTeam] = useState<'blue' | 'red'>('blue');
  const [activeAction, setActiveAction] = useState<'ban' | 'pick'>('ban');
  const [targetSlot, setTargetSlot] = useState<{ team: 'blue' | 'red'; lane: Lane } | null>({
    team: 'blue',
    lane: 'adl',
  });
  const [targetBanIndex, setTargetBanIndex] = useState<{ team: 'blue' | 'red'; index: number } | null>(null);

  const [inspectedHero, setInspectedHero] = useState<Hero | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Auto-switch to live-room tab if room query parameter or tab=live is detected
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('room') || params.get('tab') === 'live') {
      setNavTab('live-room');
    }
  }, []);

  // Toggle audio
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.setSoundEnabled(next);
  };

  // Reset Draft
  const handleResetDraft = () => {
    soundManager.playClick();
    setBlueBans(new Array(5).fill(null));
    setRedBans(new Array(5).fill(null));
    setBluePicks({ adl: null, mid: null, dsl: null, jg: null, sp: null });
    setRedPicks({ adl: null, mid: null, dsl: null, jg: null, sp: null });
    setActiveTeam('blue');
    setActiveAction('ban');
    setTargetSlot({ team: 'blue', lane: 'adl' });
    setTargetBanIndex(null);
  };

  // Share application URL or copy to clipboard
  const handleShareApp = async () => {
    soundManager.playClick();
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'RoV Meta Drafter - เว็บช่วยดราฟท์ฮีโร่ RoV ทุกตำแหน่ง',
          text: 'เว็บช่วยดราฟท์ฮีโร่ RoV อ้างอิงข้อมูล rovmeta.com ครบ 131 ฮีโร่ 5 แบน แนะนำตัวแก้ทางและจัดทีมแบบเรียลไทม์',
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share failed, fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback if clipboard API blocked
      prompt('คัดลอกลิงก์เว็บไซต์นี้:', shareUrl);
    }
  };

  // Handle clicking a specific ban slot (1-5)
  const handleBanSlotClick = (team: 'blue' | 'red', index: number) => {
    soundManager.playClick();
    setActiveTeam(team);
    setActiveAction('ban');
    setTargetBanIndex({ team, index });
  };

  // Handle removing a banned hero
  const handleRemoveBan = (team: 'blue' | 'red', index: number) => {
    if (team === 'blue') {
      const next = [...blueBans];
      next[index] = null;
      setBlueBans(next);
    } else {
      const next = [...redBans];
      next[index] = null;
      setRedBans(next);
    }
  };

  // Sets of banned and picked hero ids
  const bannedHeroIds = useMemo(() => {
    const set = new Set<string>();
    [...blueBans, ...redBans].forEach((h) => {
      if (h) set.add(h.id.toLowerCase());
    });
    return set;
  }, [blueBans, redBans]);

  const pickedHeroIds = useMemo(() => {
    const set = new Set<string>();
    [...Object.values(bluePicks), ...Object.values(redPicks)].forEach((h) => {
      if (h) set.add(h.id.toLowerCase());
    });
    return set;
  }, [bluePicks, redPicks]);

  // Compute team analysis
  const blueAnalysis: TeamAnalysis = useMemo(() => {
    return analyzeTeamComp(Object.values(bluePicks), Object.values(redPicks));
  }, [bluePicks, redPicks]);

  const redAnalysis: TeamAnalysis = useMemo(() => {
    return analyzeTeamComp(Object.values(redPicks), Object.values(bluePicks));
  }, [redPicks, bluePicks]);

  // Compute recommendations for current active team & target slot
  const currentRecommendations = useMemo(() => {
    const myPicks = activeTeam === 'blue' ? Object.values(bluePicks) : Object.values(redPicks);
    const enemyPicks = activeTeam === 'blue' ? Object.values(redPicks) : Object.values(bluePicks);
    const allBans = [...blueBans, ...redBans].filter((h): h is Hero => h !== null);

    return calculateRecommendations({
      myPicks,
      enemyPicks,
      bannedHeroes: allBans,
      targetLane: targetSlot?.lane || null,
    });
  }, [activeTeam, bluePicks, redPicks, blueBans, redBans, targetSlot]);

  // Handle slot selection on DraftBoard
  const handleSlotClick = (team: 'blue' | 'red', lane: Lane) => {
    soundManager.playClick();
    setActiveTeam(team);
    setActiveAction('pick');
    setTargetSlot({ team, lane });
  };

  // Handle removing a pick
  const handleRemovePick = (team: 'blue' | 'red', lane: Lane) => {
    if (team === 'blue') {
      setBluePicks((prev) => ({ ...prev, [lane]: null }));
    } else {
      setRedPicks((prev) => ({ ...prev, [lane]: null }));
    }
  };

  // Find next empty pick slot
  const findNextEmptySlot = (
    currentTeam: 'blue' | 'red',
    currentLane: Lane
  ): { team: 'blue' | 'red'; lane: Lane } | null => {
    const lanes: Lane[] = ['adl', 'mid', 'dsl', 'jg', 'sp'];
    const otherTeam = currentTeam === 'blue' ? 'red' : 'blue';

    // Check same team other lanes
    for (const l of lanes) {
      const picks = currentTeam === 'blue' ? bluePicks : redPicks;
      if (!picks[l] && l !== currentLane) {
        return { team: currentTeam, lane: l };
      }
    }

    // Check other team lanes
    for (const l of lanes) {
      const picks = otherTeam === 'blue' ? bluePicks : redPicks;
      if (!picks[l]) {
        return { team: otherTeam, lane: l };
      }
    }

    return null;
  };

  // Select hero from Grid (either ban or pick)
  const handleHeroSelect = (hero: Hero) => {
    if (activeAction === 'ban') {
      soundManager.playBan();

      if (targetBanIndex) {
        if (targetBanIndex.team === 'blue') {
          const nextBans = [...blueBans];
          nextBans[targetBanIndex.index] = hero;
          setBlueBans(nextBans);
          // Switch to Red's turn
          setActiveTeam('red');
        } else {
          const nextBans = [...redBans];
          nextBans[targetBanIndex.index] = hero;
          setRedBans(nextBans);
          // Switch to Blue's turn
          setActiveTeam('blue');
        }
        setTargetBanIndex(null);
      } else {
        if (activeTeam === 'blue') {
          const nextBans = [...blueBans];
          const emptyIdx = nextBans.findIndex((b) => b === null);
          if (emptyIdx !== -1) {
            nextBans[emptyIdx] = hero;
            setBlueBans(nextBans);
          }
          // Switch to Red ban
          setActiveTeam('red');
        } else {
          const nextBans = [...redBans];
          const emptyIdx = nextBans.findIndex((b) => b === null);
          if (emptyIdx !== -1) {
            nextBans[emptyIdx] = hero;
            setRedBans(nextBans);
          }

          // Check if all 5 bans on each side are filled (10 bans total)
          const blueBanCount = blueBans.filter((b) => b !== null).length;
          const redBanCount = nextBans.filter((b) => b !== null).length;
          const allFilled = blueBanCount >= 5 && redBanCount >= 5;

          if (allFilled) {
            setActiveAction('pick');
            setActiveTeam('blue');
            setTargetSlot({ team: 'blue', lane: 'adl' });
          } else {
            setActiveTeam('blue');
          }
        }
      }
    } else {
      // Pick action
      soundManager.playPickLock();
      const currentTeam = targetSlot?.team || activeTeam;
      const targetLane = targetSlot?.lane || hero.primaryLane;

      if (currentTeam === 'blue') {
        setBluePicks((prev) => ({ ...prev, [targetLane]: hero }));
      } else {
        setRedPicks((prev) => ({ ...prev, [targetLane]: hero }));
      }

      // Move to next slot
      const next = findNextEmptySlot(currentTeam, targetLane);
      if (next) {
        setTargetSlot(next);
        setActiveTeam(next.team);
      } else {
        // Draft complete!
        soundManager.playComplete();
      }
    }
  };

  // Load squad from Builder tab into draft
  const handleLoadSquadIntoDraft = (squad: Record<Lane, Hero | null>) => {
    setBluePicks(squad);
    setNavTab('draft');
  };

  const currentDraftState: DraftState = {
    blueBans,
    redBans,
    bluePicks,
    redPicks,
    currentStepIndex: 0,
    draftMode: 'ranked',
    activeTeam,
    activeAction,
    selectedHeroForDetail: inspectedHero,
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans ${navTab === 'draft' ? 'h-screen overflow-hidden' : ''}`}>
      {/* Top Navbar */}
      <header className="flex-shrink-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-heading font-black text-slate-950 text-lg shadow-lg shadow-amber-500/20">
              RoV
            </div>
            <div>
              <div className="font-heading font-extrabold text-base tracking-wide flex items-center gap-2 text-white">
                <span>RoV Meta Drafter</span>
                <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  อ้างอิง rovmeta.com (ครบ 131 ฮีโร่ | 5 แบน)
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                ระบบช่วยดราฟท์ฮีโร่ วิเคราะห์เคาน์เตอร์พิค & เทียร์ลิสต์เมต้าเซิร์ฟไทย
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => {
                soundManager.playClick();
                setNavTab('draft');
              }}
              className={`px-3 py-1.5 rounded-lg font-heading font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                navTab === 'draft'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>ห้องดราฟท์</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setNavTab('counters');
              }}
              className={`px-3 py-1.5 rounded-lg font-heading font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                navTab === 'counters'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>ค้นหาตัวแก้ทาง</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setNavTab('tierlist');
              }}
              className={`px-3 py-1.5 rounded-lg font-heading font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                navTab === 'tierlist'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>ตารางเทียร์</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setNavTab('builder');
              }}
              className={`px-3 py-1.5 rounded-lg font-heading font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                navTab === 'builder'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>จัดทีม 5 คน</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setNavTab('live-room');
              }}
              className={`px-3 py-1.5 rounded-lg font-heading font-bold transition-all flex items-center gap-1.5 cursor-pointer relative ${
                navTab === 'live-room'
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/30'
                  : 'text-sky-300 hover:text-white bg-sky-950/40 border border-sky-500/40 hover:bg-sky-900/50'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400"></span>
              </span>
              <Smartphone className="w-3.5 h-3.5" />
              <span>แชร์จอ & แท็บเล็ต AI</span>
            </button>
          </nav>

          {/* Quick Actions & Toggles */}
          <div className="flex items-center gap-2">
            {/* Online Status & Share Website Button */}
            <button
              onClick={handleShareApp}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                copiedLink
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-lg shadow-emerald-500/20'
                  : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/50 hover:border-emerald-500/60'
              }`}
              title="คัดลอกลิงก์เว็บไซต์เพื่อเปิดบนมือถือหรือแชร์ให้เพื่อน"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>คัดลอกลิงก์แล้ว!</span>
                </>
              ) : (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">ออนไลน์</span>
                  <span>แชร์เว็บ</span>
                </>
              )}
            </button>

            <button
              onClick={toggleSound}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title={soundEnabled ? 'ปิดเสียง' : 'เปิดเสียง'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            <button
              onClick={() => setShowSummaryModal(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 cursor-pointer transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>สรุปผล & แชร์</span>
            </button>

            <button
              onClick={handleResetDraft}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
              title="รีเซ็ตการดราฟท์"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto px-3 py-2 flex flex-col min-h-0">
        {/* TAB 1: DRAFT SIMULATOR (Side-by-Side Viewport Fit: No page scroll, pick from the side!) */}
        {navTab === 'draft' && (
          <div className="flex flex-col h-[calc(100vh-76px)] min-h-[580px] gap-2.5">
            {/* Draft Controls Bar */}
            <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900/95 border border-slate-800 shadow-md">
              {/* Single Draft Mode Title */}
              <div className="flex items-center gap-2.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-heading font-extrabold text-sm text-white tracking-wide">
                  ห้องดราฟท์ RoV (5 แบน / 5 พิค)
                </span>
                <span className="text-[11px] text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 hidden sm:inline">
                  131 ฮีโร่ครบ
                </span>
              </div>

              {/* Current Phase Action Toggle */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">จังหวะปัจจุบัน:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      setActiveAction('ban');
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                      activeAction === 'ban'
                        ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    แบน (Ban)
                  </button>
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      setActiveAction('pick');
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                      activeAction === 'pick'
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    เลือก (Pick)
                  </button>
                </div>

                <div className="h-4 w-px bg-slate-800 mx-1" />

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      setActiveTeam('blue');
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                      activeTeam === 'blue'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    ฝั่งฟ้า
                  </button>
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      setActiveTeam('red');
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                      activeTeam === 'red'
                        ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    ฝั่งแดง
                  </button>
                </div>
              </div>
            </div>

            {/* Side-by-Side Main Area: Left (Draft & Analysis) + Right (Side Picker) */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* Left Column (7 cols): DraftBoard + DraftAssistant (Scrollable within column if needed) */}
              <div className="lg:col-span-7 flex flex-col gap-2.5 min-h-0 overflow-y-auto pr-1">
                <DraftBoard
                  draftState={currentDraftState}
                  onSlotClick={handleSlotClick}
                  onBanSlotClick={handleBanSlotClick}
                  onRemoveBan={handleRemoveBan}
                  onRemovePick={handleRemovePick}
                  onInspectHero={(h) => setInspectedHero(h)}
                  targetSlot={targetSlot}
                  targetBanIndex={targetBanIndex}
                />

                <DraftAssistant
                  activeTeam={activeTeam}
                  targetLane={targetSlot?.lane || null}
                  blueAnalysis={blueAnalysis}
                  redAnalysis={redAnalysis}
                  recommendations={currentRecommendations}
                  bluePicks={bluePicks}
                  redPicks={redPicks}
                  onQuickPick={handleHeroSelect}
                  onInspectHero={(h) => setInspectedHero(h)}
                />
              </div>

              {/* Right Column (5 cols): THE SIDE HERO PICKER (Full height, internal scroll only!) */}
              <div className="lg:col-span-5 flex flex-col min-h-0 h-full">
                <HeroPickerGrid
                  onSelectHero={handleHeroSelect}
                  onInspectHero={(h) => setInspectedHero(h)}
                  bannedHeroIds={bannedHeroIds}
                  pickedHeroIds={pickedHeroIds}
                  recommendations={currentRecommendations}
                  targetLane={targetSlot?.lane || null}
                  activeAction={activeAction}
                  activeTeam={activeTeam}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COUNTER MATRIX */}
        {navTab === 'counters' && (
          <CounterMatrixView onInspectHero={(h) => setInspectedHero(h)} />
        )}

        {/* TAB 3: TIER LIST */}
        {navTab === 'tierlist' && (
          <MetaTierListView onInspectHero={(h) => setInspectedHero(h)} />
        )}

        {/* TAB 4: COMP BUILDER */}
        {navTab === 'builder' && (
          <CompBuilderView
            onLoadIntoDraft={handleLoadSquadIntoDraft}
            onInspectHero={(h) => setInspectedHero(h)}
          />
        )}

        {/* TAB 5: DUAL-DEVICE LIVE SCREEN & TABLET AI COACH */}
        {navTab === 'live-room' && (
          <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
            <LiveRoomManager
              onSelectHeroDetail={(h) => setInspectedHero(h)}
              draftState={{
                blueBans,
                redBans,
                bluePicks,
                redPicks,
                activeTeam,
                activeAction,
              }}
              onUpdateDraftState={(syncedState) => {
                if (syncedState.blueBans) {
                  const resolvedBlueBans = syncedState.blueBans.map((item: any) =>
                    typeof item === 'string' ? getHeroById(item) || null : item
                  );
                  setBlueBans(resolvedBlueBans);
                }
                if (syncedState.redBans) {
                  const resolvedRedBans = syncedState.redBans.map((item: any) =>
                    typeof item === 'string' ? getHeroById(item) || null : item
                  );
                  setRedBans(resolvedRedBans);
                }
                if (syncedState.bluePicks) {
                  const newBP: Record<Lane, Hero | null> = { ...bluePicks };
                  for (const [lane, val] of Object.entries(syncedState.bluePicks)) {
                    newBP[lane as Lane] =
                      typeof val === 'string' ? getHeroById(val) || null : (val as Hero | null);
                  }
                  setBluePicks(newBP);
                }
                if (syncedState.redPicks) {
                  const newRP: Record<Lane, Hero | null> = { ...redPicks };
                  for (const [lane, val] of Object.entries(syncedState.redPicks)) {
                    newRP[lane as Lane] =
                      typeof val === 'string' ? getHeroById(val) || null : (val as Hero | null);
                  }
                  setRedPicks(newRP);
                }
                if (syncedState.activeTeam) setActiveTeam(syncedState.activeTeam);
                if (syncedState.activeAction) setActiveAction(syncedState.activeAction);
              }}
            />
          </div>
        )}
      </main>

      {/* Hero Detail Modal */}
      {inspectedHero && (
        <HeroDetailModal
          hero={inspectedHero}
          onClose={() => setInspectedHero(null)}
          onSelectHero={(h) => setInspectedHero(h)}
        />
      )}

      {/* Draft Summary Export Modal */}
      {showSummaryModal && (
        <DraftSummaryModal
          draftState={currentDraftState}
          onClose={() => setShowSummaryModal(false)}
        />
      )}

      {/* Footer (Only shown on non-draft tabs to keep draft screen 100% viewport fit) */}
      {navTab !== 'draft' && (
        <footer className="mt-auto py-6 border-t border-slate-800/80 bg-slate-950 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              RoV Meta Drafter — เครื่องมือช่วยดราฟท์ฮีโร่ RoV ทุกตำแหน่ง (Dark Slayer, Jungle, Mid, Carry, Support)
            </span>
            <div className="flex items-center gap-3">
              <a
                href="https://rovmeta.com/th/heroes"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
              >
                ข้อมูลจาก rovmeta.com <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
