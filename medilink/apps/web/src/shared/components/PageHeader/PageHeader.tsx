'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import {
  colors,
  borderRadius,
  typography,
  spacing,
  gradients,
} from '@/shared/lib/design-tokens';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  variant?: 'default' | 'gradient';
}

export function PageHeader({
  title,
  subtitle,
  onBack,
  rightElement,
  variant = 'gradient',
}: PageHeaderProps) {
  const isGradient = variant === 'gradient';

  const containerStyle: React.CSSProperties = {
    background: isGradient ? gradients.card : colors.white,
    padding: '48px 24px 32px',
    borderBottomLeftRadius: borderRadius['3xl'],
    borderBottomRightRadius: borderRadius['3xl'],
    color: isGradient ? colors.white : 'var(--color-text-primary)',
  };

  const backButtonStyle: React.CSSProperties = {
    background: isGradient ? 'rgba(255, 255, 255, 0.2)' : colors.neutral[100],
    border: 'none',
    width: '40px',
    height: '40px',
    borderRadius: borderRadius.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: isGradient ? colors.white : colors.neutral[700],
  };

  return (
    <div style={containerStyle}>
      {/* Top Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing['2xl'],
        }}
      >
        {onBack ? (
          <button style={backButtonStyle} onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <div style={{ width: '40px' }} />
        )}
        {rightElement || <div style={{ width: '40px' }} />}
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: typography.fontSize['5xl'],
          fontWeight: typography.fontWeight.extrabold,
          marginBottom: subtitle ? spacing.sm : 0,
        }}
      >
        {title}
      </h1>

      {/* Subtitle */}
      {subtitle && (
        <p
          style={{
            fontSize: typography.fontSize['2xl'],
            opacity: 0.9,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
