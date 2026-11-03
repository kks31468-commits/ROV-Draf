import React, { useState } from 'react';
import { DraftState, Lane } from '../types/rov';
import { LANE_CONFIG } from '../data/allHeroes';
import { HeroAvatar } from './HeroAvatar';
import { analyzeTeamComp } from '../utils/draftEngine';
import { X, Copy, Check, Share2, Trophy } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface DraftSummaryModalProps {
  draftState: DraftState;
  onClose: () => void;
}

export const DraftSummaryModal: React.FC<DraftSummaryModalProps> = ({
  draftState,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const blueAnalysis = analyzeTeamComp(Object.values(draftState.bluePicks));
  const redAnalysis = analyzeTeamComp(Object.values(draftState.redPicks));

  const lanes: Lane[] = ['dsl', 'jg', 'mid', 'adl', 'sp'];

  const generateShareText = () => {
    let text = `🎮 ผลการดราฟท์ฮีโร่ RoV (RoV Meta Drafter)\n\n`;

    text += `🔵 ทีมสีฟ้า (Blue Team) [คะแนนความพร้อม: ${blueAnalysis.overallScore}/100]\n`;
    lanes.forEach((l) => {
      const h = draftState.bluePicks[l];
      text += `  • ${LANE_CONFIG[l].short}: ${h ? `${h.nameTh} (${h.name}) [Tier ${h.tier}]` : '-'}\n`;
    });
    if (draftState.blueBans.some(Boolean)) {
      text += `  🚫 แบน: ${draftState.blueBans.filter(Boolean).map((b) => b!.nameTh).join(', ')}\n`;
    }

    text += `\n🔴 ทีมสีแดง (Red Team) [คะแนนความพร้อม: ${redAnalysis.overallScore}/100]\n`;
    lanes.forEach((l) => {
      const h = draftState.redPicks[l];
      text += `  • ${LANE_CONFIG[l].short}: ${h ? `${h.nameTh} (${h.name}) [Tier ${h.tier}]` : '-'}\n`;
    });
    if (draftState.redBans.some(Boolean)) {
      text += `  🚫 แบน: ${draftState.redBans.filter(Boolean).map((b) => b!.nameTh).join(', ')}\n`;
    }

    text += `\n📊 รูปแบบทีม:\n`;
    text += `• ฝั่งฟ้า: ${blueAnalysis.compArchetype}\n`;
    text += `• ฝั่งแดง: ${redAnalysis.compArchetype}\n`;
    text += `\n🔗 ดราฟท์ด้วย RoV Meta Drafter (อ้างอิงข้อมูล rovmeta.com)`;

    return text;
  };

  const handleCopy = () => {
    soundManager.playClick();
    navigator.clipboard.writeText(generateShareText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-amber-400" />
            <h3 className="font-heading font-bold text-lg text-white">
              สรุปผลการดราฟท์ฮีโร่ (Draft Summary & Export)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Side by side comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* Blue Side */}
            <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-900/50 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-blue-900/40">
                <span className="font-heading font-bold text-sm text-blue-400">
                  ทีมสีฟ้า (Blue Team)
                </span>
                <span className="text-xs font-bold text-emerald-400">
                  {blueAnalysis.overallScore}%
                </span>
              </div>

              {lanes.map((l) => {
                const h = draftState.bluePicks[l];
                return (
                  <div key={l} className="flex items-center gap-2 text-xs">
                    <span className="text-[11px] font-bold text-slate-400 w-8">
                      {LANE_CONFIG[l].short}
                    </span>
                    {h ? (
                      <div className="flex items-center gap-1.5 truncate">
                        <HeroAvatar hero={h} size="sm" showTier={false} className="w-6 h-6 rounded" />
                        <span className="font-medium text-slate-200 truncate">{h.nameTh}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </div>
                );
              })}

              {/* Blue Bans (5 heroes) */}
              <div className="pt-2 border-t border-blue-900/30">
                <span className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">
                  แบน ({draftState.blueBans.filter(Boolean).length}/5):
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  {draftState.blueBans.map((b, idx) => (
                    <div
                      key={idx}
                      className="w-6 h-6 rounded bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center text-[9px] text-slate-500"
                      title={b ? b.nameTh : 'ว่าง'}
                    >
                      {b ? (
                        <HeroAvatar hero={b} size="sm" isBanned={true} showTier={false} className="w-full h-full rounded-none" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-1 text-[11px] text-slate-400">
                <span className="text-blue-300 font-semibold">{blueAnalysis.compArchetype}</span>
              </div>
            </div>

            {/* Red Side */}
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/50 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-red-900/40">
                <span className="font-heading font-bold text-sm text-red-400">
                  ทีมสีแดง (Red Team)
                </span>
                <span className="text-xs font-bold text-emerald-400">
                  {redAnalysis.overallScore}%
                </span>
              </div>

              {lanes.map((l) => {
                const h = draftState.redPicks[l];
                return (
                  <div key={l} className="flex items-center gap-2 text-xs">
                    <span className="text-[11px] font-bold text-slate-400 w-8">
                      {LANE_CONFIG[l].short}
                    </span>
                    {h ? (
                      <div className="flex items-center gap-1.5 truncate">
                        <HeroAvatar hero={h} size="sm" showTier={false} className="w-6 h-6 rounded" />
                        <span className="font-medium text-slate-200 truncate">{h.nameTh}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </div>
                );
              })}

              {/* Red Bans (5 heroes) */}
              <div className="pt-2 border-t border-red-900/30">
                <span className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">
                  แบน ({draftState.redBans.filter(Boolean).length}/5):
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  {draftState.redBans.map((b, idx) => (
                    <div
                      key={idx}
                      className="w-6 h-6 rounded bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center text-[9px] text-slate-500"
                      title={b ? b.nameTh : 'ว่าง'}
                    >
                      {b ? (
                        <HeroAvatar hero={b} size="sm" isBanned={true} showTier={false} className="w-full h-full rounded-none" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-1 text-[11px] text-slate-400">
                <span className="text-red-300 font-semibold">{redAnalysis.compArchetype}</span>
              </div>
            </div>
          </div>

          {/* Copyable text container */}
          <div>
            <div className="flex justify-between items-center mb-1.5 text-xs text-slate-400">
              <span>ข้อความสำหรับคัดลอกลง LINE / Discord:</span>
            </div>
            <textarea
              readOnly
              rows={8}
              value={generateShareText()}
              className="w-full p-3 text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none select-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
          >
            ปิด
          </button>

          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอกข้อความสรุป'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
