'use client';

import React from 'react';
import {
  colors,
  borderRadius,
  typography,
  spacing,
} from '@/shared/lib/design-tokens';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing['4xl'],
        textAlign: 'center',
      }}
    >
      {icon && (
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: borderRadius.full,
            background: colors.neutral[100],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.lg,
            color: colors.neutral[400],
          }}
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          fontSize: typography.fontSize['2xl'],
          fontWeight: typography.fontWeight.bold,
          color: colors.neutral[700],
          marginBottom: description ? spacing.sm : 0,
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: colors.neutral[500],
            maxWidth: '280px',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: spacing['2xl'] }}>{action}</div>}
    </div>
  );
}
