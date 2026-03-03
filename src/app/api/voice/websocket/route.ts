import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  cosineSimilarity,
  embedText,
  tokenize,
} from "@/lib/knowledge/embeddings";

const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;

type KnowledgeRow = {
  name: string;
  type: string;
  content: string;
  url: string | null;
};

type KnowledgeChunkRow = {
  id: string;
  chunk_text: string;
  embedding: number[] | string;
  metadata: {
    source_name?: string;
    source_type?: string;
    source_url?: string | null;
  } | null;
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { callId, agentId, transcription } = await req.json();

    // Validate inputs
    if (!callId || !agentId || !transcription) {
      return NextResponse.json(
        {
          error: "Missing required fields: callId, agentId, transcription",
        },
        { status: 400 },
      );
    }

    // Fetch agent configuration
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .eq("user_id", user.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Fetch call
    const { data: call } = await supabase
      .from("calls")
      .select("*")
      .eq("id", callId)
      .single();

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    // Setup SSE stream
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const enqueueEvent = (eventType: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(
              `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
        };

        const run = async () => {
          try {
            // Send transcript_final first
            enqueueEvent("transcript_final", {
              text: transcription,
              timestamp: new Date().toISOString(),
            });

            // Build knowledge context
            const transcript = call.transcript || [];
            transcript.push({
              role: "user",
              content: transcription,
              timestamp: new Date().toISOString(),
            });

            const { data: knowledgeRows } = await supabase
              .from("knowledge_base")
              .select("name, type, content, url")
              .eq("agent_id", agentId)
              .order("created_at", { ascending: false })
              .limit(100);

            const { data: knowledgeChunks } = await supabase
              .from("knowledge_chunks")
              .select("id, chunk_text, embedding, metadata")
              .eq("agent_id", agentId)
              .limit(400);

            const knowledgeContext = await buildKnowledgeContext(
              transcription,
              transcript,
              (knowledgeRows || []) as KnowledgeRow[],
              (knowledgeChunks || []) as KnowledgeChunkRow[],
            );

            // Stream LLM response
            let llmResponse = "";
            await streamLLMResponse(
              agent.system_prompt,
              transcript,
              agent.model,
              agent.temperature,
              knowledgeContext,
              (token) => {
                llmResponse += token;
                enqueueEvent("llm_token", { token });
              },
            );

            logger.log("LLM response accumulated", {
              length: llmResponse.length,
              preview: llmResponse.substring(0, 100),
            });

            // Generate and stream audio
            if (llmResponse) {
              const audioChunk = await synthesizeSpeech(
                llmResponse,
                agent.voice_id,
              );
              if (audioChunk) {
                enqueueEvent("audio_chunk", { chunk: audioChunk });
              }
            }

            // Update transcript in database
            transcript.push({
              role: "assistant",
              content: llmResponse,
              timestamp: new Date().toISOString(),
            });

            await supabase
              .from("calls")
              .update({ transcript })
              .eq("id", callId);

            // Send completion event
            logger.log("Sending response_complete event", {
              textLength: llmResponse.length,
              hasText: !!llmResponse,
            });
            enqueueEvent("response_complete", {
              text: llmResponse,
              timestamp: new Date().toISOString(),
            });

            controller.close();
          } catch (error: any) {
            logger.error("SSE stream error: ", error);
            enqueueEvent("error", {
              error: error?.message || "Internal server error",
            });
            controller.close();
          }
        };

        void run();
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    logger.error("WebSocket handler error: ", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

async function streamLLMResponse(
  systemPrompt: string,
  transcript: any[],
  model: string,
  temperature: number,
  knowledgeContext: string,
  onToken: (token: string) => void,
): Promise<void> {
  try {
    const groundedSystemPrompt = knowledgeContext
      ? `${systemPrompt}

Knowledge base context for this agent:
${knowledgeContext}

Rules for using knowledge base:
- Prefer facts from the knowledge base when relevant to the user question.
- If the answer is not present in the knowledge base, clearly say you don't have that information.
- Do not invent policy, pricing, technical details, or links not present in the context.
- Keep responses concise and helpful.`
      : systemPrompt;

    const messages = [
      { role: "system", content: groundedSystemPrompt },
      ...transcript.map((t) => ({ role: t.role, content: t.content })),
    ];

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: 150,
          stream: true,
        }),
      },
    );

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      logger.error("Groq streaming error", { error: errorText });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let tokenCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || !line.startsWith("data:")) {
          continue;
        }

        const data = line.replace(/^data:\s*/, "");
        if (data === "[DONE]") {
          continue;
        }

        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content || "";
          if (token) {
            tokenCount++;
            onToken(token);
          }
        } catch {
          // Ignore malformed partial lines
        }
      }
    }

    logger.log("Groq streaming complete", { tokenCount });
  } catch (error) {
    logger.error("Streaming LLM error: ", error);
    throw error;
  }
}

function parseEmbedding(rawEmbedding: number[] | string): number[] {
  if (Array.isArray(rawEmbedding)) {
    return rawEmbedding;
  }

  if (typeof rawEmbedding === "string") {
    try {
      const parsed = JSON.parse(rawEmbedding);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

async function buildKnowledgeContext(
  userQuery: string,
  transcript: any[],
  knowledgeRows: KnowledgeRow[],
  knowledgeChunks: KnowledgeChunkRow[],
): Promise<string> {
  const recentConversation = transcript
    .slice(-6)
    .map((item) => item?.content || "")
    .join(" ");

  const queryText = `${userQuery} ${recentConversation}`;
  const vectorContext = await buildVectorKnowledgeContext(
    queryText,
    knowledgeChunks,
  );
  if (vectorContext) {
    return vectorContext;
  }

  if (!knowledgeRows || knowledgeRows.length === 0) {
    return "";
  }

  const queryTokens = new Set(tokenize(queryText));

  const ranked = knowledgeRows
    .map((row) => {
      const text = `${row.name || ""} ${row.content || ""}`;
      const rowTokens = tokenize(text);
      let overlapScore = 0;

      for (const token of rowTokens) {
        if (queryTokens.has(token)) {
          overlapScore += 1;
        }
      }

      const densityBonus = Math.min(rowTokens.length, 500) / 500;
      const score = overlapScore + densityBonus;

      return {
        ...row,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  const topRows = ranked.slice(0, 4);
  const maxContextChars = 6000;

  let context = "";
  for (const row of topRows) {
    const header = `Source: ${row.name} (${row.type})${row.url ? `\nURL: ${row.url}` : ""}`;
    const excerpt = (row.content || "").slice(0, 1200);
    const block = `${header}\nContent:\n${excerpt}\n\n`;

    if ((context + block).length > maxContextChars) {
      break;
    }

    context += block;
  }

  return context.trim();
}

async function buildVectorKnowledgeContext(
  queryText: string,
  knowledgeChunks: KnowledgeChunkRow[],
): Promise<string> {
  if (!knowledgeChunks || knowledgeChunks.length === 0) {
    return "";
  }

  const queryEmbedding = await embedText(queryText);

  const ranked = knowledgeChunks
    .map((chunk) => {
      const embedding = parseEmbedding(chunk.embedding);
      const similarity = cosineSimilarity(queryEmbedding, embedding);

      return {
        ...chunk,
        similarity,
      };
    })
    .filter((chunk) => chunk.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 6);

  if (ranked.length === 0) {
    return "";
  }

  let context = "";
  const maxContextChars = 6000;

  for (const chunk of ranked) {
    const name = chunk.metadata?.source_name || "Knowledge Source";
    const type = chunk.metadata?.source_type || "text";
    const url = chunk.metadata?.source_url;
    const header = `Source: ${name} (${type})${url ? `\nURL: ${url}` : ""}`;
    const excerpt = (chunk.chunk_text || "").slice(0, 1200);
    const block = `${header}\nContent:\n${excerpt}\n\n`;

    if ((context + block).length > maxContextChars) {
      break;
    }

    context += block;
  }

  return context.trim();
}

async function synthesizeSpeech(
  text: string,
  voiceId: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?stream=true`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_turbo_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      },
    );

    if (!response.ok) {
      logger.error("ElevenLabs error", { text: await response.text() });
      return null;
    }

    // Convert audio to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");
    return `data:audio/mpeg;base64,${base64Audio}`;
  } catch (error) {
    logger.error("TTS error: ", error);
    return null;
  }
}
