'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  colors,
  borderRadius,
  typography,
  spacing,
  transitions,
} from '@/shared/lib/design-tokens';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: {
    padding: '10px 12px',
    fontSize: typography.fontSize.base,
  },
  md: {
    padding: '14px',
    fontSize: typography.fontSize.lg,
  },
  lg: {
    padding: '16px',
    fontSize: typography.fontSize.xl,
  },
};

export function Select({
  label,
  options,
  placeholder,
  error,
  hint,
  required,
  size = 'md',
  style,
  onFocus,
  onBlur,
  ...props
}: SelectProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: borderRadius.md,
    border: `2px solid ${error ? colors.error.main : isFocused ? colors.primary.main : colors.neutral[300]}`,
    background: colors.white,
    outline: 'none',
    transition: transitions.normal,
    appearance: 'none',
    paddingRight: '40px',
    cursor: 'pointer',
    ...sizeStyles[size],
    ...style,
  };

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: typography.fontSize.md,
            fontWeight: typography.fontWeight.bold,
            color: 'var(--color-text-primary)',
            marginBottom: spacing.sm,
          }}
        >
          {label}
          {required && <span style={{ color: colors.error.main, marginLeft: '4px' }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <select
          style={selectStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div
          style={{
            position: 'absolute',
            right: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: colors.neutral[400],
            pointerEvents: 'none',
          }}
        >
          <ChevronDown className="w-5 h-5" />
        </div>
      </div>
      {error && (
        <p
          style={{
            marginTop: spacing.xs,
            fontSize: typography.fontSize.sm,
            color: colors.error.main,
          }}
        >
          {error}
        </p>
      )}
      {hint && !error && (
        <p
          style={{
            marginTop: spacing.xs,
            fontSize: typography.fontSize.sm,
            color: colors.neutral[500],
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
