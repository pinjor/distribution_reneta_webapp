import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { format } from "date-fns";
import { Loader2, Save, Truck, ArrowLeft, Printer } from "lucide-react";

interface OrderDeliveryItemForm {
  id?: number;
  order_item_id: number;
  product_id: number;
  product_name: string;
  legacy_code?: string;
  new_code?: string;
  pack_size?: string;
  uom?: string;
  batch_number: string;
  expiry_date?: string;
  ordered_quantity: number;
  delivery_quantity: number;
  picked_quantity: number;
  available_stock: number;
  status?: string;
  free_goods_threshold?: number;
  free_goods_quantity?: number;
  free_goods_awarded?: number;
  product_rate?: number;
  trade_amount?: number;
  vat_amount?: number;
}

interface OrderDeliveryForm {
  id: number;
  order_id: number;
  delivery_number: string;
  ship_to_party?: string;
  sold_to_party?: string;
  delivery_date: string;
  planned_dispatch_time?: string;
  vehicle_info?: string;
  driver_name?: string;
  warehouse_no?: string;
  vehicle_id?: number | null;
  driver_id?: number | null;
  remarks?: string;
  status: string;
  items: OrderDeliveryItemForm[];
}

interface LedgerEntry {
  id: number;
  productId: number;
  depotId?: number;
  batch?: string;
  expiryDate?: string | null;
  availableQuantity: number;
}

interface AllocationEntry {
  productId: number;
  batch: string;
  expiryDate: string | null;
  allocated: number;
  availableBefore: number;
  depotId?: number;
}

interface ProductSummary {
  id: number;
  label: string;
  oldCode?: string;
  newCode?: string;
  freeGoodsThreshold?: number;
  freeGoodsQuantity?: number;
  basePrice?: number;
}

interface ProductIndex {
  byId: Record<number, ProductSummary>;
  byCode: Record<string, ProductSummary>;
}

type Totals = {
  trade: number;
  vat: number;
  grand: number;
};

const DEFAULT_THRESHOLD = 100;
const DEFAULT_FREE = 5;
const VAT_RATE = 0.15;

export default function OrderDeliveryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<OrderDeliveryForm | null>(null);
  const [ledgerMap, setLedgerMap] = useState<Record<number, LedgerEntry[]>>({});
  const [ledgerReady, setLedgerReady] = useState(false);
  const [productIndex, setProductIndex] = useState<ProductIndex>({ byId: {}, byCode: {} });
  const [productsReady, setProductsReady] = useState(false);

  const safeNumber = useCallback((value: any, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadProducts = async () => {
      try {
        const response = await apiEndpoints.products.getAll();
        if (cancelled) return;
        if (!Array.isArray(response)) {
          setProductIndex({ byId: {}, byCode: {} });
          return;
        }
        const byId: Record<number, ProductSummary> = {};
        const byCode: Record<string, ProductSummary> = {};
        response.forEach((product: any) => {
          const id = safeNumber(product.id, 0);
          if (!id) return;
          const summary: ProductSummary = {
            id,
            label: product.name || product.code || `Product ${id}`,
            oldCode: product.old_code || product.legacy_code || undefined,
            newCode: product.new_code || undefined,
            freeGoodsThreshold: safeNumber(product.free_goods_threshold, DEFAULT_THRESHOLD),
            freeGoodsQuantity: safeNumber(product.free_goods_quantity, DEFAULT_FREE),
            basePrice: safeNumber(product.base_price ?? product.trade_price, 0),
          };
          byId[id] = summary;
          const codeCandidates = [product.code, product.sku, summary.oldCode, summary.newCode, product.legacy_code];
          codeCandidates
            .filter((code): code is string => Boolean(code))
            .forEach((code) => {
              byCode[String(code)] = summary;
            });
        });
        setProductIndex({ byId, byCode });
      } catch (error) {
        console.error("Failed to load product master", error);
        toast({
          title: "Master data unavailable",
          description: "Product pricing and free goods will need manual entry.",
          variant: "destructive",
        });
        setProductIndex({ byId: {}, byCode: {} });
      } finally {
        if (!cancelled) setProductsReady(true);
      }
    };

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [safeNumber, toast]);

  useEffect(() => {
    let cancelled = false;
    const loadLedger = async () => {
      try {
        const response = await apiEndpoints.stockMaintenance.getLedger();
        if (cancelled) return;
        if (!Array.isArray(response)) {
          setLedgerMap({});
          return;
        }
        const grouped: Record<number, LedgerEntry[]> = {};
        response.forEach((row: any) => {
          const productId = safeNumber(row.product_id ?? row.productId ?? row.product?.id, 0);
          if (!productId) return;
          const rawId = Number(row.id);
          const entryId = Number.isFinite(rawId)
            ? rawId
            : Number(`${productId}${Math.floor(Math.random() * 10000)}`);
          const depotCandidate = safeNumber(row.depot_id ?? row.depotId ?? row.depot?.id, Number.NaN);
          const entry: LedgerEntry = {
            id: entryId,
            productId,
            depotId: Number.isFinite(depotCandidate) && depotCandidate !== 0 ? depotCandidate : undefined,
            batch: row.batch ?? row.batch_number ?? "",
            expiryDate: row.expiry_date ?? row.expiryDate ?? row.expiry ?? null,
            availableQuantity: safeNumber(row.available_quantity ?? row.availableQuantity ?? row.quantity, 0),
          };
          if (!grouped[productId]) grouped[productId] = [];
          grouped[productId].push(entry);
        });
        Object.values(grouped).forEach((entries) => {
          entries.sort((a, b) => {
            if (!a.expiryDate && !b.expiryDate) return 0;
            if (!a.expiryDate) return 1;
            if (!b.expiryDate) return -1;
            return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
          });
        });
        setLedgerMap(grouped);
      } catch (error) {
        console.error("Failed to load stock availability", error);
        toast({
          title: "Unable to load stock availability",
          description: "Batch selection will require manual input.",
          variant: "destructive",
        });
        setLedgerMap({});
      } finally {
        if (!cancelled) setLedgerReady(true);
      }
    };

    loadLedger();
    return () => {
      cancelled = true;
    };
  }, [safeNumber, toast]);

  const allocateFromLedger = useCallback(
    (productId: number, quantity: number, pool: Record<number, LedgerEntry[]>) => {
      const entries = pool[productId];
      if (!entries?.length || quantity <= 0) {
        return { allocations: [] as AllocationEntry[], shortage: Math.max(quantity, 0) };
      }
      const allocations: AllocationEntry[] = [];
      let remaining = quantity;
      entries.forEach((entry) => {
        if (remaining <= 0) return;
        const available = safeNumber(entry.availableQuantity, 0);
        if (available <= 0) return;
        const allocated = Math.min(available, remaining);
        allocations.push({
          productId,
          batch: entry.batch ?? "",
          expiryDate: entry.expiryDate ?? null,
          allocated,
          availableBefore: available,
          depotId: entry.depotId,
        });
        entry.availableQuantity = Number((available - allocated).toFixed(4));
        remaining -= allocated;
      });
      return { allocations, shortage: remaining > 0 ? remaining : 0 };
    },
    [safeNumber],
  );

  const initializeItemsFromOrder = useCallback(
    async (delivery: OrderDeliveryForm) => {
      try {
        const order = await apiEndpoints.orders.getById(delivery.order_id);
        if (!order?.items) return;

        const ledgerPool: Record<number, LedgerEntry[]> = Object.fromEntries(
          Object.entries(ledgerMap).map(([key, entries]) => [Number(key), entries.map((entry) => ({ ...entry }))]),
        );

        const built: OrderDeliveryItemForm[] = [];

        for (const item of order.items) {
          const quantity = safeNumber(item.quantity, 0);
          if (quantity <= 0) continue;
          const rate = safeNumber(item.trade_price, 0);

          const productSummary =
            (item.new_code && productIndex.byCode[String(item.new_code)]) ||
            (item.old_code && productIndex.byCode[String(item.old_code)]) ||
            (item.product_id ? productIndex.byId[safeNumber(item.product_id, 0)] : undefined);

          const productId = productSummary?.id ?? safeNumber(item.product_id ?? item.product?.id, 0);
          const threshold = productSummary?.freeGoodsThreshold ?? DEFAULT_THRESHOLD;
          const freePerThreshold = productSummary?.freeGoodsQuantity ?? DEFAULT_FREE;

          const baseRow = {
            order_item_id: item.id,
            product_id: productId,
            product_name: item.product_name,
            legacy_code: item.old_code,
            new_code: item.new_code,
            pack_size: item.pack_size,
            uom: item.uom || "IFC",
            free_goods_threshold: threshold,
            free_goods_quantity: freePerThreshold,
          } as Pick<OrderDeliveryItemForm, keyof OrderDeliveryItemForm>;

          const { allocations, shortage } = allocateFromLedger(productId, quantity, ledgerPool);
          if (shortage > 0 && (ledgerPool[productId]?.length ?? 0) > 0) {
            toast({
              title: "Insufficient stock",
              description: `${item.product_name} short by ${shortage.toFixed(2)} units`,
              variant: "destructive",
            });
          }

          let remainingOrdered = quantity;
          let totalFree = 0;
          if (threshold > 0 && freePerThreshold > 0 && quantity >= threshold) {
            totalFree = Math.floor(quantity / threshold) * freePerThreshold;
          }
          let remainingFree = totalFree;

          if (allocations.length === 0) {
            const delivered = quantity - shortage;
            const tradeAmount = rate * delivered;
            built.push({
              ...(baseRow as OrderDeliveryItemForm),
              batch_number: "",
              expiry_date: "",
              ordered_quantity: quantity,
              delivery_quantity: delivered,
              picked_quantity: delivered,
              available_stock: 0,
              status: "Pending",
              free_goods_awarded: totalFree || undefined,
              product_rate: rate,
              trade_amount: tradeAmount,
              vat_amount: tradeAmount * VAT_RATE,
            });

            if (shortage > 0) {
              built.push({
                ...(baseRow as OrderDeliveryItemForm),
                batch_number: "",
                expiry_date: "",
                ordered_quantity: shortage,
                delivery_quantity: 0,
                picked_quantity: 0,
                available_stock: 0,
                status: "Pending",
                free_goods_awarded: undefined,
                product_rate: rate,
                trade_amount: 0,
                vat_amount: 0,
              });
            }
            continue;
          }

          allocations.forEach((allocation, index) => {
            const allocatedQty = safeNumber(allocation.allocated, 0);
            const tradeAmount = rate * allocatedQty;
            let freeAwarded = 0;
            if (remainingFree > 0 && quantity > 0) {
              if (index === allocations.length - 1) {
                freeAwarded = remainingFree;
              } else {
                const proportional = Math.floor((allocatedQty / quantity) * totalFree);
                freeAwarded = proportional > 0 ? proportional : remainingFree > 0 ? 1 : 0;
                freeAwarded = Math.min(freeAwarded, remainingFree);
              }
              remainingFree -= freeAwarded;
            }

            built.push({
              ...(baseRow as OrderDeliveryItemForm),
              batch_number: allocation.batch || "",
              expiry_date: allocation.expiryDate || "",
              ordered_quantity: remainingOrdered,
              delivery_quantity: allocatedQty,
              picked_quantity: allocatedQty,
              available_stock: allocation.availableBefore,
              status: "Pending",
              free_goods_awarded: freeAwarded || undefined,
              product_rate: rate,
              trade_amount: tradeAmount,
              vat_amount: tradeAmount * VAT_RATE,
            });
            remainingOrdered -= allocatedQty;
          });

          if (shortage > 0) {
            built.push({
              ...(baseRow as OrderDeliveryItemForm),
              batch_number: "",
              expiry_date: "",
              ordered_quantity: Math.max(remainingOrdered, shortage),
              delivery_quantity: 0,
              picked_quantity: 0,
              available_stock: 0,
              status: "Pending",
              free_goods_awarded: undefined,
              product_rate: rate,
              trade_amount: 0,
              vat_amount: 0,
            });
          }
        }

        setData((prev) => (prev ? { ...prev, items: built } : prev));
      } catch (error) {
        console.error("Failed to initialize items", error);
        toast({ title: "Unable to prepare delivery items", variant: "destructive" });
      }
    },
    [allocateFromLedger, ledgerMap, productIndex, safeNumber, toast],
  );

  useEffect(() => {
    const fetchDelivery = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const result = await apiEndpoints.orderDeliveries.getById(id);
        const normalizedItems = Array.isArray(result.items)
          ? result.items.map((item: any) => ({
              ...item,
              delivery_quantity: safeNumber(item.delivery_quantity ?? item.picked_quantity, 0),
              picked_quantity: safeNumber(item.picked_quantity ?? item.delivery_quantity, 0),
              ordered_quantity: safeNumber(item.ordered_quantity ?? item.delivery_quantity, 0),
              available_stock: safeNumber(item.available_stock, 0),
              product_rate: safeNumber(item.product_rate, 0),
              trade_amount: safeNumber(item.trade_amount, 0),
              vat_amount: safeNumber(item.vat_amount, 0),
              status: item.status || "Pending",
              batch_number: item.batch_number || "",
              expiry_date: item.expiry_date || "",
            }))
          : [];

        setData({
          ...result,
          items: normalizedItems,
          vehicle_id: result.vehicle_id ?? result.vehicle?.id ?? null,
          driver_id: result.driver_id ?? result.driver?.id ?? null,
        });
      } catch (error) {
        console.error("Failed to load delivery order", error);
        toast({ title: "Unable to load delivery order", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchDelivery();
  }, [id, toast, initializeItemsFromOrder]);
  
  useEffect(() => {
    if (!data) return;
    if (data.items && data.items.length > 0) return;
    if (!ledgerReady || !productsReady) return;
    initializeItemsFromOrder(data);
  }, [data, ledgerReady, productsReady, initializeItemsFromOrder]);

  useEffect(() => {
    if (searchParams.get("print") === "1") {
      setTimeout(() => window.print(), 300);
    }
  }, [searchParams]);

  const handleHeaderChange = (field: keyof OrderDeliveryForm, value: string | number | null) => {
    if (!data) return;
    setData({ ...data, [field]: value });
  };

  const handleSave = async () => {
    if (!data || !id) return;
    try {
      setSaving(true);
      const payload = {
        ship_to_party: data.ship_to_party,
        sold_to_party: data.sold_to_party,
        delivery_date: data.delivery_date,
        planned_dispatch_time: data.planned_dispatch_time,
        warehouse_no: data.warehouse_no,
        remarks: data.remarks,
        status: data.status,
        items: data.items.map((item) => ({
          id: item.id,
          order_item_id: item.order_item_id,
          product_id: item.product_id,
          product_name: item.product_name,
          legacy_code: item.legacy_code,
          new_code: item.new_code,
          pack_size: item.pack_size,
          uom: item.uom,
          batch_number: item.batch_number,
          expiry_date: item.expiry_date,
          ordered_quantity: item.ordered_quantity,
          delivery_quantity: item.delivery_quantity,
          picked_quantity: item.picked_quantity,
          available_stock: item.available_stock,
          status: item.status,
          free_goods_threshold: item.free_goods_threshold,
          free_goods_quantity: item.free_goods_quantity,
          free_goods_awarded: item.free_goods_awarded,
          product_rate: item.product_rate,
          trade_amount: item.trade_amount,
          vat_amount: item.vat_amount,
        })),
      };
      const updated = await apiEndpoints.orderDeliveries.update(id, payload);
      setData(updated);
      toast({ title: "Delivery Order saved" });
    } catch (error) {
      console.error("Failed to update delivery order", error);
      toast({ title: "Unable to update delivery order", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const totals: Totals = useMemo(() => {
    if (!data?.items?.length) return { trade: 0, vat: 0, grand: 0 };
    return data.items.reduce(
      (acc, item) => {
        const trade = Number(item.trade_amount || 0);
        const vat = Number(item.vat_amount || 0);
        return {
          trade: acc.trade + trade,
          vat: acc.vat + vat,
          grand: acc.grand + trade + vat,
        };
      },
      { trade: 0, vat: 0, grand: 0 },
    );
  }, [data?.items]);

  const statusBadge = useMemo(() => {
    if (!data) return null;
    const variant = data.status === "Delivered" ? "default" : data.status === "Draft" ? "secondary" : "outline";
    return <Badge variant={variant}>{data.status === "Draft" ? "Pending" : data.status}</Badge>;
  }, [data]);

  const handleItemChange = (index: number, field: keyof OrderDeliveryItemForm, value: string) => {
    if (!data) return;
    setData((prev) => {
      if (!prev) return prev;
      const updatedItems = prev.items.map((item, idx) => {
        if (idx !== index) return item;
        const next: OrderDeliveryItemForm = { ...item };
        const numericFields: Array<keyof OrderDeliveryItemForm> = [
          "delivery_quantity",
          "picked_quantity",
          "available_stock",
          "free_goods_threshold",
          "free_goods_quantity",
          "free_goods_awarded",
          "product_rate",
          "trade_amount",
          "vat_amount",
        ];
        if (numericFields.includes(field)) {
          (next as any)[field] = value === "" ? undefined : Number(value);
        } else {
          (next as any)[field] = value;
        }

        if (field === "delivery_quantity" || field === "product_rate") {
          const rate = Number(field === "product_rate" ? value : next.product_rate || 0);
          const qty = Number(field === "delivery_quantity" ? value : next.delivery_quantity || 0);
          const trade = rate * qty;
          next.trade_amount = trade;
          next.vat_amount = trade * VAT_RATE;
        }

        if (field === "trade_amount") {
          const trade = Number(value || 0);
          next.trade_amount = trade;
          next.vat_amount = trade * VAT_RATE;
        }

        return next;
      });

      return { ...prev, items: updatedItems };
    });
  };

  const handleDraftItem = (index: number) => {
    setData((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((item, idx) => (idx === index ? { ...item, status: "Draft" } : item));
      return { ...prev, items };
    });
  };

  const handleDraftAll = () => {
    setData((prev) => {
      if (!prev || !prev.items.length) return prev;
      const items = prev.items.map((item) => ({ ...item, status: "Draft" }));
      return { ...prev, items };
    });
    toast({ title: "All line items marked as draft" });
  };

  const allItemsDrafted = useMemo(() => {
    if (!data?.items?.length) return true;
    return data.items.every((item) => (item.status || "")?.toLowerCase() === "draft");
  }, [data?.items]);

  if (loading || !data) {
    return (
      <main className="p-6">
        <Card>
          <CardContent className="py-24 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-4" />
            Loading delivery order...
          </CardContent>
        </Card>
      </main>
    );
  }

  const header = (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Truck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Delivery Order {data.delivery_number}</h1>
            <p className="text-sm text-muted-foreground">Configure batch allocation, pricing, and logistics before dispatch.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {statusBadge}
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Delivery
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <main className="p-6 space-y-6">
      {header}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Delivery details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs uppercase text-muted-foreground">Ship to party</Label>
              <Input value={data.ship_to_party || ""} onChange={(e) => handleHeaderChange("ship_to_party", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs uppercase text-muted-foreground">Sold to party</Label>
              <Input value={data.sold_to_party || ""} onChange={(e) => handleHeaderChange("sold_to_party", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs uppercase text-muted-foreground">Delivery date</Label>
              <Input
                type="date"
                value={data.delivery_date ? format(new Date(data.delivery_date), "yyyy-MM-dd") : ""}
                onChange={(e) => handleHeaderChange("delivery_date", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs uppercase text-muted-foreground">Dispatch time</Label>
              <Input
                placeholder="08:30"
                value={data.planned_dispatch_time || ""}
                onChange={(e) => handleHeaderChange("planned_dispatch_time", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs uppercase text-muted-foreground">Warehouse No.</Label>
              <Input value={data.warehouse_no || ""} onChange={(e) => handleHeaderChange("warehouse_no", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs uppercase text-muted-foreground">Status</Label>
              <Select value={data.status} onValueChange={(value) => handleHeaderChange("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pending" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Pending</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex flex-col gap-1">
              <Label className="text-xs uppercase text-muted-foreground">Remarks</Label>
              <Textarea rows={2} value={data.remarks || ""} onChange={(e) => handleHeaderChange("remarks", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold">Line items</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDraftAll} disabled={allItemsDrafted || !data.items.length}>
              Draft all
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow className="text-xs uppercase text-muted-foreground">
                  <TableHead className="w-12">Item</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Delv. qty</TableHead>
                  <TableHead>Picked qty</TableHead>
                  <TableHead>Product rate</TableHead>
                  <TableHead>Trade amount</TableHead>
                  <TableHead>VAT amount</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Draft</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item, index) => (
                  <TableRow key={item.id ?? index} className="text-sm align-middle">
                    <TableCell className="font-semibold text-muted-foreground">{String(index + 1).padStart(2, "0")}</TableCell>
                    <TableCell className="font-medium text-foreground">{item.product_name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-10 min-w-[100px] text-base"
                        value={item.delivery_quantity?.toString() ?? ""}
                        onChange={(e) => handleItemChange(index, "delivery_quantity", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-10 min-w-[100px] text-base"
                        value={item.picked_quantity?.toString() ?? ""}
                        onChange={(e) => handleItemChange(index, "picked_quantity", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-10 min-w-[110px] text-base"
                        value={item.product_rate?.toString() ?? ""}
                        onChange={(e) => handleItemChange(index, "product_rate", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-10 min-w-[120px] text-base"
                        value={item.trade_amount?.toString() ?? ""}
                        onChange={(e) => handleItemChange(index, "trade_amount", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-10 min-w-[120px] text-base"
                        value={item.vat_amount?.toString() ?? ""}
                        onChange={(e) => handleItemChange(index, "vat_amount", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-10 min-w-[120px]"
                        value={item.batch_number}
                        onChange={(e) => handleItemChange(index, "batch_number", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        className="h-10 min-w-[140px]"
                        value={item.expiry_date ? format(new Date(item.expiry_date), "yyyy-MM-dd") : ""}
                        onChange={(e) => handleItemChange(index, "expiry_date", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={(item.status || "")?.toLowerCase() === "draft" ? "secondary" : "outline"}>
                        {item.status || "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDraftItem(index)}
                        disabled={(item.status || "")?.toLowerCase() === "draft"}
                      >
                        Draft
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p className="text-sm font-semibold text-foreground">Pricing overview</p>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Trade amount</p>
                <p className="text-base font-semibold text-foreground">{totals.trade.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">VAT amount</p>
                <p className="text-base font-semibold text-foreground">{totals.vat.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total payable</p>
                <p className="text-base font-semibold text-foreground">{totals.grand.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
