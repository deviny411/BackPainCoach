import React, { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as posedetection from "@tensorflow-models/pose-detection";
import { scoreHipHinge } from "./exercises/scoreHipHinge";
import { scorePlank } from "./exercises/scorePlank";

// Types
type Keypoint = { x: number; y: number; name?: string; score?: number };
type Mode = "hinge" | "plank";

// Fixed large canvas for reliable layout (change if you want bigger/smaller)
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 720;

// Add a new function to check joint visibility
function checkJointVisibility(kps: Keypoint[]): { allVisible: boolean; missingJoints: string[] } {
  const requiredJoints = [
    "left_shoulder", "right_shoulder", 
    "left_hip", "right_hip", 
    "left_knee", "right_knee", 
    "left_ankle", "right_ankle"
  ];

  const missingJoints = requiredJoints.filter(jointName => 
    !kps.some(kp => kp.name === jointName && (kp.score ?? 0) > 0.45)
  );

  return {
    allVisible: missingJoints.length === 0,
    missingJoints
  };
}

export default function PoseCoach({
  mode: controlledMode,
  onUpdate,
}: {
  /** Optional: drive PoseCoach externally. If omitted, user buttons will switch modes. */
  mode?: Mode;
  /** Optional: callback with latest (score, cues) each frame. */
  onUpdate?: (score: number, cues: string[]) => void;
}) {
  const [mode, setMode] = useState<Mode>(controlledMode ?? "hinge");
  const [status, setStatus] = useState("Loading model…");
  const [lastScore, setLastScore] = useState(0);
  const [lastCues, setLastCues] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<posedetection.PoseDetector | null>(null);

  // Keep internal mode in sync if a controlled prop is provided
  useEffect(() => {
    if (controlledMode) setMode(controlledMode);
  }, [controlledMode]);

  // Initialize backend, model, and camera
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await tf.setBackend("webgl");
        const detector = await posedetection.createDetector(
          posedetection.SupportedModels.MoveNet,
          { modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
        );
        if (cancelled) return;
        detectorRef.current = detector;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        const v = videoRef.current!;
        v.srcObject = stream;
        v.onloadedmetadata = () => {
          v.play();
          setStatus("Step back 6–8 ft; full body in frame. Good lighting helps.");
        };
      } catch (e) {
        console.error(e);
        setStatus("Camera or model failed to load. Check permissions and reload.");
      }
    })();

    return () => {
      cancelled = true;
      // optional: stop the camera on unmount
      const v = videoRef.current as HTMLVideoElement | null;
      const ms = v?.srcObject as MediaStream | null;
      ms?.getTracks().forEach((t) => t.stop());
      detectorRef.current?.dispose();
    };
  }, []);

  // Main render loop
  useEffect(() => {
    let raf = 0;

    const loop = async () => {
      const v = videoRef.current, c = canvasRef.current, det = detectorRef.current;
      if (!v || !c || !det) {
        raf = requestAnimationFrame(loop);
        return;
      }

      const ready = v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0;

      // Prepare canvas with Hi-DPI transform
      const ctx = c.getContext("2d")!;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      if (c.width !== CANVAS_WIDTH * dpr || c.height !== CANVAS_HEIGHT * dpr) {
        c.width = CANVAS_WIDTH * dpr;
        c.height = CANVAS_HEIGHT * dpr;
        c.style.width = `${CANVAS_WIDTH}px`;
        c.style.height = `${CANVAS_HEIGHT}px`;
      }
      // clear in device pixels
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      // switch to CSS-pixel space
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (ready) {
        // Draw video scaled to our canvas
        ctx.drawImage(v, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // IMPORTANT: no flip here; keep flipHorizontal false so coords match drawn video
        const poses = await det.estimatePoses(v, { flipHorizontal: false });
        const kp = poses[0]?.keypoints as Keypoint[] | undefined;

        if (kp) {
          // Map keypoints from native video space to canvas space
          const sx = CANVAS_WIDTH / v.videoWidth;
          const sy = CANVAS_HEIGHT / v.videoHeight;

          // Check joint visibility
          const { allVisible, missingJoints } = checkJointVisibility(kp);

          // Draw keypoints
          ctx.lineWidth = 2;
          ctx.fillStyle = allVisible ? "#00FF88" : "#FF4444";
          for (const k of kp) {
            if ((k.score ?? 0) > 0.45) {
              const x = k.x * sx;
              const y = k.y * sy;
              ctx.beginPath();
              ctx.arc(x, y, 5, 0, 2 * Math.PI);
              ctx.fill();
            }
          }

          // Score
          const result =
            mode === "hinge" ? scoreHipHinge(kp) :
            mode === "plank" ? scorePlank(kp) :
            { score: 0, cues: ["Unsupported mode"] };

          // HUD
          ctx.fillStyle = "rgba(0,0,0,.55)";
          ctx.fillRect(20, 20, 420, 150);
          ctx.fillStyle = "#fff";
          ctx.font = "18px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
          ctx.fillText(`Exercise: ${mode}`, 30, 50);
          ctx.fillText(`Form Score: ${result.score}`, 30, 76);
          
          // Joint visibility warning
          if (!allVisible) {
            ctx.fillStyle = "#FF4444";
            ctx.fillText("⚠️ Adjust position to show all joints:", 30, 104);
            missingJoints.slice(0, 2).forEach((joint, i) => {
              ctx.fillText(`• ${joint.replace('_', ' ')}`, 30, 130 + i * 22);
            });
            if (missingJoints.length > 2) {
              ctx.fillText(`+ ${missingJoints.length - 2} more`, 30, 156);
            }
          } else {
            // Original cues display
            result.cues.slice(0, 2).forEach((c, i) => {
              ctx.fillText(`• ${c}`, 30, 104 + i * 22);
            });
          }

          // Update React state sparingly
          if (result.score !== lastScore) setLastScore(result.score);
          const headCues = result.cues.slice(0, 2);
          if (JSON.stringify(headCues) !== JSON.stringify(lastCues.slice(0, 2))) {
            setLastCues(headCues);
          }
          onUpdate?.(result.score, result.cues);
        }
      } else {
        // Waiting overlay
        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#fff";
        ctx.font = "18px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillText("Waiting for camera… (allow permissions)", 30, 50);
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mode, onUpdate, lastCues, lastScore]);

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      {/* Top controls (hidden if component is controlled via prop) */}
      {!controlledMode && (
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <button
            onClick={() => setMode("hinge")}
            style={btnStyle(mode === "hinge")}
          >
            Hip Hinge
          </button>
          <button
            onClick={() => setMode("plank")}
            style={btnStyle(mode === "plank")}
          >
            Plank
          </button>
          <div style={{ marginLeft: "auto", color: "#666" }}>
            <b>Score:</b> {lastScore} {lastCues.map((c, i) => <span key={i} style={{ marginLeft: 8 }}>• {c}</span>)}
          </div>
        </div>
      )}

      {/* Hidden <video>, we render to the canvas */}
      <video ref={videoRef} playsInline style={{ display: "none" }} />

      {/* Main canvas */}
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          margin: "0 auto",
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,.25)",
          background: "#000",
          width: `${CANVAS_WIDTH}px`,
          height: `${CANVAS_HEIGHT}px`,
        }}
      />

      {/* Status line */}
      <div style={{ marginTop: 10, textAlign: "center", color: "#444" }}>
        {status}
      </div>
    </div>
  );
}

// Small helper for consistent buttons
function btnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #ddd",
    background: active ? "#111" : "#fff",
    color: active ? "#fff" : "#111",
    cursor: "pointer",
  };
}
