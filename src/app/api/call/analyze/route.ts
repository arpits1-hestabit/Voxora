import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const GROQ_API_KEY = process.env.GROQ_API_KEY!;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { callId } = await req.json();

    if (!callId) {
      return NextResponse.json({ error: "Missing callId" }, { status: 400 });
    }

    // Fetch call with transcript
    const { data: call, error: callError } = await supabase
      .from("calls")
      .select("*")
      .eq("id", callId)
      .eq("user_id", user.id)
      .single();

    if (callError || !call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    if (!call.transcript || call.transcript.length === 0) {
      return NextResponse.json(
        { error: "No transcript available for analysis" },
        { status: 400 },
      );
    }

    // Generate transcript text
    const transcriptText = call.transcript
      .map((t: any) => `${t.role === "user" ? "User" : "Agent"}: ${t.content}`)
      .join("\n");

    // Analyze with Groq LLM
    const analysis = await analyzeConversation(transcriptText);

    if (!analysis) {
      return NextResponse.json(
        { error: "Failed to analyze conversation" },
        { status: 500 },
      );
    }

    // Store analytics in database metadata
    const { data: updatedCall, error: updateError } = await supabase
      .from("calls")
      .update({
        metadata: {
          sentiment: analysis.sentiment,
          topics: analysis.topics,
          summary: analysis.summary,
          keyPoints: analysis.keyPoints,
          qualityScore: analysis.qualityScore,
          analyzed_at: new Date().toISOString(),
        },
      })
      .eq("id", callId)
      .select()
      .single();

    if (updateError) {
      logger.error("Analytics storage error", { error: updateError });
      return NextResponse.json(
        { error: "Failed to store analytics" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      analytics: {
        sentiment: analysis.sentiment,
        topics: analysis.topics,
        summary: analysis.summary,
        keyPoints: analysis.keyPoints,
        qualityScore: analysis.qualityScore,
      },
    });
  } catch (error: any) {
    logger.error("Call analysis error", { error });
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

async function analyzeConversation(transcript: string): Promise<{
  sentiment: "positive" | "neutral" | "negative";
  topics: string[];
  summary: string;
  keyPoints: string[];
  qualityScore: number;
} | null> {
  try {
    const prompt = `Analyze the following conversation transcript and provide:
1. Overall sentiment (positive, neutral, or negative)
2. Main topics discussed (list of 3-5 topics)
3. Brief summary (2-3 sentences)
4. Key points or takeaways (list of 3-5 points)
5. Quality score from 1-10 (based on clarity, helpfulness, and professionalism)

Transcript:
${transcript}

Respond ONLY with a valid JSON object in this exact format:
{
  "sentiment": "positive|neutral|negative",
  "topics": ["topic1", "topic2", ...],
  "summary": "Brief summary here",
  "keyPoints": ["point1", "point2", ...],
  "qualityScore": 8.5
}`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content:
                "You are a conversation analyst. Always respond with valid JSON only, no additional text.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      },
    );

    if (!response.ok) {
      logger.error("Groq analysis error", { text: await response.text() });
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return null;
    }

    // Parse JSON response
    const parsed = JSON.parse(content);

    return {
      sentiment: parsed.sentiment,
      topics: parsed.topics || [],
      summary: parsed.summary,
      keyPoints: parsed.keyPoints || [],
      qualityScore: parsed.qualityScore,
    };
  } catch (error) {
    logger.error("Conversation analysis error", { error });
    return null;
  }
}
