import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Enums } from "@/integrations/supabase/types";

export type UploadQueueItem = Tables<"upload_queue"> & {
  media_items?: Tables<"media_items">;
  destinations?: Tables<"destinations">;
};

export type UploadStatus = Enums<"upload_status">;

export function useUploadQueue(filters?: {
  status?: UploadStatus;
  destinationId?: string;
}) {
  return useQuery({
    queryKey: ["upload_queue", filters],
    queryFn: async () => {
      let query = supabase
        .from("upload_queue")
        .select(`
          *,
          media_items (*),
          destinations (*)
        `)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.destinationId) {
        query = query.eq("destination_id", filters.destinationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as UploadQueueItem[];
    },
  });
}

export function useQueueStats() {
  return useQuery({
    queryKey: ["queue_stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("upload_queue")
        .select("status");
      
      if (error) throw error;
      
      const pending = data?.filter(q => q.status === "pending").length || 0;
      const approved = data?.filter(q => q.status === "approved").length || 0;
      const uploading = data?.filter(q => q.status === "uploading").length || 0;
      const completed = data?.filter(q => q.status === "completed").length || 0;
      const failed = data?.filter(q => q.status === "failed").length || 0;
      const rejected = data?.filter(q => q.status === "rejected").length || 0;
      
      return { pending, approved, uploading, completed, failed, rejected, total: data?.length || 0 };
    },
  });
}

export function useApproveUpload() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("upload_queue")
        .update({ 
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upload_queue"] });
      queryClient.invalidateQueries({ queryKey: ["queue_stats"] });
    },
  });
}

export function useRejectUpload() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("upload_queue")
        .update({ status: "rejected" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upload_queue"] });
      queryClient.invalidateQueries({ queryKey: ["queue_stats"] });
    },
  });
}

export function useRetryUpload() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: current, error: fetchError } = await supabase
        .from("upload_queue")
        .select("retry_count")
        .eq("id", id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const { error } = await supabase
        .from("upload_queue")
        .update({ 
          status: "approved",
          error_message: null,
          retry_count: (current?.retry_count || 0) + 1,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upload_queue"] });
      queryClient.invalidateQueries({ queryKey: ["queue_stats"] });
    },
  });
}

export function useCreateQueueItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ mediaId, destinationId }: { mediaId: string; destinationId: string }) => {
      const { error } = await supabase
        .from("upload_queue")
        .insert({ media_id: mediaId, destination_id: destinationId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upload_queue"] });
      queryClient.invalidateQueries({ queryKey: ["queue_stats"] });
    },
  });
}