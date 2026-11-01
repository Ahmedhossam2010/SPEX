import React from 'react';

interface SpherexLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
}

/**
 * Official SPHEREx "The Changing Sky" Celestial Eye of Horus Logo
 * Matches the official project logo:
 * - Celestial compass crosshairs (vertical arrow needle + bottom anchor dot)
 * - Concentric orbital arc segments
 * - Upper eyelid in cosmic cyan-to-magenta gradient (#00C0FF -> #5E60FF -> #FF2A8D)
 * - Lower eyelid in golden-amber-to-pink gradient (#FFA000 -> #FF4565)
 * - Central iris ring enclosing the radiant 5-pointed star (#FFC700)
 */
export const SpherexLogo: React.FC<SpherexLogoProps> = ({
  className = '',
  size = 40,
  showText = false,
  textClassName = '',
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0 transition-transform duration-300 hover:scale-105"
        aria-label="SPHEREx The Changing Sky Emblem"
      >
        <defs>
          {/* Upper eyelid gradient: Cyan -> Purple -> Magenta */}
          <linearGradient id="spexUpperEyeGrad" x1="20" y1="90" x2="180" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00C0FF" />
            <stop offset="35%" stopColor="#4A75FF" />
            <stop offset="70%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>

          {/* Lower eyelid gradient: Golden Amber -> Coral -> Pink */}
          <linearGradient id="spexLowerEyeGrad" x1="30" y1="120" x2="170" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="50%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>

          {/* Iris Ring & Arc Gradient */}
          <linearGradient id="spexRingGrad" x1="60" y1="60" x2="140" y2="140" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#F472B6" />
          </linearGradient>

          {/* Star Gradient: Radiant Yellow-Gold */}
          <linearGradient id="spexStarGrad" x1="100" y1="82" x2="100" y2="118" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="45%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          {/* Needle Gradient */}
          <linearGradient id="spexNeedleGrad" x1="100" y1="20" x2="100" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#818CF8" />
            <stop offset="85%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>

        {/* Outer Circular Astrolabe Arcs */}
        {/* Top-Right Arc */}
        <path
          d="M 112 36 A 68 68 0 0 1 168 92"
          stroke="url(#spexRingGrad)"
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* Bottom-Right Arc */}
        <path
          d="M 168 108 A 68 68 0 0 1 112 164"
          stroke="url(#spexLowerEyeGrad)"
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* Bottom-Left Arc */}
        <path
          d="M 88 164 A 68 68 0 0 1 32 108"
          stroke="url(#spexLowerEyeGrad)"
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* Top-Left Arc */}
        <path
          d="M 32 92 A 68 68 0 0 1 88 36"
          stroke="url(#spexUpperEyeGrad)"
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Vertical Compass Crosshair Needle */}
        {/* Upper Needle Tip */}
        <path
          d="M 100 24 L 102.5 54 L 97.5 54 Z"
          fill="url(#spexNeedleGrad)"
        />
        <line
          x1="100"
          y1="54"
          x2="100"
          y2="76"
          stroke="url(#spexNeedleGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Lower Needle Stem & Anchor Dot */}
        <line
          x1="100"
          y1="124"
          x2="100"
          y2="162"
          stroke="url(#spexNeedleGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle
          cx="100"
          cy="172"
          r="3.5"
          fill="#EC4899"
        />

        {/* Central Iris Circle (Eye of Horus) */}
        <circle
          cx="100"
          cy="100"
          r="24"
          stroke="url(#spexRingGrad)"
          strokeWidth="3.5"
          fill="none"
        />

        {/* Central 5-Pointed Star */}
        {/* Scaled and centered at (100, 100) with radius 16 */}
        <polygon
          points="
            100,84
            104.9,94.0
            115.9,95.5
            107.9,103.3
            109.8,114.2
            100,109.0
            90.2,114.2
            92.1,103.3
            84.1,95.5
            95.1,94.0
          "
          fill="url(#spexStarGrad)"
          stroke="#F59E0B"
          strokeWidth="0.8"
        />

        {/* Upper Sweeping Eyelid Arc (Thick tapered crescent) */}
        <path
          d="M 18 99 C 48 83, 76 74, 100 74 C 124 74, 152 83, 182 99 C 158 87, 126 79, 100 79 C 74 79, 42 87, 18 99 Z"
          fill="url(#spexUpperEyeGrad)"
        />
        <path
          d="M 18 99 C 48 83, 76 74, 100 74 C 124 74, 152 83, 182 99"
          stroke="url(#spexUpperEyeGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Lower Sweeping Eyelid Arc */}
        <path
          d="M 32 103 C 54 116, 76 123, 100 123 C 124 123, 146 116, 168 103 C 146 113, 124 118, 100 118 C 76 118, 54 113, 32 103 Z"
          fill="url(#spexLowerEyeGrad)"
        />
        <path
          d="M 32 103 C 54 116, 76 123, 100 123 C 124 123, 146 116, 168 103"
          stroke="url(#spexLowerEyeGrad)"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {showText && (
        <div className={`flex flex-col ${textClassName}`}>
          <div className="flex items-center gap-1.5">
            <span className="font-['Outfit'] font-black tracking-wider text-slate-100 uppercase text-sm sm:text-base leading-none">
              SPHEREx
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-semibold border border-amber-400/30 leading-none">
              QR2
            </span>
          </div>
          <span className="text-[10px] sm:text-xs font-mono text-slate-400 tracking-tight leading-tight mt-0.5">
            The Changing Sky
          </span>
        </div>
      )}
    </div>
  );
};
