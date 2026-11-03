import React, { useState } from 'react';
import { Hero, Lane } from '../types/rov';
import { ALL_HEROES, LANE_CONFIG, getHeroById } from '../data/allHeroes';
import { HeroAvatar } from './HeroAvatar';
import { Swords, ShieldAlert, Sparkles, Search, Lightbulb, ExternalLink } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface CounterMatrixViewProps {
  onInspectHero: (hero: Hero) => void;
}

export const CounterMatrixView: React.FC<CounterMatrixViewProps> = ({
  onInspectHero,
}) => {
  const [selectedHeroId, setSelectedHeroId] = useState<string>('florentino');
  const [search, setSearch] = useState('');
  const [selectedLane, setSelectedLane] = useState<Lane | 'all'>('all');

  const selectedHero = getHeroById(selectedHeroId) || ALL_HEROES[0];

  const filteredHeroList = ALL_HEROES.filter((h) => {
    const q = search.trim().toLowerCase();
    if (q && !h.name.toLowerCase().includes(q) && !h.nameTh.includes(q)) {
      return false;
    }
    if (selectedLane !== 'all' && h.primaryLane !== selectedLane && !h.secondaryLanes?.includes(selectedLane)) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title & Description */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 shadow-xl">
        <h2 className="font-heading font-extrabold text-xl text-amber-400 flex items-center gap-2 mb-1">
          <Swords className="w-5 h-5 text-amber-400" />
          ระบบค้นหาตัวแก้ทาง & คู่มือจับคู่เลน (RoV Counter Matrix)
        </h2>
        <p className="text-sm text-slate-300">
          เลือกฮีโร่เป้าหมายเพื่อวิเคราะห์ตัวแก้ทาง (Counter Picks), ตัวที่แพ้ทาง, คู่หูคอมโบ และไอเทมแก้ทางสำหรับทุกตำแหน่ง
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Hero Selector List */}
        <div className="lg:col-span-4 bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-col h-[650px]">
          <div className="space-y-2 mb-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาฮีโร่ที่จะแก้ทาง..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Lane Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
              <button
                onClick={() => setSelectedLane('all')}
                className={`px-2.5 py-1 rounded-md cursor-pointer ${
                  selectedLane === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                }`}
              >
                ทั้งหมด
              </button>
              {(['adl', 'mid', 'dsl', 'jg', 'sp'] as Lane[]).map((lane) => (
                <button
                  key={lane}
                  onClick={() => setSelectedLane(lane)}
                  className={`px-2 py-1 rounded-md cursor-pointer whitespace-nowrap ${
                    selectedLane === lane
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {LANE_CONFIG[lane].labelTh}
                </button>
              ))}
            </div>
          </div>

          {/* Hero List Scroll */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filteredHeroList.map((hero) => {
              const isSelected = hero.id.toLowerCase() === selectedHeroId.toLowerCase();
              return (
                <div
                  key={hero.id}
                  onClick={() => {
                    soundManager.playClick();
                    setSelectedHeroId(hero.id);
                  }}
                  className={`flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500/70 shadow-md shadow-amber-500/20'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60'
                  }`}
                >
                  <HeroAvatar hero={hero} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="font-heading font-bold text-sm text-slate-100 truncate">
                      {hero.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                      <span>{hero.role}</span>
                      <span>•</span>
                      <span>Tier {hero.tier}</span>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    {LANE_CONFIG[hero.primaryLane].labelTh}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: In-Depth Counter Breakdown */}
        <div className="lg:col-span-8 space-y-5">
          {/* Active Hero Banner Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <HeroAvatar hero={selectedHero} size="lg" />
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-heading font-extrabold text-2xl text-white">
                    {selectedHero.name}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Tier {selectedHero.tier}
                  </span>
                </div>
                <div className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                  <span>ตำแหน่ง: <strong>{LANE_CONFIG[selectedHero.primaryLane].labelTh}</strong></span>
                  <span>•</span>
                  <span>สาย: <strong>{selectedHero.role}</strong></span>
                  <span>•</span>
                  <span>ประเภทดาเมจ: <strong className="text-amber-400 uppercase">{selectedHero.damageType}</strong></span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onInspectHero(selectedHero)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 cursor-pointer transition-colors whitespace-nowrap"
            >
              ดูสถิติเต็ม ↗
            </button>
          </div>

          {/* Editorial Counter Strategy Tip */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <Lightbulb className="w-4 h-4" />
              กลยุทธ์และวิธีเอาชนะ {selectedHero.name} ในแมตช์
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-sans">
              {selectedHero.draftTipsTh}
            </p>
          </div>

          {/* 1. Best Counter Picks (ตัวที่ชนะทาง / หยิบมาแก้ทาง) */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-rose-900/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-base text-rose-400 flex items-center gap-2">
                <Swords className="w-5 h-5 text-rose-400" />
                ฮีโร่ที่แก้ทาง {selectedHero.name} ได้ดีที่สุด (Hard Counters)
              </h3>
              <span className="text-xs text-slate-400">คลิกเพื่อดูรายละเอียด</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {selectedHero.counteredBy.map((cId) => {
                const counterHero = getHeroById(cId);
                if (!counterHero) return null;
                return (
                  <div
                    key={cId}
                    onClick={() => {
                      soundManager.playClick();
                      onInspectHero(counterHero);
                    }}
                    className="p-3 rounded-xl bg-slate-950/70 border border-rose-900/40 hover:border-rose-500 transition-all cursor-pointer flex items-center gap-3 group"
                  >
                    <HeroAvatar hero={counterHero} size="md" />
                    <div className="min-w-0">
                      <div className="font-heading font-bold text-sm text-rose-200 group-hover:text-white truncate">
                        {counterHero.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {counterHero.role} • {LANE_CONFIG[counterHero.primaryLane].labelTh}
                      </div>
                      <div className="text-[10px] text-rose-400/90 font-medium mt-0.5">
                        ชนะทางชัดเจน ✓
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Heroes Countered By This Hero (ตัวที่ห้ามหยิบมาเจอ) */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-900/40 shadow-xl space-y-3">
            <h3 className="font-heading font-bold text-base text-emerald-400 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-emerald-400" />
              ฮีโร่ที่ {selectedHero.name} กดดันชนะทาง (Victims - อย่าหยิบมาชน)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {selectedHero.counters.map((cId) => {
                const victimHero = getHeroById(cId);
                if (!victimHero) return null;
                return (
                  <div
                    key={cId}
                    onClick={() => {
                      soundManager.playClick();
                      onInspectHero(victimHero);
                    }}
                    className="p-3 rounded-xl bg-slate-950/70 border border-emerald-900/40 hover:border-emerald-500 transition-all cursor-pointer flex items-center gap-3 group"
                  >
                    <HeroAvatar hero={victimHero} size="md" />
                    <div className="min-w-0">
                      <div className="font-heading font-bold text-sm text-emerald-200 group-hover:text-white truncate">
                        {victimHero.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {victimHero.role} • {LANE_CONFIG[victimHero.primaryLane].labelTh}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        แพ้ทาง {selectedHero.name}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Synergies (คู่หูคอมโบยอดเยี่ยม) */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-sky-900/40 shadow-xl space-y-3">
            <h3 className="font-heading font-bold text-base text-sky-400 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-400" />
              เพื่อนร่วมทีมที่คอมโบด้วยแล้วโหดที่สุด (Best Teammates)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {selectedHero.synergies.map((sId) => {
                const allyHero = getHeroById(sId);
                if (!allyHero) return null;
                return (
                  <div
                    key={sId}
                    onClick={() => {
                      soundManager.playClick();
                      onInspectHero(allyHero);
                    }}
                    className="p-3 rounded-xl bg-slate-950/70 border border-sky-900/40 hover:border-sky-500 transition-all cursor-pointer flex items-center gap-3 group"
                  >
                    <HeroAvatar hero={allyHero} size="md" />
                    <div className="min-w-0">
                      <div className="font-heading font-bold text-sm text-sky-200 group-hover:text-white truncate">
                        {allyHero.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {allyHero.role} • {LANE_CONFIG[allyHero.primaryLane].labelTh}
                      </div>
                      <div className="text-[10px] text-sky-300 font-medium mt-0.5">
                        คอมโบพลังสูง ⚡
                      </div>
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
