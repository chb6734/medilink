/**
 * Design Tokens
 * 모든 스타일 상수를 중앙에서 관리
 */

// =============================================================================
// Colors
// =============================================================================

export const colors = {
  primary: {
    main: '#285BAA',
    dark: '#1e4680',
    light: '#4a7bbf',
    bg: '#e8f0fa',
    lighter: '#f5f9fd',
  },
  success: {
    main: '#10B981',
    light: '#34D399',
    bg: '#ECFDF5',
    bgLight: '#D1FAE5',
    text: '#065F46',
  },
  warning: {
    main: '#F59E0B',
    light: '#FBBF24',
    bg: '#FEF3C7',
    text: '#92400E',
  },
  error: {
    main: '#EF4444',
    bg: '#FEE2E2',
    text: '#991B1B',
  },
  purple: {
    main: '#8B5CF6',
    light: '#A78BFA',
    bg: '#F3E8FF',
    text: '#6B21A8',
  },
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  white: '#FFFFFF',
  black: '#000000',
} as const;

// =============================================================================
// Spacing
// =============================================================================

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '48px',
  '5xl': '64px',
} as const;

// =============================================================================
// Border Radius
// =============================================================================

export const borderRadius = {
  sm: '8px',
  md: '12px',
  lg: '14px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '32px',
  full: '999px',
} as const;

// =============================================================================
// Typography
// =============================================================================

export const typography = {
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.8125rem',    // 13px
    base: '0.875rem',   // 14px
    md: '0.9375rem',    // 15px
    lg: '1rem',         // 16px
    xl: '1.0625rem',    // 17px
    '2xl': '1.125rem',  // 18px
    '3xl': '1.375rem',  // 22px
    '4xl': '1.5rem',    // 24px
    '5xl': '1.75rem',   // 28px
    '6xl': '2rem',      // 32px
    '7xl': '2.5rem',    // 40px
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// =============================================================================
// Shadows
// =============================================================================

export const shadows = {
  sm: '0 2px 8px rgba(40, 91, 170, 0.06)',
  md: '0 4px 12px rgba(40, 91, 170, 0.15)',
  lg: '0 8px 24px rgba(40, 91, 170, 0.2)',
  button: '0 4px 12px rgba(40, 91, 170, 0.3)',
  card: '0 2px 12px rgba(0, 0, 0, 0.08)',
  selected: '0 4px 12px rgba(37, 99, 235, 0.15)',
} as const;

// =============================================================================
// Gradients
// =============================================================================

export const gradients = {
  primary: 'linear-gradient(135deg, #285BAA 0%, #3B82F6 100%)',
  card: 'linear-gradient(135deg, #1e4680 0%, #285BAA 100%)',
  success: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
  warning: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
  purple: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
  selectedOption: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
  glass: 'rgba(255, 255, 255, 0.2)',
} as const;

// =============================================================================
// Transitions
// =============================================================================

export const transitions = {
  fast: '0.15s ease',
  normal: '0.2s ease',
  slow: '0.3s ease',
} as const;

// =============================================================================
// Z-Index
// =============================================================================

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  modal: 300,
  toast: 400,
  tooltip: 500,
} as const;

// =============================================================================
// Common Style Patterns
// =============================================================================

export const commonStyles = {
  // 페이지 헤더 (그라데이션 배경)
  pageHeader: {
    background: 'var(--gradient-card)',
    padding: '48px 24px 32px',
    borderBottomLeftRadius: borderRadius['3xl'],
    borderBottomRightRadius: borderRadius['3xl'],
    color: colors.white,
  },

  // 카드 기본
  card: {
    background: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing['2xl'],
    boxShadow: shadows.card,
  },

  // 입력 필드 기본
  input: {
    width: '100%',
    padding: '14px',
    borderRadius: borderRadius.md,
    border: `2px solid ${colors.neutral[300]}`,
    fontSize: typography.fontSize.lg,
    background: colors.white,
    outline: 'none',
    transition: transitions.normal,
  },

  // 라벨
  label: {
    display: 'block',
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-text-primary)',
    marginBottom: spacing.sm,
  },

  // 라벨 (아이콘 포함)
  labelWithIcon: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-text-secondary)',
    marginBottom: spacing.sm,
  },

  // 유리 효과 버튼
  glassButton: {
    background: 'rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    backdropFilter: 'blur(10px)',
    color: colors.white,
    cursor: 'pointer',
    transition: transitions.normal,
  },

  // 선택된 옵션 버튼
  selectedOption: {
    background: gradients.selectedOption,
    border: '2px solid #2563EB',
    boxShadow: shadows.selected,
  },

  // 기본 옵션 버튼
  defaultOption: {
    background: colors.white,
    border: `1px solid ${colors.neutral[200]}`,
  },

  // 로딩 컨테이너
  loadingContainer: {
    padding: '48px 24px',
    textAlign: 'center' as const,
  },

  // 빈 상태 컨테이너
  emptyContainer: {
    padding: '48px 24px',
    textAlign: 'center' as const,
    color: colors.neutral[500],
  },

  // CTA 버튼 (하단 고정)
  bottomCTA: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing['2xl'],
    background: 'linear-gradient(to top, white 80%, transparent)',
    zIndex: zIndex.sticky,
  },
} as const;

// =============================================================================
// Button Variants
// =============================================================================

export const buttonVariants = {
  primary: {
    background: gradients.primary,
    color: colors.white,
    border: 'none',
    boxShadow: shadows.button,
  },
  secondary: {
    background: colors.white,
    color: colors.primary.main,
    border: `2px solid ${colors.primary.main}`,
  },
  ghost: {
    background: 'transparent',
    color: colors.neutral[600],
    border: 'none',
  },
  success: {
    background: gradients.success,
    color: colors.white,
    border: 'none',
  },
  warning: {
    background: gradients.warning,
    color: colors.white,
    border: 'none',
  },
  danger: {
    background: colors.error.main,
    color: colors.white,
    border: 'none',
  },
} as const;

export const buttonSizes = {
  sm: {
    padding: '8px 16px',
    fontSize: typography.fontSize.base,
    borderRadius: borderRadius.sm,
  },
  md: {
    padding: '12px 20px',
    fontSize: typography.fontSize.lg,
    borderRadius: borderRadius.md,
  },
  lg: {
    padding: '16px 24px',
    fontSize: typography.fontSize.xl,
    borderRadius: borderRadius.xl,
  },
} as const;

// =============================================================================
// Badge Variants
// =============================================================================

export const badgeVariants = {
  default: {
    background: colors.neutral[100],
    color: colors.neutral[700],
  },
  primary: {
    background: colors.primary.bg,
    color: colors.primary.main,
  },
  success: {
    background: colors.success.bg,
    color: colors.success.text,
  },
  warning: {
    background: colors.warning.bg,
    color: colors.warning.text,
  },
  error: {
    background: colors.error.bg,
    color: colors.error.text,
  },
} as const;
