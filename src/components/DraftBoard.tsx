import React from 'react';
import { Hero, Lane, DraftState } from '../types/rov';
import { LANE_CONFIG } from '../data/allHeroes';
import { HeroAvatar } from './HeroAvatar';
import { Shield, Swords, RotateCcw, ArrowLeftRight, Trash2, Trophy, Sparkles } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface DraftBoardProps {
  draftState: DraftState;
  onSlotClick: (team: 'blue' | 'red', lane: Lane) => void;
  onBanSlotClick?: (team: 'blue' | 'red', index: number) => void;
  onRemoveBan?: (team: 'blue' | 'red', index: number) => void;
  onRemovePick: (team: 'blue' | 'red', lane: Lane) => void;
  onInspectHero: (hero: Hero) => void;
  targetSlot: { team: 'blue' | 'red'; lane: Lane } | null;
  targetBanIndex?: { team: 'blue' | 'red'; index: number } | null;
}

export const DraftBoard: React.FC<DraftBoardProps> = ({
  draftState,
  onSlotClick,
  onBanSlotClick,
  onRemoveBan,
  onRemovePick,
  onInspectHero,
  targetSlot,
  targetBanIndex,
}) => {
  const lanes: Lane[] = ['adl', 'mid', 'dsl', 'jg', 'sp'];

  const renderSlot = (team: 'blue' | 'red', lane: Lane) => {
    const picks = team === 'blue' ? draftState.bluePicks : draftState.redPicks;
    const hero = picks[lane];
    const laneCfg = LANE_CONFIG[lane];
    const isTarget =
      targetSlot?.team === team && targetSlot?.lane === lane;
    const isActiveTeam = draftState.activeTeam === team;

    return (
      <div
        key={`${team}-${lane}`}
        onClick={() => onSlotClick(team, lane)}
        className={`relative flex items-center p-1.5 rounded-xl border transition-all duration-200 cursor-pointer select-none group ${
          isTarget
            ? team === 'blue'
              ? 'border-blue-400 bg-blue-950/70 shadow-md shadow-blue-500/30 ring-2 ring-blue-400/50'
              : 'border-red-400 bg-red-950/70 shadow-md shadow-red-500/30 ring-2 ring-red-400/50'
            : hero
            ? 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
            : 'border-dashed border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/40'
        }`}
      >
        {/* Lane Icon & Label Tag */}
        <div
          className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border ${
            team === 'blue'
              ? 'bg-blue-950/60 border-blue-800/60 text-blue-300'
              : 'bg-red-950/60 border-red-800/60 text-red-300'
          }`}
          title={laneCfg.labelTh}
        >
          {laneCfg.icon}
        </div>

        {/* Hero Avatar or Placeholder */}
        <div className="ml-2.5 mr-2">
          {hero ? (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onInspectHero(hero);
              }}
              title="คลิกเพื่อดูข้อมูลฮีโร่"
            >
              <HeroAvatar hero={hero} size="sm" className="rounded-lg shadow" />
            </div>
          ) : (
            <div
              className={`w-10 h-10 rounded-lg border border-dashed flex items-center justify-center text-xs font-semibold ${
                isTarget
                  ? team === 'blue'
                    ? 'border-blue-400 text-blue-400 animate-pulse'
                    : 'border-red-400 text-red-400 animate-pulse'
                  : 'border-slate-700 text-slate-500'
              }`}
            >
              +
            </div>
          )}
        </div>

        {/* Hero Info or Lane Name */}
        <div className="flex-1 min-w-0 pr-1">
          {hero ? (
            <div>
              <div className="font-heading font-bold text-sm text-slate-100 truncate flex items-center gap-1.5">
                <span>{hero.name}</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-normal">
                  {hero.tier}
                </span>
              </div>
              <div className="text-xs text-slate-400 truncate flex items-center gap-1">
                <span>{laneCfg.short}</span>
                <span>•</span>
                <span className="capitalize">{hero.damageType}</span>
                <span>•</span>
                <span className="text-amber-400/90">{hero.winRate}%</span>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-xs font-semibold text-slate-300">
                {laneCfg.labelTh}
              </div>
              <div className="text-[11px] text-slate-500">
                {isTarget ? 'กำลังรอเลือกฮีโร่...' : 'คลิกเพื่อเลือก'}
              </div>
            </div>
          )}
        </div>

        {/* Remove Button on hover */}
        {hero && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              soundManager.playClick();
              onRemovePick(team, lane);
            }}
            className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-opacity opacity-0 group-hover:opacity-100"
            title="ลบฮีโร่"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl p-3.5 text-slate-100">
      {/* Top Header: Team Blue vs Team Red & Bans Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3 border-b border-slate-800">
        {/* Blue Team Header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 shadow-md shadow-blue-500/50 animate-pulse" />
              <span className="font-heading font-bold text-base text-blue-400 tracking-wider">
                BLUE TEAM (ฝั่งฟ้า)
              </span>
            </div>
            {draftState.activeTeam === 'blue' && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold animate-pulse">
                {draftState.activeAction === 'ban' ? '🛡️ กำลังแบนฮีโร่' : '⚔️ กำลังเลือกฮีโร่'}
              </span>
            )}
          </div>

          {/* Blue Bans Slots (5 Bans) */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
              <span>แบน ({draftState.blueBans.length} ตัว):</span>
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {draftState.blueBans.map((banned, idx) => {
                const isTargetBan =
                  draftState.activeAction === 'ban' &&
                  draftState.activeTeam === 'blue' &&
                  (targetBanIndex ? targetBanIndex.team === 'blue' && targetBanIndex.index === idx : !banned);

                return (
                  <div
                    key={`blue-ban-${idx}`}
                    onClick={() => onBanSlotClick && onBanSlotClick('blue', idx)}
                    className={`relative w-8 h-8 rounded-lg border flex items-center justify-center overflow-hidden cursor-pointer group transition-all ${
                      isTargetBan
                        ? 'border-red-400 bg-red-950/60 ring-2 ring-red-400/50 animate-pulse'
                        : banned
                        ? 'border-slate-700 bg-slate-950'
                        : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                    }`}
                    title={banned ? `แบน: ${banned.name} (คลิกเพื่อดูหรือลบ)` : `ช่องแบนที่ ${idx + 1}`}
                  >
                    {banned ? (
                      <>
                        <HeroAvatar
                          hero={banned}
                          size="sm"
                          isBanned={true}
                          showTier={false}
                          className="w-full h-full rounded-none"
                        />
                        {onRemoveBan && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              soundManager.playClick();
                              onRemoveBan('blue', idx);
                            }}
                            className="absolute inset-0 bg-red-950/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-200 transition-opacity"
                            title="ปลดแบน"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-600 font-bold group-hover:text-red-400">
                        {idx + 1}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Red Team Header */}
        <div className="text-left md:text-right">
          <div className="flex items-center justify-between md:flex-row-reverse mb-2">
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-base text-red-400 tracking-wider">
                RED TEAM (ฝั่งแดง)
              </span>
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-md shadow-red-500/50 animate-pulse" />
            </div>
            {draftState.activeTeam === 'red' && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-semibold animate-pulse">
                {draftState.activeAction === 'ban' ? '🛡️ กำลังแบนฮีโร่' : '⚔️ กำลังเลือกฮีโร่'}
              </span>
            )}
          </div>

          {/* Red Bans Slots (5 Bans) */}
          <div className="flex items-center md:justify-end gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {draftState.redBans.map((banned, idx) => {
                const isTargetBan =
                  draftState.activeAction === 'ban' &&
                  draftState.activeTeam === 'red' &&
                  (targetBanIndex ? targetBanIndex.team === 'red' && targetBanIndex.index === idx : !banned);

                return (
                  <div
                    key={`red-ban-${idx}`}
                    onClick={() => onBanSlotClick && onBanSlotClick('red', idx)}
                    className={`relative w-8 h-8 rounded-lg border flex items-center justify-center overflow-hidden cursor-pointer group transition-all ${
                      isTargetBan
                        ? 'border-red-400 bg-red-950/60 ring-2 ring-red-400/50 animate-pulse'
                        : banned
                        ? 'border-slate-700 bg-slate-950'
                        : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                    }`}
                    title={banned ? `แบน: ${banned.name} (คลิกเพื่อดูหรือลบ)` : `ช่องแบนที่ ${idx + 1}`}
                  >
                    {banned ? (
                      <>
                        <HeroAvatar
                          hero={banned}
                          size="sm"
                          isBanned={true}
                          showTier={false}
                          className="w-full h-full rounded-none"
                        />
                        {onRemoveBan && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              soundManager.playClick();
                              onRemoveBan('red', idx);
                            }}
                            className="absolute inset-0 bg-red-950/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-200 transition-opacity"
                            title="ปลดแบน"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-600 font-bold group-hover:text-red-400">
                        {idx + 1}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
              <span>:แบน ({draftState.redBans.length} ตัว)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Lanes Pick Grid: Blue Slots (Left) vs Red Slots (Right) */}
      <div className="grid grid-cols-2 gap-4 mt-3">
        {/* Blue Team 5 Lanes */}
        <div className="space-y-2">
          {lanes.map((lane) => renderSlot('blue', lane))}
        </div>

        {/* Red Team 5 Lanes */}
        <div className="space-y-2">
          {lanes.map((lane) => renderSlot('red', lane))}
        </div>
      </div>
    </div>
  );
};
