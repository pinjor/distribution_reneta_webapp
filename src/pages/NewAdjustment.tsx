import { useState } from "react";
import { PlusCircle, Package, Calendar, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

export default function NewAdjustment() {
  const [adjustmentType, setAdjustmentType] = useState("");
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const { toast } = useToast();

  const handleAddItem = () => {
    const newItem = {
      id: Date.now(),
      material: "",
      batch: "",
      currentQty: 0,
      adjustedQty: 0,
      reason: "",
    };
    setSelectedItems([...selectedItems, newItem]);
  };

  const handleRemoveItem = (id: number) => {
    setSelectedItems(selectedItems.filter((item) => item.id !== id));
  };

  const handleSubmit = () => {
    if (!adjustmentType || selectedItems.length === 0) {
      toast({
        title: "Incomplete form",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Adjustment created",
      description: "Stock adjustment request has been submitted",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">New Stock Adjustment</h1>
        <p className="text-muted-foreground">Create a new stock adjustment request</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="adjustmentType">Adjustment Type *</Label>
                <Select value={adjustmentType} onValueChange={setAdjustmentType}>
                  <SelectTrigger id="adjustmentType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="damaged">Damaged Stock</SelectItem>
                    <SelectItem value="expired">Expired Stock</SelectItem>
                    <SelectItem value="found">Stock Found</SelectItem>
                    <SelectItem value="lost">Stock Lost</SelectItem>
                    <SelectItem value="correction">System Correction</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date">Adjustment Date *</Label>
                <div className="relative">
                  <Input
                    id="date"
                    type="date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                placeholder="Enter reason for adjustment..."
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Adjustment Items</h3>
                <Button onClick={handleAddItem} size="sm">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {selectedItems.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No items added yet</p>
                  <Button onClick={handleAddItem} variant="outline" className="mt-4">
                    Add First Item
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Current Qty</TableHead>
                        <TableHead>Adjusted Qty</TableHead>
                        <TableHead>Variance</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Input placeholder="Select material" className="min-w-[150px]" />
                          </TableCell>
                          <TableCell>
                            <Input placeholder="Batch no." className="min-w-[120px]" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" defaultValue="0" className="w-24" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" defaultValue="0" className="w-24" />
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-destructive">-</span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6 h-fit">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Summary</h3>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Adjustment Type:</span>
                <span className="font-medium">
                  {adjustmentType
                    ? adjustmentType.charAt(0).toUpperCase() + adjustmentType.slice(1)
                    : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Items:</span>
                <span className="font-medium">{selectedItems.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t space-y-2">
              <Button className="w-full" onClick={handleSubmit}>
                Submit Adjustment
              </Button>
              <Button variant="outline" className="w-full">
                Save as Draft
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
