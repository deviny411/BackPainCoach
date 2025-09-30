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
  }
};

// Posture assessment modes
const POSTURE_MODES: Record<string, { 
  name: string; 
  scoringFunction: (keypoints: KP[]) => { score: number; cues: string[] } 
}> = {
  "Walking": {
    name: "Walking Posture",
    scoringFunction: scoreWalkingPosture
  }
};

// Combine all modes for easier selection
const ALL_MODES = {
  ...EXERCISES,
  ...POSTURE_MODES
};

export default function Posher() {
  // State management
  const [activeTab, setActiveTab] = useState<'exercises' | 'posture'>('exercises');
  const [currentExercise, setCurrentExercise] = useState<string>("Hip Hinge");
  const [status, setStatus] = useState("Initializing...");
  const [score, setScore] = useState(0);
  const [cues, setCues] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // Refs for camera and detection
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<posedetection.PoseDetector | null>(null);

  // Camera and model initialization
  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;

    const initializeModel = async () => {
      try {
        // Reset readiness and existing detector
        setIsReady(false);
        if (detectorRef.current) {
          detectorRef.current.dispose();
          detectorRef.current = null;
        }

        setStatus("Initializing camera and AI model...");

        // Comprehensive camera access request
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: "user",
            width: { ideal: 960, max: 1280 },
            height: { ideal: 720, max: 1024 }
          },
          audio: false
        });

        const videoElement = videoRef.current;
        const canvasElement = canvasRef.current;

        if (!videoElement || !canvasElement) {
          console.error('Video or Canvas element not found');
          setStatus("Error: Video or Canvas element not initialized");
          return;
        }

        // Set up video element
        videoElement.srcObject = stream;
        
        videoElement.onloadedmetadata = async () => {
          try {
            await videoElement.play();

            // Initialize TensorFlow backend and pose detector
            await tf.setBackend("webgl");
            const detector = await posedetection.createDetector(
              posedetection.SupportedModels.MoveNet,
              { modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
            );
            
            if (cancelled) return;
            detectorRef.current = detector;

            // Mark as ready
            setIsReady(true);
            setStatus("Camera and AI model ready. Position yourself fully in the frame.");
          } catch (playError) {
            console.error('Error playing video or initializing detector:', playError);
            setStatus(`Initialization error: ${playError instanceof Error ? playError.message : 'Unknown error'}`);
          }
        };

      } catch (error) {
        console.error('Camera Initialization Error:', error);
        
        if (error instanceof DOMException) {
          switch (error.name) {
            case 'NotAllowedError':
              setStatus("Camera access denied. Please grant camera permissions.");
              break;
            case 'NotFoundError':
              setStatus("No camera found. Please connect a camera.");
              break;
            default:
              setStatus(`Camera error: ${error.message}`);
          }
        } else {
          setStatus(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    };

    // Initial call to initialize
    initializeModel();

    // Cleanup function
    return () => {
      cancelled = true;
      
      // Stop all tracks
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Dispose detector
      detectorRef.current?.dispose();
    };
  }, []);

  // Pose detection and rendering loop
  useEffect(() => {
    // Only start processing if ready
    if (!isReady) return;

    let animationFrameId: number;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const detector = detectorRef.current;

    if (!canvas || !video || !detector) {
      console.warn('Canvas, video, or detector not initialized');
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.warn('Could not get 2D rendering context');
      return;
    }

    const processFrame = async () => {
      try {
        // Always clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw video to canvas
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        // Detect poses
        const poses = await detector.estimatePoses(video, { 
          flipHorizontal: false,
          maxPoses: 1
        });

        const keypoints = poses[0]?.keypoints as KP[] | undefined;

        if (keypoints) {
          // Calculate scaling factors
          const scaleX = canvas.width / video.videoWidth;
          const scaleY = canvas.height / video.videoHeight;

          // Score the current exercise
          const exercise = ALL_MODES[currentExercise];
          
          let result = { score: 0, cues: ["Position your full body in frame"] };
          
          if (exercise) {
            result = exercise.scoringFunction(keypoints);
          }
          
          setScore(result.score);
          setCues(result.cues);

          // Draw keypoints
          ctx.fillStyle = "#00FF88";
          keypoints.forEach(kp => {
            if ((kp.score ?? 0) > 0.5) {
              ctx.beginPath();
              ctx.arc(
                kp.x * scaleX,
                kp.y * scaleY,
                5, 0, 2 * Math.PI
              );
              ctx.fill();
            }
          });

          // Restore optimal pose markers for non-posture modes
          if (EXERCISES[currentExercise]) {
            (EXERCISES[currentExercise] as ExerciseConfig).optimalPoseMarkers.forEach(marker => {
              ctx.strokeStyle = marker.color;
              ctx.lineWidth = 3;
            });
          }
        }
      } catch (error) {
        console.error("Error in pose detection:", error);
        setStatus(`Pose detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Continue animation loop
      animationFrameId = requestAnimationFrame(processFrame);
    };

    // Start the processing loop
    animationFrameId = requestAnimationFrame(processFrame);

    // Cleanup function
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [currentExercise, isReady]);

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

  // Render method
  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh',
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: '#f0f2f5'
    }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? 250 : 60,
        backgroundColor: '#fff',
        borderRight: '1px solid #e0e0e0',
        transition: 'width 0.3s ease',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Sidebar Toggle */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px',
          borderBottom: '1px solid #e0e0e0'
        }}>
          {sidebarOpen && <h2 style={{ margin: 0, fontSize: '1.2em' }}>Posher</h2>}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              marginLeft: 'auto'
            }}
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '10px 0'
        }}>
          <button 
            onClick={() => setActiveTab('exercises')}
            style={{
              padding: '10px 15px',
              textAlign: 'left',
              background: activeTab === 'exercises' ? '#e6f3ff' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <span style={{ marginRight: 10 }}>💪</span>
            {sidebarOpen && 'Exercises'}
          </button>
          <button 
            onClick={() => setActiveTab('posture')}
            style={{
              padding: '10px 15px',
              textAlign: 'left',
              background: activeTab === 'posture' ? '#e6f3ff' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <span style={{ marginRight: 10 }}>🧘</span>
            {sidebarOpen && 'Posture Assessment'}
          </button>
        </div>

        {/* Exercise/Posture Selection */}
        {sidebarOpen && (
          <div style={{
            flexGrow: 1,
            overflowY: 'auto',
            borderTop: '1px solid #e0e0e0',
            padding: '10px 0'
          }}>
            {activeTab === 'exercises' ? (
              Object.keys(EXERCISES).map(exercise => (
                <button 
                  key={exercise}
                  onClick={() => setCurrentExercise(exercise)}
                  style={{
                    width: '100%',
                    padding: '10px 15px',
                    textAlign: 'left',
                    background: currentExercise === exercise ? '#f0f0f0' : 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {exercise}
                </button>
              ))
            ) : (
              Object.keys(POSTURE_MODES).map(mode => (
                <button 
                  key={mode}
                  onClick={() => setCurrentExercise(mode)}
                  style={{
                    width: '100%',
                    padding: '10px 15px',
                    textAlign: 'left',
                    background: currentExercise === mode ? '#f0f0f0' : 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {mode} Posture
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div style={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column',
        padding: '20px',
        overflowY: 'auto'
      }}>
        {/* Camera and Canvas Container */}
        <div style={{ 
          position: 'relative', 
          width: '100%', 
          maxWidth: 960,
          margin: '0 auto',
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
          
          {/* Loading Overlay */}
          {!isReady && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.5)',
              color: 'white',
              zIndex: 10
            }}>
              <div style={{ 
                textAlign: 'center',
                padding: 20,
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: 10
              }}>
                <div style={{ 
                  width: 50, 
                  height: 50, 
                  border: '4px solid #f3f3f3',
                  borderTop: '4px solid #3498db',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 20px'
                }}></div>
                <p>{status}</p>
              </div>
            </div>
          )}
          
          {/* Status and Score Overlay */}
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
              <strong>Current Mode:</strong> {currentExercise}
            </div>
            <div>
              <strong>Score:</strong> {score.toFixed(0)}
            </div>
          </div>
        </div>

        {/* Cues and Recommendations */}
        <div style={{
          marginTop: 16,
          width: '100%',
          background: '#fff',
          borderRadius: 8,
          padding: '15px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          minHeight: 120, // Set a minimum height to prevent layout shifts
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ margin: 0, marginBottom: 10, color: '#333' }}>
            {activeTab === 'posture' ? 'Posture Recommendations' : 'Exercise Cues'}
          </h3>
          <div style={{ 
            flexGrow: 1, 
            display: 'flex', 
            alignItems: 'center',
            transition: 'opacity 0.3s ease' 
          }}>
            {cues.length > 0 ? (
              <ul style={{ 
                margin: 0, 
                paddingLeft: 20, 
                color: '#666',
                width: '100%'
              }}>
                {cues.map((cue, index) => (
                  <li 
                    key={index} 
                    style={{ 
                      marginBottom: 5, 
                      opacity: 1,
                      transition: 'opacity 0.3s ease'
                    }}
                  >
                    {cue}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ 
                margin: 0, 
                color: '#666',
                textAlign: 'center',
                width: '100%'
              }}>
                {status}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Add a global style for the spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
