import React from 'react';
import { Hero } from '../types/rov';
import { HeroAvatar } from './HeroAvatar';
import { LANE_CONFIG, getHeroById } from '../data/allHeroes';
import { X, ShieldAlert, Sparkles, Swords, Zap, ExternalLink } from 'lucide-react';

interface HeroDetailModalProps {
  hero: Hero | null;
  onClose: () => void;
  onSelectHero?: (hero: Hero) => void;
}

export const HeroDetailModal: React.FC<HeroDetailModalProps> = ({
  hero,
  onClose,
  onSelectHero,
}) => {
  if (!hero) return null;

  const laneInfo = LANE_CONFIG[hero.primaryLane];

  const handleRelatedClick = (targetId: string) => {
    const found = getHeroById(targetId);
    if (found && onSelectHero) {
      onSelectHero(found);
    }
  };

  const statItems = [
    { label: 'ควบคุม/สตั๊น (CC)', val: hero.stats.cc, color: 'bg-indigo-500' },
    { label: 'เบิร์สดาเมจ (Burst)', val: hero.stats.burst, color: 'bg-rose-500' },
    { label: 'ความคล่องตัว (Mobility)', val: hero.stats.mobility, color: 'bg-sky-500' },
    { label: 'ความอึด/ทนทาน (Survivability)', val: hero.stats.survivability, color: 'bg-emerald-500' },
    { label: 'เคลียร์เวฟ (Wave Clear)', val: hero.stats.waveClear, color: 'bg-amber-500' },
    { label: 'พลังช่วงเลทเกม (Late Game)', val: hero.stats.lateGamePower, color: 'bg-purple-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="relative p-5 pb-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/70 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <HeroAvatar hero={hero} size="lg" />
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-2xl font-bold font-heading text-white">{hero.nameTh}</span>
                <span className="text-slate-400 font-heading text-lg">({hero.name})</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Tier {hero.tier}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300 border border-slate-700">
                  {hero.role}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                <span className="flex items-center gap-1 text-slate-300 font-medium">
                  <span>{laneInfo.icon}</span> {laneInfo.labelTh}
                </span>
                <span>•</span>
                <span className="capitalize text-slate-300">
                  ดาเมจ: <strong className="text-amber-400">{hero.damageType}</strong>
                </span>
                <span>•</span>
                <span>สเปล: <strong className="text-sky-300">{hero.challengerSpellTh}</strong></span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Key Win/Ban Rates Bar */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
            <div>
              <div className="text-xs text-slate-400">อัตราชนะ (Win Rate)</div>
              <div className="text-lg font-bold font-heading text-emerald-400">{hero.winRate}%</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">อัตราการเลือก (Pick)</div>
              <div className="text-lg font-bold font-heading text-sky-400">{hero.pickRate}%</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">อัตราการแบน (Ban)</div>
              <div className="text-lg font-bold font-heading text-rose-400">{hero.banRate}%</div>
            </div>
          </div>

          {/* Draft Analysis Editorial */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-800/40">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5 mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              คำแนะนำการดราฟท์ & จังหวะไฟต์ (RoV Meta Tips)
            </h4>
            <p className="text-sm text-slate-200 leading-relaxed font-sans">
              {hero.draftTipsTh}
            </p>
          </div>

          {/* Pros & Cons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-emerald-900/30">
              <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-2">
                <Zap className="w-3.5 h-3.5" /> จุดเด่นสำคัญ
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {hero.prosTh.map((pro, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-rose-900/30">
              <h5 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 mb-2">
                <ShieldAlert className="w-3.5 h-3.5" /> ข้อควรระวัง / จุดอ่อน
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {hero.consTh.map((con, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold mt-0.5">✕</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Stat Ratings */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              ค่าพลังสถานะ & ความสามารถเฉพาะตัว
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {statItems.map((stat) => (
                <div key={stat.label} className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{stat.label}</span>
                    <span className="font-bold font-heading text-white">{stat.val}/10</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stat.color} transition-all duration-500 rounded-full`}
                      style={{ width: `${stat.val * 10}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Counters & Synergies */}
          <div className="space-y-3 pt-1">
            {/* Wins Against */}
            <div>
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-2">
                <Swords className="w-3.5 h-3.5" /> ชนะทาง / ดราฟท์มาแก้ทาง (Counters):
              </div>
              <div className="flex flex-wrap gap-2">
                {hero.counters.map((cId) => {
                  const target = getHeroById(cId);
                  if (!target) return null;
                  return (
                    <button
                      key={cId}
                      onClick={() => handleRelatedClick(cId)}
                      className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/40 hover:border-emerald-500 transition-colors text-xs text-emerald-200 cursor-pointer"
                    >
                      <HeroAvatar hero={target} size="sm" showTier={false} className="w-6 h-6 rounded-md" />
                      <span>{target.nameTh}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Countered By */}
            <div>
              <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5 mb-2">
                <ShieldAlert className="w-3.5 h-3.5" /> ระวัง / แพ้ทางตัวเหล่านี้ (Countered By):
              </div>
              <div className="flex flex-wrap gap-2">
                {hero.counteredBy.map((cId) => {
                  const target = getHeroById(cId);
                  if (!target) return null;
                  return (
                    <button
                      key={cId}
                      onClick={() => handleRelatedClick(cId)}
                      className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-800/40 hover:border-rose-500 transition-colors text-xs text-rose-200 cursor-pointer"
                    >
                      <HeroAvatar hero={target} size="sm" showTier={false} className="w-6 h-6 rounded-md" />
                      <span>{target.nameTh}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Synergies */}
            <div>
              <div className="text-xs font-bold text-sky-400 flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5" /> คู่หูคอมโบยอดเยี่ยม (Synergies):
              </div>
              <div className="flex flex-wrap gap-2">
                {hero.synergies.map((sId) => {
                  const target = getHeroById(sId);
                  if (!target) return null;
                  return (
                    <button
                      key={sId}
                      onClick={() => handleRelatedClick(sId)}
                      className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-sky-950/40 border border-sky-800/40 hover:border-sky-500 transition-colors text-xs text-sky-200 cursor-pointer"
                    >
                      <HeroAvatar hero={target} size="sm" showTier={false} className="w-6 h-6 rounded-md" />
                      <span>{target.nameTh}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Core Recommended Items */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <h5 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
              ไอเทมหลักยอดนิยม (Core Items Build)
            </h5>
            <div className="flex flex-wrap gap-2">
              {hero.coreItemsTh.map((item, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>อ้างอิงข้อมูลเมต้าล่าสุดจาก rovmeta.com (Thai Server)</span>
          <a
            href={`https://rovmeta.com/th/heroes/${hero.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold"
          >
            ดูหน้านี้บน rovmeta.com <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
