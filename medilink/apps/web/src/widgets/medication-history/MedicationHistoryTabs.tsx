'use client';

import React from 'react';
import { colors, typography, spacing, borderRadius, gradients } from '@/shared/lib/design-tokens';

export type TabType = 'active' | 'completed';

interface MedicationHistoryTabsProps {
  selectedTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function MedicationHistoryTabs({
  selectedTab,
  onTabChange,
}: MedicationHistoryTabsProps) {
  const getTabStyle = (tab: TabType): React.CSSProperties => ({
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    border: 'none',
    background: selectedTab === tab ? gradients.primary : 'transparent',
    color: selectedTab === tab ? colors.white : colors.neutral[500],
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.md,
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  return (
    <div
      style={{
        display: 'flex',
        gap: spacing.sm,
        marginBottom: spacing['2xl'],
        background: colors.white,
        borderRadius: borderRadius.xl,
        padding: '6px',
        border: `2px solid ${colors.neutral[200]}`,
      }}
    >
      <button
        onClick={() => onTabChange('active')}
        style={getTabStyle('active')}
      >
        진행 중
      </button>
      <button
        onClick={() => onTabChange('completed')}
        style={getTabStyle('completed')}
      >
        완료됨
      </button>
    </div>
  );
}
