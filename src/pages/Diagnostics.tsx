import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Radio, 
  Wifi,
  MessageSquare,
  RefreshCw,
  Image,
  Video,
  FileText,
  AlertCircle,
  Inbox
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useInboundEvents } from "@/hooks/useWebhookLogs";
import { formatDistanceToNow } from "date-fns";

type TestStatus = "idle" | "loading" | "success" | "error";

interface TestResult {
  status: TestStatus;
  message?: string;
  details?: string;
}

export default function Diagnostics() {
  const { toast } = useToast();
  const [twilioTest, setTwilioTest] = useState<TestResult>({ status: "idle" });
  const [cloudApiTest, setCloudApiTest] = useState<TestResult>({ status: "idle" });
  const [verifyToken, setVerifyToken] = useState("my-whatsapp-webhook-verify-2026");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const twilioWebhookUrl = `${supabaseUrl}/functions/v1/twilio-webhook`;
  const cloudApiWebhookUrl = `${supabaseUrl}/functions/v1/whatsapp-cloud-webhook`;

  const testTwilioWebhook = async () => {
    setTwilioTest({ status: "loading" });
    
    try {
      const response = await fetch(twilioWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          MessageSid: "TEST_PING_" + Date.now(),
          From: "whatsapp:+1234567890",
          Body: "Test ping from diagnostics",
        }),
      });

      if (response.ok) {
        setTwilioTest({ 
          status: "success", 
          message: "Webhook reachable",
          details: `Status: ${response.status} - Endpoint is responding`
        });
        toast({ title: "Twilio Webhook", description: "Endpoint is reachable and responding." });
      } else {
        const text = await response.text();
        setTwilioTest({ 
          status: "error", 
          message: `HTTP ${response.status}`,
          details: text.substring(0, 200)
        });
      }
    } catch (error) {
      setTwilioTest({ 
        status: "error", 
        message: "Connection failed",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  const testCloudApiVerification = async () => {
    setCloudApiTest({ status: "loading" });
    
    try {
      // Test the webhook verification endpoint (GET request)
      const challenge = "test_challenge_" + Date.now();
      const params = new URLSearchParams({
        "hub.mode": "subscribe",
        "hub.verify_token": verifyToken,
        "hub.challenge": challenge,
      });

      const response = await fetch(`${cloudApiWebhookUrl}?${params}`, {
        method: "GET",
      });

      const text = await response.text();

      if (response.ok && text === challenge) {
        setCloudApiTest({ 
          status: "success", 
          message: "Verification successful",
          details: "Webhook returned the correct challenge token"
        });
        toast({ title: "WhatsApp Cloud API", description: "Webhook verification successful!" });
      } else if (response.ok) {
        setCloudApiTest({ 
          status: "error", 
          message: "Challenge mismatch",
          details: `Expected: ${challenge}, Got: ${text.substring(0, 100)}`
        });
      } else {
        setCloudApiTest({ 
          status: "error", 
          message: `HTTP ${response.status}`,
          details: text.substring(0, 200)
        });
      }
    } catch (error) {
      setCloudApiTest({ 
        status: "error", 
        message: "Connection failed",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  const testCloudApiPost = async () => {
    setCloudApiTest({ status: "loading" });
    
    try {
      // Send a minimal test payload to check POST endpoint
      const testPayload = {
        object: "whatsapp_business_account",
        entry: [{
          id: "TEST_ACCOUNT",
          changes: [{
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "1234567890",
                phone_number_id: "TEST_PHONE_ID"
              },
              messages: [{
                from: "1234567890",
                id: "TEST_MSG_" + Date.now(),
                timestamp: Math.floor(Date.now() / 1000).toString(),
                type: "text",
                text: { body: "Diagnostics test ping" }
              }]
            },
            field: "messages"
          }]
        }]
      };

      const response = await fetch(cloudApiWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        setCloudApiTest({ 
          status: "success", 
          message: "POST endpoint reachable",
          details: `Status: ${response.status} - Webhook processed test message`
        });
        toast({ title: "WhatsApp Cloud API", description: "POST endpoint is responding!" });
      } else {
        const text = await response.text();
        setCloudApiTest({ 
          status: "error", 
          message: `HTTP ${response.status}`,
          details: text.substring(0, 200)
        });
      }
    } catch (error) {
      setCloudApiTest({ 
        status: "error", 
        message: "Connection failed",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case "loading":
        return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Radio className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: TestStatus, message?: string) => {
    switch (status) {
      case "loading":
        return <Badge variant="secondary">Testing...</Badge>;
      case "success":
        return <Badge variant="default" className="bg-green-500">{message || "Success"}</Badge>;
      case "error":
        return <Badge variant="destructive">{message || "Failed"}</Badge>;
      default:
        return <Badge variant="outline">Not tested</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Diagnostics</h1>
          <p className="text-muted-foreground">
            Test webhook connectivity and verify your WhatsApp integration setup.
          </p>
        </div>

        {/* Twilio Webhook Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Twilio Webhook
            </CardTitle>
            <CardDescription>
              Test connectivity to the Twilio WhatsApp webhook endpoint.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                {getStatusIcon(twilioTest.status)}
                <div>
                  <p className="font-medium text-sm">Endpoint Status</p>
                  <p className="text-xs text-muted-foreground font-mono truncate max-w-md">
                    {twilioWebhookUrl}
                  </p>
                </div>
              </div>
              {getStatusBadge(twilioTest.status, twilioTest.message)}
            </div>
            
            {twilioTest.details && (
              <div className="p-3 rounded-lg bg-muted/30 text-sm">
                <p className="text-muted-foreground">{twilioTest.details}</p>
              </div>
            )}

            <Button 
              onClick={testTwilioWebhook} 
              disabled={twilioTest.status === "loading"}
            >
              {twilioTest.status === "loading" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Test Twilio Webhook
            </Button>
          </CardContent>
        </Card>

        {/* WhatsApp Cloud API Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              WhatsApp Cloud API Webhook
            </CardTitle>
            <CardDescription>
              Test connectivity and verification for the WhatsApp Cloud API (Graph API) webhook.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                {getStatusIcon(cloudApiTest.status)}
                <div>
                  <p className="font-medium text-sm">Endpoint Status</p>
                  <p className="text-xs text-muted-foreground font-mono truncate max-w-md">
                    {cloudApiWebhookUrl}
                  </p>
                </div>
              </div>
              {getStatusBadge(cloudApiTest.status, cloudApiTest.message)}
            </div>

            {cloudApiTest.details && (
              <div className="p-3 rounded-lg bg-muted/30 text-sm">
                <p className="text-muted-foreground">{cloudApiTest.details}</p>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="verify-token">Verify Token (for webhook verification test)</Label>
              <Input
                id="verify-token"
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                placeholder="Enter your verify token"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                This should match the WHATSAPP_VERIFY_TOKEN secret configured in your backend.
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={testCloudApiVerification} 
                disabled={cloudApiTest.status === "loading"}
                variant="outline"
              >
                {cloudApiTest.status === "loading" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Test Verification (GET)
              </Button>
              
              <Button 
                onClick={testCloudApiPost} 
                disabled={cloudApiTest.status === "loading"}
              >
                {cloudApiTest.status === "loading" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Test Message Handler (POST)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Setup Info */}
        {/* Inbound Events Log */}
        <InboundEventsCard />

        {/* Facebook Setup Info */}
        <Card>
          <CardHeader>
            <CardTitle>Facebook Developer Setup</CardTitle>
            <CardDescription>
              Configure your webhook in the Facebook Developer Console.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Callback URL</Label>
              <div className="p-2 bg-muted rounded-md font-mono text-sm break-all">
                {cloudApiWebhookUrl}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Required Webhook Fields</Label>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">messages</Badge>
                <Badge variant="secondary">message_deliveries</Badge>
                <Badge variant="secondary">message_reads</Badge>
              </div>
            </div>

            <Separator />

            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Go to Facebook Developer Console → Your App → WhatsApp → Configuration</li>
              <li>Click "Edit" on the Webhook section</li>
              <li>Enter the Callback URL above</li>
              <li>Enter your Verify Token (same as WHATSAPP_VERIFY_TOKEN secret)</li>
              <li>Click "Verify and Save"</li>
              <li>Subscribe to the "messages" webhook field</li>
            </ol>

            <Button variant="outline" asChild>
              <a
                href="https://developers.facebook.com/apps/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Facebook Developer Console
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function InboundEventsCard() {
  const { data: events, isLoading, refetch, isRefetching } = useInboundEvents(50);

  const getMessageTypeIcon = (type: string | null) => {
    switch (type) {
      case "text":
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case "image":
      case "photo":
        return <Image className="h-4 w-4 text-blue-500" />;
      case "video":
        return <Video className="h-4 w-4 text-purple-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEventBadge = (event: { event_type: string; message_type: string | null; error: string | null }) => {
    if (event.error) {
      return <Badge variant="destructive">Error</Badge>;
    }
    if (event.event_type === "status") {
      return <Badge variant="secondary">Status</Badge>;
    }
    if (event.message_type) {
      return <Badge variant="outline" className="capitalize">{event.message_type}</Badge>;
    }
    return <Badge variant="secondary">{event.event_type}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Inbound Events
            </CardTitle>
            <CardDescription>
              Recent webhook events received from WhatsApp. Auto-refreshes every 10 seconds.
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !events || events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Inbox className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">No inbound events yet.</p>
            <p className="text-xs mt-1">Send a message to your WhatsApp number to see events here.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Type</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[120px]">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      {getMessageTypeIcon(event.message_type)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium truncate max-w-[150px]">
                          {event.sender_name || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {event.sender_phone || "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        {event.error ? (
                          <div className="flex items-center gap-1 text-destructive">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span className="text-xs truncate">{event.error}</span>
                          </div>
                        ) : event.text_preview ? (
                          <span className="text-sm truncate block">{event.text_preview}</span>
                        ) : event.media_filename ? (
                          <span className="text-xs font-mono text-muted-foreground truncate block">
                            {event.media_filename}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getEventBadge(event)}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {event.created_at 
                          ? formatDistanceToNow(new Date(event.created_at), { addSuffix: true })
                          : "—"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
