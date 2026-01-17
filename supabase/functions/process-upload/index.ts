import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DestinationConfig {
  url?: string;
  api_key?: string;
  bucket?: string;
  endpoint?: string;
  [key: string]: unknown;
}

interface UploadResult {
  success: boolean;
  message?: string;
  error?: string;
}

// Destination handlers
async function uploadToWebhook(
  mediaUrl: string, 
  mediaItem: Record<string, unknown>, 
  config: DestinationConfig
): Promise<UploadResult> {
  if (!config.url) {
    return { success: false, error: "Webhook URL not configured" };
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.api_key ? { Authorization: `Bearer ${config.api_key}` } : {}),
    },
    body: JSON.stringify({
      media_url: mediaUrl,
      media_type: mediaItem.media_type,
      caption: mediaItem.caption,
      sender: mediaItem.sender_name || mediaItem.sender_phone,
      received_at: mediaItem.received_at,
      metadata: mediaItem.metadata,
    }),
  });

  if (!response.ok) {
    return { success: false, error: `Webhook returned ${response.status}` };
  }

  return { success: true, message: "Webhook delivered successfully" };
}

async function uploadToApi(
  mediaUrl: string, 
  mediaItem: Record<string, unknown>, 
  config: DestinationConfig
): Promise<UploadResult> {
  if (!config.endpoint) {
    return { success: false, error: "API endpoint not configured" };
  }

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.api_key ? { "X-API-Key": config.api_key } : {}),
    },
    body: JSON.stringify({
      url: mediaUrl,
      type: mediaItem.media_type,
      caption: mediaItem.caption,
      metadata: {
        sender: mediaItem.sender_name || mediaItem.sender_phone,
        received_at: mediaItem.received_at,
      },
    }),
  });

  if (!response.ok) {
    return { success: false, error: `API returned ${response.status}` };
  }

  return { success: true, message: "Uploaded to API successfully" };
}

// Placeholder handlers for other destinations
async function uploadToYoutube(): Promise<UploadResult> {
  return { success: false, error: "YouTube upload not implemented - requires OAuth setup" };
}

async function uploadToInstagram(): Promise<UploadResult> {
  return { success: false, error: "Instagram upload not implemented - requires OAuth setup" };
}

async function uploadToFacebook(): Promise<UploadResult> {
  return { success: false, error: "Facebook upload not implemented - requires OAuth setup" };
}

async function uploadToS3(
  mediaUrl: string, 
  mediaItem: Record<string, unknown>, 
  config: DestinationConfig
): Promise<UploadResult> {
  return { success: false, error: "S3 upload not implemented - requires AWS credentials" };
}

async function uploadToFtp(): Promise<UploadResult> {
  return { success: false, error: "FTP upload not implemented" };
}

async function uploadToCms(
  mediaUrl: string, 
  mediaItem: Record<string, unknown>, 
  config: DestinationConfig
): Promise<UploadResult> {
  // CMS typically uses API/webhook pattern
  return await uploadToApi(mediaUrl, mediaItem, config);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get approved items ready for upload
    const { data: queueItems, error: fetchError } = await supabase
      .from("upload_queue")
      .select(`
        *,
        media_items (*),
        destinations (*)
      `)
      .eq("status", "approved")
      .order("approved_at", { ascending: true })
      .limit(10);

    if (fetchError) {
      throw fetchError;
    }

    if (!queueItems || queueItems.length === 0) {
      console.log("No approved items to process");
      return new Response(
        JSON.stringify({ message: "No items to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${queueItems.length} approved items`);

    let processed = 0;
    let failed = 0;

    for (const item of queueItems) {
      const { id, media_items: media, destinations: dest } = item;

      if (!media || !dest) {
        console.log(`Skipping item ${id}: missing media or destination`);
        continue;
      }

      // Mark as uploading
      await supabase
        .from("upload_queue")
        .update({ 
          status: "uploading", 
          upload_started_at: new Date().toISOString() 
        })
        .eq("id", id);

      try {
        // Get signed URL for the media
        const { data: signedUrlData } = await supabase.storage
          .from("whatsapp-media")
          .createSignedUrl(media.file_path, 3600); // 1 hour

        if (!signedUrlData?.signedUrl) {
          throw new Error("Failed to generate signed URL");
        }

        const mediaUrl = signedUrlData.signedUrl;
        const config = dest.config as DestinationConfig;

        let result: UploadResult;

        // Route to appropriate handler
        switch (dest.destination_type) {
          case "webhook":
            result = await uploadToWebhook(mediaUrl, media, config);
            break;
          case "api":
            result = await uploadToApi(mediaUrl, media, config);
            break;
          case "youtube":
            result = await uploadToYoutube();
            break;
          case "instagram":
            result = await uploadToInstagram();
            break;
          case "facebook":
            result = await uploadToFacebook();
            break;
          case "s3":
            result = await uploadToS3(mediaUrl, media, config);
            break;
          case "ftp":
            result = await uploadToFtp();
            break;
          case "cms":
            result = await uploadToCms(mediaUrl, media, config);
            break;
          default:
            result = { success: false, error: `Unknown destination type: ${dest.destination_type}` };
        }

        if (result.success) {
          await supabase
            .from("upload_queue")
            .update({
              status: "completed",
              upload_completed_at: new Date().toISOString(),
              error_message: null,
            })
            .eq("id", id);
          
          processed++;
          console.log(`Successfully processed item ${id}`);
        } else {
          throw new Error(result.error || "Upload failed");
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`Error processing item ${id}:`, error);

        const retryCount = item.retry_count || 0;
        const maxRetries = 3;

        await supabase
          .from("upload_queue")
          .update({
            status: retryCount >= maxRetries ? "failed" : "approved",
            error_message: errorMessage,
            retry_count: retryCount + 1,
          })
          .eq("id", id);

        failed++;
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Processing complete", 
        processed, 
        failed,
        total: queueItems.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Process upload error:", error);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});