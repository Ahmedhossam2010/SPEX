import React, { useState } from 'react';
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
}

/**
 * Authentic SPEX Egyptian Mechanical Cat Guardian
 * Uses the genuine original character artwork across all states:
 * - Full body hero poses (standing / waving)
 * - Focused investigator and warm greeting expression portraits
 * - Natural image proportions, crisp transparency, and graceful fallback
 */
export const SpexPortrait: React.FC<SpexPortraitProps> = ({
  mood,
  expression,
  size = 120,
  className = '',
  showFullBody = false,
  alt = 'SPEX Mechanical Cat Guardian',
}) => {
  const [hasError, setHasError] = useState(false);
  const m = (expression || mood || 'greeting').toLowerCase();

  // Pick authentic asset path based on full body vs avatar portrait & mood
  let assetPath: string;
  if (showFullBody) {
    if (m === 'greeting' || m === 'happy' || m === 'joking' || m === 'laughter') {
      assetPath = SPEX_WAVING_HERO;
    } else {
      assetPath = SPEX_HERO_IMAGE;
    }
  } else {
    const asset = SPEX_ASSETS[m as SPEXMood];
    if (asset) {
      assetPath = asset.imagePath;
    } else if (m === 'happy' || m === 'greeting' || m === 'proud' || m === 'success') {
      assetPath = SPEX_AVATAR_GREETING;
    } else {
      assetPath = SPEX_AVATAR_INVESTIGATOR;
    }
  }

  const dimensionStyle =
    typeof size === 'number'
      ? { width: `${size}px`, height: showFullBody ? 'auto' : `${size}px`, maxHeight: showFullBody ? `${size * 1.5}px` : undefined }
      : { width: size, height: showFullBody ? 'auto' : size };

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

  return (
    <div
      className={`inline-flex items-center justify-center overflow-hidden transition-transform duration-200 select-none ${className}`}
      style={dimensionStyle}
    >
      <img
        src={assetPath}
        alt={alt}
        className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] pointer-events-none"
        onError={() => setHasError(true)}
        loading="eager"
      />
    </div>
  );
};
