import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useBulkApproveUploads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("upload_queue")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("status", "pending");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upload-queue"] });
      queryClient.invalidateQueries({ queryKey: ["queue-stats"] });
    },
  });
}

export function useBulkRejectUploads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("upload_queue")
        .update({
          status: "rejected",
        })
        .eq("status", "pending");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upload-queue"] });
      queryClient.invalidateQueries({ queryKey: ["queue-stats"] });
    },
  });
}
