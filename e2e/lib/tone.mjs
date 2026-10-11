import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const SAMPLE_RATE = 48_000;

function writeWav(file, frames, sampleAt) {
  const data = Buffer.alloc(frames * 4);
  for (let i = 0; i < frames; i++) {
    const [left, right] = sampleAt(i / SAMPLE_RATE);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left)) * 32767), i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right)) * 32767), i * 4 + 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(2, 22); // channels
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 4, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.concat([header, data]));
  return file;
}

/**
 * A 16-bit stereo WAV with a different steady sine on each side. Chromium
 * plays it in a loop as the fake microphone, which makes the audio that
 * arrives at the other end checkable: right pitch, right channel.
 */
export function writeStereoTone(file, { leftHz, rightHz, seconds = 4, level = 0.25 }) {
  const wave = (hz, t) => Math.sin(2 * Math.PI * hz * t) * level;
  return writeWav(file, SAMPLE_RATE * seconds, (t) => [wave(leftHz, t), wave(rightHz, t)]);
}

/**
 * A looping phrase of plucked notes with a few harmonics, for screenshots:
 * meters and scopes look like an instrument rather than a test tone.
 */
export function writeRiff(file, { notes, beat = 0.42, level = 0.5 }) {
  const pluck = (hz, t) => {
    const body = Math.sin(2 * Math.PI * hz * t) + 0.45 * Math.sin(4 * Math.PI * hz * t);
    return (body + 0.2 * Math.sin(6 * Math.PI * hz * t)) * Math.exp(-t * 4.5) * level * 0.6;
  };
  const frames = Math.round(SAMPLE_RATE * beat * notes.length);
  return writeWav(file, frames, (t) => {
    const index = Math.min(notes.length - 1, Math.floor(t / beat));
    const local = t - index * beat;
    const [leftHz, rightHz] = notes[index];
    return [pluck(leftHz, local), pluck(rightHz, local)];
  });
}
