import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { CheckCheck, XCircle, Loader2 } from "lucide-react";

interface BulkActionsProps {
  pendingCount: number;
  onApproveAll: () => Promise<void>;
  onRejectAll: () => Promise<void>;
  isApproving?: boolean;
  isRejecting?: boolean;
}

export function BulkActions({
  pendingCount,
  onApproveAll,
  onRejectAll,
  isApproving = false,
  isRejecting = false,
}: BulkActionsProps) {
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | null>(null);

  const handleConfirm = async () => {
    if (confirmAction === "approve") {
      await onApproveAll();
    } else if (confirmAction === "reject") {
      await onRejectAll();
    }
    setConfirmAction(null);
  };

  if (pendingCount === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
        <span className="text-sm text-muted-foreground">
          <strong className="text-foreground">{pendingCount}</strong> pending items
        </span>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmAction("reject")}
          disabled={isApproving || isRejecting}
          className="text-destructive hover:text-destructive"
        >
          {isRejecting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="mr-2 h-4 w-4" />
          )}
          Reject All
        </Button>
        <Button
          size="sm"
          onClick={() => setConfirmAction("approve")}
          disabled={isApproving || isRejecting}
        >
          {isApproving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCheck className="mr-2 h-4 w-4" />
          )}
          Approve All
        </Button>
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "approve" ? "Approve All Pending?" : "Reject All Pending?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "approve"
                ? `This will approve all ${pendingCount} pending uploads and queue them for processing.`
                : `This will reject all ${pendingCount} pending uploads. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={confirmAction === "reject" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {confirmAction === "approve" ? "Approve All" : "Reject All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
