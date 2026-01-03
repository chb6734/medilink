'use client';

import React from 'react';
import {
  colors,
  borderRadius,
  shadows,
  gradients,
  spacing,
} from '@/shared/lib/design-tokens';

export type CardVariant = 'default' | 'gradient' | 'light' | 'outline';

export interface CardProps {
  variant?: CardVariant;
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
  onClick?: () => void;
}

const variantStyles: Record<CardVariant, React.CSSProperties> = {
  default: {
    background: colors.white,
    boxShadow: shadows.card,
  },
  gradient: {
    background: gradients.card,
    color: colors.white,
  },
  light: {
    background: colors.neutral[50],
    border: `1px solid ${colors.neutral[200]}`,
  },
  outline: {
    background: colors.white,
    border: `1px solid ${colors.neutral[200]}`,
  },
};

const paddingStyles = {
  none: '0',
  sm: spacing.lg,
  md: spacing['2xl'],
  lg: spacing['3xl'],
};

export function Card({
  variant = 'default',
  children,
  padding = 'md',
  style,
  onClick,
}: CardProps) {
  const cardStyle: React.CSSProperties = {
    borderRadius: borderRadius.xl,
    padding: paddingStyles[padding],
    cursor: onClick ? 'pointer' : 'default',
    ...variantStyles[variant],
    ...style,
  };

  return (
    <div style={cardStyle} onClick={onClick}>
      {children}
    </div>
  );
}
