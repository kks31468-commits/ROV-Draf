import React, { useState, useMemo } from 'react';
import { Hero, Lane, Role, Tier, Recommendation } from '../types/rov';
import { ALL_HEROES, LANE_CONFIG } from '../data/allHeroes';
import { HeroAvatar } from './HeroAvatar';
import { Search, Info, Flame, Swords, Sparkles, Filter } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface HeroPickerGridProps {
  onSelectHero: (hero: Hero) => void;
  onInspectHero: (hero: Hero) => void;
  bannedHeroIds: Set<string>;
  pickedHeroIds: Set<string>;
  recommendations?: Recommendation[];
  targetLane?: Lane | null;
  activeAction?: 'ban' | 'pick';
  activeTeam?: 'blue' | 'red';
}

export const HeroPickerGrid: React.FC<HeroPickerGridProps> = ({
  onSelectHero,
  onInspectHero,
  bannedHeroIds,
  pickedHeroIds,
  recommendations = [],
  targetLane,
  activeAction = 'pick',
  activeTeam = 'blue',
}) => {
  const [search, setSearch] = useState('');
  const [selectedLane, setSelectedLane] = useState<Lane | 'all'>(targetLane || 'all');
  const [showOnlyRecs, setShowOnlyRecs] = useState(false);

  // Ordered lanes as requested: แครี่, เลนกลาง, ออฟ, ป่า, ซัพ
  const LANE_ORDER: Lane[] = ['adl', 'mid', 'dsl', 'jg', 'sp'];

  // Map recommendation scores for quick badge display
  const recMap = useMemo(() => {
    const map = new Map<string, Recommendation>();
    recommendations.forEach((r) => map.set(r.hero.id.toLowerCase(), r));
    return map;
  }, [recommendations]);

  // Sync if targetLane changes from parent
  React.useEffect(() => {
    if (targetLane) {
      setSelectedLane(targetLane);
    }
  }, [targetLane]);

  const filteredHeroes = useMemo(() => {
    return ALL_HEROES.filter((hero) => {
      // Search filter (English name primary, can also match Thai if user types in Thai)
      const q = search.trim().toLowerCase();
      if (
        q &&
        !hero.name.toLowerCase().includes(q) &&
        !hero.nameTh.toLowerCase().includes(q)
      ) {
        return false;
      }

      // Lane filter
      if (selectedLane !== 'all') {
        const matchesLane =
          hero.primaryLane === selectedLane || hero.secondaryLanes?.includes(selectedLane);
        if (!matchesLane) return false;
      }

      // Only recommendations filter
      if (showOnlyRecs) {
        const rec = recMap.get(hero.id.toLowerCase());
        if (!rec || rec.score < 60) return false;
      }

      return true;
    }).sort((a, b) => {
      // If recommendations are present, sort recommended first
      const recA = recMap.get(a.id.toLowerCase())?.score ?? 0;
      const recB = recMap.get(b.id.toLowerCase())?.score ?? 0;
      if (recA !== recB) return recB - recA;

      // Otherwise sort by Tier
      const tierRank: Record<Tier, number> = { 'S+': 7, S: 6, 'A+': 5, A: 4, B: 3, C: 2, D: 1 };
      const diff = (tierRank[b.tier] || 0) - (tierRank[a.tier] || 0);
      if (diff !== 0) return diff;
      return b.winRate - a.winRate;
    });
  }, [search, selectedLane, showOnlyRecs, recMap]);

  const handleHeroClick = (hero: Hero, isUnavailable: boolean) => {
    if (isUnavailable) return;
    soundManager.playClick();
    onSelectHero(hero);
  };

  const handleInspectClick = (e: React.MouseEvent, hero: Hero) => {
    e.stopPropagation();
    soundManager.playClick();
    onInspectHero(hero);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
      {/* Side Picker Header Banner */}
      <div className="px-3 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-heading font-extrabold text-xs text-white uppercase tracking-wider">
            เลือกฮีโร่ ({filteredHeroes.length} ตัว)
          </span>
        </div>
        <div className="text-xs">
          <span className="text-slate-400">เป้าหมาย: </span>
          <span className={`font-bold font-heading ${activeTeam === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>
            {activeTeam === 'blue' ? 'ทีมฟ้า' : 'ทีมแดง'}
          </span>
          <span className="text-amber-400 font-bold ml-1">
            [{activeAction === 'ban' ? '🛡️ แบน' : targetLane ? `⚔️ ${LANE_CONFIG[targetLane].labelTh}` : '⚔️ เลือก'}]
          </span>
        </div>
      </div>

      {/* Search & Simplified Lane Toolbar */}
      <div className="p-2.5 bg-slate-950/70 border-b border-slate-800 space-y-2">
        {/* Search bar & Quick Toggles */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อฮีโร่... (เช่น Stuart, Elsu, Aoi, Florentino)"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white"
              >
                ล้าง
              </button>
            )}
          </div>

          {/* Quick Recommendations Toggle */}
          {recommendations.length > 0 && activeAction === 'pick' && (
            <button
              onClick={() => setShowOnlyRecs(!showOnlyRecs)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                showOnlyRecs
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-bold'
                  : 'bg-slate-800 text-amber-400 border border-amber-500/30 hover:bg-slate-700'
              }`}
            >
              <Flame className="w-3 h-3 fill-current" />
              <span>แนะนำ ({recommendations.filter((r) => r.score >= 65).length})</span>
            </button>
          )}
        </div>

        {/* 5 Standard Lanes Filter Tabs: แครี่ เลนกลาง ออฟ ป่า ซัพ */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
          <button
            onClick={() => setSelectedLane('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
              selectedLane === 'all'
                ? 'bg-slate-100 text-slate-950 font-bold shadow'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            ทั้งหมด
          </button>
          {LANE_ORDER.map((lane) => {
            const cfg = LANE_CONFIG[lane];
            const isSelected = selectedLane === lane;
            return (
              <button
                key={lane}
                onClick={() => setSelectedLane(lane)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{cfg.icon}</span>
                <span>{cfg.labelTh}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero Grid Container */}
      <div className="flex-1 p-2.5 overflow-y-auto">
        {filteredHeroes.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-sm">
            <Search className="w-8 h-8 mb-2 opacity-40" />
            <span>ไม่พบฮีโร่ตามเงื่อนไขที่ค้นหา</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
            {filteredHeroes.map((hero) => {
              const isBanned = bannedHeroIds.has(hero.id.toLowerCase());
              const isPicked = pickedHeroIds.has(hero.id.toLowerCase());
              const isUnavailable = isBanned || isPicked;
              const rec = recMap.get(hero.id.toLowerCase());
              const isHighRec = activeAction === 'pick' && rec && rec.score >= 70 && !isUnavailable;

              return (
                <div
                  key={hero.id}
                  onClick={() => handleHeroClick(hero, isUnavailable)}
                  className={`group relative p-1 rounded-xl border transition-all duration-200 flex flex-col items-center text-center select-none ${
                    isUnavailable
                      ? 'opacity-40 grayscale border-slate-800 bg-slate-950 cursor-not-allowed'
                      : isHighRec
                      ? 'border-amber-400/80 bg-gradient-to-b from-amber-950/40 to-slate-900 shadow-md shadow-amber-500/20 hover:scale-105 cursor-pointer ring-1 ring-amber-400/50'
                      : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-600 hover:bg-slate-800 hover:scale-102 cursor-pointer'
                  }`}
                >
                  {/* Top Recommendation Badge */}
                  {isHighRec && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[9px] font-extrabold flex items-center gap-0.5 shadow-sm whitespace-nowrap">
                      <Flame className="w-2.5 h-2.5 fill-current" />
                      <span>{rec.score}</span>
                    </div>
                  )}

                  {/* Picked / Banned Tag */}
                  {isPicked && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 px-2 py-0.5 rounded bg-slate-900/90 text-[10px] font-bold text-slate-300 border border-slate-700 whitespace-nowrap">
                      เลือกแล้ว
                    </div>
                  )}

                  {/* Hero Avatar */}
                  <div className="relative">
                    <HeroAvatar hero={hero} size="md" isBanned={isBanned} />
                    
                    {/* Info Button on Hover */}
                    <button
                      onClick={(e) => handleInspectClick(e, hero)}
                      title="ดูข้อมูลเจาะลึก"
                      className="absolute bottom-0 right-0 p-1 rounded-md bg-slate-900/90 text-slate-300 hover:text-amber-400 hover:bg-slate-800 opacity-80 group-hover:opacity-100 transition-opacity z-20"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Hero Name (English Only) */}
                  <div className="w-full mt-1.5 px-0.5">
                    <div className="font-heading font-bold text-xs text-slate-100 truncate leading-tight tracking-wide">
                      {hero.name}
                    </div>
                  </div>

                  {/* Recommendation Reason Highlight if applicable */}
                  {isHighRec && rec && rec.reasons.length > 0 && (
                    <div className="w-full mt-1 px-1 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] text-amber-300 truncate">
                      {rec.reasons[0].text}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info Bar */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>แสดง {filteredHeroes.length} / {ALL_HEROES.length} ฮีโร่</span>
          <span>•</span>
          <span className="text-slate-300">
            กำลังดำเนินการ: <strong className={activeTeam === 'blue' ? 'text-blue-400' : 'text-red-400'}>
              {activeTeam === 'blue' ? 'ทีมสีฟ้า (Blue)' : 'ทีมสีแดง (Red)'}
            </strong>{' '}
            [{activeAction === 'ban' ? 'แบนฮีโร่' : 'เลือกฮีโร่'}]
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">คลิกที่รูปเพื่อเลือก / คลิกตัว ℹ️ เพื่อดูสถิติและเคาน์เตอร์</span>
        </div>
      </div>
    </div>
  );
};
