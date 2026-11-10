import React from 'react';

export interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  hasGrid?: boolean;
  hasCropMarks?: boolean;
  glow?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className = '',
  hasGrid = false,
  hasCropMarks = false,
  glow = false,
  style,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`relative overflow-hidden rounded-2xl transition-all duration-200 ${
        glow ? 'obs-glass-glow' : 'obs-glass'
      } ${hasGrid ? 'detector-grid' : ''} ${className}`}
    >
      {hasCropMarks && (
        <>
          <div className="crop-mark-tl" aria-hidden="true" />
          <div className="crop-mark-tr" aria-hidden="true" />
          <div className="crop-mark-bl" aria-hidden="true" />
          <div className="crop-mark-br" aria-hidden="true" />
        </>
      )}
      {children}
    </div>
  );
};
