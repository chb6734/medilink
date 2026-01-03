'use client';

import React from 'react';
import { Check } from 'lucide-react';
import {
  colors,
  borderRadius,
  typography,
  spacing,
  shadows,
  gradients,
  transitions,
} from '@/shared/lib/design-tokens';

export type OptionColorScheme = 'blue' | 'green' | 'amber' | 'purple';

export interface OptionButtonProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  colorScheme?: OptionColorScheme;
  showCheckmark?: boolean;
  description?: string;
  disabled?: boolean;
}

const colorSchemeStyles: Record<OptionColorScheme, { selected: React.CSSProperties; icon: React.CSSProperties }> = {
  blue: {
    selected: {
      background: gradients.selectedOption,
      border: '2px solid #2563EB',
      boxShadow: shadows.selected,
    },
    icon: {
      background: colors.primary.bg,
      color: colors.primary.main,
    },
  },
  green: {
    selected: {
      background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
      border: '2px solid #10B981',
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
    },
    icon: {
      background: colors.success.bg,
      color: colors.success.main,
    },
  },
  amber: {
    selected: {
      background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
      border: '2px solid #F59E0B',
      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)',
    },
    icon: {
      background: colors.warning.bg,
      color: colors.warning.main,
    },
  },
  purple: {
    selected: {
      background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
      border: '2px solid #8B5CF6',
      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.15)',
    },
    icon: {
      background: colors.purple.bg,
      color: colors.purple.main,
    },
  },
};

export function OptionButton({
  selected,
  onClick,
  children,
  icon,
  colorScheme = 'blue',
  showCheckmark = true,
  description,
  disabled = false,
}: OptionButtonProps) {
  const schemeStyle = colorSchemeStyles[colorScheme];

  const baseStyle: React.CSSProperties = {
    width: '100%',
    textAlign: 'left',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: spacing.lg,
    transition: transitions.normal,
    opacity: disabled ? 0.5 : 1,
    ...(selected
      ? schemeStyle.selected
      : {
          background: colors.white,
          border: `1px solid ${colors.neutral[200]}`,
        }),
  };

  const iconContainerStyle: React.CSSProperties = {
    width: '48px',
    height: '48px',
    borderRadius: borderRadius.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...(selected ? schemeStyle.icon : { background: colors.neutral[100], color: colors.neutral[500] }),
  };

  return (
    <button style={baseStyle} onClick={onClick} disabled={disabled}>
      {icon && <div style={iconContainerStyle}>{icon}</div>}
      <div style={{ flex: 1 }}>
        <span
          style={{
            fontSize: typography.fontSize.lg,
            fontWeight: selected ? typography.fontWeight.bold : typography.fontWeight.medium,
            color: selected ? colors.neutral[900] : colors.neutral[700],
          }}
        >
          {children}
        </span>
        {description && (
          <p
            style={{
              marginTop: spacing.xs,
              fontSize: typography.fontSize.sm,
              color: colors.neutral[500],
            }}
          >
            {description}
          </p>
        )}
      </div>
      {showCheckmark && selected && (
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: borderRadius.full,
            background: colors.primary.main,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.white,
            flexShrink: 0,
          }}
        >
          <Check className="w-4 h-4" />
        </div>
      )}
    </button>
  );
}
