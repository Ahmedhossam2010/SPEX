import React from 'react';

export interface PanelHeadingProps {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const PanelHeading: React.FC<PanelHeadingProps> = ({
  title,
  icon,
  action,
  className = '',
}) => (
  <div
    className={`flex items-center justify-between gap-2 pb-1.5 border-b border-white/10 ${className}`}
  >
    <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider font-bold text-slate-300">
      {icon && <span className="text-sky-400 shrink-0">{icon}</span>}
      <span>{title}</span>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
