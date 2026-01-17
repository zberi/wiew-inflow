import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Image, Video, Upload, Calendar, User, Phone, MessageSquare, Hash } from "lucide-react";
import { format } from "date-fns";
import type { MediaItem } from "@/hooks/useMediaItems";

interface MediaDetailModalProps {
  item: MediaItem | null;
  open: boolean;
  onClose: () => void;
  onQueue: (item: MediaItem) => void;
}

export function MediaDetailModal({
  item,
  open,
  onClose,
  onQueue,
}: MediaDetailModalProps) {
  if (!item) return null;

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {item.media_type === "photo" ? (
              <Image className="h-5 w-5" />
            ) : (
              <Video className="h-5 w-5" />
            )}
            Media Details
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            {item.media_type === "photo" ? (
              <Image className="h-16 w-16 text-muted-foreground" />
            ) : (
              <Video className="h-16 w-16 text-muted-foreground" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge>{item.media_type}</Badge>
            {item.mime_type && (
              <Badge variant="outline">{item.mime_type}</Badge>
            )}
            <Badge variant="secondary">{formatBytes(item.file_size)}</Badge>
          </div>

          <Separator />

          <div className="grid gap-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Sender Name
                </p>
                <p className="font-medium">{item.sender_name || "Unknown"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </p>
                <p className="font-medium">{item.sender_phone}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Received At
                </p>
                <p className="font-medium">
                  {format(new Date(item.received_at), "PPpp")}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Message ID
                </p>
                <p className="font-medium font-mono text-xs">{item.message_id}</p>
              </div>
            </div>

            {item.caption && (
              <div className="space-y-1">
                <p className="text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Caption
                </p>
                <p className="font-medium">{item.caption}</p>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => onQueue(item)}>
              <Upload className="h-4 w-4 mr-2" />
              Queue for Upload
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}