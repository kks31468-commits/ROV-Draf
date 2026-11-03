import React, { useState, useEffect } from 'react';
import { Hero, Lane, TeamAnalysis } from '../types/rov';
import { PRESET_COMPS, PresetComp, LANE_CONFIG, getHeroById, ALL_HEROES } from '../data/allHeroes';
import { HeroAvatar } from './HeroAvatar';
import { analyzeTeamComp } from '../utils/draftEngine';
import { Sparkles, Trophy, Plus, Trash2, CheckCircle2, Bookmark, Share2 } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface CompBuilderViewProps {
  onLoadIntoDraft: (picks: Record<Lane, Hero | null>) => void;
  onInspectHero: (hero: Hero) => void;
}

export const CompBuilderView: React.FC<CompBuilderViewProps> = ({
  onLoadIntoDraft,
  onInspectHero,
}) => {
  const [currentSquad, setCurrentSquad] = useState<Record<Lane, Hero | null>>({
    dsl: getHeroById('florentino') || null,
    jg: getHeroById('aoi') || null,
    mid: getHeroById('liliana') || null,
    adl: getHeroById('stuart') || null,
    sp: getHeroById('dolia') || null,
  });

  const [savedComps, setSavedComps] = useState<{ id: string; name: string; squad: Record<Lane, Hero | null> }[]>([]);
  const [compNameInput, setCompNameInput] = useState('');
  const [activeLaneSelector, setActiveLaneSelector] = useState<Lane | null>(null);

  // Load saved comps from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('rov_saved_comps');
      if (stored) {
        setSavedComps(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveCurrentSquad = () => {
    if (!compNameInput.trim()) return;
    const newEntry = {
      id: Date.now().toString(),
      name: compNameInput.trim(),
      squad: { ...currentSquad },
    };
    const updated = [newEntry, ...savedComps];
    setSavedComps(updated);
    try {
      localStorage.setItem('rov_saved_comps', JSON.stringify(updated));
    } catch {
      // ignore
    }
    setCompNameInput('');
    soundManager.playPickLock();
  };

  const deleteSavedComp = (id: string) => {
    const updated = savedComps.filter((c) => c.id !== id);
    setSavedComps(updated);
    try {
      localStorage.setItem('rov_saved_comps', JSON.stringify(updated));
    } catch {
      // ignore
    }
    soundManager.playClick();
  };

  const loadPreset = (preset: PresetComp) => {
    const loaded: Record<Lane, Hero | null> = {
      dsl: getHeroById(preset.heroes.dsl) || null,
      jg: getHeroById(preset.heroes.jg) || null,
      mid: getHeroById(preset.heroes.mid) || null,
      adl: getHeroById(preset.heroes.adl) || null,
      sp: getHeroById(preset.heroes.sp) || null,
    };
    setCurrentSquad(loaded);
    soundManager.playPickLock();
  };

  const squadPicks = Object.values(currentSquad);
  const analysis: TeamAnalysis = analyzeTeamComp(squadPicks);
  const lanes: Lane[] = ['dsl', 'jg', 'mid', 'adl', 'sp'];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-extrabold text-xl text-amber-400 flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-amber-400" />
            ห้องทดลองจัดทีม 5 ตำแหน่ง & แผนกลยุทธ์ (Squad Lab)
          </h2>
          <p className="text-sm text-slate-300">
            ออกแบบคอมพ์ 5 คน ตรวจสอบจุดแข็ง-จุดอ่อน และโหลดคอมพ์เมต้ายอดนิยมเข้าสู่กระดานดราฟท์ทันที
          </p>
        </div>

        <button
          onClick={() => {
            soundManager.playPickLock();
            onLoadIntoDraft(currentSquad);
          }}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-heading font-extrabold text-xs shadow-lg shadow-amber-500/20 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
        >
          🚀 นำคอมพ์นี้ไปใช้ในหน้าดราฟท์ (Draft Board)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Preset Comps & Saved Comps */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <h3 className="font-heading font-bold text-sm text-amber-400 mb-3 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              แผนคอมพ์ยอดฮิตระดับโปรลีก (Meta Presets)
            </h3>

            <div className="space-y-2.5">
              {PRESET_COMPS.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => loadPreset(preset)}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-amber-500/60 hover:bg-slate-900 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-heading font-bold text-xs text-slate-100 group-hover:text-amber-300">
                      {preset.nameTh}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                      {preset.archetype}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 font-sans">
                    {preset.descriptionTh}
                  </p>

                  {/* 5 Heroes Avatars Row */}
                  <div className="flex items-center gap-1.5">
                    {(['dsl', 'jg', 'mid', 'adl', 'sp'] as Lane[]).map((lane) => {
                      const h = getHeroById(preset.heroes[lane]);
                      if (!h) return null;
                      return (
                        <div key={lane} title={`${LANE_CONFIG[lane].short}: ${h.nameTh}`}>
                          <HeroAvatar hero={h} size="sm" showTier={false} className="w-7 h-7 rounded-lg" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Saved Custom Comps */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <h3 className="font-heading font-bold text-sm text-slate-200 mb-3 flex items-center gap-1.5">
              <Bookmark className="w-4 h-4 text-sky-400" />
              คอมพ์ที่คุณบันทึกไว้ ({savedComps.length})
            </h3>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={compNameInput}
                onChange={(e) => setCompNameInput(e.target.value)}
                placeholder="ตั้งชื่อคอมพ์นี้..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={saveCurrentSquad}
                disabled={!compNameInput.trim()}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs cursor-pointer"
              >
                บันทึก
              </button>
            </div>

            {savedComps.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-500">
                ยังไม่มีคอมพ์ที่บันทึกไว้
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {savedComps.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div
                      onClick={() => {
                        setCurrentSquad(c.squad);
                        soundManager.playPickLock();
                      }}
                      className="cursor-pointer flex-1"
                    >
                      <div className="font-heading font-bold text-xs text-slate-200 hover:text-amber-400">
                        {c.name}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {lanes.map((lane) => {
                          const h = c.squad[lane];
                          if (!h) return null;
                          return (
                            <span key={lane} className="text-[10px] text-slate-400">
                              {h.nameTh.split(' ')[0]}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => deleteSavedComp(c.id)}
                      className="text-slate-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 5 Lanes Squad Slots & Real-Time Radar Analysis */}
        <div className="lg:col-span-7 space-y-4">
          {/* Active 5 Slots */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
            <h3 className="font-heading font-bold text-base text-slate-100 flex items-center justify-between">
              <span>จัดสมาชิก 5 ตำแหน่ง (Current Lineup)</span>
              <span className="text-xs font-normal text-slate-400">
                คลิกที่ตำแหน่งเพื่อเปลี่ยนตัวละคร
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
              {lanes.map((lane) => {
                const hero = currentSquad[lane];
                const cfg = LANE_CONFIG[lane];
                return (
                  <div
                    key={lane}
                    onClick={() => {
                      soundManager.playClick();
                      setActiveLaneSelector(activeLaneSelector === lane ? null : lane);
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center text-center cursor-pointer transition-all ${
                      activeLaneSelector === lane
                        ? 'border-amber-400 bg-amber-950/40 ring-1 ring-amber-400/50'
                        : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-amber-400 mb-1 flex items-center gap-1">
                      <span>{cfg.icon}</span> {cfg.short}
                    </div>

                    {hero ? (
                      <div>
                        <HeroAvatar hero={hero} size="md" />
                        <div className="font-heading font-bold text-xs text-slate-100 mt-1.5 truncate w-20">
                          {hero.nameTh}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Tier {hero.tier}
                        </div>
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-slate-500">
                        <Plus className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Hero Selector for Selected Lane */}
            {activeLaneSelector && (
              <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-amber-500/40">
                <div className="text-xs font-bold text-amber-400 mb-2 flex items-center justify-between">
                  <span>เลือกฮีโร่สำหรับตำแหน่ง {LANE_CONFIG[activeLaneSelector].labelTh}</span>
                  <button
                    onClick={() => setActiveLaneSelector(null)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    ปิด
                  </button>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
                  {ALL_HEROES.filter(
                    (h) => h.primaryLane === activeLaneSelector || h.secondaryLanes?.includes(activeLaneSelector)
                  ).map((h) => (
                    <div
                      key={h.id}
                      onClick={() => {
                        soundManager.playPickLock();
                        setCurrentSquad({ ...currentSquad, [activeLaneSelector]: h });
                        setActiveLaneSelector(null);
                      }}
                      className="p-1.5 rounded-lg border border-slate-800 hover:border-amber-400 bg-slate-900 cursor-pointer flex flex-col items-center text-center"
                    >
                      <HeroAvatar hero={h} size="sm" showTier={false} />
                      <span className="text-[10px] font-bold mt-1 truncate w-14 text-slate-200">
                        {h.nameTh}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Squad Radar & Stat Evaluation */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400">
                  คะแนนสมดุลของทีม
                </span>
                <div className="font-heading font-extrabold text-2xl text-amber-400">
                  {analysis.overallScore} / 100
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase text-slate-400">รูปแบบทีม</span>
                <div className="font-heading font-bold text-sm text-emerald-400">
                  {analysis.compArchetype}
                </div>
              </div>
            </div>

            {/* Damage Ratio Bar */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>สมดุลความเสียหาย (Damage Composition)</span>
                <span className="text-[11px] text-slate-400">
                  กายภาพ {analysis.physicalPct}% | เวท {analysis.magicPct}% | True {analysis.truePct}%
                </span>
              </div>
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                <div
                  className="bg-amber-500 h-full"
                  style={{ width: `${analysis.physicalPct}%` }}
                />
                <div
                  className="bg-purple-500 h-full"
                  style={{ width: `${analysis.magicPct}%` }}
                />
                <div
                  className="bg-sky-400 h-full"
                  style={{ width: `${analysis.truePct}%` }}
                />
              </div>
            </div>

            {/* Stat Bars */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>พลังควบคุม / สตั๊น (CC)</span>
                  <span className="font-bold text-indigo-400">{analysis.avgCc}/10</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${analysis.avgCc * 10}%` }} />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>ความหนา / แนวหน้า</span>
                  <span className="font-bold text-emerald-400">{analysis.avgSurvivability}/10</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${analysis.avgSurvivability * 10}%` }} />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>การเดินเกม / เคลื่อนที่</span>
                  <span className="font-bold text-sky-400">{analysis.avgMobility}/10</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="bg-sky-500 h-full rounded-full" style={{ width: `${analysis.avgMobility * 10}%` }} />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>พลังช่วงเลทเกม</span>
                  <span className="font-bold text-purple-400">{analysis.avgLateGame}/10</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${analysis.avgLateGame * 10}%` }} />
                </div>
              </div>
            </div>

            {/* Warnings / Strengths */}
            <div className="space-y-1.5 pt-1">
              {analysis.warnings.map((w, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-lg text-xs border ${
                    w.level === 'danger'
                      ? 'bg-rose-950/40 border-rose-800/40 text-rose-200'
                      : w.level === 'warning'
                      ? 'bg-amber-950/40 border-amber-800/40 text-amber-200'
                      : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-200'
                  }`}
                >
                  <strong className="block font-bold">{w.title}</strong>
                  <span className="text-[11px] opacity-90">{w.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
