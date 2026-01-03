'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { colors, typography, spacing } from '@/shared/lib/design-tokens';

interface QuestionnaireProgressProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
}

export function QuestionnaireProgress({
  currentStep,
  totalSteps,
  onBack,
}: QuestionnaireProgressProps) {
  return (
    <div
      style={{
        padding: '16px 20px 12px',
        background: 'transparent',
      }}
    >
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          padding: spacing.sm,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          color: 'var(--color-text-primary)',
        }}
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Progress Steps */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginTop: '10px',
        }}
      >
        {Array.from({ length: totalSteps }).map((_, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;
          return (
            <div
              key={idx}
              style={{
                flex: 1,
                height: '6px',
                borderRadius: '999px',
                background: isCompleted
                  ? 'linear-gradient(90deg, #10B981 0%, #34D399 100%)'
                  : isCurrent
                    ? 'linear-gradient(90deg, var(--color-accent) 0%, #3B82F6 100%)'
                    : colors.neutral[200],
                transition: 'all 0.3s ease',
                boxShadow: isCompleted
                  ? '0 0 8px rgba(16, 185, 129, 0.4)'
                  : isCurrent
                    ? '0 0 8px rgba(59, 130, 246, 0.3)'
                    : 'none',
              }}
            />
          );
        })}
      </div>

      <div style={{ marginTop: spacing.md, marginBottom: '6px' }}>
        <p
          style={{
            color: colors.neutral[500],
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.semibold,
          }}
        >
          질문 {currentStep + 1} / {totalSteps}
        </p>
      </div>
    </div>
  );
}
