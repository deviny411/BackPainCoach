export type KP = { x: number; y: number; name?: string; score?: number };

export function angleDeg(a: KP, b: KP, c: KP) {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const m1 = Math.hypot(v1.x, v1.y), m2 = Math.hypot(v2.x, v2.y);
  const cos = Math.min(1, Math.max(-1, dot / (m1 * m2 + 1e-9)));
  return (Math.acos(cos) * 180) / Math.PI;
}
export function get(kps: KP[], name: string): KP {
  return kps.find(k => k.name === name) || { x: 0, y: 0 };
}
