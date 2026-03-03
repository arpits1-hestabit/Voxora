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
import { Phone, Plus, BarChart3, MessageSquare, LogOut } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch user's agents
  const { data: agents } = await supabase
    .from("agents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch call stats
  const { data: calls } = await supabase
    .from("calls")
    .select("*")
    .eq("user_id", user.id);

  const totalCalls = calls?.length || 0;
  const avgDuration =
    calls && calls.length > 0
      ? Math.round(
          calls.reduce((sum, call) => sum + (call.duration || 0), 0) /
            calls.length,
        )
      : 0;

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

      {/* Header */}
      <header className="border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-xl relative z-10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <Phone className="h-6 w-6 text-cyan-500 group-hover:text-cyan-400 transition-colors" />
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Voxora
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/agents"
                className="text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors"
              >
                Agents
              </Link>
              <Link
                href="/calls"
                className="text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors"
              >
                Call History
              </Link>
              <Link
                href="/analytics"
                className="text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors"
              >
                Analytics
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user.email}</span>
            <form action="/auth/signout" method="post">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:text-white hover:bg-gray-800/50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="mt-2 text-gray-400">
            Manage your voice agents and track performance
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/20 group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 group-hover:text-cyan-400 transition-colors">
                Total Agents
              </CardTitle>
              <Phone className="h-4 w-4 text-cyan-500 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {agents?.length || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">Active voice agents</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 group-hover:text-purple-400 transition-colors">
                Total Calls
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-purple-500 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{totalCalls}</div>
              <p className="text-xs text-gray-500 mt-1">
                Conversations handled
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50 hover:border-pink-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/20 group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 group-hover:text-pink-400 transition-colors">
                Avg Duration
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-pink-500 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {avgDuration}s
              </div>
              <p className="text-xs text-gray-500 mt-1">Average call length</p>
            </CardContent>
          </Card>
        </div>

        {/* Agents Section */}
        <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-white">Your Agents</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage and configure your voice agents
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/agents/new#templates-library">
                  <Button
                    variant="outline"
                    className="border-gray-700 text-gray-300 hover:bg-gray-800/50 hover:text-white hover:border-cyan-500/50"
                  >
                    View Templates
                  </Button>
                </Link>
                <Link href="/agents/new">
                  <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 transition-all duration-300">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Agent
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {agents && agents.length > 0 ? (
              <div className="space-y-4">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between rounded-lg border border-gray-700/50 bg-gray-900/50 p-4 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 group"
                  >
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                        {agent.name}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {agent.description || "No description"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/agents/${agent.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-700 text-gray-300 hover:bg-gray-800/50 hover:text-white hover:border-cyan-500/50 transition-all"
                        >
                          Configure
                        </Button>
                      </Link>
                      <Link href={`/agents/${agent.id}/call`}>
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/30 transition-all duration-300"
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Call
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 mb-4">
                  <Phone className="h-8 w-8 text-cyan-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">
                  No agents yet
                </h3>
                <p className="mt-2 text-sm text-gray-400">
                  Get started by creating your first voice agent
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <Link href="/agents/new#templates-library">
                    <Button
                      variant="outline"
                      className="border-gray-700 text-gray-300 hover:bg-gray-800/50 hover:text-white hover:border-cyan-500/50"
                    >
                      View Templates
                    </Button>
                  </Link>
                  <Link href="/agents/new">
                    <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 transition-all duration-300">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Agent
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
