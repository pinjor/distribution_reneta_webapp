import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle, RefreshCw, Eye, Printer, Loader2, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";

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
  total_quantity: number;
  total_value: number;
  created_at?: string;
}

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  Draft: "secondary",
  Pending: "outline",
  CustomsCleared: "outline",
  InTransit: "outline",
  Shipped: "default",
  Delivered: "default",
  Cancelled: "destructive",
};

export default function ExportDeliveryList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deliveries, setDeliveries] = useState<ExportDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      // In production, this would call a specific API endpoint for export deliveries
      // const result = await apiEndpoints.orderDeliveries.getExportDeliveries();
      // For now, using mock data
      const mockDeliveries: ExportDelivery[] = [
        {
          id: 1,
          delivery_number: "EX-2025-001",
          status: "InTransit",
          delivery_date: "2025-01-15",
          destination_country: "USA",
          port_of_loading: "Mumbai",
          port_of_discharge: "Los Angeles",
          shipping_line: "Maersk Line",
          container_number: "MSKU1234567",
          total_items: 25,
          total_quantity: 5000,
          total_value: 125000,
        },
        {
          id: 2,
          delivery_number: "EX-2025-002",
          status: "CustomsCleared",
          delivery_date: "2025-01-16",
          destination_country: "UK",
          port_of_loading: "Chennai",
          port_of_discharge: "London",
          shipping_line: "CMA CGM",
          container_number: "CMAU9876543",
          total_items: 18,
          total_quantity: 3600,
          total_value: 95000,
        },
      ];
      setDeliveries(mockDeliveries);
    } catch (error) {
      console.error("Failed to load export deliveries", error);
      toast({ title: "Unable to load export deliveries", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const filteredDeliveries = deliveries.filter((delivery) => {
    const term = searchTerm.toLowerCase();
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
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Export Delivery List</h1>
          <p className="text-muted-foreground">Manage international export deliveries and shipping documentation</p>
        </div>
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
          <Button onClick={() => navigate("/delivery/export/new")}>
            <Globe className="h-4 w-4 mr-2" />
            New Export
          </Button>
        </div>
      </header>

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
            {searchTerm ? "No deliveries found matching your search." : "No export deliveries yet."}
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
                    <TableCell className="text-right">{delivery.total_quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{delivery.total_value.toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/delivery/export/${delivery.id}`)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button variant="ghost" size="sm">
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

