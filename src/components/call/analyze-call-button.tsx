"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Loader2, TrendingUp } from "lucide-react";

export function AnalyzeCallButton({ callId }: { callId: string }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/call/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze call");
      }

      setSuccess(true);
      // Reload page to show new analytics
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  if (success) {
    return <div className="text-sm text-green-600">✓ Analysis complete!</div>;
  }

  return (
    <div>
      <Button onClick={handleAnalyze} disabled={analyzing} variant="outline">
        {analyzing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <TrendingUp className="h-4 w-4 mr-2" />
            Analyze Call
          </>
        )}
      </Button>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
