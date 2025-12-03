import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle, RefreshCw, Eye, Printer, Loader2, CheckCircle2, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface DepotTransfer {
  id: number;
  transfer_number: string;
  status: string;
  transfer_date: string;
  from_depot_name?: string;
  to_depot_name?: string;
  total_items: number;
  total_quantity: number;
  total_value: number;
  vehicle_registration?: string;
  created_at?: string;
}

// Helper function to normalize status string
const normalizeStatus = (status: string): string => {
  if (!status) return "";
  // Handle enum format like "DepotTransferStatusEnum.DRAFT" or just "Draft"
  const statusStr = String(status);
  if (statusStr.includes("DRAFT") || statusStr.includes("Draft")) return "Draft";
  if (statusStr.includes("PENDING") || statusStr.includes("Pending")) return "Pending";
  if (statusStr.includes("APPROVED") || statusStr.includes("Approved")) return "Approved";
  if (statusStr.includes("IN_TRANSIT") || statusStr.includes("In Transit")) return "In Transit";
  if (statusStr.includes("RECEIVED") || statusStr.includes("Received")) return "Received";
  if (statusStr.includes("CANCELLED") || statusStr.includes("Cancelled")) return "Cancelled";
  return statusStr;
};

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

export default function DepotDeliveryList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [receivingId, setReceivingId] = useState<number | null>(null);

  const { data: transfersData, isLoading: loading, refetch } = useQuery({
    queryKey: ['depot-transfers', statusFilter],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (statusFilter && statusFilter !== "all") {
        params.status_filter = statusFilter;
      }
      const result = await apiEndpoints.depotTransfers.getAll(params);
      // Handle both array and object responses
      return Array.isArray(result) ? result : (result?.data || result || []);
    },
  });

  const transfers = Array.isArray(transfersData) ? transfersData : [];

  const filteredTransfers = transfers.map((transfer: DepotTransfer) => ({
    ...transfer,
    status: normalizeStatus(transfer.status)
  })).filter((transfer: DepotTransfer) => {
    const term = searchTerm.toLowerCase();
    return (
      transfer.transfer_number.toLowerCase().includes(term) ||
      transfer.from_depot_name?.toLowerCase().includes(term) ||
      transfer.to_depot_name?.toLowerCase().includes(term) ||
      transfer.vehicle_registration?.toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status: string) => {
    const customColor = statusColors[status];
    if (customColor) {
      return (
        <Badge 
          variant={statusVariant[status] || "secondary"}
          className={customColor}
        >
          {status}
        </Badge>
      );
    }
    return (
      <Badge variant={statusVariant[status] || "secondary"}>
        {status}
      </Badge>
    );
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleApprove = async (transferId: number) => {
    if (!user || !user.id) {
      toast({ 
        title: "Authentication required", 
        description: "Please log in to approve transfers",
        variant: "destructive" 
      });
      return;
    }

    try {
      setApprovingId(transferId);
      await apiEndpoints.depotTransfers.approve(transferId, user.id);
      toast({ title: "Transfer approved successfully", description: "Stock has been reduced from source depot" });
      queryClient.invalidateQueries({ queryKey: ['depot-transfers'] });
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
      setApprovingId(null);
    }
  };

  const handleReceive = async (transferId: number) => {
    // Use a default user ID if user is not available (for testing)
    const userId = user?.id || 1;
    
    if (!userId) {
      toast({ 
        title: "Authentication required", 
        description: "Please log in to receive transfers",
        variant: "destructive" 
      });
      return;
    }

    try {
      setReceivingId(transferId);
      await apiEndpoints.depotTransfers.receive(transferId, userId);
      toast({ title: "Transfer received successfully", description: "Stock has been increased in destination depot" });
      queryClient.invalidateQueries({ queryKey: ['depot-transfers'] });
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
      setReceivingId(null);
    }
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
            placeholder="Search transfers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <div className="w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="In Transit">In Transit</SelectItem>
                <SelectItem value="Received">Received</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => navigate("/delivery/depot/new")}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Transfer Request
          </Button>
        </div>
      </header>

      {loading ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading depot transfers...</p>
          </CardContent>
        </Card>
      ) : filteredTransfers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            {searchTerm ? "No transfers found matching your search." : "No depot transfer requests yet."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Depot Transfer Requests ({filteredTransfers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>From Depot</TableHead>
                  <TableHead>To Depot</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransfers.map((transfer: DepotTransfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-medium">{transfer.transfer_number}</TableCell>
                    <TableCell>{new Date(transfer.transfer_date).toLocaleDateString()}</TableCell>
                    <TableCell>{transfer.from_depot_name || "—"}</TableCell>
                    <TableCell>{transfer.to_depot_name || "—"}</TableCell>
                    <TableCell>{transfer.total_items}</TableCell>
                    <TableCell className="text-right">{Number(transfer.total_quantity).toLocaleString()}</TableCell>
                    <TableCell className="text-right">৳{Number(transfer.total_value).toFixed(2)}</TableCell>
                    <TableCell>{transfer.vehicle_registration || "—"}</TableCell>
                    <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={() => handleApprove(transfer.id)}
                          disabled={
                            approvingId === transfer.id || 
                            transfer.status !== "Pending"
                          }
                          className={
                            transfer.status === "Pending"
                              ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                              : "bg-gray-400 hover:bg-gray-500 opacity-50 cursor-not-allowed"
                          }
                          title={
                            transfer.status === "Pending"
                              ? "Approve this transfer"
                              : "Only Pending transfers can be approved"
                          }
                        >
                          {approvingId === transfer.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                          )}
                          Approve
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={() => handleReceive(transfer.id)}
                          disabled={
                            receivingId === transfer.id || 
                            transfer.status !== "In Transit"
                          }
                          className={
                            transfer.status === "In Transit"
                              ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                              : "bg-gray-400 hover:bg-gray-500 opacity-50 cursor-not-allowed"
                          }
                          title={
                            transfer.status === "In Transit"
                              ? "Receive this transfer"
                              : "Only In Transit transfers can be received"
                          }
                        >
                          {receivingId === transfer.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Package className="h-4 w-4 mr-1" />
                          )}
                          Receive
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/delivery/depot/${transfer.id}`)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
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

