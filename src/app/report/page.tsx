"use client";

import React, { useEffect, useState } from "react";
import ScoutingReportView from "./ScoutingReportView";

const MOCK_SAMPLE_DATA = {
  playerName: "Virat Kohli",
  location: "M. Chinnaswamy Stadium, Bengaluru",
  discipline: "Cover Drive",
  hand: "Right",
  isImage: false,
  analysisTimestamp: "31/05/2026, 6:00:00 PM",
  calculatedBiometrics: {
    leading_elbow_angle: 98.4,
    front_knee_flex_angle: 124.6,
    back_hip_angle: 172.5,
    head_alignment: 0.08
  },
  engineAnalysis: {
    elbow_flexion_quality: "Optimal High Elbow (Elite)",
    knee_flexion_quality: "Optimal Weight Transfer (Elite)",
    head_stability_status: "Balanced",
    match_percentage: 95.5
  },
  numbersOnlyOutput: {
    evaluation: {
      mechanical_grade: "A",
      technical_summary: "The batsman demonstrates exceptional mechanical form during the Cover Drive. The leading elbow remains high at 98.4 degrees, directing the flow of energy straight down the ground. Weight transfer is balanced, assisted by an optimal front knee flexion of 124.6 degrees. Head remains directly aligned over the knee, keeping the stance completely stable.",
      strengths: [
        "Optimal high leading elbow alignment maximizing swing efficiency.",
        "Excellent front knee flexion allowing deep stride and control.",
        "Nose/head position remains stable directly over target line."
      ],
      weaknesses: [
        "Slight back foot heel lift could be grounded longer for extra base power."
      ]
    },
    vernacular_feedback: {
      coaching_tips_hindi: "कोहनी एकदम सही ऊंचाई पर है जिससे शॉट में नियंत्रण बना रहेगा। पैर का झुकाव भी सही है, बस अंतिम क्षण में सिर को गेंद के ठीक ऊपर रखें।"
    }
  },
  agentOutput: {
    evaluation: {
      mechanical_grade: "A",
      technical_summary: "Visual evaluation confirms an elite cover drive stroke. Head alignment is stable at 0.08 coordinate offset, showing zero head falling. The leading elbow shows an optimal high stance (98.4°), ensuring high-control bat flow. The front knee flexion at 124.6° allows full weight transfer over the ball.",
      strengths: [
        "High elbow keeps the bat face vertical, minimizing loft risk.",
        "Head stability is absolute, keeping eyes level through contact."
      ],
      weaknesses: [
        "Back hip is fully extended, though back foot could pivot slightly faster."
      ]
    },
    vernacular_feedback: {
      coaching_tips_hindi: "आपका कोहनी का कोण 98.4 डिग्री बहुत बढ़िया है। गेंद के पिच तक पहुँचने के लिए फ्रंट फुट का उपयोग उत्कृष्ट है। अभ्यास जारी रखें!"
    }
  },
  capturedFrameUrl: "/images/cricket_feature_visual.png"
};

export default function ScoutingReportPage() {
  const [data, setData] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<{ success?: boolean; message?: string; previewUrl?: string } | null>(null);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSending(true);
    setSendStatus(null);

    try {
      const response = await fetch("/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          playerName: data.playerName,
          location: data.location,
          discipline: data.discipline,
          hand: data.hand,
          calculatedBiometrics: data.calculatedBiometrics,
          engineAnalysis: data.engineAnalysis,
          agentOutput: data.agentOutput,
          numbersOnlyOutput: data.numbersOnlyOutput,
          capturedFrameUrl: data.capturedFrameUrl,
          analysisTimestamp: data.analysisTimestamp
        })
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        setSendStatus({
          success: true,
          message: "Report sent successfully!",
          previewUrl: resData.previewUrl
        });
      } else {
        setSendStatus({
          success: false,
          message: resData.message || "Failed to send report. Please check SMTP config."
        });
      }
    } catch (err: any) {
      console.error(err);
      setSendStatus({
        success: false,
        message: "An unexpected error occurred while sending the email."
      });
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    // Read the report data from session storage (passed from main dashboard)
    const storedData = sessionStorage.getItem("pitchVisionReportData");
    if (storedData) {
      try {
        setData(JSON.parse(storedData));
      } catch (e) {
        console.error("Failed to parse report data", e);
        setData(MOCK_SAMPLE_DATA);
      }
    } else {
      setData(MOCK_SAMPLE_DATA);
    }
  }, []);

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white font-sans">
        <p className="text-xs font-bold tracking-widest uppercase animate-pulse">Loading Report Data...</p>
      </div>
    );
  }

  return (
    <div className="report-wrapper bg-black min-h-screen py-8 print:py-0 print:bg-white flex flex-col items-center gap-6">
      {/* Global Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          body {
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .report-wrapper {
            background-color: white !important;
            padding: 0 !important;
          }
          .a4-page {
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}} />

      {/* Top Control Panel (Hidden on print) */}
      <div className="w-[210mm] bg-[#050508] rounded-none shadow-none p-6 flex flex-col md:flex-row gap-4 justify-between items-center print:hidden border border-zinc-900 max-w-full">
        <div>
          <h2 className="text-sm font-bold tracking-widest text-white uppercase flex items-center gap-2 font-sans">
            🏏 PLAYVISION Dossier Controls
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Print or securely dispatch this biomechanical evaluation report directly to coaches or scouts.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Print Button */}
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-zinc-900 text-white border border-zinc-800 hover:bg-zinc-800 px-4 py-2.5 rounded-none text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            🖨️ Print Dossier
          </button>

          {/* Email Dispatch Form */}
          <form onSubmit={handleSendEmail} className="flex items-center gap-2 flex-1 md:flex-initial min-w-[280px]">
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter coach or scout's email..."
              required
              className="bg-black border border-zinc-800 text-xs px-3 py-2.5 rounded-none flex-1 outline-none focus:border-white text-white transition-all"
            />
            <button 
              type="submit" 
              disabled={isSending}
              className="bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-700 px-4 py-2.5 rounded-none text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
            >
              {isSending ? "Sending..." : "📧 Send"}
            </button>
          </form>
        </div>
      </div>

      {/* Success/Error Toast notification */}
      {sendStatus && (
        <div className={`w-[210mm] rounded-none px-5 py-4 border print:hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-2 shadow-md animate-fade-in max-w-full ${
          sendStatus.success 
            ? "bg-emerald-950/20 border-emerald-900 text-emerald-400" 
            : "bg-rose-950/20 border-rose-900 text-rose-400"
        }`}>
          <div className="text-xs font-semibold">
            {sendStatus.success ? "✅ " : "❌ "} {sendStatus.message}
          </div>
          {sendStatus.previewUrl && (
            <a 
              href={sendStatus.previewUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-emerald-500 text-black hover:bg-emerald-400 text-[10px] font-black px-3 py-1.5 rounded-none shadow transition-all uppercase tracking-widest shrink-0 cursor-pointer"
            >
              🔍 Click to Preview Email
            </a>
          )}
        </div>
      )}

      {/* Reusable ScoutingReportView */}
      <ScoutingReportView data={data} />
    </div>
  );
}
