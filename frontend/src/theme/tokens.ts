export const fintechTheme = {
  color: {
    background: "#0B0E14",
    panel: "#151D2A",
    panelRaised: "#1A2433",
    border: "#263244",
    text: "#E5E7EB",
    muted: "#94A3B8",
    accent: "#10B981",
    danger: "#EF4444",
    warning: "#F59E0B",
    info: "#38BDF8",
  },
  radius: {
    card: 8,
    control: 6,
  },
  shadow: {
    panel: "0 14px 40px rgba(0, 0, 0, 0.28)",
  },
} as const;

export type FintechTheme = typeof fintechTheme;
