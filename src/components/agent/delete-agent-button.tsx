"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

interface DeleteAgentButtonProps {
  agentId: string;
  agentName: string;
}

export function DeleteAgentButton({
  agentId,
  agentName,
}: DeleteAgentButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("agents")
        .delete()
        .eq("id", agentId);

      if (error) throw error;

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      alert("Failed to delete agent: " + err.message);
      setLoading(false);
    }
  };

  return (
    <>
      {showConfirm && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-[999] flex min-h-screen items-center justify-center bg-black/70 p-4"
              onClick={() => setShowConfirm(false)}
            >
              <div
                className="w-full max-w-md rounded-lg border border-gray-700/50 bg-gray-900 p-6 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
              >
                <h3 className="text-lg font-semibold text-white mb-2">
                  Delete Agent
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Are you sure you want to delete <strong>{agentName}</strong>?
                  This will also delete all associated knowledge base and call
                  history. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowConfirm(false)}
                    disabled={loading}
                    className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800/70 hover:text-white"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {!showConfirm && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setShowConfirm(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      )}
    </>
  );
}
