import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Gauge, Clock, Layers, Sparkles } from 'lucide-react';
import { Badge } from '../../design/components/Badge';
import { Button } from '../../design/components/Button';
import { IconButton } from '../../design/components/IconButton';
import { SkeletonSky } from '../../design/components/SkeletonSky';
import { ErrorState } from '../../design/components/ErrorState';
import { EmptyState } from '../../design/components/EmptyState';
import { Language, translations } from '../../utils/translations';
import { TimeSeriesFrame, TemporalPairInfo } from '../../science/timeSeriesPipeline';

export interface FramePlayerProps {
  ra: number;
  dec: number;
  caseId?: string;
  language: Language;
  onSelectFrame?: (frameIndex: number) => void;
  className?: string;
}

export interface TimeSeriesResponse {
  status: string;
  state?: string;
  sourceMode?: string;
  sourceLabel?: 'REAL SPHEREx DATA' | 'REAL DATA, SAVED COPY (NOT LIVE)' | 'TRAINING DATA';
  targetCoords: { ra: number; dec: number };
  fovArcmin: number;
  sizePix: number;
  framesCount: number;
  frames: TimeSeriesFrame[];
  temporalPairs: TemporalPairInfo[];
  cadenceSummary: {
    totalFrames: number;
    totalPairs: number;
    intraVisitPairs: number;
    independentVisitPairs: number;
    surveyEpochPairs: number;
  };
  frameMode: 'sky' | 'target';
  error?: string;
}

export const FramePlayer: React.FC<FramePlayerProps> = ({
  ra,
  dec,
  caseId,
  language,
  onSelectFrame,
  className = '',
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';

  const [data, setData] = useState<TimeSeriesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<'OK' | 'ARCHIVE_ZERO_ROWS' | 'NETWORK_ERROR' | 'HTTP_ERROR'>('OK');

  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 0.5x, 1x, 2x, 4x
  const [frameMode, setFrameMode] = useState<'sky' | 'target'>('sky');

  const playTimerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fetchTimeSeries = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/spherex/timeseries?ra=${ra.toFixed(5)}&dec=${dec.toFixed(5)}&caseId=${caseId || ''}&frame=${frameMode}`;
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) {
          setState('ARCHIVE_ZERO_ROWS');
          setLoading(false);
          return;
        }
        throw new Error(`API returned HTTP ${res.status}`);
      }
      const json: TimeSeriesResponse = await res.json();
      if (json.state === 'ARCHIVE_ZERO_ROWS' || (json.frames && json.frames.length === 0)) {
        setState('ARCHIVE_ZERO_ROWS');
      } else {
        setState('OK');
        setData(json);
        setCurrentFrameIdx(0);
      }
    } catch (err: any) {
      setState('NETWORK_ERROR');
      setError(err?.message || 'Could not load time-series frames');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeSeries();
  }, [ra, dec, caseId, frameMode]);

  // Frame animation loop
  useEffect(() => {
    if (!isPlaying || !data?.frames?.length) {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      return;
    }

    const intervalMs = Math.round(800 / playbackSpeed);
    playTimerRef.current = setInterval(() => {
      setCurrentFrameIdx((prev) => {
        const next = (prev + 1) % data.frames.length;
        onSelectFrame?.(next);
        return next;
      });
    }, intervalMs);

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, playbackSpeed, data?.frames?.length, onSelectFrame]);

  // Render current frame to canvas
  useEffect(() => {
    if (!data?.frames?.length) return;
    const frame = data.frames[currentFrameIdx];
    if (!frame) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = frame.width || 64;
    const height = frame.height || 64;
    canvas.width = width;
    canvas.height = height;

    const flux = frame.flux;
    if (!flux || flux.length === 0) return;

    // Contrast stretching: calculate percentiles
    const sorted = [...flux].filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
    const p02 = sorted[Math.floor(sorted.length * 0.02)] || 0;
    const p98 = sorted[Math.floor(sorted.length * 0.98)] || 1;
    const range = Math.max(1e-6, p98 - p02);

    const imgData = ctx.createImageData(width, height);
    for (let i = 0; i < flux.length; i++) {
      const val = flux[i];
      let norm = (val - p02) / range;
      norm = Math.max(0, Math.min(1, Math.asinh(norm * 4) / Math.asinh(4)));
      const byteVal = Math.round(norm * 255);

      // Deep space amber/cyan palette
      imgData.data[i * 4] = Math.round(byteVal * 0.95); // R
      imgData.data[i * 4 + 1] = Math.round(byteVal * 0.85); // G
      imgData.data[i * 4 + 2] = Math.round(byteVal * 0.65); // B
      imgData.data[i * 4 + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);
  }, [data, currentFrameIdx]);

  if (loading) {
    return (
      <SkeletonSky
        label="SPHEREx MULTI-EPOCH TIME-SERIES"
        sublabel="Aligning sequential exposures, calculating cadence, and reprojecting sky frame..."
        aspectRatio="video"
        className={className}
      />
    );
  }

  if (state === 'NETWORK_ERROR' || error) {
    return (
      <ErrorState
        title="Time-Series Archive Unreachable"
        error={error || 'Failed to retrieve multi-epoch exposures from IRSA.'}
        onRetry={fetchTimeSeries}
        className={className}
      />
    );
  }

  if (state === 'ARCHIVE_ZERO_ROWS' || !data || data.frames.length === 0) {
    return (
      <EmptyState
        title="Zero Time-Series Observations in Current Footprint"
        description="No sequential multi-epoch observations found for these coordinates in SPHEREx QR2."
        className={className}
      />
    );
  }

  const currentFrame = data.frames[currentFrameIdx] || data.frames[0];
  const pairInfo = data.temporalPairs?.[currentFrameIdx] || data.temporalPairs?.[0];

  // Plain-language classification of the time gap
  const cadenceDescription = (() => {
    if (!pairInfo) return 'Single observation epoch';
    if (pairInfo.baselineType === 'INTRA_VISIT') {
      return isRtl
        ? 'لقطات متتابعة خلال نفس التمريرة (دقائق معدودة)'
        : 'Minutes apart (intra-visit exposures in same slew pass)';
    }
    if (pairInfo.baselineType === 'INDEPENDENT_VISIT') {
      return isRtl
        ? 'زيارات رصدية مستقلة (ساعات أو أيام مختلفة)'
        : 'Independent observation visits (hours to days apart)';
    }
    return isRtl
      ? 'أشهر متباعدة (مسح شامل للسماء)'
      : 'Months apart (different all-sky survey passes)';
  })();

  const sourceBadgeVariant = data.sourceLabel === 'REAL DATA, SAVED COPY (NOT LIVE)'
    ? 'SAVED'
    : data.sourceLabel === 'TRAINING DATA'
    ? 'TRAINING'
    : 'REAL';

  return (
    <div className={`obs-glass rounded-2xl p-4 sm:p-5 flex flex-col gap-4 overflow-hidden ${className}`}>
      {/* Top Header: Badge, Title, Frame Mode */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2">
          <Badge variant={sourceBadgeVariant} size="sm" />
          <span className="font-mono text-xs text-[#00D3F3]">
            FRAME {currentFrameIdx + 1} OF {data.frames.length}
          </span>
        </div>

        {/* Frame Mode Toggle (Sky vs Target centered) */}
        <div className="flex items-center gap-1 bg-[#05070E] p-1 rounded-xl border border-white/10 text-xs font-mono">
          <button
            type="button"
            onClick={() => setFrameMode('sky')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              frameMode === 'sky'
                ? 'bg-[#FFB900] text-slate-950 font-semibold'
                : 'text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            {t.frameModeSky}
          </button>
          <button
            type="button"
            onClick={() => setFrameMode('target')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              frameMode === 'target'
                ? 'bg-[#00D3F3] text-slate-950 font-semibold'
                : 'text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            {t.frameModeTarget}
          </button>
        </div>
      </div>

      {/* Frame Visual Area */}
      <div className="relative w-full aspect-video sm:h-72 rounded-xl bg-black border border-white/10 overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 detector-grid opacity-25" />
        <div className="crop-mark-tl" />
        <div className="crop-mark-tr" />
        <div className="crop-mark-bl" />
        <div className="crop-mark-br" />

        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain image-rendering-pixelated"
        />

        {/* Coordinates HUD Overlay */}
        <div className="absolute top-2 left-2 pointer-events-none bg-black/60 backdrop-blur-md px-2.5 py-1 rounded border border-white/10 font-mono text-[10px] text-[#00D3F3]">
          RA {ra.toFixed(4)}° · DEC {dec >= 0 ? '+' : ''}{dec.toFixed(4)}° · {currentFrame?.detector || 'D1'}
        </div>

        {/* Date & Wavelength HUD */}
        <div className="absolute bottom-2 left-2 pointer-events-none bg-black/60 backdrop-blur-md px-2.5 py-1 rounded border border-white/10 font-mono text-[10px] text-[#F1F5F9]">
          {currentFrame?.dateObs || '2025-04-28'} · λ = {currentFrame?.wavelengthUm || 0.93} µm
        </div>

        {/* Trail label if target mode */}
        {frameMode === 'sky' && (
          <div className="absolute top-2 right-2 pointer-events-none">
            <Badge variant="ENLARGED_MOTION" size="sm" />
          </div>
        )}
      </div>

      {/* Scrubber & Playback Controls */}
      <div className="flex flex-col gap-2 pt-1">
        {/* Timeline Range Scrubber */}
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={data.frames.length - 1}
            value={currentFrameIdx}
            onChange={(e) => {
              const idx = parseInt(e.target.value, 10);
              setCurrentFrameIdx(idx);
              onSelectFrame?.(idx);
            }}
            className="flex-1 accent-[#FFB900] cursor-pointer"
            aria-label="Frame scrubber"
          />
          <span className="font-mono text-xs text-[#94A3B8] shrink-0">
            {currentFrameIdx + 1} / {data.frames.length}
          </span>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <IconButton
              label="Previous frame"
              size="sm"
              variant="secondary"
              onClick={() => {
                const prev = (currentFrameIdx - 1 + data.frames.length) % data.frames.length;
                setCurrentFrameIdx(prev);
                onSelectFrame?.(prev);
              }}
            >
              <SkipBack className="w-3.5 h-3.5" />
            </IconButton>

            <Button
              variant="primary"
              size="sm"
              icon={isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? t.framePlayerPause : t.framePlayerPlay}
            </Button>

            <IconButton
              label="Next frame"
              size="sm"
              variant="secondary"
              onClick={() => {
                const next = (currentFrameIdx + 1) % data.frames.length;
                setCurrentFrameIdx(next);
                onSelectFrame?.(next);
              }}
            >
              <SkipForward className="w-3.5 h-3.5" />
            </IconButton>
          </div>

          {/* Speed selector */}
          <div className="flex items-center gap-1 font-mono text-[11px] text-[#94A3B8]">
            <Gauge className="w-3.5 h-3.5 text-[#00D3F3]" />
            {[0.5, 1, 2, 4].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-1.5 py-0.5 rounded transition-all ${
                  playbackSpeed === spd
                    ? 'bg-[#00D3F3]/20 text-[#00D3F3] font-bold'
                    : 'hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cadence & Time-Gap Plain Language Banner */}
      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-2.5 text-xs text-[#94A3B8]">
        <Clock className="w-4 h-4 text-[#FFB900] shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-semibold text-[#F1F5F9] block mb-0.5">
            {cadenceDescription}
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {pairInfo?.deltaSeconds != null
              ? `Inter-exposure cadence: ${(pairInfo.deltaSeconds / 60).toFixed(1)} minutes (${pairInfo.humanBaseline})`
              : 'Sequential survey exposure with sub-pixel WCS registration'}
          </span>
        </div>
      </div>
    </div>
  );
};
