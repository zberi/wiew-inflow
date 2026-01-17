import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, ExternalLink, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/twilio-webhook`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Webhook URL copied to clipboard." });
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure your WhatsApp Media Hub integration settings.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Twilio Webhook Configuration</CardTitle>
            <CardDescription>
              Configure your Twilio WhatsApp number to send webhooks to this endpoint.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  value={webhookUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(webhookUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Set this URL as your Twilio WhatsApp webhook endpoint for incoming messages.
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Setup Instructions</Label>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Go to your Twilio Console → Messaging → WhatsApp Sandbox Settings</li>
                <li>Copy the webhook URL above</li>
                <li>Paste it in the "When a message comes in" field</li>
                <li>Set the HTTP method to POST</li>
                <li>Save your configuration</li>
              </ol>
            </div>

            <Button variant="outline" asChild>
              <a
                href="https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Twilio Console
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Credentials Status</CardTitle>
            <CardDescription>
              Status of your configured API credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Twilio Account SID</p>
                <p className="text-sm text-muted-foreground">Used for webhook signature validation</p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Not Required
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Twilio Auth Token</p>
                <p className="text-sm text-muted-foreground">Used for media download authentication</p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Not Required
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>
              Current system configuration and status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Storage Bucket</span>
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  whatsapp-media
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Database</span>
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Connected
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Edge Functions</span>
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Deployed
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}