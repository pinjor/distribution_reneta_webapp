import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

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
  items?: Array<{
    product_name: string;
    quantity: number;
    unit_value?: number;
  }>;
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

export default function ExportDeliveryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [delivery, setDelivery] = useState<ExportDelivery | null>(null);

  useEffect(() => {
    const fetchDelivery = async () => {
      try {
        setLoading(true);
        // Mock data
        const mockDelivery: ExportDelivery = {
          id: Number(id),
          delivery_number: `EX-2025-${String(id).padStart(3, '0')}`,
          status: "InTransit",
          delivery_date: "2025-01-15",
          destination_country: "USA",
          port_of_loading: "Mumbai",
          port_of_discharge: "Los Angeles",
          shipping_line: "Maersk Line",
          container_number: "MSKU1234567",
          items: [
            { product_name: "Paracetamol 500mg", quantity: 2000, unit_value: 25 },
            { product_name: "Amoxicillin 250mg", quantity: 1500, unit_value: 30 },
          ],
        };
        setDelivery(mockDelivery);
      } catch (error) {
        console.error("Failed to load export delivery", error);
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

  const totalValue = delivery.items?.reduce((sum, item) => sum + (item.quantity * (item.unit_value || 0)), 0) || 0;

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/delivery/export")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{delivery.delivery_number}</h1>
          <p className="text-muted-foreground">Export Delivery Details</p>
        </div>
      </div>

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
              <span>Total Value:</span>
              <span>{totalValue.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Export Items</CardTitle>
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
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Value</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {delivery.items?.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.product_name}</TableCell>
                  <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{item.unit_value?.toLocaleString() || "—"}</TableCell>
                  <TableCell className="text-right">
                    {(item.quantity * (item.unit_value || 0)).toLocaleString()}
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

