"use client";

import { StripHeader, StripKeys } from "@/features/studio/components/strip-parts";
import type { StudioEngine } from "@/features/studio/engine/client/engine";
import type { PeerView } from "@/features/studio/engine/client/room-store";
import { formatMs } from "@/features/studio/latency";
import { Fader } from "@/ui/rack/fader";
import { Knob } from "@/ui/rack/knob";
import { LedMeter } from "@/ui/rack/led-meter";

export interface ChannelStripProps {
  engine: StudioEngine;
  peer: PeerView;
  /** End-to-end estimate for this player, in ms, or null before data arrives. */
  latencyMs: number | null;
  canKick: boolean;
}

const gainText = (gain: number) =>
  gain <= 0.001 ? "silent" : `${(20 * Math.log10(gain)).toFixed(1)} dB`;

function panText(pan: number): string {
  if (pan === 0) return "Centre";
  return `${Math.round(Math.abs(pan) * 100)}% ${pan < 0 ? "left" : "right"}`;
}

/** One remote player: level, volume, pan, local mute, link health and, for the host, removal. */
export function ChannelStrip({ engine, peer, latencyMs, canKick }: ChannelStripProps) {
  const { mix, slot, name } = peer;
  const tap = engine.peerTap(slot);
  return (
    <article className="well flex w-36 shrink-0 flex-col gap-3 border border-etch p-3">
      <StripHeader peer={peer} />
      <div className="flex h-36 items-stretch justify-center gap-4">
        <LedMeter read={tap ? tap.readPeaks : null} label={`${name} level`} />
        <Fader
          vertical
          min={0}
          max={1.5}
          value={mix.gain}
          onChange={(gain) => engine.setPeerMix(slot, { gain })}
          label={`${name} volume`}
          valueText={gainText(mix.gain)}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Knob
          value={mix.pan}
          onChange={(pan) => engine.setPeerMix(slot, { pan })}
          label={`${name} pan`}
          valueText={panText(mix.pan)}
        />
        <div className="flex flex-col items-end gap-0.5">
          <span className="silk">Pan</span>
          <span className="readout text-xs text-ink">{panText(mix.pan)}</span>
        </div>
      </div>
      <StripKeys engine={engine} peer={peer} canKick={canKick} />
      <dl className="etch-t grid grid-cols-2 gap-x-2 gap-y-1 pt-2">
        <dt className="silk">Latency</dt>
        <dd className="readout text-right text-xs text-ink">{formatMs(latencyMs)} ms</dd>
        <dt className="silk">Buffer</dt>
        <dd className="readout text-right text-xs text-ink">{formatMs(peer.stats?.bufferMs)} ms</dd>
        <dt className="silk" title="Round trip over the link between your two browsers">
          Link
        </dt>
        <dd className="readout text-right text-xs text-ink">{formatMs(peer.stats?.p2pRttMs)} ms</dd>
      </dl>
    </article>
  );
}
