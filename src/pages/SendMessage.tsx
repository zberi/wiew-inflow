import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
 import { Send, Loader2, CheckCircle, XCircle, MessageSquare, FileText, Image, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
 import { useMediaItems, useMediaUrl } from "@/hooks/useMediaItems";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SentMessage {
  id: string;
  to: string;
  message: string;
  status: "sent" | "failed";
  timestamp: Date;
  error?: string;
}

export default function SendMessage() {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [messageText, setMessageText] = useState("");
  const [templateName, setTemplateName] = useState("hello_world");
  const [templateLanguage, setTemplateLanguage] = useState("en");
  const [isSending, setIsSending] = useState(false);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
   const [mediaUrl, setMediaUrl] = useState("");
   const [mediaCaption, setMediaCaption] = useState("");
   const [selectedMediaId, setSelectedMediaId] = useState("");
   const [mediaInputMode, setMediaInputMode] = useState<"url" | "library">("url");
 
   const { data: mediaItems } = useMediaItems();
 
   // Get public URL for selected media
   const selectedMedia = mediaItems?.find(m => m.id === selectedMediaId);
   const { data: selectedMediaUrl } = useMediaUrl(selectedMedia?.file_path ?? null);

  const sendTextMessage = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    if (!messageText.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp-message", {
        body: {
          to: phoneNumber,
          message: messageText,
          type: "text",
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setSentMessages((prev) => [
        {
          id: data.messageId || Date.now().toString(),
          to: phoneNumber,
          message: messageText,
          status: "sent",
          timestamp: new Date(),
        },
        ...prev,
      ]);

      toast({
        title: "Message Sent",
        description: `Message sent to ${phoneNumber}`,
      });

      setMessageText("");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send message";
      
      setSentMessages((prev) => [
        {
          id: Date.now().toString(),
          to: phoneNumber,
          message: messageText,
          status: "failed",
          timestamp: new Date(),
          error: errorMessage,
        },
        ...prev,
      ]);

      toast({
        title: "Failed to Send",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

   const sendMediaMessage = async (mediaType: "image" | "video") => {
     if (!phoneNumber.trim()) {
       toast({
         title: "Error",
         description: "Please enter a phone number",
         variant: "destructive",
       });
       return;
     }
 
     const finalMediaUrl = mediaInputMode === "library" ? selectedMediaUrl : mediaUrl;
 
     if (!finalMediaUrl) {
       toast({
         title: "Error",
         description: mediaInputMode === "library" 
           ? "Please select media from the library" 
           : "Please enter a media URL",
         variant: "destructive",
       });
       return;
     }
 
     setIsSending(true);
 
     try {
       const { data, error } = await supabase.functions.invoke("send-whatsapp-message", {
         body: {
           to: phoneNumber,
           type: mediaType,
           mediaUrl: finalMediaUrl,
           caption: mediaCaption || undefined,
         },
       });
 
       if (error) throw error;
 
       if (data.error) {
         throw new Error(data.error);
       }
 
       setSentMessages((prev) => [
         {
           id: data.messageId || Date.now().toString(),
           to: phoneNumber,
           message: `${mediaType}: ${mediaCaption || finalMediaUrl}`,
           status: "sent",
           timestamp: new Date(),
         },
         ...prev,
       ]);
 
       toast({
         title: "Media Sent",
         description: `${mediaType === "image" ? "Image" : "Video"} sent to ${phoneNumber}`,
       });
 
       setMediaCaption("");
       if (mediaInputMode === "url") setMediaUrl("");
       if (mediaInputMode === "library") setSelectedMediaId("");
     } catch (err) {
       const errorMessage = err instanceof Error ? err.message : "Failed to send media";
       
       setSentMessages((prev) => [
         {
           id: Date.now().toString(),
           to: phoneNumber,
           message: `${mediaType}: ${mediaCaption || finalMediaUrl}`,
           status: "failed",
           timestamp: new Date(),
           error: errorMessage,
         },
         ...prev,
       ]);
 
       toast({
         title: "Failed to Send",
         description: errorMessage,
         variant: "destructive",
       });
     } finally {
       setIsSending(false);
     }
   };
 
  const sendTemplateMessage = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    if (!templateName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a template name",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp-message", {
        body: {
          to: phoneNumber,
          type: "template",
          templateName,
          templateLanguage,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setSentMessages((prev) => [
        {
          id: data.messageId || Date.now().toString(),
          to: phoneNumber,
          message: `Template: ${templateName}`,
          status: "sent",
          timestamp: new Date(),
        },
        ...prev,
      ]);

      toast({
        title: "Template Sent",
        description: `Template "${templateName}" sent to ${phoneNumber}`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send template";
      
      setSentMessages((prev) => [
        {
          id: Date.now().toString(),
          to: phoneNumber,
          message: `Template: ${templateName}`,
          status: "failed",
          timestamp: new Date(),
          error: errorMessage,
        },
        ...prev,
      ]);

      toast({
        title: "Failed to Send",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Send Message</h1>
          <p className="text-muted-foreground">
            Send WhatsApp messages via the Cloud API.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Compose Message */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Compose Message
              </CardTitle>
              <CardDescription>
                Send a text message or template to a WhatsApp number.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Recipient Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="+1234567890 or 1234567890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Include country code (e.g., +1 for US, +44 for UK)
                  </p>
                </div>

                <Tabs defaultValue="text" className="w-full">
                   <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="text" className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      Text
                    </TabsTrigger>
                     <TabsTrigger value="image" className="flex items-center gap-1">
                       <Image className="h-4 w-4" />
                       Image
                     </TabsTrigger>
                     <TabsTrigger value="video" className="flex items-center gap-1">
                       <Video className="h-4 w-4" />
                       Video
                     </TabsTrigger>
                    <TabsTrigger value="template" className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      Template
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="text" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        placeholder="Type your message here..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        {messageText.length}/4096 characters
                      </p>
                    </div>

                    <Button
                      onClick={sendTextMessage}
                      disabled={isSending}
                      className="w-full"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Text Message
                        </>
                      )}
                    </Button>
                  </TabsContent>

                   <TabsContent value="image" className="space-y-4">
                     <div className="space-y-2">
                       <Label>Image Source</Label>
                       <div className="flex gap-2">
                         <Button
                           type="button"
                           variant={mediaInputMode === "url" ? "default" : "outline"}
                           size="sm"
                           onClick={() => setMediaInputMode("url")}
                         >
                           URL
                         </Button>
                         <Button
                           type="button"
                           variant={mediaInputMode === "library" ? "default" : "outline"}
                           size="sm"
                           onClick={() => setMediaInputMode("library")}
                         >
                           Media Library
                         </Button>
                       </div>
                     </div>
 
                     {mediaInputMode === "url" ? (
                       <div className="space-y-2">
                         <Label htmlFor="imageUrl">Image URL</Label>
                         <Input
                           id="imageUrl"
                           placeholder="https://example.com/image.jpg"
                           value={mediaUrl}
                           onChange={(e) => setMediaUrl(e.target.value)}
                         />
                         <p className="text-xs text-muted-foreground">
                           Must be a publicly accessible HTTPS URL (JPEG, PNG supported).
                         </p>
                       </div>
                     ) : (
                       <div className="space-y-2">
                         <Label>Select from Library</Label>
                         <Select value={selectedMediaId} onValueChange={setSelectedMediaId}>
                           <SelectTrigger>
                             <SelectValue placeholder="Choose an image..." />
                           </SelectTrigger>
                           <SelectContent>
                             {mediaItems
                               ?.filter(m => m.media_type === "photo")
                               .map(media => (
                                 <SelectItem key={media.id} value={media.id}>
                                   {media.caption || media.sender_name || media.id.slice(0, 8)}
                                 </SelectItem>
                               ))}
                           </SelectContent>
                         </Select>
                         {selectedMediaUrl && (
                           <div className="mt-2 rounded-lg border overflow-hidden">
                             <img 
                               src={selectedMediaUrl} 
                               alt="Selected" 
                               className="w-full h-32 object-cover"
                             />
                           </div>
                         )}
                       </div>
                     )}
 
                     <div className="space-y-2">
                       <Label htmlFor="imageCaption">Caption (optional)</Label>
                       <Input
                         id="imageCaption"
                         placeholder="Add a caption..."
                         value={mediaCaption}
                         onChange={(e) => setMediaCaption(e.target.value)}
                       />
                     </div>
 
                     <Button
                       onClick={() => sendMediaMessage("image")}
                       disabled={isSending}
                       className="w-full"
                     >
                       {isSending ? (
                         <>
                           <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                           Sending...
                         </>
                       ) : (
                         <>
                           <Send className="h-4 w-4 mr-2" />
                           Send Image
                         </>
                       )}
                     </Button>
                   </TabsContent>
 
                   <TabsContent value="video" className="space-y-4">
                     <div className="space-y-2">
                       <Label>Video Source</Label>
                       <div className="flex gap-2">
                         <Button
                           type="button"
                           variant={mediaInputMode === "url" ? "default" : "outline"}
                           size="sm"
                           onClick={() => setMediaInputMode("url")}
                         >
                           URL
                         </Button>
                         <Button
                           type="button"
                           variant={mediaInputMode === "library" ? "default" : "outline"}
                           size="sm"
                           onClick={() => setMediaInputMode("library")}
                         >
                           Media Library
                         </Button>
                       </div>
                     </div>
 
                     {mediaInputMode === "url" ? (
                       <div className="space-y-2">
                         <Label htmlFor="videoUrl">Video URL</Label>
                         <Input
                           id="videoUrl"
                           placeholder="https://example.com/video.mp4"
                           value={mediaUrl}
                           onChange={(e) => setMediaUrl(e.target.value)}
                         />
                         <p className="text-xs text-muted-foreground">
                           Must be a publicly accessible HTTPS URL (MP4, 3GPP supported).
                         </p>
                       </div>
                     ) : (
                       <div className="space-y-2">
                         <Label>Select from Library</Label>
                         <Select value={selectedMediaId} onValueChange={setSelectedMediaId}>
                           <SelectTrigger>
                             <SelectValue placeholder="Choose a video..." />
                           </SelectTrigger>
                           <SelectContent>
                             {mediaItems
                               ?.filter(m => m.media_type === "video")
                               .map(media => (
                                 <SelectItem key={media.id} value={media.id}>
                                   {media.caption || media.sender_name || media.id.slice(0, 8)}
                                 </SelectItem>
                               ))}
                           </SelectContent>
                         </Select>
                       </div>
                     )}
 
                     <div className="space-y-2">
                       <Label htmlFor="videoCaption">Caption (optional)</Label>
                       <Input
                         id="videoCaption"
                         placeholder="Add a caption..."
                         value={mediaCaption}
                         onChange={(e) => setMediaCaption(e.target.value)}
                       />
                     </div>
 
                     <Button
                       onClick={() => sendMediaMessage("video")}
                       disabled={isSending}
                       className="w-full"
                     >
                       {isSending ? (
                         <>
                           <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                           Sending...
                         </>
                       ) : (
                         <>
                           <Send className="h-4 w-4 mr-2" />
                           Send Video
                         </>
                       )}
                     </Button>
                   </TabsContent>
 
                  <TabsContent value="template" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="templateName">Template Name</Label>
                      <Input
                        id="templateName"
                        placeholder="hello_world"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Must be an approved template in your WhatsApp Business account.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="templateLang">Language Code</Label>
                      <Input
                        id="templateLang"
                        placeholder="en"
                        value={templateLanguage}
                        onChange={(e) => setTemplateLanguage(e.target.value)}
                      />
                    </div>

                    <Button
                      onClick={sendTemplateMessage}
                      disabled={isSending}
                      className="w-full"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Template
                        </>
                      )}
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* Sent Messages */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Messages</CardTitle>
              <CardDescription>
                Messages sent in this session.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {sentMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No messages sent yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sentMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className="p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {msg.status === "sent" ? (
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                            )}
                            <div>
                              <p className="text-sm font-medium">{msg.to}</p>
                              <p className="text-xs text-muted-foreground">
                                {msg.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={msg.status === "sent" ? "default" : "destructive"}
                          >
                            {msg.status}
                          </Badge>
                        </div>
                        <p className="text-sm mt-2 text-muted-foreground line-clamp-2">
                          {msg.message}
                        </p>
                        {msg.error && (
                          <p className="text-xs text-destructive mt-1">
                            {msg.error}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp Messaging Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Text Messages:</strong> You can only send text messages to users who have 
              messaged you within the last 24 hours (customer service window).
            </p>
            <p>
              <strong>Template Messages:</strong> Pre-approved templates can be sent anytime. 
              The default "hello_world" template is available in all new WhatsApp Business accounts.
            </p>
            <p>
              <strong>Phone Format:</strong> Use international format with country code 
              (e.g., 14155238886 for US numbers). The leading + is optional.
            </p>
             <p>
               <strong>Media Messages:</strong> Images and videos must be publicly accessible via HTTPS URLs.
               You can also select from your media library if using public storage.
             </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
