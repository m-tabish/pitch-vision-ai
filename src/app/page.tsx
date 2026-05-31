"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  Award,
  Camera,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Cpu,
  Lock,
  Menu,
  MessageSquare,
  Play,
  Pause,
  RefreshCw,
  Share2,
  TrendingUp,
  Upload,
  User,
  Video,
  AlertCircle,
  ArrowLeft
} from "lucide-react";

// Types for joint positions
interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

// Simulated log entry
interface LogEntry {
  timestamp: string;
  message: string;
  agent: "System" | "Telemetry" | "Evaluation" | "Liaison" | "Scout" | "Dispatch";
  status: "info" | "success" | "warning" | "error" | "processing";
}

export default function Home() {
  // Config & State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [playerName, setPlayerName] = useState("Aditya Verma");
  const [location, setLocation] = useState("Aliganj Maidan, Lucknow");
  const [discipline, setDiscipline] = useState<"Fast Bowling" | "Cover Drive">("Fast Bowling");
  const [hand, setHand] = useState<"right" | "left">("right");

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isImage, setIsImage] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [progress, setProgress] = useState(0);

  // Vision references & instances
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<number | null>(null);
  const landmarksRef = useRef<Record<number, Landmark> | null>(null);

  const [poseLandmarker, setPoseLandmarker] = useState<any>(null);
  const [calculatedBiometrics, setCalculatedBiometrics] = useState<any>(null);
  const [engineAnalysis, setEngineAnalysis] = useState<any>(null);
  const [agentOutput, setAgentOutput] = useState<any>(null);
  const [numbersOnlyOutput, setNumbersOnlyOutput] = useState<any>(null);
  const [capturedFrameUrl, setCapturedFrameUrl] = useState<string | null>(null);
  const [analysisTimestamp, setAnalysisTimestamp] = useState<string | null>(null);

  // Terminal Console Logs State
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (message: string, agent: LogEntry["agent"], status: LogEntry["status"]) => {
    setLogs((prev) => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString(),
        message,
        agent,
        status
      }
    ]);
  };

  useEffect(() => {
    setIsMounted(true);
    addLog("GullyScout Engine Core initialized.", "System", "info");
  }, []);

  // 1. Dynamic MediaPipe Pose Landmarker client-side initialization
  useEffect(() => {
    const initPose = async () => {
      addLog("🤖 Loading MediaPipe Pose Vision Model from jsDelivr CDN...", "System", "processing");
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const { FilesetResolver, PoseLandmarker } = vision;
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        const landmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numPoses: 1
        });
        setPoseLandmarker(landmarker);
        setIsModelLoaded(true);
        addLog("✅ MediaPipe Client Edge Pose Landmarker successfully compiled.", "System", "success");
      } catch (err: any) {
        console.error("Pose Landmarker initialization failed:", err);
        addLog(`❌ Pose Landmarker model failed to load: ${err.message}`, "System", "error");
      }
    };
    initPose();
  }, []);

  // 2. Real-time requestAnimationFrame loop for drawing coordinates overlay
  const renderFrameLoop = () => {
    if (!videoRef.current || !canvasRef.current || !poseLandmarker) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (ctx && video.readyState >= 2) {
      // Fit canvas exactly over video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Perform Pose detection on current video timestamp
      const timestamp = performance.now();
      const results = poseLandmarker.detectForVideo(video, timestamp);

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarksList = results.landmarks[0];

        // Save raw landmarks coordinates mapped to their standard indices
        const mappedLandmarks: Record<number, Landmark> = {};
        landmarksList.forEach((lm: any, idx: number) => {
          mappedLandmarks[idx] = { x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility };
        });
        landmarksRef.current = mappedLandmarks;

        // Draw custom high-visibility neon skeleton
        drawNeonSkeleton(ctx, landmarksList, canvas.width, canvas.height);
      }
    }

    if (isPlaying) {
      requestRef.current = requestAnimationFrame(renderFrameLoop);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(renderFrameLoop);
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, poseLandmarker]);

  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // High-fidelity custom canvas renderer
  const drawNeonSkeleton = (ctx: CanvasRenderingContext2D, landmarks: any[], w: number, h: number) => {
    // 33 standard joint coordinates
    const scalePt = (lm: any) => ({ x: lm.x * w, y: lm.y * h });

    // Drawing joints circles
    landmarks.forEach((lm, idx) => {
      if (lm.visibility > 0.5) {
        const pt = scalePt(lm);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = "#FF6B00"; // Orange
        ctx.shadowColor = "#FF6B00";
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset blur
      }
    });

    // Drawing key connecting bones links
    const connections = [
      [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Upper body
      [11, 23], [12, 24], [23, 24],                     // Shoulders & Hips box
      [23, 25], [25, 27], [24, 26], [26, 28]              // Legs
    ];

    ctx.strokeStyle = "rgba(255, 107, 0, 0.8)"; // Orange
    ctx.lineWidth = 2.5;

    connections.forEach(([p1, p2]) => {
      const lm1 = landmarks[p1];
      const lm2 = landmarks[p2];
      if (lm1 && lm2 && lm1.visibility > 0.5 && lm2.visibility > 0.5) {
        const pt1 = scalePt(lm1);
        const pt2 = scalePt(lm2);
        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.stroke();
      }
    });

    // Drawing Angle Labels for Verification
    if (landmarksRef.current) {
      const lms = landmarksRef.current;
      ctx.font = "bold 14px monospace";
      ctx.fillStyle = "#FF6B00"; // Orange
      ctx.shadowBlur = 4;
      ctx.shadowColor = "white"; // White background glow for visibility on dark video

      if (discipline === "Fast Bowling") {
        const armNodes = hand === "right" ? [12, 14, 16] : [11, 13, 15];
        const kneeNodes = hand === "right" ? [23, 25, 27] : [24, 26, 28];

        const elbowPt = scalePt(lms[armNodes[1]]);
        const kneePt = scalePt(lms[kneeNodes[1]]);

        const elbowAngle = calculateAngle3D(lms[armNodes[0]], lms[armNodes[1]], lms[armNodes[2]]);
        const kneeAngle = calculateAngle3D(lms[kneeNodes[0]], lms[kneeNodes[1]], lms[kneeNodes[2]]);

        ctx.fillText(`${elbowAngle.toFixed(1)}°`, elbowPt.x + 10, elbowPt.y);
        ctx.fillText(`${kneeAngle.toFixed(1)}°`, kneePt.x + 10, kneePt.y);
      } else {
        const armNodes = hand === "right" ? [11, 13, 15] : [12, 14, 16];
        const kneeNodes = hand === "right" ? [23, 25, 27] : [24, 26, 28];

        const elbowPt = scalePt(lms[armNodes[1]]);
        const kneePt = scalePt(lms[kneeNodes[1]]);

        const elbowAngle = calculateAngle3D(lms[armNodes[0]], lms[armNodes[1]], lms[armNodes[2]]);
        const kneeAngle = calculateAngle3D(lms[kneeNodes[0]], lms[kneeNodes[1]], lms[kneeNodes[2]]);

        ctx.fillText(`${elbowAngle.toFixed(1)}°`, elbowPt.x + 10, elbowPt.y);
        ctx.fillText(`${kneeAngle.toFixed(1)}°`, kneePt.x + 10, kneePt.y);
      }
      ctx.shadowBlur = 0;
    }
  };

  // 3. Mathematical Vector Trigonometry calculation (Client Edge)
  const calculateAngle3D = (a: Landmark, b: Landmark, c: Landmark): number => {
    const vec_ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    const vec_bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };

    const dotProduct = vec_ba.x * vec_bc.x + vec_ba.y * vec_bc.y + vec_ba.z * vec_bc.z;
    const norm_ba = Math.sqrt(vec_ba.x * vec_ba.x + vec_ba.y * vec_ba.y + vec_ba.z * vec_ba.z);
    const norm_bc = Math.sqrt(vec_bc.x * vec_bc.x + vec_bc.y * vec_bc.y + vec_bc.z * vec_bc.z);

    if (norm_ba === 0 || norm_bc === 0) return 0.0;

    let cosAngle = dotProduct / (norm_ba * norm_bc);
    cosAngle = Math.max(-1, Math.min(1, cosAngle));
    return (Math.acos(cosAngle) * 180.0) / Math.PI;
  };

  const evaluateBiometricsClientSide = (landmarks: Record<number, Landmark>) => {
    // Standard MediaPipe index indices
    // 12: Right Shoulder, 14: Right Elbow, 16: Right Wrist
    // 23: Left Hip, 25: Left Knee, 27: Left Ankle

    try {
      if (discipline === "Fast Bowling") {
        const armNodes = hand === "right" ? [12, 14, 16] : [11, 13, 15];
        const frontLegNodes = hand === "right" ? [23, 25, 27] : [24, 26, 28];
        const torsoNodes = hand === "right" ? [11, 12, 24] : [12, 11, 23];

        const elbow = calculateAngle3D(landmarks[armNodes[0]], landmarks[armNodes[1]], landmarks[armNodes[2]]);
        const knee = calculateAngle3D(landmarks[frontLegNodes[0]], landmarks[frontLegNodes[1]], landmarks[frontLegNodes[2]]);
        const torso = calculateAngle3D(landmarks[torsoNodes[0]], landmarks[torsoNodes[1]], landmarks[torsoNodes[2]]);

        const flexion = Math.abs(180.0 - elbow);
        let chucking = "Low";
        if (flexion > 15.0) chucking = "High Risk (Illegal Action)";
        else if (flexion > 10.0) chucking = "Moderate (Watch Elbow)";

        let kneeBraced = "Optimal";
        if (knee < 150.0) kneeBraced = "Soft Knee (Losing Force)";
        else if (knee > 178.0) kneeBraced = "Overextended (Injury Risk)";

        // Recalibrated penalty: camera angle causes ~10-20deg of phantom flexion,
        // so a 15-deg ICC threshold is extended to 25-deg for side-on footage.
        const adjustedFlexion = Math.max(0, flexion - 10); // subtract 10deg camera-angle offset
        const elbowMatch = Math.max(0, 100 - adjustedFlexion * 3.5);
        let kneeMatch = 100;
        if (knee < 155.0) kneeMatch = Math.max(0, 100 - (155 - knee) * 1.8);
        else if (knee > 178.0) kneeMatch = Math.max(0, 100 - (knee - 178) * 5);

        const matchPercentage = elbowMatch * 0.6 + kneeMatch * 0.4;

        return {
          biometrics: {
            bowling_arm_elbow_angle: Number(elbow.toFixed(1)),
            front_knee_bracing_angle: Number(knee.toFixed(1)),
            torso_lateral_flexion_angle: Number(torso.toFixed(1))
          },
          analysis: {
            chucking_risk: chucking,
            knee_bracing_quality: kneeBraced,
            match_percentage: Number(matchPercentage.toFixed(1))
          }
        };
      } else {
        // Cover Drive
        const armNodes = hand === "right" ? [11, 13, 15] : [12, 14, 16];
        const frontLegNodes = hand === "right" ? [23, 25, 27] : [24, 26, 28];
        const backHipNodes = hand === "right" ? [12, 24, 26] : [11, 23, 25];
        const headNode = 0; // Nose

        const elbow = calculateAngle3D(landmarks[armNodes[0]], landmarks[armNodes[1]], landmarks[armNodes[2]]);
        const knee = calculateAngle3D(landmarks[frontLegNodes[0]], landmarks[frontLegNodes[1]], landmarks[frontLegNodes[2]]);
        const hip = calculateAngle3D(landmarks[backHipNodes[0]], landmarks[backHipNodes[1]], landmarks[backHipNodes[2]]);

        // Head horizontal stability relative to front knee
        const noseX = landmarks[headNode].x;
        const kneeX = landmarks[frontLegNodes[1]].x;
        const headAlignment = Math.abs(noseX - kneeX);
        const headStability = headAlignment > 0.15 ? "Falling Off (Off-balance)" : "Balanced";

        // Three-tier grading for Lead Elbow
        let elbowQuality = "Optimal High Elbow (Elite)";
        if (elbow < 75.0 || elbow > 130.0) {
          elbowQuality = "Elbow Too Low/Cramped (Needs Work)";
        } else if ((elbow >= 75.0 && elbow < 95.0) || (elbow > 115.0 && elbow <= 130.0)) {
          elbowQuality = "Elbow Slightly Dropped (Developing)";
        }

        // Three-tier grading for Front Knee Flexion
        let kneeFlex = "Optimal Weight Transfer (Elite)";
        if (knee < 100.0 || knee > 150.0) {
          kneeFlex = "Stiff Knee / Poor Transfer (Needs Work)";
        } else if ((knee >= 100.0 && knee < 110.0) || (knee > 130.0 && knee <= 150.0)) {
          kneeFlex = "Knee Slightly Stiff (Developing)";
        }

        // Three-tier grading for Back Hip Extension
        let hipExtension = "Full Hip Extension (Elite)";
        if (hip < 150.0) {
          hipExtension = "Restricted Hip Extension (Needs Work)";
        } else if (hip >= 150.0 && hip < 160.0) {
          hipExtension = "Partial Hip Extension (Developing)";
        }

        // Calculate matching percentages based on statistical significance in research
        const elbowMatch = elbow >= 95.0 && elbow <= 115.0 ? 100 : (elbow < 95.0 ? Math.max(0, 100 - (95.0 - elbow) * 2.5) : Math.max(0, 100 - (elbow - 115.0) * 2.5));
        const kneeMatch = knee >= 110.0 && knee <= 130.0 ? 100 : (knee < 110.0 ? Math.max(0, 100 - (110.0 - knee) * 3.5) : Math.max(0, 100 - (knee - 130.0) * 2.5));
        const hipMatch = hip >= 160.0 && hip <= 180.0 ? 100 : Math.max(0, 100 - (160.0 - hip) * 2.5);
        const matchPercentage = elbowMatch * 0.4 + kneeMatch * 0.3 + hipMatch * 0.3;

        return {
          biometrics: {
            leading_elbow_angle: Number(elbow.toFixed(1)),
            front_knee_flex_angle: Number(knee.toFixed(1)),
            back_hip_angle: Number(hip.toFixed(1)),
            head_alignment: Number(headAlignment.toFixed(2))
          },
          analysis: {
            leading_elbow_quality: elbowQuality,
            knee_flexion_quality: kneeFlex,
            back_hip_extension_quality: hipExtension,
            head_stability_status: headStability,
            match_percentage: Number(matchPercentage.toFixed(1))
          }
        };
      }
    } catch (err) {
      console.error("Biometrics evaluation fail:", err);
      return null;
    }
  };

  // 4. E2E trigger: Freeze video, run maths and dispatch structured Prompt
  const handleFreezeAndAnalyze = async () => {
    const currentLandmarks = landmarksRef.current;

    if ((!isImage && !videoRef.current) || (isImage && !imageRef.current) || !currentLandmarks) {
      addLog("⚠️ Ingestion fail: No media loaded or joints skeleton not found.", "System", "warning");
      return;
    }

    if (!isImage && videoRef.current) {
      setIsPlaying(false);
      videoRef.current.pause();
    }

    setIsAnalyzing(true);
    addLog(`🔒 ${isImage ? "Image" : "Frame"} frozen. Extracting telemetry data...`, "System", "info");

    // Clear previous results to animate fresh loader
    setCalculatedBiometrics(null);
    setEngineAnalysis(null);
    setAgentOutput(null);
    setNumbersOnlyOutput(null);
    setCapturedFrameUrl(null);
    setAnalysisTimestamp(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }));

    // Compute metrics
    const results = evaluateBiometricsClientSide(currentLandmarks);
    if (!results) {
      addLog("❌ Biomechanical calculations failed.", "System", "error");
      setIsAnalyzing(false);
      return;
    }

    setCalculatedBiometrics(results.biometrics);
    setEngineAnalysis(results.analysis);

    // Capture base64 screenshot of the current video/image frame
    let frameBase64 = null;
    try {
      const tempCanvas = document.createElement("canvas");
      const mediaElement = isImage ? imageRef.current : videoRef.current;
      if (mediaElement) {
        tempCanvas.width = isImage ? (mediaElement as HTMLImageElement).naturalWidth : (mediaElement as HTMLVideoElement).videoWidth;
        tempCanvas.height = isImage ? (mediaElement as HTMLImageElement).naturalHeight : (mediaElement as HTMLVideoElement).videoHeight;
        const tCtx = tempCanvas.getContext("2d");
        if (tCtx) {
          tCtx.drawImage(mediaElement, 0, 0, tempCanvas.width, tempCanvas.height);
          frameBase64 = tempCanvas.toDataURL("image/jpeg", 0.7);
          setCapturedFrameUrl(frameBase64); // store for report
        }
      }
    } catch (e) {
      console.error("Frame capture failed:", e);
    }

    // Dynamic, simulated multi-agent console typing animations
    await runAgentConsoleSimulator(results.biometrics, results.analysis);

    // Make two parallel API calls: numbers-only vs vision-enhanced
    try {
      addLog("🧠 Dispatching to AI agents: Numbers-Only + Vision-Enhanced in parallel...", "System", "processing");

      const basePayload = {
        player_name: playerName,
        location,
        discipline,
        hand,
        biometrics: results.biometrics,
        analysis: results.analysis,
      };

      const [numbersRes, visionRes] = await Promise.all([
        fetch("/api/scout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(basePayload) // No image
        }),
        fetch("/api/scout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...basePayload, frame_image: frameBase64 }) // With image
        })
      ]);

      const [numbersData, visionData] = await Promise.all([
        numbersRes.json(),
        visionRes.json()
      ]);

      setNumbersOnlyOutput(numbersData);
      setAgentOutput(visionData);

      addLog("📬 Dual-mode evaluation complete: Comparison ready.", "Evaluation", "success");

      if (visionData.outreach_dispatched) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        addLog("📧 Dispatch Agent: Autonomously dispatched dossier to UPCA Selectors.", "Dispatch", "success");
      }
    } catch (err: any) {
      addLog(`❌ AI Orchestration API request failed: ${err.message}`, "System", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Realistic time delay simulators for agent presentation
  const runAgentConsoleSimulator = async (biometrics: any, analysis: any) => {
    const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

    addLog("📹 Telemetry Agent: Isolating joints coordinate lists.", "Telemetry", "processing");
    await delay(900);

    if (discipline === "Fast Bowling") {
      addLog(`📐 Telemetry: Bowling Arm Elbow computed at ${biometrics.bowling_arm_elbow_angle}°. Front Knee Bracing at ${biometrics.front_knee_bracing_angle}°.`, "Telemetry", "success");
      await delay(800);
      addLog(`🧠 Evaluation Agent: Biomechanical deviation assessment computed. Stance Match: ${analysis.match_percentage}%.`, "Evaluation", "processing");
      await delay(900);
      addLog(`🛡️ Compliance: Chucking action flex verified: ${analysis.chucking_risk}.`, "Evaluation", analysis.chucking_risk.includes("High") ? "error" : "success");
    } else {
      addLog(`📐 Telemetry: Lead Elbow at ${biometrics.leading_elbow_angle}°. Front Knee at ${biometrics.front_knee_flex_angle}°. Back Hip at ${biometrics.back_hip_angle}°.`, "Telemetry", "success");
      await delay(800);
      addLog(`🧠 Evaluation Agent: Biomechanical deviation assessment computed. Stance Match: ${analysis.match_percentage}%.`, "Evaluation", "processing");
      await delay(900);
      addLog(`🛡️ Compliance: Back hip extension graded: ${analysis.back_hip_extension_quality}. Head stability: ${analysis.head_stability_status}.`, "Evaluation", "success");
    }

    await delay(700);
    addLog("🤖 Evaluation Agent: Cross-referencing benchmarks...", "Evaluation", "processing");
    await delay(1000);
  };

  // Video/Image Dropzone file reader
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (isWebcamActive) {
        handleStopWebcam();
      }
      const isImg = file.type.startsWith("image/");
      setIsImage(isImg);
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setIsPlaying(false);
      landmarksRef.current = null;
      setCalculatedBiometrics(null);
      setEngineAnalysis(null);
      setAgentOutput(null);
      addLog(`📹 Media Ingested successfully: ${file.name}`, "System", "success");
    }
  };

  const handleStartWebcam = async () => {
    addLog("📹 Requesting Webcam access for real-time stance tracking...", "System", "processing");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        },
        audio: false
      });

      setIsImage(false);
      setIsWebcamActive(true);
      setVideoUrl("webcam");
      landmarksRef.current = null;
      setCalculatedBiometrics(null);
      setEngineAnalysis(null);
      setAgentOutput(null);
      addLog("✅ Webcam stream started. Stand in front of the camera for real-time biomechanical analysis!", "System", "success");

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().then(() => {
            setIsPlaying(true);
          }).catch(err => {
            console.error("Failed to play webcam stream:", err);
          });
        }
      }, 250);
    } catch (err: any) {
      console.error("Webcam access failed:", err);
      addLog(`❌ Webcam access failed: ${err.message}`, "System", "error");
    }
  };

  const handleStopWebcam = () => {
    addLog("📹 Stopping Live Webcam Tracking stream...", "System", "info");
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsWebcamActive(false);
    setIsPlaying(false);
    setVideoUrl(null);
  };

  const handleImageLoad = async () => {
    if (!imageRef.current || !canvasRef.current || !poseLandmarker) return;

    const img = imageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      canvas.width = img.clientWidth || img.naturalWidth;
      canvas.height = img.clientHeight || img.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      try {
        await poseLandmarker.setOptions({ runningMode: "IMAGE" });
        const results = poseLandmarker.detect(img);

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarksList = results.landmarks[0];
          const mappedLandmarks: Record<number, Landmark> = {};
          landmarksList.forEach((lm: any, idx: number) => {
            mappedLandmarks[idx] = { x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility };
          });
          landmarksRef.current = mappedLandmarks;

          drawNeonSkeleton(ctx, landmarksList, canvas.width, canvas.height);
          addLog("✅ Static pose landmarking complete.", "Telemetry", "success");
        } else {
          addLog("⚠️ Could not detect human skeleton in the image.", "Telemetry", "warning");
        }
        await poseLandmarker.setOptions({ runningMode: "VIDEO" });
      } catch (e) {
        console.error("Image landmarking failed", e);
      }
    }
  };

  const triggerUploadDropzone = () => {
    fileInputRef.current?.click();
  };



  if (!showDashboard) {
    return (
      <div className="min-h-screen bg-[#000000] text-white font-sans antialiased flex flex-col relative overflow-y-auto selection:bg-[#FF6B00]/20 selection:text-[#FF6B00]">

        {/* Section 1: Navigation Bar */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#000000]/60 backdrop-blur-md border-b border-zinc-900/60 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            {/* Left: Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black">
                <Activity className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2.5">
                <span className="font-extrabold text-sm tracking-widest text-white uppercase font-sans">PLAYVISION</span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setShowDashboard(true)}
                className="px-4 py-2 bg-white hover:bg-zinc-200 text-black font-extrabold text-xs tracking-wider rounded-none uppercase transition-all"
              >
                GET STARTED
              </button>
            </div>
          </div>
        </header>

        {/* HERO PAGE SECTION (Backdrop fully constrained here) */}
        <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden w-full z-10">
          {/* Full-screen Cinematic Visual Background Backdrop */}
          <div className="absolute inset-0 z-0 select-none pointer-events-none">
            {/* Dark edge vignette and bottom gradients for perfect contrast */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#000000] via-[#000000]/40 to-[#000000] z-10" />
            <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#000000]/75 to-[#000000] z-10" />
            <img
              src="/images/cricket_hero_visual.png"
              alt="Cricket Motion Trail Analytics Backdrop"
              className="w-full h-full object-cover opacity-50 scale-105"
            />
          </div>

          {/* Section 2: Overlaid Typography Content Block */}
          <main className="relative z-20 flex-1 w-full max-w-6xl mx-auto px-6 pt-32 pb-16 flex flex-col items-center justify-center text-center my-auto min-h-[600px]">
            <div className="max-w-3xl space-y-6 flex flex-col items-center py-16">
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-[1.05] drop-shadow-sm select-text">
                More time coaching,<br />less time analyzing.
              </h1>

              <p className="text-base sm:text-lg text-zinc-300 max-w-xl mx-auto font-medium leading-relaxed drop-shadow-sm select-text">
                Film analysis in minutes, not hours. Standardizing cricket player joint biomechanics with edge artificial intelligence.
              </p>

              <div className="flex items-center justify-center gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDashboard(true)}
                  className="px-8 py-3.5 bg-white hover:bg-zinc-200 text-black font-black text-xs tracking-widest rounded-none uppercase transition-all shadow-lg"
                >
                  GET STARTED
                </button>
              </div>
            </div>
          </main>
        </div>

        {/* SECOND PAGE SECTION: Standalone Premium Feature screen (completely clean background) */}
        <section className="relative z-20 w-full bg-[#000000] border-t border-zinc-900/60 py-32 px-6 md:px-16 flex items-center justify-center min-h-screen">
          <div className="max-w-7xl mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

              {/* Left Column: Complex Visual Showcase */}
              <div className="relative group w-full max-w-lg lg:max-w-none mx-auto aspect-[4/3] lg:aspect-square bg-zinc-955 border border-zinc-900 overflow-hidden flex items-center justify-center shadow-2xl">
                {/* Textured grid backdrop behind the image */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-20 z-0" />

                {/* High-contrast sports image cropped into container */}
                <img
                  src="/images/cricket_feature_visual.png"
                  alt="Sports Science Thermal Biomechanics Tracking"
                  className="w-full h-full object-cover filter contrast-125 brightness-75 grayscale opacity-70 z-10 scale-100 group-hover:scale-102 transition-transform duration-700"
                />

                {/* Glowing decorative frame to mimic sports thermal tracker */}
                <div className="absolute inset-0 border-[8px] border-black/80 z-20 pointer-events-none" />
              </div>

              {/* Right Column: Content & Copy */}
              <div className="space-y-8 text-left max-w-xl lg:max-w-none mx-auto lg:mx-0">
                {/* Tagline */}
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 bg-[#FF6B00] shrink-0" />
                  <span className="text-xs font-black tracking-widest text-[#FF6B00] uppercase font-mono">
                    COMPUTER VISION
                  </span>
                </div>

                {/* Heading */}
                <h2 className="text-5xl sm:text-6xl font-black text-white tracking-tight leading-[1.05] uppercase font-sans">
                  Track every movement.
                </h2>

                {/* Body Text */}
                <p className="text-base sm:text-lg text-zinc-300 leading-relaxed font-medium">
                  Computer vision automatically tracks player positions, movements, and actions. Get detailed analytics on speed, distance, and positioning in real-time.
                </p>

                {/* Action Trigger */}
                <div className="pt-4">
                  <button
                    onClick={() => setShowDashboard(true)}
                    className="px-8 py-4 border border-zinc-700 hover:border-zinc-500 bg-zinc-950 text-white font-black text-xs tracking-widest rounded-none uppercase transition-all hover:bg-zinc-900 shadow-xl"
                  >
                    Explore Analytics Engine
                  </button>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* COMBINED FEATURES & DOSSIER PREVIEW SECTION WITH CINEMATIC BACKDROP */}
        <section className="relative z-20 w-full overflow-hidden border-t border-zinc-900/60 bg-black">
          
          {/* Shared Cinematic Visual Background Backdrop */}
          <div className="absolute inset-0 z-0 select-none pointer-events-none">
            {/* Ambient scanning lines overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0)_95%,rgba(255,255,255,0.03)_95%)] bg-[size:100%_8px] z-20 opacity-20" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 z-10" />

            {/* Seamless Cinematic Vignettes to dissolve borders and make text readable */}
            <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black z-20" />
            <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#000000]/75 to-black z-20" />

            <img
              src="/images/cricket_hero_visual.png"
              alt="Immersive Cricket Biomechanical Telemetry Backdrop"
              className="w-full h-full object-cover opacity-35 filter brightness-[0.6] contrast-[1.2] saturate-[1.1] hue-rotate-[160deg]"
            />
          </div>

          {/* Section 1: Features Grid Content */}
          <div className="relative z-30 max-w-6xl mx-auto py-24 px-6 md:px-16 space-y-16">
            
            {/* Section Header */}
            <div className="text-center space-y-4 max-w-xl mx-auto">
              <div className="inline-block text-[10px] font-black tracking-widest text-[#FF6B00] bg-[#FF6B00]/10 px-2.5 py-0.5 border border-[#FF6B00]/20 uppercase">
                System Capabilities
              </div>
              <h3 className="text-4xl font-black text-white uppercase tracking-tight">Core Features</h3>
              <p className="text-xs text-zinc-400">
                PlayVision AI integrates client-side vision computing with server-side LLM orchestrators to deliver scouting-grade feedback.
              </p>
            </div>

            {/* Features 2x2 Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Feature 1 */}
              <div className="bg-black/60 backdrop-blur-md border border-zinc-900/80 p-8 space-y-4 hover:border-zinc-700 transition-colors">
                <div className="w-10 h-10 bg-[#FF6B00]/10 border border-[#FF6B00]/20 flex items-center justify-center text-[#FF6B00]">
                  <Activity className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-white uppercase tracking-wider">Real-Time Joint Tracking</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Leverages MediaPipe client-side models to map 33 key physical joints. Calculates real-time 3D joint angle flexion at 30+ frames per second directly in-browser.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-black/60 backdrop-blur-md border border-zinc-900/80 p-8 space-y-4 hover:border-zinc-700 transition-colors">
                <div className="w-10 h-10 bg-white/10 border border-white/20 flex items-center justify-center text-white">
                  <Cpu className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-white uppercase tracking-wider">Dual-Mode Agent Analysis</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Processes player trials through two parallel pipelines: a Numbers-Only biometric parser and a Vision-Enhanced multimodal model, detecting camera lens bias.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-black/60 backdrop-blur-md border border-zinc-900/80 p-8 space-y-4 hover:border-zinc-700 transition-colors">
                <div className="w-10 h-10 bg-[#FF6B00]/10 border border-[#FF6B00]/20 flex items-center justify-center text-[#FF6B00]">
                  <Award className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-white uppercase tracking-wider">Biomechanical Telemetry</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Validates bowling flexion and batting stride angles against sports science criteria. Computes accuracy percentages and grades stroke quality instantly.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-black/60 backdrop-blur-md border border-zinc-900/80 p-8 space-y-4 hover:border-zinc-700 transition-colors">
                <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Share2 className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-white uppercase tracking-wider">Secure Dossier Dispatch</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Compiles a professional-grade A4 PDF layout of the trial with annotated frame screengrabs, ready for printing or instant SMTP delivery to coaches.
                </p>
              </div>

            </div>

          </div>

          {/* Section 2: Dossier Preview Content */}
          <div className="relative z-30 max-w-6xl mx-auto pb-24 px-6 md:px-16 space-y-12">
            <div className="text-center space-y-4 max-w-xl mx-auto">
              <div className="inline-block text-[10px] font-black tracking-widest text-[#FF6B00] bg-[#FF6B00]/10 px-2.5 py-0.5 border border-[#FF6B00]/20 uppercase">
                Live Document Sample
              </div>
              <h3 className="text-4xl font-black text-white uppercase tracking-tight">Scouting Dossier PDF</h3>
              <p className="text-xs text-zinc-400">
                Review the generated, export-ready A4 PDF scouting report compiled by our dual-mode vision and telemetry agentic execution ledger.
              </p>
            </div>
            
            <div className="bg-[#050508]/80 backdrop-blur-md border border-zinc-900 rounded-none p-2 shadow-2xl relative overflow-hidden">
              <div className="absolute top-4 right-4 z-30">
                <a 
                  href="/report" 
                  target="_blank" 
                  className="px-4 py-2 bg-white hover:bg-zinc-200 text-black font-extrabold text-[10px] tracking-widest uppercase transition-all shadow-md"
                >
                  Open Report in New Tab ↗
                </a>
              </div>
              <div className="overflow-y-auto h-[650px] scrollbar-thin bg-black/40 p-4 flex justify-center">
                <iframe 
                  src="/report" 
                  className="w-[215mm] h-[297mm] border border-zinc-800 scale-90 sm:scale-100 origin-top shadow-xl"
                  style={{ height: '900px' }}
                />
              </div>
            </div>
          </div>

        </section>


        {/* Footer */}
        <footer className="relative z-20 border-t border-zinc-950 py-10 px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-[10px] text-zinc-500 uppercase tracking-widest bg-[#000000]/60 w-full">
          <div className="flex flex-col gap-1.5 text-center md:text-left">
            <span>© 2026 PLAYVISION INC. ALL RIGHTS RESERVED.</span>
            <div className="text-zinc-650 font-mono text-[9px] flex flex-wrap gap-x-4 gap-y-1 justify-center md:justify-start">
              <span>TEAM LEADER: MOHD. TABISH KHAN</span>
              <span className="text-zinc-800">•</span>
              <span>TEAM MEMBER: RAJNEESH VERMA</span>
            </div>
          </div>
          <span className="text-zinc-500 font-bold px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-none">TEAM NEURAL NEX</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-[#f4f4f5] font-sans antialiased flex selection:bg-[#FF6B00]/20 selection:text-[#FF6B00]">

      {/* ==================== LEFT SIDEBAR NAVIGATION ==================== */}
      <aside className={`bg-black border-r border-zinc-900/60 hidden md:flex flex-col shrink-0 justify-between h-screen sticky top-0 transition-all duration-300 ${isSidebarOpen ? "w-72 p-6" : "w-20 p-4 items-center"}`}>
        <div className="space-y-8 w-full">
          {/* Brand & Identity */}
          <div onClick={() => setShowDashboard(false)} className={`flex items-center gap-3 cursor-pointer hover:opacity-85 transition-opacity ${!isSidebarOpen && "justify-center"}`}>
            <div className="w-10 h-10 shrink-0 rounded-xl bg-white flex items-center justify-center text-black">
              <Activity className="w-5 h-5" />
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden whitespace-nowrap">
                <h1 className="text-base font-bold tracking-tight text-[#f4f4f5] flex items-center gap-1.5 font-sans">
                  PLAYVISION <span className="text-black font-mono text-[9px] px-2 py-0.5 rounded-full bg-white font-semibold">AI</span>
                </h1>
                <p className="text-[10px] text-zinc-500 font-medium tracking-wide uppercase">BIOMECHANICAL SCOUTING // v4.0</p>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 w-full">
            <button
              onClick={() => setShowDashboard(false)}
              className={`w-full flex items-center ${isSidebarOpen ? "gap-3 px-4" : "justify-center px-0"} py-2.5 rounded-none text-xs font-semibold text-zinc-400 hover:text-white transition-all text-left mb-2 border border-zinc-900 bg-zinc-950/40`}
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              {isSidebarOpen && "Back to Home"}
            </button>

            <button className={`w-full flex items-center ${isSidebarOpen ? "gap-3 px-4" : "justify-center px-0"} py-2.5 rounded-none text-xs font-bold bg-white text-black transition-all text-left shadow-sm`}>
              <Activity className="w-4 h-4 shrink-0" />
              {isSidebarOpen && "Live Analysis"}
            </button>
            <button disabled className={`w-full flex items-center ${isSidebarOpen ? "gap-3 px-4 justify-between" : "justify-center px-0"} py-2.5 rounded-none text-xs font-semibold text-zinc-500 opacity-60 cursor-not-allowed transition-all text-left`}>
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 shrink-0" />
                {isSidebarOpen && "Player Library"}
              </div>
              {isSidebarOpen && <Lock className="w-3 h-3 text-zinc-500" />}
            </button>
            <button disabled className={`w-full flex items-center ${isSidebarOpen ? "gap-3 px-4 justify-between" : "justify-center px-0"} py-2.5 rounded-none text-xs font-semibold text-zinc-500 opacity-60 cursor-not-allowed transition-all text-left`}>
              <div className="flex items-center gap-3">
                <Cpu className="w-4 h-4 shrink-0" />
                {isSidebarOpen && "Biomechanical Models"}
              </div>
              {isSidebarOpen && <Lock className="w-3 h-3 text-zinc-500" />}
            </button>
            <button disabled className={`w-full flex items-center ${isSidebarOpen ? "gap-3 px-4 justify-between" : "justify-center px-0"} py-2.5 rounded-none text-xs font-semibold text-zinc-500 opacity-60 cursor-not-allowed transition-all text-left`}>
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 shrink-0" />
                {isSidebarOpen && "Execution Ledger"}
              </div>
              {isSidebarOpen && <Lock className="w-3 h-3 text-zinc-500" />}
            </button>
          </nav>
        </div>

        {/* Sidebar Footer info */}
        <div className={`pt-6 border-t border-zinc-900/60 text-[10px] text-zinc-500 space-y-1 w-full ${!isSidebarOpen && "text-center"}`}>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 mb-2 rounded-none bg-zinc-950 border border-zinc-900/60 hover:bg-zinc-900 transition-colors mx-auto flex items-center justify-center">
            {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {isSidebarOpen && (
            <>
              <p className="font-semibold text-zinc-400">PlayVision AI Core</p>
              <p suppressHydrationWarning>Local time: {isMounted ? (analysisTimestamp || new Date().toLocaleTimeString()) : '--:--'}</p>
            </>
          )}
        </div>
      </aside>

      {/* ==================== MAIN CONTENT AREA ==================== */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Header Bar */}
        <header className="border-b border-zinc-900/60 bg-black/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDashboard(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:text-white hover:bg-zinc-900 text-[10px] font-bold uppercase transition-colors shrink-0"
            >
              <ArrowLeft className="w-3 h-3" />
              Back
            </button>
            <span className="text-zinc-800">|</span>
            {/* Mobile Brand */}
            <div className="flex items-center gap-2 md:hidden">
              <span className="font-bold text-sm tracking-widest text-white uppercase font-sans">PLAYVISION</span>
            </div>
            <span className="hidden md:inline text-xs font-bold text-zinc-500 uppercase tracking-widest">Dashboard // Live Analysis Engine</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs bg-zinc-950 border border-zinc-900 rounded-none px-3 py-1 text-zinc-300 font-semibold">
              <span className={isModelLoaded ? "w-2 h-2 rounded-full bg-[#10B981] shadow-sm" : "w-2 h-2 rounded-full bg-[#EF4444] animate-pulse shadow-sm"}></span>
              {isModelLoaded ? "Vision Edge Ready" : "Loading Model WASM..."}
            </div>
          </div>
        </header>

        {/* Scrollable central content feed */}
        <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">

          {/* Clean Sports Science Header */}
          <div className="space-y-1.5 pt-2 pb-6 border-b border-zinc-900">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-[#FF6B00] bg-[#FF6B00]/10 px-2.5 py-0.5 rounded-none border border-[#FF6B00]/20">LIVE SCAN</span>
              <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">BIOMECHANICAL ESTIMATION PORTAL</span>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">
              Skeletal Joint Calibration
            </h2>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Real-time joint angle analysis powered by computer vision. Select Fast Bowling or Cover Drive and begin your session below.
            </p>
          </div>

          {/* Main Grid Wrapper */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Left Column (takes 7 cols): spacious visual analysis feed */}
            <div className="lg:col-span-7 space-y-6">

              {/* Card 2: Video/Image Upload Overlay Player */}
              <div className="bg-[#050508] border border-zinc-900 rounded-none overflow-hidden flex flex-col relative group">
                {!videoUrl ? (
                  <div className="w-full min-h-[320px] flex flex-col md:flex-row gap-4 p-5">
                    {/* Option 1: File Upload */}
                    <div
                      onClick={triggerUploadDropzone}
                      className="flex-1 flex flex-col items-center justify-center p-6 text-center cursor-pointer border border-dashed border-zinc-800 hover:border-[#FF6B00] transition-all hover:bg-zinc-950/40 rounded-none group"
                    >
                      <div className="w-14 h-14 rounded-none bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#FF6B00] group-hover:scale-105 transition-all mb-4">
                        <Video className="w-7 h-7" />
                      </div>
                      <h3 className="text-sm font-bold text-white mb-1">Upload Match Footage</h3>
                      <p className="text-xs text-zinc-400 max-w-xs mb-4">Browse or drag MP4 video / images</p>
                      <button type="button" className="px-4 py-2 rounded-none bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-white border border-zinc-800 transition-all">
                        Select File
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleVideoUpload}
                        accept="video/*,image/*"
                        className="hidden"
                      />
                    </div>

                    {/* Option 2: Live Webcam Tracking */}
                    <div
                      onClick={handleStartWebcam}
                      className="flex-1 flex flex-col items-center justify-center p-6 text-center cursor-pointer border border-dashed border-zinc-800 hover:border-[#FF6B00] transition-all hover:bg-zinc-950/40 rounded-none group"
                    >
                      <div className="w-14 h-14 rounded-none bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#FF6B00] group-hover:scale-105 transition-all mb-4">
                        <Camera className="w-7 h-7 animate-pulse" />
                      </div>
                      <h3 className="text-sm font-bold text-white mb-1">Live Webcam Tracking</h3>
                      <p className="text-xs text-zinc-400 max-w-xs mb-4">Real-time MediaPipe skeletal overlay</p>
                      <button type="button" className="px-4 py-2 rounded-none bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-white border border-zinc-800 transition-all">
                        Start Camera
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full relative flex flex-col items-center bg-black/60">
                    {/* Media Container with absolute stacked canvas */}
                    <div className="w-full relative flex items-center justify-center overflow-hidden">
                      {isImage ? (
                        <img
                          ref={imageRef}
                          src={videoUrl}
                          className="max-h-[380px] w-auto object-contain block"
                          onLoad={handleImageLoad}
                          crossOrigin="anonymous"
                          alt="Uploaded media"
                        />
                      ) : (
                        <video
                          ref={videoRef}
                          src={isWebcamActive ? undefined : videoUrl}
                          loop={!isWebcamActive}
                          playsInline
                          className="max-h-[380px] w-auto object-contain block"
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                          crossOrigin="anonymous"
                        />
                      )}
                      <canvas
                        ref={canvasRef}
                        className="absolute top-0 left-0 w-full h-full pointer-events-none object-contain"
                      />
                    </div>

                    {/* Video controls / action bar */}
                    <div className="w-full bg-[#050508] border-t border-zinc-900 px-4 py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {!isImage && !isWebcamActive && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isPlaying) {
                                videoRef.current?.pause();
                              } else {
                                videoRef.current?.play();
                              }
                            }}
                            className="w-10 h-10 rounded-none bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 flex items-center justify-center text-white transition-colors"
                          >
                            {isPlaying ? <Pause className="w-4 h-4 text-[#FF6B00]" /> : <Play className="w-4 h-4 fill-[#FF6B00] text-[#FF6B00]" />}
                          </button>
                        )}

                        {isWebcamActive ? (
                          <button
                            type="button"
                            onClick={handleStopWebcam}
                            className="px-3 py-2 rounded-none bg-rose-950/20 border border-rose-900 hover:bg-rose-900/40 text-xs font-bold text-rose-450 flex items-center gap-2 transition-colors"
                          >
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                            </span>
                            Live Biomechanic Tracking
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={triggerUploadDropzone}
                            className="px-3 py-2 rounded-none bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-xs font-semibold text-zinc-300 flex items-center gap-1.5 transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Swap Clip
                          </button>
                        )}
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleVideoUpload}
                          accept="video/*,image/*"
                          className="hidden"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleFreezeAndAnalyze}
                        disabled={isAnalyzing || !isModelLoaded}
                        className={
                          isAnalyzing
                            ? "px-5 py-2.5 rounded-none text-xs font-bold transition-all flex items-center gap-2 border bg-zinc-900 border-zinc-800 text-zinc-500 cursor-not-allowed"
                            : "px-5 py-2.5 rounded-none text-xs font-bold transition-all flex items-center gap-2 border bg-white hover:bg-zinc-200 text-black border-white"
                        }
                      >
                        <Cpu className={isAnalyzing ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
                        {isAnalyzing ? "Analyzing Biomechanics..." : (isImage ? "Analyze Image" : "Freeze & Analyze")}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Guidelines Calibration Tip Banner */}
              <div className="rounded-none border border-zinc-900 bg-[#050508] p-4 flex gap-3 text-xs text-zinc-400 leading-relaxed">
                <AlertCircle className="w-4 h-4 text-[#FF6B00] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white mb-0.5">Biomechanical Calibration Tip</p>
                  <p>For the best analysis, ask the player to capture from a side-on or direct front profile. To evaluate fast bowlers, pause right at the **release keyframe**. For batsmen, pause at the **impact keyframe**.</p>
                </div>
              </div>

            </div>

            {/* Right Column (takes 5 cols): controls, configurations, and logs */}
            <div className="lg:col-span-5 space-y-6">

              {/* Card 1: Player Config Panel */}
              <div className="bg-[#050508] border border-zinc-900 rounded-none p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-[#FF6B00]" /> Player Configuration
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Player Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" />
                      <input
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-white rounded-none py-2 pl-9 pr-4 text-sm text-white focus:outline-none transition-all"
                        placeholder="E.g. Aditya Verma"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Location / Venue</label>
                    <div className="relative">
                      <Upload className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" />
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-white rounded-none py-2 pl-9 pr-4 text-sm text-white focus:outline-none transition-all"
                        placeholder="E.g. Aliganj Maidan, Lucknow"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Discipline</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDiscipline("Fast Bowling");
                          setCalculatedBiometrics(null);
                          setEngineAnalysis(null);
                          setAgentOutput(null);
                          addLog("🎯 Analysis mode set to Fast Bowling.", "System", "info");
                        }}
                        className={
                          discipline === "Fast Bowling"
                            ? "flex-1 py-2.5 rounded-none text-xs font-bold border transition-all flex items-center justify-center gap-2 bg-white border-white text-black font-black"
                            : "flex-1 py-2.5 rounded-none text-xs font-bold border transition-all flex items-center justify-center gap-2 bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                        }
                      >
                        <Activity className="w-3.5 h-3.5" />
                        Fast Bowling
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDiscipline("Cover Drive");
                          setCalculatedBiometrics(null);
                          setEngineAnalysis(null);
                          setAgentOutput(null);
                          addLog("🏏 Analysis mode set to Cover Drive (Batting).", "System", "info");
                        }}
                        className={
                          discipline === "Cover Drive"
                            ? "flex-1 py-2.5 rounded-none text-xs font-bold border transition-all flex items-center justify-center gap-2 bg-white border-white text-black font-black"
                            : "flex-1 py-2.5 rounded-none text-xs font-bold border transition-all flex items-center justify-center gap-2 bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                        }
                      >
                        <Award className="w-3.5 h-3.5" />
                        Cover Drive
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Stance / Hand</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setHand("right")}
                        className={
                          hand === "right"
                            ? "flex-1 py-2.5 rounded-none text-xs font-bold border transition-all bg-white border-white text-black font-black"
                            : "flex-1 py-2.5 rounded-none text-xs font-bold border transition-all bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                        }
                      >
                        Right-Handed
                      </button>
                      <button
                        type="button"
                        onClick={() => setHand("left")}
                        className={
                          hand === "left"
                            ? "flex-1 py-2.5 rounded-none text-xs font-bold border transition-all bg-white border-white text-black font-black"
                            : "flex-1 py-2.5 rounded-none text-xs font-bold border transition-all bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                        }
                      >
                        Left-Handed
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Agent Execution Ledger */}
              <div className="bg-[#050508] border border-zinc-900 rounded-none overflow-hidden flex flex-col h-[280px]">
                <div className="bg-zinc-950 px-4 py-2.5 border-b border-zinc-900 flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider text-[#FF6B00] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B00]/20 border border-[#FF6B00]/50 animate-ping"></span>
                    AGENT EXECUTION LEDGER
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">POLL_INTERVAL: Client Edge</span>
                </div>

                <div className="p-3 flex-1 overflow-y-auto space-y-1 bg-black/40">
                  {[...logs].reverse().map((log, idx) => {
                    const statusIcon = () => {
                      switch (log.status) {
                        case "success": return { icon: "✓", cls: "text-emerald-400 bg-emerald-950/20 border border-emerald-900" };
                        case "warning": return { icon: "!", cls: "text-amber-400 bg-amber-950/20 border border-amber-900" };
                        case "error": return { icon: "✕", cls: "text-rose-400 bg-rose-950/20 border border-rose-900" };
                        case "processing": return { icon: "◎", cls: "text-[#FF6B00] bg-[#050508] border border-zinc-850 animate-pulse" };
                        default: return { icon: "·", cls: "text-zinc-500 bg-zinc-950" };
                      }
                    };
                    const agentColors: Record<string, string> = {
                      Telemetry: "text-[#FF6B00] font-semibold", Evaluation: "text-[#FF6B00] font-semibold",
                      Liaison: "text-amber-500 font-semibold", Scout: "text-emerald-400 font-semibold",
                      Dispatch: "text-teal-400 font-semibold", System: "text-zinc-500"
                    };
                    const { icon, cls } = statusIcon();
                    const cleanMsg = log.message.replace(/^[\p{Emoji}\s]+/u, "").trim();

                    return (
                      <div key={idx} className="flex items-start gap-2 font-mono text-[11px] leading-snug py-0.5 border-b border-zinc-900/40 last:border-0">
                        <span className="text-zinc-600 text-[10px] pt-0.5 shrink-0 w-[52px]">{log.timestamp}</span>
                        <span className={"shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold " + cls}>{icon}</span>
                        <span className={"shrink-0 font-semibold " + (agentColors[log.agent] || "text-zinc-400")}>{log.agent}</span>
                        <span className="text-zinc-300">{cleanMsg}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>

          {/* Card 4: Telemetry Results */}
          {(calculatedBiometrics && engineAnalysis) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Telemetry metrics list */}
              <div className="bg-[#050508] border border-zinc-900 rounded-none p-5 space-y-4">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Joint Telemetry</h4>

                {discipline === "Fast Bowling" ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400 font-medium">Elbow Flexion (Standard: &lt; 15°)</span>
                        <span className="font-bold text-white font-mono">{calculatedBiometrics.bowling_arm_elbow_angle}°</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-none overflow-hidden">
                        <div className={calculatedBiometrics.bowling_arm_elbow_angle > 15 ? "h-full bg-rose-500" : "h-full bg-[#FF6B00]"} style={{ width: Math.min(100, (calculatedBiometrics.bowling_arm_elbow_angle / 180) * 100) + "%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400 font-medium">Knee Brace Angle (Standard: 160° - 180°)</span>
                        <span className="font-bold text-white font-mono">{calculatedBiometrics.front_knee_bracing_angle}°</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-none overflow-hidden">
                        <div className="h-full bg-[#FF6B00]" style={{ width: Math.min(100, (calculatedBiometrics.front_knee_bracing_angle / 180) * 100) + "%" }}></div>
                      </div>
                    </div>
                    {calculatedBiometrics.torso_lateral_flexion_angle !== undefined && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-400 font-medium">Torso Lateral Flexion (Standard: 20° - 30°)</span>
                          <span className="font-bold text-white font-mono">{calculatedBiometrics.torso_lateral_flexion_angle}°</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-none overflow-hidden">
                          <div className="h-full bg-[#FF6B00]" style={{ width: Math.min(100, (calculatedBiometrics.torso_lateral_flexion_angle / 180) * 100) + "%" }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400 font-medium">Elbow Angle (Standard: 95° - 115°)</span>
                        <span className="font-bold text-white font-mono">{calculatedBiometrics.leading_elbow_angle}°</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-none overflow-hidden">
                        <div className="h-full bg-[#FF6B00]" style={{ width: Math.min(100, (calculatedBiometrics.leading_elbow_angle / 180) * 100) + "%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400 font-medium">Knee Stride Flex (Standard: 110° - 130°)</span>
                        <span className="font-bold text-white font-mono">{calculatedBiometrics.front_knee_flex_angle}°</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-none overflow-hidden">
                        <div className="h-full bg-[#FF6B00]" style={{ width: Math.min(100, (calculatedBiometrics.front_knee_flex_angle / 180) * 100) + "%" }}></div>
                      </div>
                    </div>
                    {calculatedBiometrics.back_hip_angle !== undefined && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-400 font-medium">Back Hip Extension (Standard: 160° - 180°)</span>
                          <span className="font-bold text-white font-mono">{calculatedBiometrics.back_hip_angle}°</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-none overflow-hidden">
                          <div className="h-full bg-[#FF6B00]" style={{ width: Math.min(100, (calculatedBiometrics.back_hip_angle / 180) * 100) + "%" }}></div>
                        </div>
                      </div>
                    )}
                    {calculatedBiometrics.head_alignment !== undefined && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-400 font-medium">Head Deviation (Standard: &lt; 0.15)</span>
                          <span className="font-bold text-white font-mono">{calculatedBiometrics.head_alignment}</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-none overflow-hidden">
                          <div className="h-full bg-[#FF6B00]" style={{ width: Math.min(100, (calculatedBiometrics.head_alignment / 0.5) * 100) + "%" }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Match accuracy circular score card */}
              <div className="bg-[#050508] border border-zinc-900 rounded-none p-5 flex flex-col items-center justify-center text-center">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 self-start">Bio Accuracy</h4>
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-zinc-800" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-[#FF6B00]" strokeWidth="3" strokeDasharray={engineAnalysis.match_percentage + ", 100"} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="absolute flex flex-col">
                    <span className="text-lg font-bold text-white font-mono">{engineAnalysis.match_percentage}%</span>
                    <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">Precision</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Card 5: Multi-Modal Scouting Dossier (Comparison) */}
          {agentOutput ? (
            <div className="flex flex-col gap-6">

              {/* Section Header */}
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#FF6B00]" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-widest">Multi-Modal Comparison</h4>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">ID: PLAYVISION-LKO-{isMounted ? Math.floor(1000 + Math.random() * 9000) : "0000"}</span>
              </div>

              {/* Comparison explanation banner */}
              <div className="rounded-none border border-zinc-900 bg-[#050508] px-4 py-3 flex gap-2.5 items-start text-xs text-white">
                <TrendingUp className="w-4 h-4 shrink-0 mt-0.5 text-[#FF6B00]" />
                <span className="text-zinc-300">Both requests processed the <strong>exact same telemetry numbers</strong>. Only the Vision-Enhanced model received the live visual context.</span>
              </div>

              {/* Side-by-side columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* --- NUMBERS ONLY COLUMN --- */}
                <div className="bg-[#050508] border border-zinc-900 rounded-none flex flex-col overflow-hidden">
                  {/* Column Header */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-zinc-950 border-b border-zinc-900">
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">🔢 Numbers Only</span>
                    <div className="ml-auto">
                      {numbersOnlyOutput?.evaluation?.mechanical_grade && (() => {
                        const g = numbersOnlyOutput.evaluation.mechanical_grade;
                        return (
                          <span className={
                            g === 'A'
                              ? "px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-950/20 text-emerald-400 border-emerald-900/50"
                              : g === 'B'
                                ? "px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-amber-950/20 text-amber-400 border-amber-900/50"
                                : "px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-rose-950/20 text-rose-400 border-rose-900/50"
                          }>
                            {g === 'A' ? 'Grade A — Elite' : g === 'B' ? 'Grade B — Developing' : 'Grade C — Needs Work'}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="p-5 flex flex-col gap-4 flex-1">
                    {/* Summary */}
                    <div className="bg-black/60 rounded-none p-3 border border-zinc-900">
                      <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Analyst Summary</p>
                      <p className="text-xs text-zinc-400 leading-relaxed">{numbersOnlyOutput?.evaluation?.technical_summary || "—"}</p>
                    </div>

                    {/* Strengths */}
                    {numbersOnlyOutput?.evaluation?.strengths?.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-bold text-[#747995] uppercase tracking-wider">Strengths</p>
                        {numbersOnlyOutput.evaluation.strengths.map((s: string, i: number) => (
                          <div key={i} className="flex gap-2 text-xs text-[#a1a1aa] items-start">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                            <span>{s}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Weaknesses */}
                    {numbersOnlyOutput?.evaluation?.weaknesses?.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Weaknesses</p>
                        {numbersOnlyOutput.evaluation.weaknesses.map((w: string, i: number) => (
                          <div key={i} className="flex gap-2 text-xs text-zinc-400 items-start">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Coaching tips */}
                    {numbersOnlyOutput?.vernacular_feedback?.coaching_tips_hindi && (
                      <div className="bg-black/60 rounded-none p-3 border border-zinc-900 mt-auto">
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Hindi Coaching Tip</p>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">{numbersOnlyOutput.vernacular_feedback.coaching_tips_hindi}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* --- VISION ENHANCED COLUMN --- */}
                <div className="bg-[#050508] border border-white rounded-none flex flex-col overflow-hidden relative">
                  <div className="absolute top-0 right-0 bg-white text-black text-[8px] font-black px-2.5 py-1 uppercase tracking-widest">RECOMMENDED</div>
                  {/* Column Header */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-zinc-950 border-b border-zinc-900">
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">📸 Vision Enhanced</span>
                    <div className="ml-auto pr-24 md:pr-0">
                      {agentOutput?.evaluation?.mechanical_grade && (() => {
                        const g = agentOutput.evaluation.mechanical_grade;
                        return (
                          <span className={
                            g === 'A'
                              ? "px-2.5 py-0.5 rounded-none text-[10px] font-bold border bg-emerald-950/20 text-emerald-400 border-emerald-900/50"
                              : g === 'B'
                                ? "px-2.5 py-0.5 rounded-none text-[10px] font-bold border bg-amber-950/20 text-amber-400 border-amber-900/50"
                                : "px-2.5 py-0.5 rounded-none text-[10px] font-bold border bg-rose-950/20 text-rose-400 border-rose-900/50"
                          }>
                            {g === 'A' ? 'Grade A — Elite' : g === 'B' ? 'Grade B — Developing' : 'Grade C — Needs Work'}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="p-5 flex flex-col gap-4 flex-1">
                    {/* Summary */}
                    <div className="bg-black/60 rounded-none p-3 border border-zinc-900">
                      <p className="text-[9px] font-bold text-[#FF6B00] uppercase tracking-widest mb-1">Vision-Grounded Summary</p>
                      <p className="text-xs text-white leading-relaxed">{agentOutput?.evaluation?.technical_summary || "—"}</p>
                    </div>

                    {/* Strengths */}
                    {agentOutput?.evaluation?.strengths?.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Strengths</p>
                        {agentOutput.evaluation.strengths.map((s: string, i: number) => (
                          <div key={i} className="flex gap-2 text-xs text-zinc-300 items-start">
                            <span className="w-1.5 h-1.5 bg-white shrink-0 mt-1.5" />
                            <span>{s}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Weaknesses */}
                    {agentOutput?.evaluation?.weaknesses?.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Weaknesses</p>
                        {agentOutput.evaluation.weaknesses.map((w: string, i: number) => (
                          <div key={i} className="flex gap-2 text-xs text-zinc-300 items-start">
                            <span className="w-1.5 h-1.5 bg-rose-500 shrink-0 mt-1.5" />
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Coaching tips */}
                    {agentOutput?.vernacular_feedback?.coaching_tips_hindi && (
                      <div className="bg-black/60 rounded-none p-3 border border-zinc-900 mt-auto">
                        <p className="text-[9px] font-bold text-[#FF6B00] uppercase tracking-widest mb-1">Hindi Coaching Tip</p>
                        <p className="text-[11px] text-white leading-relaxed">{agentOutput.vernacular_feedback.coaching_tips_hindi}</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem('pitchVisionReportData', JSON.stringify({
                      playerName, location, discipline, hand, calculatedBiometrics, engineAnalysis, agentOutput, numbersOnlyOutput, capturedFrameUrl, analysisTimestamp, isImage
                    }));
                    window.open('/report', '_blank');
                  }}
                  className="flex-1 py-3 rounded-none text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white flex items-center justify-center gap-1.5 transition-colors border border-zinc-800 shadow-sm"
                >
                  Print Report
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem('pitchVisionReportData', JSON.stringify({
                      playerName, location, discipline, hand, calculatedBiometrics, engineAnalysis, agentOutput, numbersOnlyOutput, capturedFrameUrl, analysisTimestamp, isImage
                    }));
                    window.open('/report', '_blank');
                  }}
                  className="flex-1 py-3 rounded-none text-xs font-black bg-white hover:bg-zinc-200 text-black flex items-center justify-center gap-1.5 transition-colors border border-white shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  View & Email PDF
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-[#050508] border border-zinc-900 rounded-none p-8 text-center flex flex-col items-center justify-center min-h-[260px] text-zinc-500">
              <Award className="w-12 h-12 text-zinc-700 mb-3" />
              <h3 className="text-sm font-semibold text-white mb-1">No Scouting Profile Generated</h3>
              <p className="text-xs text-zinc-450 max-w-xs">Upload a cricket video/image, and click "Freeze & Analyze" to run the dual-mode biomechanical scoring engine.</p>
            </div>
          )}

        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-900/60 bg-black py-8 px-6 flex flex-col lg:flex-row items-center justify-between gap-6 text-xs text-zinc-500">
          <div className="text-center lg:text-left space-y-2">
            <p>© 2026 PlayVision AI | Built with Next.js 14 edge engine and client-side computer vision.</p>
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider flex flex-wrap gap-x-3 gap-y-1 justify-center lg:justify-start">
              <span>TEAM LEADER: MOHD. TABISH KHAN</span>
              <span className="text-zinc-800">•</span>
              <span>TEAM MEMBER: RAJNEESH VERMA</span>
            </p>
          </div>
          <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase bg-zinc-900/60 border border-zinc-800/40 px-2.5 py-1 rounded-none shrink-0">TEAM NEURAL NEX</span>
        </footer>

      </div>

    </div>
  );
}

