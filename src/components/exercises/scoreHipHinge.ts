import { angleDeg, get } from "./angles";
import type { KP } from "./angles";


export function scoreHipHinge(kps: KP[]) {
  const lS = get(kps,"left_shoulder"), rS = get(kps,"right_shoulder");
  const lH = get(kps,"left_hip"), rH = get(kps,"right_hip");
  const lK = get(kps,"left_knee"), rK = get(kps,"right_knee");
  const shoulder = { x:(lS.x+rS.x)/2, y:(lS.y+rS.y)/2 };
  const hip = { x:(lH.x+rH.x)/2, y:(lH.y+rH.y)/2 };
  const knee = { x:(lK.x+rK.x)/2, y:(lK.y+rK.y)/2 };

  const trunk = angleDeg(shoulder, hip, knee);
  const kL = angleDeg(get(kps,"left_hip"), get(kps,"left_knee"), get(kps,"left_ankle"));
  const kR = angleDeg(get(kps,"right_hip"), get(kps,"right_knee"), get(kps,"right_ankle"));
  const kneeAngle = (kL + kR)/2;

  const cues: string[] = [];
  let score = 100;

  if (kneeAngle < 155) { cues.push("Less knee bend — micro-bend only."); score -= 15; }
  if (trunk > 165) { cues.push("Push hips back; hinge more."); score -= 15; }
  if (trunk < 95)  { cues.push("Don’t overfold; limit range."); score -= 10; }

  const hipTilt = Math.abs(lH.y - rH.y);
  if (hipTilt > 20) { cues.push("Level your hips."); score -= 10; }

  return { score: Math.max(0, Math.min(100, score)), cues };
}
