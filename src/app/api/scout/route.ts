import { NextResponse } from "next/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";

export const maxDuration = 30;

export async function GET() {
	return NextResponse.json({
		status: "ok",
		message: "PitchVision AI API is live",
		env_configured: !!(
			process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY
		),
		timestamp: new Date().toISOString(),
	});
}

export async function POST(req: Request) {
	try {
		const apiKey =
			process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

		if (!apiKey) {
			return NextResponse.json(
				{ error: "Config Error", message: "API Key missing" },
				{ status: 500 },
			);
		}

		// Initialize provider inside handler to ensure fresh env access
		const googleProvider = createGoogleGenerativeAI({ apiKey });

		let body;
		try {
			body = await req.json();
		} catch (e) {
			return NextResponse.json(
				{ error: "Parse Error", message: "Invalid JSON" },
				{ status: 400 },
			);
		}

		const {
			player_name,
			location,
			discipline,
			hand,
			biometrics,
			analysis,
			frame_image,
		} = body;

		const systemPrompt = `You are PitchVision AI, an elite Biomechanical Analyst for Grassroots Cricket.
Your task is to analyze mechanical joint angles (elbow extension, knee bracing, head stability, hip extension) against professional benchmarks.
Identify structural strengths and weaknesses, and flag any illegal bowling actions (flexion > 15 degrees).

PROFESSIONAL BIOMECHANICAL BENCHMARKS (IJSDR2208101 RESEARCH):
- Fast Bowling:
  * Bowling Arm Elbow flexion should be < 15° (ICC Limit).
  * Front Knee bracing should be braced (160° - 180°).
- Front-Foot Cover Drive:
  * Leading Elbow Angle at execution should be high and extended between 95° and 115° (Elite/Tier 1) for optimal swing control.
  * Front Knee Stride Flex at placement/execution should lunge and bend between 110° and 135° (Elite/Tier 1) for low center of gravity and weight transfer.
  * Back Hip Extension at execution should be extended between 165° and 180° (Elite/Tier 1) to indicate complete forward weight shift and rotation.

CRITICAL INSTRUCTION: You MUST NOT invent your own numeric scores. The Bio-Engine Scoring math provided in the prompt is the absolute source of truth. Use the provided image ONLY to provide visual context (e.g., 'Due to camera occlusion...', or 'The image confirms...'). Do not let the image override the hard mathematical percentages.

GRADING RULES — use ONLY these three grades, nothing else:
- "A" (Elite): Stance Match >= 72%. Mechanics are at professional standard.
- "B" (Developing): Stance Match 45%–71%. Good foundation, needs specific corrections.
- "C" (Needs Work): Stance Match < 45%. Multiple significant mechanical deviations.
Note: Camera angle introduces ~10° of phantom measurement error for side-on footage. Account for this leniency.

You MUST return your final response as valid JSON matching the following schema:
{
  "evaluation": {
    "strengths": ["string"],
    "weaknesses": ["string"],
    "mechanical_grade": "A|B|C",
    "technical_summary": "string"
  },
  "vernacular_feedback": {
    "coaching_tips_awadhi": "string",
    "coaching_tips_hindi": "string"
  }
}

IMPORTANT: If the player has a mechanical_grade of 'A' and Stance Match > 85, you MUST call the dispatch_upca_dossier tool. 
Always return the final JSON structure after your tool calls.`;

		const userPrompt = `
Analyze the following player statistics and biomechanical joint angles:
- Player Name: ${player_name}
- Location: ${location}
- Discipline: ${discipline} (${hand}-handed)
- Telemetry Joint Metrics: ${JSON.stringify(biometrics)}
- Bio-Engine Scoring: ${JSON.stringify(analysis)}

Generate the structured JSON response. Return only raw, valid JSON.`;

		const messages: any[] = [
			{
				role: "user",
				content: [{ type: "text", text: userPrompt }],
			},
		];

		if (frame_image) {
			try {
				// AI SDK handles full Data URLs safely when passed as a string or URL object.
				messages[0].content.push({
					type: "image",
					image: new URL(frame_image),
				});
			} catch (e) {
				console.error("Invalid image URL format", e);
			}
		}

		try {
			const { text, steps } = await generateText({
				model: googleProvider("gemini-2.5-flash"), // Reverting to 2.5 series which is supported by their SDK version
				system: systemPrompt,
				messages: messages,
				temperature: 0.1,
				stopWhen: stepCountIs(3),
				tools: {
					dispatch_upca_dossier: tool({
						description:
							"Autonomously dispatch a dossier email to UPCA Selectors if a player shows exceptional raw talent (Grade A).",
						inputSchema: z.object({
							player_name: z.string(),
							mechanical_grade: z.string(),
							match_percentage: z.number(),
							justification: z
								.string()
								.describe(
									"Brief technical reason why this player is being recommended to UPCA",
								),
						}),
						execute: async ({
							player_name,
							mechanical_grade,
							match_percentage,
							justification,
						}) => {
							console.log(
								`[OUTREACH AGENT] 📧 Dispatched dossier for ${player_name} (Grade ${mechanical_grade}, Match: ${match_percentage}%) to selectors@upca.tv. Reason: ${justification}`,
							);
							return {
								success: true,
								dispatched_to: "selectors@upca.tv",
								timestamp: new Date().toISOString(),
							};
						},
					}),
				},
			});

			if (!text || typeof text !== "string") {
				throw new Error("Empty or invalid AI response format");
			}

			// Robust JSON extraction: Strip markdown code blocks if present
			let cleanText = text.trim();
			if (cleanText.startsWith("```")) {
				const match = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
				if (match && match[1]) {
					cleanText = match[1].trim();
				}
			}

			const parsedResponse = JSON.parse(cleanText);

			// Check if the tool was called in any of the steps
			const outreachDispatched = steps.some((step) =>
				step.toolCalls.some(
					(call) => call.toolName === "dispatch_upca_dossier",
				),
			);

			parsedResponse.outreach_dispatched = outreachDispatched;

			return NextResponse.json(parsedResponse);
		} catch (aiError: any) {
			console.error("AI SDK ERROR:", aiError);
			return NextResponse.json(
				{
					error: "AI_SDK_FAILURE",
					message: aiError.message,
					details: aiError.toString(),
					stack: aiError.stack?.split("\n").slice(0, 3), // Send a snippet of the stack
				},
				{ status: 500 },
			);
		}
	} catch (error: any) {
		console.error("GLOBAL API ERROR:", error);
		return NextResponse.json(
			{
				error: "GLOBAL_FAILURE",
				message: error.message,
				stack: error.stack?.split("\n").slice(0, 3),
			},
			{ status: 500 },
		);
	}
}
