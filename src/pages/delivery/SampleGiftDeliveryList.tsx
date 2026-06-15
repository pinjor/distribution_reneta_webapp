import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle, RefreshCw, Eye, Printer, Loader2, Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";

interface SampleGiftDelivery {
  id: number;
  delivery_number: string;
  status: string;
  delivery_date: string;
  recipient_name?: string;
  recipient_type?: string;
  gift_type?: string;
  total_items: number;
  total_quantity: number;
  created_at?: string;
}

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  Draft: "secondary",
  Pending: "outline",
  Prepared: "outline",
  Dispatched: "default",
  Delivered: "default",
  Cancelled: "destructive",
};

export default function SampleGiftDeliveryList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deliveries, setDeliveries] = useState<SampleGiftDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      // In production, this would call a specific API endpoint for sample gift deliveries
      // const result = await apiEndpoints.orderDeliveries.getSampleGiftDeliveries();
      // For now, using mock data
      const mockDeliveries: SampleGiftDelivery[] = [
        { id: 1, delivery_number: "SG-2026-001", status: "Dispatched", delivery_date: "2026-04-15", recipient_name: "Dr. Mohammad Rahman", recipient_type: "Doctor", gift_type: "Product Samples", total_items: 5, total_quantity: 50 },
        { id: 2, delivery_number: "SG-2026-002", status: "Prepared", delivery_date: "2026-04-14", recipient_name: "Green Pharmacy", recipient_type: "Chemist Shop", gift_type: "Promotional Items", total_items: 3, total_quantity: 30 },
        { id: 3, delivery_number: "SG-2026-003", status: "Delivered", delivery_date: "2026-04-12", recipient_name: "Dr. Fatema Khatun", recipient_type: "Doctor", gift_type: "Vaccine Samples", total_items: 4, total_quantity: 40 },
        { id: 4, delivery_number: "SG-2026-004", status: "Pending", delivery_date: "2026-04-16", recipient_name: "City Medical Store", recipient_type: "Chemist Shop", gift_type: "Product Samples", total_items: 6, total_quantity: 60 },
        { id: 5, delivery_number: "SG-2026-005", status: "Draft", delivery_date: "2026-04-17", recipient_name: "Dr. Abdul Karim", recipient_type: "Doctor", gift_type: "Conference Kit", total_items: 2, total_quantity: 20 },
        { id: 6, delivery_number: "SG-2026-006", status: "Dispatched", delivery_date: "2026-04-11", recipient_name: "Popular Pharmacy", recipient_type: "Chemist Shop", gift_type: "Promotional Items", total_items: 5, total_quantity: 45 },
      ];
      setDeliveries(mockDeliveries);
    } catch (error) {
      console.error("Failed to load sample gift deliveries", error);
      toast({ title: "Unable to load sample gift deliveries", variant: "destructive" });
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
      delivery.recipient_name?.toLowerCase().includes(term) ||
      delivery.recipient_type?.toLowerCase().includes(term) ||
      delivery.gift_type?.toLowerCase().includes(term)
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
            <Button className="bg-white text-blue-700 hover:bg-white/90 shadow-md font-semibold" onClick={() => navigate("/delivery/sample-gift/new")}>
              <Gift className="h-4 w-4 mr-2" />
              New Sample Gift
            </Button>
          </div>
        )}
      />

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
                    <TableCell className="text-right">{delivery.total_quantity.toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/delivery/sample-gift/${delivery.id}`)}>
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

