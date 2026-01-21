import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { MediaCard } from "@/components/media/MediaCard";
import { MediaFilters } from "@/components/media/MediaFilters";
import { MediaDetailModal } from "@/components/media/MediaDetailModal";
import { QueueMediaDialog } from "@/components/media/QueueMediaDialog";
import { DataTablePagination } from "@/components/shared/DataTablePagination";
import { MediaThumbnail } from "@/components/media/MediaThumbnail";
import { useMediaItems, useDeleteMediaItem, type MediaItem } from "@/hooks/useMediaItems";
import { usePagination } from "@/hooks/usePagination";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Upload, Trash2, Image, Video } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Media() {
  const [search, setSearch] = useState("");
  const [mediaType, setMediaType] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [queueItem, setQueueItem] = useState<MediaItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<MediaItem | null>(null);

  const { data: mediaItems, isLoading } = useMediaItems({
    mediaType: mediaType === "all" ? undefined : mediaType as "photo" | "video",
    search: search || undefined,
  });

  const deleteMediaItem = useDeleteMediaItem();
  const { toast } = useToast();

  const {
    page,
    pageSize,
    setPage,
    setPageSize,
    paginatedData,
    totalItems,
  } = usePagination(mediaItems);

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      await deleteMediaItem.mutateAsync(deleteItem.id);
      toast({
        title: "Media deleted",
        description: "The media item has been removed.",
      });
      setDeleteItem(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete media item.",
        variant: "destructive",
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
          <p className="text-muted-foreground">
            Browse and manage all ingested media from WhatsApp groups.
          </p>
        </div>

        <MediaFilters
          search={search}
          onSearchChange={setSearch}
          mediaType={mediaType}
          onMediaTypeChange={setMediaType}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-video bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : mediaItems?.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-card">
            <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No media found</h3>
            <p className="text-sm text-muted-foreground">
              {search || mediaType !== "all"
                ? "Try adjusting your filters"
                : "Media from WhatsApp will appear here once received"}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedData.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  onView={setSelectedItem}
                  onQueue={setQueueItem}
                  onDelete={setDeleteItem}
                />
              ))}
            </div>
            <DataTablePagination
              page={page}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Preview</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Caption</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <MediaThumbnail
                        filePath={item.file_path}
                        thumbnailPath={item.thumbnail_path}
                        mediaType={item.media_type}
                        className="h-10 w-10 rounded"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        {item.media_type === "photo" ? (
                          <Image className="h-3 w-3" />
                        ) : (
                          <Video className="h-3 w-3" />
                        )}
                        {item.media_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.sender_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{item.sender_phone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {item.caption || "-"}
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(item.received_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedItem(item)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setQueueItem(item)}
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteItem(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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

      <MediaDetailModal
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onQueue={(item) => {
          setSelectedItem(null);
          setQueueItem(item);
        }}
      />

      <QueueMediaDialog
        item={queueItem}
        open={!!queueItem}
        onClose={() => setQueueItem(null)}
      />

      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this media item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
