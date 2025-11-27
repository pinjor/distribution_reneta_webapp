import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";

interface DepotDelivery {
  id: number;
  delivery_number: string;
  status: string;
  delivery_date: string;
  depot_name?: string;
  customer_name?: string;
  vehicle_info?: string;
  driver_name?: string;
  items?: Array<{
    product_name: string;
    batch_number?: string;
    quantity: number;
    unit_price?: number;
  }>;
}

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  Draft: "secondary",
  Pending: "outline",
  InTransit: "outline",
  Delivered: "default",
  Cancelled: "destructive",
};

export default function DepotDeliveryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [delivery, setDelivery] = useState<DepotDelivery | null>(null);

  useEffect(() => {
    const fetchDelivery = async () => {
      try {
        setLoading(true);
        // In production, this would call: await apiEndpoints.deliveryOrders.getDepotDeliveryById(Number(id));
        // For now, using mock data
        const mockDelivery: DepotDelivery = {
          id: Number(id),
          delivery_number: `DD-2025-${String(id).padStart(3, '0')}`,
          status: "InTransit",
          delivery_date: "2025-01-15",
          depot_name: "Bangalore Hub",
          customer_name: "Central Depot",
          vehicle_info: "KA-01-AB-1234",
          driver_name: "Mohammad Rahman",
          items: [
            { product_name: "Paracetamol 500mg", batch_number: "6000001", quantity: 500, unit_price: 25 },
            { product_name: "Amoxicillin 250mg", batch_number: "7000001", quantity: 300, unit_price: 30 },
          ],
        };
        setDelivery(mockDelivery);
      } catch (error) {
        console.error("Failed to load depot transfer", error);
        toast({ title: "Unable to load delivery details", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDelivery();
    }
  }, [id, toast]);

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
      <main className="p-6">
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Delivery not found.
          </CardContent>
        </Card>
      </main>
    );
  }

  const totalAmount = delivery.items?.reduce((sum, item) => sum + (item.quantity * (item.unit_price || 0)), 0) || 0;

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/delivery/depot")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{delivery.delivery_number}</h1>
          <p className="text-muted-foreground">Depot Transfer Details</p>
        </div>
      </div>

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
              <span className="text-muted-foreground">Delivery Date:</span>
              <span>{new Date(delivery.delivery_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Depot:</span>
              <span>{delivery.depot_name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer:</span>
              <span>{delivery.customer_name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vehicle:</span>
              <span>{delivery.vehicle_info || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Driver:</span>
              <span>{delivery.driver_name || "—"}</span>
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
              <span>{delivery.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total Amount:</span>
              <span>{totalAmount.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Delivery Items</CardTitle>
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Batch Number</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {delivery.items?.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.product_name}</TableCell>
                  <TableCell>{item.batch_number || "—"}</TableCell>
                  <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{item.unit_price?.toLocaleString() || "—"}</TableCell>
                  <TableCell className="text-right">
                    {(item.quantity * (item.unit_price || 0)).toLocaleString()}
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

