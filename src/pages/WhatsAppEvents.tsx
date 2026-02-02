import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MessageSquare,
  Image,
  Video,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Search,
  Phone,
} from "lucide-react";
import { useWhatsAppEvents, useWhatsAppEventStats, type ParsedWhatsAppEvent } from "@/hooks/useWhatsAppEvents";
import { formatDistanceToNow, format } from "date-fns";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/shared/DataTablePagination";

function getMessageTypeIcon(type?: string) {
  switch (type) {
    case "text":
      return <MessageSquare className="h-4 w-4" />;
    case "image":
      return <Image className="h-4 w-4" />;
    case "video":
      return <Video className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

function getMessageTypeBadge(type?: string) {
  const variants: Record<string, "default" | "secondary" | "outline"> = {
    text: "default",
    image: "secondary",
    video: "outline",
  };
  return (
    <Badge variant={variants[type || ""] || "outline"} className="gap-1 text-xs">
      {getMessageTypeIcon(type)}
      {type || "unknown"}
    </Badge>
  );
}

function getEventTypeBadge(type: string) {
  const config: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
    message: { variant: "default", label: "Message" },
    status: { variant: "secondary", label: "Status" },
    verification: { variant: "outline", label: "Verify" },
    unknown: { variant: "outline", label: "Unknown" },
  };
  const { variant, label } = config[type] || config.unknown;
  return <Badge variant={variant}>{label}</Badge>;
}

function EventRow({ event }: { event: ParsedWhatsAppEvent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-accent/50"
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell className="font-mono text-xs text-muted-foreground">
          <div className="flex flex-col">
            <span>{format(new Date(event.timestamp), "MMM d, HH:mm:ss")}</span>
            <span className="text-[10px]">
              {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Phone className="h-3 w-3 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {event.senderPhone || "—"}
              </span>
              {event.senderName && (
                <span className="text-xs text-muted-foreground">
                  {event.senderName}
                </span>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>{getEventTypeBadge(event.eventType)}</TableCell>
        <TableCell>
          {event.eventType === "message" && getMessageTypeBadge(event.messageType)}
        </TableCell>
        <TableCell className="max-w-[200px]">
          <div className="truncate text-sm">
            {event.textPreview ? (
              <span className="text-foreground">{event.textPreview}</span>
            ) : event.mediaFilename ? (
              <span className="text-muted-foreground font-mono text-xs">
                {event.mediaFilename}
              </span>
            ) : event.eventType === "status" ? (
              <span className="text-muted-foreground italic">Status update</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </TableCell>
        <TableCell>
          {event.error ? (
            <div className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs">Error</span>
            </div>
          ) : event.processed ? (
            <div className="flex items-center gap-1 text-success">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs">Done</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-warning">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Pending</span>
            </div>
          )}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/30 p-4">
            <div className="space-y-2">
              {event.error && (
                <div className="rounded bg-destructive/10 p-2 text-sm text-destructive">
                  <strong>Error:</strong> {event.error}
                </div>
              )}
              <details className="text-xs">
                <summary className="cursor-pointer font-medium text-muted-foreground">
                  Raw Payload
                </summary>
                <pre className="mt-2 max-h-[300px] overflow-auto rounded bg-muted p-2 text-[10px]">
                  {JSON.stringify(event.raw.payload, null, 2)}
                </pre>
              </details>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function WhatsAppEvents() {
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState<"all" | "message" | "status">("all");

  const { data: events, isLoading, refetch, isFetching } = useWhatsAppEvents({
    eventType: eventFilter,
    limit: 200,
  });
  const { data: stats } = useWhatsAppEventStats();

  // Filter by search
  const filteredEvents = events?.filter((event) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      event.senderPhone?.toLowerCase().includes(searchLower) ||
      event.senderName?.toLowerCase().includes(searchLower) ||
      event.textPreview?.toLowerCase().includes(searchLower) ||
      event.mediaFilename?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination
  const pagination = usePagination<ParsedWhatsAppEvent>(filteredEvents || [], {
    initialPageSize: 25,
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Incoming WhatsApp Events</h1>
            <p className="text-sm text-muted-foreground">
              Real-time view of all inbound WhatsApp webhook events
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{stats?.messages || 0}</span>
                <span className="text-xs text-muted-foreground">
                  ({stats?.texts || 0} text, {stats?.images || 0} img, {stats?.videos || 0} vid)
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Status Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.statuses || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {stats?.errors || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by phone, name, or content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={eventFilter}
            onValueChange={(v) => setEventFilter(v as typeof eventFilter)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Event type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="message">Messages Only</SelectItem>
              <SelectItem value="status">Status Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Events Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEvents?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">No WhatsApp Events</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Events will appear here when WhatsApp sends webhook notifications
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Timestamp</TableHead>
                      <TableHead className="w-[180px]">Sender</TableHead>
                      <TableHead className="w-[100px]">Event</TableHead>
                      <TableHead className="w-[100px]">Type</TableHead>
                      <TableHead>Preview</TableHead>
                      <TableHead className="w-[80px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagination.paginatedData.map((event) => (
                      <EventRow key={event.id} event={event} />
                    ))}
                  </TableBody>
                </Table>
                <div className="border-t p-4">
                  <DataTablePagination
                    page={pagination.page}
                    pageSize={pagination.pageSize}
                    totalItems={pagination.totalItems}
                    onPageChange={pagination.setPage}
                    onPageSizeChange={pagination.setPageSize}
                    pageSizeOptions={[10, 25, 50, 100]}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
