import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ListFilter,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Route,
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

interface RouteOption {
  id: number;
  code?: string;
  route_id?: string;
  name: string;
}

interface ShippingPointOption {
  id: number;
  name: string;
  code: string;
}

interface RouteShippingPointRecord {
  id: number;
  route_id: number;
  shipping_point_id: number;
  distance_km: number;
  sequence: number;
  is_active: boolean;
}

const emptyForm = {
  route_id: "",
  shipping_point_id: "",
  distance_km: "",
  sequence: "1",
};

const noSpinnerClass =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

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

function routeCode(route?: RouteOption | null) {
  return route?.code || route?.route_id || "";
}

function routeLabel(route?: RouteOption | null) {
  if (!route) return "";
  const code = routeCode(route);
  return code ? `${code} - ${route.name}` : route.name;
}

function shippingPointLabel(point?: ShippingPointOption | null) {
  if (!point) return "";
  return point.code ? `${point.code} - ${point.name}` : point.name;
}

export default function RouteShippingPoints() {
  const reduceMotion = useReducedMotion();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<RouteShippingPointRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RouteShippingPointRecord | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    document.title = "Route Shipping Points | Renata";
  }, []);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["route-shipping-points"],
    queryFn: async () => asList<RouteShippingPointRecord>(await apiEndpoints.routeShippingPoints.getAll()),
  });

  const { data: routesData } = useQuery({
    queryKey: ["routes"],
    queryFn: async () => asList<RouteOption>(await apiEndpoints.routes.getAll()),
  });

  const { data: shippingPointsData } = useQuery({
    queryKey: ["shipping-points"],
    queryFn: async () => asList<ShippingPointOption>(await apiEndpoints.shippingPoints.getAll()),
  });

  const mappings = data || [];
  const routes = routesData || [];
  const shippingPoints = shippingPointsData || [];
  const routeById = useMemo(() => new Map(routes.map((route) => [route.id, route])), [routes]);
  const shippingPointById = useMemo(
    () => new Map(shippingPoints.map((point) => [point.id, point])),
    [shippingPoints],
  );

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiEndpoints.routeShippingPoints.create(payload),
    onSuccess: () => {
      toast({ title: "Mapping added", description: "The shipping point has been added to the route." });
      closeForm();
      queryClient.invalidateQueries({ queryKey: ["route-shipping-points"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      apiEndpoints.routeShippingPoints.update(id, payload),
    onSuccess: () => {
      toast({ title: "Mapping updated", description: "Route shipping point information has been updated." });
      closeForm();
      queryClient.invalidateQueries({ queryKey: ["route-shipping-points"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiEndpoints.routeShippingPoints.delete(id),
    onSuccess: () => {
      toast({ title: "Mapping deleted", description: "The route shipping point has been removed." });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["route-shipping-points"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const formBusy = createMutation.isPending || updateMutation.isPending;

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return mappings.filter((row) => {
      if (statusFilter === "active" && !row.is_active) return false;
      if (statusFilter === "inactive" && row.is_active) return false;
      if (!term) return true;
      const route = routeById.get(row.route_id);
      const point = shippingPointById.get(row.shipping_point_id);
      return [
        routeLabel(route),
        routeCode(route),
        route?.name,
        shippingPointLabel(point),
        point?.name,
        point?.code,
        String(row.sequence),
        String(row.distance_km),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [mappings, routeById, searchTerm, shippingPointById, statusFilter]);

  const totals = useMemo(() => {
    const active = mappings.filter((row) => row.is_active).length;
    return { total: mappings.length, active, inactive: mappings.length - active };
  }, [mappings]);

  const openCreate = () => {
    setEditTarget(null);
    setIsActive(true);
    setFormData({
      ...emptyForm,
      route_id: routes[0] ? String(routes[0].id) : "",
    });
    setShowForm(true);
  };

  const openEdit = (row: RouteShippingPointRecord) => {
    setEditTarget(row);
    setIsActive(Boolean(row.is_active));
    setFormData({
      route_id: String(row.route_id),
      shipping_point_id: String(row.shipping_point_id),
      distance_km: row.distance_km != null ? String(row.distance_km) : "",
      sequence: String(row.sequence ?? 1),
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

  const distanceKm = Number(formData.distance_km);
  const sequence = Number(formData.sequence);
  const canSubmit =
    Boolean(formData.route_id && formData.shipping_point_id) &&
    Number.isFinite(distanceKm) &&
    distanceKm > 0 &&
    Number.isInteger(sequence) &&
    sequence > 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || formBusy) return;

    const payload = {
      route_id: Number(formData.route_id),
      shipping_point_id: Number(formData.shipping_point_id),
      distance_km: distanceKm,
      sequence,
    };

    if (editTarget) {
      updateMutation.mutate({
        id: editTarget.id,
        payload: { ...payload, is_active: isActive },
      });
      return;
    }

    createMutation.mutate({ ...payload, is_active: true });
  };

  const columns: DataTableColumn<RouteShippingPointRecord>[] = [
    {
      key: "route_id",
      label: "Route",
      render: (_val, row) => {
        const route = routeById.get(row.route_id);
        return (
          <span className="font-medium text-[#0C4DA1] dark:text-[#70ADFF]">
            {route ? routeLabel(route) : `Route ${row.route_id}`}
          </span>
        );
      },
    },
    {
      key: "shipping_point_id",
      label: "Shipping Point",
      render: (_val, row) => {
        const point = shippingPointById.get(row.shipping_point_id);
        return point ? shippingPointLabel(point) : `Shipping Point ${row.shipping_point_id}`;
      },
    },
    {
      key: "sequence",
      label: "Sequence",
      className: "font-mono text-[13px]",
    },
    {
      key: "distance_km",
      label: "Distance",
      render: (val) => (val != null && val !== "" ? `${val} km` : "—"),
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
            label="Edit mapping"
            disabled={formBusy || deleteMutation.isPending}
            onClick={() => openEdit(row)}
            className="text-[#0C4DA1] hover:bg-[#EAF2FC] hover:text-[#0A3F86]"
          >
            <Pencil className="h-4 w-4" />
          </ActionIconButton>
          <ActionIconButton
            label="Delete mapping"
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

  const selectedRoute = routeById.get(Number(formData.route_id));
  const selectedPoint = shippingPointById.get(Number(formData.shipping_point_id));
  const deleteRoute = deleteTarget ? routeById.get(deleteTarget.route_id) : undefined;
  const deletePoint = deleteTarget ? shippingPointById.get(deleteTarget.shipping_point_id) : undefined;

  return (
    <ThemeScope className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-hidden">
        <motion.div {...motionProps} className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard title="Mappings" value={totals.total} icon={MapPin} accent="blue" />
          <KpiCard title="Active" value={totals.active} icon={CheckCircle2} accent="green" />
          <KpiCard title="Inactive" value={totals.inactive} icon={XCircle} accent="purple" />
        </motion.div>

        <motion.div {...motionProps} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DataTable
            className="min-h-0 min-w-0 flex-1 overflow-hidden"
            title="Route Shipping Points"
            description="Map shipping points to routes with sequence and distance."
            toolbarIcon={<Route className="h-4 w-4" />}
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: "Search mappings...",
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
                  Add Mapping
                </Button>
              </div>
            }
            data={filtered}
            columns={columns}
            loading={isLoading}
            error={isError ? (error instanceof Error ? error.message : "Unable to load route shipping points") : undefined}
            getRowId={(row) => row.id}
            resetPageKey={`${statusFilter}|${searchTerm}|${filtered.length}`}
            emptyMessage="No route shipping points found"
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
                <MapPin className="h-4 w-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                  {editTarget ? "Edit Route Shipping Point" : "Add Shipping Point to Route"}
                </DialogTitle>
                <DialogDescription className="text-sm text-[#64748B] dark:text-[#A9B8CC]">
                  {editTarget
                    ? "Update route, shipping point, sequence, and distance."
                    : "Link a shipping point to a route with distance information."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="nt-form nt-form-compact min-h-0 flex-1 overflow-y-auto px-5 py-3">
              <section>
                <h3 className="mb-2 text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">Mapping details</h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="rsp-route">
                      Route {requiredMark}
                    </Label>
                    <Select value={formData.route_id || undefined} onValueChange={(value) => handleChange("route_id", value)}>
                      <SelectTrigger id="rsp-route" className={fieldClass}>
                        <SelectValue placeholder="Select a route" />
                      </SelectTrigger>
                      <SelectContent className={selectPanelClass}>
                        {routes.map((route) => (
                          <SelectItem key={route.id} value={String(route.id)} className={selectItemClass}>
                            {routeLabel(route)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="rsp-point">
                      Shipping point {requiredMark}
                    </Label>
                    <Select
                      value={formData.shipping_point_id || undefined}
                      onValueChange={(value) => handleChange("shipping_point_id", value)}
                    >
                      <SelectTrigger id="rsp-point" className={fieldClass}>
                        <SelectValue placeholder="Select a shipping point" />
                      </SelectTrigger>
                      <SelectContent className={selectPanelClass}>
                        {shippingPoints.map((point) => (
                          <SelectItem key={point.id} value={String(point.id)} className={selectItemClass}>
                            {shippingPointLabel(point)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="rsp-distance">
                      Distance (km) {requiredMark}
                    </Label>
                    <Input
                      id="rsp-distance"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.distance_km}
                      onChange={(event) => handleChange("distance_km", event.target.value)}
                      placeholder="0.00"
                      className={cn(fieldClass, noSpinnerClass)}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="rsp-sequence">
                      Sequence {requiredMark}
                    </Label>
                    <Input
                      id="rsp-sequence"
                      type="number"
                      min="1"
                      step="1"
                      value={formData.sequence}
                      onChange={(event) => handleChange("sequence", event.target.value)}
                      className={cn(fieldClass, noSpinnerClass)}
                    />
                  </div>
                  {(selectedRoute || selectedPoint) && (
                    <p className="sm:col-span-2 text-[11px] text-[#64748B]">
                      {selectedRoute ? `Route: ${routeLabel(selectedRoute)}` : "Select a route"}
                      {selectedPoint ? ` · Point: ${shippingPointLabel(selectedPoint)}` : ""}
                    </p>
                  )}
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
                    aria-label="Mapping status"
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
                  {editTarget ? "Update Mapping" : "Create Mapping"}
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
                    Delete this mapping?
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm text-[#64748B] dark:text-[#A9B8CC]">
                    {deleteTarget
                      ? `${deleteRoute ? routeLabel(deleteRoute) : `Route ${deleteTarget.route_id}`} · ${
                          deletePoint ? shippingPointLabel(deletePoint) : `Shipping Point ${deleteTarget.shipping_point_id}`
                        } will be removed.`
                      : ""}
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
              Delete mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ThemeScope>
  );
}
