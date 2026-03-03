import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDuration, formatDateTime } from "@/lib/utils";
import {
  ArrowLeft,
  Phone,
  Clock,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { AnalyzeCallButton } from "@/components/call/analyze-call-button";
import { ExportCallButton } from "@/components/call/export-call-button";

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch call first - use maybeSingle to avoid .single() errors
  const { data: call, error: callError } = await supabase
    .from("calls")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (callError) {
    logger.error("Call fetch error:", {
      message: callError.message,
      code: callError.code,
      details: callError.details,
      hint: callError.hint,
    });
    redirect("/calls");
  }

  if (!call) {
    logger.error("No call found for ID", { id, userId: user.id });
    logger.error("Checking if call exists in DB at all...");
    const { data: anyCall } = await supabase
      .from("calls")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();
    logger.error("Call in DB:", anyCall);
    redirect("/calls");
  }

  // Fetch agent separately (to avoid RLS policy issues with nested select)
  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id, name, voice_id, voice_provider, model")
    .eq("id", call.agent_id)
    .maybeSingle();

  if (agentError) {
    logger.error("Agent fetch error:", agentError);
  }

  if (!agent) {
    logger.error("No agent found for agent_id:", call.agent_id);
  }

  // Attach agent to call object for consistency
  const callWithAgent = { ...call, agents: agent };

  // Extract analytics from call metadata
  const analytics = callWithAgent.metadata?.sentiment
    ? callWithAgent.metadata
    : null;

  // Parse transcript if available
  const transcript = callWithAgent.transcript || [];

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <header className="border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-xl relative z-10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/calls">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-white hover:bg-gray-800/50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Calls
            </Button>
          </Link>

          <div className="flex gap-2">
            {!analytics && callWithAgent.status === "completed" && (
              <AnalyzeCallButton callId={id} />
            )}
            <ExportCallButton
              callId={id}
              agentName={callWithAgent.agents?.name || "Unknown"}
              transcript={transcript}
              analytics={analytics}
              callData={callWithAgent}
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        {/* Call Overview */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-12 w-12 rounded-full bg-linear-to-r from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
              <Phone className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-linear-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Call with {callWithAgent.agents?.name}
              </h1>
              <p className="text-gray-400">
                {formatDateTime(callWithAgent.created_at)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                    callWithAgent.status === "completed"
                      ? "bg-green-500/20 text-green-400"
                      : callWithAgent.status === "failed"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {callWithAgent.status}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Duration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-cyan-400" />
                  <span className="text-2xl font-bold text-white">
                    {formatDuration(callWithAgent.duration || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-purple-400" />
                  <span className="text-2xl font-bold text-white">
                    {transcript.length}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Quality Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-pink-400" />
                  <span className="text-2xl font-bold text-white">
                    {analytics?.qualityScore || "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Transcript */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-white">Transcript</CardTitle>
                <CardDescription className="text-gray-400">
                  Complete conversation history
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transcript.length > 0 ? (
                  <div className="space-y-4 max-h-150 overflow-y-auto">
                    {transcript.map((message: any, index: number) => (
                      <div
                        key={index}
                        className={`flex ${
                          message.role === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-3 backdrop-blur-sm ${
                            message.role === "user"
                              ? "bg-linear-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/20"
                              : "bg-gray-700/50 text-gray-100 border border-gray-600/50"
                          }`}
                        >
                          <p className="text-sm font-medium mb-1">
                            {message.role === "user"
                              ? "You"
                              : callWithAgent.agents?.name}
                          </p>
                          <p className="text-sm">{message.content}</p>
                          {message.timestamp && (
                            <p className="text-xs mt-1 opacity-70">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <p className="text-sm">No transcript available</p>
                    <p className="text-xs mt-2 text-gray-500">
                      Transcription happens during live calls
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Analytics & Scorecard */}
          <div className="space-y-6">
            <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-white">Call Analytics</CardTitle>
                <CardDescription className="text-gray-400">
                  AI-powered insights
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analytics ? (
                  <>
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">
                        Sentiment
                      </h4>
                      <div
                        className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                          analytics.sentiment === "positive"
                            ? "bg-green-500/20 text-green-400"
                            : analytics.sentiment === "negative"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-gray-700 text-gray-300"
                        }`}
                      >
                        {analytics.sentiment || "neutral"}
                      </div>
                    </div>

                    {analytics.topics && analytics.topics.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-2">
                          Topics Discussed
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {analytics.topics.map(
                            (topic: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded border border-cyan-500/30"
                              >
                                {topic}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    {analytics.summary && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-2">
                          Summary
                        </h4>
                        <p className="text-sm text-gray-300">
                          {analytics.summary}
                        </p>
                      </div>
                    )}

                    {analytics.keyPoints && analytics.keyPoints.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-2">
                          Key Points
                        </h4>
                        <ul className="space-y-1">
                          {analytics.keyPoints.map(
                            (point: string, idx: number) => (
                              <li
                                key={idx}
                                className="text-sm text-gray-300 flex items-start"
                              >
                                <span className="text-cyan-400 mr-2">•</span>
                                {point}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <TrendingUp className="h-10 w-10 mx-auto mb-3 text-gray-600" />
                    <p className="text-sm">No analytics available</p>
                    <p className="text-xs mt-1 text-gray-500">
                      Analytics are generated after completed calls
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-white">Configuration</CardTitle>
                <CardDescription className="text-gray-400">
                  Agent settings used
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-400">Voice:</span>
                  <span className="ml-2 font-medium text-white">
                    {callWithAgent.agents?.voice_id || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Model:</span>
                  <span className="ml-2 font-medium text-white">
                    {callWithAgent.agents?.model || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Room:</span>
                  <span className="ml-2 font-mono text-xs text-gray-300">
                    {callWithAgent.room_name}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
