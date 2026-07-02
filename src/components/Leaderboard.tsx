import { Snapshot } from "../lib/backend";
import { Identity } from "../lib/identity";
import { CHECKPOINTS } from "../data/types";
import { formatDistance } from "../lib/geo";
import { isRemote } from "../lib/supabase";
import { decodeAvatar } from "../lib/avatar";
import { PixelAvatar } from "./PixelAvatar";

interface Props {
  snapshot: Snapshot;
  identity: Identity;
}

/** Individual standings: every walker with their live evolving avatar. */
export function Leaderboard({ snapshot, identity }: Props) {
  const rows = snapshot.participants.map((p) => {
    const checkpoints = snapshot.checkpoints.filter(
      (c) => c.device_id === p.device_id
    ).length;
    return { p, checkpoints, state: decodeAvatar(p.avatar) };
  });
  rows.sort((a, b) => b.p.distance_m - a.p.distance_m || b.checkpoints - a.checkpoints);

  return (
    <div className="p-4 flex flex-col gap-3">
      <h2 className="text-[11px] text-forest-300 text-center">🏆 Walkers</h2>

      {!isRemote && (
        <p className="text-[8px] text-clay text-center leading-relaxed">
          local mode: only this device shows. Add Supabase keys for live
          standings across phones.
        </p>
      )}

      {rows.length === 0 && (
        <p className="text-[9px] text-forest-300 text-center mt-4">No walkers yet.</p>
      )}

      {rows.map((r, i) => {
        const mine = r.p.device_id === identity.deviceId;
        return (
          <div
            key={r.p.device_id}
            className={`pixel-border p-3 flex items-center gap-3 text-[9px] ${
              mine ? "bg-forest-700" : "bg-forest-900"
            }`}
          >
            <div className="text-[14px] w-6 text-center text-forest-300">{i + 1}</div>
            {r.state ? (
              <PixelAvatar state={r.state} scale={1} title={false} width={30} />
            ) : (
              <span className="text-[16px] w-[30px] text-center">🧍</span>
            )}
            <div className="flex-1">
              <div className="text-sand text-[10px]">
                {r.p.name} {mine && <span className="text-forest-300">(you)</span>}
                {r.state?.background === "durian_dodger" && (
                  <span title="Durian Dodger"> 🏵️</span>
                )}
              </div>
              <div className="text-[7px] text-forest-300 mt-1">
                {r.checkpoints}/{CHECKPOINTS.length} checkpoints
              </div>
            </div>
            <div className="text-sand text-[10px]">{formatDistance(r.p.distance_m)}</div>
          </div>
        );
      })}
    </div>
  );
}
