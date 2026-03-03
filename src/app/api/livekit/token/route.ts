import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AccessToken } from "livekit-server-sdk";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomName, agentId } = await request.json();

    if (!roomName || !agentId) {
      return NextResponse.json(
        { error: "Room name and agent ID required" },
        { status: 400 },
      );
    }

    // Verify agent belongs to user
    const { data: agent } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .eq("user_id", user.id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Create LiveKit token
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      logger.error("Missing LiveKit environment variables", {
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
        hasLivekitUrl: !!livekitUrl,
      });
      return NextResponse.json(
        {
          error:
            "Server configuration error: missing LiveKit environment variables",
        },
        { status: 500 },
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      ttl: "5h",
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    // Create call record
    const { data: call, error: callError } = await supabase
      .from("calls")
      .insert([
        {
          agent_id: agentId,
          user_id: user.id,
          status: "in_progress",
          metadata: {
            room_name: roomName,
            start_time: new Date().toISOString(),
          },
        },
      ])
      .select()
      .single();

    if (callError) {
      logger.error("Error creating call record:", callError);
    }

    return NextResponse.json({
      token,
      url: livekitUrl,
      roomName,
      callId: call?.id,
    });
  } catch (error: any) {
    logger.error("Error generating token:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate token" },
      { status: 500 },
    );
  }
}
