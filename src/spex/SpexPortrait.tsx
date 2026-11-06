import React from 'react';
import { SPEXMood } from './spexAssets';

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
}

/**
 * Authentic Egyptian Mechanical Cat Guardian ("SPEX")
 * Faithfully reproduces the supplied character artwork across all 16 expressions and poses:
 * - Egyptian Bastet-inspired black mecha feline armor with gold trim & white plates
 * - Segmented ears with golden acoustic baffles & side audio sensor discs
 * - Egyptian Usekh collar with Eye of Horus crest
 * - Dynamic facial expressions: normal, happy, curious, serious, surprised, sarcastic,
 *   thinking, explaining, joking, greeting, laughter, sassy, eureka, investigator, success, facepalm.
 */
export const SpexPortrait: React.FC<SpexPortraitProps> = ({
  mood,
  expression,
  size = 120,
  className = '',
  showFullBody = false,
}) => {
  // Normalize mood / expression
  const m = (expression || mood || 'greeting').toLowerCase();

  // Eyebrow and eye configurations per expression
  const isHappy = m === 'happy' || m === 'laughter';
  const isSurprised = m === 'surprised';
  const isThinking = m === 'thinking';
  const isSarcastic = m === 'sarcastic' || m === 'sassy';
  const isSerious = m === 'serious';
  const isCurious = m === 'curious' || m === 'investigator';
  const isEureka = m === 'eureka';
  const isFacepalm = m === 'facepalm' || m === 'artifact';
  const isJoking = m === 'joking';
  const isGreeting = m === 'greeting';
  const isSuccess = m === 'success';

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? (showFullBody ? `${size * 1.8}px` : `${size}px`) : size,
      }}
    >
      <svg
        viewBox={showFullBody ? '0 0 320 580' : '0 0 320 320'}
        className="w-full h-full filter drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Armor Dark Navy Mecha Gradient */}
          <linearGradient id="spexArmorGrad" x1="100" y1="50" x2="220" y2="300" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e2746" />
            <stop offset="50%" stopColor="#151b32" />
            <stop offset="100%" stopColor="#0d1222" />
          </linearGradient>

          {/* Golden Egyptian Trim Gradient */}
          <linearGradient id="spexGoldGrad" x1="160" y1="40" x2="160" y2="280" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Feline Eye Radiant Amber Gradient */}
          <linearGradient id="spexEyeIrisGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="60%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Egyptian Collar Deep Blue Inset */}
          <linearGradient id="spexCollarBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>

        {/* -------------------- FULL BODY ELEMENTS (WHEN showFullBody is true) -------------------- */}
        {showFullBody && (
          <g id="spexBodyTorsoLegs">
            {/* Tail with Golden Stripes */}
            <path
              d="M 120 420 C 60 420, 20 460, 30 510 C 38 550, 85 530, 95 480 C 100 450, 130 440, 140 430"
              stroke="#151b32"
              strokeWidth="24"
              strokeLinecap="round"
              fill="none"
            />
            {/* Tail gold bands */}
            <circle cx="34" cy="510" r="14" fill="#f59e0b" />
            <circle cx="56" cy="470" r="13" fill="#f59e0b" />

            {/* Lower Body & Legs */}
            {/* Left Leg */}
            <path d="M 120 380 L 100 520 L 140 520 L 150 380 Z" fill="url(#spexArmorGrad)" stroke="#0d1222" strokeWidth="4" />
            <rect x="96" y="440" width="46" height="8" rx="4" fill="url(#spexGoldGrad)" />
            {/* Left Boot */}
            <path d="M 85 520 C 85 510, 150 510, 150 520 L 155 545 C 155 555, 75 555, 75 545 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="3" />

            {/* Right Leg */}
            <path d="M 170 380 L 180 520 L 220 520 L 200 380 Z" fill="url(#spexArmorGrad)" stroke="#0d1222" strokeWidth="4" />
            <rect x="178" y="440" width="46" height="8" rx="4" fill="url(#spexGoldGrad)" />
            {/* Right Boot */}
            <path d="M 170 520 C 170 510, 235 510, 235 520 L 245 545 C 245 555, 165 555, 165 545 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="3" />

            {/* Belt with Center Round Buckle */}
            <rect x="110" y="360" width="100" height="20" rx="4" fill="url(#spexGoldGrad)" stroke="#b45309" strokeWidth="2" />
            <circle cx="160" cy="370" r="14" fill="#fef08a" stroke="#d97706" strokeWidth="3" />
            <circle cx="160" cy="370" r="6" fill="#f59e0b" />

            {/* Abdominal mecha plates */}
            <path d="M 128 300 L 192 300 L 185 360 L 135 360 Z" fill="#334155" stroke="#1e293b" strokeWidth="2" />
            <line x1="160" y1="304" x2="160" y2="356" stroke="#0f172a" strokeWidth="3" />
            <line x1="140" y1="320" x2="180" y2="320" stroke="#0f172a" strokeWidth="2" />
            <line x1="142" y1="340" x2="178" y2="340" stroke="#0f172a" strokeWidth="2" />

            {/* Arms depending on pose */}
            {isGreeting ? (
              // Waving right arm
              <g id="spexGreetingArm">
                <path d="M 210 240 C 240 210, 260 170, 270 140" stroke="#151b32" strokeWidth="22" strokeLinecap="round" fill="none" />
                <rect x="245" y="150" width="22" height="10" rx="3" fill="url(#spexGoldGrad)" transform="rotate(-30 255 155)" />
                <circle cx="272" cy="132" r="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
                {/* Waving fingers */}
                <ellipse cx="270" cy="116" rx="4" ry="8" fill="#ffffff" />
                <ellipse cx="280" cy="120" rx="4" ry="8" fill="#ffffff" transform="rotate(15 280 120)" />
              </g>
            ) : isEureka ? (
              // Fist raised high
              <g id="spexEurekaArm">
                <path d="M 210 240 L 260 160 L 265 100" stroke="#151b32" strokeWidth="22" strokeLinecap="round" fill="none" />
                <rect x="245" y="110" width="24" height="10" rx="3" fill="url(#spexGoldGrad)" />
                <circle cx="265" cy="90" r="16" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
                {/* Golden triumph star */}
                <polygon points="265,65 270,78 284,78 273,87 277,100 265,92 253,100 257,87 246,78 260,78" fill="#f59e0b" />
              </g>
            ) : (
              // Standard confident arms akimbo
              <g id="spexStandardArms">
                <path d="M 108 240 C 70 270, 65 330, 115 360" stroke="#151b32" strokeWidth="22" strokeLinecap="round" fill="none" />
                <rect x="68" y="280" width="18" height="24" rx="4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
                <path d="M 212 240 C 250 270, 255 330, 205 360" stroke="#151b32" strokeWidth="22" strokeLinecap="round" fill="none" />
                <rect x="234" y="280" width="18" height="24" rx="4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
              </g>
            )}
          </g>
        )}

        {/* -------------------- HEAD, COLLAR, AND TORSO BUST (ALWAYS VISIBLE) -------------------- */}
        <g id="spexBust">
          {/* Egyptian Mecha Collar (Usekh) */}
          <path
            d="M 90 260 C 90 215, 230 215, 230 260 C 230 295, 90 295, 90 260 Z"
            fill="url(#spexCollarBlue)"
            stroke="url(#spexGoldGrad)"
            strokeWidth="6"
          />
          {/* Radial gold collar slats */}
          <line x1="120" y1="230" x2="128" y2="280" stroke="#f59e0b" strokeWidth="3" />
          <line x1="140" y1="225" x2="144" y2="285" stroke="#f59e0b" strokeWidth="3" />
          <line x1="160" y1="224" x2="160" y2="288" stroke="#f59e0b" strokeWidth="3" />
          <line x1="180" y1="225" x2="176" y2="285" stroke="#f59e0b" strokeWidth="3" />
          <line x1="200" y1="230" x2="192" y2="280" stroke="#f59e0b" strokeWidth="3" />

          {/* Eye of Horus Center Golden Crest */}
          <circle cx="160" cy="272" r="14" fill="#090d1a" stroke="#f59e0b" strokeWidth="2" />
          <path
            d="M 152 272 C 156 268, 164 268, 168 272 C 164 276, 156 276, 152 272 Z"
            fill="#f59e0b"
          />
          <circle cx="160" cy="272" r="3" fill="#ffffff" />
          <path d="M 155 275 L 157 282" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />

          {/* White Chest & Shoulder Plates */}
          <path d="M 94 250 L 70 280 L 105 310 L 125 270 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="3" />
          <path d="M 226 250 L 250 280 L 215 310 L 195 270 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="3" />

          {/* Egyptian Cat Head Shell */}
          <ellipse cx="160" cy="148" rx="66" ry="60" fill="url(#spexArmorGrad)" stroke="#0d1222" strokeWidth="4" />

          {/* Left Ear (Bastet Tall Pointed) */}
          <path
            d="M 104 120 L 76 26 C 76 26, 102 36, 126 78 Z"
            fill="url(#spexArmorGrad)"
            stroke="#0d1222"
            strokeWidth="3"
          />
          {/* Left Ear Inner Golden Plate */}
          <path d="M 100 110 L 82 42 L 120 78 Z" fill="url(#spexGoldGrad)" />
          <line x1="88" y1="65" x2="108" y2="90" stroke="#b45309" strokeWidth="2" />
          <line x1="93" y1="80" x2="114" y2="100" stroke="#b45309" strokeWidth="2" />

          {/* Right Ear (Bastet Tall Pointed) */}
          <path
            d="M 216 120 L 244 26 C 244 26, 218 36, 194 78 Z"
            fill="url(#spexArmorGrad)"
            stroke="#0d1222"
            strokeWidth="3"
          />
          {/* Right Ear Inner Golden Plate */}
          <path d="M 220 110 L 238 42 L 200 78 Z" fill="url(#spexGoldGrad)" />
          <line x1="232" y1="65" x2="212" y2="90" stroke="#b45309" strokeWidth="2" />
          <line x1="227" y1="80" x2="206" y2="100" stroke="#b45309" strokeWidth="2" />

          {/* Center Forehead Golden Stripe (Royal Pharaonic Accent) */}
          <polygon points="160,86 166,134 160,140 154,134" fill="url(#spexGoldGrad)" />

          {/* Golden Earphone Sensor Discs (Sides of Head) */}
          <ellipse cx="94" cy="148" rx="8" ry="18" fill="url(#spexGoldGrad)" stroke="#b45309" strokeWidth="2" />
          <ellipse cx="226" cy="148" rx="8" ry="18" fill="url(#spexGoldGrad)" stroke="#b45309" strokeWidth="2" />

          {/* Golden Whiskers */}
          <line x1="120" y1="172" x2="88" y2="168" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
          <line x1="120" y1="178" x2="86" y2="182" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
          <line x1="200" y1="172" x2="232" y2="168" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
          <line x1="200" y1="178" x2="234" y2="182" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />

          {/* Golden Cat Nose */}
          <polygon points="160,166 165,172 155,172" fill="#f59e0b" />

          {/* -------------------- DYNAMIC FACIAL EXPRESSIONS -------------------- */}

          {/* Mouth */}
          {isHappy || isEureka || isSuccess ? (
            // Big open happy cat mouth
            <path d="M 148 174 C 148 190, 172 190, 172 174" fill="#e11d48" stroke="#0f172a" strokeWidth="2" />
          ) : isSurprised ? (
            // Surprised small 'O' mouth
            <circle cx="160" cy="180" r="6" fill="#e11d48" stroke="#0f172a" strokeWidth="2" />
          ) : isSarcastic ? (
            // Asymmetric half-smirk
            <path d="M 152 174 C 156 178, 166 172, 170 170" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
          ) : isFacepalm ? (
            // Sheepish wavy smile
            <path d="M 150 176 Q 160 178 170 174" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
          ) : (
            // Classic gentle Bastet smile
            <path d="M 150 174 C 155 178, 160 178, 160 174 C 160 178, 165 178, 170 174" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          )}

          {/* Eyes */}
          {isHappy ? (
            // Cheerful closed laughing curved eyes (^ ^)
            <g id="spexHappyEyes">
              <path d="M 124 146 C 132 136, 144 136, 150 146" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" fill="none" />
              <path d="M 170 146 C 176 136, 188 136, 196 146" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" fill="none" />
            </g>
          ) : isFacepalm ? (
            // Closed eyes under facepalm paw
            <g id="spexFacepalmEyes">
              <path d="M 124 144 Q 137 150 148 144" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" fill="none" />
              <path d="M 172 144 Q 183 150 196 144" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" fill="none" />
              {/* Paw over forehead */}
              <ellipse cx="140" cy="115" rx="22" ry="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" transform="rotate(-25 140 115)" />
              <rect x="120" y="112" width="20" height="6" rx="3" fill="#f59e0b" transform="rotate(-25 140 115)" />
            </g>
          ) : isThinking ? (
            // Eyes looking up and left thoughtfully
            <g id="spexThinkingEyes">
              <ellipse cx="137" cy="142" rx="14" ry="18" fill="url(#spexEyeIrisGrad)" stroke="#0d1222" strokeWidth="2" />
              <ellipse cx="134" cy="138" rx="6" ry="10" fill="#0d1222" />
              <circle cx="132" cy="134" r="3" fill="#ffffff" />

              <ellipse cx="183" cy="142" rx="14" ry="18" fill="url(#spexEyeIrisGrad)" stroke="#0d1222" strokeWidth="2" />
              <ellipse cx="180" cy="138" rx="6" ry="10" fill="#0d1222" />
              <circle cx="178" cy="134" r="3" fill="#ffffff" />

              {/* Paw to chin */}
              <circle cx="142" cy="180" r="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
              <rect x="134" y="186" width="16" height="5" rx="2" fill="#f59e0b" />
            </g>
          ) : isJoking ? (
            // Left eye open, right eye winking closed
            <g id="spexJokingEyes">
              <ellipse cx="137" cy="144" rx="14" ry="18" fill="url(#spexEyeIrisGrad)" stroke="#0d1222" strokeWidth="2" />
              <ellipse cx="137" cy="144" rx="6" ry="10" fill="#0d1222" />
              <circle cx="134" cy="140" r="3" fill="#ffffff" />

              {/* Right eye winking */}
              <path d="M 172 144 Q 183 154 196 144" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" fill="none" />
            </g>
          ) : isSerious ? (
            // Narrowed determined gaze
            <g id="spexSeriousEyes">
              {/* Lowered stern brows */}
              <path d="M 122 134 L 150 142" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
              <path d="M 198 134 L 170 142" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />

              <ellipse cx="137" cy="146" rx="14" ry="12" fill="url(#spexEyeIrisGrad)" stroke="#0d1222" strokeWidth="2" />
              <ellipse cx="137" cy="146" rx="5" ry="8" fill="#0d1222" />
              <circle cx="134" cy="144" r="2.5" fill="#ffffff" />

              <ellipse cx="183" cy="146" rx="14" ry="12" fill="url(#spexEyeIrisGrad)" stroke="#0d1222" strokeWidth="2" />
              <ellipse cx="183" cy="146" rx="5" ry="8" fill="#0d1222" />
              <circle cx="180" cy="144" r="2.5" fill="#ffffff" />
            </g>
          ) : isSarcastic ? (
            // One raised brow, half-lidded eye
            <g id="spexSarcasticEyes">
              <path d="M 120 130 Q 135 124 150 134" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" fill="none" />
              <ellipse cx="137" cy="144" rx="14" ry="16" fill="url(#spexEyeIrisGrad)" stroke="#0d1222" strokeWidth="2" />
              <ellipse cx="139" cy="144" rx="6" ry="9" fill="#0d1222" />
              <circle cx="136" cy="140" r="3" fill="#ffffff" />

              {/* Lowered skeptical right brow */}
              <path d="M 170 138 L 196 142" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
              <ellipse cx="183" cy="146" rx="14" ry="12" fill="url(#spexEyeIrisGrad)" stroke="#0d1222" strokeWidth="2" />
              <ellipse cx="181" cy="146" rx="5" ry="8" fill="#0d1222" />
              <circle cx="178" cy="144" r="2.5" fill="#ffffff" />
            </g>
          ) : (
            // Standard / Curious / Greeting / Eureka wide brilliant feline eyes
            <g id="spexStandardEyes">
              <ellipse cx="137" cy="144" rx="15" ry="19" fill="url(#spexEyeIrisGrad)" stroke="#0d1222" strokeWidth="2" />
              <ellipse cx="137" cy="144" rx="6" ry="11" fill="#0d1222" />
              <circle cx="134" cy="138" r="3.5" fill="#ffffff" />
              <circle cx="140" cy="148" r="1.5" fill="#ffffff" />

              <ellipse cx="183" cy="144" rx="15" ry="19" fill="url(#spexEyeIrisGrad)" stroke="#0d1222" strokeWidth="2" />
              <ellipse cx="183" cy="144" rx="6" ry="11" fill="#0d1222" />
              <circle cx="180" cy="138" r="3.5" fill="#ffffff" />
              <circle cx="186" cy="148" r="1.5" fill="#ffffff" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};
