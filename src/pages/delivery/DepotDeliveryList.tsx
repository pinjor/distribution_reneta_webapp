import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle, RefreshCw, Eye, Printer, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";

interface DepotDelivery {
  id: number;
  delivery_number: string;
  status: string;
  delivery_date: string;
  depot_name?: string;
  customer_name?: string;
  total_items: number;
  total_quantity: number;
  vehicle_info?: string;
  created_at?: string;
}

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  Draft: "secondary",
  Pending: "outline",
  InTransit: "outline",
  Delivered: "default",
  Cancelled: "destructive",
};

export default function DepotDeliveryList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deliveries, setDeliveries] = useState<DepotDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      // In production, this would call a specific API endpoint for depot deliveries
      // const result = await apiEndpoints.deliveryOrders.getDepotDeliveries();
      // For now, using mock data
      const mockDeliveries: DepotDelivery[] = [
        {
          id: 1,
          delivery_number: "DD-2025-001",
          status: "InTransit",
          delivery_date: "2025-01-15",
          depot_name: "Bangalore Hub",
          customer_name: "Central Depot",
          total_items: 15,
          total_quantity: 2500,
          vehicle_info: "KA-01-AB-1234",
        },
        {
          id: 2,
          delivery_number: "DD-2025-002",
          status: "Pending",
          delivery_date: "2025-01-16",
          depot_name: "Mumbai Central",
          customer_name: "North Depot",
          total_items: 12,
          total_quantity: 1800,
        },
      ];
      setDeliveries(mockDeliveries);
    } catch (error) {
      console.error("Failed to load depot deliveries", error);
      toast({ title: "Unable to load depot deliveries", variant: "destructive" });
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
      delivery.depot_name?.toLowerCase().includes(term) ||
      delivery.customer_name?.toLowerCase().includes(term) ||
      delivery.vehicle_info?.toLowerCase().includes(term)
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
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Depot Transfer List</h1>
          <p className="text-muted-foreground">Manage transfers to depots and distribution centers</p>
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
          <Button onClick={() => navigate("/delivery/depot/new")}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Delivery
          </Button>
        </div>
      </header>

      {loading ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading depot deliveries...</p>
          </CardContent>
        </Card>
      ) : filteredDeliveries.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            {searchTerm ? "No deliveries found matching your search." : "No depot deliveries yet."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Depot Deliveries ({filteredDeliveries.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delivery Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Depot</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell className="font-medium">{delivery.delivery_number}</TableCell>
                    <TableCell>{new Date(delivery.delivery_date).toLocaleDateString()}</TableCell>
                    <TableCell>{delivery.depot_name || "—"}</TableCell>
                    <TableCell>{delivery.customer_name || "—"}</TableCell>
                    <TableCell>{delivery.total_items}</TableCell>
                    <TableCell className="text-right">{delivery.total_quantity.toLocaleString()}</TableCell>
                    <TableCell>{delivery.vehicle_info || "—"}</TableCell>
                    <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/delivery/depot/${delivery.id}`)}>
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

