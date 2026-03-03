"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

type AgentTemplate = {
  id: string;
  owner_id: string | null;
  name: string;
  description: string | null;
  system_prompt: string;
  voice_provider: string;
  voice_id: string;
  model: string;
  temperature: number;
  is_public: boolean;
  is_system: boolean;
  knowledgeCount?: number;
};

const getVoiceName = (voiceId: string) => {
  const match = VOICE_OPTIONS.find((voice) => voice.id === voiceId);
  return match?.name || voiceId;
};

const getModelName = (modelId: string) => {
  const match = LLM_MODELS.find((model) => model.id === modelId);
  return match?.name || modelId;
};

export default function NewAgentPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    systemPrompt:
      "You are a helpful AI assistant. Be friendly, professional, and concise in your responses.",
    voiceProvider: "elevenlabs",
    voiceId: "ThT5KcBeYPX3keUQqHPh", // Default to Rachel
    model: "llama-3.1-8b-instant",
    temperature: 0.7,
  });

  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [activeTemplateTab, setActiveTemplateTab] = useState<
    "prebuilt" | "my" | "marketplace"
  >("prebuilt");
  const [prebuiltTemplates, setPrebuiltTemplates] = useState<AgentTemplate[]>(
    [],
  );
  const [myTemplates, setMyTemplates] = useState<AgentTemplate[]>([]);
  const [marketplaceTemplates, setMarketplaceTemplates] = useState<
    AgentTemplate[]
  >([]);
  const [templateName, setTemplateName] = useState("");
  const [publishTemplate, setPublishTemplate] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateNotice, setTemplateNotice] = useState<string | null>(null);
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    const loadTemplates = async () => {
      setTemplatesLoading(true);
      setTemplatesError(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const [prebuiltResult, marketplaceResult, myResult] = await Promise.all(
          [
            supabase
              .from("agent_templates")
              .select("*")
              .eq("is_system", true)
              .order("name", { ascending: true }),
            supabase
              .from("agent_templates")
              .select("*")
              .eq("is_public", true)
              .eq("is_system", false)
              .order("created_at", { ascending: false }),
            user
              ? supabase
                  .from("agent_templates")
                  .select("*")
                  .eq("owner_id", user.id)
                  .order("created_at", { ascending: false })
              : Promise.resolve({ data: [] as AgentTemplate[] }),
          ],
        );

        if (prebuiltResult.error) throw prebuiltResult.error;
        if (marketplaceResult.error) throw marketplaceResult.error;
        if ((myResult as any).error) throw (myResult as any).error;

        const prebuilt = (prebuiltResult.data || []) as AgentTemplate[];
        const marketplace = (marketplaceResult.data || []) as AgentTemplate[];
        const mine = ((myResult as any).data || []) as AgentTemplate[];

        const allTemplates = [...prebuilt, ...marketplace, ...mine];
        const templateIds = allTemplates.map((template) => template.id);

        let knowledgeCountMap: Record<string, number> = {};
        if (templateIds.length > 0) {
          const { data: knowledgeRows, error: knowledgeError } = await supabase
            .from("template_knowledge")
            .select("template_id")
            .in("template_id", templateIds);

          if (knowledgeError) throw knowledgeError;

          knowledgeCountMap = (knowledgeRows || []).reduce(
            (acc: Record<string, number>, row: any) => {
              acc[row.template_id] = (acc[row.template_id] || 0) + 1;
              return acc;
            },
            {},
          );
        }

        const withCounts = (templates: AgentTemplate[]) =>
          templates.map((template) => ({
            ...template,
            knowledgeCount: knowledgeCountMap[template.id] || 0,
          }));

        if (!isMounted) return;
        setPrebuiltTemplates(withCounts(prebuilt));
        setMarketplaceTemplates(withCounts(marketplace));
        setMyTemplates(withCounts(mine));
      } catch (err: any) {
        if (!isMounted) return;
        setTemplatesError(err.message || "Failed to load templates");
      } finally {
        if (isMounted) {
          setTemplatesLoading(false);
        }
      }
    };

    loadTemplates();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("agents")
        .insert([
          {
            user_id: user.id,
            name: formData.name,
            description: formData.description,
            system_prompt: formData.systemPrompt,
            voice_provider: formData.voiceProvider,
            voice_id: formData.voiceId,
            model: formData.model,
            temperature: formData.temperature,
          },
        ])
        .select()
        .single();

      if (error) {
        // Check if it's a foreign key constraint error
        if (
          error.message.includes("foreign key constraint") ||
          error.message.includes("user_id_fkey")
        ) {
          throw new Error(
            "Your profile is not set up correctly. Please log out and log back in.",
          );
        }
        throw error;
      }

      router.push(`/agents/${data.id}`);
    } catch (err: any) {
      logger.error("Agent creation error:", err);
      setError(err.message || "Failed to create agent");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    setTemplateNotice(null);

    const name = templateName.trim() || formData.name.trim();
    if (!name) {
      setTemplateNotice("Add a template name or agent name first.");
      return;
    }

    setSavingTemplate(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error: saveError } = await supabase
        .from("agent_templates")
        .insert([
          {
            owner_id: user.id,
            name,
            description: formData.description,
            system_prompt: formData.systemPrompt,
            voice_provider: formData.voiceProvider,
            voice_id: formData.voiceId,
            model: formData.model,
            temperature: formData.temperature,
            is_public: publishTemplate,
            is_system: false,
          },
        ])
        .select()
        .single();

      if (saveError) throw saveError;

      const savedTemplate = {
        ...(data as AgentTemplate),
        knowledgeCount: 0,
      } as AgentTemplate;

      setMyTemplates((prev) => [savedTemplate, ...prev]);
      if (savedTemplate.is_public) {
        setMarketplaceTemplates((prev) => [savedTemplate, ...prev]);
      }

      setTemplateNotice("Template saved.");
      setTemplateName("");
      setPublishTemplate(false);
    } catch (err: any) {
      setTemplateNotice(err.message || "Failed to save template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleCreateFromTemplate = async (template: AgentTemplate) => {
    setTemplateNotice(null);
    setCreatingTemplateId(template.id);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: newAgent, error: createError } = await supabase
        .from("agents")
        .insert([
          {
            user_id: user.id,
            name: template.name,
            description: template.description,
            system_prompt: template.system_prompt,
            voice_provider: template.voice_provider,
            voice_id: template.voice_id,
            model: template.model,
            temperature: template.temperature,
          },
        ])
        .select()
        .single();

      if (createError) throw createError;

      const { data: templateKnowledge, error: knowledgeError } = await supabase
        .from("template_knowledge")
        .select("name, type, content, file_url, url, metadata")
        .eq("template_id", template.id);

      if (knowledgeError) throw knowledgeError;

      if (templateKnowledge && templateKnowledge.length > 0) {
        const knowledgeRows = templateKnowledge.map((row: any) => ({
          agent_id: newAgent.id,
          name: row.name,
          type: row.type,
          content: row.content,
          file_url: row.file_url,
          url: row.url,
          metadata: row.metadata || {},
        }));

        const { error: insertKnowledgeError } = await supabase
          .from("knowledge_base")
          .insert(knowledgeRows);

        if (insertKnowledgeError) throw insertKnowledgeError;
      }

      router.push(`/agents/${newAgent.id}`);
    } catch (err: any) {
      setTemplateNotice(err.message || "Failed to create agent from template");
    } finally {
      setCreatingTemplateId(null);
    }
  };

  const activeTemplates =
    activeTemplateTab === "prebuilt"
      ? prebuiltTemplates
      : activeTemplateTab === "my"
        ? myTemplates
        : marketplaceTemplates;

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

      <main className="container mx-auto px-4 py-8 max-w-3xl relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Create New Agent
          </h1>
          <p className="mt-2 text-gray-400">
            Configure your AI voice agent with custom settings
          </p>
        </div>

        <Card
          id="templates-library"
          className="mb-8 bg-gray-800/50 backdrop-blur-xl border-gray-700/50"
        >
          <CardHeader>
            <CardTitle className="text-white">
              Agent Templates Library
            </CardTitle>
            <CardDescription className="text-gray-400">
              Start fast with pre-built templates, your saved templates, or the
              community marketplace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setActiveTemplateTab("prebuilt")}
                className={`border-gray-700 ${
                  activeTemplateTab === "prebuilt"
                    ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/50"
                    : "text-gray-300 hover:bg-gray-800/50 hover:text-white"
                }`}
              >
                Pre-built
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setActiveTemplateTab("my")}
                className={`border-gray-700 ${
                  activeTemplateTab === "my"
                    ? "bg-purple-500/10 text-purple-300 border-purple-500/50"
                    : "text-gray-300 hover:bg-gray-800/50 hover:text-white"
                }`}
              >
                My Templates
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setActiveTemplateTab("marketplace")}
                className={`border-gray-700 ${
                  activeTemplateTab === "marketplace"
                    ? "bg-pink-500/10 text-pink-300 border-pink-500/50"
                    : "text-gray-300 hover:bg-gray-800/50 hover:text-white"
                }`}
              >
                Marketplace
              </Button>
            </div>

            {templatesLoading ? (
              <div className="flex items-center gap-3 text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
                Loading templates...
              </div>
            ) : templatesError ? (
              <div className="rounded-md bg-red-500/10 border border-red-500/50 p-4 text-sm text-red-400">
                {templatesError}
              </div>
            ) : activeTemplates.length === 0 ? (
              <div className="rounded-md border border-dashed border-gray-700 p-6 text-sm text-gray-400">
                No templates found in this section yet.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {activeTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="rounded-lg border border-gray-700/50 bg-gray-900/40 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-white">
                          {template.name}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                          {template.description || "No description provided."}
                        </p>
                      </div>
                      {template.is_public && !template.is_system && (
                        <span className="text-[10px] uppercase tracking-wide text-pink-300 border border-pink-500/40 rounded-full px-2 py-1">
                          Community
                        </span>
                      )}
                      {template.is_system && (
                        <span className="text-[10px] uppercase tracking-wide text-cyan-300 border border-cyan-500/40 rounded-full px-2 py-1">
                          Official
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
                      <span className="rounded-full border border-gray-700/70 px-2 py-1">
                        Voice: {getVoiceName(template.voice_id)}
                      </span>
                      <span className="rounded-full border border-gray-700/70 px-2 py-1">
                        Model: {getModelName(template.model)}
                      </span>
                      <span className="rounded-full border border-gray-700/70 px-2 py-1">
                        Temp: {template.temperature}
                      </span>
                      <span className="rounded-full border border-gray-700/70 px-2 py-1">
                        Knowledge: {template.knowledgeCount || 0}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        One-click create
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0"
                        onClick={() => handleCreateFromTemplate(template)}
                        disabled={!!creatingTemplateId}
                      >
                        {creatingTemplateId === template.id
                          ? "Creating..."
                          : "Create Agent"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {templateNotice && (
              <div className="rounded-md border border-cyan-500/30 bg-cyan-500/10 p-3 text-xs text-cyan-200">
                {templateNotice}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-white">Agent Configuration</CardTitle>
            <CardDescription className="text-gray-400">
              Set up your agent's personality, voice, and behavior
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-md bg-red-500/10 border border-red-500/50 p-4 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">
                  Basic Information
                </h3>

                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="text-sm font-medium text-gray-300"
                  >
                    Agent Name *
                  </label>
                  <Input
                    id="name"
                    placeholder="Customer Support Agent"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    disabled={loading}
                    className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="description"
                    className="text-sm font-medium text-gray-300"
                  >
                    Description
                  </label>
                  <Input
                    id="description"
                    placeholder="Handles customer inquiries and support requests"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    disabled={loading}
                    className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="systemPrompt"
                    className="text-sm font-medium text-gray-300"
                  >
                    System Prompt *
                  </label>
                  <textarea
                    id="systemPrompt"
                    rows={4}
                    className="flex w-full rounded-md border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-white ring-offset-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="You are a helpful AI assistant..."
                    value={formData.systemPrompt}
                    onChange={(e) =>
                      setFormData({ ...formData, systemPrompt: e.target.value })
                    }
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500">
                    Define how your agent should behave and respond
                  </p>
                </div>
              </div>

              {/* Voice Settings */}
              <div className="space-y-4 pt-6 border-t border-gray-700">
                <h3 className="text-lg font-semibold text-white">
                  Voice Settings
                </h3>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Select Voice *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {VOICE_OPTIONS.map((voice) => (
                      <button
                        key={voice.id}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            voiceId: voice.id,
                            voiceProvider: voice.provider,
                          })
                        }
                        disabled={loading}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          formData.voiceId === voice.id
                            ? "border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20"
                            : "border-gray-700 hover:border-gray-600 bg-gray-900/50"
                        }`}
                      >
                        <div className="font-semibold text-white">
                          {voice.name}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {voice.description}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {voice.provider}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Model Settings */}
              <div className="space-y-4 pt-6 border-t border-gray-700">
                <h3 className="text-lg font-semibold text-white">
                  AI Model Settings
                </h3>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Language Model *
                  </label>
                  <select
                    value={formData.model}
                    onChange={(e) =>
                      setFormData({ ...formData, model: e.target.value })
                    }
                    disabled={loading}
                    className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-white ring-offset-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cyan-500"
                  >
                    {LLM_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="temperature"
                    className="text-sm font-medium text-gray-300"
                  >
                    Temperature:{" "}
                    <span className="text-cyan-400">
                      {formData.temperature}
                    </span>
                  </label>
                  <input
                    id="temperature"
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
                    disabled={loading}
                    className="w-full accent-cyan-500"
                  />
                  <p className="text-xs text-gray-500">
                    Lower = more focused, Higher = more creative
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-gray-700">
                <h3 className="text-lg font-semibold text-white">
                  Template Options
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor="templateName"
                      className="text-sm font-medium text-gray-300"
                    >
                      Template Name
                    </label>
                    <Input
                      id="templateName"
                      placeholder="Support Agent Template"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      disabled={savingTemplate}
                      className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                    />
                    <p className="text-xs text-gray-500">
                      Leave empty to use the agent name.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">
                      Publish to Marketplace
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-400">
                      <input
                        type="checkbox"
                        checked={publishTemplate}
                        onChange={(e) => setPublishTemplate(e.target.checked)}
                        disabled={savingTemplate}
                        className="h-4 w-4 rounded border-gray-700 bg-gray-900/50"
                      />
                      Share this template with the community.
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveTemplate}
                    disabled={savingTemplate}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800/50 hover:text-white"
                  >
                    {savingTemplate ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving Template...
                      </>
                    ) : (
                      "Save as Template"
                    )}
                  </Button>
                  <span className="text-xs text-gray-500">
                    Saves the current configuration without creating an agent.
                  </span>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 transition-all duration-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Agent...
                    </>
                  ) : (
                    "Create Agent"
                  )}
                </Button>
                <Link href="/dashboard" className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-gray-700 text-gray-300 hover:bg-gray-800/50 hover:text-white hover:border-cyan-500/50"
                    disabled={loading}
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
