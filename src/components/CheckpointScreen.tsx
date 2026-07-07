import { useEffect, useState } from "react";
import { Checkpoint } from "../data/types";
import { PixelButton } from "./PixelButton";
import { Sprite } from "./Sprite";
import { formatDistance } from "../lib/geo";
import { questionForCheckpoint, DURIAN_CHECKPOINT_ID } from "../data/reflection";
import { useGameStore } from "../store/useGameStore";
import { PixelAvatar } from "./PixelAvatar";
import { SPRITES, AvatarState } from "../lib/avatar";

interface Reward {
  label: string; // dimension name, e.g. "Workload & Stress"
  prop: string; // the visual the walker gained/carries, e.g. "sunshine overhead"
  delta: number; // +1 healthy / -1 unhealthy / 0 neutral
}

interface Props {
  checkpoint: Checkpoint;
  unlocked: boolean;
  distanceToIt: number | null;
  onClose: () => void;
}

export function CheckpointScreen({
  checkpoint,
  unlocked,
  distanceToIt,
  onClose,
}: Props) {
  const [tip, setTip] = useState<string | null>(null);
  const [reward, setReward] = useState<Reward | null>(null);

  const avatar = useGameStore((s) => s.avatar);
  const answered = useGameStore((s) => s.answered);
  const answerReflection = useGameStore((s) => s.answerReflection);

  const inRange = distanceToIt != null && distanceToIt <= checkpoint.radius;
  const question = questionForCheckpoint(checkpoint.id);
  const alreadyAnswered = Boolean(answered[checkpoint.id]);

  const handleAnswer = (optIdx: number) => {
    if (!question || alreadyAnswered) return;
    const opt = question.options[optIdx];
    answerReflection(checkpoint.id, question.id, question.dim, opt.delta);
    setTip(opt.delta < 0 && opt.tip ? opt.tip : null);
    // Show what the answer did to the avatar. Read the freshly-updated state so
    // we reflect the actual resulting trait level (a prior struggle sticks).
    const fresh = useGameStore.getState().avatar;
    const level = fresh?.traits[question.dim] ?? 1;
    const meta = SPRITES.dimensionMeta[question.dim];
    setReward({ label: meta.label, prop: meta.props[String(level)] ?? "", delta: opt.delta });
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

        {/* Activity (optional — some checkpoints have none) */}
        {checkpoint.activity && (
        <section className="pixel-border bg-forest-800 p-4">
          <h3 className="text-[10px] text-forest-300 mb-2">
            🤝 {checkpoint.activity.title}
          </h3>
          <p className="text-[9px] leading-relaxed text-sand">
            {checkpoint.activity.body}
          </p>
        </section>
        )}

        <PixelButton variant="ghost" onClick={onClose}>
          Back to map
        </PixelButton>
      </div>

      {reward && avatar && (
        <RewardPop reward={reward} avatar={avatar} onClose={() => setReward(null)} />
      )}
    </div>
  );
}

/** Celebratory pop-up shown right after answering: what the walker's avatar
 * gained (or now carries), with the updated sprite. Auto-dismisses. */
function RewardPop({
  reward,
  avatar,
  onClose,
}: {
  reward: Reward;
  avatar: AvatarState;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 4200);
    return () => clearTimeout(t);
  }, [onClose]);

  const healthy = reward.delta > 0;
  const unhealthy = reward.delta < 0;
  const head = healthy
    ? "✨ NEW LOOK UNLOCKED"
    : unhealthy
    ? "☁️ A STRUGGLE TO CARRY"
    : "➖ STEADY FOR NOW";

  return (
    <div
      className="reward-backdrop fixed inset-0 z-[1300] flex items-center justify-center bg-black/70 p-6"
      onClick={onClose}
    >
      <div
        className="reward-card pixel-border bg-forest-800 p-5 flex flex-col items-center gap-3 text-center w-full max-w-[280px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-[9px]">
          {healthy && <span className="animate-sparkle text-[12px]">✨</span>}
          <span className={healthy ? "text-clay" : unhealthy ? "text-forest-300" : "text-sand"}>
            {head}
          </span>
          {healthy && <span className="animate-sparkle text-[12px]">✨</span>}
        </div>

        <div className="animate-pop">
          <PixelAvatar state={avatar} scale={2} title={false} background={null} width={96} />
        </div>

        <div className="text-[8px] text-forest-300">{reward.label}</div>
        {reward.prop ? (
          <p className="text-[9px] text-sand leading-relaxed">
            {healthy ? "Your walker gains " : unhealthy ? "Your walker now carries " : ""}
            <span className="text-clay">{reward.prop}</span>.
          </p>
        ) : (
          <p className="text-[9px] text-sand leading-relaxed">No visible change this time.</p>
        )}

        <button
          onClick={onClose}
          className="pixel-border bg-forest-700 text-sand text-[8px] px-5 py-2 mt-1"
        >
          Nice!
        </button>
      </div>
    </div>
  );
}
