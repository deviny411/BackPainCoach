import { angleDeg, get } from "./angles";
import type { KP } from "./angles";

export interface WalkingPostureAssessment {
  score: number;
  cues: string[];
  recommendations: {
    exercises: string[];
    duration: number;
    frequency: string;
  };
}

export function scoreWalkingPosture(kps: KP[]): WalkingPostureAssessment {
  // Key body points for walking posture
  const ankle = {
    left: get(kps, "left_ankle"),
    right: get(kps, "right_ankle")
  };
  const knee = {
    left: get(kps, "left_knee"),
    right: get(kps, "right_knee")
  };
  const hip = {
    left: get(kps, "left_hip"),
    right: get(kps, "right_hip")
  };
  const shoulder = {
    left: get(kps, "left_shoulder"),
    right: get(kps, "right_shoulder")
  };
  const ear = {
    left: get(kps, "left_ear"),
    right: get(kps, "right_ear")
  };

  const cues: string[] = [];
  let score = 100;

  // 1. Spine Alignment
  const spineAngle = angleDeg(ear.left, shoulder.left, hip.left);
  if (spineAngle < 170 || spineAngle > 190) {
    cues.push("Maintain a neutral spine. Keep head aligned with shoulders.");
    score -= 20;
  }

  // 2. Hip and Shoulder Alignment
  const hipLevelDiff = Math.abs(hip.left.y - hip.right.y);
  if (hipLevelDiff > 30) {
    cues.push("Keep hips level. Avoid tilting to one side while walking.");
    score -= 15;
  }

  // 3. Knee Tracking
  const kneeTrackingAngle = angleDeg(hip.left, knee.left, ankle.left);
  if (kneeTrackingAngle < 160 || kneeTrackingAngle > 200) {
    cues.push("Align knees properly. Avoid inward or outward knee rotation.");
    score -= 15;
  }

  // 4. Stride Length and Symmetry
  const strideLength = Math.abs(ankle.left.x - ankle.right.x);
  const idealStrideLength = 100; // Adjust based on typical body proportions
  const strideDiff = Math.abs(strideLength - idealStrideLength);
  if (strideDiff > 50) {
    cues.push("Maintain consistent stride length. Avoid overstriding or short steps.");
    score -= 10;
  }

  // Determine severity and recommendations
  let recommendations: WalkingPostureAssessment['recommendations'];
  if (score < 50) {
    recommendations = {
      exercises: [
        "Hip Mobility Stretches",
        "Core Strengthening",
        "Glute Activation Exercises",
        "Balance and Stability Training"
      ],
      duration: 20,
      frequency: "Daily for 2-3 weeks"
    };
  } else if (score < 75) {
    recommendations = {
      exercises: [
        "Gentle Spine Mobility",
        "Hip Flexor Stretches",
        "Walking Technique Drills"
      ],
      duration: 15,
      frequency: "4-5 times per week"
    };
  } else {
    recommendations = {
      exercises: [
        "Maintenance Stretches",
        "Light Mobility Work"
      ],
      duration: 10,
      frequency: "2-3 times per week"
    };
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    cues,
    recommendations
  };
}
