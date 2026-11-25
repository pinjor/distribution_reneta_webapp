import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function DraftEditConflict({
  message,
  onReload,
  onBack,
}: {
  message: string;
  onReload: () => void;
  onBack: () => void;
}) {
  return (
    <Card data-testid="draft-conflict" className="border-destructive/40">
      <CardContent className="py-4 space-y-3">
        <p className="font-medium">{message}</p>
        <p className="text-sm text-muted-foreground">
          This document is no longer editable. Reload to see the current status, or return to the detail page.
          Your unsaved changes were not written.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onReload}>
            Reload
          </Button>
          <Button type="button" variant="secondary" onClick={onBack}>
            Back to Detail
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
