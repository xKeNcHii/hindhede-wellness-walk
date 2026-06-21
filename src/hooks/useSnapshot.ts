import { useEffect, useState } from "react";
import { fetchSnapshot, subscribe, Snapshot } from "../lib/backend";

const EMPTY: Snapshot = { teams: [], participants: [], checkpoints: [] };

/** Live snapshot of all teams/participants/checkpoints (realtime or local). */
export function useSnapshot(): Snapshot {
  const [snap, setSnap] = useState<Snapshot>(EMPTY);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const s = await fetchSnapshot();
      if (alive) setSnap(s);
    };
    void refresh();
    const unsub = subscribe(() => void refresh());
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  return snap;
}
