"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const DEFAULTS = { accent: "#e8e8e8", background: "#1f2121", card: "#2a2c2c" };

interface ThemePrefs {
  accent?: string;
  background?: string;
  card?: string;
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length < 6) return 1;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function applyPreview(theme: ThemePrefs): void {
  const root = document.documentElement.style;
  root.setProperty("--primary", theme.accent || DEFAULTS.accent);
  root.setProperty("--primary-foreground", luminance(theme.accent || DEFAULTS.accent) > 0.5 ? "#0a0a0a" : "#f5f5f5");
  root.setProperty("--ring", theme.accent || DEFAULTS.accent);
  root.setProperty("--sidebar-primary", theme.accent || DEFAULTS.accent);
  root.setProperty("--background", theme.background || DEFAULTS.background);
  root.setProperty("--foreground", luminance(theme.background || DEFAULTS.background) > 0.5 ? "#0a0a0a" : "#f5f5f5");
  root.setProperty("--card", theme.card || DEFAULTS.card);
  root.setProperty("--card-foreground", luminance(theme.card || DEFAULTS.card) > 0.5 ? "#0a0a0a" : "#f5f5f5");
}

/**
 * Theme customization section: pick the accent, page background, and card
 * colors for your own view of the site. Changes preview live and persist to
 * your account once saved. Embedded in the Settings page.
 * @returns The rendered section.
 */
export function ThemeSection(): React.JSX.Element {
  const [theme, setTheme] = useState<ThemePrefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      const res = await fetch("/api/me/theme");
      const data = (await res.json()) as ThemePrefs;
      if (!cancelled) {
        setTheme({ ...DEFAULTS, ...data });
        setLoading(false);
      }
    };
    void load();
    return (): void => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loading) applyPreview(theme);
  }, [theme, loading]);

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      const res = await fetch("/api/me/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(theme),
      });
      if (res.ok) {
        toast.success("Theme saved");
      } else {
        toast.error("Couldn't save theme");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = (): void => {
    setTheme(DEFAULTS);
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading theme…</p>;
  }

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">Theme</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Customize the colors of your own view of the site — this only changes how it looks for you.
      </p>

      <div className="flex flex-col gap-3">
        <label className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
          <div>
            <p className="text-sm font-medium">Accent color</p>
            <p className="text-xs text-muted-foreground">Buttons, links, highlights</p>
          </div>
          <input
            type="color"
            value={theme.accent ?? DEFAULTS.accent}
            onChange={(e) => setTheme((t) => ({ ...t, accent: e.target.value }))}
            className="h-9 w-16 cursor-pointer rounded-md border border-input bg-transparent"
          />
        </label>

        <label className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
          <div>
            <p className="text-sm font-medium">Page background</p>
            <p className="text-xs text-muted-foreground">The canvas behind everything</p>
          </div>
          <input
            type="color"
            value={theme.background ?? DEFAULTS.background}
            onChange={(e) => setTheme((t) => ({ ...t, background: e.target.value }))}
            className="h-9 w-16 cursor-pointer rounded-md border border-input bg-transparent"
          />
        </label>

        <label className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
          <div>
            <p className="text-sm font-medium">Card / flashcard color</p>
            <p className="text-xs text-muted-foreground">Cards, panels, and flashcard faces</p>
          </div>
          <input
            type="color"
            value={theme.card ?? DEFAULTS.card}
            onChange={(e) => setTheme((t) => ({ ...t, card: e.target.value }))}
            className="h-9 w-16 cursor-pointer rounded-md border border-input bg-transparent"
          />
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving…" : "Save theme"}
        </Button>
        <Button variant="outline" onClick={handleReset}>
          Reset to default
        </Button>
      </div>
    </div>
  );
}
