import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'cyan';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'start',
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-lg',
    md: 'text-sm px-4 py-2 gap-2 rounded-xl',
    lg: 'text-base px-6 py-3 gap-2.5 rounded-xl font-medium',
  }[size];

  const variantClasses = {
    primary:
      'bg-gradient-to-r from-[#FFB900] via-[#FB9600] to-[#EB7F00] text-slate-950 font-semibold shadow-[0_0_20px_rgba(255,185,0,0.3)] hover:shadow-[0_0_28px_rgba(255,185,0,0.45)] hover:brightness-105 active:scale-[0.98] transition-all',
    secondary:
      'bg-[#0C0E14]/80 text-[#F1F5F9] border border-white/10 hover:border-[#FFB900]/40 hover:bg-[#161B26] active:scale-[0.98] transition-all backdrop-blur-md',
    cyan:
      'bg-[#00D3F3]/10 text-[#00D3F3] border border-[#00D3F3]/30 hover:bg-[#00D3F3]/20 hover:border-[#00D3F3]/60 shadow-[0_0_16px_rgba(0,211,243,0.2)] active:scale-[0.98] transition-all',
    ghost:
      'bg-transparent text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/5 active:scale-[0.98] transition-all',
    danger:
      'bg-[#FF637E]/10 text-[#FF637E] border border-[#FF637E]/30 hover:bg-[#FF637E]/20 hover:border-[#FF637E]/50 active:scale-[0.98] transition-all',
  }[variant];

  const disabledClasses = disabled
    ? 'opacity-40 cursor-not-allowed pointer-events-none'
    : 'cursor-pointer';

  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap font-sans transition-all duration-150 ${sizeClasses} ${variantClasses} ${disabledClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && iconPosition === 'start' && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === 'end' && <span className="shrink-0">{icon}</span>}
    </button>
  );
};
