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

interface SampleGiftDelivery {
  id: number;
  delivery_number: string;
  status: string;
  delivery_date: string;
  recipient_name?: string;
  recipient_type?: string;
  recipient_address?: string;
  recipient_phone?: string;
  recipient_email?: string;
  gift_type?: string;
  document_kind?: string;
  occasion?: string;
  remarks?: string;
  items?: Array<{
    product_name?: string;
    product_id: number;
    quantity: number;
    gift_type?: string;
  }>;
}

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  Draft: "secondary",
  Submitted: "outline",
  Approved: "default",
  Rejected: "destructive",
  Pending: "outline",
  Prepared: "outline",
  Dispatched: "default",
  Delivered: "default",
  Cancelled: "destructive",
};

export default function SampleGiftDeliveryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const capabilities = useDraftCapabilities();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<SampleGiftDelivery | null>(null);

  const fetchDelivery = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const row = await apiEndpoints.sampleGiftDeliveries.getById(id);
      setDelivery(row);
    } catch (err: any) {
      console.error("Failed to load sample gift delivery", err);
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
        <Button variant="outline" onClick={() => navigate("/delivery/sample-gift")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <PageHeader
        title={delivery.delivery_number}
        subtitle="Sample Gift Delivery Details"
        icon={Printer}
        variant="teal"
        actions={(
          <div className="flex gap-2">
            {canShowDraftEdit(capabilities.sample_gift.can_edit, delivery.status) && (
              <Button
                size="sm"
                data-testid="sample-gift-edit"
                onClick={() => navigate(`/delivery/sample-gift/${delivery.id}/edit`)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              data-testid="sample-gift-preview"
              onClick={() => navigate(`/delivery/sample-gift/${delivery.id}/preview`)}
            >
              <Printer className="h-4 w-4 mr-2" />
              Preview Draft
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/delivery/sample-gift")}
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
            <CardTitle>Delivery Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={statusVariant[delivery.status] || "secondary"}>{delivery.status}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Document Kind:</span>
              <span className="capitalize">{delivery.document_kind || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Date:</span>
              <span>{new Date(delivery.delivery_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recipient:</span>
              <span>{delivery.recipient_name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recipient Type:</span>
              <span>{delivery.recipient_type || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gift Type:</span>
              <span>{delivery.gift_type || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Occasion:</span>
              <span>{delivery.occasion || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone:</span>
              <span>{delivery.recipient_phone || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span>{delivery.recipient_email || "—"}</span>
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
              <span>{delivery.items?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Quantity:</span>
              <span>{delivery.items?.reduce((sum, item) => sum + Number(item.quantity), 0) || 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Remarks:</span>
              <p className="mt-1 text-sm">{delivery.remarks || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Address:</span>
              <p className="mt-1 text-sm">{delivery.recipient_address || "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Delivery Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Gift Type</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {delivery.items?.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.product_name || `Product ${item.product_id}`}</TableCell>
                  <TableCell>{item.gift_type || "—"}</TableCell>
                  <TableCell className="text-right">{Number(item.quantity).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
