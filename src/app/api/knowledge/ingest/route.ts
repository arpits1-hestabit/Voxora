import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chunkText, embedText } from "@/lib/knowledge/embeddings";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let { agentId, name, type, content, url } = await req.json();

    if (!agentId || !name || !type || !content) {
      return NextResponse.json(
        { error: "Missing required fields: agentId, name, type, content" },
        { status: 400 },
      );
    }

    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, user_id")
      .eq("id", agentId)
      .eq("user_id", user.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Extract text from PDF if needed
    if (type === "pdf" && content) {
      try {
        // Use unpdf - simple, modern PDF parser for Node.js
        const { extractText } = await import("unpdf");

        // content should be base64 encoded PDF
        const buffer = Buffer.from(content, "base64");

        // Extract text from PDF (unpdf requires Uint8Array)
        const result = await extractText(new Uint8Array(buffer));

        // unpdf returns { text: string | string[], totalPages: number }
        let extractedText = "";
        if (typeof result.text === "string") {
          extractedText = result.text;
        } else if (Array.isArray(result.text)) {
          // If text is an array of page texts, join them
          extractedText = result.text.join("\n");
        } else {
          extractedText = String(result.text || "");
        }

        content = extractedText.trim();
        logger.log(
          `Extracted ${content.length} characters from PDF (${result.totalPages} pages)`,
        );
      } catch (pdfError: any) {
        logger.error("PDF parsing error:", pdfError);
        return NextResponse.json(
          { error: `Failed to parse PDF: ${pdfError.message}` },
          { status: 400 },
        );
      }
    }

    const { data: knowledgeRow, error: insertKnowledgeError } = await supabase
      .from("knowledge_base")
      .insert([
        {
          agent_id: agentId,
          name,
          type,
          content,
          url: url || null,
        },
      ])
      .select()
      .single();

    if (insertKnowledgeError || !knowledgeRow) {
      return NextResponse.json(
        { error: insertKnowledgeError?.message || "Failed to store knowledge" },
        { status: 500 },
      );
    }

    const chunks = chunkText(content, 800, 120);

    if (chunks.length > 0) {
      const chunkRows = await Promise.all(
        chunks.map(async (chunk, index) => ({
          knowledge_base_id: knowledgeRow.id,
          agent_id: agentId,
          chunk_index: index,
          chunk_text: chunk,
          embedding: await embedText(chunk),
          metadata: {
            source_name: name,
            source_type: type,
            source_url: url || null,
          },
        })),
      );

      const { error: chunkInsertError } = await supabase
        .from("knowledge_chunks")
        .insert(chunkRows);

      if (chunkInsertError) {
        logger.error("Failed to store knowledge chunks:", chunkInsertError);
      }
    }

    return NextResponse.json({
      knowledge: knowledgeRow,
      chunkCount: chunks.length,
    });
  } catch (error: any) {
    logger.error("Knowledge ingest error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
