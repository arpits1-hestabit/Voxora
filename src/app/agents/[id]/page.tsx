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
import { ArrowLeft, Phone, Edit, Trash2 } from "lucide-react";
import { DeleteAgentButton } from "@/components/agent/delete-agent-button";

export default async function AgentPage({
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

  const { data: agent, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !agent) {
    redirect("/dashboard");
  }

  // Fetch knowledge base
  const { data: knowledgeBase } = await supabase
    .from("knowledge_base")
    .select("*")
    .eq("agent_id", agent.id);

  // Fetch recent calls
  const { data: recentCalls } = await supabase
    .from("calls")
    .select("*")
    .eq("agent_id", agent.id)
    .order("created_at", { ascending: false })
    .limit(5);

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
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex gap-2">
            <Link href={`/agents/${agent.id}/edit`}>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300 hover:bg-gray-800/50 hover:text-white hover:border-cyan-500/50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
            <DeleteAgentButton agentId={agent.id} agentName={agent.name} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            {agent.name}
          </h1>
          <p className="mt-2 text-gray-400">
            {agent.description || "No description"}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="md:col-span-2 bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
            <CardHeader>
              <CardTitle className="text-white">Agent Configuration</CardTitle>
              <CardDescription className="text-gray-400">
                Current settings for this agent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">
                  System Prompt
                </h3>
                <p className="text-sm text-gray-400 bg-gray-900/50 p-3 rounded-md whitespace-pre-wrap border border-gray-700/50">
                  {agent.system_prompt}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-1">
                    Voice
                  </h3>
                  <p className="text-sm text-gray-400">
                    {agent.voice_id} ({agent.voice_provider})
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-1">
                    Model
                  </h3>
                  <p className="text-sm text-gray-400">{agent.model}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-1">
                    Temperature
                  </h3>
                  <p className="text-sm text-gray-400">{agent.temperature}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-1">
                    Created
                  </h3>
                  <p className="text-sm text-gray-400">
                    {new Date(agent.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href={`/agents/${agent.id}/call`} className="block">
                <Button className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 transition-all duration-300">
                  <Phone className="h-4 w-4 mr-2" />
                  Start Call
                </Button>
              </Link>
              <Link href={`/agents/${agent.id}/knowledge`} className="block">
                <Button
                  variant="outline"
                  className="w-full border-gray-700 text-gray-300 hover:bg-gray-800/50 hover:text-white hover:border-cyan-500/50"
                >
                  Upload Knowledge
                </Button>
              </Link>
              <Link href={`/calls?agent=${agent.id}`} className="block">
                <Button
                  variant="outline"
                  className="w-full border-gray-700 text-gray-300 hover:bg-gray-800/50 hover:text-white hover:border-cyan-500/50"
                >
                  View Call History
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Knowledge Base</CardTitle>
                <Link href={`/agents/${agent.id}/knowledge`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-300 hover:text-white hover:bg-gray-800/50"
                  >
                    Manage
                  </Button>
                </Link>
              </div>
              <CardDescription className="text-gray-400">
                {knowledgeBase?.length || 0} documents uploaded
              </CardDescription>
            </CardHeader>
            <CardContent>
              {knowledgeBase && knowledgeBase.length > 0 ? (
                <div className="space-y-2">
                  {knowledgeBase.map((kb) => (
                    <div
                      key={kb.id}
                      className="flex items-center justify-between p-3 bg-gray-900/50 border border-gray-700/50 rounded-lg hover:border-cyan-500/50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          {kb.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {kb.type.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No knowledge base uploaded yet</p>
                  <Link href={`/agents/${agent.id}/knowledge`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 border-gray-700 text-gray-300 hover:bg-gray-800/50 hover:text-white hover:border-cyan-500/50"
                    >
                      Upload Documents
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
            <CardHeader>
              <CardTitle className="text-white">Recent Calls</CardTitle>
              <CardDescription className="text-gray-400">
                Last {recentCalls?.length || 0} conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentCalls && recentCalls.length > 0 ? (
                <div className="space-y-2">
                  {recentCalls.map((call) => (
                    <Link
                      key={call.id}
                      href={`/calls/${call.id}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-3 bg-gray-900/50 border border-gray-700/50 rounded-lg hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {call.status === "completed" ? "✓" : "•"}{" "}
                            {call.duration}s
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(call.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div
                          className={`text-xs px-2 py-1 rounded-full ${
                            call.status === "completed"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {call.status}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No calls yet</p>
                  <Link href={`/agents/${agent.id}/call`}>
                    <Button
                      size="sm"
                      className="mt-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 shadow-lg shadow-cyan-500/30"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Start First Call
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
