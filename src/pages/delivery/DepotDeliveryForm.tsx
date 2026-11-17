import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, PackagePlus, Trash2, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NAVY_TEAL_SCOPE_CLASS } from "@/lib/navyTealTheme";
import { cn } from "@/lib/utils";

interface DeliveryItem {
  key: string;
  productId: string;
  productName: string;
  oldCode?: string;
  newCode?: string;
  batchNumber: string;
  expiryDate: string;
  quantity: string;
  unitPrice: string;
}

const createKey = () => Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString(36).toUpperCase();

const fieldClass =
  "h-10 rounded-lg border border-[#CBD5E1] bg-white text-[13px] shadow-none focus:ring-0 focus-visible:border-[#0C4DA1] focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/20 dark:border-[#2C3B50] dark:bg-[#151F30]";
const labelClass = "text-[13px] font-medium text-[#172B4D] dark:text-[#F1F5F9]";
const selectPanelClass = "nt-select-panel z-[200] rounded-xl border p-1 shadow-lg";
const selectItemClass = "cursor-pointer rounded-md py-2 pl-8 pr-3 text-[13px] leading-snug";
const fieldWrapClass = "min-w-0 space-y-1";

const EMPTY_ITEM_DRAFT = {
  productId: "",
  batchNumber: "",
  expiryDate: "",
  quantity: "",
  unitPrice: "",
};

export default function DepotDeliveryForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logisticsOpen, setLogisticsOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [depots, setDepots] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  const [form, setForm] = useState({
    transferNumber: "",
    transferDate: new Date().toISOString().split("T")[0],
    fromDepotId: "",
    toDepotId: "",
    vehicleId: "",
    driverId: "",
    transferNote: "",
    remarks: "",
  });

  const [itemDraft, setItemDraft] = useState({ ...EMPTY_ITEM_DRAFT });

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      setLoading(true);
      const [depotsRes, productsRes, vehiclesRes, driversRes] = await Promise.all([
        apiEndpoints.depots.getAll(),
        apiEndpoints.products.getAll(),
        apiEndpoints.vehicles.getAll(),
        apiEndpoints.drivers.getAll(),
      ]);
      setDepots(Array.isArray(depotsRes) ? depotsRes : depotsRes?.data || []);
      const allProducts = Array.isArray(productsRes) ? productsRes : productsRes?.data || [];
      setProducts(allProducts);
      const vehiclesData = Array.isArray(vehiclesRes) ? vehiclesRes : vehiclesRes?.data || [];
      setVehicles(vehiclesData);
      const driversData = Array.isArray(driversRes) ? driversRes : driversRes?.data || [];
      setDrivers(driversData);

      console.log("Loaded data:", {
        depots: depots.length,
        products: allProducts.length,
        vehicles: vehiclesData.length,
        drivers: driversData.length,
      });
      console.log("Drivers response:", driversRes);
      console.log("Drivers data:", driversData);
    } catch (error) {
      console.error("Failed to load master data", error);
      toast({ title: "Unable to load master data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find((p) => String(p.id) === String(itemDraft.productId));

  useEffect(() => {
    const fetchBatches = async () => {
      if (itemDraft.productId && form.fromDepotId) {
        try {
          setLoadingBatches(true);
          const batches = await apiEndpoints.stockMaintenance.getProductBatches(
            parseInt(itemDraft.productId),
            parseInt(form.fromDepotId),
          );
          setAvailableBatches(Array.isArray(batches) ? batches : []);
        } catch (error) {
          console.error("Failed to load batches", error);
          setAvailableBatches([]);
        } finally {
          setLoadingBatches(false);
        }
      } else {
        setAvailableBatches([]);
      }
    };

    fetchBatches();
  }, [itemDraft.productId, form.fromDepotId]);

  const handleAddItem = () => {
    if (!itemDraft.productId) {
      toast({ title: "Select a product", variant: "destructive" });
      return false;
    }
    if (!itemDraft.quantity || Number(itemDraft.quantity) <= 0) {
      toast({ title: "Enter valid quantity", variant: "destructive" });
      return false;
    }

    const product = selectedProduct;
    if (!product) {
      toast({ title: "Product not found", variant: "destructive" });
      return false;
    }

    setItems((prev) => [
      ...prev,
      {
        key: createKey(),
        productId: itemDraft.productId,
        productName: product.name || product.product_name || `Product ${product.id}`,
        oldCode: product.oldCode || product.old_code || "",
        newCode: product.newCode || product.code || product.new_code || "",
        batchNumber: itemDraft.batchNumber,
        expiryDate: itemDraft.expiryDate,
        quantity: itemDraft.quantity,
        unitPrice: itemDraft.unitPrice || "0",
      },
    ]);

    setItemDraft({ ...EMPTY_ITEM_DRAFT });
    setAvailableBatches([]);
    toast({ title: "Product added successfully" });
    return true;
  };

  const handleSaveItem = () => {
    if (handleAddItem()) setItemModalOpen(false);
  };

  const handleSaveItemAndNew = () => {
    handleAddItem();
  };

  const handleRemoveItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  const handleSubmit = async () => {
    if (!form.fromDepotId || !form.toDepotId) {
      toast({ title: "Please select both source and destination depots", variant: "destructive" });
      return;
    }
    if (form.fromDepotId === form.toDepotId) {
      toast({ title: "Source and destination depots cannot be the same", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }

    for (const item of items) {
      const qty = parseFloat(item.quantity);
      if (!item.quantity || !qty || qty <= 0 || isNaN(qty)) {
        toast({
          title: "Invalid quantity",
          description: `Please enter a valid quantity greater than 0 for ${item.productName || "product"}`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setSaving(true);
      const payload = {
        transfer_number: form.transferNumber || undefined,
        transfer_date: form.transferDate,
        from_depot_id: parseInt(form.fromDepotId),
        to_depot_id: parseInt(form.toDepotId),
        vehicle_id: form.vehicleId && form.vehicleId !== "__none__" ? parseInt(form.vehicleId) : null,
        driver_name:
          form.driverId && form.driverId !== "__none__"
            ? (() => {
                const driver = drivers.find((d) => String(d.id) === form.driverId);
                if (!driver) return null;
                return driver.name || `${driver.first_name || ""} ${driver.last_name || ""}`.trim() || null;
              })()
            : null,
        transfer_note: form.transferNote || null,
        remarks: form.remarks || null,
        items: items.map((item) => {
          const qty = parseFloat(item.quantity);
          if (!qty || qty <= 0 || isNaN(qty)) {
            throw new Error(`Invalid quantity for product ${item.productName || item.productId}`);
          }
          return {
            product_id: parseInt(item.productId),
            batch_number: item.batchNumber || null,
            expiry_date: item.expiryDate || null,
            quantity: qty,
            unit_price: parseFloat(item.unitPrice || "0"),
          };
        }),
      };

      await apiEndpoints.depotTransfers.create(payload);

      toast({ title: "Depot transfer request created successfully" });
      navigate("/delivery/depot");
    } catch (error: any) {
      console.error("Failed to create depot transfer", error);
      toast({ title: "Unable to create transfer", description: error?.message || error?.details, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const totalAmount = items.reduce((sum, item) => {
    return sum + parseFloat(item.quantity || "0") * parseFloat(item.unitPrice || "0");
  }, 0);
  const totalQty = items.reduce((sum, item) => sum + parseFloat(item.quantity || "0"), 0);

  const itemRows = items.map((item, index) => ({
    ...item,
    sl: index + 1,
    amount: parseFloat(item.quantity || "0") * parseFloat(item.unitPrice || "0"),
  }));

  const itemColumns: DataTableColumn<(typeof itemRows)[number]>[] = [
    { key: "sl", label: "SL", className: "w-12 tabular-nums text-[#64748B]" },
    {
      key: "productName",
      label: "Product",
      render: (val) => <span className="font-medium text-[#172B4D] dark:text-[#F1F5F9]">{String(val || "—")}</span>,
    },
    { key: "oldCode", label: "Old code", className: "font-mono text-xs", render: (val) => String(val || "—") },
    { key: "newCode", label: "New code", className: "font-mono text-xs", render: (val) => String(val || "—") },
    { key: "batchNumber", label: "Batch", className: "font-mono text-xs", render: (val) => String(val || "—") },
    { key: "expiryDate", label: "Expiry", className: "whitespace-nowrap tabular-nums", render: (val) => String(val || "—") },
    {
      key: "quantity",
      label: "Quantity",
      align: "right",
      className: "tabular-nums",
      render: (val) => parseFloat(String(val || "0")).toLocaleString(),
    },
    {
      key: "unitPrice",
      label: "Unit price",
      align: "right",
      className: "tabular-nums",
      render: (val) => parseFloat(String(val || "0")).toLocaleString(),
    },
    {
      key: "amount",
      label: "Amount",
      align: "right",
      className: "tabular-nums",
      render: (val) => Number(val || 0).toLocaleString(),
    },
    {
      key: "key",
      label: "Action",
      align: "right",
      headerClassName: "text-right",
      render: (_val, row) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Remove item"
              onClick={() => handleRemoveItem(row.key)}
              className="h-8 w-8 rounded-md p-0 text-[#94A3B8] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove item</TooltipContent>
        </Tooltip>
      ),
    },
  ];

  const depotOptions = depots.map((depot) => (
    <SelectItem key={depot.id} value={String(depot.id)} className={selectItemClass}>
      <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#EAF2FC] text-[#0C4DA1]">
        <Warehouse className="h-3.5 w-3.5" />
      </span>
      {depot.name} ({depot.code})
    </SelectItem>
  ));

  const sectionMotion = {
    initial: reduceMotion ? false : { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0 : 0.18 },
  };

  return (
    <ThemeScope className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-x-hidden">
        <motion.form
          {...sectionMotion}
          className="nt-form nt-form-compact nt-form-card shrink-0 overflow-hidden px-4 py-3"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Transfer</p>
              <p className="truncate font-mono text-[13px] font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                {form.transferNumber || "Auto-generated"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-8 gap-1 px-2 text-[13px] text-[#0C4DA1] hover:bg-[#EAF2FC]"
              aria-expanded={logisticsOpen}
              onClick={() => setLogisticsOpen((open) => !open)}
            >
              {logisticsOpen ? "Hide details" : "More details"}
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", logisticsOpen && "rotate-180")} />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            <div className={cn(fieldWrapClass, "nt-date-field relative")}>
              <Label className={labelClass}>Transfer Date</Label>
              <Input
                type="date"
                value={form.transferDate}
                onChange={(e) => setForm((prev) => ({ ...prev, transferDate: e.target.value }))}
                className={cn(fieldClass, "relative overflow-hidden")}
              />
            </div>
            <div className={fieldWrapClass}>
              <Label className={labelClass}>From Depot</Label>
              <Select
                value={form.fromDepotId}
                onValueChange={(value) => {
                  setForm((prev) => ({ ...prev, fromDepotId: value }));
                  setItemDraft((prev) => ({
                    ...prev,
                    batchNumber: "",
                    expiryDate: "",
                  }));
                }}
                disabled={loading || depots.length === 0}
              >
                <SelectTrigger className={fieldClass}>
                  <SelectValue placeholder={loading ? "Loading..." : depots.length === 0 ? "No depots available" : "Select source depot"} />
                </SelectTrigger>
                <SelectContent className={selectPanelClass}>
                  {loading ? (
                    <div className="px-2 py-1.5 text-sm text-[#64748B]">Loading...</div>
                  ) : depots.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-[#64748B]">No depots available</div>
                  ) : (
                    depotOptions
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className={fieldWrapClass}>
              <Label className={labelClass}>To Depot</Label>
              <Select
                value={form.toDepotId}
                onValueChange={(value) => setForm((prev) => ({ ...prev, toDepotId: value }))}
                disabled={loading || depots.length === 0}
              >
                <SelectTrigger className={fieldClass}>
                  <SelectValue placeholder={loading ? "Loading..." : depots.length === 0 ? "No depots available" : "Select destination depot"} />
                </SelectTrigger>
                <SelectContent className={selectPanelClass}>
                  {loading ? (
                    <div className="px-2 py-1.5 text-sm text-[#64748B]">Loading...</div>
                  ) : depots.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-[#64748B]">No depots available</div>
                  ) : (
                    depotOptions
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className={fieldWrapClass}>
              <Label className={labelClass}>Transfer Number</Label>
              <Input
                value={form.transferNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, transferNumber: e.target.value }))}
                placeholder="Auto-generated if left empty"
                className={fieldClass}
              />
            </div>
          </div>

          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
              logisticsOpen ? "mt-3 grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="border-t border-[#E3EAF3] pt-3 dark:border-[#2C3B50]">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Vehicle</Label>
                    <Select
                      value={form.vehicleId || undefined}
                      onValueChange={(value) => {
                        console.log("Vehicle selected:", value);
                        setForm((prev) => ({ ...prev, vehicleId: value }));
                      }}
                      disabled={loading || vehicles.length === 0}
                    >
                      <SelectTrigger className={cn("w-full", fieldClass)}>
                        <SelectValue placeholder={loading ? "Loading..." : vehicles.length === 0 ? "No vehicles available" : "Select vehicle"} />
                      </SelectTrigger>
                      <SelectContent className={cn(selectPanelClass, "max-h-[300px]")}>
                        {loading ? (
                          <div className="px-2 py-1.5 text-sm text-[#64748B]">Loading...</div>
                        ) : vehicles.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-[#64748B]">No vehicles available</div>
                        ) : (
                          <>
                            <SelectItem value="__none__" className={selectItemClass}>
                              None (Optional)
                            </SelectItem>
                            {vehicles.map((vehicle) => {
                              const regNo = vehicle.registration_number || vehicle.reg_no || vehicle.registrationNumber || "N/A";
                              const type = vehicle.vehicle_type || vehicle.type || vehicle.vehicleType || "N/A";
                              return (
                                <SelectItem key={vehicle.id} value={String(vehicle.id)} className={selectItemClass}>
                                  {regNo} ({type})
                                </SelectItem>
                              );
                            })}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Driver</Label>
                    <Select
                      value={form.driverId || undefined}
                      onValueChange={(value) => {
                        console.log("Driver selected:", value);
                        setForm((prev) => ({ ...prev, driverId: value }));
                      }}
                      disabled={loading}
                    >
                      <SelectTrigger className={cn("w-full", fieldClass)}>
                        <SelectValue placeholder={loading ? "Loading drivers..." : drivers.length === 0 ? "No drivers available" : "Select driver (optional)"} />
                      </SelectTrigger>
                      <SelectContent className={cn(selectPanelClass, "max-h-[300px]")}>
                        {loading ? (
                          <div className="px-2 py-1.5 text-sm text-[#64748B]">Loading drivers...</div>
                        ) : drivers.length === 0 ? (
                          <>
                            <div className="px-2 py-1.5 text-sm text-[#64748B]">No drivers available</div>
                            <SelectItem value="__none__" className={selectItemClass}>
                              None (Optional)
                            </SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="__none__" className={selectItemClass}>
                              None (Optional)
                            </SelectItem>
                            {drivers.map((driver) => {
                              const firstName = driver.first_name || "";
                              const lastName = driver.last_name || "";
                              const driverName = `${firstName} ${lastName}`.trim() || `Driver ${driver.id}`;
                              const license = driver.license_number || driver.licenseNumber || "";
                              return (
                                <SelectItem key={driver.id} value={String(driver.id)} className={selectItemClass}>
                                  {driverName} {license ? `(${license})` : ""}
                                </SelectItem>
                              );
                            })}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Transfer Note</Label>
                    <Input
                      value={form.transferNote}
                      onChange={(e) => setForm((prev) => ({ ...prev, transferNote: e.target.value }))}
                      placeholder="Enter transfer note details"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Remarks</Label>
                    <Input
                      value={form.remarks}
                      onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
                      placeholder="Additional notes or instructions"
                      className={fieldClass}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.form>

        <motion.div {...sectionMotion} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DataTable
            className="min-h-0 min-w-0 flex-1 overflow-hidden"
            title="Transfer items"
            description={`${items.length} item${items.length === 1 ? "" : "s"} · Qty ${totalQty.toLocaleString()} · Amount ${totalAmount.toLocaleString()}`}
            toolbarIcon={<PackagePlus className="h-4 w-4" />}
            toolbarActions={
              <Button type="button" variant="ntPrimary" className="!h-8" onClick={() => setItemModalOpen(true)}>
                <PackagePlus className="h-3.5 w-3.5" />
                Add Item
              </Button>
            }
            data={itemRows}
            columns={itemColumns}
            loading={loading}
            getRowId={(row) => row.key}
            resetPageKey={items.length}
            emptyMessage="No items added yet. Use Add Item to include products."
          />
        </motion.div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[#E3EAF3] bg-white/80 py-2 dark:border-[#2C3B50] dark:bg-[#151F30]/80">
          <Button type="button" variant="ntSecondary" onClick={() => navigate("/delivery/depot")}>
            Cancel
          </Button>
          <Button type="button" variant="ntPrimary" disabled={saving || items.length === 0} onClick={handleSubmit}>
            {saving ? "Saving..." : "Create Transfer Request"}
          </Button>
        </div>
      </div>

      <Dialog
        open={itemModalOpen}
        onOpenChange={(open) => {
          setItemModalOpen(open);
          if (!open) {
            setItemDraft({ ...EMPTY_ITEM_DRAFT });
            setAvailableBatches([]);
          }
        }}
      >
        <DialogContent
          className={cn(
            NAVY_TEAL_SCOPE_CLASS,
            "flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-none border border-[#E3EAF3] bg-white p-0 shadow-[0_24px_48px_rgba(15,23,42,0.16)] dark:border-[#2C3B50] dark:bg-[#151F30] sm:h-auto sm:max-h-[90vh] sm:w-[calc(100%-1.5rem)] sm:max-w-[880px] sm:rounded-[20px]",
          )}
        >
          <DialogHeader className="shrink-0 space-y-0.5 border-b border-[#E3EAF3] px-5 py-3 text-left dark:border-[#2C3B50]">
            <div className="flex items-start gap-3 pr-6">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]">
                <PackagePlus className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">Add transfer item</DialogTitle>
                <DialogDescription className="text-sm text-[#64748B] dark:text-[#A9B8CC]">
                  Select product, FEFO batch, quantity, and unit price.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="nt-form nt-form-compact min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-3">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className={cn(fieldWrapClass, "sm:col-span-2")}>
                <Label className={labelClass}>Product</Label>
                <Select
                  value={itemDraft.productId || undefined}
                  onValueChange={(value) => {
                    console.log("Product selected:", value);
                    setItemDraft((prev) => ({
                      ...prev,
                      productId: value,
                      batchNumber: "",
                      expiryDate: "",
                    }));
                  }}
                  disabled={loading || products.length === 0}
                >
                  <SelectTrigger className={cn("w-full", fieldClass)}>
                    <SelectValue placeholder={loading ? "Loading..." : products.length === 0 ? "No products available" : "Select product"} />
                  </SelectTrigger>
                  <SelectContent className={cn(selectPanelClass, "max-h-[300px]")}>
                    {loading ? (
                      <div className="px-2 py-1.5 text-sm text-[#64748B]">Loading...</div>
                    ) : products.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-[#64748B]">No products available</div>
                    ) : (
                      products.map((product) => {
                        const displayName = product.name || product.product_name || `Product ${product.id}`;
                        const code = product.code || product.newCode || product.oldCode || "";
                        return (
                          <SelectItem key={product.id} value={String(product.id)} className={selectItemClass}>
                            {code ? `${code} - ${displayName}` : displayName}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className={fieldWrapClass}>
                <Label className={labelClass}>Batch Number (FEFO)</Label>
                <Select
                  value={itemDraft.batchNumber || undefined}
                  onValueChange={(value) => {
                    const selectedBatch = availableBatches.find((b) => b.batch_number === value);
                    setItemDraft((prev) => ({
                      ...prev,
                      batchNumber: value,
                      expiryDate: selectedBatch?.expiry_date ? selectedBatch.expiry_date.split("T")[0] : "",
                      unitPrice: prev.unitPrice || "0",
                    }));
                  }}
                  disabled={loadingBatches || !itemDraft.productId || !form.fromDepotId || availableBatches.length === 0}
                >
                  <SelectTrigger className={fieldClass}>
                    <SelectValue
                      placeholder={
                        !form.fromDepotId
                          ? "Select source depot first"
                          : !itemDraft.productId
                            ? "Select product first"
                            : loadingBatches
                              ? "Loading batches..."
                              : availableBatches.length === 0
                                ? "No batches available"
                                : "Select batch (FEFO)"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className={cn(selectPanelClass, "max-h-[300px]")}>
                    {loadingBatches ? (
                      <div className="px-2 py-1.5 text-sm text-[#64748B]">Loading batches...</div>
                    ) : availableBatches.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-[#64748B]">
                        {!form.fromDepotId ? "Select source depot first" : !itemDraft.productId ? "Select product first" : "No batches available"}
                      </div>
                    ) : (
                      availableBatches.map((batch) => {
                        const expiryStr = batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : "No expiry";
                        const qty = batch.available_quantity || 0;
                        return (
                          <SelectItem key={batch.batch_number} value={batch.batch_number} className={selectItemClass}>
                            {batch.batch_number} - Qty: {qty.toLocaleString()} - Exp: {expiryStr}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className={cn(fieldWrapClass, "nt-date-field relative")}>
                <Label className={labelClass}>Expiry Date</Label>
                <Input
                  type="date"
                  value={itemDraft.expiryDate}
                  onChange={(e) => setItemDraft((prev) => ({ ...prev, expiryDate: e.target.value }))}
                  readOnly={!!itemDraft.batchNumber}
                  className={cn("w-full relative overflow-hidden", fieldClass, itemDraft.batchNumber && "bg-[#F8FAFC]")}
                />
              </div>
              <div className={fieldWrapClass}>
                <Label className={labelClass}>Quantity</Label>
                <Input
                  type="number"
                  value={itemDraft.quantity}
                  onChange={(e) => setItemDraft((prev) => ({ ...prev, quantity: e.target.value }))}
                  placeholder="Enter quantity"
                  min="0.01"
                  step="0.01"
                  className={cn("w-full", fieldClass)}
                />
              </div>
              <div className={fieldWrapClass}>
                <Label className={labelClass}>Unit Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={itemDraft.unitPrice}
                  onChange={(e) => setItemDraft((prev) => ({ ...prev, unitPrice: e.target.value }))}
                  placeholder="0.00"
                  min="0"
                  className={cn("w-full", fieldClass)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 flex-col gap-2 border-t border-[#E3EAF3] px-5 py-3 sm:flex-row sm:justify-end dark:border-[#2C3B50]">
            <Button
              type="button"
              variant="ntSecondary"
              onClick={() => {
                setItemDraft({ ...EMPTY_ITEM_DRAFT });
                setAvailableBatches([]);
                setItemModalOpen(false);
              }}
            >
              Close
            </Button>
            <Button type="button" variant="ntSecondary" onClick={handleSaveItemAndNew}>
              Save and New
            </Button>
            <Button type="button" variant="ntPrimary" onClick={handleSaveItem}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ThemeScope>
  );
}
