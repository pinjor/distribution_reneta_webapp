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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function Vehicles() {
  const queryClient = useQueryClient();
  const { data: vehiclesResponse = [], isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: apiEndpoints.vehicles.getAll,
  });
  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: apiEndpoints.vendors.getAll,
  });

  const [showDialog, setShowDialog] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | number | null>(null);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    type: "",
    regNo: "",
    capacity: "",
    depot: "",
    depotId: "",
    vendorId: "",
    vendorName: "",
    status: "active"
  });
  const [vendorOpen, setVendorOpen] = useState(false);
  const [optimisticVehicles, setOptimisticVehicles] = useState<any[]>([]);

  const vendorOptions = useMemo(() => {
    const options = Array.isArray(vendors)
      ? vendors.map((vendor: any) => ({
          value: vendor.id ? String(vendor.id) : vendor.name,
          label: vendor.name || vendor.company_name || "Unnamed vendor",
          description: vendor.city || vendor.state || vendor.address || "",
        }))
      : [];
    if (options.length > 0) return options;
    return [
      { value: "vendor-renata-logistics", label: "Renata Logistics", description: "Primary transport partner" },
      { value: "vendor-north-star", label: "North Star Transport", description: "Covers northern region" },
      { value: "vendor-cool-chain", label: "Cool Chain Ltd.", description: "Refrigerated fleet specialist" },
    ];
  }, [vendors]);

  const vehicles = useMemo(() => {
    if (Array.isArray(vehiclesResponse) && vehiclesResponse.length > 0) {
      return vehiclesResponse;
    }
    if (optimisticVehicles.length > 0) {
      return optimisticVehicles;
    }
    return [
      {
        id: "VH-0001",
        vehicle_id: "VH-0001",
        vehicle_type: "Refrigerated Truck",
        registration_number: "DHAKA-4045",
        capacity: 3.5,
        depot: { name: "TURAG DC" },
        vendor: "Renata Logistics",
        status: "active",
      },
      {
        id: "VH-0002",
        vehicle_id: "VH-0002",
        vehicle_type: "Mini Truck",
        registration_number: "CTG-5123",
        capacity: 2,
        depot: { name: "Chattogram DC" },
        vendor: "North Star Transport",
        status: "Active",
      },
      {
        id: "VH-0003",
        vehicle_id: "VH-0003",
        vehicle_type: "Dry Van",
        registration_number: "RAJ-9981",
        capacity: 5,
        depot: { name: "Rajshahi DC" },
        vendor: "Renata Logistics",
        status: "Inactive",
      },
    ];
  }, [vehiclesResponse, optimisticVehicles]);

  const createVehicle = useMutation({
    mutationFn: (payload: any) => apiEndpoints.vehicles.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast({ title: "Vehicle saved", description: "Vehicle information stored successfully." });
      setShowDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Unable to save vehicle",
        description: error?.message || "Please review the details and try again.",
        variant: "destructive",
      });
    },
  });

  type UpdateVehiclePayload = { id: number; payload: any; displayDepot?: string };

  const updateVehicle = useMutation({
    mutationFn: ({ id, payload }: UpdateVehiclePayload) => apiEndpoints.vehicles.update(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      if (!Array.isArray(vehiclesResponse) || vehiclesResponse.length === 0) {
        const updated = buildOptimisticVehicle({ ...variables.payload, depot: variables.displayDepot });
        setOptimisticVehicles((prev) =>
          prev.map((entry) =>
            (entry.id || entry.vehicle_id) === (editingVehicleId ?? updated.id)
              ? { ...entry, ...updated, depot: updated.depot }
              : entry,
          ),
        );
      }
      toast({ title: "Vehicle updated", description: "Vehicle information refreshed successfully." });
      handleDialogClose();
    },
    onError: (error: any, variables) => {
      toast({
        title: "Unable to update vehicle",
        description: error?.message || "Please review the details and try again.",
        variant: "destructive",
      });
      const updated = buildOptimisticVehicle({ ...variables.payload, depot: variables.displayDepot });
      setOptimisticVehicles((prev) =>
        prev.map((entry) =>
          (entry.id || entry.vehicle_id) === (editingVehicleId ?? updated.id)
            ? { ...entry, ...updated, depot: updated.depot }
            : entry,
        ),
      );
      handleDialogClose();
    },
  });

  const resetForm = () => {
    setFormData({ type: "", regNo: "", capacity: "", depot: "", depotId: "", vendorId: "", vendorName: "", status: "active" });
    setIsEdit(false);
    setEditingVehicleId(null);
  };

  const handleDialogClose = () => {
    setShowDialog(false);
    resetForm();
  };

  const handleAdd = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.type || !formData.regNo || (!formData.depot && !formData.depotId)) {
      toast({
        title: "Missing information",
        description: "Vehicle type, registration number, and depot are required.",
        variant: "destructive",
      });
      return;
    }

    const parsedCapacity = formData.capacity ? parseFloat(formData.capacity) : null;
    const payload = {
      vehicle_id: formData.regNo.toUpperCase(),
      vehicle_type: formData.type,
      registration_number: formData.regNo.toUpperCase(),
      capacity: Number.isFinite(parsedCapacity ?? NaN) ? parsedCapacity : formData.capacity || null,
      depot_id: formData.depotId ? Number(formData.depotId) : null,
      vendor: formData.vendorName || null,
      status: formData.status || "active",
      is_active: (formData.status || "active").toLowerCase() === "active",
    };

    if (isEdit && editingVehicleId !== null) {
      // Optimistic update for sample/fallback rows (string IDs)
      if (typeof editingVehicleId !== "number") {
        const updated = buildOptimisticVehicle({ ...payload, depot: formData.depot });
        setOptimisticVehicles((prev) =>
          prev.map((entry) =>
            (entry.id || entry.vehicle_id) === editingVehicleId
              ? { ...entry, ...updated, depot: { name: formData.depot } }
              : entry,
          ),
        );
        toast({ title: "Vehicle updated", description: "Changes applied locally." });
        handleDialogClose();
        return;
      }

      await updateVehicle.mutateAsync({ id: editingVehicleId, payload, displayDepot: formData.depot });
      return;
    }

    if (!Array.isArray(vehiclesResponse) || vehiclesResponse.length === 0 || typeof formData.regNo === "string") {
      const optimistic = buildOptimisticVehicle({ ...payload, depot: formData.depot });
      setOptimisticVehicles((prev) => [
        {
          ...optimistic,
          depot: { name: formData.depot },
        },
        ...prev.filter((entry) => (entry.id || entry.vehicle_id) !== optimistic.id),
      ]);
    }

    await createVehicle.mutateAsync(payload);
  };

  const handleEdit = (vehicle: any) => {
    const vendorLabel = vehicle.vendor || vehicle.vendor_name || vehicle.vendorName || "";
    const vendorMatch = vendorOptions.find(
      (option) => option.label.toLowerCase() === vendorLabel.toLowerCase(),
    );
    setIsEdit(true);
    setEditingVehicleId(vehicle.id ?? vehicle.vehicle_id ?? null);
    setFormData({
      type: vehicle.vehicle_type || "",
      regNo: vehicle.registration_number || vehicle.vehicle_id || "",
      capacity:
        typeof vehicle.capacity === "number"
          ? String(vehicle.capacity)
          : typeof vehicle.capacity === "string"
          ? vehicle.capacity
          : "",
      depot: typeof vehicle.depot === "string" ? vehicle.depot : vehicle.depot?.name || "",
      depotId: vehicle.depot_id ?? vehicle.depot?.id ?? "",
      vendorId: vendorMatch?.value || "",
      vendorName: vendorMatch?.label || vendorLabel,
      status: vehicle.status?.toLowerCase() || "active",
    });
    setShowDialog(true);
  };

  const buildOptimisticVehicle = (payload: any) => {
    const id = payload.vehicle_id || payload.registration_number;
    const depotName = payload.depot ?? payload.displayDepot ?? "";
    return {
      id,
      vehicle_id: payload.vehicle_id,
      vehicle_type: payload.vehicle_type,
      registration_number: payload.registration_number,
      capacity: payload.capacity,
      depot: depotName ? { name: depotName } : undefined,
      vendor: payload.vendor || payload.vendor_name,
      status: payload.status,
      is_active: payload.is_active,
    };
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
                <TableRow key={vehicle.id ?? vehicle.vehicle_id}>
                  <TableCell className="font-medium">{vehicle.vehicle_id || vehicle.id}</TableCell>
                  <TableCell>{vehicle.vehicle_type}</TableCell>
                  <TableCell>{vehicle.registration_number}</TableCell>
                  <TableCell>
                    {typeof vehicle.capacity === "number"
                      ? `${vehicle.capacity} Ton`
                      : typeof vehicle.capacity === "string" && vehicle.capacity.trim() !== ""
                      ? vehicle.capacity
                      : "-"}
                  </TableCell>
                  <TableCell>{typeof vehicle.depot === "string" ? vehicle.depot : vehicle.depot?.name || "-"}</TableCell>
                  <TableCell>{vehicle.vendor || vehicle.vendor_name || vehicle.vendorName || "-"}</TableCell>
                  <TableCell>
                    {vehicle.status === "Active" || vehicle.status === "active" ? (
                      <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(vehicle)}
                      disabled={createVehicle.isLoading || updateVehicle.isPending}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          if (open) {
            setShowDialog(true);
          } else {
            handleDialogClose();
          }
        }}
      >
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
                  <SelectItem value="Refrigerated Truck">Refrigerated Truck</SelectItem>
                  <SelectItem value="Refrigerated Van">Refrigerated Van</SelectItem>
                  <SelectItem value="Dry Van">Dry Van</SelectItem>
                  <SelectItem value="Mini Truck">Mini Truck</SelectItem>
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
              <Select
                value={formData.depot}
                onValueChange={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    depot: val,
                    depotId: "",
                  }))
                }
              >
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
            <Button variant="outline" onClick={handleDialogClose} disabled={createVehicle.isLoading || updateVehicle.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createVehicle.isLoading || updateVehicle.isPending}
            >
              {isEdit
                ? updateVehicle.isPending
                  ? "Updating..."
                  : "Update"
                : createVehicle.isLoading
                ? "Saving..."
                : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
