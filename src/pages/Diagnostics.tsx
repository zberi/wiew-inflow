import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Radio, 
  Wifi,
  MessageSquare,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [verifyToken, setVerifyToken] = useState("my-whatsapp-verify-token");

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
