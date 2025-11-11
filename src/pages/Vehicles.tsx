import { useMemo, useState } from "react";
import { Truck, Plus, ChevronsUpDown, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function Vehicles() {
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: apiEndpoints.vehicles.getAll,
  });
  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: apiEndpoints.vendors.getAll,
  });

  const [showDialog, setShowDialog] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    type: "",
    regNo: "",
    capacity: "",
    depot: "",
    vendorId: "",
    vendorName: "",
    status: "active"
  });
  const [vendorOpen, setVendorOpen] = useState(false);

  const vendorOptions = useMemo(() => {
    if (!Array.isArray(vendors)) return [];
    return vendors.map((vendor: any) => ({
      value: vendor.id ? String(vendor.id) : vendor.name,
      label: vendor.name || vendor.company_name || "Unnamed vendor",
      description: vendor.city || vendor.state || vendor.address || "",
    }));
  }, [vendors]);

  const handleAdd = () => {
    setIsEdit(false);
    setFormData({ type: "", regNo: "", capacity: "", depot: "", vendorId: "", vendorName: "", status: "active" });
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
          <p className="text-2xl font-semibold">{isLoading ? "..." : vehicles.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Active</p>
          <p className="text-2xl font-semibold text-success">{isLoading ? "..." : vehicles.filter((v: any) => v.status === "Active" || v.status === "active").length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Refrigerated</p>
          <p className="text-2xl font-semibold">{isLoading ? "..." : vehicles.filter((v: any) => v.vehicle_type === "Refrigerated Van" || v.vehicle_type === "Refrigerated Truck").length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Standard</p>
          <p className="text-2xl font-semibold">{isLoading ? "..." : vehicles.filter((v: any) => v.vehicle_type === "Standard Truck" || v.vehicle_type === "Mini Truck").length}</p>
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : vehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">No vehicles found</TableCell>
              </TableRow>
            ) : (
              vehicles.map((vehicle: any) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-medium">{vehicle.vehicle_id || vehicle.id}</TableCell>
                  <TableCell>{vehicle.vehicle_type}</TableCell>
                  <TableCell>{vehicle.registration_number}</TableCell>
                  <TableCell>{vehicle.capacity ? `${vehicle.capacity} Ton` : '-'}</TableCell>
                  <TableCell>{vehicle.depot?.name || '-'}</TableCell>
                  <TableCell>{vehicle.vendor || vehicle.vendor_name || '-'}</TableCell>
                  <TableCell>
                    {vehicle.status === "Active" || vehicle.status === "active" ? (
                      <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline">Edit</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
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
              <Popover open={vendorOpen} onOpenChange={setVendorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between",
                      !formData.vendorName && "text-muted-foreground"
                    )}
                  >
                    {formData.vendorName ? (
                      <span className="flex flex-col text-left">
                        <span className="text-sm font-medium text-foreground">{formData.vendorName}</span>
                        {(() => {
                          const match = vendorOptions.find((option) => option.value === formData.vendorId);
                          return match?.description ? (
                            <span className="text-xs text-muted-foreground">{match.description}</span>
                          ) : null;
                        })()}
                      </span>
                    ) : (
                      "Select vendor"
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search vendors..." />
                    <CommandList>
                      <CommandEmpty>No vendors found.</CommandEmpty>
                      <CommandGroup>
                        {vendorOptions.map((option) => (
                          <CommandItem
                            key={option.value}
                            value={`${option.label} ${option.description ?? ""}`}
                            onSelect={() => {
                              setFormData((prev) => ({
                                ...prev,
                                vendorId: option.value,
                                vendorName: option.label,
                              }));
                              setVendorOpen(false);
                            }}
                            className="flex items-start gap-2"
                          >
                            <Check
                              className={cn(
                                "mt-1 h-4 w-4",
                                option.value === formData.vendorId ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="flex flex-col">
                              <span className="text-sm font-medium text-foreground">{option.label}</span>
                              {option.description ? (
                                <span className="text-xs text-muted-foreground">{option.description}</span>
                              ) : null}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
