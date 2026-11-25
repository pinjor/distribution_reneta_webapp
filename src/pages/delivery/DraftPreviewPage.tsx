import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatApiError } from "@/lib/draftDocumentUi";
import { DraftPrintDocument } from "@/pages/delivery/DraftPrintDocument";
import type { DraftPrintView } from "@/lib/draftPrint";

export function DraftPreviewPage({
  title,
  detailPath,
  load,
}: {
  title: string;
  detailPath: string;
  load: () => Promise<DraftPrintView | null>;
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<DraftPrintView | null>(null);

  const fetchView = async () => {
    try {
      setLoading(true);
      setError(null);
      const mapped = await load();
      if (!mapped) {
        setView(null);
        setError("This document cannot be previewed.");
        return;
      }
      setView(mapped);
    } catch (err: any) {
      setView(null);
      setError(formatApiError(err, "Unable to load delivery details"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailPath]);

  const handlePrint = () => {
    if (!view) return;
    window.print();
  };

  if (loading) {
    return (
      <main className="p-6">
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading draft preview...</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!view) {
    return (
      <main className="p-6 space-y-4">
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            {error || "Delivery not found."}
          </CardContent>
        </Card>
        {error && (
          <Button variant="outline" onClick={fetchView}>
            Retry
          </Button>
        )}
        <Button variant="outline" onClick={() => navigate(detailPath)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Detail
        </Button>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <div className="draft-print-actions print:hidden">
        <PageHeader
          title={title}
          subtitle="Internal Draft preview. Not for dispatch."
          icon={Printer}
          variant="teal"
          actions={(
            <div className="flex flex-wrap gap-2">
              <Button data-testid="draft-print" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print Draft
              </Button>
              <Button variant="secondary" onClick={() => navigate(detailPath)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Detail
              </Button>
            </div>
          )}
        />
      </div>
      <DraftPrintDocument view={view} />
    </main>
  );
}
