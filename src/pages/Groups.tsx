import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  useGroups,
  useCreateGroup,
  useDeleteGroup,
  useToggleGroup,
} from "@/hooks/useGroups";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Trash2, Users, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Groups() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    group_id: "",
    group_name: "",
  });

  const { data: groups, isLoading } = useGroups();
  const createGroup = useCreateGroup();
  const deleteGroup = useDeleteGroup();
  const toggleGroup = useToggleGroup();
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!formData.group_id) {
      toast({ title: "Error", description: "Group ID is required.", variant: "destructive" });
      return;
    }

    try {
      await createGroup.mutateAsync({
        group_id: formData.group_id,
        group_name: formData.group_name || null,
      });
      toast({ title: "Group added", description: "The WhatsApp group has been added." });
      setIsCreateOpen(false);
      setFormData({ group_id: "", group_name: "" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to add group.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteGroup.mutateAsync(deleteId);
      toast({ title: "Group removed", description: "The group has been removed." });
      setDeleteId(null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove group.", variant: "destructive" });
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await toggleGroup.mutateAsync({ id, isActive });
      toast({
        title: isActive ? "Group enabled" : "Group disabled",
        description: `Media from this group will ${isActive ? "now" : "no longer"} be ingested.`,
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update group.", variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">WhatsApp Groups</h1>
            <p className="text-muted-foreground">
              Manage which WhatsApp groups are monitored for media.
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Group
          </Button>
        </div>

        {isLoading ? (
          <div className="border rounded-lg p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : groups?.length === 0 ? (
          <div className="border rounded-lg p-12 text-center bg-card">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No groups configured</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add a WhatsApp group to start monitoring for media.
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Group
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group Name</TableHead>
                  <TableHead>Group ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups?.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">
                      {group.group_name || "Unnamed Group"}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {group.group_id}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={group.is_active ? "default" : "secondary"}>
                        {group.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(group.created_at!), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={group.is_active || false}
                        onCheckedChange={(checked) => handleToggle(group.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(group.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add WhatsApp Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group_id">Group ID (JID)</Label>
              <Input
                id="group_id"
                placeholder="1234567890@g.us"
                value={formData.group_id}
                onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                The WhatsApp group JID, typically ending in @g.us
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="group_name">Display Name (Optional)</Label>
              <Input
                id="group_name"
                placeholder="Marketing Team"
                value={formData.group_name}
                onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createGroup.isPending}>
              {createGroup.isPending ? "Adding..." : "Add Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this group? Media already ingested will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}