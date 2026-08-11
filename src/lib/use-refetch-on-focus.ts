import { useEffect } from "react";

/**
 * Runs `load` on mount, then again whenever the tab regains focus or
 * becomes visible — not just once. Client-fetched data (dashboard/search
 * results, etc.) otherwise goes stale the moment something changes on
 * another tab or another page: the component already mounted, so its
 * mount-only `useEffect` never runs again, and the user has to hard-reload
 * to see e.g. a diagram they just flipped to public.
 * @param load Async loader to (re-)run. Must be wrapped in `useCallback` by
 * the caller (with whatever deps it actually reads, e.g. a search query) —
 * this hook re-subscribes whenever the `load` reference changes, so an
 * unmemoized inline function here would refetch on every render.
 */
export function useRefetchOnFocus(load: () => void): void {
  useEffect(() => {
    load();

    const onFocus = (): void => load();
    const onVisibilityChange = (): void => {
      if (document.visibilityState === "visible") load();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return (): void => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [load]);
}
