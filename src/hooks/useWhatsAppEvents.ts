import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type WebhookLog = Tables<"webhook_logs">;

export interface ParsedWhatsAppEvent {
  id: string;
  timestamp: string;
  eventType: "message" | "status" | "verification" | "unknown";
  messageType?: "text" | "image" | "video" | "audio" | "document" | "unknown";
  senderPhone?: string;
  senderName?: string;
  textPreview?: string;
  mediaFilename?: string;
  error?: string;
  processed: boolean;
  raw: WebhookLog;
}

function parseWebhookLog(log: WebhookLog): ParsedWhatsAppEvent {
  const payload = log.payload as Record<string, unknown>;
  
  // Check for enriched metadata (added by our updated webhook)
  const eventType = (payload._event_type as string) || "unknown";
  const messageType = payload._message_type as string | undefined;
  const senderPhone = payload._sender_phone as string | undefined;
  const senderName = payload._sender_name as string | undefined;
  const textPreview = payload._text_preview as string | undefined;
  const mediaFilename = payload._media_filename as string | undefined;
  const error = payload._error as string | undefined;

  // Fallback parsing for logs without enriched metadata
  let fallbackEventType = eventType;
  let fallbackMessageType = messageType;
  let fallbackSenderPhone = senderPhone;
  let fallbackSenderName = senderName;
  let fallbackTextPreview = textPreview;

  if (eventType === "unknown" && payload.object === "whatsapp_business_account") {
    const entry = (payload.entry as Array<Record<string, unknown>>)?.[0];
    const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
    const value = changes?.value as Record<string, unknown> | undefined;
    
    if (value) {
      const messages = value.messages as Array<Record<string, unknown>> | undefined;
      const statuses = value.statuses as Array<Record<string, unknown>> | undefined;
      const contacts = value.contacts as Array<Record<string, unknown>> | undefined;
      
      if (messages && messages.length > 0) {
        fallbackEventType = "message";
        const msg = messages[0];
        fallbackMessageType = msg.type as string || "unknown";
        fallbackSenderPhone = msg.from as string;
        
        if (contacts && contacts.length > 0) {
          const profile = (contacts[0].profile as Record<string, unknown>);
          fallbackSenderName = profile?.name as string;
        }
        
        if (msg.type === "text") {
          const textObj = msg.text as Record<string, unknown>;
          fallbackTextPreview = (textObj?.body as string)?.substring(0, 200);
        }
      } else if (statuses && statuses.length > 0) {
        fallbackEventType = "status";
      }
    }
  }

  return {
    id: log.id,
    timestamp: log.created_at || new Date().toISOString(),
    eventType: (fallbackEventType as ParsedWhatsAppEvent["eventType"]) || "unknown",
    messageType: fallbackMessageType as ParsedWhatsAppEvent["messageType"],
    senderPhone: fallbackSenderPhone,
    senderName: fallbackSenderName,
    textPreview: fallbackTextPreview,
    mediaFilename: mediaFilename,
    error: error || log.error_message || undefined,
    processed: log.processed || false,
    raw: log,
  };
}

export function useWhatsAppEvents(options?: {
  eventType?: "message" | "status" | "verification" | "all";
  limit?: number;
}) {
  const limit = options?.limit || 100;

  return useQuery({
    queryKey: ["whatsapp_events", options],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      const parsed = (data || [])
        .map(parseWebhookLog)
        .filter(event => {
          // Filter to only WhatsApp events
          const payload = event.raw.payload as Record<string, unknown>;
          if (payload.object !== "whatsapp_business_account") return false;
          
          // Filter by event type if specified
          if (options?.eventType && options.eventType !== "all") {
            return event.eventType === options.eventType;
          }
          return true;
        });

      return parsed;
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });
}

export function useWhatsAppEventStats() {
  return useQuery({
    queryKey: ["whatsapp_event_stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_logs")
        .select("payload, processed, error_message");

      if (error) throw error;

      const whatsappLogs = (data || []).filter(log => {
        const payload = log.payload as Record<string, unknown>;
        return payload.object === "whatsapp_business_account";
      });

      const parsed = whatsappLogs.map(log => parseWebhookLog(log as WebhookLog));

      return {
        total: parsed.length,
        messages: parsed.filter(e => e.eventType === "message").length,
        statuses: parsed.filter(e => e.eventType === "status").length,
        texts: parsed.filter(e => e.messageType === "text").length,
        images: parsed.filter(e => e.messageType === "image").length,
        videos: parsed.filter(e => e.messageType === "video").length,
        errors: parsed.filter(e => !!e.error).length,
        processed: parsed.filter(e => e.processed).length,
      };
    },
  });
}
