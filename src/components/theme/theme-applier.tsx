"use client";

import { useEffect } from "react";

interface ThemePrefs {
  accent?: string;
  background?: string;
  card?: string;
}

/** Relative luminance (0-1) of a hex color, used to pick readable foreground text. */
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length < 6) return 1;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Applies the signed-in user's saved theme color overrides (accent /
 * background / card) as CSS variable overrides on the document root.
 * Foreground text color is auto-picked per override so custom backgrounds
 * stay readable. Renders nothing; fetches on mount.
 * @returns Null — this component has no visual output.
 */
export function ThemeApplier(): null {
  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      const res = await fetch("/api/me/theme");
      const theme = (await res.json()) as ThemePrefs;
      if (cancelled) return;
      const root = document.documentElement.style;
      if (theme.accent) {
        root.setProperty("--primary", theme.accent);
        root.setProperty("--primary-foreground", luminance(theme.accent) > 0.5 ? "#0a0a0a" : "#f5f5f5");
        root.setProperty("--ring", theme.accent);
        root.setProperty("--sidebar-primary", theme.accent);
      }
      if (theme.background) {
        root.setProperty("--background", theme.background);
        root.setProperty("--foreground", luminance(theme.background) > 0.5 ? "#0a0a0a" : "#f5f5f5");
      }
      if (theme.card) {
        root.setProperty("--card", theme.card);
        root.setProperty("--card-foreground", luminance(theme.card) > 0.5 ? "#0a0a0a" : "#f5f5f5");
      }
    };
    void load();
    return (): void => {
      cancelled = true;
    };
  }, []);

  return null;
}
