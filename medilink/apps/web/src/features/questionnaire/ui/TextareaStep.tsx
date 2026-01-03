'use client';

import React from 'react';
import { colors, typography, spacing } from '@/shared/lib/design-tokens';

interface TextareaStepProps {
  title: string;
  subtitle?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

export function TextareaStep({
  title,
  subtitle,
  placeholder,
  value,
  onChange,
}: TextareaStepProps) {
  return (
    <>
      <h1
        style={{
          marginBottom: spacing.sm,
          fontSize: typography.fontSize['5xl'],
          fontWeight: typography.fontWeight.extrabold,
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            color: colors.neutral[400],
            fontSize: typography.fontSize.md,
            marginBottom: spacing.md,
          }}
        >
          {subtitle}
        </p>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={6}
        autoFocus
        className="textarea-base"
        style={{ lineHeight: 1.6 }}
      />
    </>
  );
}
