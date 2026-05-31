"use client";

import React from "react";

export interface ScoutingReportViewProps {
  data: {
    playerName: string;
    location?: string;
    discipline?: string;
    hand?: string;
    calculatedBiometrics?: Record<string, any>;
    engineAnalysis?: Record<string, any>;
    agentOutput?: Record<string, any>;
    numbersOnlyOutput?: Record<string, any>;
    capturedFrameUrl?: string | null;
    analysisTimestamp?: string;
  };
}

export default function ScoutingReportView({ data }: ScoutingReportViewProps) {
  if (!data) return null;

  const {
    playerName,
    location = "Lucknow",
    discipline = "Fast Bowling",
    hand = "Right",
    calculatedBiometrics,
    engineAnalysis,
    agentOutput,
    numbersOnlyOutput,
    capturedFrameUrl,
    analysisTimestamp,
  } = data;

  // Determine standard values based on discipline
  const getStandardValues = () => {
    if (discipline === "Fast Bowling") {
      return [
        { name: "Bowling Arm Elbow Flexion", actual: calculatedBiometrics?.bowling_arm_elbow_angle, standard: "< 15° (ICC Limit)" },
        { name: "Front Knee Bracing Angle", actual: calculatedBiometrics?.front_knee_bracing_angle, standard: "160° - 180°" },
        { name: "Torso Lateral Flexion", actual: calculatedBiometrics?.torso_lateral_flexion_angle, standard: "20° - 30°" }
      ];
    } else {
      return [
        { name: "Leading Elbow Angle", actual: calculatedBiometrics?.leading_elbow_angle, standard: "95° - 115° (Elite)" },
        { name: "Front Knee Stride Flex", actual: calculatedBiometrics?.front_knee_flex_angle, standard: "110° - 135° (Elite)" },
        { name: "Back Hip Extension", actual: calculatedBiometrics?.back_hip_angle, standard: "165° - 180° (Elite)" },
        { name: "Head/Shoulder Alignment", actual: calculatedBiometrics?.head_alignment, standard: "< 0.15 deviation" }
      ];
    }
  };

  const metrics = getStandardValues();

  // Helper to color code grades
  const getGradeStyle = (grade: string) => {
    switch (grade) {
      case "A": return "bg-[#e8f5e9] text-[#2e7d32] border border-[#a5d6a7]";
      case "B": return "bg-[#fff8e1] text-[#f57f17] border border-[#ffe082]";
      case "C":
      default: return "bg-[#ffebee] text-[#c62828] border border-[#ef9a9a]";
    }
  };

  const finalGrade = agentOutput?.evaluation?.mechanical_grade || numbersOnlyOutput?.evaluation?.mechanical_grade || "C";

  return (
    <div className="a4-page w-[210mm] min-h-[297mm] bg-white text-zinc-900 p-[15mm] flex flex-col font-sans relative border border-zinc-200 shadow-xl print:shadow-none print:border-none print:p-0 mx-auto select-none">
      {/* 1. Header Section */}
      <header className="border-b-[3px] border-[#FF6B00] pb-3 mb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-950 tracking-tight uppercase">Scouting Report</h1>
          <p className="text-xs font-bold text-[#FF6B00] mt-1 tracking-widest uppercase font-mono">PlayVision AI • Biomechanics</p>
        </div>
        <div className="text-right text-[10px] text-zinc-500 font-mono">
          <p>ID: PV-LKO-{analysisTimestamp ? Buffer.from(analysisTimestamp).slice(-4).toString('hex').slice(0, 4).toUpperCase() : "0000"}</p>
          <p>Date: {analysisTimestamp || new Date().toLocaleDateString()}</p>
          <p>Mode: {capturedFrameUrl ? "Video Frame" : "Static Image"}</p>
        </div>
      </header>

      {/* Player Info Block */}
      <section className="bg-zinc-50 rounded-none p-4 mb-4 border border-zinc-200 flex justify-between items-center">
        <div>
          <p className="text-[10px] uppercase font-bold text-[#FF6B00] tracking-wider mb-1 font-mono">Player Profile</p>
          <h2 className="text-xl font-black text-zinc-950">{playerName}</h2>
        </div>
        <div className="text-right">
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
            <span className="text-zinc-500 font-semibold text-left">Location:</span>
            <span className="font-bold text-zinc-950 text-right">{location}</span>
            <span className="text-zinc-500 font-semibold text-left">Discipline:</span>
            <span className="font-bold text-zinc-950 text-right">{discipline} ({hand}-hand)</span>
            <span className="text-zinc-500 font-semibold text-left">Bio Accuracy:</span>
            <span className="font-bold text-[#FF6B00] text-right">{engineAnalysis?.match_percentage ?? 80}%</span>
          </div>
        </div>
      </section>

      {/* 2. Numbers Block */}
      <section className="mb-4">
        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-3 border-b border-zinc-250 pb-2">Biomechanical Telemetry</h3>
        <div className="overflow-hidden rounded-none border border-zinc-200" style={{ backgroundColor: '#ffffff' }}>
          <table className="w-full text-sm text-left border-collapse" style={{ backgroundColor: '#ffffff', color: '#1f2937' }}>
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 font-bold border-b border-zinc-200" style={{ backgroundColor: '#f9fafb', color: '#4b5563' }}>
              <tr>
                <th className="px-4 py-3" style={{ backgroundColor: '#f9fafb', color: '#4b5563' }}>Parameter</th>
                <th className="px-4 py-3" style={{ backgroundColor: '#f9fafb', color: '#4b5563' }}>Actual Value</th>
                <th className="px-4 py-3" style={{ backgroundColor: '#f9fafb', color: '#4b5563' }}>Standard Expected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200" style={{ backgroundColor: '#ffffff' }}>
              {metrics.map((m, idx) => (
                <tr key={idx} className="bg-white" style={{ backgroundColor: '#ffffff' }}>
                  <td className="px-4 py-3 font-semibold text-zinc-700" style={{ backgroundColor: '#ffffff', color: '#374151' }}>{m.name}</td>
                  <td className="px-4 py-3 font-mono font-bold text-[#FF6B00]" style={{ backgroundColor: '#ffffff', color: '#FF6B00' }}>{m.actual !== undefined ? m.actual + '°' : 'N/A'}</td>
                  <td className="px-4 py-3 font-mono text-zinc-500" style={{ backgroundColor: '#ffffff', color: '#6b7280' }}>{m.standard}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Response / Analysis Comparison */}
      <section className="mb-4 flex-1">
        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-3 border-b border-zinc-200 pb-2">AI Analysis Comparison</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Raw Angle (Numbers Only) */}
          <div className="border border-zinc-200 rounded-none p-4 bg-zinc-50 flex flex-col">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-zinc-200">
              <h4 className="text-xs font-bold text-zinc-650 uppercase">Raw Angle Analysis</h4>
              <span className={"text-[10px] font-bold px-2 py-0.5 rounded-none uppercase " + getGradeStyle(numbersOnlyOutput?.evaluation?.mechanical_grade || 'C')}>
                Grade {numbersOnlyOutput?.evaluation?.mechanical_grade || 'C'}
              </span>
            </div>
            
            <div className="flex-1 text-xs text-zinc-800 space-y-3">
              <div>
                <strong className="text-zinc-500 block mb-1 uppercase font-mono text-[9px] tracking-wider">Summary:</strong>
                <p className="leading-relaxed text-zinc-700">{numbersOnlyOutput?.evaluation?.technical_summary || "No summary available."}</p>
              </div>
              <div>
                <strong className="text-rose-600 block mb-1 uppercase font-mono text-[9px] tracking-wider">Key Weaknesses:</strong>
                <ul className="list-disc pl-4 space-y-1 text-rose-700">
                  {numbersOnlyOutput?.evaluation?.weaknesses?.map((w: string, i: number) => <li key={i}>{w}</li>) || <li>None noted.</li>}
                </ul>
              </div>
              <div>
                <strong className="text-[#FF6B00] block mb-1 uppercase font-mono text-[9px] tracking-wider">Coaching Tip:</strong>
                <p className="italic bg-white p-2 rounded-none border border-zinc-200 font-medium">{numbersOnlyOutput?.vernacular_feedback?.coaching_tips_hindi || "No tip available."}</p>
              </div>
            </div>
          </div>

          {/* Vision Enhanced */}
          <div className="border-2 border-[#FF6B00] rounded-none p-4 bg-white flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#FF6B00] text-white text-[8px] font-bold px-2 py-1 uppercase">Vision Enhanced</div>
            
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-zinc-200">
              <h4 className="text-xs font-bold text-[#FF6B00] uppercase">With Image/Video</h4>
              <span className={"text-[10px] font-bold px-2 py-0.5 rounded-none uppercase " + getGradeStyle(agentOutput?.evaluation?.mechanical_grade || 'C')}>
                Grade {agentOutput?.evaluation?.mechanical_grade || 'C'}
              </span>
            </div>

            {capturedFrameUrl && (
              <div className="mb-3 flex justify-center bg-zinc-50 rounded-none border border-zinc-200 p-1">
                <img src={capturedFrameUrl} alt="Analyzed Frame" className="h-20 object-contain rounded-none" />
              </div>
            )}
            
            <div className="flex-1 text-xs text-zinc-800 space-y-3">
              <div>
                <strong className="text-zinc-500 block mb-1 uppercase font-mono text-[9px] tracking-wider">Visual Summary:</strong>
                <p className="leading-relaxed text-zinc-700">{agentOutput?.evaluation?.technical_summary || "No visual summary available."}</p>
              </div>
              <div>
                <strong className="text-[#FF6B00] block mb-1 uppercase font-mono text-[9px] tracking-wider">Contextual Tip (Awadhi):</strong>
                <p className="italic bg-zinc-50 p-2 rounded-none border border-zinc-200 font-medium text-[#FF6B00]">{agentOutput?.vernacular_feedback?.coaching_tips_awadhi || "No tip available."}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Final Grade and Verdict */}
      <section className="mt-auto pt-4 border-t-2 border-[#FF6B00] flex items-center justify-between bg-zinc-50 p-4 rounded-none border border-zinc-200">
        <div className="flex-1 pr-6">
          <h3 className="text-sm font-extrabold text-zinc-950 uppercase tracking-wider mb-1">Final Verdict</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Based on multimodal analysis combining joint telemetry and spatial visual processing, the player exhibits a 
            <strong className="text-zinc-950 font-bold"> Grade {finalGrade}</strong> mechanism. Focus on the vision-enhanced feedback for holistic improvement.
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-center justify-center bg-white border border-zinc-200 rounded-none p-4 shadow-sm min-w-[120px]">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Overall Grade</span>
          <span className={"text-4xl font-black rounded-none px-4 py-1 " + getGradeStyle(finalGrade)}>
            {finalGrade}
          </span>
        </div>
      </section>
    </div>
  );
}
