import { Snapshot } from "../lib/backend";
import { CHECKPOINTS } from "../data/types";
import { formatDistance } from "../lib/geo";
import { decodeAvatar } from "../lib/avatar";
import { PixelAvatar } from "./PixelAvatar";

/** Facilitator view: every walker, their distance, and checkpoint chips. */
export function AdminView({ snapshot }: { snapshot: Snapshot }) {
  const rows = [...snapshot.participants].sort((a, b) => b.distance_m - a.distance_m);
  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="text-[11px] text-forest-300 text-center">🛠️ Facilitator View</h2>

      {rows.map((p) => {
        const progress = snapshot.checkpoints.filter((c) => c.device_id === p.device_id);
        const state = decodeAvatar(p.avatar);
        return (
          <div
            key={p.device_id}
            className="pixel-border bg-forest-900 p-3 text-[8px] flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              {state && (
                <PixelAvatar state={state} scale={1} title={false} background={null} width={22} />
              )}
              <span className="text-[10px] text-sand flex-1">{p.name}</span>
              <span className="text-sand">{formatDistance(p.distance_m)}</span>
            </div>

            <div className="flex flex-wrap gap-1 mt-1">
              {CHECKPOINTS.map((c) => {
                const row = progress.find((x) => x.checkpoint_id === c.id);
                const cls = !row
                  ? "bg-forest-950 text-forest-300"
                  : row.via_manual
                  ? "bg-clay text-forest-950"
                  : "bg-forest-700 text-sand";
                return (
                  <span key={c.id} className={`px-1 py-[2px] text-[7px] ${cls}`}>
                    {c.order}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
      {rows.length === 0 && (
        <p className="text-[9px] text-forest-300 text-center">No walkers yet.</p>
      )}
    </div>
  );
}
