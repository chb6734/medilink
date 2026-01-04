'use client';

import React from 'react';
import { ArrowLeft, Pill } from 'lucide-react';
import { colors, typography, spacing, borderRadius, gradients } from '@/shared/lib/design-tokens';

interface MedicationHistoryHeaderProps {
  onBack: () => void;
  activeCount: number;
  completedCount: number;
}

export function MedicationHistoryHeader({
  onBack,
  activeCount,
  completedCount,
}: MedicationHistoryHeaderProps) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #285BAA 0%, #1e4680 100%)',
        padding: '48px 24px 32px',
        color: colors.white,
        borderBottomLeftRadius: borderRadius['3xl'],
        borderBottomRightRadius: borderRadius['3xl'],
      }}
    >
      <button
        onClick={onBack}
        className="btn-glass"
        style={{ marginBottom: spacing.lg }}
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm }}>
        <Pill className="w-8 h-8" style={{ color: colors.white }} />
        <h1 style={{ fontSize: typography.fontSize['5xl'], fontWeight: typography.fontWeight.extrabold, color: colors.white, margin: 0 }}>
          복약 기록
        </h1>
      </div>
      <p style={{ opacity: 0.9, fontSize: typography.fontSize.md }}>
        처방 정보를 관리하고 복약 상태를 확인하세요
      </p>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: spacing.md,
          marginTop: spacing['2xl'],
        }}
      >
        <div className="stat-card">
          <p style={{ fontSize: typography.fontSize.xs, opacity: 0.9, marginBottom: spacing.xs }}>진행 중</p>
          <p style={{ fontSize: typography.fontSize['5xl'], fontWeight: typography.fontWeight.extrabold }}>{activeCount}건</p>
        </div>
        <div className="stat-card">
          <p style={{ fontSize: typography.fontSize.xs, opacity: 0.9, marginBottom: spacing.xs }}>완료됨</p>
          <p style={{ fontSize: typography.fontSize['5xl'], fontWeight: typography.fontWeight.extrabold }}>{completedCount}건</p>
        </div>
      </div>
    </div>
  );
}
