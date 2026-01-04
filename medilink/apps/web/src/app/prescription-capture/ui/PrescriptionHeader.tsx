'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { colors, typography, spacing, borderRadius } from '@/shared/lib/design-tokens';

export function PrescriptionHeader() {
  const router = useRouter();

  return (
    <div
      style={{
        background: 'var(--gradient-card)',
        padding: '48px 24px 32px',
        borderBottomLeftRadius: borderRadius['3xl'],
        borderBottomRightRadius: borderRadius['3xl'],
        color: colors.white,
      }}
    >
      <button
        onClick={() => router.back()}
        className="btn-glass"
        style={{ marginBottom: spacing.lg }}
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <h1
        style={{
          fontSize: typography.fontSize['4xl'],
          fontWeight: typography.fontWeight.extrabold,
          marginBottom: spacing.sm,
          color: colors.white,
        }}
      >
        약봉지/처방전 촬영
      </h1>
      <p style={{ opacity: 0.9, fontSize: typography.fontSize.md }}>
        약봉지 또는 처방전을 촬영하여 처방 정보를 불러옵니다
      </p>
    </div>
  );
}
