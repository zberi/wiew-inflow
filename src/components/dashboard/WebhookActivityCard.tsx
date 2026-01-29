import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Webhook, CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react";
import { useWebhookLogs, useWebhookLogStats } from "@/hooks/useWebhookLogs";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

export function WebhookActivityCard() {
  const { data: logs, isLoading } = useWebhookLogs();
  const { data: stats } = useWebhookLogStats();
  const recentLogs = logs?.slice(0, 5) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            Webhook Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 bg-muted rounded" />
                  <div className="h-2 w-1/2 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            Webhook Activity
          </CardTitle>
          <Link to="/logs">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              View All
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
        {stats && (
          <div className="flex gap-3 mt-2">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-success" />
              <span className="text-muted-foreground">{stats.processed} processed</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-warning" />
              <span className="text-muted-foreground">{stats.pending} pending</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-destructive" />
              <span className="text-muted-foreground">{stats.errors} errors</span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px]">
          {recentLogs.length === 0 ? (
            <div className="text-center py-8">
              <Webhook className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                No webhook events received yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Events will appear here when WhatsApp sends messages
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => {
                const payload = log.payload as Record<string, unknown>;
                const isWhatsApp = payload?.object === "whatsapp_business_account";
                
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="mt-0.5">
                      {log.error_message ? (
                        <div className="h-7 w-7 rounded-full bg-destructive/10 flex items-center justify-center">
                          <XCircle className="h-4 w-4 text-destructive" />
                        </div>
                      ) : log.processed ? (
                        <div className="h-7 w-7 rounded-full bg-success/10 flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-success" />
                        </div>
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-warning/10 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-warning" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge 
                          variant={isWhatsApp ? "default" : "secondary"} 
                          className="text-[10px] px-1.5 py-0"
                        >
                          {isWhatsApp ? "WhatsApp" : "Other"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at!), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {log.error_message || (log.processed ? "Processed successfully" : "Awaiting processing")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
