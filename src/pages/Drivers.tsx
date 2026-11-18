import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  IdCard,
  ListFilter,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  Truck,
  User,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { NAVY_TEAL_SCOPE_CLASS } from "@/lib/navyTealTheme";
import { generateCode } from "@/utils/codeGenerator";
import { cn } from "@/lib/utils";
import {
  ActionIconButton,
  asList,
  dialogContentClass,
  fieldClass,
  fieldWrapClass,
  KpiCard,
  labelClass,
  requiredMark,
  selectItemClass,
  selectPanelClass,
} from "@/components/transport/transportUi";

interface DriverRecord {
  id: number;
  driver_id: string;
  first_name: string;
  last_name?: string | null;
  license_number: string;
  license_expiry?: string | null;
  contact?: string | null;
  email?: string | null;
  address?: string | null;
  vehicle_id?: string | null;
  route?: string | null;
  status?: string | null;
  is_active: boolean;
}

const DUTY_STATUSES = ["Available", "On Route", "On Trip", "On Leave", "Off Duty", "Inactive"] as const;

const emptyForm = {
  first_name: "",
  last_name: "",
  contact: "",
  email: "",
  license_number: "",
  license_expiry: "",
  vehicle_id: "",
  route: "",
  address: "",
  status: "Available",
};

function formatDateInput(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function driverName(driver: Pick<DriverRecord, "first_name" | "last_name">) {
  return `${driver.first_name || ""} ${driver.last_name || ""}`.trim() || "—";
}

function dutyTone(status?: string | null) {
  if (status === "Available") return "bg-[#ECFDF5] text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]";
  if (status === "On Route" || status === "On Trip") return "bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]";
  if (status === "Inactive") return "bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#3B1212] dark:text-[#FCA5A5]";
  return "bg-[#F1F5F9] text-[#475569] dark:bg-[#1B283B] dark:text-[#A9B8CC]";
}

function StatusFilterOption({
  icon: Icon,
  label,
  tone,
}: {
  icon: typeof ListFilter;
  label: string;
  tone: "navy" | "green" | "red";
}) {
  const toneClass = {
    navy: "bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]",
    green: "bg-[#ECFDF5] text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]",
    red: "bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#3B1212] dark:text-[#FCA5A5]",
  }[tone];

  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md", toneClass)}>
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      {label}
    </span>
  );
}

export default function Drivers() {
  const reduceMotion = useReducedMotion();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<DriverRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DriverRecord | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [generatedCode, setGeneratedCode] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    document.title = "Driver | Renata";
  }, []);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["drivers", { include_inactive: true }],
    queryFn: async () => asList<DriverRecord>(await apiEndpoints.drivers.getAll({ include_inactive: true })),
  });

  const drivers = data || [];

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiEndpoints.drivers.create(payload),
    onSuccess: () => {
      toast({ title: "Driver added", description: `New driver created with ID ${generatedCode}.` });
      closeForm();
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      apiEndpoints.drivers.update(id, payload),
    onSuccess: () => {
      toast({ title: "Driver updated", description: "Driver information has been updated successfully." });
      closeForm();
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiEndpoints.drivers.delete(id),
    onSuccess: () => {
      toast({ title: "Driver deleted", description: "The driver has been removed." });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const formBusy = createMutation.isPending || updateMutation.isPending;

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return drivers.filter((driver) => {
      if (statusFilter === "active" && !driver.is_active) return false;
      if (statusFilter === "inactive" && driver.is_active) return false;
      if (!term) return true;
      return [
        driver.driver_id,
        driver.first_name,
        driver.last_name,
        driver.contact,
        driver.email,
        driver.license_number,
        driver.vehicle_id,
        driver.route,
        driver.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [drivers, searchTerm, statusFilter]);

  const totals = useMemo(() => {
    const active = drivers.filter((driver) => driver.is_active).length;
    return { total: drivers.length, active, inactive: drivers.length - active };
  }, [drivers]);

  const openCreate = () => {
    setEditTarget(null);
    setFormData(emptyForm);
    setIsActive(true);
    setGeneratedCode(generateCode("DRV", drivers.map((driver) => driver.driver_id)));
    setShowForm(true);
  };

  const openEdit = (driver: DriverRecord) => {
    setEditTarget(driver);
    setGeneratedCode(driver.driver_id);
    setIsActive(driver.is_active !== false);
    setFormData({
      first_name: driver.first_name || "",
      last_name: driver.last_name || "",
      contact: driver.contact || "",
      email: driver.email || "",
      license_number: driver.license_number || "",
      license_expiry: formatDateInput(driver.license_expiry),
      vehicle_id: driver.vehicle_id || "",
      route: driver.route || "",
      address: driver.address || "",
      status: driver.status || "Available",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditTarget(null);
    setFormData(emptyForm);
    setGeneratedCode("");
    setIsActive(true);
  };

  const handleChange = (field: keyof typeof emptyForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canSubmit = Boolean(formData.first_name.trim() && formData.license_number.trim());

  const buildPayload = () => ({
    first_name: formData.first_name.trim(),
    last_name: formData.last_name.trim() || null,
    contact: formData.contact.trim() || null,
    email: formData.email.trim() || null,
    license_number: formData.license_number.trim(),
    license_expiry: formData.license_expiry || null,
    route: formData.route.trim() || null,
    vehicle_id: formData.vehicle_id.trim() || null,
    address: formData.address.trim() || null,
    status: formData.status,
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || formBusy) return;

    if (editTarget) {
      updateMutation.mutate({
        id: editTarget.id,
        payload: { ...buildPayload(), is_active: isActive },
      });
      return;
    }

    createMutation.mutate({
      ...buildPayload(),
      driver_id: generatedCode,
      is_active: true,
    });
  };

  const columns: DataTableColumn<DriverRecord>[] = [
    {
      key: "driver_id",
      label: "Driver ID",
      className: "font-mono text-[13px]",
    },
    {
      key: "first_name",
      label: "Driver Name",
      render: (_val, row) => <span className="font-medium text-[#0C4DA1] dark:text-[#70ADFF]">{driverName(row)}</span>,
    },
    {
      key: "contact",
      label: "Contact",
      render: (_val, row) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-[13px]">
            <Phone className="h-3 w-3 text-[#64748B]" />
            {row.contact || "—"}
          </div>
          {row.email ? <div className="text-[12px] text-[#64748B] dark:text-[#A9B8CC]">{row.email}</div> : null}
        </div>
      ),
    },
    {
      key: "license_number",
      label: "License",
      render: (_val, row) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <IdCard className="h-3.5 w-3.5 text-[#64748B]" />
            {row.license_number || "—"}
          </div>
          <div className="text-[12px] text-[#64748B] dark:text-[#A9B8CC]">
            Exp: {row.license_expiry ? formatDateInput(row.license_expiry) : "—"}
          </div>
        </div>
      ),
    },
    {
      key: "vehicle_id",
      label: "Vehicle",
      render: (val) => String(val || "—"),
    },
    {
      key: "route",
      label: "Route",
      render: (val) => (
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-[#64748B]" />
          {String(val || "—")}
        </div>
      ),
    },
    {
      key: "status",
      label: "Duty",
      render: (val) => (
        <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", dutyTone(String(val || "")))}>
          {String(val || "—")}
        </span>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      render: (_val, row) =>
        row.is_active ? (
          <span className="inline-flex rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]">
            Active
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-semibold text-[#B91C1C] dark:bg-[#3B1212] dark:text-[#FCA5A5]">
            Inactive
          </span>
        ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      headerClassName: "text-right",
      render: (_val, row) => (
        <div className="flex justify-end gap-0.5">
          <ActionIconButton
            label="Edit driver"
            disabled={formBusy || deleteMutation.isPending}
            onClick={() => openEdit(row)}
            className="text-[#0C4DA1] hover:bg-[#EAF2FC] hover:text-[#0A3F86]"
          >
            <Pencil className="h-4 w-4" />
          </ActionIconButton>
          <ActionIconButton
            label="Delete driver"
            disabled={formBusy || deleteMutation.isPending}
            onClick={() => setDeleteTarget(row)}
            className="text-[#DC2626] hover:bg-[#FEF2F2] hover:text-[#B91C1C]"
          >
            <Trash2 className="h-4 w-4" />
          </ActionIconButton>
        </div>
      ),
    },
  ];

  const motionProps = {
    initial: reduceMotion ? false : { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: reduceMotion ? 0 : 0.18 },
  };

  const statusOptions = useMemo(() => {
    const extra = drivers
      .map((driver) => driver.status)
      .filter((status): status is string => Boolean(status) && !DUTY_STATUSES.includes(status as (typeof DUTY_STATUSES)[number]));
    return [...DUTY_STATUSES, ...Array.from(new Set(extra))];
  }, [drivers]);

  return (
    <ThemeScope className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-hidden">
        <motion.div {...motionProps} className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard title="Drivers" value={totals.total} icon={User} accent="blue" />
          <KpiCard title="Active" value={totals.active} icon={CheckCircle2} accent="green" />
          <KpiCard title="Inactive" value={totals.inactive} icon={XCircle} accent="purple" />
        </motion.div>

        <motion.div {...motionProps} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DataTable
            className="min-h-0 min-w-0 flex-1 overflow-hidden"
            title="All Drivers"
            description="Manage driver profiles, licenses, and assignments."
            toolbarIcon={<Truck className="h-4 w-4" />}
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: "Search drivers...",
            }}
            toolbarFilters={
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className={cn("h-9 w-[180px]", fieldClass)} aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={selectPanelClass}>
                  <SelectItem value="all" className={selectItemClass}>
                    <StatusFilterOption icon={ListFilter} label="All Status" tone="navy" />
                  </SelectItem>
                  <SelectItem value="active" className={selectItemClass}>
                    <StatusFilterOption icon={CheckCircle2} label="Active" tone="green" />
                  </SelectItem>
                  <SelectItem value="inactive" className={selectItemClass}>
                    <StatusFilterOption icon={XCircle} label="Inactive" tone="red" />
                  </SelectItem>
                </SelectContent>
              </Select>
            }
            toolbarActions={
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="ntSecondary" className="!h-8" onClick={() => refetch()} disabled={isFetching}>
                  {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Refresh
                </Button>
                <Button type="button" variant="ntPrimary" className="!h-8" onClick={openCreate}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Driver
                </Button>
              </div>
            }
            data={filtered}
            columns={columns}
            loading={isLoading}
            error={isError ? (error instanceof Error ? error.message : "Unable to load drivers") : undefined}
            getRowId={(row) => row.id}
            resetPageKey={`${statusFilter}|${searchTerm}|${filtered.length}`}
            emptyMessage="No drivers found"
          />
        </motion.div>
      </div>

      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!formBusy) {
            if (open) setShowForm(true);
            else closeForm();
          }
        }}
      >
        <DialogContent
          className={dialogContentClass}
          onPointerDownOutside={(event) => {
            if (formBusy) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (formBusy) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (formBusy) event.preventDefault();
          }}
        >
          <DialogHeader className="shrink-0 space-y-0.5 border-b border-[#E3EAF3] px-5 py-3 text-left dark:border-[#2C3B50]">
            <div className="flex items-start gap-3 pr-6">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]">
                <User className="h-4 w-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                  {editTarget ? "Edit Driver" : "Add New Driver"}
                </DialogTitle>
                <DialogDescription className="text-sm text-[#64748B] dark:text-[#A9B8CC]">
                  {editTarget ? "Update driver information." : "Create a new driver profile."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="nt-form nt-form-compact min-h-0 flex-1 overflow-y-auto px-5 py-3">
              <section>
                <h3 className="mb-2 text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">Driver details</h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="drv-id">
                      Driver ID {requiredMark}
                    </Label>
                    <Input id="drv-id" value={generatedCode} disabled className={cn(fieldClass, "font-mono")} />
                    <p className="text-[11px] text-[#64748B]">Auto-generated ID (cannot be changed)</p>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="drv-first">
                      First name {requiredMark}
                    </Label>
                    <Input
                      id="drv-first"
                      value={formData.first_name}
                      onChange={(event) => handleChange("first_name", event.target.value)}
                      placeholder="First name"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="drv-last">
                      Last name
                    </Label>
                    <Input
                      id="drv-last"
                      value={formData.last_name}
                      onChange={(event) => handleChange("last_name", event.target.value)}
                      placeholder="Last name"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="drv-contact">
                      Contact
                    </Label>
                    <Input
                      id="drv-contact"
                      type="tel"
                      value={formData.contact}
                      onChange={(event) => handleChange("contact", event.target.value)}
                      placeholder="Phone number"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="drv-email">
                      Email
                    </Label>
                    <Input
                      id="drv-email"
                      type="email"
                      value={formData.email}
                      onChange={(event) => handleChange("email", event.target.value)}
                      placeholder="driver@example.com"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="drv-license">
                      License number {requiredMark}
                    </Label>
                    <Input
                      id="drv-license"
                      value={formData.license_number}
                      onChange={(event) => handleChange("license_number", event.target.value)}
                      placeholder="License number"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="drv-expiry">
                      License expiry
                    </Label>
                    <Input
                      id="drv-expiry"
                      type="date"
                      value={formData.license_expiry}
                      onChange={(event) => handleChange("license_expiry", event.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="drv-vehicle">
                      Assigned vehicle
                    </Label>
                    <Input
                      id="drv-vehicle"
                      value={formData.vehicle_id}
                      onChange={(event) => handleChange("vehicle_id", event.target.value)}
                      placeholder="Vehicle ID"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="drv-route">
                      Route
                    </Label>
                    <Input
                      id="drv-route"
                      value={formData.route}
                      onChange={(event) => handleChange("route", event.target.value)}
                      placeholder="Route / region"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Duty status</Label>
                    <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
                      <SelectTrigger className={cn("h-9", fieldClass)} aria-label="Duty status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={selectPanelClass}>
                        {statusOptions.map((status) => (
                          <SelectItem key={status} value={status} className={selectItemClass}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={`${fieldWrapClass} sm:col-span-2`}>
                    <Label className={labelClass} htmlFor="drv-address">
                      Address
                    </Label>
                    <Textarea
                      id="drv-address"
                      value={formData.address}
                      onChange={(event) => handleChange("address", event.target.value)}
                      placeholder="Address"
                      rows={2}
                      className={cn(fieldClass, "h-auto min-h-[64px] py-2")}
                    />
                  </div>
                </div>
              </section>
            </div>
            <DialogFooter className="shrink-0 gap-2 border-t border-[#E3EAF3] px-5 py-3 dark:border-[#2C3B50] sm:justify-between">
              {editTarget ? (
                <label className="mr-auto flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[12px] font-semibold",
                      isActive ? "text-[#15803D] dark:text-[#4ADE80]" : "text-[#B91C1C] dark:text-[#FCA5A5]",
                    )}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </span>
                  <Switch
                    checked={isActive}
                    onCheckedChange={setIsActive}
                    aria-label="Driver status"
                    className="data-[state=checked]:bg-[#15803D] data-[state=unchecked]:bg-[#CBD5E1] dark:data-[state=unchecked]:bg-[#2C3B50]"
                  />
                </label>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <Button type="button" variant="ntSecondary" onClick={closeForm} disabled={formBusy}>
                  Cancel
                </Button>
                <Button type="submit" variant="ntPrimary" disabled={formBusy || !canSubmit}>
                  {formBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editTarget ? "Update Driver" : "Create Driver"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !deleteMutation.isPending && !open && setDeleteTarget(null)}>
        <DialogContent
          className={cn(
            NAVY_TEAL_SCOPE_CLASS,
            "max-w-[440px] gap-0 overflow-hidden rounded-[20px] border border-[#E3EAF3] p-0 shadow-[0_24px_48px_rgba(15,23,42,0.16)] dark:border-[#2C3B50] dark:bg-[#151F30]",
          )}
        >
          <div className="border-b border-[#E3EAF3] px-5 py-4 dark:border-[#2C3B50]">
            <DialogHeader className="space-y-0 text-left">
              <div className="flex items-start gap-3 pr-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF2F2] text-[#DC2626] dark:bg-[#3B1212] dark:text-[#FCA5A5]">
                  <Trash2 className="h-5 w-5" />
                </span>
                <div>
                  <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                    Delete this driver?
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm text-[#64748B] dark:text-[#A9B8CC]">
                    {deleteTarget ? `${deleteTarget.driver_id} - ${driverName(deleteTarget)} will be removed.` : ""}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>
          <div className="flex items-start gap-2 px-5 py-3 text-xs text-[#B91C1C] dark:text-[#FCA5A5]">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            This cannot be undone from this screen.
          </div>
          <DialogFooter className="gap-2 border-t border-[#E3EAF3] bg-[#F8FAFC] px-5 py-3 dark:border-[#2C3B50] dark:bg-[#1B283B] sm:space-x-0">
            <Button type="button" variant="ntSecondary" disabled={deleteMutation.isPending} onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="!h-9 rounded-lg border-0 bg-[#DC2626] text-white shadow-none hover:bg-[#B91C1C]"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete driver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ThemeScope>
  );
}
