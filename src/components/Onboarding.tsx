import { useState } from "react";
import { PixelButton } from "./PixelButton";
import {
  Identity,
  makeJoinCode,
  newDeviceId,
  saveIdentity,
} from "../lib/identity";
import { createTeam, findTeamByCode } from "../lib/backend";
import { isRemote } from "../lib/supabase";

export function Onboarding({ onDone }: { onDone: (id: Identity) => void }) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [teamName, setTeamName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = (teamId: string, tName: string) => {
    const id: Identity = {
      deviceId: newDeviceId(),
      name: name.trim(),
      teamId,
      teamName: tName,
    };
    saveIdentity(id);
    onDone(id);
  };

  const handleCreate = async () => {
    if (!teamName.trim()) return setError("Give your team a name.");
    setBusy(true);
    setError(null);
    try {
      const joinCode = makeJoinCode(teamName);
      const team = await createTeam(teamName.trim(), joinCode);
      finish(team.id, team.name);
    } catch (e) {
      setError("Could not create team. " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    if (!code.trim()) return setError("Enter a join code.");
    setBusy(true);
    setError(null);
    try {
      const team = await findTeamByCode(code);
      if (!team) {
        setError("No team with that code.");
        return;
      }
      finish(team.id, team.name);
    } catch (e) {
      setError("Could not join. " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6 gap-6 text-center">
      <div>
        <div className="text-2xl mb-2">🌿</div>
        <h1 className="text-sm leading-relaxed text-forest-300">
          Hindhede
          <br />
          Wellness Walk
        </h1>
        {!isRemote && (
          <p className="mt-3 text-[8px] text-clay leading-relaxed">
            local mode — set Supabase keys
            <br />
            to sync across phones
          </p>
        )}
      </div>

      <label className="w-full max-w-xs text-left text-[10px] text-sand">
        Your name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="e.g. Sam"
          className="mt-2 w-full pixel-border bg-forest-900 px-3 py-3 text-[10px] text-sand outline-none"
        />
      </label>

      {mode === "choose" && (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <PixelButton
            disabled={!name.trim()}
            onClick={() => {
              setError(null);
              setMode("create");
            }}
          >
            Create a Team
          </PixelButton>
          <PixelButton
            variant="ghost"
            disabled={!name.trim()}
            onClick={() => {
              setError(null);
              setMode("join");
            }}
          >
            Join a Team
          </PixelButton>
        </div>
      )}

      {mode === "create" && (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            maxLength={24}
            placeholder="Team name"
            className="w-full pixel-border bg-forest-900 px-3 py-3 text-[10px] text-sand outline-none"
          />
          <PixelButton disabled={busy} onClick={handleCreate}>
            {busy ? "Creating…" : "Create"}
          </PixelButton>
          <PixelButton variant="ghost" onClick={() => setMode("choose")}>
            Back
          </PixelButton>
        </div>
      )}

      {mode === "join" && (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={8}
            placeholder="Join code e.g. FOX-274"
            className="w-full pixel-border bg-forest-900 px-3 py-3 text-[10px] text-sand outline-none"
          />
          <PixelButton disabled={busy} onClick={handleJoin}>
            {busy ? "Joining…" : "Join"}
          </PixelButton>
          <PixelButton variant="ghost" onClick={() => setMode("choose")}>
            Back
          </PixelButton>
        </div>
      )}

      {error && <p className="text-[9px] text-clay max-w-xs">{error}</p>}
    </div>
  );
}
