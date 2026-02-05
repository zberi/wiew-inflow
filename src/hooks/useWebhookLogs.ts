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

export interface InboundEvent {
  id: string;
  created_at: string;
  event_type: string;
  message_type: string | null;
  sender_phone: string | null;
  sender_name: string | null;
  text_preview: string | null;
  media_filename: string | null;
  error: string | null;
  processed: boolean;
}

export function useInboundEvents(limit = 50) {
  return useQuery({
    queryKey: ["inbound_events", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_logs")
        .select("id, created_at, payload, processed, error_message")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Parse webhook logs into inbound events
      const events: InboundEvent[] = (data || []).map((log) => {
        const payload = log.payload as Record<string, unknown> | null;
        return {
          id: log.id,
          created_at: log.created_at || "",
          event_type: (payload?._event_type as string) || "unknown",
          message_type: (payload?._message_type as string) || null,
          sender_phone: (payload?._sender_phone as string) || null,
          sender_name: (payload?._sender_name as string) || null,
          text_preview: (payload?._text_preview as string) || null,
          media_filename: (payload?._media_filename as string) || null,
          error: (payload?._error as string) || log.error_message || null,
          processed: log.processed || false,
        };
      });

      return events;
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });
}