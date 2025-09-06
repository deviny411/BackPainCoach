import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as posedetection from "@tensorflow-models/pose-detection";
import { scoreHipHinge } from "./exercises/scoreHipHinge";
import { scorePlank } from "./exercises/scorePlank";
import { scoreBirdDog } from "./exercises/scoreBirdDog";
import { scoreDeadBug } from "./exercises/scoreDeadBug";
import { scoreWalkingPosture } from "./exercises/scoreWalkingPosture";
import type { KP } from "./exercises/angles";

// Exercise configuration type
type ExerciseConfig = {
  name: string;
  scoringFunction: (keypoints: KP[]) => { score: number; cues: string[] };
  optimalPoseMarkers: { 
    name: string; 
    optimalRange: { min: number; max: number };
    color: string;
  }[];
};

// Predefined exercises
const EXERCISES: Record<string, ExerciseConfig> = {
  "Hip Hinge": {
    name: "Hip Hinge",
    scoringFunction: scoreHipHinge,
    optimalPoseMarkers: [
      { 
        name: "Trunk Angle", 
        optimalRange: { min: 110, max: 160 }, 
        color: "#4CAF50" 
      },
      { 
        name: "Knee Angle", 
        optimalRange: { min: 155, max: 175 }, 
        color: "#2196F3" 
      }
    ]
  },
  "Plank": {
    name: "Plank",
    scoringFunction: scorePlank,
    optimalPoseMarkers: [
      { 
        name: "Trunk Alignment", 
        optimalRange: { min: 165, max: 185 }, 
        color: "#FF9800" 
      },
      { 
        name: "Hip Level", 
        optimalRange: { min: -10, max: 10 }, 
        color: "#9C27B0" 
      }
    ]
  },
  "Bird Dog": {
    name: "Bird Dog",
    scoringFunction: scoreBirdDog,
    optimalPoseMarkers: [
      { 
        name: "Arm Extension", 
        optimalRange: { min: 160, max: 180 }, 
        color: "#673AB7" 
      },
      { 
        name: "Leg Extension", 
        optimalRange: { min: 170, max: 190 }, 
        color: "#FF5722" 
      }
    ]
  },
  "Dead Bug": {
    name: "Dead Bug",
    scoringFunction: scoreDeadBug,
    optimalPoseMarkers: [
      { 
        name: "Arm Position", 
        optimalRange: { min: 160, max: 190 }, 
        color: "#3F51B5" 
      },
      { 
        name: "Leg Angle", 
        optimalRange: { min: 160, max: 190 }, 
        color: "#009688" 
      }
    ]
  },
  "Walking Posture": {
    name: "Walking Posture",
    scoringFunction: scoreWalkingPosture,
    optimalPoseMarkers: [
      { 
        name: "Spine Alignment", 
        optimalRange: { min: 170, max: 190 }, 
        color: "#8BC34A" 
      },
      { 
        name: "Hip Levelness", 
        optimalRange: { min: -30, max: 30 }, 
        color: "#FFC107" 
      }
    ]
  }
};

export default function ExerciseTracker() {
  const [currentExercise, setCurrentExercise] = useState<string>("Hip Hinge");
  const [status, setStatus] = useState("Loading model...");
  const [score, setScore] = useState(0);
  const [cues, setCues] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<posedetection.PoseDetector | null>(null);

  // Helper function to check full-body visibility
  const checkFullBodyVisibility = (keypoints: KP[]): { 
    isFullBodyVisible: boolean; 
    missingBodyParts: string[];
    isTooClose: boolean;
  } => {
    const requiredBodyParts = [
      "left_shoulder", "right_shoulder",
      "left_hip", "right_hip", 
      "left_knee", "right_knee",
      "left_ankle", "right_ankle"
    ];

    // Check visibility of key body parts
    const missingBodyParts = requiredBodyParts.filter(part => 
      !keypoints.some(kp => 
        kp.name === part && (kp.score ?? 0) > 0.5
      )
    );

    // Determine if user is too close (by checking relative distances)
    const getKeypoint = (name: string) => 
      keypoints.find(kp => kp.name === name) ?? { x: 0, y: 0, score: 0 };

    const shoulder = {
      left: getKeypoint("left_shoulder"),
      right: getKeypoint("right_shoulder")
    };
    const hip = {
      left: getKeypoint("left_hip"),
      right: getKeypoint("right_hip")
    };

    // Calculate vertical distance between shoulders and hips
    const verticalDistance = Math.abs(
      ((shoulder.left.y + shoulder.right.y) / 2) - 
      ((hip.left.y + hip.right.y) / 2)
    );

    // If vertical distance is too small, user is likely too close
    const isTooClose = verticalDistance < 100; // Adjust this threshold as needed

    return {
      isFullBodyVisible: missingBodyParts.length === 0,
      missingBodyParts,
      isTooClose
    };
  };

  // Model and camera initialization
  useEffect(() => {
    let cancelled = false;

    const initializeModel = async () => {
      try {
        await tf.setBackend("webgl");
        const detector = await posedetection.createDetector(
          posedetection.SupportedModels.MoveNet,
          { modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
        );
        
        if (cancelled) return;
        detectorRef.current = detector;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: "user",
            width: { ideal: 960 },
            height: { ideal: 720 }
          },
          audio: false
        });

        const videoElement = videoRef.current;
        if (videoElement) {
          videoElement.srcObject = stream;
          // Explicitly set to not mirror
          videoElement.style.transform = 'scaleX(1)';
          videoElement.onloadedmetadata = () => {
            videoElement.play();
            setStatus("Position yourself fully in the frame");
          };
        }
      } catch (error) {
        console.error("Initialization error:", error);
        setStatus("Failed to load camera or model. Check permissions.");
      }
    };

    initializeModel();

    return () => {
      cancelled = true;
      const videoElement = videoRef.current;
      const stream = videoElement?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      detectorRef.current?.dispose();
    };
  }, []);

  // Pose detection and rendering loop
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const detector = detectorRef.current;

    if (!canvas || !video || !detector) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const processFrame = async () => {
      // Prepare canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Detect poses
      const poses = await detector.estimatePoses(video, { flipHorizontal: false });
      const keypoints = poses[0]?.keypoints as KP[] | undefined;

      if (keypoints) {
        // Calculate scaling factors
        const scaleX = canvas.width / video.videoWidth;
        const scaleY = canvas.height / video.videoHeight;

        // Check full body visibility
        const { 
          isFullBodyVisible, 
          missingBodyParts, 
          isTooClose 
        } = checkFullBodyVisibility(keypoints);

        // Adjust status based on body visibility
        if (isTooClose) {
          setStatus("Move further back! Full body should be visible.");
        } else if (!isFullBodyVisible) {
          setStatus(`Adjust position. Missing: ${missingBodyParts.join(", ")}`);
        } else {
          setStatus("Good positioning. Maintain form.");
        }

        // Score the current exercise only if full body is visible
        const exercise = EXERCISES[currentExercise];
        let result = { score: 0, cues: ["Position your full body in frame"] };
        
        if (isFullBodyVisible && !isTooClose) {
          result = exercise.scoringFunction(keypoints);
        }
        
        setScore(result.score);
        setCues(result.cues);

        // Draw keypoints
        ctx.fillStyle = isFullBodyVisible && !isTooClose ? "#00FF88" : "#FF4444";
        keypoints.forEach(kp => {
          if ((kp.score ?? 0) > 0.5) {
            ctx.beginPath();
            ctx.arc(
              kp.x * scaleX,  // Scale X coordinate
              kp.y * scaleY,  // Scale Y coordinate
              5, 0, 2 * Math.PI
            );
            ctx.fill();
          }
        });

        // Draw optimal pose markers
        exercise.optimalPoseMarkers.forEach(marker => {
          // Placeholder for marker drawing logic
          // You'd need to implement specific angle/position calculations
          ctx.strokeStyle = marker.color;
          ctx.lineWidth = 3;
          // Draw marker visualization
        });
      }

      animationFrameId = requestAnimationFrame(processFrame);
    };

    processFrame();

    return () => cancelAnimationFrame(animationFrameId);
  }, [currentExercise]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      fontFamily: 'system-ui, sans-serif',
      maxWidth: 1000,
      margin: '0 auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 16
      }}>
        {Object.keys(EXERCISES).map(exercise => (
          <button 
            key={exercise}
            onClick={() => setCurrentExercise(exercise)}
            style={{
              padding: '10px 20px',
              background: currentExercise === exercise ? '#111' : '#f0f0f0',
              color: currentExercise === exercise ? '#fff' : '#000',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer'
            }}
          >
            {exercise}
          </button>
        ))}
      </div>

      <div style={{ 
        position: 'relative', 
        width: '100%', 
        maxWidth: 960,
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        borderRadius: 12,
        overflow: 'hidden'
      }}>
        <video 
          ref={videoRef} 
          style={{ display: 'none' }} 
          playsInline 
        />
        <canvas 
          ref={canvasRef}
          width={960}
          height={720}
          style={{ 
            width: '100%', 
            height: 'auto', 
            display: 'block' 
          }}
        />
        
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '10px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <strong>Exercise:</strong> {currentExercise}
          </div>
          <div>
            <strong>Score:</strong> {score.toFixed(0)}
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 16,
        width: '100%',
        background: '#f0f0f0',
        borderRadius: 8,
        padding: '15px',
        textAlign: 'left'
      }}>
        <h3 style={{ margin: 0, marginBottom: 10 }}>
          {currentExercise === "Walking Posture" ? "Posture Recommendations" : "Cues"}
        </h3>
        {currentExercise === "Walking Posture" && cues.length > 0 ? (
          <div>
            <h4 style={{ margin: '10px 0' }}>Improvement Areas:</h4>
            <ul style={{ marginTop: 0, paddingLeft: 20 }}>
              {cues.map((cue, index) => (
                <li key={index}>{cue}</li>
              ))}
            </ul>
            
            {/* @ts-ignore */}
            {result.recommendations && (
              <>
                <h4 style={{ margin: '10px 0' }}>Recommended Exercises:</h4>
                <ul style={{ marginTop: 0, paddingLeft: 20 }}>
                  {/* @ts-ignore */}
                  {result.recommendations.exercises.map((exercise, index) => (
                    <li key={index}>{exercise}</li>
                  ))}
                </ul>
                <div style={{ 
                  marginTop: 10, 
                  padding: 10, 
                  background: '#e0e0e0', 
                  borderRadius: 6 
                }}>
                  <strong>Prescription:</strong>
                  {/* @ts-ignore */}
                  {` ${result.recommendations.duration} minutes, ${result.recommendations.frequency}`}
                </div>
              </>
            )}
          </div>
        ) : (
          cues.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {cues.map((cue, index) => (
                <li key={index}>{cue}</li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, color: '#666' }}>Follow the exercise instructions</p>
          )
        )}
      </div>

      <div style={{
        marginTop: 16,
        width: '100%',
        textAlign: 'center',
        color: '#666'
      }}>
        {status}
      </div>
    </div>
  );
}
