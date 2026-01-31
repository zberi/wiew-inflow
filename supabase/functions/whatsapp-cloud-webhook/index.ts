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

interface WhatsAppChange {
  value: {
    messaging_product: string;
    metadata: { display_phone_number: string; phone_number_id: string };
    contacts?: WhatsAppContact[];
    messages?: WhatsAppMessage[];
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

    // Log the webhook
    const { error: logError } = await supabase
      .from("webhook_logs")
      .insert({ payload, processed: false });

    if (logError) {
      console.error("Error logging webhook:", logError);
    }

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
          // Only process image and video messages
          if (message.type !== "image" && message.type !== "video") {
            console.log(`Skipping message type: ${message.type}`);
            continue;
          }

          const mediaInfo = message.type === "image" ? message.image : message.video;
          if (!mediaInfo) continue;

          const messageId = message.id;
          const mediaId = mediaInfo.id;
          const mimeType = mediaInfo.mime_type;
          const caption = mediaInfo.caption || null;

          // Find sender info
          const contact = contacts.find(c => c.wa_id === message.from);
          const senderName = contact?.profile?.name || null;
          const senderPhone = message.from;

          // Use phone_number_id as group identifier for Cloud API
          const groupId = `cloud_${phoneNumberId}`;

          console.log(`Processing ${message.type} from ${senderPhone}, mediaId: ${mediaId}?fields=url`);

          // Check for duplicates by message_id
          const { data: existing } = await supabase
            .from("media_items")
            .select("id")
            .eq("message_id", messageId)
            .single();

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

            console.log(`Got media download URL for ${mediaId}?fields=url`);

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

            // Generate file path
            const extension = mimeType?.split("/")[1]?.split(";")[0] || "bin";
            const timestamp = Date.now();
            const filePath = `${groupId}/${timestamp}_${messageId}.${extension}`;

            // Upload to storage
            const { error: uploadError } = await supabase.storage
              .from("whatsapp-media-public")
              .upload(filePath, mediaBuffer, {
                contentType: mimeType,
                upsert: false,
              });

            if (uploadError) {
              throw new Error(`Failed to upload to storage: ${uploadError.message}`);
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
                file_size: mediaBuffer.byteLength,
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
          } catch (mediaError: unknown) {
            const errorMessage = mediaError instanceof Error ? mediaError.message : "Unknown error";
            console.error(`Error processing media ${mediaId}?fields=url:`, mediaError);

            await supabase
              .from("webhook_logs")
              .update({
                error_message: `Media ${mediaId}: ${errorMessage}`,
              })
              .eq("payload->>object", "whatsapp_business_account");
          }
        }
      }
    }

    // Mark webhook as processed
    await supabase
      .from("webhook_logs")
      .update({ processed: true })
      .eq("payload->>object", "whatsapp_business_account");

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
