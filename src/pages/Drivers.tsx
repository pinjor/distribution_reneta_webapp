import { useState } from "react";
import { User, Phone, Calendar, MapPin, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Drivers() {
  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: apiEndpoints.drivers.getAll,
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    driverId: "",
    firstName: "",
    lastName: "",
    contact: "",
    licenseNumber: "",
    licenseExpiry: "",
    route: "",
    vehicleId: "",
    status: "Available",
  });

  const createDriver = useMutation({
    mutationFn: (payload: any) => apiEndpoints.drivers.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast({ title: "Driver added", description: "Driver has been created successfully." });
      setShowCreateDialog(false);
      setFormData({
        driverId: "",
        firstName: "",
        lastName: "",
        contact: "",
        licenseNumber: "",
        licenseExpiry: "",
        route: "",
        vehicleId: "",
        status: "Available",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Unable to add driver",
        description: error?.message || "Something went wrong while saving the driver.",
        variant: "destructive",
      });
    },
  });

  const handleViewProfile = (driver: typeof drivers[0]) => {
    setSelectedDriver(driver);
    setShowPanel(true);
  };

  const handleCreateDriver = async () => {
    if (!formData.driverId || !formData.firstName || !formData.licenseNumber) {
      toast({
        title: "Missing information",
        description: "Driver ID, first name, and license number are required.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      driver_id: formData.driverId,
      first_name: formData.firstName,
      last_name: formData.lastName || null,
      contact: formData.contact || null,
      license_number: formData.licenseNumber,
      license_expiry: formData.licenseExpiry || null,
      route: formData.route || null,
      vehicle_id: formData.vehicleId || null,
      status: formData.status,
    };

    await createDriver.mutateAsync(payload);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Driver Management</h1>
          <p className="text-muted-foreground">Manage driver assignments and profiles</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Driver
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Drivers</p>
          <p className="text-2xl font-semibold">{isLoading ? "..." : drivers.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Active</p>
          <p className="text-2xl font-semibold text-success">{isLoading ? "..." : drivers.filter((d: any) => d.status === "On Route" || d.status === "Available").length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">On Duty</p>
          <p className="text-2xl font-semibold">{isLoading ? "..." : drivers.filter((d: any) => d.status === "On Route").length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Available</p>
          <p className="text-2xl font-semibold">{isLoading ? "..." : drivers.filter((d: any) => d.status === "Available").length}</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Driver Directory</h2>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Driver ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>License Expiry</TableHead>
              <TableHead>Assigned Vehicle</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : drivers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">No drivers found</TableCell>
              </TableRow>
            ) : (
              drivers.map((driver: any) => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">{driver.driver_id || driver.id}</TableCell>
                  <TableCell>{`${driver.first_name} ${driver.last_name || ''}`.trim()}</TableCell>
                  <TableCell>{driver.contact}</TableCell>
                  <TableCell>{driver.license_expiry}</TableCell>
                  <TableCell>{driver.vehicle_id}</TableCell>
                  <TableCell>{driver.route}</TableCell>
                  <TableCell>
                    {(driver.status === "On Route" || driver.status === "Available") ? (
                      <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => handleViewProfile(driver)}>
                      View Profile
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Sheet open={showPanel} onOpenChange={setShowPanel}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Driver Profile</SheetTitle>
            <SheetDescription>View and manage driver details</SheetDescription>
          </SheetHeader>

          {selectedDriver && (
            <div className="space-y-6 mt-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{`${selectedDriver.first_name} ${selectedDriver.last_name || ''}`.trim()}</h3>
                  <p className="text-sm text-muted-foreground">{selectedDriver.driver_id || selectedDriver.id}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <p className="text-sm font-medium">{selectedDriver.contact}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">License</p>
                    <p className="text-sm font-medium">{selectedDriver.license_number}</p>
                    <p className="text-xs text-muted-foreground">Expires: {selectedDriver.license_expiry}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned Route</p>
                    <p className="text-sm font-medium">{selectedDriver.route}</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Assigned Vehicle</p>
                  <p className="text-sm font-medium">{selectedDriver.vehicle_id}</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  {(selectedDriver.status === "On Route" || selectedDriver.status === "Available") ? (
                    <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <Button className="w-full">Reassign Vehicle</Button>
                <Button className="w-full" variant="outline">Reassign Route</Button>
                <Button className="w-full" variant="outline">Update Details</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Driver</DialogTitle>
            <DialogDescription>Capture the primary information for a new driver.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="driver-id">Driver ID *</Label>
              <Input
                id="driver-id"
                placeholder="DRV-0001"
                value={formData.driverId}
                onChange={(e) => setFormData((prev) => ({ ...prev, driverId: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="driver-first-name">First name *</Label>
              <Input
                id="driver-first-name"
                placeholder="First name"
                value={formData.firstName}
                onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="driver-last-name">Last name</Label>
              <Input
                id="driver-last-name"
                placeholder="Last name"
                value={formData.lastName}
                onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="driver-contact">Contact</Label>
              <Input
                id="driver-contact"
                placeholder="Phone number"
                value={formData.contact}
                onChange={(e) => setFormData((prev) => ({ ...prev, contact: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="driver-license">License number *</Label>
              <Input
                id="driver-license"
                placeholder="License number"
                value={formData.licenseNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, licenseNumber: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="driver-license-expiry">License expiry</Label>
              <Input
                id="driver-license-expiry"
                type="date"
                value={formData.licenseExpiry}
                onChange={(e) => setFormData((prev) => ({ ...prev, licenseExpiry: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="driver-vehicle">Assigned vehicle</Label>
              <Input
                id="driver-vehicle"
                placeholder="Vehicle ID"
                value={formData.vehicleId}
                onChange={(e) => setFormData((prev) => ({ ...prev, vehicleId: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="driver-route">Route</Label>
              <Input
                id="driver-route"
                placeholder="Route / region"
                value={formData.route}
                onChange={(e) => setFormData((prev) => ({ ...prev, route: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="On Route">On Route</SelectItem>
                  <SelectItem value="On Leave">On Leave</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={createDriver.isLoading}>
              Cancel
            </Button>
            <Button onClick={handleCreateDriver} disabled={createDriver.isLoading}>
              {createDriver.isLoading ? "Saving..." : "Save driver"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
