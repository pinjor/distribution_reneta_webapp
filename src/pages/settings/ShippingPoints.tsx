import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ListFilter,
  Loader2,
  MapPinned,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { NAVY_TEAL_SCOPE_CLASS } from "@/lib/navyTealTheme";
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

interface RouteRecord {
  id: number;
  code: string;
  name: string;
  depot_id: number;
  stops?: number;
  distance?: string | null;
  avg_time?: string | null;
  status?: string | null;
}

interface DepotOption {
  id: number;
  name: string;
  code: string;
}

const emptyForm = {
  depot_id: "",
  code: "",
  name: "",
};

function isRouteActive(route: RouteRecord) {
  return (route.status || "Active").toLowerCase() !== "inactive";
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

export default function ShippingPoints() {
  const reduceMotion = useReducedMotion();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<RouteRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RouteRecord | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    document.title = "Shipping Routes | Renata";
  }, []);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["routes"],
    queryFn: async () => asList<RouteRecord>(await apiEndpoints.routes.getAll()),
  });

  const { data: depotsData } = useQuery({
    queryKey: ["depots"],
    queryFn: async () => asList<DepotOption>(await apiEndpoints.depots.getAll()),
  });

  const routes = data || [];
  const depots = depotsData || [];
  const depotById = useMemo(() => new Map(depots.map((depot) => [depot.id, depot])), [depots]);

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiEndpoints.routes.create(payload),
    onSuccess: () => {
      toast({ title: "Route added", description: `${formData.code} - ${formData.name} has been created.` });
      closeForm();
      queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      apiEndpoints.routes.update(id, payload),
    onSuccess: () => {
      toast({ title: "Route updated", description: "Depot route information has been updated successfully." });
      closeForm();
      queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiEndpoints.routes.delete(id),
    onSuccess: () => {
      toast({ title: "Route deleted", description: "The depot route has been removed." });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const formBusy = createMutation.isPending || updateMutation.isPending;

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return routes.filter((route) => {
      const active = isRouteActive(route);
      if (statusFilter === "active" && !active) return false;
      if (statusFilter === "inactive" && active) return false;
      if (!term) return true;
      const depot = depotById.get(route.depot_id);
      return [route.name, route.code, depot?.name, depot?.code]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [depotById, routes, searchTerm, statusFilter]);

  const totals = useMemo(() => {
    const active = routes.filter(isRouteActive).length;
    return { total: routes.length, active, inactive: routes.length - active };
  }, [routes]);

  const openCreate = () => {
    setEditTarget(null);
    setFormData({
      ...emptyForm,
      depot_id: depots[0] ? String(depots[0].id) : "",
    });
    setIsActive(true);
    setShowForm(true);
  };

  const openEdit = (route: RouteRecord) => {
    setEditTarget(route);
    setIsActive(isRouteActive(route));
    setFormData({
      depot_id: route.depot_id ? String(route.depot_id) : "",
      code: route.code || "",
      name: route.name || "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditTarget(null);
    setFormData(emptyForm);
    setIsActive(true);
  };

  const handleChange = (field: keyof typeof emptyForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canSubmit = Boolean(formData.depot_id && formData.code.trim() && formData.name.trim());

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || formBusy) return;

    if (editTarget) {
      updateMutation.mutate({
        id: editTarget.id,
        payload: {
          name: formData.name.trim(),
          depot_id: Number(formData.depot_id),
          status: isActive ? "Active" : "Inactive",
        },
      });
      return;
    }

    createMutation.mutate({
      code: formData.code.trim(),
      name: formData.name.trim(),
      depot_id: Number(formData.depot_id),
      stops: 0,
      distance: "",
      avg_time: "",
      status: "Active",
    });
  };

  const columns: DataTableColumn<RouteRecord>[] = [
    {
      key: "code",
      label: "Route Code",
      className: "font-mono text-[13px]",
    },
    {
      key: "name",
      label: "Route Name",
      render: (val) => <span className="font-medium text-[#0C4DA1] dark:text-[#70ADFF]">{String(val || "—")}</span>,
    },
    {
      key: "depot_id",
      label: "Depot",
      render: (_val, row) => {
        const depot = depotById.get(row.depot_id);
        return depot ? `${depot.code} - ${depot.name}` : "—";
      },
    },
    {
      key: "id",
      label: "Complete Route Name",
      render: (_val, row) => `${row.code} - ${row.name}`,
    },
    {
      key: "status",
      label: "Status",
      render: (_val, row) =>
        isRouteActive(row) ? (
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
            label="Edit route"
            disabled={formBusy || deleteMutation.isPending}
            onClick={() => openEdit(row)}
            className="text-[#0C4DA1] hover:bg-[#EAF2FC] hover:text-[#0A3F86]"
          >
            <Pencil className="h-4 w-4" />
          </ActionIconButton>
          <ActionIconButton
            label="Delete route"
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

  const selectedDepot = depotById.get(Number(formData.depot_id));
  const completeName = formData.code.trim() && formData.name.trim() ? `${formData.code.trim()} - ${formData.name.trim()}` : "";

  return (
    <ThemeScope className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-hidden">
        <motion.div {...motionProps} className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard title="Routes" value={totals.total} icon={MapPinned} accent="blue" />
          <KpiCard title="Active" value={totals.active} icon={CheckCircle2} accent="green" />
          <KpiCard title="Inactive" value={totals.inactive} icon={XCircle} accent="purple" />
        </motion.div>

        <motion.div {...motionProps} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DataTable
            className="min-h-0 min-w-0 flex-1 overflow-hidden"
            title="Depot Shipping Routes"
            description="Manage depot specific shipping routes and alignment."
            toolbarIcon={<MapPinned className="h-4 w-4" />}
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: "Search routes...",
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
                  New Route
                </Button>
              </div>
            }
            data={filtered}
            columns={columns}
            loading={isLoading}
            error={isError ? (error instanceof Error ? error.message : "Unable to load routes") : undefined}
            getRowId={(row) => row.id}
            resetPageKey={`${statusFilter}|${searchTerm}|${filtered.length}`}
            emptyMessage="No routes found"
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
                <MapPinned className="h-4 w-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                  {editTarget ? "Edit Shipping Route" : "Add Shipping Route"}
                </DialogTitle>
                <DialogDescription className="text-sm text-[#64748B] dark:text-[#A9B8CC]">
                  {editTarget ? "Update depot aligned shipping route information." : "Create a new route for the selected depot."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="nt-form nt-form-compact min-h-0 flex-1 overflow-y-auto px-5 py-3">
              <section>
                <h3 className="mb-2 text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">Route details</h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="route-depot">
                      Depot {requiredMark}
                    </Label>
                    <Select value={formData.depot_id || undefined} onValueChange={(value) => handleChange("depot_id", value)}>
                      <SelectTrigger id="route-depot" className={fieldClass}>
                        <SelectValue placeholder="Select depot" />
                      </SelectTrigger>
                      <SelectContent className={selectPanelClass}>
                        {depots.map((depot) => (
                          <SelectItem key={depot.id} value={String(depot.id)} className={selectItemClass}>
                            {depot.code} - {depot.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="route-code">
                      Route code {requiredMark}
                    </Label>
                    <Input
                      id="route-code"
                      value={formData.code}
                      onChange={(event) => handleChange("code", event.target.value)}
                      placeholder="Enter route code"
                      disabled={Boolean(editTarget)}
                      className={cn(fieldClass, "font-mono")}
                    />
                  </div>
                  <div className={`${fieldWrapClass} sm:col-span-2`}>
                    <Label className={labelClass} htmlFor="route-name">
                      Route name {requiredMark}
                    </Label>
                    <Input
                      id="route-name"
                      value={formData.name}
                      onChange={(event) => handleChange("name", event.target.value)}
                      placeholder="Enter route name"
                      className={fieldClass}
                    />
                  </div>
                  <div className={`${fieldWrapClass} sm:col-span-2`}>
                    <Label className={labelClass}>Complete route name</Label>
                    <Input value={completeName} disabled className={fieldClass} placeholder="Route code and name preview" />
                    <p className="text-[11px] text-[#64748B]">
                      {selectedDepot ? `Selected depot: ${selectedDepot.code} - ${selectedDepot.name}` : "Select a depot"}
                    </p>
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
                    aria-label="Route status"
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
                  {editTarget ? "Update Route" : "Create Route"}
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
                    Delete this route?
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm text-[#64748B] dark:text-[#A9B8CC]">
                    {deleteTarget ? `${deleteTarget.code} - ${deleteTarget.name} will be removed.` : ""}
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
              Delete route
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ThemeScope>
  );
}
