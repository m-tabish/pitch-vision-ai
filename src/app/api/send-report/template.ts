// 🏏 separate email template for PitchVision AI Scouting Dossiers

export interface ScoutingReportData {
  playerName: string;
  location?: string;
  discipline?: string;
  hand?: string;
  calculatedBiometrics?: Record<string, any>;
  engineAnalysis?: Record<string, any>;
  agentOutput?: Record<string, any>;
  numbersOnlyOutput?: Record<string, any>;
  analysisTimestamp?: string;
  capturedFrameUrl?: string | null;
}

export function generateScoutingReportHtml(data: ScoutingReportData): string {
  const finalGrade = data.agentOutput?.evaluation?.mechanical_grade || data.numbersOnlyOutput?.evaluation?.mechanical_grade || "C";
  const matchPercent = data.engineAnalysis?.match_percentage ?? 80;

  // Grade badge color schemes
  const getColors = (grade: string) => {
    switch (grade) {
      case "A": return { bg: "#d1fae5", text: "#065f46", border: "#34d399" };
      case "B": return { bg: "#fef3c7", text: "#92400e", border: "#fbbf24" };
      case "C":
      default: return { bg: "#fee2e2", text: "#991b1b", border: "#f87171" };
    }
  };
  const colors = getColors(finalGrade);

  // Dynamic telemetry rows based on discipline
  const metrics = data.discipline === "Fast Bowling" ? [
    { label: "Bowling Arm Elbow Flexion", val: data.calculatedBiometrics?.bowling_arm_elbow_angle, limit: "< 15° (ICC Limit)" },
    { label: "Front Knee Bracing Angle", val: data.calculatedBiometrics?.front_knee_bracing_angle, limit: "160° - 180°" },
    { label: "Torso Lateral Flexion", val: data.calculatedBiometrics?.torso_lateral_flexion_angle, limit: "20° - 30°" }
  ] : [
    { label: "Leading Elbow Angle", val: data.calculatedBiometrics?.leading_elbow_angle, limit: "65° - 100°" },
    { label: "Front Knee Stride Flex", val: data.calculatedBiometrics?.front_knee_flex_angle, limit: "115° - 145°" },
    { label: "Head/Shoulder Alignment", val: data.calculatedBiometrics?.head_alignment, limit: "< 0.15 deviation" }
  ];

  const metricsHtml = metrics.map(m => `
    <tr>
      <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569; font-size: 13px;">${m.label}</td>
      <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; color: #4a4bd7; text-align: right; font-size: 13px;">${m.val !== undefined ? m.val + '°' : 'N/A'}</td>
      <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #64748b; text-align: right; font-size: 12px;">${m.limit}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PitchVision AI Scouting Dossier</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #1f2937; margin: 0; padding: 20px; }
          .container { max-width: 600px; background: #ffffff; border-radius: 12px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e5e7eb; }
          .header { background: #4a4bd7; color: #ffffff; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
          .header p { margin: 5px 0 0 0; font-size: 12px; font-weight: 600; opacity: 0.9; letter-spacing: 2px; text-transform: uppercase; }
          .content { padding: 25px 20px; }
          .profile-box { background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 15px 20px; margin-bottom: 25px; }
          .profile-title { font-size: 9px; font-weight: bold; color: #7c3aed; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
          .profile-name { margin: 0; color: #1f2937; font-size: 18px; font-weight: 800; }
          .profile-meta { font-size: 12px; color: #4b5563; }
          .grade-section { float: right; text-align: right; margin-top: -38px; }
          .grade-badge { display: inline-block; background-color: ${colors.bg}; color: ${colors.text}; border: 1px solid ${colors.border}; font-weight: 800; padding: 5px 12px; border-radius: 20px; font-size: 12px; text-transform: uppercase; }
          .grade-meta { font-size: 10px; color: #4b5563; font-weight: bold; margin-top: 3px; }
          .metrics-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .metrics-table th { background: #f8fafc; color: #475569; padding: 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
          .analysis-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 15px; border-left: 4px solid #4a4bd7; }
          .analysis-card h4 { margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: #4a4bd7; letter-spacing: 0.5px; }
          .coaching-tip { font-style: italic; background: #faf5ff; border-left: 3px solid #742fe5; padding: 10px 15px; margin: 12px 0 0 0; color: #581c87; font-size: 13px; border-radius: 0 4px 4px 0; }
          .footer { background: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #6b7280; }
          .meta-footer { text-align: center; margin: 20px 0 10px 0; font-size: 11px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏏 Scouting Dossier</h1>
            <p>PitchVision AI • Biomechanics</p>
          </div>
          <div class="content">
            <div class="profile-box">
              <div class="profile-title">Player Profile</div>
              <h2 class="profile-name">${data.playerName}</h2>
              <div class="profile-meta">${data.discipline} (${data.hand}-hand)</div>
              
              <div class="grade-section">
                <div class="grade-badge">Grade ${finalGrade}</div>
                <div class="grade-meta">Accuracy: ${matchPercent}%</div>
              </div>
            </div>

            <p style="font-size: 13px; line-height: 1.6; color: #374151;">
              A formal biomechanical assessment report has been generated. The dynamic analysis data sheet is attached to this email as a CSV dossier. Below is a telemetry breakdown:
            </p>

            <table class="metrics-table">
              <thead>
                <tr>
                  <th>Telemetry Metric</th>
                  <th style="text-align: right;">Actual</th>
                  <th style="text-align: right;">Expected Target</th>
                </tr>
              </thead>
              <tbody>
                ${metricsHtml}
              </tbody>
            </table>

            <div class="analysis-card">
              <h4>🤖 Vision Enhanced Insight</h4>
              <p style="font-size: 13px; line-height: 1.6; margin: 0; color: #374151;">
                ${data.agentOutput?.evaluation?.technical_summary || data.numbersOnlyOutput?.evaluation?.technical_summary || "Visual stance coordinates captured successfully."}
              </p>
              ${data.agentOutput?.vernacular_feedback?.coaching_tips_awadhi ? `
                <div class="coaching-tip">
                  <strong>Awadhi Coaching Tip:</strong><br>
                  "${data.agentOutput.vernacular_feedback.coaching_tips_awadhi}"
                </div>
              ` : ''}
            </div>

            ${data.numbersOnlyOutput?.vernacular_feedback?.coaching_tips_hindi ? `
              <div class="analysis-card" style="border-left: 4px solid #742fe5;">
                <h4>📣 Hindi Coaching Tip</h4>
                <p style="font-size: 13px; font-style: italic; color: #4b5563; margin: 0;">
                  "${data.numbersOnlyOutput.vernacular_feedback.coaching_tips_hindi}"
                </p>
              </div>
            ` : ''}

            <div class="meta-footer">
              <p style="margin: 0 0 5px 0;">Captured Location: 📍 ${data.location ?? 'Lucknow'}</p>
              <p style="margin: 0; font-family: monospace; font-size: 10px; color: #9ca3af;">Dossier Timestamp: ${data.analysisTimestamp || new Date().toLocaleString()}</p>
            </div>
          </div>
          <div class="footer">
            <p style="margin: 0;">Generated by PitchVision AI — Elite Biomechanical Scouting for Grassroots Cricket.</p>
            <p style="margin: 5px 0 0 0; font-size: 9px; opacity: 0.7;">This email was sent via the Resend API Integration.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
