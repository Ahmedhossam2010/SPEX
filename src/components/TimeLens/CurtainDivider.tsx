import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GripVertical } from 'lucide-react';
import { Badge } from '../../design/components/Badge';

export interface CurtainDividerProps {
  epoch1Canvas: HTMLCanvasElement | null;
  epoch2Canvas: HTMLCanvasElement | null;
  epoch1Label?: string;
  epoch2Label?: string;
  className?: string;
  width?: number;
  height?: number;
}

export const CurtainDivider: React.FC<CurtainDividerProps> = ({
  epoch1Canvas,
  epoch2Canvas,
  epoch1Label = 'Epoch 1 (Before)',
  epoch2Label = 'Epoch 2 (After)',
  className = '',
  width = 512,
  height = 512,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [splitPos, setSplitPos] = useState<number>(0.5); // 0.0 to 1.0
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Magnetic snap at center (within 3% of 50%)
  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawPos = (clientX - rect.left) / rect.width;
    let clamped = Math.max(0.02, Math.min(0.98, rawPos));

    // Magnetic center snap
    if (Math.abs(clamped - 0.5) < 0.035) {
      clamped = 0.5;
    }

    setSplitPos(clamped);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    handleMove(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Composite the two canvases with curtain split
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    const splitPx = splitPos * width;

    // Draw Epoch 1 on left side
    if (epoch1Canvas) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitPx, height);
      ctx.clip();
      ctx.drawImage(epoch1Canvas, 0, 0, width, height);
      ctx.restore();
    }

    // Draw Epoch 2 on right side
    if (epoch2Canvas) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(splitPx, 0, width - splitPx, height);
      ctx.clip();
      ctx.drawImage(epoch2Canvas, 0, 0, width, height);
      ctx.restore();
    }

    // Draw dividing line
    ctx.strokeStyle = '#FFB900';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(splitPx, 0);
    ctx.lineTo(splitPx, height);
    ctx.stroke();
  }, [epoch1Canvas, epoch2Canvas, splitPos, width, height]);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative w-full aspect-square rounded-2xl bg-black border border-white/10 overflow-hidden select-none cursor-ew-resize touch-none ${className}`}
    >
      <div className="crop-mark-tl" />
      <div className="crop-mark-tr" />
      <div className="crop-mark-bl" />
      <div className="crop-mark-br" />

      <canvas ref={canvasRef} className="w-full h-full object-contain image-rendering-pixelated" />

      {/* Left Label (Epoch 1) */}
      <div className="absolute top-3 left-3 pointer-events-none bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 font-mono text-[11px] text-[#00D3F3]">
        {epoch1Label}
      </div>

      {/* Right Label (Epoch 2) */}
      <div className="absolute top-3 right-3 pointer-events-none bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 font-mono text-[11px] text-[#FFB900]">
        {epoch2Label}
      </div>

      {/* Central Handle Slider */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-12 rounded-lg bg-[#FFB900] text-slate-950 flex items-center justify-center shadow-[0_0_20px_rgba(255,185,0,0.5)] transition-transform pointer-events-none"
        style={{ left: `${splitPos * 100}%` }}
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Bottom Prompt */}
      <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
        <span className="text-[10px] text-slate-400 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 font-mono">
          DRAG TO REVEAL BEFORE / AFTER · MOVER JUMPS
        </span>
      </div>
    </div>
  );
};
