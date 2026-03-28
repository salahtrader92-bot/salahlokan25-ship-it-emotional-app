export const EMOTION_COLORS = {
  Happy: "#FCD34D",
  Calm: "#34D399",
  Stressed: "#C084FC",
  Negative: "#60A5FA",
  Excited: "#F87171",
} as const;

export type EmotionType = keyof typeof EMOTION_COLORS;

export const THEME = {
  background: "#0a0a0a",
  backgroundSecondary: "#111111",
  card: "#1a1a1a",
  cardHover: "#222222",
  text: "#ffffff",
  textSecondary: "#a0a0a0",
  textTertiary: "#6b7280",
  border: "#2a2a2a",
  borderLight: "#333333",
  primary: "#6366f1",
  primaryLight: "#818cf8",
  primaryDark: "#4f46e5",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  overlay: "rgba(0, 0, 0, 0.8)",
  glowPurple: "rgba(139, 92, 246, 0.2)",
  glowBlue: "rgba(59, 130, 246, 0.2)",
};
