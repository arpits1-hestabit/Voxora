import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDuration, formatDateTime } from "@/lib/utils";
import { Phone, Filter } from "lucide-react";
import { AgentFilter } from "@/components/calls/agent-filter";

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Build query - fetch calls only first
  let query = supabase
    .from("calls")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Filter by agent if specified
  if (params.agent) {
    query = query.eq("agent_id", params.agent);
  }

  const { data: calls } = await query;

  // Get all agents for filter and to enrich call data
  const { data: agents } = await supabase
    .from("agents")
    .select("id, name")
    .eq("user_id", user.id);

  // Enrich calls with agent information
  const callsWithAgents = (calls || []).map((call: any) => ({
    ...call,
    agents: agents?.find((a: any) => a.id === call.agent_id),
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
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
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Call History
            </h1>
            <p className="mt-2 text-gray-400">
              View and analyze past conversations
            </p>
          </div>

          {agents && agents.length > 1 && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <AgentFilter agents={agents} value={params.agent || ""} />
            </div>
          )}
        </div>

        <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-white">
              All Calls ({callsWithAgents?.length || 0})
            </CardTitle>
            <CardDescription className="text-gray-400">
              Complete history of voice conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {callsWithAgents && callsWithAgents.length > 0 ? (
              <div className="space-y-3">
                {callsWithAgents.map((call: any) => (
                  <Link
                    key={call.id}
                    href={`/calls/${call.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-700/50 rounded-lg hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 flex items-center justify-center group-hover:from-cyan-500/30 group-hover:to-purple-500/30 transition-all">
                          <Phone className="h-5 w-5 text-cyan-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-white group-hover:text-cyan-400 transition-colors">
                            {call.agents?.name || "Unknown Agent"}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {formatDateTime(call.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm font-medium text-white">
                            {formatDuration(call.duration || 0)}
                          </p>
                          <p className="text-xs text-gray-500">Duration</p>
                        </div>

                        <div
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            call.status === "completed"
                              ? "bg-green-500/20 text-green-400"
                              : call.status === "failed"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {call.status}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 mb-4">
                  <Phone className="h-8 w-8 text-cyan-400" />
                </div>
                <p className="text-sm">No calls yet</p>
                <p className="text-xs mt-2">
                  Start a call with one of your agents to see history here
                </p>
                <Link href="/dashboard">
                  <Button className="mt-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 shadow-lg shadow-cyan-500/30">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
