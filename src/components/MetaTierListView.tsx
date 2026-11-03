import React, { useState } from 'react';
import { Hero, Lane, Tier } from '../types/rov';
import { ALL_HEROES, LANE_CONFIG } from '../data/allHeroes';
import { HeroAvatar } from './HeroAvatar';
import { Trophy, Search, Filter, ExternalLink, Zap } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface MetaTierListViewProps {
  onInspectHero: (hero: Hero) => void;
}

const TIER_ORDER: Tier[] = ['S+', 'S', 'A+', 'A', 'B', 'C'];

const TIER_DESCRIPTIONS: Record<Tier, { titleTh: string; descTh: string; badgeClass: string; borderClass: string }> = {
  'S+': {
    titleTh: 'Tier S+ (Meta Defining / God Tier)',
    descTh: 'ฮีโร่ตัวโกงประจำแพตช์ มีอิทธิพลต่อเกมสูงที่สุด ต้องแย่งหยิบเป็นตัวแรกหรือแบนทิ้ง',
    badgeClass: 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20',
    borderClass: 'border-amber-500/40 bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900',
  },
  S: {
    titleTh: 'Tier S (Strong Competitive)',
    descTh: 'ฮีโร่ตัวท็อป ประสิทธิภาพสูงสม่ำเสมอในทุกแมตช์ เล่นง่ายและแบกทีมได้ดี',
    badgeClass: 'bg-purple-500 text-slate-950 shadow-lg shadow-purple-500/20',
    borderClass: 'border-purple-500/40 bg-gradient-to-r from-purple-950/20 via-slate-900 to-slate-900',
  },
  'A+': {
    titleTh: 'Tier A+ (Solid & Viable)',
    descTh: 'ฮีโร่มาตรฐานแข็งแกร่ง มีจุดเด่นเฉพาะตัวสูง เหมาะกับแผนและการเล่นแบบแก้ทาง',
    badgeClass: 'bg-blue-500 text-slate-950 shadow-lg shadow-blue-500/20',
    borderClass: 'border-blue-500/40 bg-gradient-to-r from-blue-950/20 via-slate-900 to-slate-900',
  },
  A: {
    titleTh: 'Tier A (Balanced & Situational)',
    descTh: 'ฮีโร่ที่มีความสมดุล สามารถหยิบมาเล่นได้ดีเมื่อทีมมีคอมโบรองรับหรือเจอกับศัตรูที่แพ้ทาง',
    badgeClass: 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20',
    borderClass: 'border-emerald-500/40 bg-gradient-to-r from-emerald-950/20 via-slate-900 to-slate-900',
  },
  B: {
    titleTh: 'Tier B (Situational Picks)',
    descTh: 'ต้องการเงื่อนไขเฉพาะในการเล่น หรือพึ่งพาการดราฟท์แก้ทางเป็นพิเศษ',
    badgeClass: 'bg-slate-500 text-slate-950',
    borderClass: 'border-slate-700 bg-slate-900',
  },
  C: {
    titleTh: 'Tier C (Niche / Hard Matchups)',
    descTh: 'ฮีโร่เฉพาะทางสูง หรืออยู่ในช่วงปรับสมดุล ต้องอาศัยผู้เล่นชำนาญการหรือแผนเฉพาะ',
    badgeClass: 'bg-zinc-600 text-zinc-200',
    borderClass: 'border-zinc-800 bg-slate-950',
  },
  D: {
    titleTh: 'Tier D (Off-Meta)',
    descTh: 'ฮีโร่นอกเมต้าที่รอการปรับปรุงความสามารถ',
    badgeClass: 'bg-zinc-700 text-zinc-300',
    borderClass: 'border-zinc-800 bg-slate-950',
  },
};

export const MetaTierListView: React.FC<MetaTierListViewProps> = ({
  onInspectHero,
}) => {
  const [selectedLane, setSelectedLane] = useState<Lane | 'all'>('all');
  const [search, setSearch] = useState('');

  const filteredHeroes = ALL_HEROES.filter((hero) => {
    const q = search.trim().toLowerCase();
    if (q && !hero.name.toLowerCase().includes(q) && !hero.nameTh.includes(q)) {
      return false;
    }
    if (selectedLane !== 'all') {
      const match = hero.primaryLane === selectedLane || hero.secondaryLanes?.includes(selectedLane);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-extrabold text-xl text-amber-400 flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-amber-400" />
            ตารางเทียร์ฮีโร่ RoV Meta ล่าสุด (Official Thai Server Tier List)
          </h2>
          <p className="text-sm text-slate-300">
            อ้างอิงข้อมูลสถิติจาก rovmeta.com ครบทั้ง 131 ฮีโร่ โดยรวมข้อมูลการแข่งระดับโปรลีกและการจัดอันดับในแรงค์เซิร์ฟเวอร์ไทย
          </p>
        </div>

        <a
          href="https://rovmeta.com/th/heroes"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-400 border border-slate-700 transition-colors w-fit"
        >
          <span>เปิดเว็บไซต์ rovmeta.com</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
        {/* Lane Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedLane('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
              selectedLane === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            ทุกตำแหน่ง
          </button>
          {(['adl', 'mid', 'dsl', 'jg', 'sp'] as Lane[]).map((lane) => {
            const cfg = LANE_CONFIG[lane];
            return (
              <button
                key={lane}
                onClick={() => setSelectedLane(lane)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  selectedLane === lane
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{cfg.icon}</span>
                <span>{cfg.labelTh}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อฮีโร่ในตารางเทียร์..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Tier Sections */}
      <div className="space-y-6">
        {TIER_ORDER.map((tier) => {
          const tierHeroes = filteredHeroes.filter((h) => h.tier === tier);
          const tierMeta = TIER_DESCRIPTIONS[tier];

          if (tierHeroes.length === 0) return null;

          return (
            <div
              key={tier}
              className={`p-5 rounded-2xl border shadow-xl ${tierMeta.borderClass}`}
            >
              {/* Tier Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-2 mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl font-heading font-extrabold text-base flex items-center justify-center ${tierMeta.badgeClass}`}
                  >
                    {tier}
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base text-white">
                      {tierMeta.titleTh}
                    </h3>
                    <p className="text-xs text-slate-400 font-sans">
                      {tierMeta.descTh}
                    </p>
                  </div>
                </div>

                <div className="text-xs font-semibold text-slate-400">
                  จำนวน {tierHeroes.length} ตัวละคร
                </div>
              </div>

              {/* Heroes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {tierHeroes.map((hero) => {
                  const laneCfg = LANE_CONFIG[hero.primaryLane];
                  return (
                    <div
                      key={hero.id}
                      onClick={() => {
                        soundManager.playClick();
                        onInspectHero(hero);
                      }}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-600 hover:bg-slate-800/70 transition-all cursor-pointer flex flex-col items-center text-center group"
                    >
                      <HeroAvatar hero={hero} size="md" />

                      <div className="mt-2 w-full">
                        <div className="font-heading font-bold text-sm text-slate-100 group-hover:text-amber-400 transition-colors truncate">
                          {hero.name}
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-800/70 w-full flex items-center justify-between text-[10px] text-slate-400">
                        <span className="flex items-center gap-0.5">
                          <span>{laneCfg.icon}</span> {laneCfg.short}
                        </span>
                        <span className="font-bold text-emerald-400">
                          {hero.winRate}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
