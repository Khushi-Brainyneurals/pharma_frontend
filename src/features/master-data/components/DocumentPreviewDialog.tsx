import { Dialog } from "../../../shared/ui/Dialog";
import type { DocumentPreviewController } from "../hooks/useDocumentPreview";
import { DocumentViewer } from "./DocumentViewer";

interface DocumentPreviewDialogProps {
  controller: DocumentPreviewController;
}

export function DocumentPreviewDialog({ controller }: DocumentPreviewDialogProps) {
  const { target, document, isLoading, error, close } = controller;

  if (!target) {
    return null;
  }

  return (
    <Dialog title={target.title} size="xl" onClose={close}>
      <DocumentViewer
        document={document}
        documentKey={target.key}
        isLoading={isLoading}
        error={error}
      />
    </Dialog>
  );
}
