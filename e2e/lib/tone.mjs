import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const SAMPLE_RATE = 48_000;

/**
 * Writes a 16-bit stereo WAV with a different sine on each side. Chromium
 * plays it in a loop as the fake microphone, which makes the audio that
 * arrives at the other end checkable: right pitch, right channel.
 */
export function writeStereoTone(file, { leftHz, rightHz, seconds = 4, level = 0.25 }) {
  const frames = SAMPLE_RATE * seconds;
  const data = Buffer.alloc(frames * 4);
  for (let i = 0; i < frames; i++) {
    const t = i / SAMPLE_RATE;
    data.writeInt16LE(Math.round(Math.sin(2 * Math.PI * leftHz * t) * level * 32767), i * 4);
    data.writeInt16LE(Math.round(Math.sin(2 * Math.PI * rightHz * t) * level * 32767), i * 4 + 2);
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
