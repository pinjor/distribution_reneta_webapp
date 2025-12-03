import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, PlusCircle, Trash2, Save, Loader2, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";

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
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const [itemDraft, setItemDraft] = useState({
    productId: "",
    batchNumber: "",
    expiryDate: "",
    quantity: "",
    unitPrice: "",
    hsnCode: "",
  });

  useEffect(() => {
    fetchProducts();
  }, []);

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

  const selectedProduct = products.find((p) => p.id === itemDraft.productId);

  const handleAddItem = () => {
    if (!itemDraft.productId) {
      toast({ title: "Select a product", variant: "destructive" });
      return;
    }
    if (!itemDraft.quantity || Number(itemDraft.quantity) <= 0) {
      toast({ title: "Enter valid quantity", variant: "destructive" });
      return;
    }

    const product = selectedProduct!;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/delivery/export")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Create Export Delivery</h1>
          <p className="text-muted-foreground">Create a new international export delivery with shipping documentation</p>
        </div>
      </div>

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
                  <Select value={form.incoterms} onValueChange={(value) => setForm((prev) => ({ ...prev, incoterms: value }))}>
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
                  <Select value={form.paymentTerms} onValueChange={(value) => setForm((prev) => ({ ...prev, paymentTerms: value }))}>
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
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <Label>Product *</Label>
                  <Select value={itemDraft.productId} onValueChange={(value) => setItemDraft((prev) => ({ ...prev, productId: value }))} disabled={loading || products.length === 0}>
                    <SelectTrigger>
                      <SelectValue placeholder={loading ? "Loading..." : products.length === 0 ? "No products available" : "Select product"} />
                    </SelectTrigger>
                    <SelectContent>
                      {loading ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                      ) : products.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No products available</div>
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
                    required
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
                            <TableCell className="text-right">{parseFloat(item.quantity).toLocaleString()}</TableCell>
                            <TableCell className="text-right">{parseFloat(item.unitPrice || "0").toLocaleString()}</TableCell>
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
            <Button type="button" variant="outline" onClick={() => navigate("/delivery/export")}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || items.length === 0}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4 mr-2" />
                  Create Export
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </main>
  );
}

