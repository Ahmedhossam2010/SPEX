import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  label: string; // Accessible label
}

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  label,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'w-7 h-7 p-1 text-xs rounded-lg',
    md: 'w-9 h-9 p-1.5 text-sm rounded-xl',
    lg: 'w-11 h-11 p-2 text-base rounded-xl',
  }[size];

  const variantClasses = {
    primary:
      'bg-[#FFB900] text-slate-950 shadow-[0_0_16px_rgba(255,185,0,0.35)] hover:brightness-110 active:scale-95 transition-all',
    secondary:
      'bg-[#0C0E14] text-[#F1F5F9] border border-white/10 hover:border-white/20 hover:bg-[#161B26] active:scale-95 transition-all',
    glass:
      'bg-white/5 text-[#F1F5F9] border border-white/10 hover:border-[#FFB900]/40 hover:bg-white/10 backdrop-blur-md active:scale-95 transition-all',
    ghost:
      'bg-transparent text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/5 active:scale-95 transition-all',
  }[variant];

  const disabledClasses = disabled
    ? 'opacity-40 cursor-not-allowed pointer-events-none'
    : 'cursor-pointer';

  return (
    <button
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center shrink-0 transition-all duration-150 ${sizeClasses} ${variantClasses} ${disabledClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
