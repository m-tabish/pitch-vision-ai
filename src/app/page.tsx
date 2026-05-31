"use client";

import React, { useEffect, useRef, useState } from "react";
import { 
  Activity, 
  Award, 
  CheckCircle, 
  ChevronRight, 
  Cpu, 
  Mail,
  MessageSquare, 
  Play, 
  Pause, 
  RefreshCw, 
  Share2, 
  TrendingUp, 
  Upload, 
  User, 
  Video, 
  AlertCircle
} from "lucide-react";
import ScoutingReportView from "./report/ScoutingReportView";

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
  const [playerName, setPlayerName] = useState("Aditya Verma");
  const [location, setLocation] = useState("Aliganj Maidan, Lucknow");
  const [discipline, setDiscipline] = useState<"Fast Bowling" | "Cover Drive">("Fast Bowling");
  const [hand, setHand] = useState<"right" | "left">("right");
  
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [progress, setProgress] = useState(0);

  // Vision references & instances
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<number | null>(null);
  const landmarksRef = useRef<Record<number, Landmark> | null>(null);
  
  const [poseLandmarker, setPoseLandmarker] = useState<any>(null);
  const [calculatedBiometrics, setCalculatedBiometrics] = useState<any>(null);
  const [engineAnalysis, setEngineAnalysis] = useState<any>(null);
  const [agentOutput, setAgentOutput] = useState<any>(null);
  const [userEmail, setUserEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);

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
        ctx.fillStyle = "#10B981"; // Emerald neon green
        ctx.shadowColor = "#10B981";
        ctx.shadowBlur = 8;
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

    ctx.strokeStyle = "rgba(16, 185, 129, 0.75)";
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
      ctx.fillStyle = "#fbbf24"; // Amber for high visibility
      ctx.shadowBlur = 4;
      ctx.shadowColor = "black";

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

        // Math overall percentage calculations
        const elbowMatch = Math.max(0, 100 - flexion * 2);
        let kneeMatch = 100;
        if (knee < 160.0) kneeMatch = Math.max(0, 100 - (160 - knee) * 2.5);
        else if (knee > 175.0) kneeMatch = Math.max(0, 100 - (knee - 175) * 4);

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
        if (knee < 110.0 || knee > 150.0) {
          kneeFlex = "Stiff Knee / Poor Transfer (Needs Work)";
        } else if (knee > 135.0 && knee <= 150.0) {
          kneeFlex = "Knee Slightly Stiff (Developing)";
        }

        // Three-tier grading for Back Hip Extension
        let hipExtension = "Full Hip Extension (Elite)";
        if (hip < 150.0) {
          hipExtension = "Restricted Hip Extension (Needs Work)";
        } else if (hip >= 150.0 && hip < 165.0) {
          hipExtension = "Partial Hip Extension (Developing)";
        }

        // Calculate matching percentages based on statistical significance in the research paper
        const elbowMatch = elbow >= 95.0 && elbow <= 115.0 ? 100 : (elbow < 95.0 ? Math.max(0, 100 - (95.0 - elbow) * 2.5) : Math.max(0, 100 - (elbow - 115.0) * 2.5));
        const kneeMatch = knee >= 110.0 && knee <= 135.0 ? 100 : (knee < 110.0 ? Math.max(0, 100 - (110.0 - knee) * 3.5) : Math.max(0, 100 - (knee - 135.0) * 2.5));
        const hipMatch = hip >= 165.0 && hip <= 180.0 ? 100 : Math.max(0, 100 - (165.0 - hip) * 2.5);
        
        // Weighting reflecting correlation strengths (Elbow: 40%, Knee: 30%, Hip: 30%)
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
    
    if (!videoRef.current || !currentLandmarks) {
      addLog("⚠️ Ingestion fail: No video loaded or joints skeleton not found.", "System", "warning");
      return;
    }

    setIsPlaying(false);
    videoRef.current.pause();
    setIsAnalyzing(true);
    addLog("🔒 Frame frozen. Extracting keyframe telemetry data...", "System", "info");

    // Capture current frame as data URL
    let frameDataUrl = null;
    if (videoRef.current) {
      try {
        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          frameDataUrl = canvas.toDataURL("image/jpeg", 0.7);
        }
      } catch (e) {
        console.error("Frame capture failed:", e);
      }
    }
    setCapturedFrame(frameDataUrl);

    // Clear previous results to animate fresh loader
    setCalculatedBiometrics(null);
    setEngineAnalysis(null);
    setAgentOutput(null);

    // Compute metrics
    const results = evaluateBiometricsClientSide(currentLandmarks);
    if (!results) {
      addLog("❌ Biomechanical calculations failed.", "System", "error");
      setIsAnalyzing(false);
      return;
    }

    setCalculatedBiometrics(results.biometrics);
    setEngineAnalysis(results.analysis);

    // Dynamic, simulated multi-agent console typing animations
    await runAgentConsoleSimulator(results.biometrics, results.analysis);

    // Make unified Next.js Serverless API post
    try {
      addLog("🧠 Dispatching processed biometrics to Vercel AI Agentic Route...", "System", "processing");
      const res = await fetch("/api/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_name: playerName,
          location,
          discipline,
          hand,
          biometrics: results.biometrics,
          analysis: results.analysis
        })
      });

      const parsed = await res.json();
      setAgentOutput(parsed);
      addLog("📬 Evaluation complete: Technical dossier compiled.", "Evaluation", "success");
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

  // Video Dropzone file reader
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setIsPlaying(false);
      landmarksRef.current = null;
      setCalculatedBiometrics(null);
      setEngineAnalysis(null);
      setAgentOutput(null);
      addLog(`📹 Video Ingested successfully: ${file.name}`, "System", "success");
    }
  };

  const triggerUploadDropzone = () => {
    fileInputRef.current?.click();
  };

  const handleShareWhatsApp = () => {
    if (!agentOutput) return;
    const text = `🏏 *GullyScout AI Report* 🏏
👤 *Player Name:* ${playerName}
📍 *Location:* ${location}
⚡ *Mechanical Grade:* ${agentOutput.evaluation?.mechanical_grade || 'A'}
📈 *Accuracy:* ${engineAnalysis?.match_percentage || 80}%

🗣️ *Coaching Tip (Awadhi/Hindi):*
"${agentOutput.vernacular_feedback?.coaching_tips_awadhi}"

_Analyzed via PitchVision AI Core._`;
    
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleEmailShare = async () => {
    if (!userEmail) {
      addLog("⚠️ Please enter an email address first.", "System", "warning");
      return;
    }

    if (!agentOutput) {
      addLog("⚠️ Complete analysis first.", "System", "warning");
      return;
    }

    setIsSendingEmail(true);
    addLog("📧 Generating PDF and dispatching email via Resend...", "System", "info");

    let frameDataUrl = capturedFrame;
    if (!frameDataUrl && videoRef.current) {
      try {
        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          frameDataUrl = canvas.toDataURL("image/jpeg", 0.7);
        }
      } catch (e) {
        console.error("Frame capture failed:", e);
      }
    }

    try {
      const res = await fetch("/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          playerName,
          location,
          discipline,
          hand,
          calculatedBiometrics,
          engineAnalysis,
          agentOutput,
          capturedFrameUrl: frameDataUrl,
          analysisTimestamp: new Date().toISOString()
        })
      });

      const parsedResponse = await res.json();
      if (res.ok && parsedResponse.success) {
        addLog(`✅ Scouting dossier successfully emailed to ${userEmail}`, "Evaluation", "success");
      } else {
        addLog(`❌ Email failed: ${parsedResponse.message || "Unknown error"}`, "System", "error");
      }
    } catch (error: any) {
      addLog(`❌ Email request failed: ${error.message}`, "System", "error");
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#09090b] via-[#0d0d15] to-[#050508] text-zinc-100 font-sans antialiased selection:bg-emerald-500 selection:text-black">
      
      {/* Header Bar */}
      <header className="border-b border-zinc-800/60 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Activity className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              PitchVision <span className="text-emerald-400 font-mono text-sm px-2 py-0.5 rounded-full bg-emerald-950/50 border border-emerald-800/40">AI</span>
            </h1>
            <p className="text-xs text-zinc-400">Team Neural Nexus | APL PS-23 Scouting Suite</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1.5 text-zinc-400">
            <span className={`w-2 h-2 rounded-full ${isModelLoaded ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-amber-500 animate-pulse'} shadow-sm`}></span>
            {isModelLoaded ? "Vision Edge Ready" : "Loading Model WASM..."}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Controls & Video Ingest (Lg: 7 cols) */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Metadata Card */}
          <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/40 backdrop-blur-sm p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">Player Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-emerald-500/60 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none transition-colors"
                  placeholder="E.g. Aditya Verma"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">Location / Maidan</label>
              <div className="relative">
                <Upload className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-emerald-500/60 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none transition-colors"
                  placeholder="E.g. Aliganj Maidan, Lucknow"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">Discipline</label>
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
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                    discipline === "Fast Bowling" 
                      ? 'bg-emerald-500 border-emerald-400 text-black shadow-lg shadow-emerald-500/20' 
                      : 'bg-zinc-950/40 border-zinc-800 text-zinc-500 hover:bg-zinc-900/40'
                  }`}
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
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                    discipline === "Cover Drive" 
                      ? 'bg-emerald-500 border-emerald-400 text-black shadow-lg shadow-emerald-500/20' 
                      : 'bg-zinc-950/40 border-zinc-800 text-zinc-500 hover:bg-zinc-900/40'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  Cover Drive
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">Player Stance/Hand</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setHand("right")}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    hand === "right" 
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                      : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:bg-zinc-900/40'
                  }`}
                >
                  Right-Handed
                </button>
                <button
                  type="button"
                  onClick={() => setHand("left")}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    hand === "left" 
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                      : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:bg-zinc-900/40'
                  }`}
                >
                  Left-Handed
                </button>
              </div>
            </div>
          </div>

          {/* Video Dropzone / Overlay Player */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/20 backdrop-blur-sm overflow-hidden flex flex-col relative group min-h-[380px] justify-center items-center">
            
            {!videoUrl ? (
              <div 
                onClick={triggerUploadDropzone}
                className="flex flex-col items-center justify-center p-8 text-center cursor-pointer w-full h-[380px] border-2 border-dashed border-zinc-850 hover:border-emerald-500/50 transition-all hover:bg-zinc-900/30 rounded-2xl group"
              >
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:scale-105 transition-all mb-4">
                  <Video className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">Upload Gully Footage</h3>
                <p className="text-xs text-zinc-400 max-w-xs mb-4">Drag and drop or browse standard MP4 video capture from Aliganj/Rajajipuram maidans</p>
                <button type="button" className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-xs font-semibold transition-all border border-zinc-700">
                  Select Video File
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleVideoUpload}
                  accept="video/*"
                  className="hidden"
                />
              </div>
            ) : (
              <div className="w-full relative flex flex-col items-center bg-black/60">
                {/* Media Container with absolute stacked canvas */}
                <div className="w-full relative flex items-center justify-center overflow-hidden">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    loop
                    playsInline
                    className="max-h-[420px] w-auto object-contain block"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none object-contain"
                  />
                </div>

                {/* Styled Video Player Action Bar */}
                <div className="w-full bg-zinc-950 border-t border-zinc-900 px-4 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (isPlaying) {
                          videoRef.current?.pause();
                        } else {
                          videoRef.current?.play();
                        }
                      }}
                      className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 flex items-center justify-center text-white transition-colors"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                    </button>

                    <button
                      type="button"
                      onClick={triggerUploadDropzone}
                      className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Swap Clip
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleVideoUpload}
                      accept="video/*"
                      className="hidden"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleFreezeAndAnalyze}
                    disabled={isAnalyzing || !isModelLoaded}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border shadow-lg ${
                      isAnalyzing 
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black border-emerald-400/30 hover:scale-[1.02] shadow-emerald-950/20'
                    }`}
                  >
                    <Cpu className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    {isAnalyzing ? "Analyzing Biomechanics..." : "Freeze & Analyze Frame"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Educational Guidelines */}
          <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/10 p-4 flex gap-3 text-zinc-400 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-zinc-300 mb-0.5">Biomechanical Calibration Tip</p>
              <p>For the best analysis, ask the player to capture from a side-on or direct front profile. To evaluate fast bowlers, pause right at the **release keyframe**. For batsmen, pause at the **impact keyframe**.</p>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Console & Scout Dossier (Lg: 5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Agent Execution Ledger (Console Console) */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950 overflow-hidden flex flex-col h-[280px]">
            <div className="bg-zinc-900 px-4 py-2.5 border-b border-zinc-850 flex items-center justify-between">
              <span className="text-xs font-mono font-semibold tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 animate-ping"></span>
                AGENT EXECUTION LEDGER
              </span>
              <span className="text-[10px] font-mono text-zinc-500">POLL_INTERVAL: Client Edge</span>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto font-mono text-xs space-y-2.5 flex flex-col-reverse">
              {/* Reverse log rendering so latest is bottom/top logically */}
              {[...logs].reverse().map((log, idx) => {
                const getStatusColor = () => {
                  switch (log.status) {
                    case "success": return "text-emerald-400";
                    case "warning": return "text-amber-400";
                    case "error": return "text-rose-500";
                    case "processing": return "text-blue-400 animate-pulse";
                    default: return "text-zinc-400";
                  }
                };

                const getAgentColor = () => {
                  switch (log.agent) {
                    case "Telemetry": return "text-indigo-400";
                    case "Evaluation": return "text-purple-400";
                    case "Liaison": return "text-amber-400";
                    case "Scout": return "text-emerald-400";
                    case "Dispatch": return "text-teal-400";
                    default: return "text-zinc-500";
                  }
                };

                return (
                  <div key={idx} className="flex gap-2 items-start leading-tight">
                    <span className="text-zinc-600 text-[10px] pt-0.5 select-none">{log.timestamp}</span>
                    <span className={`font-semibold shrink-0 select-none ${getAgentColor()}`}>[{log.agent}]</span>
                    <span className={getStatusColor()}>{log.message}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TELEMETRY RESULTS */}
          {(calculatedBiometrics && engineAnalysis) && (
            <div className="grid grid-cols-2 gap-4">
              
              {/* Telemetry metrics list */}
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4 space-y-3">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Joint Telemetry</h4>
                
                {discipline === "Fast Bowling" ? (
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400">Elbow Flex</span>
                        <span className="font-semibold text-white">{calculatedBiometrics.bowling_arm_elbow_angle}°</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (calculatedBiometrics.bowling_arm_elbow_angle / 180) * 100)}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400">Knee Brace</span>
                        <span className="font-semibold text-white">{calculatedBiometrics.front_knee_bracing_angle}°</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (calculatedBiometrics.front_knee_bracing_angle / 180) * 100)}%` }}></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400">Elbow Angle</span>
                        <span className="font-semibold text-white">{calculatedBiometrics.leading_elbow_angle}°</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (calculatedBiometrics.leading_elbow_angle / 180) * 100)}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400">Knee Stride</span>
                        <span className="font-semibold text-white">{calculatedBiometrics.front_knee_flex_angle}°</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (calculatedBiometrics.front_knee_flex_angle / 180) * 100)}%` }}></div>
                      </div>
                    </div>
                    {calculatedBiometrics.back_hip_angle !== undefined && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-400">Back Hip Extension</span>
                          <span className="font-semibold text-white">{calculatedBiometrics.back_hip_angle}°</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (calculatedBiometrics.back_hip_angle / 180) * 100)}%` }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Match accuracy circular score card */}
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4 flex flex-col items-center justify-center text-center">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 self-start">Bio Accuracy</h4>
                <div className="relative w-20 h-20 flex items-center justify-center">
                  {/* Neon Glow Circle */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-zinc-950" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-emerald-500 shadow-emerald-500" strokeWidth="3.2" strokeDasharray={`${engineAnalysis.match_percentage}, 100`} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="absolute flex flex-col">
                    <span className="text-base font-mono font-bold text-white">{engineAnalysis.match_percentage}%</span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </section>

        {/* FULL-WIDTH SCRIBING/REPORTING BLOCK */}
        <div className="lg:col-span-12 w-full mt-4">
          {isAnalyzing ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-zinc-900/20 backdrop-blur-sm p-12 text-center flex flex-col items-center justify-center min-h-[350px] text-zinc-400 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent animate-pulse pointer-events-none"></div>
              
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/10"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 border-r-emerald-500 animate-spin"></div>
                <Cpu className="absolute inset-0 m-auto w-6 h-6 text-emerald-400 animate-pulse" />
              </div>

              <h3 className="text-base font-semibold text-white mb-2 tracking-tight">AI Orchestration Engine Active</h3>
              <p className="text-xs text-zinc-500 max-w-md mb-6 leading-relaxed">
                Analyzing biomechanical coordinates, executing multi-agent evaluation workflow, and compiling Vernacular Awadhi & Hindi coaching advice.
              </p>

              {/* Progress step indicators */}
              <div className="w-full max-w-xs space-y-2 text-left bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/80">
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>Pose estimation coordinates locked.</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-450">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                  <span>Generating professional scouting reports...</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-800"></span>
                  <span>Drafting regional Awadhi/Hindi feedback tip.</span>
                </div>
              </div>
            </div>
          ) : agentOutput ? (
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/35 overflow-hidden flex flex-col gap-6 p-5 relative">
              
              {/* Dossier Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800/60 pb-4 gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-5 h-5 text-emerald-400" />
                    Dossier Report Preview
                  </h4>
                  <p className="text-[10px] text-zinc-500">Live preview of compiled biometric scouting dossier</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const reportData = {
                        playerName,
                        location,
                        discipline,
                        hand: hand === "right" ? "Right" : "Left",
                        calculatedBiometrics,
                        engineAnalysis,
                        agentOutput,
                        numbersOnlyOutput: agentOutput,
                        capturedFrameUrl: capturedFrame,
                        analysisTimestamp: new Date().toISOString()
                      };
                      sessionStorage.setItem("pitchVisionReportData", JSON.stringify(reportData));
                      window.open("/report", "_blank");
                    }}
                    className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    Print / Export
                  </button>
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share WhatsApp
                  </button>
                </div>
              </div>

              {/* Email dispatch section */}
              <div className="bg-zinc-950/45 border border-zinc-800/70 p-4 rounded-xl space-y-3">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Secure Dispatch
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="Enter coach or scout's email..."
                    className="flex-1 bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleEmailShare}
                    disabled={isSendingEmail || !userEmail}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSendingEmail || !userEmail
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : "bg-white text-black hover:bg-zinc-200"
                    }`}
                  >
                    {isSendingEmail ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Mail className="w-3.5 h-3.5" />
                    )}
                    {isSendingEmail ? "Sending..." : "Dispatch Email"}
                  </button>
                </div>
              </div>

              {/* Document Preview Frame */}
              <div className="w-full overflow-x-auto bg-[#050508] border border-zinc-850/80 p-6 rounded-2xl flex justify-center items-start">
                <div className="origin-top scale-[0.7] sm:scale-[0.85] lg:scale-100 my-2">
                  <ScoutingReportView
                    data={{
                      playerName,
                      location,
                      discipline,
                      hand: hand === "right" ? "Right" : "Left",
                      calculatedBiometrics,
                      engineAnalysis,
                      agentOutput,
                      numbersOnlyOutput: agentOutput,
                      capturedFrameUrl: capturedFrame,
                      analysisTimestamp: new Date().toISOString()
                    }}
                  />
                </div>
              </div>

            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-850 bg-zinc-900/10 p-8 text-center flex flex-col items-center justify-center min-h-[300px] text-zinc-500">
              <Award className="w-12 h-12 text-zinc-800 mb-3" />
              <h3 className="text-sm font-semibold text-zinc-400 mb-1">No Scouting Profile Generated</h3>
              <p className="text-xs text-zinc-500 max-w-xs">Upload a cricket video, lock in a frame, and hit "Freeze & Analyze Frame" to start the biomechanical scoring engine.</p>
            </div>
          )}

        </div>

      </main>

      {/* Footer bar */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-8 px-6 text-center text-xs text-zinc-500 mt-12 space-y-2">
        <p>© 2026 PitchVision AI | Built with high-fidelity Next.js 14 edge engine and client-side computer vision.</p>
        <p>A grassroots scouting deployment dedicated to Lucknow's cricket leagues.</p>
      </footer>

    </div>
  );
}
