import React, { useEffect, useRef, useState } from 'react';
import { Globe, ExternalLink } from 'lucide-react';

declare global {
  interface Window {
    A?: {
      init: Promise<void>;
      aladin: (container: HTMLElement | string, options: Record<string, any>) => any;
      graphicOverlay?: (options: Record<string, any>) => any;
      polyline?: (points: Array<[number, number]>, options?: Record<string, any>) => any;
      marker?: (ra: number, dec: number, options?: Record<string, any>) => any;
      catalog?: (options?: Record<string, any>) => any;
    };
  }
}

export interface AladinLitePanelProps {
  ra: number;
  dec: number;
  fovArcmin?: number;
  targetName?: string;
  className?: string;
}

const ALADIN_JS_URL = 'https://aladin.cds.unistra.fr/AladinLite/api/v3/3.4.2/aladin.js';
const ALADIN_CSS_URL = 'https://aladin.cds.unistra.fr/AladinLite/api/v3/3.4.2/aladin.min.css';

let aladinScriptPromise: Promise<void> | null = null;

function ensureAladinScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.A) return window.A.init ?? Promise.resolve();
  if (aladinScriptPromise) return aladinScriptPromise;

  aladinScriptPromise = new Promise<void>((resolve, reject) => {
    if (!document.querySelector(`link[href="${ALADIN_CSS_URL}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = ALADIN_CSS_URL;
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = ALADIN_JS_URL;
    script.async = true;
    script.charset = 'utf-8';
    script.onload = () => {
      if (window.A?.init) {
        window.A.init.then(() => resolve()).catch(reject);
      } else if (window.A) {
        resolve();
      } else {
        reject(new Error('Aladin Lite loaded without global A'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Aladin Lite v3 from CDS'));
    document.head.appendChild(script);
  });

  return aladinScriptPromise;
}

const SURVEYS = [
  { id: 'P/allWISE/color', label: 'AllWISE IR' },
  { id: 'P/2MASS/color', label: '2MASS NIR' },
  { id: 'P/DSS2/color', label: 'DSS2 Optical' },
];

export const AladinLitePanel: React.FC<AladinLitePanelProps> = ({
  ra,
  dec,
  fovArcmin = 6.6,
  targetName,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<any>(null);
  const overlayRef = useRef<any>(null);
  const [survey, setSurvey] = useState<string>('P/allWISE/color');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    ensureAladinScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.A) return;
        if (!instanceRef.current) {
          instanceRef.current = window.A.aladin(containerRef.current, {
            survey,
            fov: Math.max(0.05, (fovArcmin * 2.5) / 60),
            target: `${ra} ${dec}`,
            showReticle: true,
            showZoomControl: true,
            showLayersControl: false,
            showGotoControl: false,
          });
          if (window.A.graphicOverlay) {
            overlayRef.current = window.A.graphicOverlay({ color: '#00D3F3', lineWidth: 2 });
            instanceRef.current.addOverlay(overlayRef.current);
          }
        }
        setStatus('ready');
      })
      .catch((err: any) => {
        if (!cancelled) {
          setStatus('error');
          setErrorMsg(err?.message || 'Aladin Lite v3 unreachable');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Sync coordinates, FOV, survey, and SPHEREx cutout footprint box
  useEffect(() => {
    const aladin = instanceRef.current;
    if (!aladin || status !== 'ready') return;
    try {
      aladin.gotoRaDec(ra, dec);
      aladin.setFov(Math.max(0.05, (fovArcmin * 2.4) / 60));
      aladin.setImageSurvey(survey);

      if (overlayRef.current && window.A?.polyline) {
        overlayRef.current.removeAll();
        const halfDecDeg = fovArcmin / 120;
        const cosDec = Math.max(0.15, Math.cos((dec * Math.PI) / 180));
        const halfRaDeg = halfDecDeg / cosDec;
        const box: Array<[number, number]> = [
          [ra - halfRaDeg, dec - halfDecDeg],
          [ra + halfRaDeg, dec - halfDecDeg],
          [ra + halfRaDeg, dec + halfDecDeg],
          [ra - halfRaDeg, dec + halfDecDeg],
          [ra - halfRaDeg, dec - halfDecDeg],
        ];
        overlayRef.current.add(window.A.polyline(box, { color: '#00D3F3', lineWidth: 2 }));
      }
    } catch {}
  }, [ra, dec, fovArcmin, survey, status]);

  return (
    <div className={`obs-glass rounded-2xl p-3 flex flex-col gap-2.5 border border-white/10 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-1.5 text-slate-200 font-bold">
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span>Sky Context · Aladin Lite v3</span>
          {targetName && <span className="text-slate-400 font-normal truncate max-w-[140px]">({targetName})</span>}
        </div>
        <div className="flex items-center gap-1">
          {SURVEYS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSurvey(s.id)}
              className={`px-2 py-0.5 rounded-lg text-[10px] transition cursor-pointer ${
                survey === s.id
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full h-56 sm:h-64 rounded-xl overflow-hidden bg-black border border-white/10">
        <div ref={containerRef} className="w-full h-full" />
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-xs font-mono text-slate-400">
            Loading Aladin Lite v3 All-Sky Context...
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/90 p-4 text-center text-xs font-mono text-slate-400">
            <span>{errorMsg || 'Aladin Lite CDN unavailable'}</span>
            <a
              href={`https://aladin.cds.unistra.fr/AladinLite/?target=${ra}%20${dec}&fov=${(fovArcmin * 2.4) / 60}&survey=${encodeURIComponent(survey)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
            >
              Open in CDS Aladin <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span>Cyan box: SPHEREx {fovArcmin.toFixed(1)}′×{fovArcmin.toFixed(1)}′ cutout</span>
        <span>RA {ra.toFixed(4)}°, Dec {dec >= 0 ? '+' : ''}{dec.toFixed(4)}°</span>
      </div>
    </div>
  );
};
