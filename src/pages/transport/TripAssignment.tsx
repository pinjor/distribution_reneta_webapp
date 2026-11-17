import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, useReducedMotion } from "framer-motion";
import { Calculator, Loader2, MapPin, Plus, Route } from "lucide-react";
import { TransportQuickNav } from "@/components/transport/TransportQuickNav";
import {
  asList,
  dialogContentClass,
  fieldClass,
  fieldWrapClass,
  KpiCard,
  labelClass,
  requiredMark,
  sectionMotion,
  selectItemClass,
  selectPanelClass,
  StatusPill,
} from "@/components/transport/transportUi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { useTableSort } from "@/hooks/useTableSort";

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
  const reduceMotion = useReducedMotion();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: tripsData, isLoading, error: tripsError } = useQuery({
    queryKey: ["transport", "trips"],
    queryFn: async () => {
      const data = await apiEndpoints.transport.trips.getAll();
      console.log("Trips data received:", data);
      return data;
    },
    onError: (error: Error) => {
      console.error("Error fetching trips:", error);
    },
  });

  const trips = asList<Record<string, unknown>>(tripsData);

  const { data: vehiclesResponse = [] } = useQuery({
    queryKey: ["transport", "vehicles"],
    queryFn: () => apiEndpoints.transport.vehicles.getAll(),
  });

  const { data: driversResponse = [] } = useQuery({
    queryKey: ["transport", "drivers"],
    queryFn: () => apiEndpoints.transport.drivers.getAll(),
  });

  const { data: routesResponse = [] } = useQuery({
    queryKey: ["routes"],
    queryFn: apiEndpoints.routes.getAll,
  });

  const vehicles = asList<Record<string, unknown>>(vehiclesResponse);
  const drivers = asList<Record<string, unknown>>(driversResponse);
  const routes = asList<Record<string, unknown>>(routesResponse);

  const form = useForm<TripFormData>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      delivery_id: undefined,
      vehicle_id: undefined as unknown as number,
      driver_id: undefined as unknown as number,
      route_id: undefined as unknown as number,
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
        const vehicle = vehicles.find((v) => v.id === vehicleId);
        if (vehicle?.fuel_rate) {
          setEstimatedCost(Number(vehicle.fuel_rate) * data.distance_km);
        }
      }
    },
  });

  const assignMutation = useMutation({
    mutationFn: (data: TripFormData) => apiEndpoints.transport.trips.assign(data),
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
    onError: (error: Error & { details?: { detail?: string } }) => {
      console.error("Trip assignment error:", error);
      toast({
        title: "Error",
        description: error.message || error.details?.detail || "Failed to assign trip",
        variant: "destructive",
      });
    },
  });

  const handleRouteChange = (routeId: number) => {
    const validRouteId = routeId && !isNaN(routeId) && routeId > 0 ? routeId : null;

    if (validRouteId) {
      form.setValue("route_id", validRouteId);
      calculateDistanceMutation.mutate(validRouteId);
    } else {
      form.setValue("route_id", undefined as unknown as number);
      setCalculatedDistance(null);
      setEstimatedCost(null);
    }
  };

  const handleVehicleChange = (vehicleId: number) => {
    form.setValue("vehicle_id", vehicleId);
    const routeId = form.watch("route_id");
    if (routeId && calculatedDistance) {
      const vehicle = vehicles.find((v) => v.id === vehicleId);
      if (vehicle?.fuel_rate) {
        setEstimatedCost(Number(vehicle.fuel_rate) * calculatedDistance);
      }
    }
  };

  const onSubmit = (data: TripFormData) => {
    assignMutation.mutate({
      ...data,
      delivery_id: data.delivery_id || undefined,
    });
  };

  if (tripsError) {
    console.error("Trips error:", tripsError);
  }

  const tableRows = trips.map((trip) => {
    const order = trip.order as { loading_number?: string } | undefined;
    const vehicle = trip.vehicle as { registration_number?: string; vehicle_id?: string } | undefined;
    const driver = trip.driver as { first_name?: string; last_name?: string } | undefined;
    const route = trip.route as { name?: string } | undefined;
    return {
      ...trip,
      loading_number: order?.loading_number || "-",
      vehicle_label: vehicle?.registration_number || vehicle?.vehicle_id || "-",
      driver_label: driver ? `${driver.first_name || ""} ${driver.last_name || ""}`.trim() || "-" : "-",
      route_label: route?.name || String(trip.route_name || "-"),
    };
  });

  const filteredRows = tableRows.filter((row) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return [
      row.trip_number,
      row.vehicle_label,
      row.driver_label,
      row.route_label,
      row.loading_number,
      row.status,
    ]
      .map((value) => String(value || "").toLowerCase())
      .some((value) => value.includes(term));
  });

  const { sortedData, sortKey, sortOrder, handleSort } = useTableSort(filteredRows, "trip_number");
  const motionProps = sectionMotion(reduceMotion);

  const columns: DataTableColumn<(typeof tableRows)[number]>[] = [
    {
      key: "trip_number",
      label: "Trip Number",
      sortable: true,
      render: (val) => <span className="font-medium text-[#172B4D] dark:text-[#F1F5F9]">{String(val || "—")}</span>,
    },
    {
      key: "trip_date",
      label: "Date",
      sortable: true,
      className: "whitespace-nowrap tabular-nums",
      render: (val) => (val ? new Date(String(val)).toLocaleDateString() : "—"),
    },
    {
      key: "loading_number",
      label: "Loading",
      sortable: true,
      className: "font-mono text-xs",
      render: (val) => String(val || "-"),
    },
    { key: "vehicle_label", label: "Vehicle", sortable: true, render: (val) => String(val || "-") },
    { key: "driver_label", label: "Driver", sortable: true, render: (val) => String(val || "-") },
    { key: "route_label", label: "Route", sortable: true, render: (val) => String(val || "-") },
    {
      key: "distance_km",
      label: "Distance",
      sortable: true,
      className: "tabular-nums",
      render: (val) => (val ? `${val} km` : "-"),
    },
    {
      key: "estimated_fuel_cost",
      label: "Fuel Cost",
      sortable: true,
      className: "tabular-nums",
      render: (val) => (typeof val === "number" ? `৳${val.toFixed(2)}` : "-"),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (val) => <StatusPill value={String(val || "—")} active={String(val) === "Completed"} />,
    },
  ];

  return (
    <ThemeScope className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-x-hidden">
        <motion.div {...motionProps} className="shrink-0">
          <TransportQuickNav />
        </motion.div>

        <motion.div {...motionProps} className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard title="Total Trips" value={trips.length} icon={Route} accent="blue" />
          <KpiCard
            title="Active Vehicles"
            value={vehicles.filter((v) => v.status === "Active").length}
            icon={MapPin}
            accent="green"
          />
          <KpiCard
            title="Available Drivers"
            value={drivers.filter((d) => d.status === "Available").length}
            icon={Calculator}
            accent="purple"
          />
        </motion.div>

        <motion.div {...motionProps} className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DataTable
            className="min-h-0 min-w-0 flex-1 overflow-hidden"
            title="Trips"
            description="List of all trip assignments"
            toolbarIcon={<Route className="h-4 w-4" />}
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: "Search trips...",
            }}
            toolbarActions={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="ntSecondary"
                  className="!h-8"
                  onClick={async () => {
                    try {
                      const result = await apiEndpoints.transport.trips.backfillFromOrders();
                      toast({
                        title: "Backfill Complete",
                        description: result.message || "Trips backfilled successfully",
                      });
                      queryClient.invalidateQueries({ queryKey: ["transport", "trips"] });
                    } catch (error: unknown) {
                      const message = error instanceof Error ? error.message : "Failed to backfill trips";
                      toast({ title: "Error", description: message, variant: "destructive" });
                    }
                  }}
                >
                  Backfill from Orders
                </Button>
                <Button type="button" variant="ntPrimary" className="!h-8" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Assign Trip
                </Button>
              </div>
            }
            data={sortedData}
            columns={columns}
            loading={isLoading}
            error={tripsError ? `Error loading trips: ${(tripsError as Error).message || "Unknown error"}` : undefined}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={handleSort}
            getRowId={(row) => Number(row.id)}
            resetPageKey={`${searchTerm}|${String(sortKey ?? "")}|${sortOrder}|${sortedData.length}`}
            emptyMessage={searchTerm ? "No trips found matching your search." : "No trips found"}
          />
        </motion.div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={dialogContentClass}>
          <DialogHeader className="shrink-0 space-y-0.5 border-b border-[#E3EAF3] px-5 py-3 text-left dark:border-[#2C3B50]">
            <div className="flex items-start gap-3 pr-6">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]">
                <Route className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">Assign trip</DialogTitle>
                <DialogDescription className="text-sm text-[#64748B] dark:text-[#A9B8CC]">
                  Assign a vehicle and driver to a delivery route
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
              <div className="nt-form nt-form-compact min-h-0 flex-1 overflow-y-auto px-5 py-3">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="route_id"
                    render={({ field }) => (
                      <FormItem className={`${fieldWrapClass} sm:col-span-2`}>
                        <FormLabel className={labelClass}>Route {requiredMark}</FormLabel>
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
                            <SelectTrigger className={fieldClass}>
                              <SelectValue placeholder="Select route" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className={selectPanelClass}>
                            {routes.map((route) => (
                              <SelectItem key={String(route.id)} value={String(route.id)} className={selectItemClass}>
                                {String(route.name)} ({String(route.code)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {calculatedDistance !== null && (
                  <div className="mt-2.5 rounded-lg border border-[#EAF2FC] bg-[#F8FAFC] px-3 py-2 text-[13px] text-[#172B4D] dark:border-[#2C3B50] dark:bg-[#1B283B] dark:text-[#F1F5F9]">
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#0C4DA1]" />
                      Calculated Distance: <strong className="tabular-nums">{calculatedDistance} km</strong>
                    </span>
                  </div>
                )}

                <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="vehicle_id"
                    render={({ field }) => (
                      <FormItem className={fieldWrapClass}>
                        <FormLabel className={labelClass}>Vehicle {requiredMark}</FormLabel>
                        <Select
                          onValueChange={(value) => handleVehicleChange(parseInt(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className={fieldClass}>
                              <SelectValue placeholder="Select vehicle" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className={selectPanelClass}>
                            {vehicles
                              .filter((v) => v.status === "Active")
                              .map((vehicle) => (
                                <SelectItem key={String(vehicle.id)} value={String(vehicle.id)} className={selectItemClass}>
                                  {String(vehicle.registration_number)} - {String(vehicle.vehicle_type)}
                                  {vehicle.fuel_rate ? ` (৳${vehicle.fuel_rate}/km)` : ""}
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
                      <FormItem className={fieldWrapClass}>
                        <FormLabel className={labelClass}>Driver {requiredMark}</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className={fieldClass}>
                              <SelectValue placeholder="Select driver" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className={selectPanelClass}>
                            {drivers
                              .filter((d) => d.status === "Available" || d.status === "On Route")
                              .map((driver) => (
                                <SelectItem key={String(driver.id)} value={String(driver.id)} className={selectItemClass}>
                                  {String(driver.first_name)} {String(driver.last_name || "")} - {String(driver.license_number)}
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
                  <div className="mt-2.5 rounded-lg border border-[#ECFDF5] bg-[#F0FDF4] px-3 py-2 text-[13px] text-[#172B4D] dark:border-[#052E1C] dark:bg-[#052E1C] dark:text-[#F1F5F9]">
                    <span className="inline-flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-[#15803D]" />
                      Estimated Fuel Cost: <strong className="tabular-nums">৳{estimatedCost.toFixed(2)}</strong>
                    </span>
                  </div>
                )}

                <div className="mt-2.5 grid grid-cols-1 gap-2.5">
                  <FormField
                    control={form.control}
                    name="trip_date"
                    render={({ field }) => (
                      <FormItem className={fieldWrapClass}>
                        <FormLabel className={labelClass}>Trip Date {requiredMark}</FormLabel>
                        <FormControl>
                          <Input type="date" className={fieldClass} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className={fieldWrapClass}>
                        <FormLabel className={labelClass}>Notes</FormLabel>
                        <FormControl>
                          <Textarea className={fieldClass} rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <DialogFooter className="shrink-0 gap-2 border-t border-[#E3EAF3] px-5 py-3 dark:border-[#2C3B50]">
                <Button
                  type="button"
                  variant="ntSecondary"
                  onClick={() => {
                    setIsDialogOpen(false);
                    form.reset();
                    setCalculatedDistance(null);
                    setEstimatedCost(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="ntPrimary" disabled={assignMutation.isPending}>
                  {assignMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Assign Trip
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </ThemeScope>
  );
}
