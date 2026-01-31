import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type MediaItem = Tables<"media_items">;

export function useMediaItems(filters?: {
  mediaType?: "photo" | "video";
  groupId?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["media_items", filters],
    queryFn: async () => {
      let query = supabase
        .from("media_items")
        .select("*")
        .order("received_at", { ascending: false });

      if (filters?.mediaType) {
        query = query.eq("media_type", filters.mediaType);
      }
      if (filters?.groupId) {
        query = query.eq("group_id", filters.groupId);
      }
      if (filters?.search) {
        query = query.or(
          `caption.ilike.%${filters.search}%,sender_name.ilike.%${filters.search}%,sender_phone.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MediaItem[];
    },
  });
}

export function useMediaItem(id: string) {
  return useQuery({
    queryKey: ["media_items", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_items")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as MediaItem;
    },
    enabled: !!id,
  });
}

export function useDeleteMediaItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("media_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media_items"] });
    },
  });
}

export function useMediaStats() {
  return useQuery({
    queryKey: ["media_stats"],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("media_items")
        .select("*", { count: "exact", head: false });
      
      if (error) throw error;
      
      const photos = data?.filter(m => m.media_type === "photo").length || 0;
      const videos = data?.filter(m => m.media_type === "video").length || 0;
      
      return {
        total: count || 0,
        photos,
        videos,
      };
    },
  });
}

export function useMediaUrl(filePath: string | null) {
  return useQuery({
    queryKey: ["media_url", filePath],
    queryFn: async () => {
      if (!filePath) return null;
      const { data } = supabase.storage
        .from("whatsapp-media-public")
        .getPublicUrl(filePath);
      return data.publicUrl;
    },
    enabled: !!filePath,
  });
}
