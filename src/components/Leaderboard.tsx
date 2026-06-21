import { Snapshot } from "../lib/backend";
import { Identity } from "../lib/identity";
import { CHECKPOINTS } from "../data/types";
import { formatDistance } from "../lib/geo";
import { isRemote } from "../lib/supabase";

interface Props {
  snapshot: Snapshot;
  identity: Identity;
}

export function Leaderboard({ snapshot, identity }: Props) {
  const rows = snapshot.teams.map((t) => {
    const members = snapshot.participants.filter((p) => p.team_id === t.id);
    const distance = members.reduce((s, p) => s + p.distance_m, 0);
    const checkpoints = snapshot.checkpoints.filter((c) => c.team_id === t.id).length;
    return { team: t, distance, checkpoints, members: members.length };
  });
  rows.sort((a, b) => b.distance - a.distance || b.checkpoints - a.checkpoints);

  return (
    <div className="p-4 flex flex-col gap-3">
      <h2 className="text-[11px] text-forest-300 text-center">🏆 Team Standings</h2>

      {!isRemote && (
        <p className="text-[8px] text-clay text-center leading-relaxed">
          local mode: only this device's team shows. Add Supabase keys for live
          cross-team standings.
        </p>
      )}

      {rows.length === 0 && (
        <p className="text-[9px] text-forest-300 text-center mt-4">
          No teams yet.
        </p>
      )}

      {rows.map((r, i) => {
        const mine = r.team.id === identity.teamId;
        return (
          <div
            key={r.team.id}
            className={`pixel-border p-3 flex items-center gap-3 text-[9px] ${
              mine ? "bg-forest-700" : "bg-forest-900"
            }`}
          >
            <div className="text-[14px] w-6 text-center text-forest-300">
              {i + 1}
            </div>
            <div className="flex-1">
              <div className="text-sand text-[10px]">
                {r.team.name} {mine && <span className="text-forest-300">(you)</span>}
              </div>
              <div className="text-[7px] text-forest-300 mt-1">
                {r.members} walker{r.members === 1 ? "" : "s"} ·{" "}
                {r.checkpoints}/{CHECKPOINTS.length} checkpoints
              </div>
            </div>
            <div className="text-sand text-[10px]">{formatDistance(r.distance)}</div>
          </div>
        );
      })}
    </div>
  );
}
