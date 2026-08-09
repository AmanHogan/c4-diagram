"use client";

import { useEffect } from "react";

interface ThemePrefs {
  accent?: string;
  background?: string;
  card?: string;
  sidebar?: string;
}

/** Relative luminance (0-1) of a hex color, used to pick readable foreground text. */
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length < 6) return 1;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Mixes a hex color toward white or black by `amount` (0-1), used to derive
 * the sidebar's hover/border shades from its one base color. */
function shade(hex: string, amount: number, towardWhite: boolean): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return hex;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (c: number): number =>
    Math.round(towardWhite ? c + (255 - c) * amount : c * (1 - amount));
  return `#${[r, g, b].map((c) => mix(c).toString(16).padStart(2, "0")).join("")}`;
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
      if (theme.sidebar) {
        const light = luminance(theme.sidebar) > 0.5;
        root.setProperty("--sidebar", theme.sidebar);
        root.setProperty("--sidebar-foreground", light ? "#0a0a0a" : "#f5f5f5");
        root.setProperty("--sidebar-accent", shade(theme.sidebar, 0.08, !light));
        root.setProperty("--sidebar-accent-foreground", light ? "#0a0a0a" : "#f5f5f5");
        root.setProperty("--sidebar-border", shade(theme.sidebar, 0.15, !light));
      }
    };
    void load();
    return (): void => {
      cancelled = true;
    };
  }, []);

  return null;
}
