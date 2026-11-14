import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'cyan';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end';
  iconOnly?: boolean;
  tooltip?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'start',
  iconOnly = false,
  tooltip,
  title,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = iconOnly
    ? {
        sm: 'w-8 h-8 p-1.5 text-xs rounded-lg',
        md: 'w-10 h-10 p-2 text-sm rounded-xl',
        lg: 'w-11 h-11 p-2.5 text-base rounded-xl',
      }[size]
    : {
        sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-lg min-h-[34px]',
        md: 'text-sm px-4 py-2 gap-2 rounded-xl min-h-[40px]',
        lg: 'text-base px-6 py-3 gap-2.5 rounded-xl font-medium min-h-[48px]',
      }[size];

  const variantClasses = {
    primary:
      'bg-gradient-to-r from-[#FFB900] via-[#FB9600] to-[#EB7F00] text-slate-950 font-semibold shadow-[0_0_20px_rgba(255,185,0,0.3)] hover:shadow-[0_0_28px_rgba(255,185,0,0.45)] hover:brightness-105 active:scale-[0.98] transition-all',
    secondary:
      'bg-[#0C0E14]/85 text-[#F1F5F9] border border-white/12 hover:border-[#FFB900]/40 hover:bg-[#161B26] active:scale-[0.98] transition-all backdrop-blur-md',
    cyan:
      'bg-[#00D3F3]/12 text-[#00D3F3] border border-[#00D3F3]/35 hover:bg-[#00D3F3]/22 hover:border-[#00D3F3]/60 shadow-[0_0_16px_rgba(0,211,243,0.18)] active:scale-[0.98] transition-all',
    ghost:
      'bg-transparent text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/5 active:scale-[0.98] transition-all',
    danger:
      'bg-[#FF637E]/12 text-[#FF637E] border border-[#FF637E]/35 hover:bg-[#FF637E]/22 hover:border-[#FF637E]/55 active:scale-[0.98] transition-all',
  }[variant];

  const disabledClasses = disabled
    ? 'opacity-40 cursor-not-allowed pointer-events-none'
    : 'cursor-pointer';

  const resolvedTitle =
    tooltip || title || (iconOnly && typeof children === 'string' ? children : undefined);

  return (
    <button
      title={resolvedTitle}
      aria-label={props['aria-label'] || resolvedTitle}
      className={`inline-flex items-center justify-center whitespace-nowrap font-sans transition-all duration-150 ${sizeClasses} ${variantClasses} ${disabledClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && iconPosition === 'start' && <span className="shrink-0">{icon}</span>}
      {!iconOnly && <span>{children}</span>}
      {iconOnly && !icon && children}
      {icon && iconPosition === 'end' && !iconOnly && <span className="shrink-0">{icon}</span>}
    </button>
  );
};
