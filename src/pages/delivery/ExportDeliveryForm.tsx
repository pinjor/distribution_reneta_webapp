import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, PackagePlus, Trash2 } from "lucide-react";
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

interface ExportItem {
  key: string;
  productId: string;
  productName: string;
  oldCode?: string;
  newCode?: string;
  batchNumber: string;
  expiryDate: string;
  quantity: string;
  unitPrice: string;
  hsnCode: string;
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
  hsnCode: "",
};

export default function ExportDeliveryForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logisticsOpen, setLogisticsOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [items, setItems] = useState<ExportItem[]>([]);

  const [form, setForm] = useState({
    deliveryNumber: "",
    deliveryDate: new Date().toISOString().split("T")[0],
    destinationCountry: "",
    portOfLoading: "",
    portOfDischarge: "",
    shippingLine: "",
    containerNumber: "",
    blNumber: "",
    invoiceNumber: "",
    lcNumber: "",
    incoterms: "",
    paymentTerms: "",
    remarks: "",
  });

  const [itemDraft, setItemDraft] = useState({ ...EMPTY_ITEM_DRAFT });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const productsRes = await apiEndpoints.products.getAll();
      const allProducts = Array.isArray(productsRes) ? productsRes : productsRes.data || [];

      const exportProducts = allProducts.filter((product: any) => {
        const isExport =
          product.product_type_export === true || product.product_type_export === "true" || product.product_type_export === 1;
        return isExport;
      });

      setProducts(exportProducts);

      if (exportProducts.length === 0) {
        console.warn("No export products found. Total products:", allProducts.length);
        console.log("Sample product:", allProducts[0]);
      }
    } catch (error) {
      console.error("Failed to load products", error);
      toast({ title: "Unable to load products", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find((p) => String(p.id) === String(itemDraft.productId));

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
      toast({ title: "Select a product", variant: "destructive" });
      return false;
    }

    setItems((prev) => [
      ...prev,
      {
        key: createKey(),
        productId: itemDraft.productId,
        productName: product.name,
        oldCode: product.oldCode,
        newCode: product.newCode || product.code,
        batchNumber: itemDraft.batchNumber,
        expiryDate: itemDraft.expiryDate,
        quantity: itemDraft.quantity,
        unitPrice: itemDraft.unitPrice || "0",
        hsnCode: itemDraft.hsnCode || product.hsn_code || "",
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

  const handleSubmit = async () => {
    if (!form.destinationCountry || !form.portOfLoading || !form.portOfDischarge) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        delivery_type: "export",
        delivery_number: form.deliveryNumber || `EX-${Date.now()}`,
        delivery_date: form.deliveryDate,
        destination_country: form.destinationCountry,
        port_of_loading: form.portOfLoading,
        port_of_discharge: form.portOfDischarge,
        shipping_line: form.shippingLine,
        container_number: form.containerNumber,
        bl_number: form.blNumber,
        invoice_number: form.invoiceNumber,
        lc_number: form.lcNumber,
        incoterms: form.incoterms,
        payment_terms: form.paymentTerms,
        remarks: form.remarks,
        items: items.map((item) => ({
          product_id: parseInt(item.productId),
          batch_number: item.batchNumber,
          expiry_date: item.expiryDate,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unitPrice || "0"),
          hsn_code: item.hsnCode,
        })),
      };

      await apiEndpoints.orderDeliveries.create(payload);

      toast({ title: "Export delivery created successfully" });
      navigate("/delivery/export");
    } catch (error: any) {
      console.error("Failed to create export delivery", error);
      toast({ title: "Unable to create delivery", description: error?.message, variant: "destructive" });
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
    { key: "hsnCode", label: "HSN code", className: "font-mono text-xs", render: (val) => String(val || "—") },
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
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Delivery</p>
              <p className="truncate font-mono text-[13px] font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                {form.deliveryNumber || "Auto-generated"}
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
              <Label className={labelClass}>Delivery Date</Label>
              <Input
                type="date"
                value={form.deliveryDate}
                onChange={(e) => setForm((prev) => ({ ...prev, deliveryDate: e.target.value }))}
                className={cn(fieldClass, "relative overflow-hidden")}
              />
            </div>
            <div className={fieldWrapClass}>
              <Label className={labelClass}>Destination Country</Label>
              <Input
                value={form.destinationCountry}
                onChange={(e) => setForm((prev) => ({ ...prev, destinationCountry: e.target.value }))}
                placeholder="e.g., USA, UK, Germany"
                className={fieldClass}
              />
            </div>
            <div className={fieldWrapClass}>
              <Label className={labelClass}>Port of Loading</Label>
              <Input
                value={form.portOfLoading}
                onChange={(e) => setForm((prev) => ({ ...prev, portOfLoading: e.target.value }))}
                placeholder="e.g., Mumbai, Chennai"
                className={fieldClass}
              />
            </div>
            <div className={fieldWrapClass}>
              <Label className={labelClass}>Port of Discharge</Label>
              <Input
                value={form.portOfDischarge}
                onChange={(e) => setForm((prev) => ({ ...prev, portOfDischarge: e.target.value }))}
                placeholder="e.g., Los Angeles, London"
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
                    <Label className={labelClass}>Delivery Number</Label>
                    <Input
                      value={form.deliveryNumber}
                      onChange={(e) => setForm((prev) => ({ ...prev, deliveryNumber: e.target.value }))}
                      placeholder="Auto-generated if left empty"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Shipping Line</Label>
                    <Input
                      value={form.shippingLine}
                      onChange={(e) => setForm((prev) => ({ ...prev, shippingLine: e.target.value }))}
                      placeholder="e.g., Maersk Line, CMA CGM"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Container Number</Label>
                    <Input
                      value={form.containerNumber}
                      onChange={(e) => setForm((prev) => ({ ...prev, containerNumber: e.target.value }))}
                      placeholder="Container number"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>B/L Number</Label>
                    <Input
                      value={form.blNumber}
                      onChange={(e) => setForm((prev) => ({ ...prev, blNumber: e.target.value }))}
                      placeholder="Bill of Lading number"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Invoice Number</Label>
                    <Input
                      value={form.invoiceNumber}
                      onChange={(e) => setForm((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
                      placeholder="Commercial invoice number"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>L/C Number</Label>
                    <Input
                      value={form.lcNumber}
                      onChange={(e) => setForm((prev) => ({ ...prev, lcNumber: e.target.value }))}
                      placeholder="Letter of Credit number"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Incoterms</Label>
                    <Select value={form.incoterms || undefined} onValueChange={(value) => setForm((prev) => ({ ...prev, incoterms: value }))}>
                      <SelectTrigger className={fieldClass}>
                        <SelectValue placeholder="Select incoterms" />
                      </SelectTrigger>
                      <SelectContent className={selectPanelClass}>
                        <SelectItem value="FOB" className={selectItemClass}>
                          FOB (Free On Board)
                        </SelectItem>
                        <SelectItem value="CIF" className={selectItemClass}>
                          CIF (Cost, Insurance & Freight)
                        </SelectItem>
                        <SelectItem value="CFR" className={selectItemClass}>
                          CFR (Cost and Freight)
                        </SelectItem>
                        <SelectItem value="EXW" className={selectItemClass}>
                          EXW (Ex Works)
                        </SelectItem>
                        <SelectItem value="DDP" className={selectItemClass}>
                          DDP (Delivered Duty Paid)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Payment Terms</Label>
                    <Select value={form.paymentTerms || undefined} onValueChange={(value) => setForm((prev) => ({ ...prev, paymentTerms: value }))}>
                      <SelectTrigger className={fieldClass}>
                        <SelectValue placeholder="Select payment terms" />
                      </SelectTrigger>
                      <SelectContent className={selectPanelClass}>
                        <SelectItem value="LC" className={selectItemClass}>
                          Letter of Credit
                        </SelectItem>
                        <SelectItem value="TT" className={selectItemClass}>
                          Telegraphic Transfer
                        </SelectItem>
                        <SelectItem value="DP" className={selectItemClass}>
                          Documents Against Payment
                        </SelectItem>
                        <SelectItem value="DA" className={selectItemClass}>
                          Documents Against Acceptance
                        </SelectItem>
                        <SelectItem value="Advance" className={selectItemClass}>
                          Advance Payment
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={cn(fieldWrapClass, "xl:col-span-2")}>
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
            title="Export items"
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
          <Button type="button" variant="ntSecondary" onClick={() => navigate("/delivery/export")}>
            Cancel
          </Button>
          <Button type="button" variant="ntPrimary" disabled={saving || items.length === 0} onClick={handleSubmit}>
            {saving ? "Saving..." : "Create Export"}
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
                <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">Add export item</DialogTitle>
                <DialogDescription className="text-sm text-[#64748B] dark:text-[#A9B8CC]">
                  Select product, batch, quantity, unit price, and HSN code.
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
                  onValueChange={(value) => setItemDraft((prev) => ({ ...prev, productId: value }))}
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
                      products.map((product) => (
                        <SelectItem key={product.id} value={String(product.id)} className={selectItemClass}>
                          {product.oldCode || ""} / {product.newCode || product.code || ""} — {product.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className={fieldWrapClass}>
                <Label className={labelClass}>Batch Number</Label>
                <Input
                  value={itemDraft.batchNumber}
                  onChange={(e) => setItemDraft((prev) => ({ ...prev, batchNumber: e.target.value }))}
                  placeholder="Enter batch"
                  className={cn("w-full", fieldClass)}
                />
              </div>
              <div className={cn(fieldWrapClass, "nt-date-field relative")}>
                <Label className={labelClass}>Expiry Date</Label>
                <Input
                  type="date"
                  value={itemDraft.expiryDate}
                  onChange={(e) => setItemDraft((prev) => ({ ...prev, expiryDate: e.target.value }))}
                  className={cn("w-full relative overflow-hidden", fieldClass)}
                />
              </div>
              <div className={fieldWrapClass}>
                <Label className={labelClass}>Quantity</Label>
                <Input
                  type="number"
                  value={itemDraft.quantity}
                  onChange={(e) => setItemDraft((prev) => ({ ...prev, quantity: e.target.value }))}
                  placeholder="0"
                  min="1"
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
              <div className={cn(fieldWrapClass, "sm:col-span-2")}>
                <Label className={labelClass}>HSN Code</Label>
                <Input
                  value={itemDraft.hsnCode}
                  onChange={(e) => setItemDraft((prev) => ({ ...prev, hsnCode: e.target.value }))}
                  placeholder="Enter HSN code"
                  className={cn("w-full", fieldClass)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 flex-col gap-2 border-t border-[#E3EAF3] px-5 py-3 sm:flex-row sm:justify-end dark:border-[#2C3B50]">
            <Button type="button" variant="ntSecondary" onClick={() => { setItemDraft({ ...EMPTY_ITEM_DRAFT }); setItemModalOpen(false); }}>
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
