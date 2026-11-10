import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  type?: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message?: string;
  onClose?: () => void;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  type = 'info',
  title,
  message,
  onClose,
  className = '',
}) => {
  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-[#FFB900]" />,
    warning: <AlertCircle className="w-4 h-4 text-[#FB9600]" />,
    info: <Info className="w-4 h-4 text-[#00D3F3]" />,
    error: <AlertCircle className="w-4 h-4 text-[#FF637E]" />,
  };

  const borders = {
    success: 'border-[#FFB900]/30 shadow-[0_0_20px_rgba(255,185,0,0.15)]',
    warning: 'border-[#FB9600]/30 shadow-[0_0_20px_rgba(251,150,0,0.15)]',
    info: 'border-[#00D3F3]/30 shadow-[0_0_20px_rgba(0,211,243,0.15)]',
    error: 'border-[#FF637E]/30 shadow-[0_0_20px_rgba(255,99,126,0.15)]',
  };

  return (
    <div
      role="status"
      className={`flex items-start gap-3 p-3.5 rounded-xl bg-[#0C0E14]/90 backdrop-blur-md border ${borders[type]} text-[#F1F5F9] max-w-sm animate-in fade-in slide-in-from-bottom-2 ${className}`}
    >
      <div className="shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold leading-tight">{title}</p>
        {message && <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-normal">{message}</p>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
