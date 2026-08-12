import { Loader2 } from "lucide-react";
import { Dialog } from "../../../shared/ui/Dialog";
import { MasterDataBanner } from "./MasterDataBanner";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  busy = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog title={title} busy={busy} size="md" onClose={onCancel}>
      <p className="text-sm leading-6">{message}</p>
      {error ? <MasterDataBanner tone="error" message={error} className="mt-4" /> : null}
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" className="preview-button-secondary" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="preview-button-danger" disabled={busy} onClick={onConfirm}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
