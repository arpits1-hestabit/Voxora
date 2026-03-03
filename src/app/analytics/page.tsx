"use client";
import { logger } from "@/lib/logger";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";
import {
  Phone,
  Clock,
  TrendingUp,
  Users,
  BarChart3,
  Download,
  Calendar,
} from "lucide-react";

export default function AnalyticsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const [backfillAttempted, setBackfillAttempted] = useState(false);
  const [stats, setStats] = useState<any>({
    totalCalls: 0,
    totalDuration: 0,
    avgDuration: 0,
    completedCalls: 0,
    avgQualityScore: null,
    analyticsCount: 0,
    hasAnalytics: false,
    topAgents: [],
    callsByDay: [],
    sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
  });

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/login");
          return;
        }

        // Calculate date range
        const now = new Date();
        const startDate = new Date();
        if (timeRange === "7d") startDate.setDate(now.getDate() - 7);
        else if (timeRange === "30d") startDate.setDate(now.getDate() - 30);
        else if (timeRange === "90d") startDate.setDate(now.getDate() - 90);

        // Fetch calls in time range
        const { data: calls } = await supabase
          .from("calls")
          .select(
            `
            *,
            agents (id, name)
          `,
          )
          .eq("user_id", user.id)
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: false });

        const missingAnalyticsCalls = (calls || []).filter((call: any) => {
          if (call.status !== "completed") return false;
          if (call.metadata?.sentiment) return false; // Already has analytics
          return Array.isArray(call.transcript) && call.transcript.length > 0;
        });

        if (!backfillAttempted && missingAnalyticsCalls.length > 0) {
          setBackfillAttempted(true);
          await Promise.all(
            missingAnalyticsCalls.slice(0, 5).map((call: any) =>
              fetch("/api/call/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ callId: call.id }),
              }),
            ),
          );

          await fetchAnalytics();
          return;
        }

        // Calculate stats
        const totalCalls = calls?.length || 0;
        const totalDuration =
          calls?.reduce((sum, call) => sum + (call.duration || 0), 0) || 0;
        const avgDuration =
          totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
        const completedCalls =
          calls?.filter((c) => c.status === "completed").length || 0;

        // Extract analytics from call metadata
        const analyticsCount =
          calls?.filter((c) => c.metadata?.sentiment).length || 0;
        const hasAnalytics = analyticsCount > 0;

        // Quality scores
        const qualityScores = (calls || [])
          .map((c) =>
            typeof c.metadata?.qualityScore === "number"
              ? c.metadata.qualityScore
              : null,
          )
          .filter((score): score is number => score !== null);
        const avgQualityScore =
          qualityScores.length > 0
            ? (
                qualityScores.reduce((sum, score) => sum + score, 0) /
                qualityScores.length
              ).toFixed(1)
            : null;

        // Top agents
        const agentCounts: {
          [key: string]: { name: string; count: number; duration: number };
        } = {};
        calls?.forEach((call) => {
          const agentId = call.agent_id;
          if (!agentCounts[agentId]) {
            agentCounts[agentId] = {
              name: call.agents?.name || "Unknown",
              count: 0,
              duration: 0,
            };
          }
          agentCounts[agentId].count++;
          agentCounts[agentId].duration += call.duration || 0;
        });
        const topAgents = Object.values(agentCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Sentiment breakdown
        const sentimentBreakdown = {
          positive:
            calls?.filter((c) => c.metadata?.sentiment === "positive").length ||
            0,
          neutral:
            calls?.filter((c) => c.metadata?.sentiment === "neutral").length ||
            0,
          negative:
            calls?.filter((c) => c.metadata?.sentiment === "negative").length ||
            0,
        };

        // Calls by day (for chart)
        const callsByDay: { [key: string]: number } = {};
        calls?.forEach((call) => {
          const date = new Date(call.created_at).toLocaleDateString();
          callsByDay[date] = (callsByDay[date] || 0) + 1;
        });
        const callsByDayArray = Object.entries(callsByDay)
          .map(([date, count]) => ({ date, count }))
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );

        setStats({
          totalCalls,
          totalDuration,
          avgDuration,
          completedCalls,
          avgQualityScore,
          analyticsCount,
          hasAnalytics,
          topAgents,
          callsByDay: callsByDayArray,
          sentimentBreakdown,
        });

        setLoading(false);
      } catch (err) {
        logger.error("Error fetching analytics: ", err);
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [timeRange, router, supabase, backfillAttempted]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 animate-pulse text-cyan-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

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
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-white hover:bg-gray-800/50"
            >
              Back to Dashboard
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="rounded-md border border-gray-700 bg-gray-900/50 text-white px-3 py-2 text-sm focus:border-cyan-500/50 focus:ring-cyan-500/20"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              className="border-gray-700 text-gray-300 hover:bg-gray-800/50 hover:text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-linear-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Analytics Dashboard
          </h1>
          <p className="mt-2 text-gray-400">
            Insights and metrics from your voice calls
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/20 transition-all group">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 group-hover:text-cyan-400 flex items-center gap-2 transition-colors">
                <Phone className="h-4 w-4 text-cyan-500" />
                Total Calls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {stats.totalCalls}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.completedCalls} completed
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/20 transition-all group">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 group-hover:text-purple-400 flex items-center gap-2 transition-colors">
                <Clock className="h-4 w-4 text-purple-500" />
                Total Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {formatDuration(stats.totalDuration)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Avg: {formatDuration(stats.avgDuration)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50 hover:border-pink-500/50 hover:shadow-xl hover:shadow-pink-500/20 transition-all group">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 group-hover:text-pink-400 flex items-center gap-2 transition-colors">
                <TrendingUp className="h-4 w-4 text-pink-500" />
                Avg Quality
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {stats.avgQualityScore ?? "N/A"}
              </div>
              <p className="text-xs text-gray-500 mt-1">Out of 10.0</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/20 transition-all group">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 group-hover:text-cyan-400 flex items-center gap-2 transition-colors">
                <Users className="h-4 w-4 text-cyan-500" />
                Active Agents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {stats.topAgents.length}
              </div>
              <p className="text-xs text-gray-500 mt-1">In use this period</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          {/* Top Agents */}
          <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
            <CardHeader>
              <CardTitle className="text-white">
                Top Performing Agents
              </CardTitle>
              <CardDescription className="text-gray-400">
                By total number of calls
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.topAgents.length > 0 ? (
                <div className="space-y-4">
                  {stats.topAgents.map((agent: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-linear-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
                          <span className="text-sm font-bold bg-linear-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                            #{idx + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-white">{agent.name}</p>
                          <p className="text-sm text-gray-400">
                            {agent.count} calls •{" "}
                            {formatDuration(agent.duration)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="h-2 w-32 bg-gray-700/50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-linear-to-r from-cyan-500 to-purple-500"
                            style={{
                              width: `${(agent.count / stats.totalCalls) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-10 w-10 mx-auto mb-3 text-gray-600" />
                  <p className="text-sm">No data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sentiment Analysision */}
          <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
            <CardHeader>
              <CardTitle className="text-white">Sentiment Analysis</CardTitle>
              <CardDescription className="text-gray-400">
                Overall call sentiment distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-400">Positive</span>
                    <span className="text-sm font-medium text-green-400">
                      {stats.hasAnalytics
                        ? stats.sentimentBreakdown.positive
                        : "N/A"}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: `${
                          stats.hasAnalytics
                            ? (stats.sentimentBreakdown.positive /
                                Math.max(stats.analyticsCount, 1)) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-400">Neutral</span>
                    <span className="text-sm font-medium text-gray-400">
                      {stats.hasAnalytics
                        ? stats.sentimentBreakdown.neutral
                        : "N/A"}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-500"
                      style={{
                        width: `${
                          stats.hasAnalytics
                            ? (stats.sentimentBreakdown.neutral /
                                Math.max(stats.analyticsCount, 1)) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-400">Negative</span>
                    <span className="text-sm font-medium text-red-400">
                      {stats.hasAnalytics
                        ? stats.sentimentBreakdown.negative
                        : "N/A"}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500"
                      style={{
                        width: `${
                          stats.hasAnalytics
                            ? (stats.sentimentBreakdown.negative /
                                Math.max(stats.analyticsCount, 1)) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {!stats.hasAnalytics && (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-10 w-10 mx-auto mb-3 text-gray-600" />
                  <p className="text-sm">No analyzed calls yet</p>
                  <p className="text-xs mt-2">
                    Run analysis on a call to see sentiment breakdowns
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Call Activity Chart */}
        <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Calendar className="h-5 w-5 text-pink-400" />
              Call Activity
            </CardTitle>
            <CardDescription className="text-gray-400">
              Daily call volume over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.callsByDay.length > 0 ? (
              <div className="space-y-2">
                {stats.callsByDay.map((day: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-24 text-sm text-gray-400 text-right">
                      {day.date}
                    </div>
                    <div className="flex-1">
                      <div className="h-8 bg-gray-700/30 rounded overflow-hidden">
                        <div
                          className="h-full bg-linear-to-r from-pink-500 to-purple-500 flex items-center px-2"
                          style={{
                            width: `${(day.count / Math.max(...stats.callsByDay.map((d: any) => d.count))) * 100}%`,
                            minWidth: "60px",
                          }}
                        >
                          <span className="text-xs font-medium text-white">
                            {day.count} {day.count === 1 ? "call" : "calls"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <p className="text-sm">No call activity to display</p>
                <p className="text-xs mt-2">
                  Start making calls to see activity trends
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
