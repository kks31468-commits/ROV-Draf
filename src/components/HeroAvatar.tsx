import React, { useState } from 'react';
import { Hero } from '../types/rov';

interface HeroAvatarProps {
  hero: Hero;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTier?: boolean;
  className?: string;
  isBanned?: boolean;
}

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'S+': { bg: 'bg-amber-500', text: 'text-amber-950', border: 'border-amber-400' },
  S: { bg: 'bg-purple-500', text: 'text-purple-950', border: 'border-purple-400' },
  'A+': { bg: 'bg-blue-500', text: 'text-blue-950', border: 'border-blue-400' },
  A: { bg: 'bg-emerald-500', text: 'text-emerald-950', border: 'border-emerald-400' },
  B: { bg: 'bg-slate-500', text: 'text-slate-950', border: 'border-slate-400' },
};

const ROLE_GRADIENTS: Record<string, string> = {
  Warrior: 'from-amber-700 via-orange-800 to-amber-950',
  Assassin: 'from-rose-700 via-red-900 to-neutral-950',
  Mage: 'from-purple-700 via-indigo-900 to-slate-950',
  Marksman: 'from-sky-700 via-blue-900 to-slate-950',
  Tank: 'from-emerald-700 via-teal-900 to-slate-950',
  Support: 'from-pink-700 via-rose-900 to-slate-950',
};

export const HeroAvatar: React.FC<HeroAvatarProps> = ({
  hero,
  size = 'md',
  showTier = true,
  className = '',
  isBanned = false,
}) => {
  const baseUrl = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;

  const heroId = hero.id.toLowerCase();
  const primaryUrl = hero.avatarUrl || `${baseUrl}heroes/${heroId}.jpg`;

  const [currentSrc, setCurrentSrc] = useState(primaryUrl);
  const [triedSvg, setTriedSvg] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Sync state if hero changes
  React.useEffect(() => {
    setCurrentSrc(hero.avatarUrl || `${baseUrl}heroes/${hero.id.toLowerCase()}.jpg`);
    setTriedSvg(false);
    setImgError(false);
  }, [hero.id, hero.avatarUrl, baseUrl]);

  const handleError = () => {
    if (!triedSvg) {
      setTriedSvg(true);
      setCurrentSrc(`${baseUrl}heroes/${heroId}.svg`);
    } else {
      setImgError(true);
    }
  };

  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-14 h-14 text-sm',
    lg: 'w-20 h-20 text-base',
    xl: 'w-24 h-24 text-lg',
  }[size];

  const tierInfo = TIER_COLORS[hero.tier] || TIER_COLORS['A'];
  const gradient = ROLE_GRADIENTS[hero.role] || 'from-slate-700 to-slate-900';

  return (
    <div
      className={`relative rounded-xl overflow-hidden shadow-lg select-none flex-shrink-0 border ${
        hero.tier === 'S+'
          ? 'border-amber-400/80 shadow-amber-500/20'
          : hero.tier === 'S'
          ? 'border-purple-400/70 shadow-purple-500/20'
          : 'border-slate-700/80'
      } ${sizeClasses} ${className}`}
    >
      {!imgError ? (
        <img
          src={currentSrc}
          alt={hero.name}
          className={`w-full h-full object-cover transition-transform duration-300 ${
            isBanned ? 'grayscale filter brightness-75 contrast-125' : ''
          }`}
          onError={handleError}
          loading="lazy"
        />
      ) : (
        <div
          className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center p-1 font-bold text-slate-100 ${
            isBanned ? 'grayscale' : ''
          }`}
        >
          <span className="text-center font-heading tracking-tight leading-tight line-clamp-1 text-[11px]">
            {hero.name.slice(0, 3).toUpperCase()}
          </span>
          <span className="text-[9px] opacity-75 font-normal -mt-0.5">
            {hero.role.slice(0, 3)}
          </span>
        </div>
      )}

      {/* Tier Tag */}
      {showTier && (
        <div
          className={`absolute top-0.5 right-0.5 px-1 py-0.2 rounded font-heading font-extrabold text-[9px] leading-tight border ${tierInfo.bg} ${tierInfo.text} ${tierInfo.border} shadow-sm z-10`}
          title={`Tier ${hero.tier}`}
        >
          {hero.tier}
        </div>
      )}

      {/* Banned stamp overlay */}
      {isBanned && (
        <div className="absolute inset-0 bg-red-950/70 backdrop-blur-[1px] flex items-center justify-center z-20">
          <div className="w-full h-0.5 bg-red-500 transform rotate-45 scale-125 shadow-md shadow-red-500/50" />
          <div className="w-full h-0.5 bg-red-500 transform -rotate-45 scale-125 shadow-md shadow-red-500/50 absolute" />
        </div>
      )}
    </div>
  );
};
