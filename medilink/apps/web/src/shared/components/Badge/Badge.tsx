'use client';

import React from 'react';
import {
  colors,
  borderRadius,
  typography,
  spacing,
} from '@/shared/lib/design-tokens';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    background: colors.neutral[100],
    color: colors.neutral[700],
  },
  primary: {
    background: colors.primary.bg,
    color: colors.primary.main,
  },
  success: {
    background: colors.success.bg,
    color: colors.success.text,
  },
  warning: {
    background: colors.warning.bg,
    color: colors.warning.text,
  },
  error: {
    background: colors.error.bg,
    color: colors.error.text,
  },
  info: {
    background: '#EFF6FF',
    color: '#1D4ED8',
  },
};

const sizeStyles = {
  sm: {
    padding: `${spacing.xs} ${spacing.sm}`,
    fontSize: typography.fontSize.xs,
  },
  md: {
    padding: `${spacing.xs} ${spacing.md}`,
    fontSize: typography.fontSize.sm,
  },
};

export function Badge({
  variant = 'default',
  children,
  size = 'md',
  style,
}: BadgeProps) {
  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: borderRadius.full,
    fontWeight: typography.fontWeight.semibold,
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...style,
  };

  return <span style={badgeStyle}>{children}</span>;
}
