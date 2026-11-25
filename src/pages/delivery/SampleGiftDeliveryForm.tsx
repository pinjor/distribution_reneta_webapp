import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, PlusCircle, Trash2, Loader2, Gift } from "lucide-react";
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
  SAMPLE_GIFT_LINE_FIELDS,
  captureDraftFormSnapshot,
  isDraftFormDirty,
} from "@/lib/draftFormSnapshot";

interface GiftItem {
  key: string;
  productId: string;
  productName: string;
  oldCode?: string;
  newCode?: string;
  quantity: string;
  giftType: string;
}

const createKey = () => Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString(36).toUpperCase();

export default function SampleGiftDeliveryForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingDocument, setLoadingDocument] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [items, setItems] = useState<GiftItem[]>([]);
  const [depotId, setDepotId] = useState<number | null>(null);

  const { user } = useAuth();
  const capabilities = useDraftCapabilities();
  const [form, setForm] = useState({
    deliveryNumber: "",
    deliveryDate: new Date().toISOString().split("T")[0],
    documentKind: "sample",
    recipientName: "",
    recipientType: "",
    recipientAddress: "",
    recipientPhone: "",
    recipientEmail: "",
    giftType: "",
    occasion: "",
    remarks: "",
  });

  const [itemDraft, setItemDraft] = useState({
    productId: "",
    quantity: "",
    giftType: "",
  });

  const listPath = "/delivery/sample-gift";
  const detailPath = id ? `${listPath}/${id}` : listPath;

  const snapshot = useMemo(
    () => captureDraftFormSnapshot(form, items, SAMPLE_GIFT_LINE_FIELDS),
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
      documentKind: row.document_kind || "sample",
      recipientName: row.recipient_name || "",
      recipientType: row.recipient_type || "",
      recipientAddress: row.recipient_address || "",
      recipientPhone: row.recipient_phone || "",
      recipientEmail: row.recipient_email || "",
      giftType: row.gift_type || "",
      occasion: row.occasion || "",
      remarks: row.remarks || "",
    });
    setItems(
      (row.items || []).map((item: any) => ({
        key: createKey(),
        productId: String(item.product_id),
        productName: item.product_name || `Product ${item.product_id}`,
        quantity: decimalInput(item.quantity),
        giftType: item.gift_type || "",
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
      const row = await apiEndpoints.sampleGiftDeliveries.getById(id);
      if (row.status !== "Draft") {
        setBlockedReason("Only Draft documents can be edited.");
        setDepotId(row.depot_id ?? null);
        return;
      }
      if (!canShowDraftEdit(capabilities.sample_gift.can_edit, row.status)) {
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
    if (!capabilities.sample_gift.can_create) {
      setBlockedReason("Draft creation is currently unavailable.");
    } else {
      setBlockedReason(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, capabilities.loading, capabilities.sample_gift.can_create, capabilities.sample_gift.can_edit]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const productsRes = await apiEndpoints.products.getAll();
      // API returns array directly, not wrapped in .data
      const allProducts = Array.isArray(productsRes) ? productsRes : (productsRes.data || []);
      // Filter only sample products
      const sampleProducts = allProducts.filter((product: any) => 
        product.product_type_sample === true || product.product_type_sample === "true" || product.product_type_sample === 1
      );
      setProducts(sampleProducts);
      if (sampleProducts.length === 0) {
        toast({
          title: "No sample products",
          description: "No products are flagged as sample in master data. The catalog is empty until those flags are set.",
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
        quantity: itemDraft.quantity,
        giftType: itemDraft.giftType || form.giftType,
      },
    ]);

    setItemDraft({
      productId: "",
      quantity: "",
      giftType: "",
    });
  };

  const handleRemoveItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  const handleLineQuantity = (key: string, quantity: string) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, quantity } : item)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!form.recipientName || !form.recipientType) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }
    const writeDepotId = isEdit ? depotId : user?.depot_id;
    if (!writeDepotId) {
      toast({
        title: "No depot assignment",
        description: "A depot is required to save a Sample/Gift draft. The form will not choose a depot for you.",
        variant: "destructive",
      });
      return;
    }
    if (items.some((item) => !item.quantity || Number(item.quantity) <= 0)) {
      toast({ title: "Enter valid quantity", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      setConflictMessage(null);
      const payload = {
        delivery_number: form.deliveryNumber || undefined,
        depot_id: writeDepotId,
        document_kind: form.documentKind,
        delivery_date: form.deliveryDate,
        recipient_name: form.recipientName,
        recipient_type: form.recipientType,
        recipient_address: form.recipientAddress || null,
        recipient_phone: form.recipientPhone || null,
        recipient_email: form.recipientEmail || null,
        gift_type: form.giftType || null,
        occasion: form.occasion || null,
        remarks: form.remarks || null,
        items: items.map((item) => ({
          product_id: parseInt(item.productId, 10),
          quantity: parseFloat(item.quantity),
          gift_type: item.giftType || form.giftType || null,
        })),
      };

      if (isEdit && id) {
        const updated = await apiEndpoints.sampleGiftDeliveries.update(id, payload);
        toast({
          title: "Sample gift delivery updated",
          description: `Draft ${updated.delivery_number} saved.`,
        });
        guard.allowNextNavigation();
        navigate(detailPath);
        return;
      }

      const created = await apiEndpoints.sampleGiftDeliveries.create(payload);
      toast({
        title: "Sample gift delivery created",
        description: `Draft ${created.delivery_number} saved.`,
      });
      guard.allowNextNavigation();
      navigate(listPath);
    } catch (error: any) {
      console.error("Failed to save sample gift delivery", error);
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

  const totalQuantity = items.reduce((sum, item) => sum + parseFloat(item.quantity || "0"), 0);
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
        title={isEdit ? "Edit Sample Gift Delivery" : "Create Sample Gift Delivery"}
        subtitle={
          isEdit
            ? "Update this Draft. Submitted, Approved, and Rejected documents cannot be changed."
            : "Create a new sample or gift delivery to doctors, pharmacies, or partners"
        }
        icon={Gift}
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
              <CardTitle>Recipient Information</CardTitle>
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
                  <Label htmlFor="documentKind">Document Kind *</Label>
                  <Select value={form.documentKind} onValueChange={(value) => setForm((prev) => ({ ...prev, documentKind: value }))}>
                    <SelectTrigger id="documentKind">
                      <SelectValue placeholder="Select kind" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sample">Sample</SelectItem>
                      <SelectItem value="gift">Gift</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="recipientName">Recipient Name *</Label>
                  <Input
                    id="recipientName"
                    value={form.recipientName}
                    onChange={(e) => setForm((prev) => ({ ...prev, recipientName: e.target.value }))}
                    placeholder="Enter recipient name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipientType">Recipient Type *</Label>
                  <Select value={form.recipientType} onValueChange={(value) => setForm((prev) => ({ ...prev, recipientType: value }))} required>
                    <SelectTrigger id="recipientType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Doctor">Doctor</SelectItem>
                      <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                      <SelectItem value="Hospital">Hospital</SelectItem>
                      <SelectItem value="Distributor">Distributor</SelectItem>
                      <SelectItem value="Partner">Partner</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipientPhone">Phone</Label>
                  <Input
                    id="recipientPhone"
                    value={form.recipientPhone}
                    onChange={(e) => setForm((prev) => ({ ...prev, recipientPhone: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipientEmail">Email</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    value={form.recipientEmail}
                    onChange={(e) => setForm((prev) => ({ ...prev, recipientEmail: e.target.value }))}
                    placeholder="Enter email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="giftType">Gift Type</Label>
                  <Select value={form.giftType || undefined} onValueChange={(value) => setForm((prev) => ({ ...prev, giftType: value }))}>
                    <SelectTrigger id="giftType">
                      <SelectValue placeholder="Select gift type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Product Samples">Product Samples</SelectItem>
                      <SelectItem value="Promotional Items">Promotional Items</SelectItem>
                      <SelectItem value="Medical Equipment">Medical Equipment</SelectItem>
                      <SelectItem value="Literature">Literature</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="occasion">Occasion</Label>
                  <Input
                    id="occasion"
                    value={form.occasion}
                    onChange={(e) => setForm((prev) => ({ ...prev, occasion: e.target.value }))}
                    placeholder="e.g., New Year, Festival, etc."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipientAddress">Recipient Address</Label>
                <Textarea
                  id="recipientAddress"
                  value={form.recipientAddress}
                  onChange={(e) => setForm((prev) => ({ ...prev, recipientAddress: e.target.value }))}
                  placeholder="Enter full address"
                  rows={3}
                />
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
              <CardTitle>Gift Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!loading && products.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No products are flagged as sample in master data. This is the real catalog state; demo products will not be added here.
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Product *</Label>
                  <Select value={itemDraft.productId || undefined} onValueChange={(value) => setItemDraft((prev) => ({ ...prev, productId: value }))} disabled={loading || products.length === 0}>
                    <SelectTrigger>
                      <SelectValue placeholder={loading ? "Loading..." : products.length === 0 ? "No sample-flagged products" : "Select product"} />
                    </SelectTrigger>
                    <SelectContent>
                      {loading ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                      ) : products.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No sample-flagged products in the catalog</div>
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
                  <Label>Gift Type</Label>
                  <Select value={itemDraft.giftType} onValueChange={(value) => setItemDraft((prev) => ({ ...prev, giftType: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Product Samples">Product Samples</SelectItem>
                      <SelectItem value="Promotional Items">Promotional Items</SelectItem>
                      <SelectItem value="Medical Equipment">Medical Equipment</SelectItem>
                      <SelectItem value="Literature">Literature</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button type="button" onClick={handleAddItem} className="w-full">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </div>

              {items.length > 0 && (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Old Code</TableHead>
                        <TableHead>New Code</TableHead>
                        <TableHead>Gift Type</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.key}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell>{item.oldCode || "—"}</TableCell>
                          <TableCell>{item.newCode || "—"}</TableCell>
                          <TableCell>{item.giftType || "—"}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="0"
                              className="ml-auto w-24 text-right"
                              data-testid="line-quantity"
                              value={item.quantity}
                              disabled={formLocked}
                              onChange={(e) => handleLineQuantity(item.key, e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveItem(item.key)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-semibold">
                        <TableCell colSpan={4} className="text-right">
                          Total Quantity:
                        </TableCell>
                        <TableCell className="text-right">{totalQuantity.toLocaleString()}</TableCell>
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
            <Button
              type="submit"
              data-testid="sample-gift-save"
              disabled={saving || items.length === 0 || formLocked}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-2" />
                  {isEdit ? "Save Changes" : "Create Delivery"}
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

