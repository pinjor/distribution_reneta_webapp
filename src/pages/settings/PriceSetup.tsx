import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ListFilter,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Tag,
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

interface PriceSetupRecord {
  id: number;
  code: string;
  product_id: number;
  trade_price?: number | string | null;
  unit_price?: number | string | null;
  ifc_price?: number | string | null;
  mc_price?: number | string | null;
  validity_start_date?: string | null;
  validity_end_date?: string | null;
  is_active: boolean;
}

interface ProductOption {
  id: number;
  name: string;
  code: string;
}

const emptyForm = {
  product_id: "",
  trade_price: "",
  unit_price: "",
  ifc_price: "",
  mc_price: "",
  validity_start_date: "",
  validity_end_date: "",
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

function asDateInput(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function formatDate(value?: string | null) {
  const raw = asDateInput(value);
  if (!raw) return "—";
  const parsed = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function formatMoney(value?: number | string | null) {
  if (value == null || value === "") return "—";
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : "—";
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return null;
  const amount = parseFloat(value);
  return Number.isFinite(amount) ? amount : null;
}

function productLabel(product?: ProductOption | null) {
  if (!product) return "";
  return product.code ? `${product.name} (${product.code})` : product.name;
}

export default function PriceSetup() {
  const reduceMotion = useReducedMotion();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<PriceSetupRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PriceSetupRecord | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [generatedCode, setGeneratedCode] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    document.title = "Price Setup | Renata";
  }, []);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["price-setups", { include_inactive: true }],
    queryFn: async () => asList<PriceSetupRecord>(await apiEndpoints.priceSetups.getAll({ include_inactive: true })),
  });

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: async () => asList<ProductOption>(await apiEndpoints.products.getAll()),
  });

  const { data: allProductsData } = useQuery({
    queryKey: ["products", { include_inactive: true }],
    queryFn: async () => asList<ProductOption>(await apiEndpoints.products.getAll({ include_inactive: true })),
  });

  const setups = data || [];
  const products = productsData || [];
  const productById = useMemo(
    () => new Map((allProductsData || products).map((product) => [product.id, product])),
    [allProductsData, products],
  );

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiEndpoints.priceSetups.create(payload),
    onSuccess: () => {
      toast({ title: "Price Setup added", description: `New Price Setup created with code ${generatedCode}.` });
      closeForm();
      queryClient.invalidateQueries({ queryKey: ["price-setups"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      apiEndpoints.priceSetups.update(id, payload),
    onSuccess: () => {
      toast({ title: "Price Setup updated", description: "Price Setup information has been updated successfully." });
      closeForm();
      queryClient.invalidateQueries({ queryKey: ["price-setups"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiEndpoints.priceSetups.delete(id),
    onSuccess: () => {
      toast({ title: "Price Setup deleted", description: "The Price Setup has been removed." });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["price-setups"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const formBusy = createMutation.isPending || updateMutation.isPending;

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return setups.filter((setup) => {
      if (statusFilter === "active" && !setup.is_active) return false;
      if (statusFilter === "inactive" && setup.is_active) return false;
      if (!term) return true;
      const product = productById.get(setup.product_id);
      return [setup.code, product?.name, product?.code]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [productById, searchTerm, setups, statusFilter]);

  const totals = useMemo(() => {
    const active = setups.filter((setup) => setup.is_active).length;
    return { total: setups.length, active, inactive: setups.length - active };
  }, [setups]);

  const productOptions = useMemo(() => {
    const list = [...products];
    const selectedId = Number(formData.product_id);
    const current = productById.get(selectedId);
    if (current && !list.some((item) => item.id === current.id)) list.unshift(current);
    return list;
  }, [formData.product_id, productById, products]);

  const openCreate = () => {
    setEditTarget(null);
    setFormData(emptyForm);
    setIsActive(true);
    setGeneratedCode(generateCode("PRICE", setups.map((setup) => setup.code)));
    setShowForm(true);
  };

  const openEdit = (setup: PriceSetupRecord) => {
    setEditTarget(setup);
    setGeneratedCode(setup.code);
    setIsActive(setup.is_active !== false);
    setFormData({
      product_id: setup.product_id ? String(setup.product_id) : "",
      trade_price: setup.trade_price != null ? String(setup.trade_price) : "",
      unit_price: setup.unit_price != null ? String(setup.unit_price) : "",
      ifc_price: setup.ifc_price != null ? String(setup.ifc_price) : "",
      mc_price: setup.mc_price != null ? String(setup.mc_price) : "",
      validity_start_date: asDateInput(setup.validity_start_date),
      validity_end_date: asDateInput(setup.validity_end_date),
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

  const canSubmit = Boolean(formData.product_id);

  const buildPayload = () => ({
    code: generatedCode,
    product_id: Number(formData.product_id),
    trade_price: parseOptionalNumber(formData.trade_price),
    unit_price: parseOptionalNumber(formData.unit_price),
    ifc_price: parseOptionalNumber(formData.ifc_price),
    mc_price: parseOptionalNumber(formData.mc_price),
    validity_start_date: formData.validity_start_date || null,
    validity_end_date: formData.validity_end_date || null,
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

    createMutation.mutate({ ...buildPayload(), is_active: true });
  };

  const columns: DataTableColumn<PriceSetupRecord>[] = [
    {
      key: "code",
      label: "Code",
      className: "font-mono text-[13px]",
    },
    {
      key: "product_id",
      label: "Product",
      render: (_val, row) => {
        const product = productById.get(row.product_id);
        return (
          <span className="font-medium text-[#0C4DA1] dark:text-[#70ADFF]">
            {product ? product.name : "Unknown"}
          </span>
        );
      },
    },
    {
      key: "trade_price",
      label: "Trade Price",
      render: (val) => formatMoney(val as number | string | null),
    },
    {
      key: "unit_price",
      label: "Unit Price",
      render: (val) => formatMoney(val as number | string | null),
    },
    {
      key: "ifc_price",
      label: "IFC Price",
      render: (val) => formatMoney(val as number | string | null),
    },
    {
      key: "mc_price",
      label: "MC Price",
      render: (val) => formatMoney(val as number | string | null),
    },
    {
      key: "validity_start_date",
      label: "Start Date",
      render: (val) => formatDate(val as string | null),
    },
    {
      key: "validity_end_date",
      label: "End Date",
      render: (val) => formatDate(val as string | null),
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
            label="Edit price setup"
            disabled={formBusy || deleteMutation.isPending}
            onClick={() => openEdit(row)}
            className="text-[#0C4DA1] hover:bg-[#EAF2FC] hover:text-[#0A3F86]"
          >
            <Pencil className="h-4 w-4" />
          </ActionIconButton>
          <ActionIconButton
            label="Delete price setup"
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

  const selectedProduct = productById.get(Number(formData.product_id));
  const deleteProduct = deleteTarget ? productById.get(deleteTarget.product_id) : undefined;

  return (
    <ThemeScope className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-hidden">
        <motion.div {...motionProps} className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard title="Price Setups" value={totals.total} icon={Tag} accent="blue" />
          <KpiCard title="Active" value={totals.active} icon={CheckCircle2} accent="green" />
          <KpiCard title="Inactive" value={totals.inactive} icon={XCircle} accent="purple" />
        </motion.div>

        <motion.div {...motionProps} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DataTable
            className="min-h-0 min-w-0 flex-1 overflow-hidden"
            title="Price Setup Catalog"
            description="Manage product trade, unit, IFC, and MC prices."
            toolbarIcon={<Tag className="h-4 w-4" />}
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: "Search Price Setups...",
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
                  Add Price Setup
                </Button>
              </div>
            }
            data={filtered}
            columns={columns}
            loading={isLoading}
            error={isError ? (error instanceof Error ? error.message : "Unable to load price setups") : undefined}
            getRowId={(row) => row.id}
            resetPageKey={`${statusFilter}|${searchTerm}|${filtered.length}`}
            emptyMessage="No Price Setups found"
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
                <Tag className="h-4 w-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                  {editTarget ? "Edit Price Setup" : "Add New Price Setup"}
                </DialogTitle>
                <DialogDescription className="text-sm text-[#64748B] dark:text-[#A9B8CC]">
                  {editTarget ? "Update product price setup information." : "Create a new price setup for a product."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="nt-form nt-form-compact min-h-0 flex-1 overflow-y-auto px-5 py-3">
              <section>
                <h3 className="mb-2 text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">Price details</h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="price-code">
                      Code {requiredMark}
                    </Label>
                    <Input id="price-code" value={generatedCode} disabled className={cn(fieldClass, "font-mono")} />
                    <p className="text-[11px] text-[#64748B]">Auto-generated code (cannot be changed)</p>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="price-product">
                      Product {requiredMark}
                    </Label>
                    <Select value={formData.product_id || undefined} onValueChange={(value) => handleChange("product_id", value)}>
                      <SelectTrigger id="price-product" className={fieldClass}>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent className={selectPanelClass}>
                        {productOptions.map((product) => (
                          <SelectItem key={product.id} value={String(product.id)} className={selectItemClass}>
                            {productLabel(product)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {products.length === 0 && (
                      <p className="text-[11px] text-[#64748B]">No products available. Add products first.</p>
                    )}
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="trade-price">
                      Trade price
                    </Label>
                    <Input
                      id="trade-price"
                      type="number"
                      step="0.01"
                      value={formData.trade_price}
                      onChange={(event) => handleChange("trade_price", event.target.value)}
                      placeholder="0.00"
                      className={cn(fieldClass, noSpinnerClass)}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="unit-price">
                      Unit price
                    </Label>
                    <Input
                      id="unit-price"
                      type="number"
                      step="0.01"
                      value={formData.unit_price}
                      onChange={(event) => handleChange("unit_price", event.target.value)}
                      placeholder="0.00"
                      className={cn(fieldClass, noSpinnerClass)}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="ifc-price">
                      IFC price
                    </Label>
                    <Input
                      id="ifc-price"
                      type="number"
                      step="0.01"
                      value={formData.ifc_price}
                      onChange={(event) => handleChange("ifc_price", event.target.value)}
                      placeholder="0.00"
                      className={cn(fieldClass, noSpinnerClass)}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="mc-price">
                      MC price
                    </Label>
                    <Input
                      id="mc-price"
                      type="number"
                      step="0.01"
                      value={formData.mc_price}
                      onChange={(event) => handleChange("mc_price", event.target.value)}
                      placeholder="0.00"
                      className={cn(fieldClass, noSpinnerClass)}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="validity-start">
                      Validity start date
                    </Label>
                    <Input
                      id="validity-start"
                      type="date"
                      value={formData.validity_start_date}
                      onChange={(event) => handleChange("validity_start_date", event.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="validity-end">
                      Validity end date
                    </Label>
                    <Input
                      id="validity-end"
                      type="date"
                      value={formData.validity_end_date}
                      onChange={(event) => handleChange("validity_end_date", event.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  {selectedProduct ? (
                    <p className="sm:col-span-2 text-[11px] text-[#64748B]">Selected product: {productLabel(selectedProduct)}</p>
                  ) : null}
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
                    aria-label="Price setup status"
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
                  {editTarget ? "Update Price Setup" : "Create Price Setup"}
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
                    Delete this price setup?
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm text-[#64748B] dark:text-[#A9B8CC]">
                    {deleteTarget
                      ? `${deleteTarget.code}${deleteProduct ? ` - ${deleteProduct.name}` : ""} will be removed.`
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
              Delete price setup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ThemeScope>
  );
}
