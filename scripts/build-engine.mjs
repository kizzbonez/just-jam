// Bundles the audio engine into public/engine/. AudioWorklet modules and the
// transport worker load by URL, outside the Next.js bundle, so they are built
// here as self-contained ES modules.
import { existsSync } from "node:fs";
import { build, context } from "esbuild";

const ROOT = "src/features/studio/engine";
const ENTRIES = {
  "capture.worklet": `${ROOT}/worklets/capture.worklet.ts`,
  "playback.worklet": `${ROOT}/worklets/playback.worklet.ts`,
  "transport.worker": `${ROOT}/worker/transport.worker.ts`,
};

const watch = process.argv.includes("--watch");
const entryPoints = Object.fromEntries(
  Object.entries(ENTRIES).filter(([, file]) => existsSync(file)),
);

const options = {
  entryPoints,
  outdir: "public/engine",
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: !watch,
  sourcemap: watch ? "inline" : false,
  logLevel: "info",
};

if (Object.keys(entryPoints).length === 0) {
  console.log("build-engine: no engine sources yet, nothing to bundle.");
} else if (watch) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}
