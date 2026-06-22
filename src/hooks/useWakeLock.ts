import { useEffect } from "react";

/**
 * Keep the screen awake while the walk is active so the OS doesn't sleep the
 * tab and pause GPS (which would stall distance tracking). The Screen Wake Lock
 * API is best-effort: it's unsupported on some browsers and is auto-released
 * whenever the tab is hidden, so we re-acquire it on visibility changes.
 */
type WakeLockSentinelLike = { release: () => Promise<void> } | null;

interface WakeLockNavigator {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
}

export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const wl = (navigator as Navigator & WakeLockNavigator).wakeLock;
    if (!wl) return; // unsupported — nothing to do

    let sentinel: WakeLockSentinelLike = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        sentinel = await wl.request("screen");
      } catch {
        /* user gesture / permission / power-save can reject; ignore */
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !cancelled) void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release().catch(() => {});
    };
  }, [enabled]);
}
