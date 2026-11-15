import React, { useEffect, useRef, useState } from 'react';
import {
  SPEXMood,
  SPEX_ASSETS,
  SPEX_HERO_IMAGE,
  SPEX_WAVING_HERO,
  SPEX_AVATAR_GREETING,
  SPEX_AVATAR_INVESTIGATOR,
} from './spexAssets';
import { SpherexLogo } from '../components/SpherexLogo';

export type SpexExpression =
  | 'normal'
  | 'happy'
  | 'curious'
  | 'serious'
  | 'surprised'
  | 'sarcastic'
  | 'thinking'
  | 'explaining'
  | 'joking'
  | 'greeting'
  | 'laughter'
  | 'sassy'
  | 'eureka'
  | 'investigator'
  | 'success'
  | 'facepalm'
  | 'proud'
  | string;

export interface SpexPortraitProps {
  mood?: SPEXMood | string;
  expression?: SpexExpression;
  size?: number | string;
  className?: string;
  showFullBody?: boolean;
  alt?: string;
  interactive?: boolean;
  onClick?: () => void;
}

/**
 * Authentic SPEX Egyptian Mechanical Cat Guardian
 * Uses the genuine 16 SVG character artwork poses with idle breathe/blink motion.
 */
export const SpexPortrait: React.FC<SpexPortraitProps> = ({
  mood,
  expression,
  size = 120,
  className = '',
  showFullBody = false,
  alt = 'SPEX Mechanical Cat Guardian',
  interactive = false,
  onClick,
}) => {
  const [hasError, setHasError] = useState(false);
  const [clickBurst, setClickBurst] = useState(false);
  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const m = (expression || mood || 'greeting').toLowerCase();

  useEffect(() => {
    return () => {
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    };
  }, []);

  const effectiveMood = clickBurst ? 'curious' : m;

  let assetPath: string;
  if (showFullBody) {
    if (effectiveMood === 'greeting' || effectiveMood === 'happy' || effectiveMood === 'joking' || effectiveMood === 'laughter') {
      assetPath = SPEX_WAVING_HERO;
    } else {
      assetPath = SPEX_HERO_IMAGE;
    }
  } else {
    const asset = SPEX_ASSETS[effectiveMood as SPEXMood];
    if (asset) {
      assetPath = asset.imagePath;
    } else if (effectiveMood === 'happy' || effectiveMood === 'greeting' || effectiveMood === 'proud' || effectiveMood === 'success') {
      assetPath = SPEX_AVATAR_GREETING;
    } else {
      assetPath = SPEX_AVATAR_INVESTIGATOR;
    }
  }

  const dimensionStyle =
    typeof size === 'number'
      ? { width: `${size}px`, height: showFullBody ? 'auto' : `${size}px`, maxHeight: showFullBody ? `${size * 1.5}px` : undefined }
      : { width: size, height: showFullBody ? 'auto' : size };

  const handleTap = () => {
    if (interactive) {
      setClickBurst(true);
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
      burstTimerRef.current = setTimeout(() => setClickBurst(false), 900);
    }
    onClick?.();
  };

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl bg-gradient-to-b from-slate-900 to-[#070b16] border border-amber-500/30 p-2 shadow-inner ${className}`}
        style={dimensionStyle}
      >
        <SpherexLogo size={typeof size === 'number' ? Math.round(size * 0.7) : 48} />
      </div>
    );
  }

  const Wrapper = interactive || onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={interactive || onClick ? 'button' : undefined}
      onClick={interactive || onClick ? handleTap : undefined}
      aria-label={interactive || onClick ? alt : undefined}
      className={`relative inline-flex items-center justify-center overflow-hidden transition-transform duration-200 select-none spex-mascot-idle ${
        interactive || onClick ? 'cursor-pointer hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-sky-400 rounded-2xl' : ''
      } ${m === 'eureka' || m === 'happy' || m === 'success' ? 'drop-shadow-[0_0_16px_rgba(245,158,11,0.35)]' : ''} ${className}`}
      style={dimensionStyle}
    >
      <img
        src={assetPath}
        alt={alt}
        className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] pointer-events-none"
        onError={() => setHasError(true)}
        loading="eager"
      />
      {/* Subtle periodic eye-blink glint overlay */}
      <span
        aria-hidden="true"
        className="spex-mascot-eyelid pointer-events-none absolute top-[34%] left-[26%] right-[26%] h-[8%] rounded-full bg-amber-300/20 blur-[1px]"
      />
    </Wrapper>
  );
};
