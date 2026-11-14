import React, { useState } from 'react';
import { X, Copy, Check, Share2, Code2, ExternalLink } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  ra: number;
  dec: number;
  caseId?: string;
  targetName?: string;
  fovArcmin?: number;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  ra,
  dec,
  caseId,
  targetName,
  fovArcmin = 6.5,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  if (!isOpen) return null;

  const origin = window.location.origin;
  const directUrl = `${origin}/?ra=${ra.toFixed(4)}&dec=${dec.toFixed(4)}&fov=${fovArcmin}${
    caseId ? `&case=${encodeURIComponent(caseId)}` : ''
  }`;
  const embedCode = `<iframe src="${directUrl}" width="800" height="600" frameborder="0" allowfullscreen title="SPHEREx Changing Sky: ${
    targetName || `RA ${ra.toFixed(4)}, Dec ${dec.toFixed(4)}`
  }"></iframe>`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(directUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-[#030712] p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-300">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Share & Embed Sky Coordinates</h3>
              <p className="text-xs text-slate-400 font-mono">
                {targetName || `RA ${ra.toFixed(4)}°, Dec ${dec >= 0 ? '+' : ''}${dec.toFixed(4)}°`} (FOV {fovArcmin}')
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 pt-4 text-xs font-mono">
          {/* Direct Link */}
          <div>
            <label className="text-slate-300 font-bold block mb-1.5 flex items-center justify-between">
              <span>Direct Link (Deep-Linkable URL)</span>
              {copiedUrl && <span className="text-emerald-400 text-[11px] font-normal">Copied to clipboard!</span>}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={directUrl}
                className="flex-1 px-3 py-2 rounded-xl border border-white/15 bg-white/5 text-slate-200 outline-none select-all text-xs"
              />
              <button
                onClick={handleCopyUrl}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 transition-colors shadow-md"
              >
                {copiedUrl ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>Copy</span>
              </button>
            </div>
          </div>

          {/* Iframe Embed */}
          <div>
            <label className="text-slate-300 font-bold block mb-1.5 flex items-center justify-between">
              <span>Website Embed Snippet (HTML &lt;iframe&gt;)</span>
              {copiedEmbed && <span className="text-emerald-400 text-[11px] font-normal">Copied to clipboard!</span>}
            </label>
            <div className="relative">
              <textarea
                readOnly
                rows={3}
                value={embedCode}
                className="w-full px-3 py-2 rounded-xl border border-white/15 bg-white/5 text-slate-300 outline-none select-all text-[11px] resize-none"
              />
              <button
                onClick={handleCopyEmbed}
                className="absolute right-2 bottom-3 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-white/15 transition-colors"
              >
                {copiedEmbed ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Code2 className="h-3.5 w-3.5 text-amber-400" />}
                <span>Copy Code</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Anyone opening this link will immediately view this celestial field with SPHEREx difference imaging, candidate detections, and multi-wavelength overlays.
          </p>
        </div>
      </div>
    </div>
  );
};

