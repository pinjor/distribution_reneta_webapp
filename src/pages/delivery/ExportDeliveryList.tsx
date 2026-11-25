import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Eye, Printer, Loader2, Globe } from "lucide-react";
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
  total_items: number;
  total_quantity: number | string;
  total_value: number | string;
  created_at?: string;
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

function isUnavailable(err: any) {
  return err?.status === 503;
}

export default function ExportDeliveryList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const capabilities = useDraftCapabilities();
  const [deliveries, setDeliveries] = useState<ExportDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const canCreate = !capabilities.loading && capabilities.export.can_create && !unavailable;

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      setError(null);
      setUnavailable(false);
      const result = await apiEndpoints.exportDeliveries.getAll(
        searchTerm.trim() ? { q: searchTerm.trim() } : undefined
      );
      const rows = Array.isArray(result) ? result : result?.data || [];
      setDeliveries(rows);
    } catch (err: any) {
      console.error("Failed to load export deliveries", err);
      setDeliveries([]);
      const message = err?.message || "Unable to load export deliveries";
      setError(message);
      setUnavailable(isUnavailable(err));
      toast({ title: "Unable to load export deliveries", description: message, variant: "destructive" });
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
      delivery.destination_country?.toLowerCase().includes(term) ||
      delivery.port_of_loading?.toLowerCase().includes(term) ||
      delivery.port_of_discharge?.toLowerCase().includes(term) ||
      delivery.shipping_line?.toLowerCase().includes(term) ||
      delivery.container_number?.toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status: string) => {
    const statusLabels: Record<string, string> = {
      CustomsCleared: "Customs Cleared",
    };
    return (
      <Badge variant={statusVariant[status] || "secondary"}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  return (
    <main className="p-6 space-y-6">
      <PageHeader
        title="Export Delivery List"
        subtitle="Manage international export deliveries and shipping documentation"
        icon={Globe}
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
          <Button onClick={() => navigate("/delivery/export/new")}>
            <Globe className="h-4 w-4 mr-2" />
            New Export
          </Button>
          ) : null}
        </div>
        )}
      />
      {!capabilities.loading && !capabilities.export.can_create && (
        <DraftWritesNotice>
          Draft creation is currently unavailable.
        </DraftWritesNotice>
      )}

      {error && (
        <div className="flex items-center justify-between gap-4 text-sm text-destructive">
          <span>{unavailable ? `Migration required. ${error}` : error}</span>
          <Button variant="outline" size="sm" onClick={fetchDeliveries}>Retry</Button>
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading export deliveries...</p>
          </CardContent>
        </Card>
      ) : filteredDeliveries.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            {unavailable
              ? "Export draft storage is not available until the approved Alembic revision is applied."
              : searchTerm
                ? "No deliveries found matching your search."
                : "No export deliveries yet."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Export Deliveries ({filteredDeliveries.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delivery Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Port of Loading</TableHead>
                  <TableHead>Port of Discharge</TableHead>
                  <TableHead>Shipping Line</TableHead>
                  <TableHead>Container</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell className="font-medium">{delivery.delivery_number}</TableCell>
                    <TableCell>{new Date(delivery.delivery_date).toLocaleDateString()}</TableCell>
                    <TableCell>{delivery.destination_country || "—"}</TableCell>
                    <TableCell>{delivery.port_of_loading || "—"}</TableCell>
                    <TableCell>{delivery.port_of_discharge || "—"}</TableCell>
                    <TableCell>{delivery.shipping_line || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{delivery.container_number || "—"}</TableCell>
                    <TableCell>{delivery.total_items}</TableCell>
                    <TableCell className="text-right">{Number(delivery.total_quantity).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{Number(delivery.total_value).toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/delivery/export/${delivery.id}`)}>
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
