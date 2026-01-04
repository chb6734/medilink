// Time constants
export const DAYS_IN_WEEK = 7;
export const DAYS_IN_TWO_WEEKS = 14;

// Symptom level thresholds
export const SYMPTOM_LEVEL_GOOD_MAX = 2;
export const SYMPTOM_LEVEL_MODERATE_MAX = 3;
export const SYMPTOM_LEVEL_MAX = 5;

// UI sizing
export const SYMPTOM_INDICATOR_WIDTH_MULTIPLIER = 8;

// Colors
export const COLORS = {
  // Status colors
  success: "#10B981",
  successDark: "#059669",
  warning: "#F59E0B",
  warningDark: "#D97706",
  danger: "#EF4444",
  dangerDark: "#DC2626",

  // Neutral colors
  white: "#FFFFFF",
  background: "#F8FAFC",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",

  // Text colors
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#64748B",
  textLight: "#94A3B8",

  // Primary brand
  primary: "#285BAA",
  primaryDark: "#1e4680",

  // Category colors
  blood: "rgba(239, 68, 68, 0.3)",
  height: "rgba(59, 130, 246, 0.3)",
  weight: "rgba(16, 185, 129, 0.3)",
  age: "rgba(168, 85, 247, 0.3)",
  calendar: "rgba(245, 158, 11, 0.3)",
} as const;

// Gradients
export const GRADIENTS = {
  primary: "linear-gradient(135deg, #285BAA 0%, #1e4680 100%)",
  success: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
  warning: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
  danger: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
  aiAnalysis: "linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)",
  patientNotes: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
  cardHighlight: "linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)",
  avatar: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.2) 100%)",
} as const;

// Status backgrounds
export const STATUS_BACKGROUNDS = {
  success: "#F0FDF4",
  successBorder: "#BBF7D0",
  warning: "#FFFBEB",
  warningBorder: "#FDE68A",
  danger: "#FEF2F2",
  dangerBorder: "#FECACA",
  sideEffect: "#FEF3C7",
  chiefComplaint: "#FEF2F2",
} as const;
