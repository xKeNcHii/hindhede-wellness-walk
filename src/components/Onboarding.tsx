import { useMemo, useState } from "react";
import { PixelButton } from "./PixelButton";
import { Identity, newDeviceId, saveIdentity } from "../lib/identity";
import { isNameTaken } from "../lib/backend";
import { isRemote } from "../lib/supabase";
import { BASE_IDS, baseName, newAvatarState } from "../lib/avatar";
import { PixelAvatar } from "./PixelAvatar";

export function Onboarding({ onDone }: { onDone: (id: Identity) => void }) {
  const [name, setName] = useState("");
  const [baseId, setBaseId] = useState<string>(BASE_IDS[13] ?? BASE_IDS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Neutral preview states, one per base (memoised — 52 of them).
  const previews = useMemo(
    () => Object.fromEntries(BASE_IDS.map((b) => [b, newAvatarState(b)])),
    []
  );

  const handleStart = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setError("Tell us your name first.");
    setBusy(true);
    setError(null);
    const deviceId = newDeviceId();
    try {
      if (await isNameTaken(trimmed, deviceId)) {
        setError(`\u201c${trimmed}\u201d is taken — pick something unique.`);
        return;
      }
      const id: Identity = { deviceId, name: trimmed, baseId };
      saveIdentity(id);
      onDone(id);
    } catch (e) {
      setError("Could not check the name. " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col items-center p-6 gap-6 text-center max-w-md mx-auto">
      <div className="mt-4">
        <div className="text-2xl mb-2">🌿</div>
        <h1 className="text-sm leading-relaxed text-forest-300">
          Hindhede
          <br />
          Wellness Walk
        </h1>
        <p className="mt-3 text-[8px] text-forest-300 leading-relaxed">
          Your character starts neutral and evolves
          <br />
          with how you answer along the trail.
        </p>
        {!isRemote && (
          <p className="mt-3 text-[8px] text-clay leading-relaxed">
            local mode — set Supabase keys
            <br />
            to sync across phones
          </p>
        )}
      </div>

      <label className="w-full max-w-xs text-left text-[10px] text-sand">
        Your name (must be unique)
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="e.g. Sam"
          className="mt-2 w-full pixel-border bg-forest-900 px-3 py-3 text-[10px] text-sand outline-none"
        />
      </label>

      <div className="w-full text-left">
        <div className="text-[10px] text-sand mb-1">Pick your walker</div>
        <div className="text-[7px] text-forest-300 mb-2">{baseName(baseId)}</div>
        <div className="grid grid-cols-5 gap-2 max-h-[38vh] overflow-y-auto pr-1">
          {BASE_IDS.map((b) => (
            <button
              key={b}
              type="button"
              title={baseName(b)}
              aria-label={baseName(b)}
              aria-pressed={baseId === b}
              onClick={() => setBaseId(b)}
              className={`pixel-border flex items-center justify-center p-1 ${
                baseId === b ? "bg-forest-700" : "bg-forest-900"
              }`}
            >
              <PixelAvatar state={previews[b]} scale={1} width={36} />
            </button>
          ))}
        </div>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3 pb-8">
        <PixelButton disabled={busy || !name.trim()} onClick={handleStart}>
          {busy ? "Checking name…" : "Start walking"}
        </PixelButton>
        {error && <p className="text-[9px] text-clay">{error}</p>}
      </div>
    </div>
  );
}
