import { useState } from "react";
import { Truck, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const vehicles = [
  { id: "VH-001", type: "Refrigerated", regNo: "TN-01-AB-1234", capacity: "5 Ton", depot: "Chennai Main", vendor: "LogiTrans", status: "active" },
  { id: "VH-002", type: "Dry Van", regNo: "TN-02-CD-5678", capacity: "10 Ton", depot: "Chennai South", vendor: "QuickMove", status: "active" },
  { id: "VH-003", type: "Refrigerated", regNo: "TN-03-EF-9012", capacity: "7 Ton", depot: "Chennai North", vendor: "LogiTrans", status: "inactive" },
];

export default function Vehicles() {
  const [showDialog, setShowDialog] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    type: "",
    regNo: "",
    capacity: "",
    depot: "",
    vendor: "",
    status: "active"
  });

  const handleAdd = () => {
    setIsEdit(false);
    setFormData({ type: "", regNo: "", capacity: "", depot: "", vendor: "", status: "active" });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    toast({ title: isEdit ? "Vehicle updated" : "Vehicle added", description: "Changes saved successfully" });
    setShowDialog(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Vehicle Management</h1>
          <p className="text-muted-foreground">Manage fleet vehicles and assignments</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Vehicle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Vehicles</p>
          <p className="text-2xl font-semibold">{vehicles.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Active</p>
          <p className="text-2xl font-semibold text-success">{vehicles.filter(v => v.status === "active").length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Refrigerated</p>
          <p className="text-2xl font-semibold">{vehicles.filter(v => v.type === "Refrigerated").length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Dry Van</p>
          <p className="text-2xl font-semibold">{vehicles.filter(v => v.type === "Dry Van").length}</p>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Fleet Overview</h2>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Registration</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Depot</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell className="font-medium">{vehicle.id}</TableCell>
                <TableCell>{vehicle.type}</TableCell>
                <TableCell>{vehicle.regNo}</TableCell>
                <TableCell>{vehicle.capacity}</TableCell>
                <TableCell>{vehicle.depot}</TableCell>
                <TableCell>{vehicle.vendor}</TableCell>
                <TableCell>
                  {vehicle.status === "active" ? (
                    <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline">Edit</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit" : "Add"} Vehicle</DialogTitle>
            <DialogDescription>Enter vehicle details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Vehicle Type</label>
              <Select value={formData.type} onValueChange={(val) => setFormData({...formData, type: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Refrigerated">Refrigerated</SelectItem>
                  <SelectItem value="Dry Van">Dry Van</SelectItem>
                  <SelectItem value="Box Truck">Box Truck</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Registration Number</label>
              <Input
                placeholder="TN-01-AB-1234"
                value={formData.regNo}
                onChange={(e) => setFormData({...formData, regNo: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Capacity</label>
              <Input
                placeholder="5 Ton"
                value={formData.capacity}
                onChange={(e) => setFormData({...formData, capacity: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Depot</label>
              <Select value={formData.depot} onValueChange={(val) => setFormData({...formData, depot: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select depot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Chennai Main">Chennai Main</SelectItem>
                  <SelectItem value="Chennai South">Chennai South</SelectItem>
                  <SelectItem value="Chennai North">Chennai North</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Vendor</label>
              <Input
                placeholder="Vendor name"
                value={formData.vendor}
                onChange={(e) => setFormData({...formData, vendor: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
