import { angleDeg, get } from "./angles";
import type { KP } from "./angles";

export function scorePlank(kps: KP[]) {
  const s = { x:(get(kps,"left_shoulder").x+get(kps,"right_shoulder").x)/2,
              y:(get(kps,"left_shoulder").y+get(kps,"right_shoulder").y)/2 };
  const h = { x:(get(kps,"left_hip").x+get(kps,"right_hip").x)/2,
              y:(get(kps,"left_hip").y+get(kps,"right_hip").y)/2 };
  const k = { x:(get(kps,"left_knee").x+get(kps,"right_knee").x)/2,
              y:(get(kps,"left_knee").y+get(kps,"right_knee").y)/2 };
  const a = { x:(get(kps,"left_ankle").x+get(kps,"right_ankle").x)/2,
              y:(get(kps,"left_ankle").y+get(kps,"right_ankle").y)/2 };

  const trunk = angleDeg(s, h, k);
  const leg   = angleDeg(h, k, a);

  const cues: string[] = [];
  let score = 100;

  if (trunk < 165) { cues.push("Lift chest / tuck ribs — keep trunk long."); score -= 15; }
  if (trunk > 185) { cues.push("Don’t pike — keep hips level."); score -= 15; }
  if (leg   < 165) { cues.push("Straighten legs — press heels back."); score -= 10; }

  const hipTilt = Math.abs(get(kps,"left_hip").y - get(kps,"right_hip").y);
  if (hipTilt > 15) { cues.push("Level your hips."); score -= 10; }

  return { score: Math.max(0, Math.min(100, score)), cues };
}
