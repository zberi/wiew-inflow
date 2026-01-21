import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  useUploadQueue,
  useApproveUpload,
  useRejectUpload,
  useRetryUpload,
  useQueueStats,
  type UploadStatus,
} from "@/hooks/useUploadQueue";
import { useBulkApproveUploads, useBulkRejectUploads } from "@/hooks/useBulkQueueActions";
import { usePagination } from "@/hooks/usePagination";
import { useToast } from "@/hooks/use-toast";
import { BulkActions } from "@/components/queue/BulkActions";
import { DataTablePagination } from "@/components/shared/DataTablePagination";
import { MediaThumbnail } from "@/components/media/MediaThumbnail";
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
  Check,
  X,
  RotateCcw,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const statusConfig: Record<UploadStatus, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", icon: <Clock className="h-3 w-3" />, variant: "secondary" },
  approved: { label: "Approved", icon: <Check className="h-3 w-3" />, variant: "default" },
  rejected: { label: "Rejected", icon: <XCircle className="h-3 w-3" />, variant: "destructive" },
  uploading: { label: "Uploading", icon: <Loader2 className="h-3 w-3 animate-spin" />, variant: "outline" },
  completed: { label: "Completed", icon: <CheckCircle className="h-3 w-3" />, variant: "default" },
  failed: { label: "Failed", icon: <AlertCircle className="h-3 w-3" />, variant: "destructive" },
};

export default function Queue() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: queueItems, isLoading } = useUploadQueue(
    statusFilter === "all" ? undefined : { status: statusFilter as UploadStatus }
  );
  const { data: stats } = useQueueStats();
  
  const approveUpload = useApproveUpload();
  const rejectUpload = useRejectUpload();
  const retryUpload = useRetryUpload();
  const bulkApprove = useBulkApproveUploads();
  const bulkReject = useBulkRejectUploads();
  const { toast } = useToast();

  const {
    page,
    pageSize,
    setPage,
    setPageSize,
    paginatedData,
    totalItems,
  } = usePagination(queueItems);

  const handleApprove = async (id: string) => {
    try {
      await approveUpload.mutateAsync(id);
      toast({ title: "Upload approved", description: "The upload has been approved and queued for processing." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to approve upload.", variant: "destructive" });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectUpload.mutateAsync(id);
      toast({ title: "Upload rejected", description: "The upload request has been rejected." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to reject upload.", variant: "destructive" });
    }
  };

  const handleRetry = async (id: string) => {
    try {
      await retryUpload.mutateAsync(id);
      toast({ title: "Retry queued", description: "The upload will be retried." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to retry upload.", variant: "destructive" });
    }
  };

  const handleBulkApprove = async () => {
    try {
      await bulkApprove.mutateAsync();
      toast({ title: "All approved", description: `All pending uploads have been approved.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to approve uploads.", variant: "destructive" });
    }
  };

  const handleBulkReject = async () => {
    try {
      await bulkReject.mutateAsync();
      toast({ title: "All rejected", description: `All pending uploads have been rejected.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to reject uploads.", variant: "destructive" });
    }
  };

  const pendingCount = stats?.pending ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Upload Queue</h1>
            <p className="text-muted-foreground">
              Review and approve media uploads to external destinations.
            </p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="uploading">Uploading</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {statusFilter === "all" && (
          <BulkActions
            pendingCount={pendingCount}
            onApproveAll={handleBulkApprove}
            onRejectAll={handleBulkReject}
            isApproving={bulkApprove.isPending}
            isRejecting={bulkReject.isPending}
          />
        )}

        {isLoading ? (
          <div className="border rounded-lg p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : queueItems?.length === 0 ? (
          <div className="border rounded-lg p-12 text-center bg-card">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No items in queue</h3>
            <p className="text-sm text-muted-foreground">
              {statusFilter !== "all"
                ? "No items match the selected filter"
                : "Queue items for upload from the Media Library"}
            </p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Media</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Queued</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((item) => {
                  const status = item.status || "pending";
                  const config = statusConfig[status];

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <MediaThumbnail
                            filePath={item.media_items?.file_path ?? null}
                            thumbnailPath={item.media_items?.thumbnail_path ?? null}
                            mediaType={item.media_items?.media_type ?? "photo"}
                            className="h-10 w-10 rounded"
                          />
                          <div>
                            <p className="font-medium text-sm">
                              {item.media_items?.sender_name || item.media_items?.sender_phone || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.media_items?.media_type}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{item.destinations?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {item.destinations?.destination_type}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant} className="gap-1">
                          {config.icon}
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(item.created_at!), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {item.error_message ? (
                          <span className="text-xs text-destructive truncate block">
                            {item.error_message}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleApprove(item.id)}
                                disabled={approveUpload.isPending}
                                className="text-primary hover:text-primary"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleReject(item.id)}
                                disabled={rejectUpload.isPending}
                                className="text-destructive hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {status === "failed" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRetry(item.id)}
                              disabled={retryUpload.isPending}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <DataTablePagination
              page={page}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
