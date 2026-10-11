"use client";

import { useState } from "react";
import {
  CHANNEL_LABELS,
  CHANNEL_MODES,
  type AudioProfile,
  type ChannelModeValue,
} from "@/features/studio/audio-profile";
import { BufferFields } from "@/features/studio/components/buffer-fields";
import { TransportFields } from "@/features/studio/components/transport-fields";
import { api } from "@/lib/api-client";
import { useApiAction } from "@/lib/use-api-action";
import { Button } from "@/ui/primitives/button";
import { Field } from "@/ui/primitives/field";
import { Notice } from "@/ui/primitives/notice";
import { Select } from "@/ui/primitives/select";

/**
 * The audio settings every room starts with. Changes made inside a room are
 * saved here automatically; this form edits them without entering one.
 */
export function AudioDefaultsPanel({ initial }: { initial: AudioProfile }) {
  const [profile, setProfile] = useState(initial);
  const [saved, setSaved] = useState(false);
  const action = useApiAction();

  function change(patch: Partial<AudioProfile>) {
    setSaved(false);
    setProfile((current) => ({ ...current, ...patch }));
  }

  async function save() {
    const done = await action.run(() =>
      api("/api/profile/audio", { method: "PUT", body: profile }),
    );
    if (done) setSaved(true);
  }

  return (
    <div className="flex flex-col gap-5">
      {saved && <Notice tone="success">Audio defaults saved.</Notice>}
      {action.error && <Notice tone="error">{action.error}</Notice>}
      <p className="text-sm text-label">
        Last interface used:{" "}
        <span className="text-ink-soft">{profile.inputLabel ?? "none yet, arm one in a room"}</span>
      </p>
      <Field label="Channels" htmlFor="default-channels">
        <Select
          id="default-channels"
          value={profile.channelMode}
          onChange={(event) => change({ channelMode: event.target.value as ChannelModeValue })}
        >
          {CHANNEL_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {CHANNEL_LABELS[mode]}
            </option>
          ))}
        </Select>
      </Field>
      <TransportFields profile={profile} onChange={change} idPrefix="default" />
      <div className="etch-t pt-5">
        <BufferFields profile={profile} onChange={change} />
      </div>
      <Button className="self-start" loading={action.pending} onClick={save}>
        Save audio defaults
      </Button>
    </div>
  );
}
