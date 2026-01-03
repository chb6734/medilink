'use client';

import React, { useState } from 'react';
import {
  colors,
  borderRadius,
  typography,
  spacing,
  transitions,
} from '@/shared/lib/design-tokens';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
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

export function Input({
  label,
  error,
  hint,
  required,
  leftIcon,
  size = 'md',
  style,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: borderRadius.md,
    border: `2px solid ${error ? colors.error.main : isFocused ? colors.primary.main : colors.neutral[300]}`,
    background: colors.white,
    outline: 'none',
    transition: transitions.normal,
    ...sizeStyles[size],
    ...(leftIcon ? { paddingLeft: '44px' } : {}),
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
        {leftIcon && (
          <div
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.neutral[400],
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {leftIcon}
          </div>
        )}
        <input
          style={inputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
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
