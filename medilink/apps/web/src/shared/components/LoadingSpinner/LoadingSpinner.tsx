'use client';

import React from 'react';
import {
  colors,
  typography,
  spacing,
} from '@/shared/lib/design-tokens';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  text?: string;
  color?: string;
}

const sizeMap = {
  sm: { width: '24px', height: '24px', border: '2px' },
  md: { width: '32px', height: '32px', border: '3px' },
  lg: { width: '48px', height: '48px', border: '4px' },
};

export function LoadingSpinner({
  size = 'md',
  fullScreen = false,
  text,
  color = colors.primary.main,
}: LoadingSpinnerProps) {
  const { width, height, border } = sizeMap[size];

  const spinnerStyle: React.CSSProperties = {
    width,
    height,
    border: `${border} solid ${colors.neutral[200]}`,
    borderTopColor: color,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  };

  const containerStyle: React.CSSProperties = fullScreen
    ? {
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.9)',
        zIndex: 9999,
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing['4xl'],
      };

  return (
    <div style={containerStyle}>
      <div className="animate-spin" style={spinnerStyle} />
      {text && (
        <p
          style={{
            marginTop: spacing.lg,
            fontSize: typography.fontSize.base,
            color: colors.neutral[500],
          }}
        >
          {text}
        </p>
      )}
    </div>
  );
}
