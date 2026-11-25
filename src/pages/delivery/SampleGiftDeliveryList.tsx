import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Eye, Printer, Loader2, Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDraftCapabilities } from "@/hooks/useDraftCapabilities";
import { DraftWritesNotice } from "@/pages/delivery/DraftWritesNotice";

interface SampleGiftDelivery {
  id: number;
  delivery_number: string;
  status: string;
  delivery_date: string;
  recipient_name?: string;
  recipient_type?: string;
  gift_type?: string;
  document_kind?: string;
  total_items: number;
  total_quantity: number;
  created_at?: string;
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

export default function SampleGiftDeliveryList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const capabilities = useDraftCapabilities();
  const canCreate = !capabilities.loading && capabilities.sample_gift.can_create;
  const [deliveries, setDeliveries] = useState<SampleGiftDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiEndpoints.sampleGiftDeliveries.getAll(
        searchTerm.trim() ? { q: searchTerm.trim() } : undefined
      );
      const rows = Array.isArray(result) ? result : result?.data || [];
      setDeliveries(rows);
    } catch (err: any) {
      console.error("Failed to load sample gift deliveries", err);
      setDeliveries([]);
      const message = err?.message || "Unable to load sample gift deliveries";
      setError(message);
      toast({ title: "Unable to load sample gift deliveries", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredDeliveries = deliveries.filter((delivery) => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return (
      delivery.delivery_number.toLowerCase().includes(term) ||
      delivery.recipient_name?.toLowerCase().includes(term) ||
      delivery.recipient_type?.toLowerCase().includes(term) ||
      delivery.gift_type?.toLowerCase().includes(term) ||
      delivery.document_kind?.toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={statusVariant[status] || "secondary"}>
        {status}
      </Badge>
    );
  };

  return (
    <main className="p-6 space-y-6">
      <PageHeader
        title="Sample Gift Delivery List"
        subtitle="Manage sample and gift deliveries to doctors, pharmacies, and partners"
        icon={Gift}
        variant="teal"
        actions={(
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search deliveries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
            <Button variant="outline" onClick={fetchDeliveries} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {canCreate ? (
              <Button onClick={() => navigate("/delivery/sample-gift/new")}>
                <Gift className="h-4 w-4 mr-2" />
                New Sample Gift
              </Button>
            ) : null}
          </div>
        )}
      />
      {!capabilities.loading && !capabilities.sample_gift.can_create && (
        <DraftWritesNotice>
          Draft creation is currently unavailable.
        </DraftWritesNotice>
      )}

      {error && (
        <div className="flex items-center justify-between gap-4 text-sm text-destructive">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={fetchDeliveries}>Retry</Button>
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading sample gift deliveries...</p>
          </CardContent>
        </Card>
      ) : filteredDeliveries.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            {searchTerm ? "No deliveries found matching your search." : "No sample gift deliveries yet."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Sample Gift Deliveries ({filteredDeliveries.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delivery Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Recipient Type</TableHead>
                  <TableHead>Gift Type</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell className="font-medium">{delivery.delivery_number}</TableCell>
                    <TableCell>{new Date(delivery.delivery_date).toLocaleDateString()}</TableCell>
                    <TableCell>{delivery.recipient_name || "—"}</TableCell>
                    <TableCell>{delivery.recipient_type || "—"}</TableCell>
                    <TableCell>{delivery.gift_type || "—"}</TableCell>
                    <TableCell>{delivery.total_items}</TableCell>
                    <TableCell className="text-right">{Number(delivery.total_quantity).toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/delivery/sample-gift/${delivery.id}`)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button variant="ghost" size="sm" disabled title="Print is not available until a document print endpoint exists">
                          <Printer className="h-4 w-4 mr-1" />
                          Print
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
