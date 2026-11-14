import React from 'react';
import { X } from 'lucide-react';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { IconButton } from './IconButton';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  isRtl?: boolean;
  maxWidthClass?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeLabel?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  isRtl = false,
  maxWidthClass = 'max-w-3xl',
  children,
  footer,
  closeLabel = 'Close dialog',
}) => {
  useModalBehavior(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in ${
        isRtl ? 'font-cairo' : 'font-sans'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidthClass} max-h-[90vh] flex flex-col rounded-3xl bg-[#090F1E]/98 border border-sky-400/25 shadow-[0_24px_80px_rgba(0,0,0,0.75)] overflow-hidden`}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <span className="shrink-0">{icon}</span>}
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-lg font-bold text-slate-50 truncate">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-slate-400 truncate mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          <IconButton
            variant="glass"
            size="md"
            label={closeLabel}
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </IconButton>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">{children}</div>

        {footer && (
          <div className="px-5 py-3.5 border-t border-white/10 bg-[#050811]/70 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
