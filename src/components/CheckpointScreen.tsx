import { useState } from "react";
import { Checkpoint } from "../data/types";
import { PixelButton } from "./PixelButton";
import { Sprite } from "./Sprite";
import { uploadPhoto } from "../lib/backend";
import { Identity } from "../lib/identity";
import { formatDistance } from "../lib/geo";
import { questionForCheckpoint, DURIAN_CHECKPOINT_ID } from "../data/reflection";
import { useGameStore } from "../store/useGameStore";
import { PixelAvatar } from "./PixelAvatar";

interface Props {
  checkpoint: Checkpoint;
  unlocked: boolean;
  distanceToIt: number | null;
  identity: Identity;
  onUnlock: (viaManual: boolean) => void;
  onClose: () => void;
}

export function CheckpointScreen({
  checkpoint,
  unlocked,
  distanceToIt,
  identity,
  onUnlock,
  onClose,
}: Props) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tip, setTip] = useState<string | null>(null);

  const avatar = useGameStore((s) => s.avatar);
  const answered = useGameStore((s) => s.answered);
  const answerReflection = useGameStore((s) => s.answerReflection);

  const inRange = distanceToIt != null && distanceToIt <= checkpoint.radius;
  const question = questionForCheckpoint(checkpoint.id);
  const alreadyAnswered = Boolean(answered[checkpoint.id]);

  const handlePhoto = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadPhoto(identity.deviceId, checkpoint.id, file);
      setPhotoUrl(url.startsWith("blob:") || url.startsWith("http") ? url : null);
      if (!unlocked) onUnlock(false);
    } finally {
      setUploading(false);
    }
  };

  const handleAnswer = (optIdx: number) => {
    if (!question || alreadyAnswered) return;
    const opt = question.options[optIdx];
    answerReflection(checkpoint.id, question.id, question.dim, opt.delta);
    setTip(opt.delta < 0 && opt.tip ? opt.tip : null);
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-forest-950 overflow-y-auto">
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

        {/* Distance to this checkpoint (always shown) */}
        <div className="pixel-border bg-forest-900 p-2 flex items-center justify-between text-[8px]">
          <span className="text-forest-300">📍 DISTANCE AWAY</span>
          <span className="text-sand">
            {distanceToIt != null ? formatDistance(distanceToIt) : "Locating…"}
          </span>
        </div>

        {/* Unlock status */}
        <div
          className={`pixel-border p-2 text-[8px] ${
            unlocked ? "bg-forest-700 text-sand" : "bg-forest-900 text-clay"
          }`}
        >
          {unlocked
            ? "✓ Checkpoint reached"
            : inRange
            ? "You're in range — unlocking…"
            : distanceToIt != null
            ? `${formatDistance(distanceToIt)} away`
            : "Locating…"}
        </div>

        {/* Durian Dodger reward banner */}
        {checkpoint.id === DURIAN_CHECKPOINT_ID && unlocked && (
          <div className="pixel-border bg-forest-700 p-3 text-center">
            <div className="text-[9px] text-clay">🏵️ DURIAN DODGER</div>
            <p className="text-[7px] text-sand mt-1 leading-relaxed">
              You strayed off the trail and braved the falling durians to find
              the hidden Colugo Deck — your avatar now stands on the deck, title
              and all. Check the You tab.
            </p>
          </div>
        )}

        {/* Wellness */}
        <section className="pixel-border bg-forest-900 p-4">
          <h3 className="text-[10px] text-forest-300 mb-2">
            🧘 {checkpoint.wellness.title}
          </h3>
          <p className="text-[9px] leading-relaxed text-sand">
            {checkpoint.wellness.body}
          </p>
        </section>

        {/* Point of reflection — evolves the avatar (once per checkpoint) */}
        {question && unlocked && (
          <section className="pixel-border bg-forest-800 p-4">
            <h3 className="text-[10px] text-forest-300 mb-2">💭 Point of Reflection</h3>
            {!alreadyAnswered ? (
              <>
                <p className="text-[9px] leading-relaxed text-sand mb-3">
                  {question.prompt}
                </p>
                <div className="flex flex-col gap-2">
                  {question.options.map((o, i) => (
                    <button
                      key={i}
                      onClick={() => handleAnswer(i)}
                      className="pixel-border bg-forest-900 text-sand text-[8px] text-left px-3 py-3 leading-relaxed"
                    >
                      {o.text}
                    </button>
                  ))}
                </div>
                <p className="text-[7px] text-forest-300 mt-2 leading-relaxed">
                  Answer honestly — your avatar changes with it, and a struggle
                  sticks for the rest of the walk.
                </p>
              </>
            ) : (
              <div className="flex items-center gap-3">
                {avatar && (
                  <PixelAvatar state={avatar} scale={1} title={false} background={null} width={40} />
                )}
                <p className="text-[8px] text-sand leading-relaxed">
                  Reflection done here — your avatar carries the answer.
                </p>
              </div>
            )}
            {tip && (
              <div className="mt-3 pixel-border bg-forest-950 p-3">
                <div className="text-[8px] text-clay mb-1">💡 TIP</div>
                <p className="text-[8px] text-sand leading-relaxed">{tip}</p>
              </div>
            )}
          </section>
        )}

        {/* Activity */}
        <section className="pixel-border bg-forest-800 p-4">
          <h3 className="text-[10px] text-forest-300 mb-2">
            🤝 {checkpoint.activity.title}
          </h3>
          <p className="text-[9px] leading-relaxed text-sand">
            {checkpoint.activity.body}
          </p>

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

        <PixelButton variant="ghost" onClick={onClose}>
          Back to map
        </PixelButton>
      </div>
    </div>
  );
}
