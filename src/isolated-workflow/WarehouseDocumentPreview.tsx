import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  fetchIsolatedFulfillment,
  fetchIsolatedFulfillmentHistory,
  fetchIsolatedReservations,
  fetchSourceDocument,
  reservationForFulfillment,
} from "./warehouseApi";
import {
  mapWarehousePrint,
  parseWarehouseDocType,
  WAREHOUSE_DOC_PATH,
  WAREHOUSE_WATERMARK,
  type WarehouseDocType,
  type WarehousePrintView,
} from "./warehouseDocuments";
import { WarehousePrintDocument } from "./WarehousePrintDocument";
import type { DraftModuleKind } from "./workflowApi";
import type { WorkflowHttpError } from "./errors";

function moduleFromPath(pathname: string): DraftModuleKind | null {
  if (pathname.includes("/delivery/sample-gift/")) return "sample_gift";
  if (pathname.includes("/delivery/export/")) return "export";
  return null;
}

function listPath(module: DraftModuleKind, id: string) {
  return module === "sample_gift"
    ? `/delivery/sample-gift/${id}/warehouse`
    : `/delivery/export/${id}/warehouse`;
}

function detailPath(module: DraftModuleKind, id: string) {
  return module === "sample_gift" ? `/delivery/sample-gift/${id}` : `/delivery/export/${id}`;
}

async function loadView(
  module: DraftModuleKind,
  id: string,
  docType: WarehouseDocType,
): Promise<WarehousePrintView | null> {
  const fulfillment = await fetchIsolatedFulfillment(module, id);
  const header = fulfillment && typeof fulfillment === "object" ? (fulfillment as { fulfillment_id?: string; reservation_id?: string }) : null;
  if (!header?.fulfillment_id) return null;
  const [source, reservations, history] = await Promise.all([
    fetchSourceDocument(module, id),
    fetchIsolatedReservations(module, id),
    fetchIsolatedFulfillmentHistory(String(header.fulfillment_id)),
  ]);
  return mapWarehousePrint({
    docType,
    module,
    fulfillment,
    reservation: reservationForFulfillment(reservations, header.reservation_id),
    source,
    history,
  });
}

export default function WarehouseDocumentPreview() {
  const { id, docType: docTypePath } = useParams<{ id: string; docType?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const module = moduleFromPath(location.pathname);
  const docType = parseWarehouseDocType(docTypePath);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<WarehousePrintView | null>(null);
  const [available, setAvailable] = useState<Record<WarehouseDocType, boolean> | null>(null);

  const fetchAll = async () => {
    if (!module || !id) return;
    try {
      setLoading(true);
      setError(null);
      if (!docType) {
        const fulfillment = await fetchIsolatedFulfillment(module, id);
        const status =
          fulfillment && typeof fulfillment === "object"
            ? String((fulfillment as { status?: unknown }).status || "")
            : "";
        const flags = {
          pick_list: ["PICKING", "PICKED", "ISSUED", "DISPATCHED", "DELIVERED", "FAILED_DELIVERY"].includes(status),
          pick_confirm: ["PICKED", "ISSUED", "DISPATCHED", "DELIVERED", "FAILED_DELIVERY"].includes(status),
          issue_slip: ["ISSUED", "DISPATCHED", "DELIVERED", "FAILED_DELIVERY"].includes(status),
          dispatch_note: ["DISPATCHED", "DELIVERED", "FAILED_DELIVERY"].includes(status),
          delivery: ["DELIVERED", "FAILED_DELIVERY"].includes(status),
        };
        setAvailable(flags);
        setView(null);
        return;
      }
      setAvailable(null);
      const mapped = await loadView(module, id, docType);
      if (!mapped) {
        setView(null);
        setError("This warehouse document cannot be previewed.");
        return;
      }
      setView(mapped);
    } catch (err) {
      setView(null);
      setAvailable(null);
      const http = err as WorkflowHttpError;
      setError(http.status === 404 ? "Not found" : http.message || "Unable to load warehouse documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, id, docTypePath]);

  if (!module || !id) {
    return (
      <main className="p-6">
        <p className="text-muted-foreground">Unknown warehouse document.</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="p-6">
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading warehouse document...</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!docType) {
    return (
      <main className="p-6 space-y-6">
        <PageHeader
          title="Isolated warehouse documents"
          subtitle={WAREHOUSE_WATERMARK}
          icon={Printer}
          variant="amber"
        />
        {error ? (
          <p className="text-sm text-destructive" data-testid="warehouse-hub-error">
            {error}
          </p>
        ) : (
          <ul className="space-y-2 text-sm" data-testid="warehouse-doc-index">
            {(Object.entries(WAREHOUSE_DOC_PATH) as Array<[WarehouseDocType, string]>).map(([key, path]) => (
              <li key={key}>
                {available?.[key] ? (
                  <Link
                    className="text-primary underline"
                    data-testid={`warehouse-open-${path}`}
                    to={`${listPath(module, id)}/${path}`}
                  >
                    Open {key.replace(/_/g, " ")}
                  </Link>
                ) : (
                  <span data-testid={`warehouse-closed-${path}`}>Not available yet: {key.replace(/_/g, " ")}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <Button variant="outline" onClick={() => navigate(detailPath(module, id))}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Detail
        </Button>
      </main>
    );
  }

  if (!view) {
    return (
      <main className="p-6 space-y-4">
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground" data-testid="warehouse-preview-error">
            {error || "Warehouse document not found."}
          </CardContent>
        </Card>
        <Button variant="outline" onClick={fetchAll}>
          Retry
        </Button>
        <Button variant="outline" onClick={() => navigate(listPath(module, id))}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <div className="draft-print-actions print:hidden">
        <PageHeader
          title={view.title}
          subtitle={WAREHOUSE_WATERMARK}
          icon={Printer}
          variant="amber"
          actions={(
            <div className="flex flex-wrap gap-2">
              {!view.unavailable && (
                <Button data-testid="warehouse-print" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              )}
              <Button variant="secondary" onClick={() => navigate(listPath(module, id))}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                All warehouse documents
              </Button>
            </div>
          )}
        />
      </div>
      <WarehousePrintDocument view={view} />
    </main>
  );
}
