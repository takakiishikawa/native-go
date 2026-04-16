/**
 * NativeGo Design System — Color Constants
 *
 * Use these hex values for charts, SVG fills, and inline styles.
 * For Tailwind utility classes use the corresponding tokens:
 *   Grammar  → blue-*   (bg-blue-50, text-blue-600, …)
 *   Phrase   → teal-*   (bg-teal-50, text-teal-600, …)
 *   Speaking → amber-*  (bg-amber-50, text-amber-600, …)
 *   Success  → green-*  (semantic: completion / positive change)
 */
export const COLORS = {
  grammar: {
    main:  "#2563EB", // blue-600
    light: "#3B82F6", // blue-500
  },
  phrase: {
    main:  "#0D9488", // teal-600
    light: "#14B8A6", // teal-500
  },
  speaking: {
    main:  "#D97706", // amber-600
    light: "#F59E0B", // amber-500
  },
  shadowing: {
    main:  "#7C3AED", // violet-600
    light: "#8B5CF6", // violet-500
  },
  success: "#16A34A", // green-600 — semantic: completion, positive change
  error:   "#EF4444", // red-500
} as const
