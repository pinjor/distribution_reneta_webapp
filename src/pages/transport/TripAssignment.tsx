import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Route, Plus, Loader2, MapPin, Calculator } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";

const tripSchema = z.object({
  delivery_id: z.number().optional(),
  vehicle_id: z.number().positive("Vehicle is required"),
  driver_id: z.number().positive("Driver is required"),
  route_id: z.number().positive("Route is required"),
  trip_date: z.string().min(1, "Trip date is required"),
  notes: z.string().optional(),
});

type TripFormData = z.infer<typeof tripSchema>;

export default function TripAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);

  const { data: tripsData, isLoading, error: tripsError } = useQuery({
    queryKey: ["transport", "trips"],
    queryFn: async () => {
      const data = await apiEndpoints.transport.trips.getAll();
      console.log("Trips data received:", data);
      return data;
    },
    onError: (error: any) => {
      console.error("Error fetching trips:", error);
    },
  });

  const trips = Array.isArray(tripsData) ? tripsData : [];

  const { data: vehicles = [] } = useQuery({
    queryKey: ["transport", "vehicles"],
    queryFn: () => apiEndpoints.transport.vehicles.getAll(),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["transport", "drivers"],
    queryFn: () => apiEndpoints.transport.drivers.getAll(),
  });

  const { data: routes = [] } = useQuery({
    queryKey: ["routes"],
    queryFn: apiEndpoints.routes.getAll,
  });

  const form = useForm<TripFormData>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      delivery_id: undefined,
      vehicle_id: undefined as any,
      driver_id: undefined as any,
      route_id: undefined as any,
      trip_date: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  const calculateDistanceMutation = useMutation({
    mutationFn: (routeId: number) => apiEndpoints.transport.routes.getDistance(routeId),
    onSuccess: (data) => {
      setCalculatedDistance(data.distance_km);
      const vehicleId = form.watch("vehicle_id");
      if (vehicleId && data.distance_km) {
        const vehicle = vehicles.find((v: any) => v.id === vehicleId);
        if (vehicle?.fuel_rate) {
          setEstimatedCost(vehicle.fuel_rate * data.distance_km);
        }
      }
    },
  });

  const assignMutation = useMutation({
    mutationFn: (data: any) => apiEndpoints.transport.trips.assign(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transport", "trips"] });
      toast({
        title: "Success",
        description: data.message || "Trip assigned successfully",
      });
      setIsDialogOpen(false);
      form.reset();
      setCalculatedDistance(null);
      setEstimatedCost(null);
    },
    onError: (error: any) => {
      console.error("Trip assignment error:", error);
      toast({
        title: "Error",
        description: error.message || error.details?.detail || "Failed to assign trip",
        variant: "destructive",
      });
    },
  });

  const handleRouteChange = (routeId: number) => {
    // Validate routeId is a valid positive number
    const validRouteId = routeId && !isNaN(routeId) && routeId > 0 ? routeId : null;
    
    if (validRouteId) {
      form.setValue("route_id", validRouteId);
      calculateDistanceMutation.mutate(validRouteId);
    } else {
      form.setValue("route_id", undefined);
      setCalculatedDistance(null);
      setEstimatedCost(null);
    }
  };

  const handleVehicleChange = (vehicleId: number) => {
    form.setValue("vehicle_id", vehicleId);
    const routeId = form.watch("route_id");
    if (routeId && calculatedDistance) {
      const vehicle = vehicles.find((v: any) => v.id === vehicleId);
      if (vehicle?.fuel_rate) {
        setEstimatedCost(vehicle.fuel_rate * calculatedDistance);
      }
    }
  };

  const onSubmit = (data: TripFormData) => {
    assignMutation.mutate({
      ...data,
      delivery_id: data.delivery_id || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (tripsError) {
    console.error("Trips error:", tripsError);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trip Assignment</h1>
          <p className="text-muted-foreground">Assign vehicles and drivers to delivery routes</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={async () => {
              try {
                const result = await apiEndpoints.transport.trips.backfillFromOrders();
                toast({
                  title: "Backfill Complete",
                  description: result.message || "Trips backfilled successfully",
                });
                queryClient.invalidateQueries({ queryKey: ["transport", "trips"] });
              } catch (error: any) {
                toast({
                  title: "Error",
                  description: error.message || "Failed to backfill trips",
                  variant: "destructive",
                });
              }
            }}
          >
            Backfill from Orders
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Assign Trip
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trips</CardTitle>
          <CardDescription>List of all trip assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trip Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Fuel Cost</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tripsError ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-red-500 py-8">
                    Error loading trips: {tripsError.message || "Unknown error"}
                  </TableCell>
                </TableRow>
              ) : trips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-muted-foreground font-medium">No trips found</p>
                      <p className="text-sm text-muted-foreground">
                        Click the "Assign Trip" button above to create your first trip assignment.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                trips.map((trip: any) => (
                  <TableRow key={trip.id}>
                    <TableCell className="font-medium">{trip.trip_number}</TableCell>
                    <TableCell>{new Date(trip.trip_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {trip.order?.loading_number ? (
                        <Badge variant="outline" className="font-mono">
                          {trip.order.loading_number}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {trip.vehicle?.registration_number || trip.vehicle?.vehicle_id || "-"}
                    </TableCell>
                    <TableCell>
                      {trip.driver
                        ? `${trip.driver.first_name} ${trip.driver.last_name || ""}`.trim()
                        : "-"}
                    </TableCell>
                    <TableCell>{trip.route?.name || trip.route_name || "-"}</TableCell>
                    <TableCell>{trip.distance_km ? `${trip.distance_km} km` : "-"}</TableCell>
                    <TableCell>
                      {trip.estimated_fuel_cost ? `৳${trip.estimated_fuel_cost.toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={trip.status === "Completed" ? "default" : "secondary"}>
                        {trip.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Trip</DialogTitle>
            <DialogDescription>
              Assign a vehicle and driver to a delivery route
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="route_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Route *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        if (!value || value === "" || value === "undefined") {
                          handleRouteChange(0);
                          return;
                        }
                        const routeId = parseInt(value, 10);
                        if (!isNaN(routeId) && routeId > 0) {
                          handleRouteChange(routeId);
                        } else {
                          handleRouteChange(0);
                        }
                      }}
                      value={field.value && field.value > 0 ? field.value.toString() : undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select route" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {routes.map((route: any) => (
                          <SelectItem key={route.id} value={route.id.toString()}>
                            {route.name} ({route.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {calculatedDistance !== null && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" />
                    <span>Calculated Distance: <strong>{calculatedDistance} km</strong></span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vehicle_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle *</FormLabel>
                      <Select
                        onValueChange={(value) => handleVehicleChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vehicle" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vehicles
                            .filter((v: any) => v.status === "Active")
                            .map((vehicle: any) => (
                              <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                                {vehicle.registration_number} - {vehicle.vehicle_type}
                                {vehicle.fuel_rate && ` (৳${vehicle.fuel_rate}/km)`}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="driver_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Driver *</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select driver" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {drivers
                            .filter((d: any) => d.status === "Available" || d.status === "On Route")
                            .map((driver: any) => (
                              <SelectItem key={driver.id} value={driver.id.toString()}>
                                {driver.first_name} {driver.last_name || ""} - {driver.license_number}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {estimatedCost !== null && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Calculator className="h-4 w-4" />
                    <span>Estimated Fuel Cost: <strong>৳{estimatedCost.toFixed(2)}</strong></span>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="trip_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trip Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
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
                    form.reset();
                    setCalculatedDistance(null);
                    setEstimatedCost(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={assignMutation.isPending}>
                  {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Assign Trip
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

