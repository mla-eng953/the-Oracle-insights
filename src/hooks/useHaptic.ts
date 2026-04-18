type HapticKind = "light" | "medium" | "heavy" | "success" | "warning" | "error";

const pattern: Record<HapticKind, number | number[]> = {
  light: 8,
  medium: 14,
  heavy: 22,
  success: [10, 30, 10],
  warning: [18, 40, 18],
  error: [24, 40, 24, 40, 24],
};

export function useHaptic() {
  return (kind: HapticKind = "light") => {
    if (typeof navigator === "undefined" || !navigator.vibrate) return;
    try { navigator.vibrate(pattern[kind]); } catch { /* noop */ }
  };
}
