import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, PlusCircle, Trash2, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";

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

export default function DepotDeliveryForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [depots, setDepots] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [items, setItems] = useState<DeliveryItem[]>([]);

  const [form, setForm] = useState({
    deliveryNumber: "",
    deliveryDate: new Date().toISOString().split("T")[0],
    depotId: "",
    customerId: "",
    vehicleId: "",
    driverName: "",
    depotTransferNote: "",
    remarks: "",
  });

  const [itemDraft, setItemDraft] = useState({
    productId: "",
    batchNumber: "",
    expiryDate: "",
    quantity: "",
    unitPrice: "",
  });

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      setLoading(true);
      const [depotsRes, customersRes, productsRes, vehiclesRes] = await Promise.all([
        apiEndpoints.depots.getAll(),
        apiEndpoints.customers.getAll(),
        apiEndpoints.products.getAll(),
        apiEndpoints.vehicles.getAll(),
      ]);
      setDepots(depotsRes.data || depotsRes || []);
      setCustomers(customersRes.data || customersRes || []);
      // Filter only commercial products for depot delivery
      const allProducts = Array.isArray(productsRes) ? productsRes : (productsRes.data || []);
      const commercialProducts = allProducts.filter((product: any) => 
        product.product_type_commercial === true || product.product_type_commercial === "true" || product.product_type_commercial === 1
      );
      setProducts(commercialProducts);
      setVehicles(vehiclesRes.data || []);
    } catch (error) {
      console.error("Failed to load master data", error);
      toast({ title: "Unable to load master data", variant: "destructive" });
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
      },
    ]);

    setItemDraft({
      productId: "",
      batchNumber: "",
      expiryDate: "",
      quantity: "",
      unitPrice: "",
    });
  };

  const handleRemoveItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.depotId || !form.customerId) {
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
        delivery_type: "depot",
        delivery_number: form.deliveryNumber || `DD-${Date.now()}`,
        delivery_date: form.deliveryDate,
        depot_id: parseInt(form.depotId),
        customer_id: parseInt(form.customerId),
        vehicle_id: form.vehicleId ? parseInt(form.vehicleId) : null,
        driver_name: form.driverName,
        remarks: form.remarks,
        items: items.map((item) => ({
          product_id: parseInt(item.productId),
          batch_number: item.batchNumber,
          expiry_date: item.expiryDate,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unitPrice || "0"),
        })),
      };

      await apiEndpoints.deliveryOrders.create(payload);
      
      toast({ title: "Depot transfer created successfully" });
      navigate("/delivery/depot");
    } catch (error: any) {
      console.error("Failed to create depot transfer", error);
      toast({ title: "Unable to create transfer", description: error?.message, variant: "destructive" });
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
        <Button variant="ghost" size="icon" onClick={() => navigate("/delivery/depot")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Create Depot Transfer</h1>
          <p className="text-muted-foreground">Create a new transfer order for depot distribution</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deliveryNumber">Transfer Number</Label>
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
                  <Label htmlFor="depotId">Depot *</Label>
                  <Select value={form.depotId} onValueChange={(value) => setForm((prev) => ({ ...prev, depotId: value }))} required disabled={loading || depots.length === 0}>
                    <SelectTrigger id="depotId">
                      <SelectValue placeholder={loading ? "Loading..." : depots.length === 0 ? "No depots available" : "Select depot"} />
                    </SelectTrigger>
                    <SelectContent>
                      {loading ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                      ) : depots.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No depots available</div>
                      ) : (
                        depots.map((depot) => (
                          <SelectItem key={depot.id} value={String(depot.id)}>
                            {depot.name} ({depot.code})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerId">Customer *</Label>
                  <Select value={form.customerId} onValueChange={(value) => setForm((prev) => ({ ...prev, customerId: value }))} required disabled={loading || customers.length === 0}>
                    <SelectTrigger id="customerId">
                      <SelectValue placeholder={loading ? "Loading..." : customers.length === 0 ? "No customers available" : "Select customer"} />
                    </SelectTrigger>
                    <SelectContent>
                      {loading ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                      ) : customers.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No customers available</div>
                      ) : (
                        customers.map((customer) => (
                          <SelectItem key={customer.id} value={String(customer.id)}>
                            {customer.name} ({customer.code})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleId">Vehicle</Label>
                  <Select value={form.vehicleId} onValueChange={(value) => setForm((prev) => ({ ...prev, vehicleId: value }))} disabled={loading || vehicles.length === 0}>
                    <SelectTrigger id="vehicleId">
                      <SelectValue placeholder={loading ? "Loading..." : vehicles.length === 0 ? "No vehicles available" : "Select vehicle"} />
                    </SelectTrigger>
                    <SelectContent>
                      {loading ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                      ) : vehicles.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No vehicles available</div>
                      ) : (
                        vehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                            {vehicle.registration_number || vehicle.reg_no} ({vehicle.vehicle_type || vehicle.type || "N/A"})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driverName">Driver Name</Label>
                  <Input
                    id="driverName"
                    value={form.driverName}
                    onChange={(e) => setForm((prev) => ({ ...prev, driverName: e.target.value }))}
                    placeholder="Enter driver name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="depotTransferNote">Depot Transfer Note</Label>
                <Textarea
                  id="depotTransferNote"
                  value={form.depotTransferNote}
                  onChange={(e) => setForm((prev) => ({ ...prev, depotTransferNote: e.target.value }))}
                  placeholder="Enter depot transfer note details..."
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
              <CardTitle>Transfer Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                        <TableCell colSpan={7} className="text-right">
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
            <Button type="button" variant="outline" onClick={() => navigate("/delivery/depot")}>
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
                  <Save className="h-4 w-4 mr-2" />
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

