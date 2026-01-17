import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useDestinations } from "@/hooks/useDestinations";
import { useCreateQueueItem } from "@/hooks/useUploadQueue";
import { useToast } from "@/hooks/use-toast";
import type { MediaItem } from "@/hooks/useMediaItems";

interface QueueMediaDialogProps {
  item: MediaItem | null;
  open: boolean;
  onClose: () => void;
}

export function QueueMediaDialog({ item, open, onClose }: QueueMediaDialogProps) {
  const [destinationId, setDestinationId] = useState<string>("");
  const { data: destinations } = useDestinations();
  const createQueueItem = useCreateQueueItem();
  const { toast } = useToast();

  const activeDestinations = destinations?.filter(d => d.is_active) || [];

  const handleSubmit = async () => {
    if (!item || !destinationId) return;

    try {
      await createQueueItem.mutateAsync({
        mediaId: item.id,
        destinationId,
      });
      toast({
        title: "Added to queue",
        description: "Media has been queued for upload approval.",
      });
      onClose();
      setDestinationId("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add media to queue.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Queue for Upload</DialogTitle>
          <DialogDescription>
            Select a destination to queue this media for upload. It will require approval before being published.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="destination">Destination</Label>
            <Select value={destinationId} onValueChange={setDestinationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a destination" />
              </SelectTrigger>
              <SelectContent>
                {activeDestinations.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No active destinations
                  </SelectItem>
                ) : (
                  activeDestinations.map((dest) => (
                    <SelectItem key={dest.id} value={dest.id}>
                      {dest.name} ({dest.destination_type})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!destinationId || createQueueItem.isPending}
          >
            {createQueueItem.isPending ? "Adding..." : "Add to Queue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}