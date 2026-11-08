import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ArrowUp, Zap, Hand } from 'lucide-react';
import { gameAudio } from '../utils/gameAudio';

interface MobileControlsProps {
  onMove: (x: number, y: number, sprint: boolean) => void;
  onJump: () => void;
  onInteract: () => void;
  canInteract: boolean;
  language: 'en' | 'ar';
  onRotateCamera?: (deltaYawRad: number) => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onMove,
  onJump,
  onInteract,
  canInteract,
  language,
  onRotateCamera,
}) => {
  const isAr = language === 'ar';
  const joystickRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSprinting, setIsSprinting] = useState(false);

  const maxRadius = 45;

  const updateJoystick = useCallback((clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist === 0) {
      setKnobPos({ x: 0, y: 0 });
      onMove(0, 0, isSprinting);
      return;
    }

    const angle = Math.atan2(dy, dx);
    const clampedDist = Math.min(dist, maxRadius);
    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    setKnobPos({ x: knobX, y: knobY });

    // Normalized input vector (-1 to 1)
    const normX = knobX / maxRadius;
    const normY = knobY / maxRadius;
    onMove(normX, normY, isSprinting);
  }, [isSprinting, onMove]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setIsDragging(true);
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        updateJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setIsDragging(false);
        setKnobPos({ x: 0, y: 0 });
        onMove(0, 0, false);
        break;
      }
    }
  };

  // Re-emit with updated sprint flag
  useEffect(() => {
    if (isDragging) {
      const normX = knobPos.x / maxRadius;
      const normY = knobPos.y / maxRadius;
      onMove(normX, normY, isSprinting);
    }
  }, [isSprinting, isDragging, knobPos, onMove]);

  return (
    <div className="absolute inset-x-0 bottom-4 pointer-events-none z-30 flex items-end justify-between px-6 pb-2 select-none">
      {/* Virtual Analog Joystick (Bottom Left) */}
      <div 
        ref={joystickRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="pointer-events-auto relative w-32 h-32 rounded-full bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 flex items-center justify-center touch-none shadow-[0_0_20px_rgba(6,182,212,0.15)]"
      >
        {/* Outer Ring guide */}
        <div className="absolute inset-3 rounded-full border border-dashed border-cyan-500/20" />
        
        {/* Dynamic Knob */}
        <div
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 border border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.5)] transition-transform duration-75"
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          }}
        />
      </div>

      {/* Action Buttons (Bottom Right) */}
      <div className="pointer-events-auto flex flex-col items-end gap-2.5">
        {/* Quick Camera Rotate Controls */}
        {onRotateCamera && (
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={() => {
                gameAudio.playClick();
                onRotateCamera(Math.PI / 4); // Turn camera 45° left
              }}
              className="w-10 h-10 rounded-xl bg-slate-900/80 border border-cyan-500/30 text-cyan-300 font-mono text-xs flex items-center justify-center shadow"
              title="Rotate Camera Left"
            >
              ⟲ 45°
            </button>
            <button
              type="button"
              onClick={() => {
                gameAudio.playClick();
                onRotateCamera(-Math.PI / 4); // Turn camera 45° right
              }}
              className="w-10 h-10 rounded-xl bg-slate-900/80 border border-cyan-500/30 text-cyan-300 font-mono text-xs flex items-center justify-center shadow"
              title="Rotate Camera Right"
            >
              45° ⟳
            </button>
          </div>
        )}

        {/* Sprint Toggle */}
        <button
          type="button"
          onClick={() => {
            gameAudio.playClick();
            setIsSprinting(!isSprinting);
          }}
          className={`w-12 h-12 rounded-full border flex items-center justify-center transition shadow-lg ${
            isSprinting
              ? 'bg-amber-500/30 border-amber-400 text-amber-300'
              : 'bg-slate-900/70 border-slate-700 text-slate-400'
          }`}
          aria-label="Sprint"
        >
          <Zap className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          {/* Interact [E] Button */}
          {canInteract && (
            <button
              type="button"
              onClick={() => {
                gameAudio.playTerminalInteract();
                onInteract();
              }}
              className="w-14 h-14 rounded-full bg-cyan-500/40 border-2 border-cyan-300 text-cyan-200 flex flex-col items-center justify-center animate-bounce shadow-[0_0_20px_rgba(6,182,212,0.6)]"
              aria-label="Interact"
            >
              <Hand className="w-6 h-6" />
              <span className="text-[9px] font-mono font-bold">INTERACT</span>
            </button>
          )}

          {/* Jump / Thruster Button */}
          <button
            type="button"
            onClick={() => {
              onJump();
            }}
            className="w-14 h-14 rounded-full bg-blue-600/60 border border-blue-400 text-white flex items-center justify-center shadow-lg active:scale-95 transition"
            aria-label="Jump / Jetpack"
          >
            <ArrowUp className="w-7 h-7" />
          </button>
        </div>
      </div>
    </div>
  );
};
