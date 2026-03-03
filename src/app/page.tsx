import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Phone, Mic, BarChart3, Brain } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-40 right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "0.5s" }}
        ></div>
        <div
          className="absolute bottom-20 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      {/* Header */}
      <header className="border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-xl relative z-10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Phone className="h-8 w-8 text-cyan-500" />
            <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Voxora
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button
                variant="ghost"
                className="text-gray-300 hover:text-white hover:bg-gray-800/50"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 shadow-lg shadow-cyan-500/30">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 relative z-10">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
            Build AI Voice Agents
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              {" "}
              In Minutes
            </span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-400">
            Create, configure, and deploy intelligent voice agents that can
            handle calls, answer questions, and provide support - all powered by
            open-source AI technology.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/auth/register">
              <Button
                size="lg"
                className="text-base bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 shadow-xl shadow-cyan-500/30"
              >
                Start Building Free
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                size="lg"
                variant="outline"
                className="text-base border-gray-700 text-gray-300 hover:bg-gray-800/50 hover:text-white"
              >
                View Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative z-10">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Everything you need to build voice agents
            </h2>
            <p className="mt-4 text-lg text-gray-400">
              Powerful features built on free and open-source technologies
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-5xl">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-gray-700/50 bg-gray-800/50 backdrop-blur-xl p-6 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all group">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 group-hover:from-cyan-500/30 group-hover:to-purple-500/30 transition-all">
                  <Mic className="h-6 w-6 text-cyan-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  Browser-Based Calls
                </h3>
                <p className="text-gray-400">
                  Real-time voice conversations directly in your browser using
                  WebRTC
                </p>
              </div>

              <div className="rounded-lg border border-gray-700/50 bg-gray-800/50 backdrop-blur-xl p-6 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all group">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 group-hover:from-purple-500/30 group-hover:to-pink-500/30 transition-all">
                  <Brain className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  Knowledge Base
                </h3>
                <p className="text-gray-400">
                  Upload documents to train your agent with custom knowledge
                </p>
              </div>

              <div className="rounded-lg border border-gray-700/50 bg-gray-800/50 backdrop-blur-xl p-6 hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/10 transition-all group">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-pink-500/20 to-cyan-500/20 group-hover:from-pink-500/30 group-hover:to-cyan-500/30 transition-all">
                  <BarChart3 className="h-6 w-6 text-pink-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  Analytics Dashboard
                </h3>
                <p className="text-gray-400">
                  Track performance with detailed call analytics and insights
                </p>
              </div>

              <div className="rounded-lg border border-gray-700/50 bg-gray-800/50 backdrop-blur-xl p-6 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all group">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 group-hover:from-cyan-500/30 group-hover:to-purple-500/30 transition-all">
                  <Phone className="h-6 w-6 text-cyan-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  Live Transcription
                </h3>
                <p className="text-gray-400">
                  See conversations transcribed in real-time as they happen
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative z-10">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-500 px-8 py-16 text-center shadow-2xl shadow-cyan-500/30">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Ready to get started?
            </h2>
            <p className="mt-4 text-lg text-cyan-50">
              Create your first voice agent in less than 5 minutes
            </p>
            <div className="mt-8">
              <Link href="/auth/register">
                <Button
                  size="lg"
                  variant="secondary"
                  className="text-base bg-white text-gray-900 hover:bg-gray-100"
                >
                  Create Free Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 bg-gray-900/50 backdrop-blur-xl relative z-10">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-sm text-gray-400">
            © 2026 Voxora Platform. Built with Next.js, Supabase, and LiveKit.
          </p>
        </div>
      </footer>
    </div>
  );
}
