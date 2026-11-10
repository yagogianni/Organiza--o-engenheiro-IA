import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ConfirmDeleteDialog({ open, onOpenChange, onConfirm }: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir este registro?</DialogTitle>
          <DialogDescription>Essa ação não pode ser desfeita.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
