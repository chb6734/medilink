'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { colors, typography, spacing, borderRadius, shadows, gradients } from '@/shared/lib/design-tokens';

interface SelectStepProps {
  title: string;
  subtitle?: string;
  options: string[];
  selectedValue: string;
  onChange: (value: string) => void;
}

export function SelectStep({
  title,
  subtitle,
  options,
  selectedValue,
  onChange,
}: SelectStepProps) {
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
            color: colors.neutral[500],
            marginBottom: spacing.lg,
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        {options.map((option) => {
          const selected = selectedValue === option;
          return (
            <button
              key={option}
              onClick={() => onChange(option)}
              className={`option-btn ${selected ? 'option-btn--selected' : ''}`}
              style={{ minHeight: '56px' }}
            >
              <span
                style={{
                  fontWeight: selected ? typography.fontWeight.extrabold : typography.fontWeight.semibold,
                  color: selected ? '#1E40AF' : 'inherit',
                  fontSize: typography.fontSize.xl,
                }}
              >
                {option}
              </span>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: borderRadius.full,
                  border: selected ? 'none' : `2px solid ${colors.neutral[300]}`,
                  background: selected ? gradients.primary : colors.white,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
              >
                {selected && (
                  <Check
                    className="w-4 h-4"
                    style={{ color: colors.white, strokeWidth: 3 }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
