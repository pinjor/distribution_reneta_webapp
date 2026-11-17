import { useMemo, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, ChevronsUpDown, Pencil, Plus, RefreshCw, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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

function isActiveStatus(status?: string) {
  return String(status || "").toLowerCase() === "active";
}

function isRefrigerated(type?: string) {
  return type === "Refrigerated Van" || type === "Refrigerated Truck";
}

function isStandard(type?: string) {
  return type === "Standard Truck" || type === "Mini Truck";
}

export default function Vehicles() {
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const { data: vehiclesResponse = [], isLoading, refetch } = useQuery({
    queryKey: ["vehicles"],
    queryFn: apiEndpoints.vehicles.getAll,
  });
  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: apiEndpoints.vendors.getAll,
  });
  const { data: depotsResponse = [] } = useQuery({
    queryKey: ["depots"],
    queryFn: apiEndpoints.depots.getAll,
  });

  const [showDialog, setShowDialog] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | number | null>(null);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formData, setFormData] = useState({
    type: "",
    regNo: "",
    capacity: "",
    depot: "",
    depotId: "",
    vendorId: "",
    vendorName: "",
    status: "active",
  });
  const [vendorOpen, setVendorOpen] = useState(false);
  const [optimisticVehicles, setOptimisticVehicles] = useState<any[]>([]);

  const depots = Array.isArray(depotsResponse) ? depotsResponse : depotsResponse?.data || [];

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
    return [];
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

  const depotNameById = (id?: number | string | null) => {
    if (id == null || id === "") return "";
    const match = depots.find((depot: any) => String(depot.id) === String(id));
    return match?.name || "";
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
    const vendorMatch = vendorOptions.find((option) => option.label.toLowerCase() === vendorLabel.toLowerCase());
    const depotId = vehicle.depot_id ?? vehicle.depot?.id ?? "";
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
      depot: typeof vehicle.depot === "string" ? vehicle.depot : vehicle.depot?.name || depotNameById(depotId),
      depotId: depotId ? String(depotId) : "",
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

  const filteredVehicles = vehicles.filter((vehicle: any) => {
    const depotLabel = typeof vehicle.depot === "string" ? vehicle.depot : vehicle.depot?.name || depotNameById(vehicle.depot_id);
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      String(vehicle.vehicle_id || "").toLowerCase().includes(term) ||
      String(vehicle.registration_number || "").toLowerCase().includes(term) ||
      String(vehicle.vehicle_type || "").toLowerCase().includes(term) ||
      String(depotLabel || "").toLowerCase().includes(term) ||
      String(vehicle.vendor || vehicle.vendor_name || "").toLowerCase().includes(term);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && isActiveStatus(vehicle.status)) ||
      (statusFilter === "inactive" && !isActiveStatus(vehicle.status));
    return matchesSearch && matchesStatus;
  });

  const mappedRows = filteredVehicles.map((vehicle: any) => ({
    ...vehicle,
    depotName: typeof vehicle.depot === "string" ? vehicle.depot : vehicle.depot?.name || depotNameById(vehicle.depot_id) || "—",
    vendorName: vehicle.vendor || vehicle.vendor_name || vehicle.vendorName || "—",
  }));

  const { sortedData, sortKey, sortOrder, handleSort } = useTableSort(mappedRows, "vehicle_id");
  const tableRows = sortedData.map((vehicle: any, index: number) => ({
    ...vehicle,
    sl: index + 1,
  }));

  const columns: DataTableColumn<(typeof tableRows)[number]>[] = [
    { key: "sl", label: "SL", className: "w-12 tabular-nums text-[#64748B]" },
    {
      key: "vehicle_id",
      label: "Vehicle ID",
      sortable: true,
      render: (val, row) => (
        <span className="font-medium text-[#172B4D] dark:text-[#F1F5F9]">{String(val || row.id || "—")}</span>
      ),
    },
    { key: "vehicle_type", label: "Type", sortable: true, render: (val) => String(val || "—") },
    {
      key: "registration_number",
      label: "Registration",
      sortable: true,
      className: "font-mono text-xs",
      render: (val) => String(val || "—"),
    },
    {
      key: "capacity",
      label: "Capacity",
      sortable: true,
      className: "tabular-nums",
      render: (val) =>
        typeof val === "number"
          ? `${val} Ton`
          : typeof val === "string" && val.trim() !== ""
            ? val
            : "—",
    },
    { key: "depotName", label: "Depot", sortable: true, render: (val) => String(val || "—") },
    { key: "vendorName", label: "Vendor", sortable: true, render: (val) => String(val || "—") },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (val) => {
        const active = isActiveStatus(String(val));
        return (
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
              active
                ? "bg-[#ECFDF5] text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]"
                : "bg-[#F1F5F9] text-[#475569] dark:bg-[#1B283B] dark:text-[#A9B8CC]",
            )}
          >
            {active ? "Active" : "Inactive"}
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
        <div className="flex justify-end">
          <ActionIconButton
            label="Edit vehicle"
            onClick={() => handleEdit(row)}
            disabled={createVehicle.isLoading || updateVehicle.isPending}
            className="text-[#475569] hover:bg-[#EAF2FC] hover:text-[#0C4DA1]"
          >
            <Pencil className="h-4 w-4" />
          </ActionIconButton>
        </div>
      ),
    },
  ];

  const sectionMotion = {
    initial: reduceMotion ? false : { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0 : 0.18 },
  };

  const saving = createVehicle.isLoading || updateVehicle.isPending;

  return (
    <ThemeScope className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-x-hidden">
        <motion.div {...sectionMotion} className="nt-form shrink-0">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
            <div className="w-[280px] max-w-full space-y-1">
              <Label className={labelClass}>Search</Label>
              <Input
                placeholder="Number, type, or depot"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn("w-full", fieldClass)}
              />
            </div>
            <div className="w-[148px] space-y-1">
              <Label className={labelClass}>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className={cn("w-full", fieldClass)}>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent className={selectPanelClass}>
                  <SelectItem value="all" className={selectItemClass}>
                    All statuses
                  </SelectItem>
                  <SelectItem value="active" className={selectItemClass}>
                    Active
                  </SelectItem>
                  <SelectItem value="inactive" className={selectItemClass}>
                    Inactive
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="pb-2 text-[13px] text-[#64748B]">
              Total{" "}
              <span className="font-semibold tabular-nums text-[#172B4D] dark:text-[#F1F5F9]">{vehicles.length}</span>
              <span className="mx-1.5 text-[#CBD5E1]">·</span>
              Active{" "}
              <span className="font-semibold tabular-nums text-[#172B4D] dark:text-[#F1F5F9]">
                {vehicles.filter((v: any) => isActiveStatus(v.status)).length}
              </span>
              <span className="mx-1.5 text-[#CBD5E1]">·</span>
              Refrigerated{" "}
              <span className="font-semibold tabular-nums text-[#172B4D] dark:text-[#F1F5F9]">
                {vehicles.filter((v: any) => isRefrigerated(v.vehicle_type)).length}
              </span>
              <span className="mx-1.5 text-[#CBD5E1]">·</span>
              Standard{" "}
              <span className="font-semibold tabular-nums text-[#172B4D] dark:text-[#F1F5F9]">
                {vehicles.filter((v: any) => isStandard(v.vehicle_type)).length}
              </span>
            </p>
          </div>
        </motion.div>

        <motion.div {...sectionMotion} className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DataTable
            className="min-h-0 min-w-0 flex-1 overflow-hidden"
            title="Fleet vehicles"
            description="Manage fleet vehicles and depot assignments."
            toolbarIcon={<Truck className="h-4 w-4" />}
            toolbarActions={
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="ntSecondary" className="!h-8" onClick={() => refetch()} disabled={isLoading}>
                  <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                  Refresh
                </Button>
                <Button type="button" variant="ntPrimary" className="!h-8" onClick={handleAdd}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Vehicle
                </Button>
              </div>
            }
            data={tableRows}
            columns={columns}
            loading={isLoading}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={handleSort}
            getRowId={(row) => row.id ?? row.vehicle_id}
            resetPageKey={`${searchTerm}|${statusFilter}|${String(sortKey ?? "")}|${sortOrder}|${tableRows.length}`}
            emptyMessage={searchTerm ? "No vehicles found matching your search." : "No vehicles found"}
          />
        </motion.div>
      </div>

      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          if (open) setShowDialog(true);
          else handleDialogClose();
        }}
      >
        <DialogContent
          className={cn(
            NAVY_TEAL_SCOPE_CLASS,
            "flex max-h-[90vh] w-[calc(100%-1.5rem)] max-w-[640px] flex-col gap-0 overflow-hidden rounded-[20px] border border-[#E3EAF3] bg-white p-0 shadow-[0_24px_48px_rgba(15,23,42,0.16)] dark:border-[#2C3B50] dark:bg-[#151F30]",
          )}
        >
          <DialogHeader className="shrink-0 space-y-0.5 border-b border-[#E3EAF3] px-5 py-3 text-left dark:border-[#2C3B50]">
            <div className="flex items-start gap-3 pr-6">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]">
                <Truck className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                  {isEdit ? "Edit vehicle" : "Add vehicle"}
                </DialogTitle>
                <DialogDescription className="text-sm text-[#64748B] dark:text-[#A9B8CC]">Enter vehicle details</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="nt-form nt-form-compact min-h-0 flex-1 overflow-y-auto px-5 py-3">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className={fieldWrapClass}>
                <Label className={labelClass}>Vehicle Type</Label>
                <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                  <SelectTrigger className={fieldClass}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className={selectPanelClass}>
                    <SelectItem value="Refrigerated Truck" className={selectItemClass}>
                      Refrigerated Truck
                    </SelectItem>
                    <SelectItem value="Refrigerated Van" className={selectItemClass}>
                      Refrigerated Van
                    </SelectItem>
                    <SelectItem value="Dry Van" className={selectItemClass}>
                      Dry Van
                    </SelectItem>
                    <SelectItem value="Mini Truck" className={selectItemClass}>
                      Mini Truck
                    </SelectItem>
                    <SelectItem value="Box Truck" className={selectItemClass}>
                      Box Truck
                    </SelectItem>
                    <SelectItem value="Standard Truck" className={selectItemClass}>
                      Standard Truck
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className={fieldWrapClass}>
                <Label className={labelClass}>Registration Number</Label>
                <Input
                  placeholder="DHAKA-4045"
                  value={formData.regNo}
                  onChange={(e) => setFormData({ ...formData, regNo: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div className={fieldWrapClass}>
                <Label className={labelClass}>Capacity</Label>
                <Input
                  placeholder="5 Ton"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div className={fieldWrapClass}>
                <Label className={labelClass}>Depot</Label>
                <Select
                  value={formData.depotId || undefined}
                  onValueChange={(val) => {
                    const match = depots.find((depot: any) => String(depot.id) === val);
                    setFormData((prev) => ({
                      ...prev,
                      depotId: val,
                      depot: match?.name || "",
                    }));
                  }}
                >
                  <SelectTrigger className={fieldClass}>
                    <SelectValue placeholder={depots.length === 0 ? "No depots available" : "Select depot"} />
                  </SelectTrigger>
                  <SelectContent className={selectPanelClass}>
                    {depots.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-[#64748B]">No depots available</div>
                    ) : (
                      depots.map((depot: any) => (
                        <SelectItem key={depot.id} value={String(depot.id)} className={selectItemClass}>
                          {depot.name} {depot.code ? `(${depot.code})` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className={cn(fieldWrapClass, "sm:col-span-2")}>
                <Label className={labelClass}>Vendor</Label>
                <Popover open={vendorOpen} onOpenChange={setVendorOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn("w-full justify-between", fieldClass, !formData.vendorName && "text-[#64748B]")}
                    >
                      {formData.vendorName ? (
                        <span className="flex min-w-0 flex-col text-left">
                          <span className="truncate text-[13px] font-medium text-[#172B4D]">{formData.vendorName}</span>
                        </span>
                      ) : (
                        "Select vendor"
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className={cn(NAVY_TEAL_SCOPE_CLASS, "w-[320px] p-0")} align="start">
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
                              <Check className={cn("mt-1 h-4 w-4", option.value === formData.vendorId ? "opacity-100" : "opacity-0")} />
                              <span className="flex flex-col">
                                <span className="text-sm font-medium">{option.label}</span>
                                {option.description ? <span className="text-xs text-[#64748B]">{option.description}</span> : null}
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
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-[#E3EAF3] px-5 py-3 dark:border-[#2C3B50]">
            <Button type="button" variant="ntSecondary" onClick={handleDialogClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" variant="ntPrimary" onClick={handleSubmit} disabled={saving}>
              {isEdit ? (updateVehicle.isPending ? "Updating..." : "Update") : createVehicle.isLoading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ThemeScope>
  );
}
