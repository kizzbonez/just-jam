"use client";

import type { PeerStats } from "@/features/studio/engine/messages";
import { formatMs, type LatencyBreakdown } from "@/features/studio/latency";
import { Readout } from "@/ui/rack/readout";

export interface TelemetryReadoutsProps {
  stats: PeerStats;
  latency: LatencyBreakdown | null;
}

/** Drift correction in parts per million. Zero means samples pass through untouched. */
const driftPpm = (rate: number) => Math.round((rate - 1) * 1_000_000);

/** The numbers behind one player's stream, as counters. */
export function TelemetryReadouts({ stats, latency }: TelemetryReadoutsProps) {
  const lossy = stats.lossPct >= 1;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Readout label="Est. latency" value={formatMs(latency?.totalMs)} unit="ms" />
        <Readout label="Buffer held" value={formatMs(stats.bufferMs)} unit="ms" />
        <Readout label="Buffer target" value={formatMs(stats.targetMs)} unit="ms" />
        <Readout label="Lateness p99" value={formatMs(stats.latenessMs)} unit="ms" />
        <Readout label="Jitter" value={formatMs(stats.jitterMs)} unit="ms" />
        <Readout
          label="Packet loss"
          value={stats.lossPct.toFixed(1)}
          unit="%"
          alert={lossy}
          note={lossy ? "Losing packets" : undefined}
        />
        <Readout label="Dropouts" value={stats.underruns} />
        <Readout label="Receiving" value={stats.receivedKbps.toFixed(0)} unit="kbps" />
      </div>
      {latency && (
        <p className="readout text-xs text-label">
          capture {formatMs(latency.captureMs)} + framing {formatMs(latency.framingMs)} + network{" "}
          {formatMs(latency.networkMs)} + buffer {formatMs(latency.bufferMs)} + output{" "}
          {formatMs(latency.outputMs)} ms · drift {driftPpm(stats.rate)} ppm · late{" "}
          {stats.latePackets} · skips {stats.skips}
        </p>
      )}
    </div>
  );
}
