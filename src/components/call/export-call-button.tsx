"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ExportCallButtonProps {
  callId: string;
  agentName: string;
  transcript: any[];
  analytics: any;
  callData: any;
}

export function ExportCallButton({
  callId,
  agentName,
  transcript,
  analytics,
  callData,
}: ExportCallButtonProps) {
  const handleExport = () => {
    // Create export data
    const exportData = {
      call: {
        id: callId,
        status: callData.status,
        duration: callData.duration,
        createdAt: callData.created_at,
        agent: {
          name: agentName,
        },
      },
      transcript: transcript.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      })),
      analytics: analytics
        ? {
            sentiment: analytics.sentiment,
            topics: analytics.topics,
            summary: analytics.summary,
            keyPoints: analytics.keyPoints,
            qualityScore: analytics.qualityScore,
          }
        : null,
      exportedAt: new Date().toISOString(),
    };

    // Create JSON string
    const jsonString = JSON.stringify(exportData, null, 2);

    // Create blob
    const blob = new Blob([jsonString], { type: "application/json" });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `call-${callId}-${new Date().toISOString().split("T")[0]}.json`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      onClick={handleExport}
      variant="outline"
      size="sm"
      className="border-gray-700 text-gray-300 hover:bg-gray-800/50"
    >
      <Download className="h-4 w-4 mr-2" />
      Export
    </Button>
  );
}
