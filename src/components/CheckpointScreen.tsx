import { useState } from "react";
import { Checkpoint } from "../data/types";
import { PixelButton } from "./PixelButton";
import { Sprite } from "./Sprite";
import { ParticipantRow, uploadPhoto } from "../lib/backend";
import { Identity } from "../lib/identity";
import { formatDistance } from "../lib/geo";

interface Props {
  checkpoint: Checkpoint;
  unlocked: boolean;
  distanceToIt: number | null;
  teammates: ParticipantRow[];
  identity: Identity;
  onUnlock: (viaManual: boolean) => void;
  onClose: () => void;
}

export function CheckpointScreen({
  checkpoint,
  unlocked,
  distanceToIt,
  teammates,
  identity,
  onUnlock,
  onClose,
}: Props) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const inRange = distanceToIt != null && distanceToIt <= checkpoint.radius;

  const lowest =
    checkpoint.type === "swing" && teammates.length > 0
      ? [...teammates].sort((a, b) => a.distance_m - b.distance_m)[0]
      : null;

  const handlePhoto = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadPhoto(identity.teamId, checkpoint.id, file);
      setPhotoUrl(url.startsWith("blob:") || url.startsWith("http") ? url : null);
      if (!unlocked) onUnlock(false);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-forest-950/95 overflow-y-auto">
      <div className="max-w-md mx-auto p-5 flex flex-col gap-4 min-h-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sprite name={checkpoint.sprite} size={28} />
            <h2 className="text-[12px] text-forest-300">{checkpoint.name}</h2>
          </div>
          <button onClick={onClose} className="text-sand text-[12px] px-2">
            ✕
          </button>
        </div>

        {/* Unlock status */}
        <div
          className={`pixel-border p-2 text-[8px] ${
            unlocked ? "bg-forest-700 text-sand" : "bg-forest-900 text-clay"
          }`}
        >
          {unlocked
            ? "✓ Checkpoint unlocked for your team"
            : inRange
            ? "You're in range — unlocking…"
            : distanceToIt != null
            ? `${formatDistance(distanceToIt)} away`
            : "Locating…"}
        </div>

        {/* Wellness */}
        <section className="pixel-border bg-forest-900 p-4">
          <h3 className="text-[10px] text-forest-300 mb-2">
            🧘 {checkpoint.wellness.title}
          </h3>
          <p className="text-[9px] leading-relaxed text-sand">
            {checkpoint.wellness.body}
          </p>
        </section>

        {/* Activity */}
        <section className="pixel-border bg-forest-800 p-4">
          <h3 className="text-[10px] text-forest-300 mb-2">
            🤝 {checkpoint.activity.title}
          </h3>
          <p className="text-[9px] leading-relaxed text-sand">
            {checkpoint.activity.body}
          </p>

          {checkpoint.type === "swing" && (
            <div className="mt-3 pixel-border bg-forest-950 p-3 text-center">
              {lowest ? (
                <>
                  <div className="text-[8px] text-forest-300">TAKES THE SWING</div>
                  <div className="text-[12px] text-clay animate-wiggle mt-1">
                    {lowest.name}
                  </div>
                  <div className="text-[7px] text-sand mt-1">
                    ({formatDistance(lowest.distance_m)} walked)
                  </div>
                </>
              ) : (
                <div className="text-[8px] text-forest-300">
                  Waiting for teammates' distances…
                </div>
              )}
            </div>
          )}

          {checkpoint.type === "photo" && (
            <div className="mt-3 flex flex-col gap-2">
              {photoUrl && (
                <img
                  src={photoUrl}
                  alt="Group"
                  className="w-full pixel-border object-cover max-h-60"
                />
              )}
              <label className="pixel-border bg-forest-700 text-sand text-[9px] text-center py-3 cursor-pointer">
                {uploading ? "Uploading…" : "📸 Upload group photo"}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handlePhoto(f);
                  }}
                />
              </label>
            </div>
          )}
        </section>

        {/* Manual override */}
        {!unlocked && !inRange && (
          <PixelButton variant="danger" onClick={() => onUnlock(true)}>
            I'm here but it won't unlock — unlock manually
          </PixelButton>
        )}

        <PixelButton variant="ghost" onClick={onClose}>
          Back to map
        </PixelButton>
      </div>
    </div>
  );
}
