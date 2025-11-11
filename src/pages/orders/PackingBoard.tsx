import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { Loader2, RefreshCw, Search } from "lucide-react";

interface PackingDelivery {
  id: number;
  delivery_number: string;
  delivery_date?: string;
  status: string;
  ship_to_party?: string;
  warehouse_no?: string;
  total_items: number;
  total_quantity: number;
  total_value: number;
}

const STATUS_DESCRIPTIONS: Record<string, string> = {
  Draft: "Pending allocation",
  Packing: "Ready for picking",
  Loading: "Loading",
  Shipped: "Shipped",
  Delivered: "Delivered",
};

const STATUS_VARIANT: Record<string, "secondary" | "outline" | "default"> = {
  Draft: "secondary",
  Packing: "default",
  Loading: "outline",
  Shipped: "default",
  Delivered: "default",
};

export default function PackingBoard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [deliveries, setDeliveries] = useState<PackingDelivery[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const response = await apiEndpoints.deliveryOrders.getAll();
      const list = Array.isArray(response?.data) ? response.data : response;
      const mapped: PackingDelivery[] = (list || [])
        .filter(
          (delivery: any) =>
            !delivery.status ||
            ["Draft", "Packing", "Loading"].includes(delivery.status)
        )
        .map((delivery: any) => {
          const items = Array.isArray(delivery.items) ? delivery.items : [];
          const totalQuantity = items.reduce(
            (sum: number, item: any) => sum + Number(item.delivery_quantity || 0),
            0
          );
          const totalValue = items.reduce(
            (sum: number, item: any) => sum + Number(item.trade_amount || 0),
            0
          );
          return {
            id: Number(delivery.id),
            delivery_number: delivery.delivery_number,
            delivery_date: delivery.delivery_date,
            status: delivery.status || "Draft",
            ship_to_party: delivery.ship_to_party,
            warehouse_no: delivery.warehouse_no,
            total_items: items.length,
            total_quantity: totalQuantity,
            total_value: totalValue,
          };
        });
      setDeliveries(mapped);
      setSelectedIds((prev) => prev.filter((id) => mapped.some((delivery) => delivery.id === id)));
    } catch (error) {
      console.error("Failed to load packing deliveries", error);
      toast({ title: "Unable to load deliveries", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const filteredDeliveries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return deliveries;
    return deliveries.filter((delivery) => {
      const haystack = [
        delivery.delivery_number,
        delivery.ship_to_party,
        delivery.warehouse_no,
        STATUS_DESCRIPTIONS[delivery.status],
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return haystack.some((value) => value.includes(term));
    });
  }, [deliveries, searchTerm]);

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  };

  const allSelected = filteredDeliveries.length > 0 && filteredDeliveries.every((delivery) => selectedIds.includes(delivery.id));

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      const ids = filteredDeliveries.map((delivery) => delivery.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
    } else {
      const remaining = selectedIds.filter((id) => !filteredDeliveries.some((delivery) => delivery.id === id));
      setSelectedIds(remaining);
    }
  };

  const handleNavigateToPicking = () => {
    if (selectedIds.length === 0) {
      toast({ title: "Select at least one delivery", variant: "destructive" });
      return;
    }
    navigate("/orders/picking/new", { state: { deliveryIds: selectedIds } });
  };

  const handlePrintPackingReport = () => {
    if (selectedIds.length === 0) {
      toast({ title: "Select deliveries to include in the report", variant: "destructive" });
      return;
    }
    navigate(`/orders/packing/report?deliveryIds=${selectedIds.join(",")}`);
  };

  const selectedSummary = useMemo(() => {
    const rows = deliveries.filter((delivery) => selectedIds.includes(delivery.id));
    const quantity = rows.reduce((sum, item) => sum + item.total_quantity, 0);
    const value = rows.reduce((sum, item) => sum + item.total_value, 0);
    return {
      count: rows.length,
      quantity,
      value,
    };
  }, [deliveries, selectedIds]);

  return (
    <main className="p-6 space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Packing Queue</h1>
          <p className="text-muted-foreground">
            Select confirmed delivery orders to create picking challans and print packing slips.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fetchDeliveries} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handlePrintPackingReport} disabled={selectedIds.length === 0}>
            Packing Report
          </Button>
          <Button onClick={handleNavigateToPicking} disabled={selectedIds.length === 0}>
            Generate Picking Challan
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <CardTitle className="text-base font-semibold">Delivery Orders</CardTitle>
            <div className="relative w-full max-w-sm">
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by delivery number, customer or depot"
                className="pl-8"
              />
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>
              Total deliveries: <strong>{deliveries.length}</strong>
            </span>
            <span>
              Selected: <strong>{selectedSummary.count}</strong>
            </span>
            <span>
              Quantity: <strong>{selectedSummary.quantity.toLocaleString()}</strong>
            </span>
            <span>
              Value: <strong>{selectedSummary.value.toLocaleString()}</strong>
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading deliveries...
            </div>
          ) : filteredDeliveries.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              No deliveries match your filters. Adjust the search or refresh the list.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="text-xs uppercase text-muted-foreground">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(value) => toggleSelectAll(Boolean(value))}
                        aria-label="Select all deliveries"
                      />
                    </TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Ship to</TableHead>
                    <TableHead>Depot</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeliveries.map((delivery) => (
                    <TableRow key={delivery.id} className="text-sm">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(delivery.id)}
                          onCheckedChange={() => toggleSelection(delivery.id)}
                          aria-label={`Select delivery ${delivery.delivery_number}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{delivery.delivery_number}</span>
                          <span className="text-xs text-muted-foreground">
                            {delivery.delivery_date ? new Date(delivery.delivery_date).toLocaleDateString() : "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{delivery.ship_to_party || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{delivery.warehouse_no || "—"}</TableCell>
                      <TableCell>{delivery.total_items}</TableCell>
                      <TableCell>{delivery.total_quantity.toLocaleString()}</TableCell>
                      <TableCell>{delivery.total_value.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[delivery.status] || "outline"}>
                          {delivery.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}


