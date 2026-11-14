import React, { useEffect, useRef } from 'react';

export interface SkyCoverageMarker {
  id: string;
  label: string;
  ra: number;
  dec: number;
  covered?: boolean;
}

export interface AitoffSkyMapProps {
  targetRa?: number | null;
  targetDec?: number | null;
  targetLabel?: string;
  isCovered?: boolean | null;
  coverageMarkers?: SkyCoverageMarker[];
  diving?: boolean;
  reducedMotion?: boolean;
  className?: string;
  height?: number;
}

/**
 * Projects Equatorial (ra deg [0,360), dec deg [-90,90]) using Aitoff equal-area-like projection
 * with RA increasing toward the left (astronomical convention, RA=180 deg at center).
 */
export function projectAitoff(
  raDeg: number,
  decDeg: number,
  width: number,
  height: number
): { x: number; y: number } {
  const normRa = ((raDeg % 360) + 360) % 360;
  // Center at RA=180 so 0h/24h is on edges and ecliptic S-curve reads smoothly
  const lonRad = ((180 - normRa) * Math.PI) / 180;
  const latRad = (Math.max(-89.9, Math.min(89.9, decDeg)) * Math.PI) / 180;

  const cosLatHalfLon = Math.cos(latRad) * Math.cos(lonRad / 2);
  const alpha = Math.acos(Math.max(-1, Math.min(1, cosLatHalfLon)));
  const sincAlpha = alpha === 0 ? 1 : Math.sin(alpha) / alpha;

  const ax = (2 * Math.cos(latRad) * Math.sin(lonRad / 2)) / sincAlpha; // [-pi, pi]
  const ay = Math.sin(latRad) / sincAlpha; // [-pi/2, pi/2]

  const padX = 14;
  const padY = 12;
  const rx = (width - padX * 2) / 2;
  const ry = (height - padY * 2) / 2;

  return {
    x: width / 2 + (ax / Math.PI) * rx,
    y: height / 2 - (ay / (Math.PI / 2)) * ry,
  };
}

export const AitoffSkyMap: React.FC<AitoffSkyMapProps> = ({
  targetRa,
  targetDec,
  targetLabel,
  isCovered = null,
  coverageMarkers = [],
  diving = false,
  reducedMotion = false,
  className = '',
  height = 172,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 380;
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 1. Deep-space background inside canvas
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const rx = (width - 28) / 2;
    const ry = (height - 24) / 2;

    // 2. Aitoff boundary clip + interior
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();

    const bgGrad = ctx.createRadialGradient(cx, cy, 12, cx, cy, rx);
    bgGrad.addColorStop(0, '#0C1830');
    bgGrad.addColorStop(0.7, '#070E1E');
    bgGrad.addColorStop(1, '#040711');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle SPHEREx all-sky PR1 / QR3 / NEP deep-survey coverage shading
    // Ecliptic high-cadence NEP (~270, +66.5) and SEP (~90, -66.5) deep fields
    const nep = projectAitoff(270, 66.56, width, height);
    const sep = projectAitoff(90, -66.56, width, height);

    // Shaded SPHEREx All-Sky Pass bands
    ctx.fillStyle = 'rgba(56, 189, 248, 0.085)';
    ctx.fillRect(0, 0, width, height);

    // Deep NEP/SEP polar rings (180+ visits/yr)
    for (const pole of [nep, sep]) {
      const pGrad = ctx.createRadialGradient(pole.x, pole.y, 2, pole.x, pole.y, 34);
      pGrad.addColorStop(0, 'rgba(56, 189, 248, 0.42)');
      pGrad.addColorStop(0.65, 'rgba(56, 189, 248, 0.14)');
      pGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(pole.x, pole.y, 34, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ecliptic plane subtle band
    ctx.beginPath();
    for (let deg = 0; deg <= 360; deg += 4) {
      const eps = (23.44 * Math.PI) / 180;
      const raRad = (deg * Math.PI) / 180;
      const eclLat = Math.asin(Math.sin(eps) * Math.sin(raRad)) * (180 / Math.PI);
      const pt = projectAitoff(deg, eclLat, width, height);
      if (deg === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.28)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Equatorial graticule lines (RA every 60 deg, Dec every 30 deg)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
    ctx.lineWidth = 0.7;

    for (const decLine of [-60, -30, 0, 30, 60]) {
      ctx.beginPath();
      for (let raLine = 0; raLine <= 360; raLine += 6) {
        const pt = projectAitoff(raLine, decLine, width, height);
        if (raLine === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }

    for (const raLine of [60, 120, 180, 240, 300]) {
      ctx.beginPath();
      for (let decLine = -88; decLine <= 88; decLine += 4) {
        const pt = projectAitoff(raLine, decLine, width, height);
        if (decLine === -88) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }

    // Deterministic background reference stars inside projection
    for (let i = 0; i < 64; i++) {
      const sRa = (i * 137.5) % 360;
      const sDec = Math.sin(i * 1.91) * 74;
      const pt = projectAitoff(sRa, sDec, width, height);
      ctx.fillStyle = i % 5 === 0 ? 'rgba(253, 230, 138, 0.5)' : 'rgba(226, 232, 240, 0.35)';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, i % 7 === 0 ? 1.15 : 0.75, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Verified SPHEREx Covered Benchmark / Target Dots
    for (const mk of coverageMarkers) {
      const pt = projectAitoff(mk.ra, mk.dec, width, height);
      ctx.fillStyle = mk.covered === false ? 'rgba(148, 163, 184, 0.55)' : 'rgba(56, 189, 248, 0.85)';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // 5. Outer Aitoff ellipse hairline border
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.38)';
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Small pole labels
    ctx.fillStyle = 'rgba(125, 211, 252, 0.85)';
    ctx.font = '600 9px monospace';
    ctx.fillText('NEP', nep.x + 5, nep.y + 3);

    // 6. Selected Target Reticle
    if (Number.isFinite(targetRa) && Number.isFinite(targetDec)) {
      const tPt = projectAitoff(targetRa as number, targetDec as number, width, height);
      const reticleColor = isCovered === false ? '#FB7185' : '#F59E0B';

      // Outer halo
      ctx.strokeStyle = reticleColor;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(tPt.x, tPt.y, 8, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshair ticks
      ctx.beginPath();
      ctx.moveTo(tPt.x - 13, tPt.y);
      ctx.lineTo(tPt.x - 5, tPt.y);
      ctx.moveTo(tPt.x + 5, tPt.y);
      ctx.lineTo(tPt.x + 13, tPt.y);
      ctx.moveTo(tPt.x, tPt.y - 13);
      ctx.lineTo(tPt.x, tPt.y - 5);
      ctx.moveTo(tPt.x, tPt.y + 5);
      ctx.lineTo(tPt.x, tPt.y + 13);
      ctx.stroke();

      // Core dot
      ctx.fillStyle = reticleColor;
      ctx.beginPath();
      ctx.arc(tPt.x, tPt.y, 2.8, 0, Math.PI * 2);
      ctx.fill();

      if (targetLabel) {
        ctx.font = 'bold 10px sans-serif';
        const labelX = tPt.x > width * 0.65 ? tPt.x - 12 : tPt.x + 12;
        ctx.textAlign = tPt.x > width * 0.65 ? 'right' : 'left';
        ctx.fillStyle = '#F8FAFC';
        ctx.fillText(targetLabel.slice(0, 24), labelX, Math.max(16, tPt.y - 8));
        ctx.textAlign = 'left';
      }
    }
  }, [targetRa, targetDec, targetLabel, isCovered, coverageMarkers, height]);

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-[#040711] border border-white/10 ${
        diving && !reducedMotion ? 'spex-aitoff-dive' : ''
      } ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-auto block"
        style={{ maxHeight: `${height}px` }}
        aria-label={
          targetLabel
            ? `All-sky Aitoff projection showing ${targetLabel} within SPHEREx coverage`
            : 'All-sky Aitoff projection of SPHEREx infrared coverage'
        }
      />
    </div>
  );
};
