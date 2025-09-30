import { angleDeg, get } from "./angles";
import type { KP } from "./angles";

export function scoreBirdDog(kps: KP[]) {
  const shoulder = { 
    left: get(kps, "left_shoulder"), 
    right: get(kps, "right_shoulder") 
  };
  const hip = { 
    left: get(kps, "left_hip"), 
    right: get(kps, "right_hip") 
  };
  const knee = { 
    left: get(kps, "left_knee"), 
    right: get(kps, "right_knee") 
  };
  const ankle = { 
    left: get(kps, "left_ankle"), 
    right: get(kps, "right_ankle") 
  };
  const elbow = {
    left: get(kps, "left_elbow"),
    right: get(kps, "right_elbow")
  };
  const wrist = {
    left: get(kps, "left_wrist"),
    right: get(kps, "right_wrist")
  };

  const cues: string[] = [];
  let score = 100;

  // Check arm and leg extension
  const leftArmAngle = angleDeg(shoulder.left, elbow.left, wrist.left);
  const rightLegAngle = angleDeg(hip.right, knee.right, ankle.right);

  // Check spine alignment
  const spineAngle = angleDeg(shoulder.left, hip.left, knee.left);

  // Arm extension check
  if (leftArmAngle > 180 || leftArmAngle < 160) {
    cues.push("Keep arm straight but not locked.");
    score -= 15;
  }

  // Leg extension check
  if (rightLegAngle > 190 || rightLegAngle < 170) {
    cues.push("Extend leg fully, keep it in line with hip.");
    score -= 15;
  }

  // Spine alignment check
  if (spineAngle < 160 || spineAngle > 200) {
    cues.push("Maintain a neutral spine. Keep back flat.");
    score -= 20;
  }

  // Hip levelness
  const hipTilt = Math.abs(hip.left.y - hip.right.y);
  if (hipTilt > 20) {
    cues.push("Keep hips level and stable.");
    score -= 10;
  }

  return { 
    score: Math.max(0, Math.min(100, score)), 
    cues 
  };
}
