import React from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  hint?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (val: T) => void;
  size?: 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
  ariaLabel = 'View mode selector',
}: SegmentedControlProps<T>) {
  const sizeClasses = {
    sm: 'p-0.5 text-xs rounded-lg',
    md: 'p-1 text-xs sm:text-sm rounded-xl',
  }[size];

  const itemSizeClasses = {
    sm: 'px-2.5 py-1 gap-1.5',
    md: 'px-3.5 py-1.5 gap-2',
  }[size];

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`inline-flex items-center bg-[#07090F] border border-white/10 ${sizeClasses} ${className}`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 whitespace-nowrap cursor-pointer select-none ${itemSizeClasses} ${
              isSelected
                ? 'bg-gradient-to-r from-[#FFB900] to-[#FB9600] text-slate-950 font-semibold shadow-[0_0_12px_rgba(255,185,0,0.3)]'
                : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/5'
            }`}
            title={opt.hint}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
