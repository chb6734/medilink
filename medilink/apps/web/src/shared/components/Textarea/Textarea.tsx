'use client';

import React, { useState } from 'react';
import {
  colors,
  borderRadius,
  typography,
  spacing,
  transitions,
} from '@/shared/lib/design-tokens';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export function Textarea({
  label,
  error,
  hint,
  required,
  style,
  onFocus,
  onBlur,
  rows = 4,
  ...props
}: TextareaProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    borderRadius: borderRadius.lg,
    border: `2px solid ${error ? colors.error.main : isFocused ? colors.primary.main : colors.neutral[300]}`,
    fontSize: typography.fontSize.xl,
    background: colors.white,
    outline: 'none',
    resize: 'none',
    lineHeight: 1.5,
    transition: transitions.normal,
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
      <textarea
        style={textareaStyle}
        onFocus={handleFocus}
        onBlur={handleBlur}
        rows={rows}
        {...props}
      />
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
