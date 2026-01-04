'use client';

import React from 'react';
import { colors, typography, spacing, borderRadius } from '@/shared/lib/design-tokens';
import type { OcrMedication } from '../lib/usePrescriptionCapture';

interface MedicationListProps {
  medications: OcrMedication[];
}

export function MedicationList({ medications }: MedicationListProps) {
  return (
    <div>
      <h3
        style={{
          fontSize: typography.fontSize.md,
          fontWeight: typography.fontWeight.bold,
          color: colors.neutral[900],
          marginBottom: spacing.md,
        }}
      >
        추출된 약물 정보 ({medications.length}개)
      </h3>
      <div
        style={{
          maxHeight: '300px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.sm,
        }}
      >
        {medications.map((med, index) => (
          <div
            key={index}
            style={{
              padding: spacing.md,
              borderRadius: borderRadius.md,
              background: colors.neutral[50],
              border: `1px solid ${colors.neutral[200]}`,
            }}
          >
            <p
              style={{
                fontSize: typography.fontSize.md,
                fontWeight: typography.fontWeight.bold,
                color: colors.neutral[900],
                marginBottom: spacing.xs,
              }}
            >
              {med.medicationName}
            </p>
            {med.dose && (
              <p
                style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.neutral[500],
                }}
              >
                용량: {med.dose} | 빈도: {med.frequency || '정보 없음'}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
