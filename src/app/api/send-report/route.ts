import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';
import { generateScoutingReportHtml } from './template';
import { generateScoutingReportPdf } from './pdfGenerator';

// Validate input request schema
const ReportRequestSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }),
  playerName: z.string().min(1, { message: "Player name is required" }),
  location: z.string().optional().default("Lucknow"),
  discipline: z.string().optional().default("Fast Bowling"),
  hand: z.string().optional().default("Right"),
  calculatedBiometrics: z.any().optional(),
  engineAnalysis: z.any().optional(),
  agentOutput: z.any().optional(),
  numbersOnlyOutput: z.any().optional(),
  capturedFrameUrl: z.string().optional().nullable(), // Base64 or Image URL
  analysisTimestamp: z.string().optional()
});

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();

    // 1. Validate incoming JSON data
    const validation = ReportRequestSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: "Validation Failure",
        details: validation.error.format()
      }, { status: 400 });
    }

    const report = validation.data;
    const finalGrade = report.agentOutput?.evaluation?.mechanical_grade || report.numbersOnlyOutput?.evaluation?.mechanical_grade || "C";

    // 2. Initialize Resend securely
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "Config Error",
        message: "Resend API Key is missing in environment variables (.env.local)."
      }, { status: 500 });
    }

    const resend = new Resend(apiKey);

    // 3. Compile the separate HTML email body template
    const htmlBody = generateScoutingReportHtml(report);

    // 4. Generate the premium PDF report file dynamically
    console.log(`[PDF] Compiling dynamic PDF report for ${report.playerName}...`);
    const pdfBuffer = await generateScoutingReportPdf(report);

    // 5. Structure Resend attachments (Attach the official PDF file)
    const attachments = [
      {
        filename: `scouting_report_${report.playerName.toLowerCase().replace(/\s+/g, '_')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ];

    // 6. Dispatch email using Resend
    // We use onboarding@resend.dev as Resend requires verified domains for custom from emails
    const response = await resend.emails.send({
      from: 'PitchVision AI <onboarding@resend.dev>',
      to: report.email,
      subject: `🏏 Scouting Report Dossier: ${report.playerName} (Grade ${finalGrade})`,
      html: htmlBody,
      attachments: attachments
    });

    if (response.error) {
      console.error("Resend API Error:", response.error);
      return NextResponse.json({
        success: false,
        error: "Resend Service Failure",
        message: response.error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: response.data?.id,
      recipient: report.email
    });

  } catch (error: any) {
    console.error("📧 [RESEND PDF REPORT API ERROR]:", error);
    return NextResponse.json({
      success: false,
      error: "Internal Server Delivery Failure",
      message: error.message || "Failed to compile PDF and dispatch email via Resend API."
    }, { status: 500 });
  }
}
