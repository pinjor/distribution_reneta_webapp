import { useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Loader2, Pencil, Plus, Trash2, Truck, Warehouse } from "lucide-react";
import { TransportQuickNav } from "@/components/transport/TransportQuickNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { useTableSort } from "@/hooks/useTableSort";
import { NAVY_TEAL_SCOPE_CLASS } from "@/lib/navyTealTheme";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-10 rounded-lg border border-[#CBD5E1] bg-white text-[13px] shadow-none focus:ring-0 focus-visible:border-[#0C4DA1] focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/20 dark:border-[#2C3B50] dark:bg-[#151F30]";
const labelClass = "text-[13px] font-medium text-[#172B4D] dark:text-[#F1F5F9]";
const selectPanelClass = "nt-select-panel z-[200] rounded-xl border p-1 shadow-lg";
const selectItemClass = "cursor-pointer rounded-md py-2 pl-8 pr-3 text-[13px] leading-snug";
const fieldWrapClass = "min-w-0 space-y-1";
const sectionTitleClass = "mb-2 text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]";
const requiredMark = <span className="text-[#DC2626]">*</span>;

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

interface TransportVehicle {
  id: number;
  vehicle_id: string;
  vehicle_type?: string;
  registration_number?: string;
  capacity?: number | "";
  depot_id?: number;
  status?: string;
  fuel_type?: string;
  fuel_rate?: number | "";
  fuel_efficiency?: number | "";
  model?: string;
  year?: number | "";
  maintenance_schedule_km?: number | "";
  last_maintenance_date?: string;
  last_maintenance_km?: number | "";
}

interface DepotOption {
  id: number;
  name: string;
}

function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

function ActionIconButton({
  label,
  onClick,
  className,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={onClick}
          aria-label={label}
          className={cn("h-8 w-8 rounded-md p-0", className)}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string | number;
  icon: typeof Truck;
  accent: "blue" | "green" | "purple";
}) {
  const accentClass =
    accent === "green"
      ? "bg-[#ECFDF5] text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]"
      : accent === "purple"
        ? "bg-[#F3E8FF] text-[#7C3AED] dark:bg-[#2E1064] dark:text-[#C4B5FD]"
        : "bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]";

  return (
    <div className="rounded-xl border border-[#E3EAF3] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow duration-150 hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:border-[#2C3B50] dark:bg-[#151F30]">
      <div className="flex items-center gap-3">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", accentClass)}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#64748B] dark:text-[#A9B8CC]">{title}</p>
          <p className="text-xl font-semibold tabular-nums tracking-tight text-[#172B4D] dark:text-[#F1F5F9]">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function VehicleManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<TransportVehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: vehiclesResponse = [], isLoading } = useQuery({
    queryKey: ["transport", "vehicles"],
    queryFn: () => apiEndpoints.transport.vehicles.getAll(),
  });

  const { data: depotsResponse = [] } = useQuery({
    queryKey: ["depots"],
    queryFn: apiEndpoints.depots.getAll,
  });

  const vehicles = asList<TransportVehicle>(vehiclesResponse);
  const depots = asList<DepotOption>(depotsResponse);

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
    mutationFn: (data: Record<string, unknown>) => apiEndpoints.transport.vehicles.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transport", "vehicles"] });
      toast({
        title: "Success",
        description: "Vehicle created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create vehicle",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
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
    onError: (error: Error) => {
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
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete vehicle",
        variant: "destructive",
      });
    },
  });

  const openAddDialog = () => {
    setEditingVehicle(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const handleEdit = (vehicle: TransportVehicle) => {
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

  const filteredVehicles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return vehicles;
    return vehicles.filter((vehicle) =>
      [
        vehicle.vehicle_id,
        vehicle.registration_number,
        vehicle.vehicle_type,
        vehicle.model,
        vehicle.fuel_type,
        vehicle.status,
      ]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(term)),
    );
  }, [vehicles, searchTerm]);

  const { sortedData, sortKey, sortOrder, handleSort } = useTableSort(filteredVehicles, "vehicle_id");

  const columns: DataTableColumn<(typeof sortedData)[number]>[] = [
    {
      key: "vehicle_id",
      label: "Vehicle ID",
      sortable: true,
      render: (val) => <span className="font-medium text-[#172B4D] dark:text-[#F1F5F9]">{String(val || "—")}</span>,
    },
    {
      key: "registration_number",
      label: "Registration",
      sortable: true,
      className: "font-mono text-xs",
      render: (val) => String(val || "—"),
    },
    { key: "vehicle_type", label: "Type", sortable: true, render: (val) => String(val || "—") },
    { key: "model", label: "Model", sortable: true, render: (val) => String(val || "-") },
    { key: "fuel_type", label: "Fuel Type", sortable: true, render: (val) => String(val || "-") },
    {
      key: "fuel_rate",
      label: "Fuel Rate",
      sortable: true,
      className: "tabular-nums",
      render: (val) => (val ? `৳${val}/km` : "-"),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (val) => {
        const active = String(val) === "Active";
        return (
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
              active
                ? "bg-[#ECFDF5] text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]"
                : "bg-[#F1F5F9] text-[#475569] dark:bg-[#1B283B] dark:text-[#A9B8CC]",
            )}
          >
            {String(val || "—")}
          </span>
        );
      },
    },
    {
      key: "id",
      label: "Actions",
      align: "right",
      headerClassName: "text-right",
      render: (_val, row) => (
        <div className="flex justify-end gap-0.5">
          <ActionIconButton
            label="Edit vehicle"
            onClick={() => handleEdit(row)}
            className="text-[#475569] hover:bg-[#EAF2FC] hover:text-[#0C4DA1]"
          >
            <Pencil className="h-4 w-4" />
          </ActionIconButton>
          <ActionIconButton
            label="Delete vehicle"
            onClick={() => handleDelete(row.id)}
            disabled={deleteMutation.isPending}
            className="text-[#94A3B8] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
          >
            <Trash2 className="h-4 w-4" />
          </ActionIconButton>
        </div>
      ),
    },
  ];

  const sectionMotion = {
    initial: reduceMotion ? false : { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: reduceMotion ? 0 : 0.16 },
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <ThemeScope className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-x-hidden">
        <motion.div {...sectionMotion} className="shrink-0">
          <TransportQuickNav />
        </motion.div>

        <motion.div {...sectionMotion} className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard title="Total Vehicles" value={vehicles.length} icon={Truck} accent="blue" />
          <KpiCard
            title="Active"
            value={vehicles.filter((v: { status?: string }) => v.status === "Active").length}
            icon={CheckCircle2}
            accent="green"
          />
          <KpiCard
            title="Depots Covered"
            value={new Set(vehicles.map((v: { depot_id?: number }) => v.depot_id).filter(Boolean)).size}
            icon={Warehouse}
            accent="purple"
          />
        </motion.div>

        <motion.div {...sectionMotion} className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DataTable
            className="min-h-0 min-w-0 flex-1 overflow-hidden"
            title="Vehicles"
            description="List of all vehicles in the system"
            toolbarIcon={<Truck className="h-4 w-4" />}
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: "Search vehicles...",
            }}
            toolbarActions={
              <Button type="button" variant="ntPrimary" className="!h-8" onClick={openAddDialog} aria-label="Add Vehicle">
                <Plus className="h-3.5 w-3.5" />
                Add Vehicle
              </Button>
            }
            data={sortedData}
            columns={columns}
            loading={isLoading}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={handleSort}
            getRowId={(row) => row.id}
            resetPageKey={`${searchTerm}|${String(sortKey ?? "")}|${sortOrder}|${sortedData.length}`}
            emptyMessage={searchTerm ? "No vehicles found matching your search." : "No vehicles found"}
          />
        </motion.div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className={cn(
            NAVY_TEAL_SCOPE_CLASS,
            "flex max-h-[90vh] w-[calc(100%-1.5rem)] max-w-[720px] flex-col gap-0 overflow-hidden rounded-[20px] border border-[#E3EAF3] bg-white p-0 shadow-[0_24px_48px_rgba(15,23,42,0.16)] dark:border-[#2C3B50] dark:bg-[#151F30]",
          )}
        >
          <DialogHeader className="shrink-0 space-y-0.5 border-b border-[#E3EAF3] px-5 py-3 text-left dark:border-[#2C3B50]">
            <div className="flex items-start gap-3 pr-6">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]">
                <Truck className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                  {editingVehicle ? "Edit vehicle" : "Add vehicle"}
                </DialogTitle>
                <DialogDescription className="text-sm text-[#64748B] dark:text-[#A9B8CC]">
                  {editingVehicle ? "Update vehicle information" : "Enter vehicle details"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
              <div className="nt-form nt-form-compact min-h-0 flex-1 overflow-y-auto px-5 py-3">
                <section>
                  <h3 className={sectionTitleClass}>Vehicle details</h3>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="vehicle_id"
                      render={({ field }) => (
                        <FormItem className={fieldWrapClass}>
                          <FormLabel className={labelClass}>Vehicle ID {requiredMark}</FormLabel>
                          <FormControl>
                            <Input className={fieldClass} placeholder="VH-0009" {...field} disabled={!!editingVehicle} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="registration_number"
                      render={({ field }) => (
                        <FormItem className={fieldWrapClass}>
                          <FormLabel className={labelClass}>Registration Number {requiredMark}</FormLabel>
                          <FormControl>
                            <Input className={fieldClass} placeholder="DHAKA-4045" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="vehicle_type"
                      render={({ field }) => (
                        <FormItem className={fieldWrapClass}>
                          <FormLabel className={labelClass}>Vehicle Type {requiredMark}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={fieldClass}>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className={selectPanelClass}>
                              <SelectItem value="Two Wheeler" className={selectItemClass}>Two Wheeler</SelectItem>
                              <SelectItem value="Three Wheeler" className={selectItemClass}>Three Wheeler</SelectItem>
                              <SelectItem value="Four Wheeler" className={selectItemClass}>Four Wheeler</SelectItem>
                              <SelectItem value="Truck" className={selectItemClass}>Truck</SelectItem>
                              <SelectItem value="Van" className={selectItemClass}>Van</SelectItem>
                              <SelectItem value="Bus" className={selectItemClass}>Bus</SelectItem>
                              <SelectItem value="Pickup" className={selectItemClass}>Pickup</SelectItem>
                              <SelectItem value="Other" className={selectItemClass}>Other</SelectItem>
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
                        <FormItem className={fieldWrapClass}>
                          <FormLabel className={labelClass}>Depot {requiredMark}</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value ? field.value.toString() : undefined}
                          >
                            <FormControl>
                              <SelectTrigger className={fieldClass}>
                                <SelectValue placeholder={depots.length === 0 ? "No depots available" : "Select depot"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className={selectPanelClass}>
                              {depots.length === 0 ? (
                                <div className="px-2 py-1.5 text-sm text-[#64748B]">No depots available</div>
                              ) : (
                                depots.map((depot) => (
                                  <SelectItem key={depot.id} value={depot.id.toString()} className={selectItemClass}>
                                    {depot.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="capacity"
                      render={({ field }) => (
                        <FormItem className={fieldWrapClass}>
                          <FormLabel className={labelClass}>Capacity (kg)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="3500"
                              className={fieldClass}
                              {...field}
                              onChange={(e) =>
                                field.onChange(e.target.value === "" ? "" : parseFloat(e.target.value))
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
                      name="status"
                      render={({ field }) => (
                        <FormItem className={fieldWrapClass}>
                          <FormLabel className={labelClass}>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={fieldClass}>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className={selectPanelClass}>
                              <SelectItem value="Active" className={selectItemClass}>Active</SelectItem>
                              <SelectItem value="Maintenance" className={selectItemClass}>Maintenance</SelectItem>
                              <SelectItem value="Inactive" className={selectItemClass}>Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </section>

                <section className="mt-3 border-t border-[#E3EAF3] pt-3 dark:border-[#2C3B50]">
                  <h3 className={sectionTitleClass}>Fuel</h3>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="fuel_type"
                      render={({ field }) => (
                        <FormItem className={fieldWrapClass}>
                          <FormLabel className={labelClass}>Fuel Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={fieldClass}>
                                <SelectValue placeholder="Select fuel type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className={selectPanelClass}>
                              <SelectItem value="Petrol" className={selectItemClass}>Petrol</SelectItem>
                              <SelectItem value="Diesel" className={selectItemClass}>Diesel</SelectItem>
                              <SelectItem value="CNG" className={selectItemClass}>CNG</SelectItem>
                              <SelectItem value="Electric" className={selectItemClass}>Electric</SelectItem>
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
                        <FormItem className={fieldWrapClass}>
                          <FormLabel className={labelClass}>Fuel Rate (৳/km)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className={fieldClass}
                              {...field}
                              onChange={(e) =>
                                field.onChange(e.target.value === "" ? "" : parseFloat(e.target.value))
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
                        <FormItem className={fieldWrapClass}>
                          <FormLabel className={labelClass}>Fuel Efficiency (km/l)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className={fieldClass}
                              {...field}
                              onChange={(e) =>
                                field.onChange(e.target.value === "" ? "" : parseFloat(e.target.value))
                              }
                              value={field.value === "" ? "" : field.value}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </section>

                <section className="mt-3 border-t border-[#E3EAF3] pt-3 dark:border-[#2C3B50]">
                  <h3 className={sectionTitleClass}>Specs and maintenance</h3>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem className={fieldWrapClass}>
                          <FormLabel className={labelClass}>Model</FormLabel>
                          <FormControl>
                            <Input className={fieldClass} placeholder="Model name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem className={fieldWrapClass}>
                          <FormLabel className={labelClass}>Year</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="2024"
                              className={fieldClass}
                              {...field}
                              onChange={(e) =>
                                field.onChange(e.target.value === "" ? "" : parseInt(e.target.value))
                              }
                              value={field.value === "" ? "" : field.value}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="maintenance_schedule_km"
                      render={({ field }) => (
                        <FormItem className={fieldWrapClass}>
                          <FormLabel className={labelClass}>Maintenance Schedule (km)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="10000"
                              className={fieldClass}
                              {...field}
                              onChange={(e) =>
                                field.onChange(e.target.value === "" ? "" : parseFloat(e.target.value))
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
                        <FormItem className={fieldWrapClass}>
                          <FormLabel className={labelClass}>Last Maintenance Date</FormLabel>
                          <FormControl>
                            <Input type="date" className={fieldClass} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="last_maintenance_km"
                      render={({ field }) => (
                        <FormItem className={fieldWrapClass}>
                          <FormLabel className={labelClass}>Last Maintenance (km)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0"
                              className={fieldClass}
                              {...field}
                              onChange={(e) =>
                                field.onChange(e.target.value === "" ? "" : parseFloat(e.target.value))
                              }
                              value={field.value === "" ? "" : field.value}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </section>
              </div>

              <DialogFooter className="shrink-0 gap-2 border-t border-[#E3EAF3] px-5 py-3 dark:border-[#2C3B50]">
                <Button
                  type="button"
                  variant="ntSecondary"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingVehicle(null);
                    form.reset();
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="ntPrimary" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingVehicle ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </ThemeScope>
  );
}
