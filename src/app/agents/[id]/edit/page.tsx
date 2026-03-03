"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logger } from "@/lib/logger";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";

const VOICE_OPTIONS = [
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Bella",
    provider: "elevenlabs",
    description: "Soft & friendly female voice",
  },
  {
    id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    provider: "elevenlabs",
    description: "Deep & professional male voice",
  },
  {
    id: "ThT5KcBeYPX3keUQqHPh",
    name: "Rachel",
    provider: "elevenlabs",
    description: "Calm & professional female voice",
  },
  {
    id: "TxGEqnHWrfWFTfGW9XjX",
    name: "Josh",
    provider: "elevenlabs",
    description: "Young & energetic male voice",
  },
  {
    id: "VR6AewLTigWG4xSOukaG",
    name: "Arnold",
    provider: "elevenlabs",
    description: "Strong & mature male voice",
  },
  {
    id: "onwK4e9ZLuTAKqWW03F9",
    name: "Daniel",
    provider: "elevenlabs",
    description: "British & authoritative male voice",
  },
];

const LLM_MODELS = [
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B (Fast & Smart)",
    provider: "groq",
  },
];

export default function EditAgentPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    systemPrompt: "",
    voiceProvider: "elevenlabs",
    voiceId: "ThT5KcBeYPX3keUQqHPh",
    model: "llama-3.1-8b-instant",
    temperature: 0.7,
  });

  useEffect(() => {
    async function loadAgent() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/login");
          return;
        }

        const { data: agent, error } = await supabase
          .from("agents")
          .select("*")
          .eq("id", params.id)
          .eq("user_id", user.id)
          .single();

        if (error || !agent) {
          setError("Agent not found");
          setLoading(false);
          return;
        }

        setFormData({
          name: agent.name,
          description: agent.description || "",
          systemPrompt: agent.system_prompt,
          voiceProvider: agent.voice_provider,
          voiceId: agent.voice_id,
          model: agent.model,
          temperature: agent.temperature,
        });
        setLoading(false);
      } catch (err: any) {
        logger.error("Error loading agent:", err);
        setError(err.message || "Failed to load agent");
        setLoading(false);
      }
    }

    loadAgent();
  }, [params.id, router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("agents")
        .update({
          name: formData.name,
          description: formData.description,
          system_prompt: formData.systemPrompt,
          voice_provider: formData.voiceProvider,
          voice_id: formData.voiceId,
          model: formData.model,
          temperature: formData.temperature,
        })
        .eq("id", params.id)
        .eq("user_id", user.id);

      if (error) throw error;

      router.push(`/agents/${params.id}`);
    } catch (err: any) {
      logger.error("Agent update error:", err);
      setError(err.message || "Failed to update agent");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-cyan-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading agent...</p>
        </div>
      </div>
    );
  }

  if (error && !formData.name) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <header className="border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-xl">
          <div className="container mx-auto flex h-16 items-center px-4">
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
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
            <CardHeader>
              <CardTitle className="text-white">Error</CardTitle>
              <CardDescription className="text-red-400">
                {error}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard">
                <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white">
                  Back to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

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
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href={`/agents/${params.id}`}>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-white hover:bg-gray-800/50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Agent
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Edit Agent
          </h1>
          <p className="mt-2 text-gray-400">
            Update your agent's configuration and settings
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-white">Agent Configuration</CardTitle>
            <CardDescription className="text-gray-400">
              Customize your agent's behavior and voice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Agent Name *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Customer Support Agent"
                  required
                  className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description of what this agent does"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-700 bg-gray-900/50 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500/50 placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  System Prompt *
                </label>
                <textarea
                  value={formData.systemPrompt}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData({ ...formData, systemPrompt: e.target.value })
                  }
                  placeholder="You are a helpful AI assistant..."
                  rows={6}
                  required
                  className="w-full px-3 py-2 border border-gray-700 bg-gray-900/50 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500/50 placeholder:text-gray-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This defines your agent's personality and behavior
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Voice *
                </label>
                <select
                  value={formData.voiceId}
                  onChange={(e) =>
                    setFormData({ ...formData, voiceId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-700 bg-gray-900/50 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  required
                >
                  {VOICE_OPTIONS.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} - {voice.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Language Model *
                </label>
                <select
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-700 bg-gray-900/50 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  required
                >
                  {LLM_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Temperature:{" "}
                  <span className="text-cyan-400">{formData.temperature}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      temperature: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Precise (0.0)</span>
                  <span>Creative (1.0)</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 transition-all duration-300"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Link href={`/agents/${params.id}`} className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-gray-700 text-gray-300 hover:bg-gray-800/50 hover:text-white hover:border-cyan-500/50"
                  >
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
