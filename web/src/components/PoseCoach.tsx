import React, { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as posedetection from "@tensorflow-models/pose-detection";
import { scoreHipHinge } from "./exercises/scoreHipHinge";
import { scorePlank } from "./exercises/scorePlank";

type Keypoint = { x: number; y: number; name?: string; score?: number };

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 720;

export default function PoseCoach() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [detector, setDetector] = useState<posedetection.PoseDetector | null>(null);
  const [mode, setMode] = useState<"hinge" | "plank">("hinge");
  const [status, setStatus] = useState("Loading model…");
  const [lastCues, setLastCues] = useState<string[]>([]);
  const [lastScore, setLastScore] = useState(0);

  useEffect(() => {
    (async () => {
      await tf.setBackend("webgl");
      const det = await posedetection.createDetector(
        posedetection.SupportedModels.MoveNet,
        { modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
      );
      setDetector(det);

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      const v = videoRef.current!;
      v.srcObject = stream;
      v.onloadedmetadata = () => {
        v.play();
        setStatus("Step back 6–8 ft; full body in frame.");
      };
    })();
  }, []);

  useEffect(() => {
    let raf = 0;
    const render = async () => {
      const v = videoRef.current, c = canvasRef.current, det = detector;
      if (!det || !v || !c) { raf = requestAnimationFrame(render); return; }
      const videoReady = v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0;

      const ctx = c.getContext("2d")!;
      const dpr = Math.max(1, window.devicePixelRatio || 1);

      // lock canvas size once (hi-DPI aware)
      if (c.width !== CANVAS_WIDTH * dpr || c.height !== CANVAS_HEIGHT * dpr) {
        c.width = CANVAS_WIDTH * dpr;
        c.height = CANVAS_HEIGHT * dpr;
        c.style.width = `${CANVAS_WIDTH}px`;
        c.style.height = `${CANVAS_HEIGHT}px`;
      }

      // clear (in device pixels), then draw in CSS pixel coords
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (videoReady) {
        // draw video scaled to canvas
        ctx.drawImage(v, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // IMPORTANT: no flip here; match estimatePoses flip=false
        const poses = await det.estimatePoses(v, { flipHorizontal: false });
        const kp = poses[0]?.keypoints as Keypoint[] | undefined;

        if (kp) {
          // scale keypoints from video space -> canvas space
          const sx = CANVAS_WIDTH / v.videoWidth;
          const sy = CANVAS_HEIGHT / v.videoHeight;

          // draw points
          ctx.lineWidth = 2;
          ctx.fillStyle = "#00FF88";
          for (const k of kp) {
            if ((k.score ?? 0) > 0.45) {
              const x = k.x * sx;
              const y = k.y * sy;
              ctx.beginPath();
              ctx.arc(x, y, 5, 0, 2 * Math.PI);
              ctx.fill();
            }
          }

          const res = mode === "hinge" ? scoreHipHinge(kp) : scorePlank(kp);

          // HUD
          ctx.fillStyle = "rgba(0,0,0,.55)";
          ctx.fillRect(20, 20, 380, 110);
          ctx.fillStyle = "#fff";
          ctx.font = "18px system-ui, sans-serif";
          ctx.fillText(`Exercise: ${mode}`, 30, 48);
          ctx.fillText(`Form Score: ${res.score}`, 30, 72);
          res.cues.slice(0, 2).forEach((c, i) => ctx.fillText(`• ${c}`, 30, 100 + i * 22));

          setLastScore(res.score);
          setLastCues(res.cues);
        }
      } else {
        // waiting screen
        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#fff";
        ctx.font = "18px system-ui, sans-serif";
        ctx.fillText("Waiting for camera…", 30, 48);
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [detector, mode]);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
      <div style={{ margin: "12px" }}>
        <button onClick={() => setMode("hinge")}>Hip Hinge</button>
        <button onClick={() => setMode("plank")}>Plank</button>
      </div>
      <video ref={videoRef} playsInline style={{ display: "none" }} />
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          margin: "0 auto",
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,.25)",
          background: "#000",
        }}
      />
      <div style={{ marginTop: 10 }}>
        <b>{status}</b>
        <div><b>Latest cues:</b> {lastCues.length ? lastCues.join(" · ") : "—"}</div>
        <div><b>Score:</b> {lastScore}</div>
      </div>
    </div>
  );
}
