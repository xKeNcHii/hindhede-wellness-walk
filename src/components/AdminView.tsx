import { Snapshot } from "../lib/backend";
import { CHECKPOINTS } from "../data/types";
import { formatDistance } from "../lib/geo";

export function AdminView({ snapshot }: { snapshot: Snapshot }) {
  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="text-[11px] text-forest-300 text-center">🛠️ Facilitator View</h2>

      {snapshot.teams.map((t) => {
        const members = snapshot.participants.filter((p) => p.team_id === t.id);
        const progress = snapshot.checkpoints.filter((c) => c.team_id === t.id);
        return (
          <div key={t.id} className="pixel-border bg-forest-900 p-3 text-[8px] flex flex-col gap-2">
            <div className="flex justify-between text-[10px] text-sand">
              <span>{t.name}</span>
              <span className="text-forest-300">{t.join_code}</span>
            </div>

            <div className="flex flex-col gap-1">
              {members.map((m) => (
                <div key={m.device_id} className="flex justify-between text-sand">
                  <span>{m.name}</span>
                  <span>{formatDistance(m.distance_m)}</span>
                </div>
              ))}
              {members.length === 0 && (
                <span className="text-forest-300">no walkers joined</span>
              )}
            </div>

            <div className="flex flex-wrap gap-1 mt-1">
              {CHECKPOINTS.map((c) => {
                const row = progress.find((p) => p.checkpoint_id === c.id);
                const cls = !row
                  ? "bg-forest-950 text-forest-300"
                  : row.via_manual
                  ? "bg-clay text-forest-950"
                  : "bg-forest-700 text-sand";
                return (
                  <span
                    key={c.id}
                    className={`px-1 py-0.5 pixel-border ${cls}`}
                    title={
                      row
                        ? row.via_manual
                          ? "manual override"
                          : "GPS unlock"
                        : "locked"
                    }
                  >
                    {c.order}
                    {row?.via_manual ? "*" : ""}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="text-[7px] text-forest-300 text-center leading-relaxed">
        * = manual override (GPS fallback). Tiles: green = GPS unlock, orange =
        manual, dark = locked.
      </p>
    </div>
  );
}
