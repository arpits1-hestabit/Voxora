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
import {
  ArrowLeft,
  Upload,
  FileText,
  Link as LinkIcon,
  Loader2,
  Trash2,
} from "lucide-react";

export default function KnowledgeBasePage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [agent, setAgent] = useState<any>(null);
  const [knowledgeBase, setKnowledgeBase] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [uploadType, setUploadType] = useState<"file" | "url">("file");
  const [url, setUrl] = useState("");
  const [fileContent, setFileContent] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
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
          router.push("/dashboard");
          return;
        }

        setAgent(agentData);

        // Fetch knowledge base
        const { data: kbData } = await supabase
          .from("knowledge_base")
          .select("*")
          .eq("agent_id", params.id)
          .order("created_at", { ascending: false });

        setKnowledgeBase(kbData || []);
        setLoading(false);
      } catch (err: any) {
        logger.error("Error fetching data:", err);
        setError(err.message);
        setLoading(false);
      }
    }

    fetchData();
  }, [params.id, router, supabase]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const fileName = file.name;
      const fileType = fileName.split(".").pop()?.toLowerCase() || "txt";

      // Validate file type
      if (!["txt", "pdf", "docx"].includes(fileType)) {
        throw new Error(
          "Unsupported file type. Please upload TXT, PDF, or DOCX files.",
        );
      }

      // Read file content based on type
      let content: string;
      if (fileType === "txt") {
        content = await file.text();
      } else if (fileType === "pdf") {
        // Read PDF as ArrayBuffer and convert to base64
        const arrayBuffer = await file.arrayBuffer();
        content = Buffer.from(arrayBuffer).toString("base64");
      } else {
        // DOCX - placeholder for now
        content = `[${fileType.toUpperCase()} file content - requires parser]`;
      }

      const response = await fetch("/api/knowledge/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentId: params.id,
          name: fileName,
          type: fileType,
          content,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to upload file");
      }

      const data = payload.knowledge;

      setKnowledgeBase([data, ...knowledgeBase]);
      setFileContent("");

      // Reset file input
      e.target.value = "";
    } catch (err: any) {
      setError(err.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setError(null);

    try {
      // In production, you'd scrape the URL content
      // For MVP, we'll just store the URL
      const response = await fetch("/api/knowledge/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentId: params.id,
          name: `Website: ${url}`,
          type: "url",
          content: `Content from ${url} - requires web scraping implementation`,
          url,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to add URL");
      }

      const data = payload.knowledge;

      setKnowledgeBase([data, ...knowledgeBase]);
      setUrl("");
    } catch (err: any) {
      setError(err.message || "Failed to add URL");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this knowledge source?")) return;

    try {
      const { error } = await supabase
        .from("knowledge_base")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setKnowledgeBase(knowledgeBase.filter((kb) => kb.id !== id));
    } catch (err: any) {
      alert("Failed to delete: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
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

      <main className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Knowledge Base
          </h1>
          <p className="mt-2 text-gray-400">
            Upload documents and URLs to train {agent?.name}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FileText className="h-5 w-5 text-cyan-400" />
                Upload Files
              </CardTitle>
              <CardDescription className="text-gray-400">
                Upload TXT, PDF, or DOCX files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:bg-gray-700/30 hover:border-cyan-500/50 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-300">
                      Click to upload file
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      TXT, PDF, or DOCX
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".txt,.pdf,.docx"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
                {uploading && (
                  <div className="text-center text-sm text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2 text-cyan-500" />
                    Uploading...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <LinkIcon className="h-5 w-5 text-purple-400" />
                Add URL
              </CardTitle>
              <CardDescription className="text-gray-400">
                Add website or documentation URL
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUrlSubmit} className="space-y-4">
                <Input
                  type="url"
                  placeholder="https://example.com/docs"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  disabled={uploading}
                  className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                />
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 shadow-lg shadow-cyan-500/20"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add URL"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-500/10 border border-red-500/50 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-white">
              Uploaded Knowledge ({knowledgeBase.length})
            </CardTitle>
            <CardDescription className="text-gray-400">
              Manage your agent's knowledge sources
            </CardDescription>
          </CardHeader>
          <CardContent>
            {knowledgeBase.length > 0 ? (
              <div className="space-y-3">
                {knowledgeBase.map((kb) => (
                  <div
                    key={kb.id}
                    className="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-700/50 rounded-lg hover:border-cyan-500/50 transition-all"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-white">{kb.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400 uppercase">
                          {kb.type}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(kb.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {kb.url && (
                        <a
                          href={kb.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline mt-1 block transition-colors"
                        >
                          {kb.url}
                        </a>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(kb.id)}
                      className="hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-gray-700/50 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-gray-600" />
                </div>
                <p className="text-sm">No knowledge sources uploaded yet</p>
                <p className="text-xs mt-2 text-gray-600">
                  Upload files or add URLs to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
