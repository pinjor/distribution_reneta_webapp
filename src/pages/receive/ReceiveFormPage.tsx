// @ts-nocheck
/// <reference types="react" />
/// <reference types="react-dom" />
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, PackagePlus, Warehouse, ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
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

// Product and Depot option types
type ProductOption = {
  id: string;
  code: string;
  oldCode: string;
  newCode: string;
  name: string;
  packSize: string;
};

type DepotOption = {
  id: number | string;
  code: string;
  name: string;
};

type ReceiptSource = "FACTORY" | "DEPOT" | "RETURN";

type DraftItem = {
  key: string;
  id?: number;
  legacyCode: string;
  itemCode: string;
  itemName: string;
  packSize: string;
  uom: string;
  expiryDate: string;
  batchNumber: string;
  numberOfIfc: string;
  depotQuantity: string;
  ifcPerFullMc: string;
  numberOfFullMc: string;
  ifcInLooseMc: string;
};

interface ReceiveFormPageProps {
  sourceType: ReceiptSource;
  title: string;
}

const createKey = () => Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString(36).toUpperCase();

const fieldClass =
  "h-10 rounded-lg border border-[#CBD5E1] bg-white text-[13px] shadow-none focus:ring-0 focus-visible:border-[#0C4DA1] focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/20 dark:border-[#2C3B50] dark:bg-[#151F30]";
const labelClass = "text-[13px] font-medium text-[#172B4D] dark:text-[#F1F5F9]";
const selectPanelClass = "nt-select-panel z-[200] rounded-xl border p-1 shadow-lg";
const selectItemClass = "cursor-pointer rounded-md py-2 pl-8 pr-3 text-[13px] leading-snug";
const fieldWrapClass = "min-w-0 space-y-1";

const EMPTY_ITEM_DRAFT = {
  productCode: "",
  legacyCode: "",
  itemName: "",
  packSize: "",
  uom: "",
  expiryDate: "",
  batchNumber: "",
  numberOfIfc: "",
  depotQuantity: "",
  ifcPerFullMc: "1",
  numberOfFullMc: "",
  ifcInLooseMc: "",
};

const today = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().split("T")[0];
};

export default function ReceiveFormPage({ sourceType, title }: ReceiveFormPageProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [searchParams] = useSearchParams();
  const receiptId = searchParams.get("receiptId");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [depots, setDepots] = useState<DepotOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [items, setItems] = useState<DraftItem[]>([]);

  const [form, setForm] = useState({
    receiptNumber: "",
    targetDepotId: "",
    toAddress: "",
    tfaNumber: "",
    isoNumber: "",
    shipmentMode: "",
    deliveryPerson: "",
    vehicleInfo: "",
    issuedDate: today(),
    vatNumber: "",
    remarks: "",
  });

  const [itemDraft, setItemDraft] = useState({ ...EMPTY_ITEM_DRAFT });
  const [logisticsOpen, setLogisticsOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [depotData, productData] = await Promise.all([
          apiEndpoints.depots.getAll(),
          apiEndpoints.products.getAll(),
        ]);
        if (!mounted) return;
        // Handle different response structures
        const depotsArray = Array.isArray(depotData) ? depotData : (depotData.data || []);
        const productsArray = Array.isArray(productData) ? productData : (productData.data || []);
        
        // Map to expected format
        setDepots(depotsArray.map((d: any) => ({
          id: d.id,
          code: d.code || String(d.id),
          name: d.name,
        })));
        
        setProducts(productsArray.map((p: any) => ({
          id: String(p.id),
          code: p.code || p.new_code || p.old_code || String(p.id),
          oldCode: p.old_code || "",
          newCode: p.new_code || p.code || "",
          name: p.name || "",
          packSize: p.primary_packaging || p.unit_of_measure || "",
        })));
      } catch (error) {
        console.error("Failed to load master data", error);
        toast({ title: "Unable to load master data", variant: "destructive" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [toast]);

  useEffect(() => {
    if (!receiptId) {
      setItems([]);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await apiEndpoints.productReceipts.getById(receiptId);
        if (!mounted) return;
        setForm({
          receiptNumber: data.receipt_number,
          targetDepotId: data.target_depot_id ? String(data.target_depot_id) : "",
          toAddress: data.to_address || "",
          tfaNumber: data.tfa_number || "",
          isoNumber: data.iso_number || "",
          shipmentMode: data.shipment_mode || "",
          deliveryPerson: data.delivery_person || "",
          vehicleInfo: data.vehicle_info || "",
          issuedDate: data.issued_date || today(),
          vatNumber: data.vat_number || "",
          remarks: data.remarks || "",
        });
        setItems(
          data.items.map((item: any) => ({
            key: createKey(),
            id: item.id,
            legacyCode: item.legacy_code || "",
            itemCode: item.item_code || "",
            itemName: item.item_name || "",
            packSize: item.pack_size || "",
            uom: item.uom || "",
            expiryDate: item.expiry_date || "",
            batchNumber: item.batch_number || "",
            numberOfIfc: String(item.number_of_ifc ?? ""),
            depotQuantity: String(item.depot_quantity ?? ""),
            ifcPerFullMc: String(item.ifc_per_full_mc ?? ""),
            numberOfFullMc: String(item.number_of_full_mc ?? ""),
            ifcInLooseMc: String(item.ifc_in_loose_mc ?? ""),
          }))
        );
      } catch (error) {
        console.error("Failed to load receipt", error);
        toast({ title: "Unable to load receipt", variant: "destructive" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [receiptId, toast]);

  const selectedDepot = useMemo(
    () => depots.find((depot) => String(depot.code) === form.targetDepotId || String(depot.id) === form.targetDepotId),
    [depots, form.targetDepotId],
  );

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === itemDraft.productCode || product.oldCode === itemDraft.productCode || product.newCode === itemDraft.productCode),
    [itemDraft.productCode, products],
  );

  useEffect(() => {
    if (!selectedProduct) return;
    setItemDraft((prev) => ({
      ...prev,
      productCode: selectedProduct.id,
      legacyCode: selectedProduct.oldCode || "",
      itemCode: selectedProduct.newCode || selectedProduct.code || "",
      itemName: selectedProduct.name,
      packSize: selectedProduct.packSize || "",
      uom: "IFC",
    }));
  }, [selectedProduct]);

  const handleHeaderChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddItem = () => {
    if (!itemDraft.productCode) {
      toast({ title: "Select a product first", variant: "destructive" });
      return false;
    }
    if (!itemDraft.depotQuantity) {
      toast({ title: "Enter depot quantity", variant: "destructive" });
      return false;
    }
    setItems((prev) => [
      ...prev,
      {
        key: createKey(),
        legacyCode: itemDraft.legacyCode,
        itemCode: selectedProduct?.newCode || selectedProduct?.code || "",
        itemName: itemDraft.itemName,
        packSize: itemDraft.packSize,
        uom: itemDraft.uom || "IFC",
        expiryDate: itemDraft.expiryDate,
        batchNumber: itemDraft.batchNumber,
        numberOfIfc: itemDraft.numberOfIfc || itemDraft.depotQuantity,
        depotQuantity: itemDraft.depotQuantity,
        ifcPerFullMc: itemDraft.ifcPerFullMc || "1",
        numberOfFullMc: itemDraft.numberOfFullMc || "",
        ifcInLooseMc: itemDraft.ifcInLooseMc || "",
      },
    ]);
    setItemDraft({ ...EMPTY_ITEM_DRAFT });
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

  const buildPayload = () => ({
    receipt_number: form.receiptNumber || undefined,
    source_type: sourceType,
    target_depot_id: selectedDepot ? selectedDepot.id : undefined,
    to_address: form.toAddress || undefined,
    tfa_number: form.tfaNumber || undefined,
    iso_number: form.isoNumber || undefined,
    shipment_mode: form.shipmentMode || undefined,
    delivery_person: form.deliveryPerson || undefined,
    vehicle_info: form.vehicleInfo || undefined,
    issued_date: form.issuedDate || undefined,
    vat_number: form.vatNumber || undefined,
    remarks: form.remarks || undefined,
    items: items.map((item) => ({
      id: item.id,
      legacy_code: item.legacyCode || undefined,
      item_code: item.itemCode || undefined,
      item_name: item.itemName,
      pack_size: item.packSize || undefined,
      uom: item.uom || undefined,
      expiry_date: item.expiryDate || undefined,
      batch_number: item.batchNumber || undefined,
      number_of_ifc: Number(item.numberOfIfc || 0),
      depot_quantity: Number(item.depotQuantity || 0),
      ifc_per_full_mc: Number(item.ifcPerFullMc || 0),
      number_of_full_mc: Number(item.numberOfFullMc || 0),
      ifc_in_loose_mc: Number(item.ifcInLooseMc || 0),
    })),
  });

  const handleSave = async (navigateAfter: boolean) => {
    if (!items.length) {
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      const payload = buildPayload();
      const response = receiptId
        ? await apiEndpoints.productReceipts.update(receiptId, payload)
        : await apiEndpoints.productReceipts.create(payload);
      toast({ title: "Receipt saved" });
      if (navigateAfter) {
        navigate("/receive/list");
      } else if (!receiptId) {
        navigate(`/receive/${sourceType.toLowerCase()}?receiptId=${response.id}`, { replace: true });
      }
    } catch (error: any) {
      console.error("Failed to save receipt", error);
      toast({ title: "Unable to save receipt", description: error?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!receiptId) {
      toast({ title: "Save the receipt before approval", variant: "destructive" });
      return;
    }
    try {
      await apiEndpoints.productReceipts.approve(receiptId);
      toast({ title: "Receipt approved" });
      navigate("/receive/list");
    } catch (error: any) {
      console.error("Failed to approve receipt", error);
      toast({ title: "Unable to approve receipt", description: error?.message, variant: "destructive" });
    }
  };

  const itemRows = items.map((item, index) => ({ ...item, sl: index + 1 }));
  const itemColumns: DataTableColumn<(typeof itemRows)[number]>[] = [
    { key: "sl", label: "SL", className: "w-12 tabular-nums text-[#64748B]" },
    { key: "legacyCode", label: "Legacy code", className: "font-mono text-xs" },
    { key: "itemCode", label: "Item code", className: "font-mono text-xs" },
    {
      key: "itemName",
      label: "Item name",
      render: (val) => <span className="font-medium text-[#172B4D] dark:text-[#F1F5F9]">{String(val || "—")}</span>,
    },
    { key: "packSize", label: "Pack size" },
    { key: "uom", label: "UOM" },
    { key: "expiryDate", label: "Expiry date", className: "whitespace-nowrap tabular-nums" },
    { key: "batchNumber", label: "Batch no.", className: "font-mono text-xs" },
    { key: "depotQuantity", label: "Depot qty", align: "right", className: "tabular-nums" },
    { key: "numberOfIfc", label: "No. of IFC", align: "right", className: "tabular-nums" },
    { key: "ifcPerFullMc", label: "IFC/Full MC", align: "right", className: "tabular-nums" },
    { key: "numberOfFullMc", label: "Full MC", align: "right", className: "tabular-nums" },
    { key: "ifcInLooseMc", label: "Loose MC", align: "right", className: "tabular-nums" },
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

  const sectionMotion = {
    initial: reduceMotion ? false : { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0 : 0.18 },
  };

  if (sourceType === "FACTORY" || sourceType === "DEPOT" || sourceType === "RETURN") {
    const totalDepotQty = items.reduce((sum, item) => sum + Number(item.depotQuantity || 0), 0);
    const depotOptions = depots.map((depot) => (
      <SelectItem key={depot.code} value={String(depot.id ?? depot.code)} className={selectItemClass}>
        <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#EAF2FC] text-[#0C4DA1]">
          <Warehouse className="h-3.5 w-3.5" />
        </span>
        {depot.name} ({depot.code})
      </SelectItem>
    ));

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
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Receipt</p>
                <p className="truncate font-mono text-[13px] font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                  {form.receiptNumber || "Auto-generated"}
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
                <Label className={labelClass}>{sourceType === "RETURN" ? "Return Date" : "Issued Date"}</Label>
                <Input type="date" value={form.issuedDate} onChange={(e) => handleHeaderChange("issuedDate", e.target.value)} className={cn(fieldClass, "relative overflow-hidden")} />
              </div>
              {sourceType === "FACTORY" ? (
                <>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Factory Name</Label>
                    <Input value={form.tfaNumber} onChange={(e) => handleHeaderChange("tfaNumber", e.target.value)} placeholder="Enter factory name" className={fieldClass} />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Factory Code</Label>
                    <Input value={form.isoNumber} onChange={(e) => handleHeaderChange("isoNumber", e.target.value)} placeholder="Enter factory code" className={fieldClass} />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Depot</Label>
                    <Select value={form.targetDepotId} onValueChange={(value) => handleHeaderChange("targetDepotId", value)} disabled={loading}>
                      <SelectTrigger className={fieldClass}>
                        <SelectValue placeholder="Select depot" />
                      </SelectTrigger>
                      <SelectContent className={selectPanelClass}>{depotOptions}</SelectContent>
                    </Select>
                  </div>
                </>
              ) : sourceType === "DEPOT" ? (
                <>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Source Depot</Label>
                    <Select value={form.tfaNumber} onValueChange={(value) => handleHeaderChange("tfaNumber", value)} disabled={loading}>
                      <SelectTrigger className={fieldClass}>
                        <SelectValue placeholder="Select source depot" />
                      </SelectTrigger>
                      <SelectContent className={selectPanelClass}>{depotOptions}</SelectContent>
                    </Select>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Transfer Note</Label>
                    <Input value={form.isoNumber} onChange={(e) => handleHeaderChange("isoNumber", e.target.value)} placeholder="Enter transfer note number" className={fieldClass} />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Target Depot</Label>
                    <Select value={form.targetDepotId} onValueChange={(value) => handleHeaderChange("targetDepotId", value)} disabled={loading}>
                      <SelectTrigger className={fieldClass}>
                        <SelectValue placeholder="Select target depot" />
                      </SelectTrigger>
                      <SelectContent className={selectPanelClass}>{depotOptions}</SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Return From</Label>
                    <Input value={form.tfaNumber} onChange={(e) => handleHeaderChange("tfaNumber", e.target.value)} placeholder="Enter return source" className={fieldClass} />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Invoice Number</Label>
                    <Input value={form.isoNumber} onChange={(e) => handleHeaderChange("isoNumber", e.target.value)} placeholder="Enter original invoice number" className={fieldClass} />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Depot</Label>
                    <Select value={form.targetDepotId} onValueChange={(value) => handleHeaderChange("targetDepotId", value)} disabled={loading}>
                      <SelectTrigger className={fieldClass}>
                        <SelectValue placeholder="Select depot" />
                      </SelectTrigger>
                      <SelectContent className={selectPanelClass}>{depotOptions}</SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            <div
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
                logisticsOpen ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="border-t border-[#E3EAF3] pt-3 dark:border-[#2C3B50]">
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                    {sourceType === "FACTORY" ? (
                      <>
                        <div className={fieldWrapClass}>
                          <Label className={labelClass}>Shipment Mode</Label>
                          <Input value={form.shipmentMode} onChange={(e) => handleHeaderChange("shipmentMode", e.target.value)} className={fieldClass} />
                        </div>
                        <div className={fieldWrapClass}>
                          <Label className={labelClass}>Delivery Person</Label>
                          <Input value={form.deliveryPerson} onChange={(e) => handleHeaderChange("deliveryPerson", e.target.value)} className={fieldClass} />
                        </div>
                      </>
                    ) : sourceType === "DEPOT" ? (
                      <div className={fieldWrapClass}>
                        <Label className={labelClass}>Driver Name</Label>
                        <Input value={form.deliveryPerson} onChange={(e) => handleHeaderChange("deliveryPerson", e.target.value)} className={fieldClass} />
                      </div>
                    ) : (
                      <>
                        <div className={fieldWrapClass}>
                          <Label className={labelClass}>Return Reason</Label>
                          <Input value={form.shipmentMode} onChange={(e) => handleHeaderChange("shipmentMode", e.target.value)} placeholder="Enter return reason" className={fieldClass} />
                        </div>
                        <div className={fieldWrapClass}>
                          <Label className={labelClass}>Received By</Label>
                          <Input value={form.deliveryPerson} onChange={(e) => handleHeaderChange("deliveryPerson", e.target.value)} className={fieldClass} />
                        </div>
                      </>
                    )}
                    <div className={fieldWrapClass}>
                      <Label className={labelClass}>Vehicle / Truck Number</Label>
                      <Input value={form.vehicleInfo} onChange={(e) => handleHeaderChange("vehicleInfo", e.target.value)} className={fieldClass} />
                    </div>
                    <div className={fieldWrapClass}>
                      <Label className={labelClass}>VAT Number</Label>
                      <Input value={form.vatNumber} onChange={(e) => handleHeaderChange("vatNumber", e.target.value)} className={fieldClass} />
                    </div>
                    <div className={fieldWrapClass}>
                      <Label className={labelClass}>Remarks</Label>
                      <Input value={form.remarks} onChange={(e) => handleHeaderChange("remarks", e.target.value)} className={fieldClass} />
                    </div>
                    <div className={fieldWrapClass}>
                      <Label className={labelClass}>Address / To</Label>
                      <Input value={form.toAddress} onChange={(e) => handleHeaderChange("toAddress", e.target.value)} className={fieldClass} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.form>

          <motion.div {...sectionMotion} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <DataTable
              className="min-h-0 min-w-0 flex-1 overflow-hidden"
              title="Receipt items"
              description={`${items.length} item${items.length === 1 ? "" : "s"} · Depot qty ${totalDepotQty}`}
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
            <Button type="button" variant="ntSecondary" disabled={saving || loading} onClick={() => handleSave(false)}>
              Save draft
            </Button>
            <Button type="button" variant="ntSecondary" disabled={saving || loading} onClick={() => handleSave(true)}>
              Save & Close
            </Button>
            {sourceType === "RETURN" && (
              <Button type="button" variant="ntSecondary" disabled={!receiptId || saving || loading}>
                Generate Invoice
              </Button>
            )}
            <Button type="button" variant="ntPrimary" disabled={!receiptId || saving || loading} onClick={handleApprove}>
              Approve
            </Button>
          </div>
        </div>

        <Dialog
          open={itemModalOpen}
          onOpenChange={(open) => {
            setItemModalOpen(open);
            if (!open) setItemDraft({ ...EMPTY_ITEM_DRAFT });
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
                  <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">Add receipt item</DialogTitle>
                  <DialogDescription className="text-sm text-[#64748B] dark:text-[#A9B8CC]">
                    Select products, batches, and packaging quantities.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="nt-form nt-form-compact min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-3">
              <section>
                <div className="mb-2">
                  <h3 className="text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">Item editor</h3>
                  <p className="text-xs text-[#64748B] dark:text-[#A9B8CC]">Product identification, batch, and packaging.</p>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className={cn(fieldWrapClass, "sm:col-span-2")}>
                    <Label className={labelClass}>Product</Label>
                    <Select value={itemDraft.productCode} onValueChange={(value) => setItemDraft((prev) => ({ ...prev, productCode: value }))} disabled={loading}>
                      <SelectTrigger className={cn("w-full", fieldClass)}>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent className={selectPanelClass}>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id} className={selectItemClass}>
                            {product.oldCode || ""} / {product.newCode || product.code || ""} — {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Item Name</Label>
                    <Input value={itemDraft.itemName} readOnly placeholder="Item Name" className={cn("w-full", fieldClass)} />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Pack Size</Label>
                    <Input value={itemDraft.packSize} readOnly placeholder="Pack Size" className={cn("w-full", fieldClass)} />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Batch Number</Label>
                    <Input value={itemDraft.batchNumber} onChange={(e) => setItemDraft((prev) => ({ ...prev, batchNumber: e.target.value }))} className={cn("w-full", fieldClass)} />
                  </div>
                  <div className={cn(fieldWrapClass, "nt-date-field relative")}>
                    <Label className={labelClass}>Expiry Date</Label>
                    <Input type="date" value={itemDraft.expiryDate} onChange={(e) => setItemDraft((prev) => ({ ...prev, expiryDate: e.target.value }))} className={cn("w-full relative overflow-hidden", fieldClass)} />
                  </div>
                </div>
              </section>

              <section className="mt-3 border-t border-[#E3EAF3] pt-3 dark:border-[#2C3B50]">
                <h3 className="mb-2 text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">Quantities and packaging</h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Depot Quantity</Label>
                    <Input value={itemDraft.depotQuantity} onChange={(e) => setItemDraft((prev) => ({ ...prev, depotQuantity: e.target.value }))} placeholder="0" className={cn("w-full", fieldClass)} />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>No. of IFC</Label>
                    <Input value={itemDraft.numberOfIfc} onChange={(e) => setItemDraft((prev) => ({ ...prev, numberOfIfc: e.target.value }))} placeholder="0" className={cn("w-full", fieldClass)} />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>IFC per Full MC</Label>
                    <Input value={itemDraft.ifcPerFullMc} onChange={(e) => setItemDraft((prev) => ({ ...prev, ifcPerFullMc: e.target.value }))} placeholder="1" className={cn("w-full", fieldClass)} />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>No. of Full MC</Label>
                    <Input value={itemDraft.numberOfFullMc} onChange={(e) => setItemDraft((prev) => ({ ...prev, numberOfFullMc: e.target.value }))} placeholder="0" className={cn("w-full", fieldClass)} />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>IFC in Loose MC</Label>
                    <Input value={itemDraft.ifcInLooseMc} onChange={(e) => setItemDraft((prev) => ({ ...prev, ifcInLooseMc: e.target.value }))} placeholder="0" className={cn("w-full", fieldClass)} />
                  </div>
                </div>
              </section>
            </div>

            <DialogFooter className="shrink-0 flex-col gap-2 border-t border-[#E3EAF3] px-5 py-3 sm:flex-row sm:justify-end dark:border-[#2C3B50]">
              <Button
                type="button"
                variant="ntSecondary"
                onClick={() => {
                  setItemDraft({ ...EMPTY_ITEM_DRAFT });
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

  return (
    <main className="p-6 space-y-6">
      <PageHeader
        title={title}
        subtitle="Record product receipts and generate printable reports."
        icon={PackagePlus}
        variant="blue"
      />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Receipt details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {sourceType === "FACTORY" && (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Receipt number</Label>
                  <Input value={form.receiptNumber} onChange={(e) => handleHeaderChange("receiptNumber", e.target.value)} placeholder="Auto-generated" />
                </div>
                <div className="space-y-2">
                  <Label>Issued date</Label>
                  <Input type="date" value={form.issuedDate} onChange={(e) => handleHeaderChange("issuedDate", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Factory Name</Label>
                  <Input value={form.tfaNumber} onChange={(e) => handleHeaderChange("tfaNumber", e.target.value)} placeholder="Enter factory name" />
                </div>
                <div className="space-y-2">
                  <Label>Factory Code</Label>
                  <Input value={form.isoNumber} onChange={(e) => handleHeaderChange("isoNumber", e.target.value)} placeholder="Enter factory code" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Depot</Label>
                  <Select value={form.targetDepotId} onValueChange={(value) => handleHeaderChange("targetDepotId", value)} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select depot" />
                    </SelectTrigger>
                    <SelectContent>
                      {depots.map((depot) => (
                        <SelectItem key={depot.code} value={String(depot.id ?? depot.code)}>
                          {depot.name} ({depot.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Shipment mode</Label>
                  <Input value={form.shipmentMode} onChange={(e) => handleHeaderChange("shipmentMode", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Delivery person</Label>
                  <Input value={form.deliveryPerson} onChange={(e) => handleHeaderChange("deliveryPerson", e.target.value)} />
                </div>
              </div>
            </>
          )}
          {sourceType === "DEPOT" && (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Receipt number</Label>
                  <Input value={form.receiptNumber} onChange={(e) => handleHeaderChange("receiptNumber", e.target.value)} placeholder="Auto-generated" />
                </div>
                <div className="space-y-2">
                  <Label>Issued date</Label>
                  <Input type="date" value={form.issuedDate} onChange={(e) => handleHeaderChange("issuedDate", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Source Depot</Label>
                  <Select value={form.tfaNumber} onValueChange={(value) => handleHeaderChange("tfaNumber", value)} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source depot" />
                    </SelectTrigger>
                    <SelectContent>
                      {depots.map((depot) => (
                        <SelectItem key={depot.code} value={String(depot.id ?? depot.code)}>
                          {depot.name} ({depot.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Transfer Note</Label>
                  <Input value={form.isoNumber} onChange={(e) => handleHeaderChange("isoNumber", e.target.value)} placeholder="Enter transfer note number" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Target Depot</Label>
                  <Select value={form.targetDepotId} onValueChange={(value) => handleHeaderChange("targetDepotId", value)} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target depot" />
                    </SelectTrigger>
                    <SelectContent>
                      {depots.map((depot) => (
                        <SelectItem key={depot.code} value={String(depot.id ?? depot.code)}>
                          {depot.name} ({depot.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Vehicle / Truck no.</Label>
                  <Input value={form.vehicleInfo} onChange={(e) => handleHeaderChange("vehicleInfo", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Driver Name</Label>
                  <Input value={form.deliveryPerson} onChange={(e) => handleHeaderChange("deliveryPerson", e.target.value)} />
                </div>
              </div>
            </>
          )}
          {sourceType === "RETURN" && (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Receipt number</Label>
                  <Input value={form.receiptNumber} onChange={(e) => handleHeaderChange("receiptNumber", e.target.value)} placeholder="Auto-generated" />
                </div>
                <div className="space-y-2">
                  <Label>Return date</Label>
                  <Input type="date" value={form.issuedDate} onChange={(e) => handleHeaderChange("issuedDate", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Return From</Label>
                  <Input value={form.tfaNumber} onChange={(e) => handleHeaderChange("tfaNumber", e.target.value)} placeholder="Enter return source" />
                </div>
                <div className="space-y-2">
                  <Label>Invoice Number</Label>
                  <Input value={form.isoNumber} onChange={(e) => handleHeaderChange("isoNumber", e.target.value)} placeholder="Enter original invoice number" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Depot</Label>
                  <Select value={form.targetDepotId} onValueChange={(value) => handleHeaderChange("targetDepotId", value)} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select depot" />
                    </SelectTrigger>
                    <SelectContent>
                      {depots.map((depot) => (
                        <SelectItem key={depot.code} value={String(depot.id ?? depot.code)}>
                          {depot.name} ({depot.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Return Reason</Label>
                  <Input value={form.shipmentMode} onChange={(e) => handleHeaderChange("shipmentMode", e.target.value)} placeholder="Enter return reason" />
                </div>
                <div className="space-y-2">
                  <Label>Received By</Label>
                  <Input value={form.deliveryPerson} onChange={(e) => handleHeaderChange("deliveryPerson", e.target.value)} />
                </div>
              </div>
            </>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Vehicle / Truck no.</Label>
              <Input value={form.vehicleInfo} onChange={(e) => handleHeaderChange("vehicleInfo", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>VAT number</Label>
              <Input value={form.vatNumber} onChange={(e) => handleHeaderChange("vatNumber", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Input value={form.remarks} onChange={(e) => handleHeaderChange("remarks", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Address / To</Label>
            <Textarea value={form.toAddress} onChange={(e) => handleHeaderChange("toAddress", e.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Add items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={itemDraft.productCode} onValueChange={(value) => setItemDraft((prev) => ({ ...prev, productCode: value }))} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.oldCode || ""} / {product.newCode || product.code || ""} — {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Batch number</Label>
              <Input value={itemDraft.batchNumber} onChange={(e) => setItemDraft((prev) => ({ ...prev, batchNumber: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Expiry date</Label>
              <Input type="date" value={itemDraft.expiryDate} onChange={(e) => setItemDraft((prev) => ({ ...prev, expiryDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Depot quantity</Label>
              <Input value={itemDraft.depotQuantity} onChange={(e) => setItemDraft((prev) => ({ ...prev, depotQuantity: e.target.value }))} placeholder="0" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>No. of IFC</Label>
              <Input value={itemDraft.numberOfIfc} onChange={(e) => setItemDraft((prev) => ({ ...prev, numberOfIfc: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>IFC per full MC</Label>
              <Input value={itemDraft.ifcPerFullMc} onChange={(e) => setItemDraft((prev) => ({ ...prev, ifcPerFullMc: e.target.value }))} placeholder="1" />
            </div>
            <div className="space-y-2">
              <Label>No. of full MC</Label>
              <Input value={itemDraft.numberOfFullMc} onChange={(e) => setItemDraft((prev) => ({ ...prev, numberOfFullMc: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>IFC in loose MC</Label>
              <Input value={itemDraft.ifcInLooseMc} onChange={(e) => setItemDraft((prev) => ({ ...prev, ifcInLooseMc: e.target.value }))} placeholder="0" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={handleAddItem}>Add item</Button>
          </div>

          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow className="uppercase text-xs text-muted-foreground">
                  <TableHead className="w-12">SL</TableHead>
                  <TableHead>Legacy code</TableHead>
                  <TableHead>Item code</TableHead>
                  <TableHead>Item name</TableHead>
                  <TableHead>Pack size</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead>Expiry date</TableHead>
                  <TableHead>Batch no.</TableHead>
                  <TableHead className="text-right">Depot qty</TableHead>
                  <TableHead className="text-right">No. of IFC</TableHead>
                  <TableHead className="text-right">IFC/Full MC</TableHead>
                  <TableHead className="text-right">Full MC</TableHead>
                  <TableHead className="text-right">Loose MC</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="py-6 text-center text-sm text-muted-foreground">
                      No items added yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => (
                    <TableRow key={item.key} className="text-sm">
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{item.legacyCode}</TableCell>
                      <TableCell>{item.itemCode}</TableCell>
                      <TableCell className="font-medium text-foreground">{item.itemName}</TableCell>
                      <TableCell>{item.packSize}</TableCell>
                      <TableCell>{item.uom}</TableCell>
                      <TableCell>{item.expiryDate || "—"}</TableCell>
                      <TableCell>{item.batchNumber || "—"}</TableCell>
                      <TableCell className="text-right">{item.depotQuantity}</TableCell>
                      <TableCell className="text-right">{item.numberOfIfc}</TableCell>
                      <TableCell className="text-right">{item.ifcPerFullMc}</TableCell>
                      <TableCell className="text-right">{item.numberOfFullMc}</TableCell>
                      <TableCell className="text-right">{item.ifcInLooseMc}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.key)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" disabled={saving || loading} onClick={() => handleSave(false)}>
          Save draft
        </Button>
        <Button variant="outline" disabled={saving || loading} onClick={() => handleSave(true)}>
          Save & Close
        </Button>
        {sourceType === "RETURN" && (
          <Button variant="outline" disabled={!receiptId || saving || loading}>
            Generate Invoice
          </Button>
        )}
        <Button disabled={!receiptId || saving || loading} onClick={handleApprove}>
          Approve
        </Button>
      </div>
    </main>
  );
}
