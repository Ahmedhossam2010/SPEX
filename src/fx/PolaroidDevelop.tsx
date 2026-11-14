import React, { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '../design/motionKit';

interface PolaroidDevelopProps {
  triggerKey: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Display-only arrival wrapper: animates camera dive + Polaroid develop curve
 * using compositor transforms/opacity/filter. Falls back to opacity fade only
 * when prefers-reduced-motion is enabled. Never modifies underlying image pixels.
 */
export const PolaroidDevelop: React.FC<PolaroidDevelopProps> = ({
  triggerKey,
  children,
  className = '',
}) => {
  const reducedMotion = usePrefersReducedMotion();
  const [developing, setDeveloping] = useState(true);

  useEffect(() => {
    setDeveloping(false);
    const raf = requestAnimationFrame(() => setDeveloping(true));
    const id = setTimeout(() => setDeveloping(false), reducedMotion ? 240 : 580);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(id);
    };
  }, [triggerKey, reducedMotion]);

  return (
    <div
      className={`${
        developing ? (reducedMotion ? 'animate-fade-in' : 'spex-polaroid-develop') : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
