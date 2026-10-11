"use client";

import {
  BITRATES_KBPS,
  CODEC_LABELS,
  CODECS,
  coerceProfile,
  fitsDatagram,
  FRAME_MICROS,
  type AudioProfile,
  type CodecValue,
  type FrameMicros,
} from "@/features/studio/audio-profile";
import { Field } from "@/ui/primitives/field";
import { Select } from "@/ui/primitives/select";

export interface TransportFieldsProps {
  profile: AudioProfile;
  onChange: (patch: Partial<AudioProfile>) => void;
  idPrefix: string;
}

const frameLabel = (micros: number) => `${micros / 1000} ms`;

/**
 * Codec, frame size and bitrate. A combination that cannot fit in one
 * datagram is never offered: unsuitable options are disabled, and switching
 * codec shortens the frame when it has to.
 */
export function TransportFields({ profile, onChange, idPrefix }: TransportFieldsProps) {
  const isOpus = profile.codec === "OPUS";

  function change(patch: Partial<AudioProfile>) {
    const next = coerceProfile({ ...profile, ...patch });
    onChange({ ...patch, frameMicros: next.frameMicros });
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Field label="Codec" htmlFor={`${idPrefix}-codec`}>
          <Select
            id={`${idPrefix}-codec`}
            value={profile.codec}
            onChange={(event) => change({ codec: event.target.value as CodecValue })}
          >
            {CODECS.map((codec) => (
              <option key={codec} value={codec}>
                {CODEC_LABELS[codec]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Frame" htmlFor={`${idPrefix}-frame`}>
        <Select
          id={`${idPrefix}-frame`}
          value={profile.frameMicros}
          onChange={(event) => change({ frameMicros: Number(event.target.value) as FrameMicros })}
        >
          {FRAME_MICROS.map((frameMicros) => (
            <option
              key={frameMicros}
              value={frameMicros}
              disabled={!fitsDatagram({ ...profile, frameMicros })}
            >
              {frameLabel(frameMicros)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Bitrate" htmlFor={`${idPrefix}-bitrate`}>
        <Select
          id={`${idPrefix}-bitrate`}
          value={profile.bitrateKbps}
          disabled={!isOpus}
          onChange={(event) => change({ bitrateKbps: Number(event.target.value) })}
        >
          {BITRATES_KBPS.map((kbps) => (
            <option key={kbps} value={kbps}>
              {isOpus ? `${kbps} kbps` : "Lossless"}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
