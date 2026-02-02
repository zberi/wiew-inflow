import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  video?: { id: string; mime_type: string; sha256: string; caption?: string };
}

interface WhatsAppContact {
  profile: { name: string };
  wa_id: string;
}

interface WhatsAppStatus {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
}

interface WhatsAppChange {
  value: {
    messaging_product: string;
    metadata: { display_phone_number: string; phone_number_id: string };
    contacts?: WhatsAppContact[];
    messages?: WhatsAppMessage[];
    statuses?: WhatsAppStatus[];
  };
  field: string;
}

interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppEntry[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  
  // Hardcoded verify token for webhook verification
  const verifyToken = "my-whatsapp-webhook-verify-2026";
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Handle webhook verification (GET request from Meta)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("Webhook verification request:", { mode, token: token?.substring(0, 4) + "..." });

    if (mode === "subscribe" && token === verifyToken) {
      console.log("Webhook verified successfully");
      return new Response(challenge, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    } else {
      console.error("Webhook verification failed");
      return new Response("Forbidden", {
        status: 403,
        headers: corsHeaders,
      });
    }
  }

  // Handle webhook events (POST request)
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const payload: WhatsAppWebhookPayload = await req.json();
    console.log("Received webhook payload:", JSON.stringify(payload));

    // Determine event type for logging
    let eventType = "unknown";
    if (payload.object === "whatsapp_business_account") {
      const firstEntry = payload.entry?.[0];
      const firstChange = firstEntry?.changes?.[0];
      if (firstChange?.field === "messages") {
        const messages = firstChange.value?.messages;
        const statuses = firstChange.value?.statuses;
        if (messages && messages.length > 0) {
          eventType = "message";
        } else if (statuses && statuses.length > 0) {
          eventType = "status";
        }
      }
    }

    // Log the webhook with explicit event type
    const { error: logError } = await supabase
      .from("webhook_logs")
      .insert({ 
        payload: {
          ...payload,
          _event_type: eventType,
          _received_at: new Date().toISOString(),
        }, 
        processed: false 
      });

    if (logError) {
      console.error("Error logging webhook:", logError);
    }

    console.log(`Event type detected: ${eventType}`);

    // Validate it's a WhatsApp message webhook
    if (payload.object !== "whatsapp_business_account") {
      console.log("Not a WhatsApp business account event, skipping");
      return new Response(JSON.stringify({ status: "ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process each entry
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field !== "messages") continue;

        const value = change.value;
        const messages = value.messages || [];
        const contacts = value.contacts || [];
        const phoneNumberId = value.metadata?.phone_number_id;

        for (const message of messages) {
          // Find sender info
          const contact = contacts.find(c => c.wa_id === message.from);
          const senderName = contact?.profile?.name || null;
          const senderPhone = message.from;
          const groupId = `cloud_${phoneNumberId}`;
          const messageId = message.id;

          console.log(`Processing ${message.type} message from ${senderPhone}, id: ${messageId}`);

          // Handle TEXT messages - store in webhook_logs with enhanced metadata
          if (message.type === "text") {
            const textBody = message.text?.body || "";
            console.log(`Text message received: "${textBody.substring(0, 50)}..."`);
            
            // Update the webhook log with parsed text message details
            await supabase
              .from("webhook_logs")
              .update({
                processed: true,
                payload: {
                  ...payload,
                  _event_type: "message",
                  _message_type: "text",
                  _sender_phone: senderPhone,
                  _sender_name: senderName,
                  _text_preview: textBody.substring(0, 200),
                  _message_id: messageId,
                  _group_id: groupId,
                  _received_at: new Date().toISOString(),
                }
              })
              .eq("payload->>object", "whatsapp_business_account")
              .eq("processed", false);
            
            continue;
          }

          // Handle IMAGE and VIDEO messages
          if (message.type !== "image" && message.type !== "video") {
            console.log(`Skipping unsupported message type: ${message.type}`);
            continue;
          }

          const mediaInfo = message.type === "image" ? message.image : message.video;
          if (!mediaInfo) {
            console.log(`No media info found for ${message.type} message`);
            continue;
          }

          const mediaId = mediaInfo.id;
          const mimeType = mediaInfo.mime_type;
          const caption = mediaInfo.caption || null;

          console.log(`Processing ${message.type} from ${senderPhone}, mediaId: ${mediaId}`);

          // Check for duplicates by message_id
          const { data: existing } = await supabase
            .from("media_items")
            .select("id")
            .eq("message_id", messageId)
            .maybeSingle();

          if (existing) {
            console.log(`Duplicate media found for message ${messageId}`);
            continue;
          }

          try {
            // Get media URL from Graph API
            const mediaUrlResponse = await fetch(
              `https://graph.facebook.com/v18.0/${mediaId}?fields=url`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );

            if (!mediaUrlResponse.ok) {
              throw new Error(`Failed to get media URL: ${mediaUrlResponse.status}`);
            }

            const mediaUrlData = await mediaUrlResponse.json();
            const downloadUrl = mediaUrlData.url;

            if (!downloadUrl) {
              throw new Error('Graph API did not return a download URL');
            }

            console.log(`Got media download URL for ${mediaId}`);

            // Download media from Graph API
            const mediaResponse = await fetch(downloadUrl, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });

            if (!mediaResponse.ok) {
              throw new Error(`Failed to download media: ${mediaResponse.status}`);
            }

            const mediaBlob = await mediaResponse.blob();
            const mediaBuffer = await mediaBlob.arrayBuffer();
            const uint8Array = new Uint8Array(mediaBuffer);

            // Generate file path
            const extension = mimeType?.split("/")[1]?.split(";")[0] || "bin";
            const timestamp = Date.now();
            const filePath = `${groupId}/${timestamp}_${messageId}.${extension}`;

            // Upload to storage
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from("whatsapp-media-public")
              .upload(filePath, uint8Array, {
                contentType: mimeType,
                upsert: false,
              });

            if (uploadError) {
              throw new Error(`Failed to upload to storage: ${uploadError.message}`);
            }

            if (!uploadData) {
              throw new Error('Upload returned no data');
            }

            console.log(`Uploaded media to ${filePath}`);

            // Insert metadata with source marked as cloud_api
            const { error: insertError } = await supabase
              .from("media_items")
              .insert({
                message_id: messageId,
                group_id: groupId,
                sender_phone: senderPhone,
                sender_name: senderName,
                media_type: message.type === "video" ? "video" : "photo",
                file_path: filePath,
                mime_type: mimeType,
                file_size: uint8Array.byteLength,
                caption: caption,
                received_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
                metadata: {
                  source: "cloud_api",
                  media_id: mediaId,
                  phone_number_id: phoneNumberId,
                  sha256: mediaInfo.sha256,
                },
              });

            if (insertError) {
              console.error("Error inserting media item:", insertError);
              throw insertError;
            }

            console.log(`Inserted media item for ${messageId}`);

            // Update webhook log with media details
            await supabase
              .from("webhook_logs")
              .update({
                processed: true,
                payload: {
                  ...payload,
                  _event_type: "message",
                  _message_type: message.type,
                  _sender_phone: senderPhone,
                  _sender_name: senderName,
                  _media_filename: filePath.split("/").pop(),
                  _message_id: messageId,
                  _group_id: groupId,
                  _received_at: new Date().toISOString(),
                }
              })
              .eq("payload->>object", "whatsapp_business_account")
              .eq("processed", false);

          } catch (mediaError: unknown) {
            const errorMessage = mediaError instanceof Error ? mediaError.message : "Unknown error";
            console.error(`Error processing media ${mediaId}:`, mediaError);

            await supabase
              .from("webhook_logs")
              .update({
                error_message: `Media ${mediaId}: ${errorMessage}`,
                payload: {
                  ...payload,
                  _event_type: "message",
                  _message_type: message.type,
                  _sender_phone: senderPhone,
                  _sender_name: senderName,
                  _message_id: messageId,
                  _error: errorMessage,
                  _received_at: new Date().toISOString(),
                }
              })
              .eq("payload->>object", "whatsapp_business_account")
              .eq("processed", false);
          }
        }
      }
    }

    // Mark any remaining unprocessed logs as processed
    await supabase
      .from("webhook_logs")
      .update({ processed: true })
      .eq("payload->>object", "whatsapp_business_account")
      .eq("processed", false);

    return new Response(
      JSON.stringify({ status: "ok" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", error);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
