import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type WebhookLog = Tables<"webhook_logs">;

export function useWebhookLogs(filters?: {
  processed?: boolean;
  search?: string;
}) {
  return useQuery({
    queryKey: ["webhook_logs", filters],
    queryFn: async () => {
      let query = supabase
        .from("webhook_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filters?.processed !== undefined) {
        query = query.eq("processed", filters.processed);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WebhookLog[];
    },
  });
}

export function useWebhookLogStats() {
  return useQuery({
    queryKey: ["webhook_log_stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_logs")
        .select("processed, error_message");
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const processed = data?.filter(l => l.processed).length || 0;
      const errors = data?.filter(l => l.error_message).length || 0;
      const pending = data?.filter(l => !l.processed && !l.error_message).length || 0;
      
      return { total, processed, errors, pending };
    },
  });
}