import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useWebhookLogs } from "@/hooks/useWebhookLogs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import type { WebhookLog } from "@/hooks/useWebhookLogs";

export default function Logs() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);

  const { data: logs, isLoading } = useWebhookLogs(
    statusFilter === "all"
      ? undefined
      : { processed: statusFilter === "processed" }
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Webhook Logs</h1>
            <p className="text-muted-foreground">
              Monitor incoming webhook events and their processing status.
            </p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Logs</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="border rounded-lg p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : logs?.length === 0 ? (
          <div className="border rounded-lg p-12 text-center bg-card">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No webhook logs</h3>
            <p className="text-sm text-muted-foreground">
              Webhook events will appear here once received.
            </p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payload Preview</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.created_at!), "PPp")}
                    </TableCell>
                    <TableCell>
                      {log.error_message ? (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Error
                        </Badge>
                      ) : log.processed ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Processed
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <code className="text-xs bg-muted px-2 py-1 rounded truncate block">
                        {JSON.stringify(log.payload).slice(0, 80)}...
                      </code>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {log.error_message ? (
                        <span className="text-xs text-destructive truncate block">
                          {log.error_message}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Webhook Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Timestamp</p>
                  <p className="font-medium">
                    {format(new Date(selectedLog.created_at!), "PPpp")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">
                    {selectedLog.error_message
                      ? "Error"
                      : selectedLog.processed
                      ? "Processed"
                      : "Pending"}
                  </p>
                </div>
              </div>

              {selectedLog.error_message && (
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Error Message</p>
                  <p className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                    {selectedLog.error_message}
                  </p>
                </div>
              )}

              <div>
                <p className="text-muted-foreground text-sm mb-1">Payload</p>
                <ScrollArea className="h-[300px] border rounded-lg">
                  <pre className="text-xs p-4 font-mono">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}