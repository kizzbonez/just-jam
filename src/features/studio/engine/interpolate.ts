/**
 * Four-point cubic Hermite (Catmull-Rom) read from a power-of-two ring at a
 * fractional position. Used only while the playout rate is being nudged; at
 * unity rate samples are copied untouched.
 */
export function hermite(ring: Float32Array, mask: number, position: number): number {
  const base = Math.floor(position);
  const t = position - base;
  const y0 = ring[(base - 1) & mask];
  const y1 = ring[base & mask];
  const y2 = ring[(base + 1) & mask];
  const y3 = ring[(base + 2) & mask];
  const c1 = 0.5 * (y2 - y0);
  const c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
  const c3 = 0.5 * (y3 - y0) + 1.5 * (y1 - y2);
  return ((c3 * t + c2) * t + c1) * t + y1;
}
