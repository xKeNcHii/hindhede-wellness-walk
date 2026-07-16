import { useEffect, useState } from "react";
import { fetchSnapshot, subscribe, applyChange, Snapshot } from "../lib/backend";

const EMPTY: Snapshot = { participants: [], checkpoints: [] };

/**
 * Live snapshot of all walkers/checkpoints (realtime or local).
 *
 * Fetches the full dataset once on mount, then applies each realtime change
 * incrementally from the change payload itself — it never re-fetches the whole
 * table per update. That keeps bandwidth flat as the number of walkers grows
 * (the old refetch-on-every-change pattern was O(N²) and blew the free tier).
 */
export function useSnapshot(): Snapshot {
  const [snap, setSnap] = useState<Snapshot>(EMPTY);

  useEffect(() => {
    let alive = true;
    const loadFull = async () => {
      const s = await fetchSnapshot();
      if (alive) setSnap(s);
    };
    void loadFull();
    const unsub = subscribe((change) => {
      if (!alive) return;
      // Local-only fallback re-reads from localStorage (no bandwidth cost).
      if (change.kind === "reload") {
        void loadFull();
        return;
      }
      setSnap((prev) => applyChange(prev, change));
    });
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  return snap;
}
