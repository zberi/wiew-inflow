import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendMessageRequest {
  to: string;
  message: string;
   type?: "text" | "template" | "image" | "video";
  templateName?: string;
  templateLanguage?: string;
   mediaUrl?: string;
   caption?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

  if (!accessToken) {
    console.error("WHATSAPP_ACCESS_TOKEN is not configured");
    return new Response(
      JSON.stringify({ error: "WhatsApp access token not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (!phoneNumberId) {
    console.error("WHATSAPP_PHONE_NUMBER_ID is not configured");
    return new Response(
      JSON.stringify({ error: "WhatsApp phone number ID not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body: SendMessageRequest = await req.json();
     const { to, message, type = "text", templateName, templateLanguage = "en", mediaUrl, caption } = body;

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Recipient phone number is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Clean phone number - remove spaces, dashes, and leading +
    const cleanPhone = to.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "");
    
    console.log(`Sending ${type} message to ${cleanPhone}`);

    let messagePayload: Record<string, unknown>;

     if (type === "image" && mediaUrl) {
       // Image message
       messagePayload = {
         messaging_product: "whatsapp",
         recipient_type: "individual",
         to: cleanPhone,
         type: "image",
         image: {
           link: mediaUrl,
           caption: caption || undefined,
         },
       };
     } else if (type === "video" && mediaUrl) {
       // Video message
       messagePayload = {
         messaging_product: "whatsapp",
         recipient_type: "individual",
         to: cleanPhone,
         type: "video",
         video: {
           link: mediaUrl,
           caption: caption || undefined,
         },
       };
     } else if (type === "template" && templateName) {
      // Template message
      messagePayload = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: templateLanguage,
          },
        },
      };
    } else {
      // Text message
       if (!message && type === "text") {
        return new Response(
          JSON.stringify({ error: "Message text is required for text messages" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      messagePayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: {
          preview_url: true,
          body: message,
        },
      };
    }

    console.log("Sending message payload:", JSON.stringify(messagePayload));

    // Send via WhatsApp Cloud API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messagePayload),
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", JSON.stringify(responseData));
      const errorMessage = responseData.error?.message || "Failed to send message";
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: responseData.error 
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Message sent successfully:", JSON.stringify(responseData));

    // Log the outbound message
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from("webhook_logs").insert({
      payload: {
        _event_type: "outbound_message",
        _message_type: type,
        _recipient_phone: cleanPhone,
         _text_preview: message?.substring(0, 200) || caption?.substring(0, 200) || templateName || mediaUrl,
         _media_url: mediaUrl,
        _message_id: responseData.messages?.[0]?.id,
        _sent_at: new Date().toISOString(),
        response: responseData,
      },
      processed: true,
    });

    return new Response(
      JSON.stringify({
        success: true,
        messageId: responseData.messages?.[0]?.id,
        to: cleanPhone,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending message:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
