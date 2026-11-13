import React, { useRef, useEffect, useState } from 'react';
import { X, Download, Share2, Check, Sparkles, AlertTriangle } from 'lucide-react';
import { Button } from '../../design/components/Button';
import { CandidateDetection, InvestigationResult } from '../../science/types';
import { canClaimDiscovery, getSourceClassificationMeta } from '../../science/provenance';
import { Language, translations } from '../../utils/translations';

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
  const [copied, setCopied] = useState(false);
  const t = translations[language];
  const gate = canClaimDiscovery(result);
  const classMeta = getSourceClassificationMeta(gate.sourceClassification, language);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 800;
    const height = 480;
    canvas.width = width;
    canvas.height = height;

    // Background: deep space gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#02040A');
    bgGrad.addColorStop(0.5, '#070C18');
    bgGrad.addColorStop(1, '#0B1528');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Decorative starfield
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const seed = Math.floor((result.targetCoords?.ra || 276.26) * 100);
    for (let i = 0; i < 90; i++) {
      const sx = ((i * 37 + seed * 13) % (width - 40)) + 20;
      const sy = ((i * 71 + seed * 29) % (height - 40)) + 20;
      const r = (i % 3 === 0) ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outer border with subtle amber/cyan glow
    ctx.strokeStyle = 'rgba(245, 166, 35, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    // Corner crop marks
    ctx.strokeStyle = '#FFB900';
    ctx.lineWidth = 2;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(12, 26); ctx.lineTo(12, 12); ctx.lineTo(26, 12);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(width - 26, 12); ctx.lineTo(width - 12, 12); ctx.lineTo(width - 12, 26);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(12, height - 26); ctx.lineTo(12, height - 12); ctx.lineTo(26, height - 12);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(width - 26, height - 12); ctx.lineTo(width - 12, height - 12); ctx.lineTo(width - 12, height - 26);
    ctx.stroke();

    // Left Viewport: Authentic SPHEREx astronomical cutout frame
    const vpX = 36;
    const vpY = 80;
    const vpSize = 220;

    ctx.fillStyle = '#010307';
    ctx.fillRect(vpX, vpY, vpSize, vpSize);
    ctx.strokeStyle = 'rgba(0, 211, 243, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vpX, vpY, vpSize, vpSize);

    if (sourceCanvas && sourceCanvas.width > 0 && sourceCanvas.height > 0) {
      // Draw actual astronomical cutout pixels from the viewport canvas
      ctx.drawImage(sourceCanvas, vpX, vpY, vpSize, vpSize);
    } else {
      // Fallback starlight core when canvas not yet populated
      const radGrad = ctx.createRadialGradient(
        vpX + vpSize / 2, vpY + vpSize / 2, 2,
        vpX + vpSize / 2, vpY + vpSize / 2, 45
      );
      radGrad.addColorStop(0, '#FFFFFF');
      radGrad.addColorStop(0.2, '#00D3F3');
      radGrad.addColorStop(0.6, 'rgba(0, 211, 243, 0.15)');
      radGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(vpX + vpSize / 2, vpY + vpSize / 2, 45, 0, Math.PI * 2);
      ctx.fill();
    }

    // Source Reticle Crosshairs
    ctx.strokeStyle = '#FFB900';
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

    // Viewport tag
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#7E91B3';
    ctx.fillText('SPHEREx DIFFERENCE CUTOUT', vpX, vpY + vpSize + 18);
    const fovStr = result.fovArcmin ? `${(result.fovArcmin * 60).toFixed(0)}"` : '396"';
    ctx.fillText(`FOV: ${fovStr} | RES: ~6.2"/px`, vpX, vpY + vpSize + 32);

    // Header branding
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillStyle = gate.allowed ? '#F5A623' : '#94A3B8';
    ctx.fillText(
      gate.allowed
        ? 'SPHEREx // DISCOVERY POSTCARD'
        : `SPHEREx // ${gate.sourceClassification} REFERENCE CARD`,
      36,
      48
    );

    ctx.font = '11px "Inter", sans-serif';
    ctx.fillStyle = '#7E91B3';
    ctx.fillText('NASA Space Apps Challenge — Planet X & SPHEREx', 36, 64);

    // Right Column: Target Details & Verdict
    const infoX = 280;
    let textY = 90;

    // Target Title
    ctx.font = 'bold 24px "Playfair Display", Georgia, serif';
    ctx.fillStyle = '#E8EEF8';
    const targetName = candidate?.id || result.title || 'Transient Candidate';
    ctx.fillText(targetName, infoX, textY);
    textY += 28;

    // Coordinates HUD
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#00E5FF';
    const raVal = result.targetCoords?.ra ?? 276.2614;
    const decVal = result.targetCoords?.dec ?? 64.8258;
    ctx.fillText(`RA ${raVal.toFixed(4)}°  •  DEC ${decVal >= 0 ? '+' : ''}${decVal.toFixed(4)}°`, infoX, textY);
    textY += 32;

    // Verdict Box
    ctx.fillStyle = gate.allowed ? 'rgba(245, 166, 35, 0.08)' : 'rgba(99, 102, 241, 0.08)';
    ctx.fillRect(infoX, textY - 14, 470, 72);
    ctx.strokeStyle = gate.allowed ? 'rgba(245, 166, 35, 0.3)' : 'rgba(129, 140, 248, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(infoX, textY - 14, 470, 72);

    ctx.font = 'bold 13px "Inter", sans-serif';
    ctx.fillStyle = gate.allowed ? '#F5A623' : '#A5B4FC';
    const verdictTitle = !gate.allowed
      ? `REFERENCE SNAPSHOT (${gate.sourceClassification})`
      : candidate?.status
      ? `VERDICT: ${candidate.status.toUpperCase()}`
      : 'SPHEREx TIME LENS OBSERVATION';
    ctx.fillText(verdictTitle, infoX + 14, textY + 8);

    ctx.font = '12px "Inter", sans-serif';
    ctx.fillStyle = '#CBD5E1';
    const verdictDesc = candidate?.whyFlagged || result.description ||
      'Infrared comparison across SPHEREx archive epochs.';
    const trimmedDesc = verdictDesc.length > 80 ? verdictDesc.substring(0, 77) + '...' : verdictDesc;
    ctx.fillText(trimmedDesc, infoX + 14, textY + 28);

    // Confidence Level (strictly computed, never fabricated)
    const computedSigma = candidate?.peakSignificance ?? result.evidence?.maxSignificance;
    const sigma = typeof computedSigma === 'number' && Number.isFinite(computedSigma)
      ? `${computedSigma.toFixed(1)}σ`
      : 'N/A';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#00E5FF';
    ctx.fillText(
      `DETECTION SIGNIFICANCE: ${sigma} · SOURCE: ${gate.sourceClassification}`,
      infoX + 14,
      textY + 46
    );
    textY += 86;

    // Observations list snippet
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#7E91B3';
    ctx.fillText('COMPARISON EPOCHS:', infoX, textY);
    textY += 18;

    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#CBD5E1';
    const obsA = result.epoch1?.metadata;
    const obsB = result.epoch2?.metadata;
    ctx.fillText(`Epoch 1: ${obsA?.date_obs?.split('T')[0] || 'N/A'} (${obsA?.obs_id || 'Obs 1'})`, infoX, textY);
    textY += 16;
    ctx.fillText(`Epoch 2: ${obsB?.date_obs?.split('T')[0] || 'N/A'} (${obsB?.obs_id || 'Obs 2'})`, infoX, textY);
    textY += 32;

    // Bottom banner
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(36, height - 52);
    ctx.lineTo(width - 36, height - 52);
    ctx.stroke();

    ctx.font = '10px "Inter", sans-serif';
    ctx.fillStyle = gate.allowed ? '#5A6E8C' : '#F59E0B';
    ctx.fillText(
      gate.allowed
        ? 'VERIFIED SPHEREx ARCHIVE OBSERVATION • SPECTRO-PHOTOMETRIC SURVEY OF THE SKY'
        : 'NON-LIVE / REFERENCE DATA ONLY — NOT ELIGIBLE FOR OFFICIAL DISCOVERY CLAIMS',
      36,
      height - 32
    );

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#F5A623';
    ctx.fillText(new Date().toISOString().split('T')[0], width - 110, height - 32);
  }, [isOpen, result, candidate, gate.allowed, gate.sourceClassification, sourceCanvas]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!canvasRef.current || !gate.allowed) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `SPHEREx_Discovery_${(candidate?.id || result.title || 'target').replace(/\s+/g, '_')}.png`;
    a.click();
  };

  const handleCopy = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-[#070C18] border border-obs-border-highlight rounded-xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-obs-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-obs-amber" />
            <h3 className="text-lg font-serif font-bold text-white tracking-wide">
              {gate.allowed
                ? language === 'ar'
                  ? 'مشاركة بطاقة الاكتشاف الفلكي'
                  : 'Share Discovery Postcard'
                : language === 'ar'
                ? 'بطاقة مرجعية (مصدر غير مباشر)'
                : 'Reference Snapshot Preview'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-obs-text-dim hover:text-white rounded-lg hover:bg-obs-panel transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!gate.allowed && (
          <div className="mt-4 p-3 rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-200 text-xs font-mono flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>{classMeta.badgeLabel}:</strong> {t.provenanceBlockedPassportNotice}
            </span>
          </div>
        )}

        {/* Canvas Preview Container */}
        <div className="my-5 flex justify-center bg-black/60 p-2 rounded-lg border border-obs-border overflow-hidden">
          <canvas
            ref={canvasRef}
            className="max-w-full h-auto rounded shadow-lg border border-obs-border/50"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-obs-border">
          <p className="text-xs text-obs-text-dim">
            {language === 'ar' ? 'بطاقة ملخصة تشمل الإحداثيات، نتيجة SPHEREx، والفارق الزمني.' : 'A shareable summary card with coordinates, SPHEREx verdict, and cadence data.'}
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              onClick={handleCopy}
            >
              {copied ? (language === 'ar' ? 'تم النسخ!' : 'Copied!') : (language === 'ar' ? 'نسخ البطاقة' : 'Copy Image')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!gate.allowed}
              icon={<Download className="w-4 h-4" />}
              onClick={handleDownload}
              title={gate.allowed ? 'Download Discovery Postcard' : t.provenanceBlockedPassportNotice}
            >
              {gate.allowed
                ? language === 'ar'
                  ? 'تحميل البطاقة'
                  : 'Download Postcard'
                : language === 'ar'
                ? 'التصدير محظور (غير مباشر)'
                : 'Export Blocked (Non-Live)'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
