import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface SampleGiftDelivery {
  id: number;
  delivery_number: string;
  status: string;
  delivery_date: string;
  recipient_name?: string;
  recipient_type?: string;
  gift_type?: string;
  items?: Array<{
    product_name: string;
    quantity: number;
  }>;
}

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  Draft: "secondary",
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
  const [loading, setLoading] = useState(true);
  const [delivery, setDelivery] = useState<SampleGiftDelivery | null>(null);

  useEffect(() => {
    const fetchDelivery = async () => {
      try {
        setLoading(true);
        // Mock data
        const mockDelivery: SampleGiftDelivery = {
          id: Number(id),
          delivery_number: `SG-2025-${String(id).padStart(3, '0')}`,
          status: "Dispatched",
          delivery_date: "2025-01-15",
          recipient_name: "Dr. Mohammad Rahman",
          recipient_type: "Doctor",
          gift_type: "Product Samples",
          items: [
            { product_name: "Paracetamol 500mg Sample", quantity: 10 },
            { product_name: "Amoxicillin 250mg Sample", quantity: 5 },
          ],
        };
        setDelivery(mockDelivery);
      } catch (error) {
        console.error("Failed to load sample gift delivery", error);
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

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/delivery/sample-gift")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{delivery.delivery_number}</h1>
          <p className="text-muted-foreground">Sample Gift Delivery Details</p>
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
                <TableHead className="text-right">Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {delivery.items?.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.product_name}</TableCell>
                  <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}

