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
      const [depotsRes, productsRes, vehiclesRes, driversRes] = await Promise.all([
        apiEndpoints.depots.getAll(),
        apiEndpoints.products.getAll(),
        apiEndpoints.vehicles.getAll(),
        apiEndpoints.drivers.getAll(),
      ]);
      setDepots(Array.isArray(depotsRes) ? depotsRes : (depotsRes?.data || []));
      // Get all products (remove commercial filter to allow all products)
      const allProducts = Array.isArray(productsRes) ? productsRes : (productsRes?.data || []);
      setProducts(allProducts);
      const vehiclesData = Array.isArray(vehiclesRes) ? vehiclesRes : (vehiclesRes?.data || []);
      setVehicles(vehiclesData);
      const driversData = Array.isArray(driversRes) ? driversRes : (driversRes?.data || []);
      setDrivers(driversData);
      
      console.log("Loaded data:", {
        depots: depots.length,
        products: allProducts.length,
        vehicles: vehiclesData.length,
        drivers: driversData.length
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

  // Fetch batches when product and depot are selected
  useEffect(() => {
    const fetchBatches = async () => {
      if (itemDraft.productId && form.fromDepotId) {
        try {
          setLoadingBatches(true);
          const batches = await apiEndpoints.stockMaintenance.getProductBatches(
            parseInt(itemDraft.productId),
            parseInt(form.fromDepotId)
          );
          // Batches are already sorted by FEFO from the API
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
      return;
    }
    if (!itemDraft.quantity || Number(itemDraft.quantity) <= 0) {
      toast({ title: "Enter valid quantity", variant: "destructive" });
      return;
    }

    const product = selectedProduct;
    if (!product) {
      toast({ title: "Product not found", variant: "destructive" });
      return;
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

    // Reset form completely
    setItemDraft({
      productId: "",
      batchNumber: "",
      expiryDate: "",
      quantity: "",
      unitPrice: "",
    });
    
    // Clear available batches when form is reset
    setAvailableBatches([]);
    
    toast({ title: "Product added successfully" });
  };

  const handleRemoveItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    // Validate all items have valid quantities
    for (const item of items) {
      const qty = parseFloat(item.quantity);
      if (!item.quantity || !qty || qty <= 0 || isNaN(qty)) {
        toast({ 
          title: "Invalid quantity", 
          description: `Please enter a valid quantity greater than 0 for ${item.productName || "product"}`,
          variant: "destructive" 
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
        driver_name: form.driverId && form.driverId !== "__none__" ? (() => {
          const driver = drivers.find(d => String(d.id) === form.driverId);
          if (!driver) return null;
          return driver.name || `${driver.first_name || ""} ${driver.last_name || ""}`.trim() || null;
        })() : null,
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
                  <Label htmlFor="transferNumber">Transfer Number</Label>
                  <Input
                    id="transferNumber"
                    value={form.transferNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, transferNumber: e.target.value }))}
                    placeholder="Auto-generated if left empty"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transferDate">Transfer Date *</Label>
                  <Input
                    id="transferDate"
                    type="date"
                    value={form.transferDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, transferDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromDepotId">From Depot (Source) *</Label>
                  <Select value={form.fromDepotId} onValueChange={(value) => {
                    setForm((prev) => ({ ...prev, fromDepotId: value }));
                    // Clear batch when depot changes
                    setItemDraft((prev) => ({
                      ...prev,
                      batchNumber: "",
                      expiryDate: "",
                    }));
                  }} required disabled={loading || depots.length === 0}>
                    <SelectTrigger id="fromDepotId">
                      <SelectValue placeholder={loading ? "Loading..." : depots.length === 0 ? "No depots available" : "Select source depot"} />
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
                  <Label htmlFor="toDepotId">To Depot (Destination) *</Label>
                  <Select value={form.toDepotId} onValueChange={(value) => setForm((prev) => ({ ...prev, toDepotId: value }))} required disabled={loading || depots.length === 0}>
                    <SelectTrigger id="toDepotId">
                      <SelectValue placeholder={loading ? "Loading..." : depots.length === 0 ? "No depots available" : "Select destination depot"} />
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
                  <Label htmlFor="vehicleId">Vehicle</Label>
                  <Select 
                    value={form.vehicleId || undefined} 
                    onValueChange={(value) => {
                      console.log("Vehicle selected:", value);
                      setForm((prev) => ({ ...prev, vehicleId: value }));
                    }} 
                    disabled={loading || vehicles.length === 0}
                  >
                    <SelectTrigger id="vehicleId" className="w-full">
                      <SelectValue placeholder={loading ? "Loading..." : vehicles.length === 0 ? "No vehicles available" : "Select vehicle"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {loading ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                      ) : vehicles.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No vehicles available</div>
                      ) : (
                        <>
                          <SelectItem value="__none__">None (Optional)</SelectItem>
                          {vehicles.map((vehicle) => {
                            const regNo = vehicle.registration_number || vehicle.reg_no || vehicle.registrationNumber || "N/A";
                            const type = vehicle.vehicle_type || vehicle.type || vehicle.vehicleType || "N/A";
                            return (
                              <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                                {regNo} ({type})
                              </SelectItem>
                            );
                          })}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driverId">Driver</Label>
                  <Select 
                    value={form.driverId || undefined} 
                    onValueChange={(value) => {
                      console.log("Driver selected:", value);
                      setForm((prev) => ({ ...prev, driverId: value }));
                    }} 
                    disabled={loading}
                  >
                    <SelectTrigger id="driverId" className="w-full">
                      <SelectValue placeholder={loading ? "Loading drivers..." : drivers.length === 0 ? "No drivers available" : "Select driver (optional)"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {loading ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading drivers...</div>
                      ) : drivers.length === 0 ? (
                        <>
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No drivers available</div>
                          <SelectItem value="__none__">None (Optional)</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="__none__">None (Optional)</SelectItem>
                          {drivers.map((driver) => {
                            const firstName = driver.first_name || "";
                            const lastName = driver.last_name || "";
                            const driverName = `${firstName} ${lastName}`.trim() || `Driver ${driver.id}`;
                            const license = driver.license_number || driver.licenseNumber || "";
                            return (
                              <SelectItem key={driver.id} value={String(driver.id)}>
                                {driverName} {license ? `(${license})` : ""}
                              </SelectItem>
                            );
                          })}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transferNote">Transfer Note</Label>
                <Textarea
                  id="transferNote"
                  value={form.transferNote}
                  onChange={(e) => setForm((prev) => ({ ...prev, transferNote: e.target.value }))}
                  placeholder="Enter transfer note details..."
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
                  <Select 
                    value={itemDraft.productId || undefined} 
                    onValueChange={(value) => {
                      console.log("Product selected:", value);
                      setItemDraft((prev) => ({ 
                        ...prev, 
                        productId: value,
                        batchNumber: "", // Clear batch when product changes
                        expiryDate: "", // Clear expiry when product changes
                      }));
                    }} 
                    disabled={loading || products.length === 0}
                    key={`product-select-${itemDraft.productId || 'empty'}`}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={loading ? "Loading..." : products.length === 0 ? "No products available" : "Select product"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {loading ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                      ) : products.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No products available</div>
                      ) : (
                        products.map((product) => {
                          const displayName = product.name || product.product_name || `Product ${product.id}`;
                          const code = product.code || product.newCode || product.oldCode || "";
                          return (
                            <SelectItem key={product.id} value={String(product.id)}>
                              {code ? `${code} - ${displayName}` : displayName}
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Batch Number (FEFO)</Label>
                  <Select
                    value={itemDraft.batchNumber || undefined}
                    onValueChange={(value) => {
                      const selectedBatch = availableBatches.find(b => b.batch_number === value);
                      setItemDraft((prev) => ({
                        ...prev,
                        batchNumber: value,
                        expiryDate: selectedBatch?.expiry_date ? selectedBatch.expiry_date.split('T')[0] : "",
                        unitPrice: prev.unitPrice || "0", // Keep existing or default
                      }));
                    }}
                    disabled={loadingBatches || !itemDraft.productId || !form.fromDepotId || availableBatches.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !form.fromDepotId ? "Select source depot first" :
                        !itemDraft.productId ? "Select product first" :
                        loadingBatches ? "Loading batches..." :
                        availableBatches.length === 0 ? "No batches available" :
                        "Select batch (FEFO)"
                      } />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {loadingBatches ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading batches...</div>
                      ) : availableBatches.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          {!form.fromDepotId ? "Select source depot first" : !itemDraft.productId ? "Select product first" : "No batches available"}
                        </div>
                      ) : (
                        availableBatches.map((batch) => {
                          const expiryStr = batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : "No expiry";
                          const qty = batch.available_quantity || 0;
                          return (
                            <SelectItem key={batch.batch_number} value={batch.batch_number}>
                              {batch.batch_number} - Qty: {qty.toLocaleString()} - Exp: {expiryStr}
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Input
                    type="date"
                    value={itemDraft.expiryDate}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, expiryDate: e.target.value }))}
                    placeholder="Auto-filled from batch"
                    readOnly={!!itemDraft.batchNumber}
                    className={itemDraft.batchNumber ? "bg-muted" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    value={itemDraft.quantity}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, quantity: e.target.value }))}
                    placeholder="Enter quantity"
                    min="0.01"
                    step="0.01"
                    required={false}
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
                  Create Transfer Request
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </main>
  );
}

