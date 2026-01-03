'use client';

import React from 'react';
import {
  colors,
  borderRadius,
  typography,
  shadows,
  gradients,
  transitions,
} from '@/shared/lib/design-tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'glass' | 'success' | 'warning' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: gradients.primary,
    color: colors.white,
    border: 'none',
    boxShadow: shadows.button,
  },
  secondary: {
    background: colors.white,
    color: colors.primary.main,
    border: `2px solid ${colors.primary.main}`,
  },
  ghost: {
    background: 'transparent',
    color: colors.neutral[600],
    border: 'none',
  },
  glass: {
    background: 'rgba(255, 255, 255, 0.2)',
    color: colors.white,
    border: '1px solid rgba(255, 255, 255, 0.3)',
    backdropFilter: 'blur(10px)',
  },
  success: {
    background: gradients.success,
    color: colors.white,
    border: 'none',
  },
  warning: {
    background: gradients.warning,
    color: colors.white,
    border: 'none',
  },
  danger: {
    background: colors.error.main,
    color: colors.white,
    border: 'none',
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    padding: '8px 16px',
    fontSize: typography.fontSize.base,
    borderRadius: borderRadius.sm,
  },
  md: {
    padding: '12px 20px',
    fontSize: typography.fontSize.lg,
    borderRadius: borderRadius.md,
  },
  lg: {
    padding: '16px 24px',
    fontSize: typography.fontSize.xl,
    borderRadius: borderRadius.xl,
  },
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: typography.fontWeight.bold,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: transitions.normal,
    opacity: disabled || loading ? 0.6 : 1,
    width: fullWidth ? '100%' : 'auto',
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...style,
  };

  return (
    <button
      style={baseStyle}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span
          className="animate-spin"
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
          }}
        />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
