import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, PlusCircle, Trash2, Loader2, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import {
  canShowDraftEdit,
  decimalInput,
  formatApiError,
  isNonDraftUpdateConflict,
  toDateInput,
} from "@/lib/draftDocumentUi";
import { DraftEditConflict } from "@/pages/delivery/DraftEditConflict";
import { DraftUnsavedChangesDialog } from "@/pages/delivery/DraftUnsavedChangesDialog";
import { useDraftCapabilities } from "@/hooks/useDraftCapabilities";
import { useUnsavedDraftGuard } from "@/hooks/useUnsavedDraftGuard";
import {
  EXPORT_LINE_FIELDS,
  captureDraftFormSnapshot,
  isDraftFormDirty,
} from "@/lib/draftFormSnapshot";

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

export default function ExportDeliveryForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { toast } = useToast();
  const { user } = useAuth();
  const capabilities = useDraftCapabilities();
  const [loading, setLoading] = useState(false);
  const [loadingDocument, setLoadingDocument] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [items, setItems] = useState<ExportItem[]>([]);
  const [depotId, setDepotId] = useState<number | null>(null);

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

  const [itemDraft, setItemDraft] = useState({
    productId: "",
    batchNumber: "",
    expiryDate: "",
    quantity: "",
    unitPrice: "",
    hsnCode: "",
  });

  const listPath = "/delivery/export";
  const detailPath = id ? `${listPath}/${id}` : listPath;

  const snapshot = useMemo(
    () => captureDraftFormSnapshot(form, items, EXPORT_LINE_FIELDS),
    [form, items]
  );
  const [baseline, setBaseline] = useState<string | null>(null);
  useEffect(() => {
    if (capabilities.loading || (isEdit && loadingDocument)) return;
    if (baseline === null) setBaseline(snapshot);
  }, [capabilities.loading, isEdit, loadingDocument, snapshot, baseline]);
  const isDirty = isDraftFormDirty(snapshot, baseline);
  const guard = useUnsavedDraftGuard(isDirty);

  const applyDocument = (row: any) => {
    setDepotId(row.depot_id ?? null);
    setForm({
      deliveryNumber: row.delivery_number || "",
      deliveryDate: toDateInput(row.delivery_date) || new Date().toISOString().split("T")[0],
      destinationCountry: row.destination_country || "",
      portOfLoading: row.port_of_loading || "",
      portOfDischarge: row.port_of_discharge || "",
      shippingLine: row.shipping_line || "",
      containerNumber: row.container_number || "",
      blNumber: row.bl_number || "",
      invoiceNumber: row.invoice_number || "",
      lcNumber: row.lc_number || "",
      incoterms: row.incoterms || "",
      paymentTerms: row.payment_terms || "",
      remarks: row.remarks || "",
    });
    setItems(
      (row.items || []).map((item: any) => ({
        key: createKey(),
        productId: String(item.product_id),
        productName: item.product_name || `Product ${item.product_id}`,
        oldCode: "",
        newCode: "",
        batchNumber: item.batch_number || "",
        expiryDate: toDateInput(item.expiry_date),
        quantity: decimalInput(item.quantity),
        unitPrice: decimalInput(item.unit_price || "0"),
        hsnCode: item.hsn_code || "",
      }))
    );
  };

  const fetchDocument = async () => {
    if (!id) return;
    try {
      setLoadingDocument(true);
      setLoadError(null);
      setBlockedReason(null);
      setConflictMessage(null);
      const row = await apiEndpoints.exportDeliveries.getById(id);
      if (row.status !== "Draft") {
        setBlockedReason("Only Draft documents can be edited.");
        setDepotId(row.depot_id ?? null);
        return;
      }
      if (!canShowDraftEdit(capabilities.export.can_edit, row.status)) {
        setBlockedReason("Editing is currently unavailable.");
        applyDocument(row);
        return;
      }
      applyDocument(row);
    } catch (error: any) {
      setLoadError(formatApiError(error, "Unable to load delivery details"));
    } finally {
      setLoadingDocument(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (capabilities.loading) return;
    if (isEdit) {
      fetchDocument();
      return;
    }
    if (!capabilities.export.can_create) {
      setBlockedReason("Draft creation is currently unavailable.");
    } else {
      setBlockedReason(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, capabilities.loading, capabilities.export.can_create, capabilities.export.can_edit]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const productsRes = await apiEndpoints.products.getAll();
      // API returns array directly, not wrapped in .data
      const allProducts = Array.isArray(productsRes) ? productsRes : (productsRes.data || []);
      
      // Filter only export products
      const exportProducts = allProducts.filter((product: any) => {
        // Check the product_type_export field (boolean)
        const isExport = product.product_type_export === true || 
                        product.product_type_export === "true" || 
                        product.product_type_export === 1;
        return isExport;
      });
      
      setProducts(exportProducts);
      
      if (exportProducts.length === 0) {
        toast({
          title: "No export products",
          description: "No products are flagged as export in master data. The catalog is empty until those flags are set.",
        });
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
      return;
    }
    if (!itemDraft.quantity || Number(itemDraft.quantity) <= 0) {
      toast({ title: "Enter valid quantity", variant: "destructive" });
      return;
    }
    if (itemDraft.unitPrice !== "" && Number(itemDraft.unitPrice) < 0) {
      toast({ title: "Unit price cannot be negative", variant: "destructive" });
      return;
    }
    if (!selectedProduct) {
      toast({ title: "Select a product", variant: "destructive" });
      return;
    }

    const product = selectedProduct;
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

    setItemDraft({
      productId: "",
      batchNumber: "",
      expiryDate: "",
      quantity: "",
      unitPrice: "",
      hsnCode: "",
    });
  };

  const handleRemoveItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  const handleLineChange = (key: string, field: "quantity" | "unitPrice", value: string) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!form.destinationCountry || !form.portOfLoading || !form.portOfDischarge) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }
    if (items.some((item) => item.unitPrice !== "" && Number(item.unitPrice) < 0)) {
      toast({ title: "Unit price cannot be negative", variant: "destructive" });
      return;
    }
    if (items.some((item) => !item.quantity || Number(item.quantity) <= 0)) {
      toast({ title: "Enter valid quantity", variant: "destructive" });
      return;
    }
    const writeDepotId = isEdit ? depotId : user?.depot_id;
    if (!writeDepotId) {
      toast({
        title: "No depot assignment",
        description: "A depot is required to save an Export draft. The form will not choose a depot for you.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      setConflictMessage(null);
      const payload = {
        delivery_number: form.deliveryNumber || undefined,
        depot_id: writeDepotId,
        delivery_date: form.deliveryDate,
        destination_country: form.destinationCountry,
        port_of_loading: form.portOfLoading,
        port_of_discharge: form.portOfDischarge,
        shipping_line: form.shippingLine || null,
        container_number: form.containerNumber || null,
        bl_number: form.blNumber || null,
        invoice_number: form.invoiceNumber || null,
        lc_number: form.lcNumber || null,
        incoterms: form.incoterms || null,
        payment_terms: form.paymentTerms || null,
        remarks: form.remarks || null,
        items: items.map((item) => ({
          product_id: parseInt(item.productId, 10),
          batch_number: item.batchNumber || null,
          expiry_date: item.expiryDate || null,
          quantity: item.quantity,
          unit_price: item.unitPrice || "0",
          hsn_code: item.hsnCode || null,
        })),
      };

      if (isEdit && id) {
        const updated = await apiEndpoints.exportDeliveries.update(id, payload);
        toast({
          title: "Export delivery updated",
          description: `Draft ${updated.delivery_number} saved.`,
        });
        guard.allowNextNavigation();
        navigate(detailPath);
        return;
      }

      const created = await apiEndpoints.exportDeliveries.create(payload);
      toast({
        title: "Export delivery created",
        description: `Draft ${created.delivery_number} saved.`,
      });
      guard.allowNextNavigation();
      navigate(listPath);
    } catch (error: any) {
      console.error("Failed to save export delivery", error);
      if (isNonDraftUpdateConflict(error)) {
        setConflictMessage(formatApiError(error, "Only Draft documents can be updated"));
        toast({
          title: "Document is no longer editable",
          description: formatApiError(error),
          variant: "destructive",
        });
        return;
      }
      const title = error?.status === 403 ? "You do not have permission to save" : isEdit ? "Unable to update delivery" : "Unable to create delivery";
      toast({ title, description: formatApiError(error), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const totalAmount = items.reduce((sum, item) => {
    return sum + parseFloat(item.quantity || "0") * parseFloat(item.unitPrice || "0");
  }, 0);
  const formLocked = Boolean(conflictMessage || blockedReason);

  if (capabilities.loading || (isEdit && loadingDocument)) {
    return (
      <main className="p-6">
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">
              {isEdit ? "Loading delivery details..." : "Checking permissions..."}
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (isEdit && loadError) {
    return (
      <main className="p-6 space-y-4">
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">{loadError}</CardContent>
        </Card>
        <Button variant="outline" onClick={fetchDocument}>Retry</Button>
        <Button variant="outline" onClick={() => navigate(listPath)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <PageHeader
        title={isEdit ? "Edit Export Delivery" : "Create Export Delivery"}
        subtitle={
          isEdit
            ? "Update this Draft. Submitted, Approved, and Rejected documents cannot be changed."
            : "Create a new international export delivery with shipping documentation"
        }
        icon={Globe}
        variant="teal"
        actions={(
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(isEdit ? detailPath : listPath)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
      />

      {conflictMessage && (
        <DraftEditConflict
          message={conflictMessage}
          onReload={() =>
            guard.confirmOrRun(() => {
              setBaseline(null);
              fetchDocument();
            })
          }
          onBack={() => navigate(detailPath)}
        />
      )}
      {blockedReason && (
        <Card>
          <CardContent className="py-4 space-y-3">
            <p>{blockedReason}</p>
            <Button type="button" variant="outline" onClick={() => navigate(detailPath || listPath)}>
              Back to Detail
            </Button>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deliveryNumber">Delivery Number</Label>
                  <Input
                    id="deliveryNumber"
                    value={form.deliveryNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, deliveryNumber: e.target.value }))}
                    placeholder="Auto-generated if left empty"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliveryDate">Delivery Date *</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={form.deliveryDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, deliveryDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destinationCountry">Destination Country *</Label>
                  <Input
                    id="destinationCountry"
                    value={form.destinationCountry}
                    onChange={(e) => setForm((prev) => ({ ...prev, destinationCountry: e.target.value }))}
                    placeholder="e.g., USA, UK, Germany"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portOfLoading">Port of Loading *</Label>
                  <Input
                    id="portOfLoading"
                    value={form.portOfLoading}
                    onChange={(e) => setForm((prev) => ({ ...prev, portOfLoading: e.target.value }))}
                    placeholder="e.g., Mumbai, Chennai"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portOfDischarge">Port of Discharge *</Label>
                  <Input
                    id="portOfDischarge"
                    value={form.portOfDischarge}
                    onChange={(e) => setForm((prev) => ({ ...prev, portOfDischarge: e.target.value }))}
                    placeholder="e.g., Los Angeles, London"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shippingLine">Shipping Line</Label>
                  <Input
                    id="shippingLine"
                    value={form.shippingLine}
                    onChange={(e) => setForm((prev) => ({ ...prev, shippingLine: e.target.value }))}
                    placeholder="e.g., Maersk Line, CMA CGM"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="containerNumber">Container Number</Label>
                  <Input
                    id="containerNumber"
                    value={form.containerNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, containerNumber: e.target.value }))}
                    placeholder="Container number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blNumber">B/L Number</Label>
                  <Input
                    id="blNumber"
                    value={form.blNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, blNumber: e.target.value }))}
                    placeholder="Bill of Lading number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input
                    id="invoiceNumber"
                    value={form.invoiceNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
                    placeholder="Commercial invoice number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lcNumber">L/C Number</Label>
                  <Input
                    id="lcNumber"
                    value={form.lcNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, lcNumber: e.target.value }))}
                    placeholder="Letter of Credit number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="incoterms">Incoterms</Label>
                  <Select value={form.incoterms || undefined} onValueChange={(value) => setForm((prev) => ({ ...prev, incoterms: value }))}>
                    <SelectTrigger id="incoterms">
                      <SelectValue placeholder="Select incoterms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FOB">FOB (Free On Board)</SelectItem>
                      <SelectItem value="CIF">CIF (Cost, Insurance & Freight)</SelectItem>
                      <SelectItem value="CFR">CFR (Cost and Freight)</SelectItem>
                      <SelectItem value="EXW">EXW (Ex Works)</SelectItem>
                      <SelectItem value="DDP">DDP (Delivered Duty Paid)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Select value={form.paymentTerms || undefined} onValueChange={(value) => setForm((prev) => ({ ...prev, paymentTerms: value }))}>
                    <SelectTrigger id="paymentTerms">
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LC">Letter of Credit</SelectItem>
                      <SelectItem value="TT">Telegraphic Transfer</SelectItem>
                      <SelectItem value="DP">Documents Against Payment</SelectItem>
                      <SelectItem value="DA">Documents Against Acceptance</SelectItem>
                      <SelectItem value="Advance">Advance Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  value={form.remarks}
                  onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Additional notes or instructions"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!loading && products.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No products are flagged as export in master data. This is the real catalog state; demo products will not be added here.
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <Label>Product *</Label>
                  <Select value={itemDraft.productId || undefined} onValueChange={(value) => setItemDraft((prev) => ({ ...prev, productId: value }))} disabled={loading || products.length === 0}>
                    <SelectTrigger>
                      <SelectValue placeholder={loading ? "Loading..." : products.length === 0 ? "No products available" : "Select product"} />
                    </SelectTrigger>
                    <SelectContent>
                      {loading ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                      ) : products.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No export products in catalog</div>
                      ) : (
                        products.map((product) => (
                          <SelectItem key={product.id} value={String(product.id)}>
                            {product.oldCode || ""} / {product.newCode || product.code || ""} — {product.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Batch Number</Label>
                  <Input
                    value={itemDraft.batchNumber}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, batchNumber: e.target.value }))}
                    placeholder="Enter batch"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Input
                    type="date"
                    value={itemDraft.expiryDate}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, expiryDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    value={itemDraft.quantity}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, quantity: e.target.value }))}
                    placeholder="0"
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={itemDraft.unitPrice}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, unitPrice: e.target.value }))}
                    placeholder="0.00"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>HSN Code</Label>
                  <Input
                    value={itemDraft.hsnCode}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, hsnCode: e.target.value }))}
                    placeholder="Enter HSN code"
                  />
                </div>
              </div>
              <Button type="button" onClick={handleAddItem} className="w-full md:w-auto">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Item
              </Button>

              {items.length > 0 && (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Old Code</TableHead>
                        <TableHead>New Code</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead>HSN Code</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => {
                        const amount = parseFloat(item.quantity || "0") * parseFloat(item.unitPrice || "0");
                        return (
                          <TableRow key={item.key}>
                            <TableCell className="font-medium">{item.productName}</TableCell>
                            <TableCell>{item.oldCode || "—"}</TableCell>
                            <TableCell>{item.newCode || "—"}</TableCell>
                            <TableCell>{item.batchNumber || "—"}</TableCell>
                            <TableCell>{item.expiryDate || "—"}</TableCell>
                            <TableCell>{item.hsnCode || "—"}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min="0"
                                className="ml-auto w-24 text-right"
                                data-testid="line-quantity"
                                value={item.quantity}
                                disabled={formLocked}
                                onChange={(e) => handleLineChange(item.key, "quantity", e.target.value)}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className="ml-auto w-28 text-right"
                                data-testid="line-unit-price"
                                value={item.unitPrice}
                                disabled={formLocked}
                                onChange={(e) => handleLineChange(item.key, "unitPrice", e.target.value)}
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium">{amount.toLocaleString()}</TableCell>
                            <TableCell>
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveItem(item.key)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="font-semibold">
                        <TableCell colSpan={8} className="text-right">
                          Total Amount:
                        </TableCell>
                        <TableCell className="text-right">{totalAmount.toLocaleString()}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(isEdit ? detailPath : listPath)}>
              Cancel
            </Button>
            <Button type="submit" data-testid="export-save" disabled={saving || items.length === 0 || formLocked}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4 mr-2" />
                  {isEdit ? "Save Changes" : "Create Export"}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
      <DraftUnsavedChangesDialog open={guard.dialogOpen} onStay={guard.stay} onDiscard={guard.discard} />
    </main>
  );
}

