import React, { useState } from 'react';

interface SpherexLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
  subtext?: string;
  usePng?: boolean;
}

/**
 * Authoritative SPEX "The Changing Sky" Celestial Eye Brand Logo
 * Displays the authentic original celestial Eye of Horus emblem
 * (/assets/aistudio/eye_logo_no_text_centered_e772aeab.png)
 * with sharp vector fallback for bulletproof rendering.
 */
export const SpherexLogo: React.FC<SpherexLogoProps> = ({
  className = '',
  size = 40,
  showText = false,
  textClassName = '',
  subtext,
  usePng = true,
}) => {
  const [pngFailed, setPngFailed] = useState(false);

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div
        className="relative flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-105"
        style={{ width: size, height: size }}
      >
        {usePng && !pngFailed ? (
          <img
            src="/assets/aistudio/eye_logo_no_text_centered_e772aeab.png"
            alt="SPEX Celestial Eye"
            width={size}
            height={size}
            className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(245,158,11,0.4)] pointer-events-none select-none"
            onError={() => setPngFailed(true)}
            loading="eager"
          />
        ) : (
          <svg
            viewBox="0 0 512 512"
            width={size}
            height={size}
            className="w-full h-full filter drop-shadow-[0_0_14px_rgba(34,211,238,0.35)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="spexEyeGradUpper" x1="100" y1="256" x2="412" y2="256" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="35%" stopColor="#6366f1" />
                <stop offset="70%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>

              <linearGradient id="spexEyeGradLower" x1="100" y1="256" x2="412" y2="256" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="45%" stopColor="#f97316" />
                <stop offset="85%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>

              <linearGradient id="spexStarGrad" x1="256" y1="210" x2="256" y2="300" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="40%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>

              <linearGradient id="spexApertureGrad" x1="210" y1="210" x2="302" y2="302" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
            </defs>

            <path
              d="M 162 216 C 185 168, 225 146, 256 146 C 287 146, 327 168, 350 216"
              stroke="url(#spexEyeGradUpper)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M 162 296 C 185 344, 225 366, 256 366 C 287 366, 327 344, 350 296"
              stroke="url(#spexEyeGradLower)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M 108 256 C 145 198, 210 178, 256 178 C 302 178, 367 198, 404 256 C 362 222, 305 204, 256 204 C 207 204, 150 222, 108 256 Z"
              fill="url(#spexEyeGradUpper)"
            />
            <path
              d="M 132 262 C 168 308, 215 320, 256 320 C 297 320, 344 308, 380 262 C 344 286, 302 296, 256 296 C 210 296, 168 286, 132 262 Z"
              fill="url(#spexEyeGradLower)"
            />
            <path d="M 256 122 L 253 154 L 259 154 Z" fill="#a855f7" />
            <line x1="256" y1="154" x2="256" y2="212" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" />
            <line x1="256" y1="300" x2="256" y2="368" stroke="#f97316" strokeWidth="4" strokeLinecap="round" />
            <circle cx="256" cy="384" r="5" fill="#f43f5e" />
            <circle cx="256" cy="256" r="44" stroke="url(#spexApertureGrad)" strokeWidth="6" fill="#090d1a" />
            <polygon
              points="256,224 266,248 292,250 272,267 278,292 256,278 234,292 240,267 220,250 246,248"
              fill="url(#spexStarGrad)"
            />
          </svg>
        )}
      </div>

      {showText && (
        <div className={`flex flex-col select-none ${textClassName}`}>
          <div className="flex items-center gap-2">
            <span className="font-['Outfit'] font-black tracking-widest text-slate-900 dark:text-slate-100 uppercase text-base sm:text-lg leading-none">
              SPEX
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-semibold border border-cyan-500/20 leading-none">
              SPHEREx
            </span>
          </div>
          <span className="text-[10px] sm:text-xs font-mono text-slate-500 dark:text-slate-400 tracking-tight leading-tight mt-0.5">
            {subtext || 'The Changing Sky'}
          </span>
        </div>
      )}
    </div>
  );
};
