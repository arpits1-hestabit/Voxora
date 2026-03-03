"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Phone, PhoneOff, Mic, MicOff, Loader2 } from "lucide-react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { RealTimeVoiceClient } from "@/lib/voice/websocket-client";

function CallInterface({
  agentId,
  callId,
  audioEnabled,
  setAudioEnabled,
}: {
  agentId: string;
  callId: string | null;
  audioEnabled: boolean;
  setAudioEnabled: (value: boolean) => void;
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<
    Array<{ speaker: string; text: string; timestamp: Date }>
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [currentResponse, setCurrentResponse] = useState(""); // Streaming LLM response
  const [userId, setUserId] = useState<string | null>(null);
  const room = useRoomContext();
  const supabase = useMemo(() => createClient(), []);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const currentAudioBufferRef = useRef<string[]>([]); // Buffer for current response chunks
  const isPlayingAudioRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null); // Reference to current audio being played
  const shouldPlayAudioRef = useRef(true); // Flag to allow/disallow audio playback
  const voiceClientRef = useRef<RealTimeVoiceClient | null>(null);
  const shouldContinueRef = useRef(false);

  // Get user ID on mount
  useEffect(() => {
    const getUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    void getUserId();
  }, []);

  useEffect(() => {
    if (room) {
      // Mute microphone initially (until user explicitly enables it)
      room.localParticipant.setMicrophoneEnabled(false);

      // Set up event listeners for the room
      room.on("trackSubscribed", (track) => {
        logger.log("Track subscribed", { kind: track.kind });
      });

      room.on("trackUnsubscribed", (track) => {
        logger.log("Track unsubscribed", { kind: track.kind });
      });

      // Add a test message to show transcript is working
      setTranscript((prev) => [
        ...prev,
        {
          speaker: "System",
          text: "Connected! Enable continuous mode to start the conversation.",
          timestamp: new Date(),
        },
      ]);
    }

    return () => {
      if (room) {
        room.removeAllListeners();
      }
      shouldContinueRef.current = false;

      // Clean up WebSocket client
      if (voiceClientRef.current) {
        voiceClientRef.current.stopStreaming();
        voiceClientRef.current = null;
      }

      // Clear audio queue and buffer
      audioQueueRef.current = [];
      currentAudioBufferRef.current = [];
      isPlayingAudioRef.current = false;
    };
  }, [room]);

  // Handle continuous mode toggle
  useEffect(() => {
    if (continuousMode && !isMuted && room && callId && userId) {
      // Enable microphone on user gesture (toggle)
      if (!audioEnabled) {
        room.localParticipant.setMicrophoneEnabled(true);
        setAudioEnabled(true);
      }

      shouldContinueRef.current = true;
      void startStreamingMode();
    } else {
      shouldContinueRef.current = false;
      stopStreamingMode();
    }
  }, [continuousMode, isMuted, callId, userId]);

  // Start streaming mode with WebSocket client
  const startStreamingMode = async () => {
    if (!room || !callId || !userId) {
      logger.warn("Cannot start streaming: missing requirements");
      return;
    }

    const micTrackPublication = room.localParticipant.getTrackPublication(
      Track.Source.Microphone,
    );

    if (!micTrackPublication || !micTrackPublication.track) {
      logger.log("Microphone not ready, retrying...");
      setTimeout(startStreamingMode, 800);
      return;
    }

    const track = micTrackPublication.track.mediaStreamTrack;
    const stream = new MediaStream([track]);

    // Initialize WebSocket client
    if (!voiceClientRef.current) {
      voiceClientRef.current = new RealTimeVoiceClient({
        callId,
        agentId,
        userId,
        onTranscriptPartial: (text) => {
          // Stop agent's audio as soon as user starts speaking
          logger.log("onTranscriptPartial fired! Text:", text.substring(0, 30));

          // Abort backend processing immediately
          if (voiceClientRef.current) {
            voiceClientRef.current.abortProcessing();
          }

          // Stop audio playback
          stopAllAudio();

          // Show partial transcription in real-time
          setCurrentResponse(text);
        },
        onTranscriptFinal: (text) => {
          logger.log(
            "onTranscriptFinal callback triggered. Text:",
            text.substring(0, 50),
          );
          // Stop any currently playing audio when user speaks again
          stopAllAudio();
          // Add user message to transcript
          setTranscript((prev) => [
            ...prev,
            {
              speaker: "user",
              text,
              timestamp: new Date(),
            },
          ]);
          setCurrentResponse("");
        },
        onLLMToken: (token) => {
          // Stream LLM response token by token
          logger.log("LLM token received", { token });
          setCurrentResponse((prev) => prev + token);
        },
        onAudioChunk: (chunk) => {
          // Buffer audio chunks - don't play individual chunks
          currentAudioBufferRef.current.push(chunk);
          logger.log(
            "Audio chunk buffered, total chunks:",
            currentAudioBufferRef.current.length,
          );
        },
        onResponseComplete: (text) => {
          // Re-enable audio playback for this response
          shouldPlayAudioRef.current = true;

          logger.log(
            "onResponseComplete triggered! Audio buffer size:",
            currentAudioBufferRef.current.length,
          );
          // Combine all buffered audio chunks into one base64 string
          if (currentAudioBufferRef.current.length > 0) {
            const completeAudio = currentAudioBufferRef.current.join("");
            logger.log("Audio response complete. Combined chunks", {
              chunks: currentAudioBufferRef.current.length,
              totalLength: completeAudio.length,
            });
            enqueueAudioResponse(completeAudio);
            currentAudioBufferRef.current = []; // Clear buffer for next response
          } else {
            logger.warn("Response complete but no audio chunks buffered!");
          }

          // Add complete response to transcript
          // Use currentResponse as fallback if text is empty (Vercel compatibility)
          const finalText = text || currentResponse;

          if (finalText) {
            setTranscript((prev) => [
              ...prev,
              {
                speaker: "agent",
                text: finalText,
                timestamp: new Date(),
              },
            ]);
          }
          setCurrentResponse("");
        },
        onError: (error) => {
          logger.error("WebSocket error", { error });
          setTranscript((prev) => [
            ...prev,
            {
              speaker: "System",
              text: `Error: ${error}`,
              timestamp: new Date(),
            },
          ]);
        },
        onConnectionChange: (connected) => {
          // Connection state is handled by continuous mode
        },
      });
    }

    // Start streaming
    await voiceClientRef.current.startStreaming(stream);
  };

  // Stop all audio playback and clear queue
  const stopAllAudio = () => {
    logger.log("Stopping all audio", {
      audioRef: currentAudioRef.current ? "exists" : "null",
      queueSize: audioQueueRef.current.length,
    });

    // Disable future audio playback
    shouldPlayAudioRef.current = false;

    // Stop currently playing audio
    if (currentAudioRef.current) {
      logger.log("Pausing audio element");
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch (err) {
        logger.error("Error pausing audio: ", err);
      }
      currentAudioRef.current = null;
    }
    // Clear audio queue and buffer
    audioQueueRef.current = [];
    currentAudioBufferRef.current = [];
    isPlayingAudioRef.current = false;
    logger.log("Audio stopped and queue cleared");
  };

  // Stop streaming mode
  const stopStreamingMode = () => {
    if (voiceClientRef.current) {
      // Stop Deepgram WebSocket
      voiceClientRef.current.stopStreaming();
    }
    // Stop all audio immediately
    stopAllAudio();
  };

  // Audio playback queue
  const playQueuedAudio = async () => {
    // Check flag before playing ANY audio
    if (!shouldPlayAudioRef.current) {
      logger.log("Audio playback disabled, clearing queue");
      audioQueueRef.current = [];
      currentAudioBufferRef.current = [];
      return;
    }

    if (isPlayingAudioRef.current) {
      logger.log("Already playing audio, queued");
    }

    const nextAudio = audioQueueRef.current.shift();
    if (!nextAudio) {
      return;
    }

    isPlayingAudioRef.current = true;

    try {
      // Validate and log the audio data
      logger.log("Playing audio", { base64Length: nextAudio.length });
      if (nextAudio.length < 100) {
        logger.warn("Audio data too small (<100 chars). Skipping.");
        isPlayingAudioRef.current = false;
        if (audioQueueRef.current.length > 0) {
          void playQueuedAudio();
        }
        return;
      }

      // Convert base64 to data URL if needed
      // ElevenLabs returns MP3 audio
      const audioUrl = nextAudio.startsWith("data:")
        ? nextAudio
        : `data:audio/mpeg;base64,${nextAudio}`;

      const audio = new Audio(audioUrl);
      logger.log("Audio element created, storing reference");
      currentAudioRef.current = audio; // Store reference for later stopping

      // Better error handling
      audio.onerror = () => {
        logger.error(
          "Audio load failed. Error:",
          audio.error?.message || audio.error,
        );
        logger.error(
          "Audio format might be incorrect. Length:",
          nextAudio.length,
        );
      };

      logger.log("Starting audio playback");
      await audio.play();

      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
      });
    } catch (error: any) {
      logger.error("Audio playback failed", { error: error?.message || error });
    } finally {
      isPlayingAudioRef.current = false;
      if (audioQueueRef.current.length > 0) {
        void playQueuedAudio();
      }
    }
  };

  const enqueueAudioResponse = (audioDataUrl: string | null) => {
    if (!audioDataUrl) {
      return;
    }

    logger.log(
      "Audio chunk enqueued, queue size:",
      audioQueueRef.current.length + 1,
    );
    audioQueueRef.current.push(audioDataUrl);
    void playQueuedAudio();
  };

  const toggleMute = () => {
    if (room) {
      const nextMuted = !isMuted;
      room.localParticipant.setMicrophoneEnabled(!nextMuted);
      setIsMuted(nextMuted);
    }
  };

  const endCall = async () => {
    // Stop continuous mode
    shouldContinueRef.current = false;
    setContinuousMode(false);
    stopStreamingMode();

    if (room) {
      await room.disconnect();
    }

    // Update call status with duration
    if (callId) {
      const normalizedTranscript = transcript.map((entry) => ({
        role: entry.speaker === "user" ? "user" : "agent",
        content: entry.text,
        timestamp: entry.timestamp,
      }));

      // Fetch the call to get start time
      const { data: existingCall } = await supabase
        .from("calls")
        .select("metadata, created_at")
        .eq("id", callId)
        .single();

      let duration = 0;
      if (existingCall) {
        const startTime =
          existingCall.metadata?.start_time || existingCall.created_at;
        const endTime = new Date();
        const start = new Date(startTime);
        // Duration in seconds
        duration = Math.floor((endTime.getTime() - start.getTime()) / 1000);
      }

      await supabase
        .from("calls")
        .update({
          status: "completed",
          duration: duration,
          transcript: normalizedTranscript,
          metadata: {
            ...existingCall?.metadata,
            end_time: new Date().toISOString(),
          },
        })
        .eq("id", callId);

      if (normalizedTranscript.length > 0) {
        try {
          await fetch("/api/call/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ callId }),
          });
        } catch (err) {
          logger.error("Auto analysis failed: ", err);
        }
      }
    }

    window.location.href = `/agents/${agentId}`;
  };

  return (
    <div className="flex flex-col h-full">
      <RoomAudioRenderer />

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-900/30">
        {transcript.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-linear-to-r from-cyan-500/20 to-purple-500/20 mb-4">
              <Mic className="h-12 w-12 text-cyan-400 animate-pulse" />
            </div>
            <p className="text-gray-400">Call in progress... Start speaking!</p>
          </div>
        ) : (
          <>
            {transcript.map((entry, index) => (
              <div
                key={index}
                className={`flex ${entry.speaker === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-md px-4 py-2 rounded-lg backdrop-blur-sm ${
                    entry.speaker === "user"
                      ? "bg-linear-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/20"
                      : "bg-gray-700/50 text-gray-100 border border-gray-600/50"
                  }`}
                >
                  <p className="text-sm font-medium mb-1">
                    {entry.speaker === "user" ? "You" : "Agent"}
                  </p>
                  <p className="text-sm">{entry.text}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {entry.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex justify-start">
                <div className="max-w-md px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600/50 backdrop-blur-sm">
                  <p className="text-sm font-medium mb-1 text-gray-300">
                    Agent
                  </p>
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                    <p className="text-sm text-gray-400">Thinking...</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-gray-700/50 bg-gray-800/50 backdrop-blur-xl p-6">
        <div className="flex flex-col items-center gap-4">
          {/* Continuous mode toggle */}
          <div className="flex items-center gap-3 p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30 backdrop-blur-sm">
            <Button
              onClick={() => setContinuousMode(!continuousMode)}
              disabled={isMuted}
              variant={continuousMode ? "default" : "outline"}
              size="sm"
              className={
                continuousMode
                  ? "bg-linear-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0"
                  : "border-gray-700 text-gray-300 hover:bg-gray-700/50"
              }
            >
              {continuousMode ? (
                <>
                  <Mic className="h-4 w-4 mr-2 animate-pulse text-white" />
                  Continuous Mode ON
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Enable Continuous Mode
                </>
              )}
            </Button>
            <span className="text-xs text-gray-400">
              {continuousMode
                ? "Auto-recording is ON"
                : "Click to enable auto-recording"}
            </span>
          </div>

          {isMuted && (
            <button
              type="button"
              onClick={toggleMute}
              className="text-xs text-orange-400 hover:text-orange-300 underline underline-offset-2"
              title="Click to unmute microphone"
            >
              ⚠️ Unmute your microphone to record (click here)
            </button>
          )}

          <div className="flex items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <Button
                size="lg"
                variant={isMuted ? "destructive" : "outline"}
                onClick={toggleMute}
                className={
                  isMuted
                    ? "rounded-full h-14 w-14 animate-pulse"
                    : "rounded-full h-14 w-14 border-gray-700 text-gray-300 hover:bg-gray-700/50"
                }
                title={isMuted ? "Unmute microphone" : "Mute microphone"}
              >
                {isMuted ? (
                  <MicOff className="h-6 w-6" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </Button>
              <span className="text-xs text-gray-400">
                {isMuted ? "Microphone is muted" : "Microphone is live"}
              </span>
            </div>

            <Button
              size="lg"
              variant="destructive"
              onClick={endCall}
              className="rounded-full h-16 w-16 bg-linear-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 border-0 shadow-lg shadow-red-500/30"
              title="End call"
            >
              <PhoneOff className="h-7 w-7" />
            </Button>

            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  continuousMode && !isMuted
                    ? "bg-cyan-500 animate-pulse"
                    : "bg-green-500"
                }`}
              ></div>
              <span className="text-sm text-gray-300">
                {continuousMode && !isMuted
                  ? "Listening..."
                  : isProcessing
                    ? "Processing..."
                    : continuousMode && !isMuted
                      ? "Continuous Mode"
                      : "Connected"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VoiceCallPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agent, setAgent] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        // Check if params.id exists
        if (!params?.id) {
          setError("Invalid agent ID");
          setLoading(false);
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/login");
          return;
        }

        // Fetch agent
        const { data: agentData, error: agentError } = await supabase
          .from("agents")
          .select("*")
          .eq("id", params.id)
          .eq("user_id", user.id)
          .single();

        if (agentError || !agentData) {
          setError("Agent not found");
          setLoading(false);
          return;
        }

        setAgent(agentData);

        // Generate room name and get token
        const room = `room-${params.id}-${Date.now()}`;
        setRoomName(room);

        const response = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomName: room,
            agentId: params.id,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get room token");
        }

        const data = await response.json();
        setToken(data.token);
        setCallId(data.callId);
        setLoading(false);
      } catch (err: any) {
        logger.error("Error initializing call: ", err);
        setError(err.message || "Failed to initialize call");
        setLoading(false);
      }
    }

    init();
  }, [params?.id, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-cyan-500 mx-auto mb-4" />
          <p className="text-gray-400">Connecting to call...</p>
        </div>
      </div>
    );
  }

  if (error || !token || !roomName) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-gray-950 via-gray-900 to-gray-950">
        <Card className="max-w-md w-full bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-white">Call Failed</CardTitle>
            <CardDescription className="text-red-400">
              {error || "Unable to connect to call"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/agents/${params?.id || ""}`}>
              <Button className="w-full bg-linear-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Agent
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <header className="border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-xl relative z-10">
        <div className="container mx-auto flex h-16 items-center px-4">
          <div className="flex items-center gap-4">
            <Phone className="h-6 w-6 text-cyan-500" />
            <div>
              <h1 className="font-semibold text-white">{agent?.name}</h1>
              <p className="text-xs text-gray-400">Voice Call</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 container mx-auto max-w-4xl relative z-10">
        <Card className="h-full flex flex-col my-6 bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-white">Live Conversation</CardTitle>
            <CardDescription className="text-gray-400">
              Speak naturally with your agent. Transcription will appear below.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            <LiveKitRoom
              token={token}
              serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL!}
              connect={true}
              audio={true}
              video={false}
              onConnected={() => setIsConnecting(false)}
              onDisconnected={() => {
                router.push(`/agents/${params?.id || ""}`);
              }}
            >
              <CallInterface
                agentId={(params?.id as string) || ""}
                callId={callId}
                audioEnabled={audioEnabled}
                setAudioEnabled={setAudioEnabled}
              />
            </LiveKitRoom>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
