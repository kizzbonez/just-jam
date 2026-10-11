import { readdirSync, readFileSync, writeFileSync } from "node:fs";

/** Width and height from a PNG's IHDR chunk. */
export function pngSize(file) {
  const header = readFileSync(file).subarray(0, 24);
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

/**
 * Records every screenshot's pixel size, so the guide can reserve the right
 * space for each image before it loads.
 */
export function writeManifest(directory, target) {
  const manifest = {};
  for (const name of readdirSync(directory).sort()) {
    if (name.endsWith(".png")) manifest[name.replace(/\.png$/, "")] = pngSize(`${directory}/${name}`);
  }
  writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}
