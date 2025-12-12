import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Car, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";

const vehicleSchema = z.object({
  vehicle_id: z.string().min(1, "Vehicle ID is required"),
  vehicle_type: z.string().min(1, "Vehicle type is required"),
  registration_number: z.string().min(1, "Registration number is required"),
  capacity: z.number().positive().optional().or(z.literal("")),
  depot_id: z.number().positive("Depot is required"),
  status: z.string().default("Active"),
  fuel_type: z.string().optional(),
  fuel_rate: z.number().nonnegative().optional().or(z.literal("")),
  fuel_efficiency: z.number().positive().optional().or(z.literal("")),
  model: z.string().optional(),
  year: z.number().int().min(1900).max(2100).optional().or(z.literal("")),
  maintenance_schedule_km: z.number().positive().optional().or(z.literal("")),
  last_maintenance_date: z.string().optional(),
  last_maintenance_km: z.number().nonnegative().optional().or(z.literal("")),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

export default function VehicleManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["transport", "vehicles"],
    queryFn: () => apiEndpoints.transport.vehicles.getAll(),
  });

  const { data: depots = [] } = useQuery({
    queryKey: ["depots"],
    queryFn: apiEndpoints.depots.getAll,
  });

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      vehicle_id: "",
      vehicle_type: "",
      registration_number: "",
      capacity: "",
      depot_id: 0,
      status: "Active",
      fuel_type: "",
      fuel_rate: "",
      fuel_efficiency: "",
      model: "",
      year: "",
      maintenance_schedule_km: "",
      last_maintenance_date: "",
      last_maintenance_km: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiEndpoints.transport.vehicles.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transport", "vehicles"] });
      toast({
        title: "Success",
        description: "Vehicle created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create vehicle",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiEndpoints.transport.vehicles.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transport", "vehicles"] });
      toast({
        title: "Success",
        description: "Vehicle updated successfully",
      });
      setIsDialogOpen(false);
      setEditingVehicle(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update vehicle",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiEndpoints.transport.vehicles.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transport", "vehicles"] });
      toast({
        title: "Success",
        description: "Vehicle deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete vehicle",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (vehicle: any) => {
    setEditingVehicle(vehicle);
    form.reset({
      vehicle_id: vehicle.vehicle_id,
      vehicle_type: vehicle.vehicle_type,
      registration_number: vehicle.registration_number,
      capacity: vehicle.capacity || "",
      depot_id: vehicle.depot_id,
      status: vehicle.status || "Active",
      fuel_type: vehicle.fuel_type || "",
      fuel_rate: vehicle.fuel_rate || "",
      fuel_efficiency: vehicle.fuel_efficiency || "",
      model: vehicle.model || "",
      year: vehicle.year || "",
      maintenance_schedule_km: vehicle.maintenance_schedule_km || "",
      last_maintenance_date: vehicle.last_maintenance_date || "",
      last_maintenance_km: vehicle.last_maintenance_km || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this vehicle?")) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: VehicleFormData) => {
    const submitData = {
      ...data,
      capacity: data.capacity === "" ? undefined : data.capacity,
      fuel_rate: data.fuel_rate === "" ? undefined : data.fuel_rate,
      fuel_efficiency: data.fuel_efficiency === "" ? undefined : data.fuel_efficiency,
      year: data.year === "" ? undefined : data.year,
      maintenance_schedule_km: data.maintenance_schedule_km === "" ? undefined : data.maintenance_schedule_km,
      last_maintenance_km: data.last_maintenance_km === "" ? undefined : data.last_maintenance_km,
      last_maintenance_date: data.last_maintenance_date === "" ? undefined : data.last_maintenance_date,
    };

    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vehicle Management</h1>
          <p className="text-muted-foreground">Manage your fleet of vehicles</p>
        </div>
        <Button onClick={() => {
          setEditingVehicle(null);
          form.reset();
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vehicle
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vehicles</CardTitle>
          <CardDescription>List of all vehicles in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle ID</TableHead>
                <TableHead>Registration</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Fuel Type</TableHead>
                <TableHead>Fuel Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No vehicles found
                  </TableCell>
                </TableRow>
              ) : (
                vehicles.map((vehicle: any) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">{vehicle.vehicle_id}</TableCell>
                    <TableCell>{vehicle.registration_number}</TableCell>
                    <TableCell>{vehicle.vehicle_type}</TableCell>
                    <TableCell>{vehicle.model || "-"}</TableCell>
                    <TableCell>{vehicle.fuel_type || "-"}</TableCell>
                    <TableCell>
                      {vehicle.fuel_rate ? `৳${vehicle.fuel_rate}/km` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={vehicle.status === "Active" ? "default" : "secondary"}>
                        {vehicle.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(vehicle)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(vehicle.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}
            </DialogTitle>
            <DialogDescription>
              {editingVehicle
                ? "Update vehicle information"
                : "Add a new vehicle to the fleet"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vehicle_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle ID *</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!!editingVehicle} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="registration_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Number *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vehicle_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vehicle type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Two Wheeler">Two Wheeler</SelectItem>
                          <SelectItem value="Three Wheeler">Three Wheeler</SelectItem>
                          <SelectItem value="Four Wheeler">Four Wheeler</SelectItem>
                          <SelectItem value="Truck">Truck</SelectItem>
                          <SelectItem value="Van">Van</SelectItem>
                          <SelectItem value="Bus">Bus</SelectItem>
                          <SelectItem value="Pickup">Pickup</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="depot_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Depot *</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select depot" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {depots.map((depot: any) => (
                            <SelectItem key={depot.id} value={depot.id.toString()}>
                              {depot.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? "" : parseFloat(e.target.value)
                            )
                          }
                          value={field.value === "" ? "" : field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="fuel_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuel Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select fuel type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Petrol">Petrol</SelectItem>
                          <SelectItem value="Diesel">Diesel</SelectItem>
                          <SelectItem value="CNG">CNG</SelectItem>
                          <SelectItem value="Electric">Electric</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fuel_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuel Rate (৳/km)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? "" : parseFloat(e.target.value)
                            )
                          }
                          value={field.value === "" ? "" : field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fuel_efficiency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuel Efficiency (km/l)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? "" : parseFloat(e.target.value)
                            )
                          }
                          value={field.value === "" ? "" : field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? "" : parseInt(e.target.value)
                            )
                          }
                          value={field.value === "" ? "" : field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="maintenance_schedule_km"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maintenance Schedule (km)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? "" : parseFloat(e.target.value)
                            )
                          }
                          value={field.value === "" ? "" : field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_maintenance_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Maintenance Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_maintenance_km"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Maintenance (km)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? "" : parseFloat(e.target.value)
                            )
                          }
                          value={field.value === "" ? "" : field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingVehicle(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingVehicle ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

