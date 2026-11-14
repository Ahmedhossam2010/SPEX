import React, { useRef, useEffect, useState } from 'react';
import { X, Download, Share2, Check, Sparkles, AlertTriangle, Link2 } from 'lucide-react';
import { Button } from '../../design/components/Button';
import { CandidateDetection, InvestigationResult } from '../../science/types';
import { canClaimDiscovery, getSourceClassificationMeta } from '../../science/provenance';
import { Language, translations } from '../../utils/translations';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { gameAudio } from '../../game/utils/gameAudio';

interface PostcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: InvestigationResult;
  candidate?: CandidateDetection | null;
  language: Language;
  sourceCanvas?: HTMLCanvasElement | null;
}

export const PostcardModal: React.FC<PostcardModalProps> = ({
  isOpen,
  onClose,
  result,
  candidate,
  language,
  sourceCanvas,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const t = translations[language];
  const isRtl = language === 'ar';
  const gate = canClaimDiscovery(result);
  const classMeta = getSourceClassificationMeta(gate.sourceClassification, language);

  useModalBehavior(isOpen, onClose);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 800;
    const height = 480;
    canvas.width = width;
    canvas.height = height;

    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#040711');
    bgGrad.addColorStop(0.5, '#070D1C');
    bgGrad.addColorStop(1, '#0B162C');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    const seed = Math.floor((result.targetCoords?.ra || 276.26) * 100);
    for (let i = 0; i < 90; i++) {
      const sx = ((i * 37 + seed * 13) % (width - 40)) + 20;
      const sy = ((i * 71 + seed * 29) % (height - 40)) + 20;
      const r = i % 3 === 0 ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, 26); ctx.lineTo(12, 12); ctx.lineTo(26, 12);
    ctx.moveTo(width - 26, 12); ctx.lineTo(width - 12, 12); ctx.lineTo(width - 12, 26);
    ctx.moveTo(12, height - 26); ctx.lineTo(12, height - 12); ctx.lineTo(26, height - 12);
    ctx.moveTo(width - 26, height - 12); ctx.lineTo(width - 12, height - 12); ctx.lineTo(width - 12, height - 26);
    ctx.stroke();

    const vpX = 36;
    const vpY = 80;
    const vpSize = 220;

    ctx.fillStyle = '#02040A';
    ctx.fillRect(vpX, vpY, vpSize, vpSize);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vpX, vpY, vpSize, vpSize);

    if (sourceCanvas && sourceCanvas.width > 0 && sourceCanvas.height > 0) {
      ctx.drawImage(sourceCanvas, vpX, vpY, vpSize, vpSize);
    } else {
      const radGrad = ctx.createRadialGradient(
        vpX + vpSize / 2, vpY + vpSize / 2, 2,
        vpX + vpSize / 2, vpY + vpSize / 2, 45
      );
      radGrad.addColorStop(0, '#FFFFFF');
      radGrad.addColorStop(0.25, '#38BDF8');
      radGrad.addColorStop(0.6, 'rgba(56, 189, 248, 0.16)');
      radGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(vpX + vpSize / 2, vpY + vpSize / 2, 45, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.5;
    const markerX = candidate ? vpX + (candidate.x / (result.epoch1?.width || 64)) * vpSize : vpX + vpSize / 2;
    const markerY = candidate ? vpY + (candidate.y / (result.epoch1?.height || 64)) * vpSize : vpY + vpSize / 2;

    ctx.beginPath();
    ctx.arc(markerX, markerY, 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(markerX - 16, markerY); ctx.lineTo(markerX - 6, markerY);
    ctx.moveTo(markerX + 6, markerY); ctx.lineTo(markerX + 16, markerY);
    ctx.moveTo(markerX, markerY - 16); ctx.lineTo(markerX, markerY - 6);
    ctx.moveTo(markerX, markerY + 6); ctx.lineTo(markerX, markerY + 16);
    ctx.stroke();

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('SPHEREx CUTOUT FRAME', vpX, vpY + vpSize + 18);
    const fovStr = result.fovArcmin ? `${(result.fovArcmin * 60).toFixed(0)}"` : '396"';
    ctx.fillText(`FOV: ${fovStr} | RES: ~6.2"/px`, vpX, vpY + vpSize + 32);

    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillStyle = gate.allowed ? '#F59E0B' : '#94A3B8';
    ctx.fillText(
      gate.allowed
        ? 'SPHEREx // DISCOVERY POSTCARD'
        : `SPHEREx // ${gate.sourceClassification} REFERENCE CARD`,
      36,
      48
    );

    ctx.font = '11px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('NASA Space Apps Challenge — SPEX: The Changing Sky', 36, 64);

    const infoX = 280;
    let textY = 90;

    ctx.font = 'bold 24px "Outfit", sans-serif';
    ctx.fillStyle = '#F8FAFC';
    const targetName = candidate?.id || result.title || 'Sky Target';
    ctx.fillText(targetName, infoX, textY);
    textY += 28;

    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38BDF8';
    const raVal = result.targetCoords?.ra ?? 276.2614;
    const decVal = result.targetCoords?.dec ?? 64.8258;
    ctx.fillText(`RA ${raVal.toFixed(4)}°  •  DEC ${decVal >= 0 ? '+' : ''}${decVal.toFixed(4)}°`, infoX, textY);
    textY += 32;

    ctx.fillStyle = gate.allowed ? 'rgba(245, 158, 11, 0.1)' : 'rgba(99, 102, 241, 0.1)';
    ctx.fillRect(infoX, textY - 14, 470, 72);
    ctx.strokeStyle = gate.allowed ? 'rgba(245, 158, 11, 0.35)' : 'rgba(129, 140, 248, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(infoX, textY - 14, 470, 72);

    ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = gate.allowed ? '#F59E0B' : '#A5B4FC';
    const verdictTitle = !gate.allowed
      ? `REFERENCE SNAPSHOT (${gate.sourceClassification})`
      : candidate?.status
      ? `VERDICT: ${candidate.status.toUpperCase()}`
      : 'SPHEREx TIME LENS OBSERVATION';
    ctx.fillText(verdictTitle, infoX + 14, textY + 8);

    ctx.font = '12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#CBD5E1';
    const verdictDesc = candidate?.whyFlagged || result.description ||
      'Infrared comparison across SPHEREx archive epochs.';
    const trimmedDesc = verdictDesc.length > 74 ? verdictDesc.substring(0, 71) + '...' : verdictDesc;
    ctx.fillText(trimmedDesc, infoX + 14, textY + 28);

    const computedSigma = candidate?.peakSignificance ?? result.evidence?.maxSignificance;
    const sigma = typeof computedSigma === 'number' && Number.isFinite(computedSigma)
      ? `${computedSigma.toFixed(1)}σ`
      : 'N/A';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38BDF8';
    ctx.fillText(
      `CONFIDENCE: ${sigma} · SOURCE: ${gate.sourceClassification}`,
      infoX + 14,
      textY + 46
    );
    textY += 86;

    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('COMPARISON EPOCHS:', infoX, textY);
    textY += 18;

    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#CBD5E1';
    const obsA = result.epoch1?.metadata;
    const obsB = result.epoch2?.metadata;
    ctx.fillText(`Epoch 1: ${obsA?.date_obs?.split('T')[0] || 'N/A'} (${obsA?.obs_id || 'Obs 1'})`, infoX, textY);
    textY += 16;
    ctx.fillText(`Epoch 2: ${obsB?.date_obs?.split('T')[0] || 'N/A'} (${obsB?.obs_id || 'Obs 2'})`, infoX, textY);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(36, height - 52);
    ctx.lineTo(width - 36, height - 52);
    ctx.stroke();

    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = gate.allowed ? '#94A3B8' : '#F59E0B';
    ctx.fillText(
      gate.allowed
        ? 'VERIFIED SPHEREx ARCHIVE OBSERVATION • NASA / IPAC IRSA'
        : 'SAVED OR REFERENCE SNAPSHOT — NOT ELIGIBLE FOR OFFICIAL LIVE DISCOVERY CLAIMS',
      36,
      height - 32
    );

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#F59E0B';
    ctx.fillText(new Date().toISOString().split('T')[0], width - 110, height - 32);
  }, [isOpen, result, candidate, gate.allowed, gate.sourceClassification, sourceCanvas]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!canvasRef.current || !gate.allowed) return;
    gameAudio.playClick();
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `SPHEREx_Discovery_${(candidate?.id || result.title || 'target').replace(/\s+/g, '_')}.png`;
    a.click();
  };

  const handleCopyImage = async () => {
    if (!canvasRef.current) return;
    gameAudio.playClick();
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2500);
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2500);
    }
  };

  const handleCopyLink = async () => {
    gameAudio.playClick();
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="spex-postcard-flip-in relative w-full max-w-3xl bg-[#090F1E] border border-sky-400/30 rounded-2xl shadow-2xl p-5 sm:p-6 overflow-hidden max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
            <h3 className="text-lg font-display font-bold text-white">
              {gate.allowed
                ? isRtl
                  ? 'مشاركة بطاقة الاكتشاف الفلكي'
                  : 'Share Discovery Postcard'
                : isRtl
                ? 'بطاقة مرجعية (نسخة غير مباشرة)'
                : 'Reference Snapshot Postcard'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!gate.allowed && (
          <div className="mt-4 p-3 rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-200 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>{classMeta.badgeLabel}:</strong> {t.provenanceBlockedPassportNotice}
            </span>
          </div>
        )}

        <div className="my-5 flex justify-center bg-black/60 p-2 rounded-xl border border-white/10 overflow-hidden">
          <canvas
            ref={canvasRef}
            className="max-w-full h-auto rounded-lg shadow-lg"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
          <p className="text-xs text-slate-300">
            {isRtl
              ? 'بطاقة ملخصة تشمل الإحداثيات، نتيجة SPHEREx، والفارق الزمني.'
              : 'A shareable summary card with coordinates, SPHEREx result, and dates.'}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="min-h-[44px]"
              icon={copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4" />}
              onClick={handleCopyLink}
            >
              {copiedLink ? t.btnLinkCopied : t.btnCopyLink}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              className="min-h-[44px]"
              icon={copiedImage ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              onClick={handleCopyImage}
            >
              {copiedImage ? (isRtl ? 'تم النسخ!' : 'Copied!') : (isRtl ? 'نسخ الصورة' : 'Copy Image')}
            </Button>

            <Button
              variant="primary"
              size="sm"
              className="min-h-[44px]"
              disabled={!gate.allowed}
              icon={<Download className="w-4 h-4" />}
              onClick={handleDownload}
              title={gate.allowed ? 'Download Discovery Postcard' : t.provenanceBlockedPassportNotice}
            >
              {gate.allowed
                ? isRtl
                  ? 'تحميل البطاقة'
                  : 'Download Postcard'
                : isRtl
                ? 'التصدير محظور (غير مباشر)'
                : 'Export Blocked (Non-Live)'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
