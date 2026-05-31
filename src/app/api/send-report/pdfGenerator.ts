import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { ScoutingReportData } from './template';

// Helper to filter out emojis and characters that WinAnsi standard fonts cannot encode (0x00 - 0xFF)
function cleanText(str: string): string {
  if (!str) return "";
  return str
    .replace(/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[^\x00-\xFF]/g, '') // Strip anything outside standard Western European / WinAnsi range
    .replace(/\s+/g, ' ')
    .trim();
}

export async function generateScoutingReportPdf(data: ScoutingReportData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  
  // A4 portrait: 595.28 width, 841.89 height
  const page = pdfDoc.addPage([595.28, 841.89]);
  
  // Load Helvetica built-in fonts (no node_modules file reading at runtime)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);
  const fontCourierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const finalGrade = data.agentOutput?.evaluation?.mechanical_grade || data.numbersOnlyOutput?.evaluation?.mechanical_grade || "C";
  const matchPercent = data.engineAnalysis?.match_percentage ?? 80;

  // Colors
  const primaryColor = rgb(74/255, 75/255, 215/255); // #4a4bd7 (Brand Violet)
  const textColor = rgb(44/255, 49/255, 73/255); // #2c3149 (Dark text)
  const grayColor = rgb(89/255, 94/255, 120/255); // #595e78
  const lightBgColor = rgb(243/255, 242/255, 255/255); // #f3f2ff
  const borderColor = rgb(226/255, 232/255, 240/255); // #e2e8f0
  
  // Dynamic grade colors
  const getGradeColors = (grade: string) => {
    switch (grade) {
      case "A": return { bg: rgb(209/255, 250/255, 229/255), text: rgb(6/255, 95/255, 70/255) };
      case "B": return { bg: rgb(254/255, 243/255, 199/255), text: rgb(146/255, 64/255, 14/255) };
      case "C":
      default: return { bg: rgb(254/255, 226/255, 226/255), text: rgb(153/255, 27/255, 27/255) };
    }
  };
  const finalGradeColor = getGradeColors(finalGrade);

  // 1. Header Section (y: 841.89 - 30 down to 841.89 - 75)
  page.drawText('SCOUTING REPORT', {
    x: 40,
    y: 841.89 - 50,
    size: 24,
    font: fontBold,
    color: textColor
  });

  page.drawText('PITCHVISION AI • BIOMECHANICS', {
    x: 40,
    y: 841.89 - 64,
    size: 9,
    font: fontBold,
    color: primaryColor
  });

  // Header metadata (Right side)
  const metaY = 841.89 - 42;
  page.drawText(`ID: PV-LKO-${Math.floor(1000 + Math.random() * 9000)}`, { x: 440, y: metaY, size: 7.5, font: fontCourier, color: grayColor });
  page.drawText(`Date: ${cleanText(data.analysisTimestamp || new Date().toLocaleDateString())}`, { x: 440, y: metaY - 10, size: 7.5, font: fontCourier, color: grayColor });
  page.drawText(`Mode: ${data.capturedFrameUrl ? 'Video Frame' : 'Static Image'}`, { x: 440, y: metaY - 20, size: 7.5, font: fontCourier, color: grayColor });

  page.drawLine({
    start: { x: 40, y: 841.89 - 72 },
    end: { x: 555.28, y: 841.89 - 72 },
    thickness: 2,
    color: primaryColor
  });

  // 2. Player Info Block (y: 841.89 - 85 to 841.89 - 135)
  const profileY = 841.89 - 135;
  page.drawRectangle({
    x: 40,
    y: profileY,
    width: 515.28,
    height: 50,
    color: lightBgColor
  });

  page.drawRectangle({
    x: 40,
    y: profileY,
    width: 515.28,
    height: 50,
    borderColor: borderColor,
    borderWidth: 1
  });

  page.drawText('PLAYER PROFILE', { x: 55, y: profileY + 36, size: 7.5, font: fontBold, color: rgb(116/255, 47/255, 229/255) });
  page.drawText(cleanText(data.playerName), { x: 55, y: profileY + 14, size: 14, font: fontBold, color: textColor });

  // Grid details on the right inside profile block
  page.drawText('Location:', { x: 260, y: profileY + 34, size: 8, font: fontBold, color: grayColor });
  page.drawText(cleanText(data.location || 'Lucknow'), { x: 340, y: profileY + 34, size: 8, font: fontBold, color: textColor });

  page.drawText('Discipline:', { x: 260, y: profileY + 21, size: 8, font: fontBold, color: grayColor });
  page.drawText(`${cleanText(data.discipline || 'Fast Bowling')} (${cleanText(data.hand || 'Right')}-hand)`, { x: 340, y: profileY + 21, size: 8, font: fontBold, color: textColor });

  page.drawText('Bio Accuracy:', { x: 260, y: profileY + 8, size: 8, font: fontBold, color: grayColor });
  page.drawText(`${matchPercent}%`, { x: 340, y: profileY + 8, size: 8, font: fontBold, color: primaryColor });

  // 3. Biomechanical Telemetry Table (y: 841.89 - 150 to 841.89 - 240)
  const tableTitleY = profileY - 20;
  page.drawText('BIOMECHANICAL TELEMETRY', { x: 40, y: tableTitleY, size: 9, font: fontBold, color: textColor });
  
  page.drawLine({
    start: { x: 40, y: tableTitleY - 5 },
    end: { x: 555.28, y: tableTitleY - 5 },
    thickness: 1,
    color: borderColor
  });

  const tableHeaderY = tableTitleY - 18;
  page.drawText('PARAMETER', { x: 50, y: tableHeaderY, size: 7.5, font: fontBold, color: grayColor });
  page.drawText('ACTUAL VALUE', { x: 280, y: tableHeaderY, size: 7.5, font: fontBold, color: grayColor });
  page.drawText('STANDARD EXPECTED', { x: 430, y: tableHeaderY, size: 7.5, font: fontBold, color: grayColor });

  const metrics = data.discipline === "Fast Bowling" ? [
    { label: "Bowling Arm Elbow Flexion", val: data.calculatedBiometrics?.bowling_arm_elbow_angle, limit: "< 15 (ICC Limit)" },
    { label: "Front Knee Bracing Angle", val: data.calculatedBiometrics?.front_knee_bracing_angle, limit: "160 - 180 (Elite)" },
    { label: "Torso Lateral Flexion", val: data.calculatedBiometrics?.torso_lateral_flexion_angle, limit: "20 - 30 (Elite)" }
  ] : [
    { label: "Leading Elbow Angle", val: data.calculatedBiometrics?.leading_elbow_angle, limit: "95 - 115 (Elite)" },
    { label: "Front Knee Stride Flex", val: data.calculatedBiometrics?.front_knee_flex_angle, limit: "110 - 130 (Elite)" },
    { label: "Back Hip Extension", val: data.calculatedBiometrics?.back_hip_angle, limit: "160 - 180 (Elite)" },
    { label: "Head/Shoulder Alignment", val: data.calculatedBiometrics?.head_alignment, limit: "< 0.15 (Elite)" }
  ];

  let currentY = tableHeaderY - 20;
  metrics.forEach((m, idx) => {
    page.drawRectangle({
      x: 40,
      y: currentY,
      width: 515.28,
      height: 16,
      color: idx % 2 === 0 ? rgb(250/255, 250/255, 250/255) : rgb(1, 1, 1)
    });

    page.drawText(cleanText(m.label), { x: 50, y: currentY + 4, size: 8, font: fontBold, color: grayColor });
    page.drawText(m.val !== undefined ? `${m.val}°` : 'N/A', { x: 280, y: currentY + 4, size: 8.5, font: fontCourierBold, color: primaryColor });
    page.drawText(cleanText(m.limit), { x: 430, y: currentY + 4, size: 8, font: fontCourier, color: grayColor });

    currentY -= 16;
  });

  // 4. AI Analysis Comparison Side by Side (y: currentY - 15 to currentY - 395)
  const comparisonTitleY = currentY - 15;
  page.drawText('AI ANALYSIS COMPARISON', { x: 40, y: comparisonTitleY, size: 9, font: fontBold, color: textColor });
  
  page.drawLine({
    start: { x: 40, y: comparisonTitleY - 5 },
    end: { x: 555.28, y: comparisonTitleY - 5 },
    thickness: 1,
    color: borderColor
  });

  // Two columns heights layout
  const colY = comparisonTitleY - 370;
  const colHeight = 355;
  const colWidth = 245;

  // --- COLUMN 1: RAW ANGLE ANALYSIS (LEFT) ---
  const leftColX = 40;
  page.drawRectangle({
    x: leftColX,
    y: colY,
    width: colWidth,
    height: colHeight,
    color: rgb(251/255, 248/255, 255/255)
  });

  page.drawRectangle({
    x: leftColX,
    y: colY,
    width: colWidth,
    height: colHeight,
    borderColor: borderColor,
    borderWidth: 1
  });

  // Col 1 Title
  page.drawText('RAW ANGLE ANALYSIS', { x: leftColX + 15, y: colY + colHeight - 20, size: 8.5, font: fontBold, color: grayColor });
  
  // Col 1 Grade Badge
  const rawGrade = data.numbersOnlyOutput?.evaluation?.mechanical_grade || "C";
  const rawGradeColor = getGradeColors(rawGrade);
  page.drawRectangle({
    x: leftColX + colWidth - 55,
    y: colY + colHeight - 23,
    width: 42,
    height: 15,
    color: rawGradeColor.bg
  });
  page.drawText(`GRADE ${rawGrade}`, {
    x: leftColX + colWidth - 52,
    y: colY + colHeight - 19,
    size: 6.5,
    font: fontBold,
    color: rawGradeColor.text
  });

  page.drawLine({
    start: { x: leftColX + 15, y: colY + colHeight - 30 },
    end: { x: leftColX + colWidth - 15, y: colY + colHeight - 30 },
    thickness: 0.5,
    color: borderColor
  });

  // Summary (Col 1)
  page.drawText('Summary:', { x: leftColX + 15, y: colY + colHeight - 45, size: 7.5, font: fontBold, color: grayColor });
  const rawSummary = data.numbersOnlyOutput?.evaluation?.technical_summary || "No raw summary available.";
  page.drawText(cleanText(rawSummary), {
    x: leftColX + 15,
    y: colY + colHeight - 145, // Allocate space
    size: 7.2,
    font: fontRegular,
    color: textColor,
    maxWidth: colWidth - 30,
    lineHeight: 9.5
  });

  // Key Weaknesses (Col 1)
  const weaknessesTitleY = colY + colHeight - 160;
  page.drawText('Key Weaknesses:', { x: leftColX + 15, y: weaknessesTitleY, size: 7.5, font: fontBold, color: rgb(220/255, 38/255, 38/255) });
  
  const rawWeaknesses: string[] = data.numbersOnlyOutput?.evaluation?.weaknesses || [];
  let weaknessY = weaknessesTitleY - 11;
  if (rawWeaknesses.length > 0) {
    rawWeaknesses.slice(0, 3).forEach((w) => {
      page.drawText(`- ${cleanText(w)}`, {
        x: leftColX + 20,
        y: weaknessY,
        size: 7.0,
        font: fontRegular,
        color: rgb(185/255, 28/255, 28/255),
        maxWidth: colWidth - 35,
        lineHeight: 8.5
      });
      weaknessY -= 19;
    });
  } else {
    page.drawText('- None noted.', { x: leftColX + 20, y: weaknessY, size: 7, font: fontRegular, color: grayColor });
    weaknessY -= 12;
  }

  // Coaching Tip Box (Col 1)
  const tipBoxY = colY + 15;
  page.drawRectangle({
    x: leftColX + 15,
    y: tipBoxY,
    width: colWidth - 30,
    height: 70,
    color: rgb(1, 1, 1),
    borderColor: borderColor,
    borderWidth: 0.5
  });
  page.drawText('Coaching Tip (Hindi):', { x: leftColX + 22, y: tipBoxY + 56, size: 7, font: fontBold, color: primaryColor });
  
  const rawTipHindi = data.numbersOnlyOutput?.vernacular_feedback?.coaching_tips_hindi || "No tip available.";
  page.drawText(cleanText(rawTipHindi), {
    x: leftColX + 22,
    y: tipBoxY + 44,
    size: 7,
    font: fontOblique,
    color: textColor,
    maxWidth: colWidth - 44,
    lineHeight: 9
  });


  // --- COLUMN 2: VISION ENHANCED (RIGHT) ---
  const rightColX = 310;
  // Border thickness 1.5 to emphasize
  page.drawRectangle({
    x: rightColX,
    y: colY,
    width: colWidth,
    height: colHeight,
    color: rgb(1, 1, 1)
  });

  page.drawRectangle({
    x: rightColX,
    y: colY,
    width: colWidth,
    height: colHeight,
    borderColor: primaryColor,
    borderWidth: 1.5
  });

  // Top Vision Enhanced Tag
  page.drawRectangle({
    x: rightColX + colWidth - 85,
    y: colY + colHeight - 12,
    width: 85,
    height: 12,
    color: primaryColor
  });
  page.drawText('VISION ENHANCED', {
    x: rightColX + colWidth - 80,
    y: colY + colHeight - 9,
    size: 6,
    font: fontBold,
    color: rgb(1, 1, 1)
  });

  // Col 2 Title
  page.drawText('WITH IMAGE/VIDEO', { x: rightColX + 15, y: colY + colHeight - 20, size: 8.5, font: fontBold, color: primaryColor });
  
  // Col 2 Grade Badge
  const visionGrade = data.agentOutput?.evaluation?.mechanical_grade || "C";
  const visionGradeColor = getGradeColors(visionGrade);
  page.drawRectangle({
    x: rightColX + colWidth - 135,
    y: colY + colHeight - 23,
    width: 42,
    height: 15,
    color: visionGradeColor.bg
  });
  page.drawText(`GRADE ${visionGrade}`, {
    x: rightColX + colWidth - 132,
    y: colY + colHeight - 19,
    size: 6.5,
    font: fontBold,
    color: visionGradeColor.text
  });

  // Col 2 Divider
  page.drawLine({
    start: { x: rightColX + 15, y: colY + colHeight - 30 },
    end: { x: rightColX + colWidth - 15, y: colY + colHeight - 30 },
    thickness: 0.5,
    color: borderColor
  });

  // Dynamic Image Frame in Column 2 (y: colY + colHeight - 125, height: 85)
  const imgFrameY = colY + colHeight - 125;
  page.drawRectangle({
    x: rightColX + 15,
    y: imgFrameY,
    width: colWidth - 30,
    height: 85,
    color: rgb(251/255, 251/255, 255/255),
    borderColor: borderColor,
    borderWidth: 0.5
  });

  if (data.capturedFrameUrl && data.capturedFrameUrl.startsWith('data:image')) {
    try {
      const base64Data = data.capturedFrameUrl.split(';base64,').pop();
      if (base64Data) {
        const imgBuffer = Buffer.from(base64Data, 'base64');
        let embeddedImage;
        if (data.capturedFrameUrl.includes('image/png')) {
          embeddedImage = await pdfDoc.embedPng(imgBuffer);
        } else {
          embeddedImage = await pdfDoc.embedJpg(imgBuffer);
        }

        // Draw pose image scaled centered inside the frame
        page.drawImage(embeddedImage, {
          x: rightColX + 15 + ((colWidth - 30) - 130) / 2, // Center align
          y: imgFrameY + 5,
          width: 130,
          height: 75
        });
      }
    } catch (imgErr) {
      console.error("Failed to render image inside Col 2 PDF:", imgErr);
    }
  } else {
    page.drawText('Pose Skeleton Not Captured', {
      x: rightColX + 45,
      y: imgFrameY + 38,
      size: 7.5,
      font: fontOblique,
      color: grayColor
    });
  }

  // Visual Summary (Col 2) (y: imgFrameY - 80)
  const visualSummaryTitleY = imgFrameY - 14;
  page.drawText('Visual Summary:', { x: rightColX + 15, y: visualSummaryTitleY, size: 7.5, font: fontBold, color: grayColor });
  
  const visionSummary = data.agentOutput?.evaluation?.technical_summary || "No visual summary available.";
  page.drawText(cleanText(visionSummary), {
    x: rightColX + 15,
    y: visualSummaryTitleY - 9, // Draw multi-line down
    size: 7.2,
    font: fontRegular,
    color: textColor,
    maxWidth: colWidth - 30,
    lineHeight: 9.5
  });

  // Contextual Tip Box (Col 2)
  const rightTipBoxY = colY + 15;
  page.drawRectangle({
    x: rightColX + 15,
    y: rightTipBoxY,
    width: colWidth - 30,
    height: 70,
    color: rgb(243/255, 242/255, 255/255), // light purple highlight
    borderColor: rgb(221/255, 214/255, 254/255),
    borderWidth: 0.5
  });
  page.drawText('Contextual Tip (Awadhi):', { x: rightColX + 22, y: rightTipBoxY + 56, size: 7, font: fontBold, color: primaryColor });
  
  const visionTipAwadhi = data.agentOutput?.vernacular_feedback?.coaching_tips_awadhi || "No tip available.";
  page.drawText(cleanText(visionTipAwadhi), {
    x: rightColX + 22,
    y: rightTipBoxY + 44,
    size: 7,
    font: fontOblique,
    color: primaryColor,
    maxWidth: colWidth - 44,
    lineHeight: 9
  });


  // 5. Final Verdict (y: colY - 100 to colY - 20)
  const verdictY = colY - 85;
  page.drawRectangle({
    x: 40,
    y: verdictY,
    width: 515.28,
    height: 65,
    color: rgb(250/255, 250/255, 255/255)
  });

  page.drawRectangle({
    x: 40,
    y: verdictY,
    width: 515.28,
    height: 65,
    borderColor: primaryColor,
    borderWidth: 1
  });

  page.drawText('FINAL VERDICT', { x: 55, y: verdictY + 48, size: 9, font: fontBold, color: textColor });
  
  const verdictText = `Based on multimodal analysis combining joint telemetry and spatial visual processing, the player exhibits a Grade ${finalGrade} mechanism. Focus on the vision-enhanced feedback for holistic improvement.`;
  page.drawText(cleanText(verdictText), {
    x: 55,
    y: verdictY + 34,
    size: 8,
    font: fontRegular,
    color: grayColor,
    maxWidth: 350,
    lineHeight: 11
  });

  // Large Verdict Grade Badge (Right side of verdict)
  page.drawRectangle({
    x: 440,
    y: verdictY + 10,
    width: 100,
    height: 45,
    color: finalGradeColor.bg
  });

  page.drawText('OVERALL GRADE', {
    x: 440,
    y: verdictY + 44,
    size: 6.5,
    font: fontBold,
    color: finalGradeColor.text,
    maxWidth: 100,
    lineHeight: 8
  });

  page.drawText(finalGrade, {
    x: 440 + 42,
    y: verdictY + 16,
    size: 22,
    font: fontBold,
    color: finalGradeColor.text
  });

  // 6. Footer branding
  page.drawText('Generated by PitchVision AI — Professional Multimodal Scouting for Grassroots Cricket.', {
    x: 40,
    y: 20,
    size: 7.5,
    font: fontRegular,
    color: grayColor,
    maxWidth: 515.28,
    lineHeight: 10
  });

  // Save the document and compile as Buffer
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
