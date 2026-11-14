import React, { useState, useMemo } from 'react';
import {
  X,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  Radio,
  Sliders,
  CheckCircle2,
  RotateCcw,
  Info,
} from 'lucide-react';
import {
  SPHEREX_ARRAYS,
  SPHEREX_BANDS,
  ALL_CONFIGURED_CHANNELS,
  ONE_PER_ARRAY_CHANNELS,
  ALL_102_BANDS,
} from '../science/bandData';
import { ArrayInfo, BandInfo } from '../science/types';

interface BandSelectorProps {
  selectedChannels: number[];
  onChangeSelectedChannels: (channels: number[]) => void;
  onClose?: () => void;
  language?: 'en' | 'ar';
}

export const BandSelector: React.FC<BandSelectorProps> = ({
  selectedChannels,
  onChangeSelectedChannels,
  onClose,
  language = 'en',
}) => {
  const [viewMode, setViewMode] = useState<'arrays' | 'full102'>('arrays');

  // Quick Action Handlers
  const handleSelectAll = () => {
    onChangeSelectedChannels([...ALL_CONFIGURED_CHANNELS]);
  };

  const handleClearAll = () => {
    onChangeSelectedChannels([]);
  };

  const handleOnePerArray = () => {
    onChangeSelectedChannels([...ONE_PER_ARRAY_CHANNELS]);
  };

  const handleToggleChannel = (channel: number) => {
    if (selectedChannels.includes(channel)) {
      onChangeSelectedChannels(selectedChannels.filter((c) => c !== channel));
    } else {
      onChangeSelectedChannels([...selectedChannels, channel].sort((a, b) => a - b));
    }
  };

  const handleToggleArray = (array: ArrayInfo) => {
    const arrayChannels = array.channels;
    const allSelectedInArray = arrayChannels.every((c) => selectedChannels.includes(c));

    if (allSelectedInArray) {
      // Deselect this array
      onChangeSelectedChannels(selectedChannels.filter((c) => !arrayChannels.includes(c)));
    } else {
      // Select all in this array
      const newSet = new Set([...selectedChannels, ...arrayChannels]);
      onChangeSelectedChannels(Array.from(newSet).sort((a, b) => a - b));
    }
  };

  // Selected bands info
  const selectedBandDetails = useMemo(() => {
    return SPHEREX_BANDS.filter((b) => selectedChannels.includes(b.channel));
  }, [selectedChannels]);

  const minWl = selectedBandDetails.length > 0
    ? Math.min(...selectedBandDetails.map((b) => b.wavelength_um))
    : 0.75;
  const maxWl = selectedBandDetails.length > 0
    ? Math.max(...selectedBandDetails.map((b) => b.wavelength_um))
    : 5.0;

  return (
    <div className="w-full rounded-3xl border border-white/15 bg-[#030712]/95 backdrop-blur-2xl p-4 sm:p-6 shadow-2xl text-slate-100 font-sans">
      {/* Top Header */}
      <div className="flex items-start justify-between border-b border-white/10 pb-4 mb-4 gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-sky-500/20 border border-amber-400/30 text-amber-300">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-['Outfit'] text-base sm:text-lg font-bold text-slate-100">
                {language === 'ar'
                  ? 'محدد الأطياف وكواشف SPHEREx الـ 102 قناة'
                  : 'SPHEREx 102-Band Infrared Spectrum & Array Explorer'}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold">
                QR2 LVF
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'ar'
                ? '6 كواشف بمراشح خطية متغيرة (LVF) تغطي النطاق الطيفي من 0.75 إلى 5.00 ميكرون'
                : '6 Linear Variable Filter (LVF) detector arrays spanning 0.75 µm to 5.00 µm (R ≈ 35–130)'}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Quick-Action Controls Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10 mb-5 font-mono text-xs">
        {/* Quick Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-200 font-semibold transition-all active:scale-95 flex items-center gap-1.5"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span>Select All</span>
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <Square className="h-3.5 w-3.5" />
            <span>Clear All</span>
          </button>
          <button
            type="button"
            onClick={handleOnePerArray}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-bold transition-all active:scale-95 flex items-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>One Per Array</span>
          </button>
        </div>

        {/* Array Stacking / Co-addition Quick Buttons (NASA Consideration) */}
        <div className="w-full pt-2 border-t border-white/5 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-slate-400 uppercase font-bold mr-1 flex items-center gap-1">
            <Layers className="h-3 w-3 text-sky-400" />
            <span>Stack by Array (Boost S/N):</span>
          </span>
          {SPHEREX_ARRAYS.map((arr) => {
            const isStacked =
              arr.channels.every((c) => selectedChannels.includes(c)) &&
              selectedChannels.length === arr.channels.length;
            return (
              <button
                key={arr.id}
                type="button"
                onClick={() => onChangeSelectedChannels([...arr.channels])}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all flex items-center gap-1 ${
                  isStacked
                    ? 'border font-bold'
                    : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                }`}
                style={{
                  borderColor: isStacked ? arr.color : undefined,
                  color: isStacked ? arr.color : undefined,
                  backgroundColor: isStacked ? `${arr.color}25` : undefined,
                }}
                title={`Co-add all channels in Array ${arr.id} (${arr.wavelengthRange}) to increase photometric S/N`}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: arr.color }} />
                <span>Stack Arr {arr.id}</span>
              </button>
            );
          })}
        </div>

        {/* Selection Count Pill */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Selected Channels:</span>
          <span className="px-2.5 py-1 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold">
            {selectedChannels.length} / {ALL_CONFIGURED_CHANNELS.length}
          </span>
        </div>
      </div>

      {/* Wavelength Spectrum Ribbon / Gauge */}
      <div className="p-3 sm:p-4 rounded-2xl bg-black/40 border border-white/10 mb-5">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-semibold">Infrared Spectral Continuum:</span>
            <span className="text-amber-300 font-mono">
              {selectedChannels.length > 0 ? `${minWl.toFixed(2)} µm – ${maxWl.toFixed(2)} µm` : 'No channels selected'}
            </span>
          </div>
          <span className="text-slate-500 hidden sm:inline">0.75 µm → 5.00 µm</span>
        </div>

        {/* Continuum Gradient Bar with Markers */}
        <div className="relative w-full h-4 rounded-full overflow-hidden bg-gradient-to-r from-[#64b5f6] via-[#4caf50] via-[#ff9400] via-[#9b59b6] via-[#e74c3c] to-[#ff6b6b] opacity-80 shadow-inner">
          {/* Subtle array delimiter ticks */}
          <div className="absolute inset-0 flex justify-between pointer-events-none opacity-40 px-1">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-full w-px bg-black" />
            ))}
          </div>
        </div>

        {/* Ticks & Labels */}
        <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1 px-1">
          <span>0.75 µm (NIR)</span>
          <span>1.1 µm</span>
          <span>1.6 µm</span>
          <span>2.2 µm</span>
          <span>3.2 µm</span>
          <span>4.2 µm</span>
          <span>5.0 µm (MIR)</span>
        </div>
      </div>

      {/* 6 Detector Arrays Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-5">
        {SPHEREX_ARRAYS.map((array) => {
          const arrayChannels = array.channels;
          const selectedInArray = arrayChannels.filter((c) => selectedChannels.includes(c));
          const isAllSelected = selectedInArray.length === arrayChannels.length;
          const isSomeSelected = selectedInArray.length > 0 && !isAllSelected;

          return (
            <div
              key={array.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                selectedInArray.length > 0
                  ? 'bg-white/[0.04] border-white/20 shadow-lg'
                  : 'bg-white/[0.015] border-white/5 opacity-80'
              }`}
              style={{
                borderLeftColor: array.color,
                borderLeftWidth: '4px',
              }}
            >
              {/* Array Card Header */}
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: array.color }}
                  />
                  <div>
                    <span className="font-bold text-xs text-slate-100">{array.label}</span>
                    <span className="block text-[10px] text-slate-400 font-mono">
                      {array.wavelengthRange}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleArray(array)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition-colors ${
                    isAllSelected
                      ? 'bg-white/15 text-slate-200 border-white/20'
                      : isSomeSelected
                      ? 'bg-amber-400/15 text-amber-300 border-amber-400/30'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:text-slate-200'
                  }`}
                >
                  {isAllSelected ? 'Deselect' : 'Select All'}
                </button>
              </div>

              {/* Individual Channel Checkboxes */}
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                {arrayChannels.map((channel) => {
                  const isChecked = selectedChannels.includes(channel);
                  const band = SPHEREX_BANDS.find((b) => b.channel === channel);
                  const wl = band ? `${band.wavelength_um.toFixed(2)} µm` : '';

                  return (
                    <button
                      key={channel}
                      type="button"
                      onClick={() => handleToggleChannel(channel)}
                      className={`p-1.5 rounded-xl border text-left transition-all flex items-center justify-between gap-1.5 ${
                        isChecked
                          ? 'bg-white/15 border-white/30 text-slate-100 font-semibold shadow-sm'
                          : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                            isChecked
                              ? 'border-transparent text-black font-bold'
                              : 'border-white/20 bg-black/40'
                          }`}
                          style={{
                            backgroundColor: isChecked ? array.color : undefined,
                          }}
                        >
                          {isChecked && '✓'}
                        </div>
                        <span className="text-[10px]">Ch {channel}</span>
                      </div>
                      <span className="text-[9px] text-slate-400">{wl}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Summary & Apply Action */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <Info className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <span>
            {language === 'ar'
              ? 'تتيح هذه القنوات مقارنة الفروق الضوئية عبر النطاقات الطيفية المختلفة لتلسكوب SPHEREx.'
              : 'Selected channels define spectral bands for differential multi-epoch temporal inspection.'}
          </span>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 font-bold transition-all active:scale-95 shadow-md flex items-center gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Apply Selection</span>
          </button>
        )}
      </div>
    </div>
  );
};

