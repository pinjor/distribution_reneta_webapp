import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer, Loader2, CheckCircle2, PackageCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface DepotTransferItem {
  id: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  batch_number?: string;
  expiry_date?: string;
  quantity: number;
  unit_price: number;
}

interface DepotTransfer {
  id: number;
  transfer_number: string;
  status: string;
  transfer_date: string;
  from_depot_id: number;
  from_depot_name?: string;
  to_depot_id: number;
  to_depot_name?: string;
  vehicle_id?: number;
  vehicle_registration?: string;
  driver_name?: string;
  transfer_note?: string;
  remarks?: string;
  approved_by?: number;
  approved_at?: string;
  received_by?: number;
  received_at?: string;
  total_items: number;
  total_quantity: number;
  total_value: number;
  items: DepotTransferItem[];
}

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  Draft: "secondary",
  Pending: "outline",
  Approved: "default",
  "In Transit": "outline",
  Received: "default",
  Cancelled: "destructive",
};

const statusColors: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-800 border-gray-300",
  Pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Approved: "bg-blue-100 text-blue-800 border-blue-300",
  "In Transit": "bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 text-white border-orange-500 shadow-lg font-semibold animate-pulse",
  Received: "bg-green-100 text-green-800 border-green-300",
  Cancelled: "bg-red-100 text-red-800 border-red-300",
};

export default function DepotDeliveryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [approving, setApproving] = useState(false);
  const [receiving, setReceiving] = useState(false);

  const { data: transfer, isLoading: loading, refetch } = useQuery({
    queryKey: ['depot-transfer', id],
    queryFn: async () => {
      if (!id) return null;
      return await apiEndpoints.depotTransfers.getById(Number(id));
    },
    enabled: !!id,
  });

  const handleApprove = async () => {
    if (!transfer) {
      toast({ title: "Transfer not found", variant: "destructive" });
      return;
    }

    if (!user || !user.id) {
      toast({ 
        title: "Authentication required", 
        description: "Please log in to approve transfers",
        variant: "destructive" 
      });
      return;
    }

    if (transfer.status !== "Draft" && transfer.status !== "Pending") {
      toast({ title: "Only Draft or Pending transfers can be approved", variant: "destructive" });
      return;
    }

    try {
      setApproving(true);
      await apiEndpoints.depotTransfers.approve(transfer.id, user.id);
      toast({ title: "Transfer approved successfully", description: "Stock has been reduced from source depot" });
      refetch();
    } catch (error: any) {
      console.error("Failed to approve transfer", error);
      const errorMessage = error?.message || error?.details || "Unknown error occurred";
      toast({ 
        title: "Unable to approve transfer", 
        description: errorMessage,
        variant: "destructive" 
      });
    } finally {
      setApproving(false);
    }
  };

  const handleReceive = async () => {
    if (!transfer) {
      toast({ title: "Transfer not found", variant: "destructive" });
      return;
    }

    if (!user || !user.id) {
      toast({ 
        title: "Authentication required", 
        description: "Please log in to receive transfers",
        variant: "destructive" 
      });
      return;
    }

    if (transfer.status !== "In Transit") {
      toast({ title: "Only In Transit transfers can be received", variant: "destructive" });
      return;
    }

    try {
      setReceiving(true);
      await apiEndpoints.depotTransfers.receive(transfer.id, user.id);
      toast({ title: "Transfer received successfully", description: "Stock has been increased in destination depot" });
      refetch();
    } catch (error: any) {
      console.error("Failed to receive transfer", error);
      const errorMessage = error?.message || error?.details || "Unknown error occurred";
      toast({ 
        title: "Unable to receive transfer", 
        description: errorMessage,
        variant: "destructive" 
      });
    } finally {
      setReceiving(false);
    }
  };

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

  if (!transfer && !loading) {
    return (
      <main className="p-6">
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Transfer not found.
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!transfer) {
    return null;
  }

  const canApprove = transfer.status === "Pending";
  const canReceive = transfer.status === "In Transit";

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/delivery/depot")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{transfer.transfer_number}</h1>
          <p className="text-muted-foreground">Depot Transfer Details</p>
        </div>
        <div className="flex gap-2">
          {canApprove && (
            <Button onClick={handleApprove} disabled={approving || !user || !user.id}>
              {approving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve Transfer
                </>
              )}
            </Button>
          )}
          {canReceive && (
            <Button onClick={handleReceive} disabled={receiving || !user || !user.id} variant="default">
              {receiving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Receiving...
                </>
              ) : (
                <>
                  <PackageCheck className="h-4 w-4 mr-2" />
                  Receive Transfer
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Transfer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge 
                variant={statusVariant[transfer.status] || "secondary"}
                className={statusColors[transfer.status] || ""}
              >
                {transfer.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transfer Date:</span>
              <span>{new Date(transfer.transfer_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">From Depot:</span>
              <span>{transfer.from_depot_name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">To Depot:</span>
              <span>{transfer.to_depot_name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vehicle:</span>
              <span>{transfer.vehicle_registration || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Driver:</span>
              <span>{transfer.driver_name || "—"}</span>
            </div>
            {transfer.approved_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Approved At:</span>
                <span>{new Date(transfer.approved_at).toLocaleString()}</span>
              </div>
            )}
            {transfer.received_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Received At:</span>
                <span>{new Date(transfer.received_at).toLocaleString()}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Items:</span>
              <span>{transfer.total_items}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Quantity:</span>
              <span>{Number(transfer.total_quantity).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total Value:</span>
              <span>৳{Number(transfer.total_value).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {transfer.transfer_note && (
        <Card>
          <CardHeader>
            <CardTitle>Transfer Note</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{transfer.transfer_note}</p>
          </CardContent>
        </Card>
      )}

      {transfer.remarks && (
        <Card>
          <CardHeader>
            <CardTitle>Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{transfer.remarks}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transfer Items</CardTitle>
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Code</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Batch Number</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfer.items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.product_code || "—"}</TableCell>
                  <TableCell className="font-medium">{item.product_name || "—"}</TableCell>
                  <TableCell>{item.batch_number || "—"}</TableCell>
                  <TableCell>{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className="text-right">{Number(item.quantity).toLocaleString()}</TableCell>
                  <TableCell className="text-right">৳{Number(item.unit_price).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    ৳{(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}
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

