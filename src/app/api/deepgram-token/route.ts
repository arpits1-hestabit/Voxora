// Deepgram Token Generator : Returns a scoped, temporary token for client-side Deepgram connections

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET() {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Deepgram API key not configured" },
      { status: 500 },
    );
  }

  // Create a temporary project-scoped key
  try {
    const response = await fetch("https://api.deepgram.com/v1/keys", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scopes: ["usage:write"],
        time_to_live_in_seconds: 3600, // 1 hour
        comment: "Temporary client token",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("Failed to create Deepgram token", { error });
      return NextResponse.json(
        { error: "Failed to create temporary token" },
        { status: 500 },
      );
    }

    const data = await response.json();

    return NextResponse.json({
      token: data.key,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    });
  } catch (error) {
    logger.error("Error creating Deepgram token", { error });
    return NextResponse.json(
      { error: "Failed to create token" },
      { status: 500 },
    );
  }
}
