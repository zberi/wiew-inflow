import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Parse form data from Twilio
    const formData = await req.formData();
    const payload: Record<string, string> = {};
    
    for (const [key, value] of formData.entries()) {
      payload[key] = value.toString();
    }

    console.log("Received webhook payload:", JSON.stringify(payload));

    // Log the webhook
    const { error: logError } = await supabase
      .from("webhook_logs")
      .insert({ payload, processed: false });

    if (logError) {
      console.error("Error logging webhook:", logError);
    }

    // Extract message details
    const messageSid = payload.MessageSid || payload.SmsMessageSid;
    const from = payload.From || "";
    const to = payload.To || "";
    const body = payload.Body || "";
    const numMedia = parseInt(payload.NumMedia || "0", 10);
    const profileName = payload.ProfileName || null;

    // Extract group info if available (format: whatsapp:+1234567890)
    const groupId = payload.WaId || from.replace("whatsapp:", "");

    console.log(`Message from ${from}, NumMedia: ${numMedia}`);

    if (numMedia === 0) {
      // No media, just acknowledge
      console.log("No media in message, skipping");
      
      await supabase
        .from("webhook_logs")
        .update({ processed: true })
        .eq("payload->MessageSid", messageSid);

      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "text/xml" 
          } 
        }
      );
    }

    // Process each media item
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = payload[`MediaUrl${i}`];
      const mediaContentType = payload[`MediaContentType${i}`];

      if (!mediaUrl) {
        console.log(`No MediaUrl${i} found`);
        continue;
      }

      console.log(`Processing media ${i}: ${mediaContentType}`);

      // Determine media type
      const mediaType = mediaContentType?.startsWith("video/") ? "video" : "photo";

      // Check for duplicates
      const { data: existing } = await supabase
        .from("media_items")
        .select("id")
        .eq("message_id", `${messageSid}_${i}`)
        .single();

      if (existing) {
        console.log(`Duplicate media found for message ${messageSid}_${i}`);
        continue;
      }

      try {
        // Download media from Twilio
        // Note: In production, you'd use Twilio credentials for auth
        const mediaResponse = await fetch(mediaUrl);
        
        if (!mediaResponse.ok) {
          throw new Error(`Failed to download media: ${mediaResponse.status}`);
        }

        const mediaBlob = await mediaResponse.blob();
        const mediaBuffer = await mediaBlob.arrayBuffer();
        
        // Generate file path
        const extension = mediaContentType?.split("/")[1] || "bin";
        const timestamp = Date.now();
        const filePath = `${groupId}/${timestamp}_${messageSid}_${i}.${extension}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("whatsapp-media-public")
          .upload(filePath, mediaBuffer, {
            contentType: mediaContentType,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Failed to upload to storage: ${uploadError.message}`);
        }

        console.log(`Uploaded media to ${filePath}`);

        // Insert metadata
        const { error: insertError } = await supabase
          .from("media_items")
          .insert({
            message_id: `${messageSid}_${i}`,
            group_id: groupId,
            sender_phone: from.replace("whatsapp:", ""),
            sender_name: profileName,
            media_type: mediaType,
            file_path: filePath,
            mime_type: mediaContentType,
            file_size: mediaBuffer.byteLength,
            caption: i === 0 ? body : null,
            received_at: new Date().toISOString(),
            metadata: {
              to,
              original_url: mediaUrl,
            },
          });

        if (insertError) {
          console.error("Error inserting media item:", insertError);
          throw insertError;
        }

        console.log(`Inserted media item for ${messageSid}_${i}`);
      } catch (mediaError: unknown) {
        const errorMessage = mediaError instanceof Error ? mediaError.message : "Unknown error";
        console.error(`Error processing media ${i}:`, mediaError);
        
        await supabase
          .from("webhook_logs")
          .update({ 
            error_message: `Media ${i}: ${errorMessage}`,
          })
          .eq("payload->MessageSid", messageSid);
      }
    }

    // Mark webhook as processed
    await supabase
      .from("webhook_logs")
      .update({ processed: true })
      .eq("payload->MessageSid", messageSid);

    // Return TwiML response (empty, just acknowledge)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "text/xml" 
        } 
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", error);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});
