import { NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

export const maxDuration = 30;

export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    message: "PitchVision AI API is live",
    env_configured: !!(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY),
    is_live: true
  });
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: "Config Error", message: "API Key missing" }, { status: 500 });
    }

    // Initialize provider inside handler to ensure fresh env access
    const googleProvider = createGoogleGenerativeAI({ apiKey });

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Parse Error", message: "Invalid JSON" }, { status: 400 });
    }

    const { player_name, location, discipline, hand, biometrics, analysis } = body;

    const systemPrompt = `You are PitchVision AI, an elite Biomechanical Analyst for Grassroots Cricket.
Your task is to analyze mechanical joint angles (elbow extension, knee bracing, head stability) against professional benchmarks.
Identify structural strengths and weaknesses, and flag any illegal bowling actions (flexion > 15 degrees).

Your output must be structured as valid JSON matching the following schema:
{
  "evaluation": {
    "strengths": ["string"],
    "weaknesses": ["string"],
    "mechanical_grade": "A|B|C|D",
    "technical_summary": "string"
  }
}`;

    const userPrompt = `
Analyze the following player statistics and biomechanical joint angles:
- Player Name: ${player_name}
- Location: ${location}
- Discipline: ${discipline} (${hand}-handed)
- Telemetry Joint Metrics: ${JSON.stringify(biometrics)}
- Bio-Engine Scoring: ${JSON.stringify(analysis)}

Generate the structured JSON response. Return only raw, valid JSON.`;

    try {
      const { text } = await generateText({
        model: googleProvider('gemini-2.5-flash-lite'),
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.1,
      });

      if (!text) throw new Error("Empty AI response");

      // Robust JSON extraction: Strip markdown code blocks if present
      let cleanText = text.trim();
      if (cleanText.startsWith('```')) {
        const match = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match && match[1]) {
          cleanText = match[1].trim();
        }
      }

      return NextResponse.json(JSON.parse(cleanText));

    } catch (aiError: any) {
      console.error("AI SDK ERROR:", aiError);
      return NextResponse.json({ 
        error: "AI_SDK_FAILURE", 
        message: aiError.message,
        details: aiError.toString(),
        stack: aiError.stack?.split('\n').slice(0, 3) // Send a snippet of the stack
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("GLOBAL API ERROR:", error);
    return NextResponse.json({ 
      error: "GLOBAL_FAILURE", 
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3)
    }, { status: 500 });
  }
}
