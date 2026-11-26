import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer, Loader2, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { apiEndpoints } from "@/lib/api";
import { canShowDraftEdit } from "@/lib/draftDocumentUi";
import { useDraftCapabilities } from "@/hooks/useDraftCapabilities";
import { DraftWorkflowSlot } from "@/components/delivery/DraftWorkflowSlot";

interface ExportDelivery {
  id: number;
  delivery_number: string;
  status: string;
  delivery_date: string;
  destination_country?: string;
  port_of_loading?: string;
  port_of_discharge?: string;
  shipping_line?: string;
  container_number?: string;
  bl_number?: string;
  invoice_number?: string;
  lc_number?: string;
  incoterms?: string;
  payment_terms?: string;
  remarks?: string;
  total_items?: number;
  total_quantity?: number | string;
  total_value?: number | string;
  items?: Array<{
    product_name?: string;
    product_id: number;
    quantity: number | string;
    unit_price?: number | string;
    line_total?: number | string;
    batch_number?: string;
    expiry_date?: string;
    hsn_code?: string;
  }>;
}

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  Draft: "secondary",
  Submitted: "outline",
  Approved: "default",
  Rejected: "destructive",
  Pending: "outline",
  CustomsCleared: "outline",
  InTransit: "outline",
  Shipped: "default",
  Delivered: "default",
  Cancelled: "destructive",
};

export default function ExportDeliveryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const capabilities = useDraftCapabilities();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<ExportDelivery | null>(null);

  const fetchDelivery = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const row = await apiEndpoints.exportDeliveries.getById(id);
      setDelivery(row);
    } catch (err: any) {
      console.error("Failed to load export delivery", err);
      setDelivery(null);
      const message = err?.message || "Unable to load delivery details";
      setError(message);
      toast({ title: "Unable to load delivery details", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDelivery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <main className="p-6">
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading delivery details...</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!delivery) {
    return (
      <main className="p-6 space-y-4">
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            {error || "Delivery not found."}
          </CardContent>
        </Card>
        {error && (
          <Button variant="outline" onClick={fetchDelivery}>Retry</Button>
        )}
        <Button variant="outline" onClick={() => navigate("/delivery/export")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </main>
    );
  }

  const totalValue = delivery.total_value != null ? Number(delivery.total_value) : 0;

  return (
    <main className="p-6 space-y-6">
      <PageHeader
        title={delivery.delivery_number}
        subtitle="Export Delivery Details"
        icon={Printer}
        variant="teal"
        actions={(
          <div className="flex gap-2">
            {canShowDraftEdit(capabilities.export.can_edit, delivery.status) && (
              <Button
                size="sm"
                data-testid="export-edit"
                onClick={() => navigate(`/delivery/export/${delivery.id}/edit`)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              data-testid="export-preview"
              onClick={() => navigate(`/delivery/export/${delivery.id}/preview`)}
            >
              <Printer className="h-4 w-4 mr-2" />
              Preview Draft
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/delivery/export")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <DraftWorkflowSlot />
          </div>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Shipping Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={statusVariant[delivery.status] || "secondary"}>
                {delivery.status === "CustomsCleared" ? "Customs Cleared" : delivery.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Date:</span>
              <span>{new Date(delivery.delivery_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Destination:</span>
              <span>{delivery.destination_country || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Port of Loading:</span>
              <span>{delivery.port_of_loading || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Port of Discharge:</span>
              <span>{delivery.port_of_discharge || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping Line:</span>
              <span>{delivery.shipping_line || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Container:</span>
              <span className="font-mono text-xs">{delivery.container_number || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">B/L Number:</span>
              <span>{delivery.bl_number || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice reference:</span>
              <span>{delivery.invoice_number || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">L/C Number:</span>
              <span>{delivery.lc_number || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Incoterms:</span>
              <span>{delivery.incoterms || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Terms:</span>
              <span>{delivery.payment_terms || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Remarks:</span>
              <span>{delivery.remarks || "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Items:</span>
              <span>{delivery.total_items ?? delivery.items?.length ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Quantity:</span>
              <span>{Number(delivery.total_quantity ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total Value:</span>
              <span>{totalValue.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Export Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>HSN</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {delivery.items?.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.product_name || item.product_id}</TableCell>
                  <TableCell>{item.batch_number || "—"}</TableCell>
                  <TableCell>{item.expiry_date || "—"}</TableCell>
                  <TableCell>{item.hsn_code || "—"}</TableCell>
                  <TableCell className="text-right">{Number(item.quantity).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{Number(item.unit_price ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {Number(item.line_total ?? 0).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
