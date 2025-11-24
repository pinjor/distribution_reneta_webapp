import { useState, useEffect } from "react";
import { PlusCircle, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";
import SearchableCombobox, { SearchableOption } from "@/components/SearchableCombobox";
import { useNavigate } from "react-router-dom";

interface AdjustmentItem {
  id: number;
  itemCode: string;
  productId: number | null;
  packType: string;
  itemName: string;
  batchNo: string;
  currentStock: number;
  adjustType: string;
  adjustedQty: number;
  adjustReason: string;
  remarks: string;
}

interface AdjustedRecord {
  id: number;
  itemCode: string;
  productId: number | null;
  packType: string;
  itemName: string;
  unit: string;
  category: string;
  adjustedQty: number;
  adjustType: string;
  expireDate: string;
  batchNo: string;
}

export default function NewAdjustment() {
  const navigate = useNavigate();
  const [chalanDate, setChalanDate] = useState(() => {
    const today = new Date();
    return `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
  });
  const [selectedStore, setSelectedStore] = useState("");
  const [items, setItems] = useState<AdjustmentItem[]>([]);
  const [records, setRecords] = useState<AdjustedRecord[]>([]);
  const { toast } = useToast();

  // Load depots/stores
  const { data: depotsResponse, isLoading: depotsLoading } = useQuery({
    queryKey: ['depots'],
    queryFn: apiEndpoints.depots.getAll,
  });

  // Load products
  const { data: productsResponse, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: apiEndpoints.products.getAll,
  });

  // Load stock ledger for current stock
  const { data: stockLedgerResponse } = useQuery({
    queryKey: ['stock-ledger'],
    queryFn: apiEndpoints.stockMaintenance.getLedger,
  });

  const depots = depotsResponse?.data || depotsResponse || [];
  const products = productsResponse?.data || productsResponse || [];
  const stockLedger = stockLedgerResponse?.data || stockLedgerResponse || [];

  // Mock adjusted records data
  useEffect(() => {
    setRecords([
      {
        id: 1,
        itemCode: "M01000002",
        packType: "Tab",
        itemName: "Acarbose 50 mg",
        unit: "Nos",
        category: "MEDICINE",
        adjustedQty: 2,
        adjustType: "Write off",
        expireDate: "",
      },
    ]);
  }, []);

  // Get FEFO batches for a product (sorted by expiry date, earliest first)
  const getFEFOBatches = (productId: number | null, productCode: string) => {
    if (!productId && !productCode) return [];
    
    const batches = stockLedger
      .filter((item: any) => {
        const matchesProduct = productId 
          ? (item.product_id === productId)
          : (item.product_code === productCode || item.product_code === productCode);
        const matchesDepot = selectedStore ? item.depot_id === Number(selectedStore) : true;
        const hasStock = (item.quantity || item.available_quantity || 0) > 0;
        return matchesProduct && matchesDepot && hasStock && item.batch;
      })
      .map((item: any) => ({
        batch: item.batch || item.batch_number,
        expiryDate: item.expiry_date || item.expiryDate,
        quantity: item.quantity || item.available_quantity || 0,
      }))
      .sort((a, b) => {
        // FEFO: Sort by expiry date (earliest first)
        if (!a.expiryDate && !b.expiryDate) return 0;
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      });
    
    return batches;
  };

  const handleAddItem = () => {
    const newItem: AdjustmentItem = {
      id: Date.now(),
      itemCode: "",
      productId: null,
      packType: "",
      itemName: "",
      batchNo: "",
      currentStock: 0,
      adjustType: "",
      adjustedQty: 0,
      adjustReason: "",
      remarks: "",
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleProductSelect = (id: number, product: any) => {
    setItems(items.map((item) => {
      if (item.id === id) {
        const updated: AdjustmentItem = {
          ...item,
          itemCode: product.code || product.new_code || product.old_code || String(product.id),
          productId: product.id,
          itemName: product.name || product.product_name || "",
          // Auto-fill pack type from primary_packaging or unit_of_measure
          packType: product.primary_packaging || product.unit_of_measure || product.pack_type || product.packType || "",
        };
        
        // Get FEFO batches and auto-select the first one (earliest expiry)
        const batches = getFEFOBatches(product.id, product.code || product.new_code || product.old_code);
        if (batches.length > 0) {
          updated.batchNo = batches[0].batch;
          // Update current stock for the selected batch
          const batchStock = stockLedger.find((s: any) => 
            (s.product_id === product.id || s.product_code === product.code || s.product_code === product.new_code || s.product_code === product.old_code) &&
            s.batch === batches[0].batch &&
            (!selectedStore || s.depot_id === Number(selectedStore))
          );
          if (batchStock) {
            updated.currentStock = batchStock.quantity || batchStock.available_quantity || 0;
          }
        } else {
          // Get current stock from ledger for total if no batch
          const stockItems = stockLedger.filter((s: any) => 
            (s.product_id === product.id || s.product_code === product.code || s.product_code === product.new_code || s.product_code === product.old_code) &&
            (!selectedStore || s.depot_id === Number(selectedStore))
          );
          const totalStock = stockItems.reduce((sum: number, s: any) => 
            sum + (s.quantity || s.available_quantity || 0), 0
          );
          updated.currentStock = totalStock;
        }
        
        return updated;
      }
      return item;
    }));
  };

  const handleAddToRecords = (itemId: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Validate required fields
    if (!item.itemCode || !item.batchNo || !item.adjustType || !item.adjustedQty || !item.adjustReason) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Item Code, Batch No, Adjust Type, Adjusted Qty, Adjust Reason)",
        variant: "destructive",
      });
      return;
    }

    // Get batch expiry date
    const batches = getFEFOBatches(item.productId, item.itemCode);
    const selectedBatch = batches.find((b: any) => b.batch === item.batchNo);
    const expiryDate = selectedBatch?.expiryDate || "";

    // Add to records
    const newRecord: AdjustedRecord = {
      id: Date.now(),
      itemCode: item.itemCode,
      productId: item.productId,
      packType: item.packType,
      itemName: item.itemName,
      unit: "Nos", // Can be derived from product if needed
      category: "", // Can be derived from product if needed
      adjustedQty: item.adjustedQty,
      adjustType: item.adjustType,
      expireDate: expiryDate,
      batchNo: item.batchNo,
    };

    setRecords([...records, newRecord]);
    
    // Remove from items
    setItems(items.filter(i => i.id !== itemId));

    toast({
      title: "Success",
      description: "Item added to adjustment records",
    });
  };

  const handleItemChange = (id: number, field: keyof AdjustmentItem, value: any) => {
    setItems(items.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSave = () => {
    if (!selectedStore) {
      toast({
        title: "Validation Error",
        description: "Please select a store",
        variant: "destructive",
      });
      return;
    }

    if (records.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one item to the adjustment records",
        variant: "destructive",
      });
      return;
    }

    // Save all records as a single adjustment chalan
    try {
      // Parse chalan date (DD/MM/YYYY format)
      const [day, month, year] = chalanDate.split('/');
      const adjustmentDate = `${year}-${month}-${day}`;
      
      // Prepare adjustment items from records
      const items = records.map((record) => {
        if (!record.productId) {
          throw new Error(`Product ID missing for item: ${record.itemCode}`);
        }
        
        return {
          product_id: record.productId,
          batch: record.batchNo || null,
          quantity_change: Number(record.adjustedQty),
        };
      });
      
      // Create adjustment payload
      const payload = {
        adjustment_date: adjustmentDate,
        depot_id: Number(selectedStore),
        adjustment_type: records[0]?.adjustType || "Correction",
        reason: records.map(r => `${r.itemName}: ${r.adjustType}`).join("; "),
        status: "Pending",
        items: items,
      };
      
      await apiEndpoints.stockAdjustments.create(payload);
      
      toast({
        title: "Success",
        description: `Stock adjustment chalan saved successfully with ${records.length} item(s)`,
      });
      
      // Navigate to adjustment list
      navigate("/warehouse/adjustment/request");
    } catch (error: any) {
      console.error("Failed to save adjustment", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save stock adjustment",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setItems([]);
    setSelectedStore("");
  };

  const handleDeleteRecord = (id: number) => {
    setRecords(records.filter((record) => record.id !== id));
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-gray-800 text-white px-6 py-4 rounded-t-lg">
        <h1 className="text-xl font-semibold">Adjust Stock Entry</h1>
      </div>

      {/* Form Section */}
      <Card className="border-t-0 rounded-t-none">
        <div className="p-6 space-y-6">
          {/* General Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="chalanDate" className="text-sm font-medium">
                Chalan Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="chalanDate"
                type="text"
                value={chalanDate}
                onChange={(e) => setChalanDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="store" className="text-sm font-medium">
                Store <span className="text-red-500">*</span>
              </Label>
              <Select value={selectedStore} onValueChange={setSelectedStore} disabled={depotsLoading}>
                <SelectTrigger id="store" className="mt-1">
                  <SelectValue placeholder="Select Store" />
                </SelectTrigger>
                <SelectContent>
                  {depotsLoading ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                  ) : depots.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No stores available</div>
                  ) : (
                    depots.map((depot: any) => (
                      <SelectItem key={depot.id} value={String(depot.id)}>
                        {depot.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Item Adjustment Details Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Item Adjustment Details</h3>
              <Button onClick={handleAddItem} size="sm" variant="outline">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Sl. No.</TableHead>
                    <TableHead className="min-w-[150px]">Item Code</TableHead>
                    <TableHead className="min-w-[100px]">Pack Type</TableHead>
                    <TableHead className="min-w-[200px]">Item Name</TableHead>
                    <TableHead className="min-w-[120px]">Batch No</TableHead>
                    <TableHead className="min-w-[120px]">Current Stock</TableHead>
                    <TableHead className="min-w-[120px]">Adjust Type</TableHead>
                    <TableHead className="min-w-[120px]">Adjusted Qty</TableHead>
                    <TableHead className="min-w-[150px]">Adjust Reason</TableHead>
                    <TableHead className="min-w-[150px]">Remarks</TableHead>
                    <TableHead className="w-24">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        No items added. Click "Add Item" to start.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => {
                      // Prepare product options for SearchableCombobox from master data
                      const productOptions: SearchableOption[] = products.map((product: any) => {
                        const code = product.code || product.new_code || product.old_code || String(product.id);
                        const name = product.name || product.product_name || "";
                        return {
                          value: String(product.id),
                          label: code,
                          description: name,
                        };
                      });

                      // Get available batches for this product
                      const availableBatches = item.productId 
                        ? getFEFOBatches(item.productId, item.itemCode)
                        : [];

                      return (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <div className="w-full">
                            <SearchableCombobox
                              label=""
                              placeholder="Search by code or name"
                              options={productOptions}
                              value={item.productId ? String(item.productId) : undefined}
                              onSelect={(option) => {
                                const product = products.find((p: any) => String(p.id) === option.value);
                                if (product) {
                                  handleProductSelect(item.id, product);
                                }
                              }}
                              disabled={productsLoading}
                              emptyMessage="No products found"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.packType}
                            onChange={(e) => handleItemChange(item.id, 'packType', e.target.value)}
                            placeholder="Pack Type"
                            className="w-full"
                            readOnly
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.itemName}
                            onChange={(e) => handleItemChange(item.id, 'itemName', e.target.value)}
                            placeholder="Item Name"
                            className="w-full"
                            readOnly
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Input
                              value={item.batchNo}
                              onChange={(e) => {
                                handleItemChange(item.id, 'batchNo', e.target.value);
                                // Update current stock when batch changes
                                const selectedBatch = availableBatches.find((b: any) => b.batch === e.target.value);
                                if (selectedBatch) {
                                  handleItemChange(item.id, 'currentStock', selectedBatch.quantity);
                                }
                              }}
                              placeholder="Enter or select batch"
                              className="w-full"
                              disabled={!item.productId}
                            />
                            {availableBatches.length > 0 && (
                              <Select
                                value=""
                                onValueChange={(val) => {
                                  handleItemChange(item.id, 'batchNo', val);
                                  const selectedBatch = availableBatches.find((b: any) => b.batch === val);
                                  if (selectedBatch) {
                                    handleItemChange(item.id, 'currentStock', selectedBatch.quantity);
                                  }
                                }}
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableBatches.map((batch: any, idx: number) => (
                                    <SelectItem key={idx} value={batch.batch}>
                                      {batch.batch} {batch.expiryDate ? `(Exp: ${new Date(batch.expiryDate).toLocaleDateString()})` : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.currentStock}
                            onChange={(e) => handleItemChange(item.id, 'currentStock', Number(e.target.value))}
                            className="w-full"
                            readOnly
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.adjustType}
                            onValueChange={(val) => handleItemChange(item.id, 'adjustType', val)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Write off">Write off</SelectItem>
                              <SelectItem value="Found">Found</SelectItem>
                              <SelectItem value="Damaged">Damaged</SelectItem>
                              <SelectItem value="Expired">Expired</SelectItem>
                              <SelectItem value="Correction">Correction</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.adjustedQty || ""}
                            onChange={(e) => handleItemChange(item.id, 'adjustedQty', Number(e.target.value))}
                            placeholder="0"
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.adjustReason}
                            onValueChange={(val) => handleItemChange(item.id, 'adjustReason', val)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Damaged">Damaged</SelectItem>
                              <SelectItem value="Expired">Expired</SelectItem>
                              <SelectItem value="Found">Found</SelectItem>
                              <SelectItem value="Missing">Missing</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.remarks}
                            onChange={(e) => handleItemChange(item.id, 'remarks', e.target.value)}
                            placeholder="Remarks"
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleAddToRecords(item.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Add
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </Card>

      {/* Adjusted Stock Records Section */}
      <Card>
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Adjusted Stock Records</h2>

          {/* Records Table */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">SL</TableHead>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Pack Type</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>A/U</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Adjusted Qty</TableHead>
                  <TableHead>Adjust Type</TableHead>
                  <TableHead>Expire Date</TableHead>
                  <TableHead className="w-20">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record, index) => (
                    <TableRow key={record.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{record.itemCode}</TableCell>
                      <TableCell>{record.packType}</TableCell>
                      <TableCell>{record.itemName}</TableCell>
                      <TableCell>{record.unit}</TableCell>
                      <TableCell>{record.category}</TableCell>
                      <TableCell>{record.adjustedQty}</TableCell>
                      <TableCell>{record.adjustType}</TableCell>
                      <TableCell>{record.expireDate || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRecord(record.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>

      {/* Final Save Button */}
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
          Save
        </Button>
      </div>
    </div>
  );
}
