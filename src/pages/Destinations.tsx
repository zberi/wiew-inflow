import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  useDestinations,
  useCreateDestination,
  useDeleteDestination,
  useToggleDestination,
  type DestinationType,
} from "@/hooks/useDestinations";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  Youtube,
  Instagram,
  Facebook,
  Webhook,
  Cloud,
  Server,
  Globe,
  Send,
} from "lucide-react";

const destinationTypes: { value: DestinationType; label: string; icon: React.ReactNode }[] = [
  { value: "youtube", label: "YouTube", icon: <Youtube className="h-4 w-4" /> },
  { value: "instagram", label: "Instagram", icon: <Instagram className="h-4 w-4" /> },
  { value: "facebook", label: "Facebook", icon: <Facebook className="h-4 w-4" /> },
  { value: "webhook", label: "Webhook", icon: <Webhook className="h-4 w-4" /> },
  { value: "s3", label: "AWS S3", icon: <Cloud className="h-4 w-4" /> },
  { value: "ftp", label: "FTP", icon: <Server className="h-4 w-4" /> },
  { value: "cms", label: "CMS", icon: <Globe className="h-4 w-4" /> },
  { value: "api", label: "Custom API", icon: <Send className="h-4 w-4" /> },
];

export default function Destinations() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    destination_type: "" as DestinationType | "",
    config: "{}",
  });

  const { data: destinations, isLoading } = useDestinations();
  const createDestination = useCreateDestination();
  const deleteDestination = useDeleteDestination();
  const toggleDestination = useToggleDestination();
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!formData.name || !formData.destination_type) {
      toast({ title: "Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    try {
      let config = {};
      try {
        config = JSON.parse(formData.config);
      } catch {
        toast({ title: "Error", description: "Invalid JSON configuration.", variant: "destructive" });
        return;
      }

      await createDestination.mutateAsync({
        name: formData.name,
        destination_type: formData.destination_type,
        config,
      });
      toast({ title: "Destination created", description: "The destination has been added." });
      setIsCreateOpen(false);
      setFormData({ name: "", destination_type: "", config: "{}" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to create destination.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDestination.mutateAsync(deleteId);
      toast({ title: "Destination deleted", description: "The destination has been removed." });
      setDeleteId(null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete destination.", variant: "destructive" });
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await toggleDestination.mutateAsync({ id, isActive });
      toast({
        title: isActive ? "Destination enabled" : "Destination disabled",
        description: `The destination has been ${isActive ? "enabled" : "disabled"}.`,
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update destination.", variant: "destructive" });
    }
  };

  const getIcon = (type: DestinationType) => {
    return destinationTypes.find(d => d.value === type)?.icon || <Send className="h-4 w-4" />;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Destinations</h1>
            <p className="text-muted-foreground">
              Configure where your media will be published.
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Destination
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : destinations?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-1">No destinations configured</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add a destination to start publishing your media.
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Destination
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {destinations?.map((dest) => (
              <Card key={dest.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                      {getIcon(dest.destination_type)}
                    </div>
                    <CardTitle className="text-base font-medium">{dest.name}</CardTitle>
                  </div>
                  <Switch
                    checked={dest.is_active || false}
                    onCheckedChange={(checked) => handleToggle(dest.id, checked)}
                  />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="capitalize">
                      {dest.destination_type}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(dest.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Destination</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="My YouTube Channel"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.destination_type}
                onValueChange={(value) => setFormData({ ...formData, destination_type: value as DestinationType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination type" />
                </SelectTrigger>
                <SelectContent>
                  {destinationTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        {type.icon}
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="config">Configuration (JSON)</Label>
              <Textarea
                id="config"
                placeholder='{"api_key": "...", "channel_id": "..."}'
                value={formData.config}
                onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createDestination.isPending}>
              {createDestination.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Destination</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this destination? This will not affect any media already uploaded.
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