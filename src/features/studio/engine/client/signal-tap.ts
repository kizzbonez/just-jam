/**
 * A measuring point in the audio graph, feeding the LED meters and scopes.
 * AnalyserNode mixes its input down to one channel, so stereo metering needs a
 * splitter with an analyser per side. Nothing here is in the audible path.
 */
const WINDOW = 1024;

function peakOf(analyser: AnalyserNode, scratch: Float32Array<ArrayBuffer>): number {
  analyser.getFloatTimeDomainData(scratch);
  let peak = 0;
  for (let i = 0; i < scratch.length; i++) {
    const magnitude = Math.abs(scratch[i]);
    if (magnitude > peak) peak = magnitude;
  }
  return peak;
}

/** Frequency of the strongest spectral component, or 0 when there is only noise floor. */
function toneOf(analyser: AnalyserNode, bins: Float32Array<ArrayBuffer>): number {
  analyser.getFloatFrequencyData(bins);
  let best = 0;
  for (let i = 1; i < bins.length; i++) {
    if (bins[i] > bins[best]) best = i;
  }
  if (bins[best] < -80) return 0;
  return (best * analyser.context.sampleRate) / analyser.fftSize;
}

export class SignalTap {
  private readonly entry: GainNode;
  private readonly splitter: ChannelSplitterNode;
  private readonly left: AnalyserNode;
  private readonly right: AnalyserNode;
  private readonly scratch = new Float32Array(WINDOW);

  constructor(context: AudioContext) {
    // A splitter cannot up-mix, so a unity gain in front of it spreads a
    // one-channel source to both sides and both meters move.
    this.entry = context.createGain();
    this.entry.channelCount = 2;
    this.entry.channelCountMode = "explicit";
    this.entry.channelInterpretation = "speakers";
    this.splitter = context.createChannelSplitter(2);
    this.entry.connect(this.splitter);
    this.left = context.createAnalyser();
    this.right = context.createAnalyser();
    this.left.fftSize = WINDOW;
    this.right.fftSize = WINDOW;
    this.splitter.connect(this.left, 0);
    this.splitter.connect(this.right, 1);
  }

  /** Connect the node to be measured to this. */
  get input(): AudioNode {
    return this.entry;
  }

  /** Linear peak of each side over the last 21 ms. */
  readPeaks = (out: Float32Array): void => {
    out[0] = peakOf(this.left, this.scratch);
    out[1] = peakOf(this.right, this.scratch);
  };

  /** The latest waveform of the left side, for a scope. */
  readWave = (out: Float32Array<ArrayBuffer>): void => {
    this.left.getFloatTimeDomainData(out);
  };

  /** Dominant frequency of each side in Hz, to the nearest analyser bin. */
  readTone = (): [number, number] => {
    const bins = new Float32Array(this.left.frequencyBinCount);
    return [toneOf(this.left, bins), toneOf(this.right, bins)];
  };

  dispose(): void {
    this.entry.disconnect();
    this.splitter.disconnect();
  }
}
