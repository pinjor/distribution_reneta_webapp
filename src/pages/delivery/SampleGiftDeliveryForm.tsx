import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, PlusCircle, Trash2, Save, Loader2, Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";

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
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [items, setItems] = useState<GiftItem[]>([]);

  const [form, setForm] = useState({
    deliveryNumber: "",
    deliveryDate: new Date().toISOString().split("T")[0],
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

  useEffect(() => {
    fetchProducts();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.recipientName || !form.recipientType) {
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
        delivery_type: "sample_gift",
        delivery_number: form.deliveryNumber || `SG-${Date.now()}`,
        delivery_date: form.deliveryDate,
        recipient_name: form.recipientName,
        recipient_type: form.recipientType,
        recipient_address: form.recipientAddress,
        recipient_phone: form.recipientPhone,
        recipient_email: form.recipientEmail,
        gift_type: form.giftType,
        occasion: form.occasion,
        remarks: form.remarks,
        items: items.map((item) => ({
          product_id: parseInt(item.productId),
          quantity: parseFloat(item.quantity),
          gift_type: item.giftType,
        })),
      };

      await apiEndpoints.orderDeliveries.create(payload);
      
      toast({ title: "Sample gift delivery created successfully" });
      navigate("/delivery/sample-gift");
    } catch (error: any) {
      console.error("Failed to create sample gift delivery", error);
      toast({ title: "Unable to create delivery", description: error?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const totalQuantity = items.reduce((sum, item) => sum + parseFloat(item.quantity || "0"), 0);

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/delivery/sample-gift")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Create Sample Gift Delivery</h1>
          <p className="text-muted-foreground">Create a new sample or gift delivery to doctors, pharmacies, or partners</p>
        </div>
      </div>

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
                  <Select value={form.giftType} onValueChange={(value) => setForm((prev) => ({ ...prev, giftType: value }))}>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                          <TableCell className="text-right">{parseFloat(item.quantity).toLocaleString()}</TableCell>
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
            <Button type="button" variant="outline" onClick={() => navigate("/delivery/sample-gift")}>
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
                  <Gift className="h-4 w-4 mr-2" />
                  Create Delivery
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </main>
  );
}

