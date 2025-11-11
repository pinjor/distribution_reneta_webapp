// @ts-nocheck
/// <reference types="react" />
/// <reference types="react-dom" />
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { masterData } from "@/lib/masterData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";

import type { ProductOption, DepotOption } from "@/lib/masterData";

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

const today = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().split("T")[0];
};

export default function ReceiveFormPage({ sourceType, title }: ReceiveFormPageProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
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

  const [itemDraft, setItemDraft] = useState({
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
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [depotData, productData] = await Promise.all([
          masterData.getDepots(),
          masterData.getProducts(),
        ]);
        if (!mounted) return;
        setDepots(depotData);
        setProducts(productData);
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
      return;
    }
    if (!itemDraft.depotQuantity) {
      toast({ title: "Enter depot quantity", variant: "destructive" });
      return;
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
    setItemDraft({
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
    });
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

  return (
    <main className="p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="text-muted-foreground">Record product receipts and generate printable reports.</p>
      </header>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Receipt details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
              <Label>TFA number</Label>
              <Input value={form.tfaNumber} onChange={(e) => handleHeaderChange("tfaNumber", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>ISO number</Label>
              <Input value={form.isoNumber} onChange={(e) => handleHeaderChange("isoNumber", e.target.value)} />
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
                      {product.oldCode || product.id} — {product.name}
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
        <Button disabled={!receiptId || saving || loading} onClick={handleApprove}>
          Approve
        </Button>
      </div>
    </main>
  );
}
