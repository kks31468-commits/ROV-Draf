import React, { useState } from 'react';
import { Hero, Lane, Recommendation, TeamAnalysis } from '../types/rov';
import { LANE_CONFIG } from '../data/allHeroes';
import { HeroAvatar } from './HeroAvatar';
import { compareLaneMatchup } from '../utils/draftEngine';
import {
  Sparkles,
  ShieldAlert,
  Flame,
  Swords,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface DraftAssistantProps {
  activeTeam: 'blue' | 'red';
  targetLane: Lane | null;
  blueAnalysis: TeamAnalysis;
  redAnalysis: TeamAnalysis;
  recommendations: Recommendation[];
  bluePicks: Record<Lane, Hero | null>;
  redPicks: Record<Lane, Hero | null>;
  onQuickPick: (hero: Hero) => void;
  onInspectHero: (hero: Hero) => void;
}

export const DraftAssistant: React.FC<DraftAssistantProps> = ({
  activeTeam,
  targetLane,
  blueAnalysis,
  redAnalysis,
  recommendations,
  bluePicks,
  redPicks,
  onQuickPick,
  onInspectHero,
}) => {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'analysis' | 'matchups'>('recommendations');
  const [selectedMatchupLane, setSelectedMatchupLane] = useState<Lane>(targetLane || 'dsl');

  const currentAnalysis = activeTeam === 'blue' ? blueAnalysis : redAnalysis;
  const lanes: Lane[] = ['dsl', 'jg', 'mid', 'adl', 'sp'];

  const matchupData = compareLaneMatchup(
    bluePicks[selectedMatchupLane],
    redPicks[selectedMatchupLane],
    selectedMatchupLane
  );

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-full text-slate-100">
      {/* Assistant Header & Tab Selector */}
      <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 font-bold shadow-md shadow-amber-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm text-slate-100">
              ผู้ช่วยวิเคราะห์ดราฟท์อัจฉริยะ (RoV AI Drafter)
            </h3>
            <p className="text-[11px] text-slate-400">
              วิเคราะห์เคาน์เตอร์พิค & คอมโบสำหรับ{' '}
              <strong className={activeTeam === 'blue' ? 'text-blue-400' : 'text-red-400'}>
                {activeTeam === 'blue' ? 'ทีมฟ้า' : 'ทีมแดง'}
              </strong>
              {targetLane ? ` (${LANE_CONFIG[targetLane].short})` : ''}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'recommendations'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🔥 แนะนำฮีโร่
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'analysis'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 วิเคราะห์ทีม ({currentAnalysis.overallScore}%)
          </button>
          <button
            onClick={() => setActiveTab('matchups')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'matchups'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚔️ จับคู่เลน
          </button>
        </div>
      </div>

      {/* Tab 1: Recommendations */}
      {activeTab === 'recommendations' && (
        <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
          {/* Quick Notice */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              อันดับแนะนำที่ดีที่สุดสำหรับ{' '}
              <strong className="text-amber-400">
                {targetLane ? LANE_CONFIG[targetLane].labelTh : 'ตำแหน่งถัดไป'}
              </strong>
            </span>
            <span className="text-[11px] text-slate-500">เรียงตามคะแนนความได้เปรียบ</span>
          </div>

          {recommendations.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
              ไม่มีฮีโร่แนะนำสำหรับสถานะปัจจุบัน
            </div>
          ) : (
            recommendations.slice(0, 5).map((rec, index) => {
              const { hero, score, reasons, counterTargets, synergyAllies } = rec;
              const laneCfg = LANE_CONFIG[hero.primaryLane];

              return (
                <div
                  key={hero.id}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col gap-2 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Rank Number */}
                      <span className="font-heading font-extrabold text-slate-500 text-sm w-4">
                        #{index + 1}
                      </span>

                      <div
                        onClick={() => onInspectHero(hero)}
                        className="cursor-pointer hover:scale-105 transition-transform"
                        title="ดูรายละเอียดฮีโร่"
                      >
                        <HeroAvatar hero={hero} size="sm" />
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-heading font-bold text-sm text-slate-100">
                            {hero.nameTh}
                          </span>
                          <span className="text-xs text-slate-400">({hero.name})</span>
                          <span className="text-[10px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                            {hero.tier}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <span>{laneCfg.icon} {laneCfg.labelTh}</span>
                          <span>•</span>
                          <span className="capitalize">{hero.damageType}</span>
                          <span>•</span>
                          <span>ชนะ {hero.winRate}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Score and Quick Pick Button */}
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 uppercase">คะแนนดราฟท์</div>
                        <div className="text-base font-heading font-extrabold text-amber-400 flex items-center gap-0.5 justify-end">
                          <Flame className="w-3.5 h-3.5 fill-current" />
                          <span>{score}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          soundManager.playPickLock();
                          onQuickPick(hero);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                      >
                        เลือกตัวนี้
                      </button>
                    </div>
                  </div>

                  {/* Why Pick Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {reasons.map((r, rIdx) => (
                      <span
                        key={rIdx}
                        className={`text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 border ${
                          r.type === 'counter'
                            ? 'bg-rose-950/40 text-rose-300 border-rose-800/40'
                            : r.type === 'synergy'
                            ? 'bg-sky-950/40 text-sky-300 border-sky-800/40'
                            : r.type === 'team_need'
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40 font-semibold'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {r.type === 'counter' && <Swords className="w-3 h-3 text-rose-400" />}
                        {r.type === 'synergy' && <Sparkles className="w-3 h-3 text-sky-400" />}
                        {r.type === 'team_need' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        <span>{r.text}</span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Team Analysis & Alerts */}
      {activeTab === 'analysis' && (
        <div className="flex-1 p-3 overflow-y-auto space-y-4">
          {/* Team Archetype Header */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">รูปแบบทีม (Archetype)</div>
              <div className="font-heading font-bold text-sm text-amber-400">
                {currentAnalysis.compArchetype}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase">ความพร้อมภาพรวม</div>
              <div className="font-heading font-extrabold text-xl text-emerald-400">
                {currentAnalysis.overallScore} / 100
              </div>
            </div>
          </div>

          {/* Damage Composition Bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1.5">
              <span>สัดส่วนความเสียหาย (Damage Ratio)</span>
              <span className="text-[11px] text-slate-400">
                กายภาพ {currentAnalysis.physicalPct}% | เวท {currentAnalysis.magicPct}% | จริง {currentAnalysis.truePct}%
              </span>
            </div>
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
              <div
                className="bg-amber-500 h-full transition-all duration-500"
                style={{ width: `${currentAnalysis.physicalPct}%` }}
                title={`กายภาพ: ${currentAnalysis.physicalPct}%`}
              />
              <div
                className="bg-purple-500 h-full transition-all duration-500"
                style={{ width: `${currentAnalysis.magicPct}%` }}
                title={`เวท: ${currentAnalysis.magicPct}%`}
              />
              <div
                className="bg-sky-400 h-full transition-all duration-500"
                style={{ width: `${currentAnalysis.truePct}%` }}
                title={`True Damage: ${currentAnalysis.truePct}%`}
              />
            </div>
          </div>

          {/* Stat Gauges */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
              <div className="flex justify-between text-slate-300 mb-1">
                <span>สตั๊น & CC ควบคุม</span>
                <span className="font-bold font-heading text-indigo-400">
                  {currentAnalysis.avgCc} / 10
                </span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all"
                  style={{ width: `${currentAnalysis.avgCc * 10}%` }}
                />
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
              <div className="flex justify-between text-slate-300 mb-1">
                <span>ความอึด / แนวหน้า</span>
                <span className="font-bold font-heading text-emerald-400">
                  {currentAnalysis.avgSurvivability} / 10
                </span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${currentAnalysis.avgSurvivability * 10}%` }}
                />
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
              <div className="flex justify-between text-slate-300 mb-1">
                <span>ความคล่องตัว / เดินเกม</span>
                <span className="font-bold font-heading text-sky-400">
                  {currentAnalysis.avgMobility} / 10
                </span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full transition-all"
                  style={{ width: `${currentAnalysis.avgMobility * 10}%` }}
                />
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
              <div className="flex justify-between text-slate-300 mb-1">
                <span>พลังช่วงเลทเกม</span>
                <span className="font-bold font-heading text-purple-400">
                  {currentAnalysis.avgLateGame} / 10
                </span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all"
                  style={{ width: `${currentAnalysis.avgLateGame * 10}%` }}
                />
              </div>
            </div>
          </div>

          {/* Tactical Warnings & Advice List */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              ข้อเสนอแนะเชิงกลยุทธ์ (Tactical Warnings)
            </div>

            {currentAnalysis.warnings.length === 0 ? (
              <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-xs text-slate-400 text-center">
                เลือกฮีโร่อย่างน้อย 2-3 ตัวเพื่อรับคำแนะนำกลยุทธ์
              </div>
            ) : (
              currentAnalysis.warnings.map((w, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border text-xs ${
                    w.level === 'danger'
                      ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                      : w.level === 'warning'
                      ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                      : w.level === 'success'
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                      : 'bg-blue-950/40 border-blue-800/60 text-blue-200'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5 mb-0.5">
                    {w.level === 'danger' && <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />}
                    {w.level === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                    {w.level === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    {w.level === 'info' && <Lightbulb className="w-3.5 h-3.5 text-blue-400" />}
                    <span>{w.title}</span>
                  </div>
                  <p className="text-[11px] opacity-90 leading-relaxed font-sans">
                    {w.description}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Lane Matchup Direct Duel */}
      {activeTab === 'matchups' && (
        <div className="flex-1 p-3 overflow-y-auto space-y-4">
          {/* Lane Selector Buttons */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            {lanes.map((lane) => {
              const cfg = LANE_CONFIG[lane];
              return (
                <button
                  key={lane}
                  onClick={() => setSelectedMatchupLane(lane)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    selectedMatchupLane === lane
                      ? 'bg-slate-800 text-amber-400 shadow border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{cfg.icon}</span>
                  <span className="hidden sm:inline">{cfg.short}</span>
                </button>
              );
            })}
          </div>

          {/* Duel Comparison Arena */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-center text-xs font-bold text-slate-400 mb-3">
              ดวลเลน: {LANE_CONFIG[selectedMatchupLane].labelTh}
            </div>

            <div className="flex items-center justify-between gap-4">
              {/* Blue Pick */}
              <div className="flex flex-col items-center flex-1">
                <span className="text-[10px] text-blue-400 font-bold mb-1">ทีมสีฟ้า</span>
                {bluePicks[selectedMatchupLane] ? (
                  <div
                    onClick={() => onInspectHero(bluePicks[selectedMatchupLane]!)}
                    className="cursor-pointer"
                  >
                    <HeroAvatar hero={bluePicks[selectedMatchupLane]!} size="md" />
                    <div className="text-xs font-bold mt-1.5 text-center text-slate-200">
                      {bluePicks[selectedMatchupLane]!.nameTh}
                    </div>
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-xs text-slate-500">
                    ยังไม่เลือก
                  </div>
                )}
              </div>

              {/* VS & Score Indicator */}
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-heading font-extrabold text-amber-400 text-xs shadow-inner">
                  VS
                </div>
                <div className="mt-1 text-[11px] font-bold">
                  {matchupData.winner === 'blue' && (
                    <span className="text-blue-400">ฟ้าได้เปรียบ</span>
                  )}
                  {matchupData.winner === 'red' && (
                    <span className="text-red-400">แดงได้เปรียบ</span>
                  )}
                  {matchupData.winner === 'even' && (
                    <span className="text-slate-400">สูสี</span>
                  )}
                </div>
              </div>

              {/* Red Pick */}
              <div className="flex flex-col items-center flex-1">
                <span className="text-[10px] text-red-400 font-bold mb-1">ทีมสีแดง</span>
                {redPicks[selectedMatchupLane] ? (
                  <div
                    onClick={() => onInspectHero(redPicks[selectedMatchupLane]!)}
                    className="cursor-pointer"
                  >
                    <HeroAvatar hero={redPicks[selectedMatchupLane]!} size="md" />
                    <div className="text-xs font-bold mt-1.5 text-center text-slate-200">
                      {redPicks[selectedMatchupLane]!.nameTh}
                    </div>
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-xs text-slate-500">
                    ยังไม่เลือก
                  </div>
                )}
              </div>
            </div>

            {/* Advantage Slider Indicator */}
            <div className="mt-4">
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  className="bg-blue-500 h-full transition-all duration-300"
                  style={{ width: `${50 + matchupData.advantageScore / 2}%` }}
                />
                <div
                  className="bg-red-500 h-full transition-all duration-300"
                  style={{ width: `${50 - matchupData.advantageScore / 2}%` }}
                />
              </div>
            </div>

            {/* Tactical Notes */}
            <div className="mt-3 p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans">
              <strong className="text-amber-400">วิเคราะห์รูปเกม: </strong>
              {matchupData.notesTh}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
