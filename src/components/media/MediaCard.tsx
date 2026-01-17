import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Image, Video, MoreVertical, Eye, Upload, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import type { MediaItem } from "@/hooks/useMediaItems";

interface MediaCardProps {
  item: MediaItem;
  onView: (item: MediaItem) => void;
  onQueue: (item: MediaItem) => void;
  onDelete: (item: MediaItem) => void;
}

export function MediaCard({ item, onView, onQueue, onDelete }: MediaCardProps) {
  return (
    <Card className="group overflow-hidden">
      <div className="aspect-video bg-muted relative flex items-center justify-center">
        {item.media_type === "photo" ? (
          <Image className="h-12 w-12 text-muted-foreground" />
        ) : (
          <Video className="h-12 w-12 text-muted-foreground" />
        )}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onView(item)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onQueue(item)}
          >
            <Upload className="h-4 w-4" />
          </Button>
        </div>
        <Badge 
          variant="secondary" 
          className="absolute top-2 left-2 text-xs"
        >
          {item.media_type}
        </Badge>
      </div>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              {item.sender_name || item.sender_phone}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(item.received_at), { addSuffix: true })}
            </p>
            {item.caption && (
              <p className="text-xs text-muted-foreground truncate mt-1">
                {item.caption}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(item)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onQueue(item)}>
                <Upload className="h-4 w-4 mr-2" />
                Queue for Upload
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(item)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}