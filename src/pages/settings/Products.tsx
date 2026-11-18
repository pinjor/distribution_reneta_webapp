import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Barcode,
  CheckCircle2,
  ListFilter,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

interface ProductRecord {
  id: number;
  sku?: string | null;
  code?: string | null;
  old_code?: string | null;
  new_code?: string | null;
  name: string;
  generic_name?: string | null;
  unit_of_measure?: string | null;
  business_unit?: string | null;
  primary_packaging?: string | null;
  product_type_commercial?: boolean;
  product_type_sample?: boolean;
  product_type_institutional?: boolean;
  product_type_export?: boolean;
  cold_chain_available?: boolean;
  ifc_value1?: number | string | null;
  ifc_value2?: number | string | null;
  ifc_result?: number | string | null;
  mc_value1?: number | string | null;
  mc_value2?: number | string | null;
  mc_value3?: number | string | null;
  mc_result?: number | string | null;
  free_goods_threshold?: number | string | null;
  free_goods_quantity?: number | string | null;
  is_active?: boolean;
}

interface NamedOption {
  id: number;
  name: string;
  code?: string;
}

const BUSINESS_UNITS = ["Pharma", "Purnava", "Animal health"];
const FALLBACK_UOMS = ["PCS", "pack", "box", "kg", "liter"];
const FALLBACK_PACKS = ["Bottle", "Blister", "Vial", "Injection"];

const emptyForm = {
  old_code: "",
  new_code: "",
  name: "",
  generic_name: "",
  unit_of_measure: "",
  business_unit: "",
  primary_packaging: "",
  product_type_commercial: false,
  product_type_sample: false,
  product_type_institutional: false,
  product_type_export: false,
  cold_chain_available: false,
  ifc_value1: "",
  ifc_value2: "",
  mc_value1: "",
  mc_value2: "",
  mc_value3: "",
  free_goods_threshold: "100",
  free_goods_quantity: "5",
};

function asNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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

export default function Products() {
  const reduceMotion = useReducedMotion();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<ProductRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductRecord | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [skuPreview, setSkuPreview] = useState("PRD-XXXX");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    document.title = "Products | Renata";
  }, []);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["products", "master"],
    queryFn: async () => asList<ProductRecord>(await apiEndpoints.products.getAll({ include_inactive: true })),
  });

  const { data: uomsData } = useQuery({
    queryKey: ["uoms"],
    queryFn: async () => asList<NamedOption>(await apiEndpoints.uoms.getAll()),
  });

  const { data: packsData } = useQuery({
    queryKey: ["primary-packagings"],
    queryFn: async () => asList<NamedOption>(await apiEndpoints.primaryPackagings.getAll()),
  });

  const products = data || [];
  const uoms = uomsData || [];
  const packagings = packsData || [];

  const ifcResult = formData.ifc_value1 && formData.ifc_value2
    ? parseFloat(formData.ifc_value1) * parseFloat(formData.ifc_value2)
    : null;
  const mcResult =
    formData.mc_value1 && formData.mc_value2 && formData.mc_value3
      ? parseFloat(formData.mc_value1) * parseFloat(formData.mc_value2) * parseFloat(formData.mc_value3)
      : null;

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiEndpoints.products.create(payload),
    onSuccess: (created: ProductRecord) => {
      toast({ title: "Product added", description: `New product created with SKU ${created.sku}.` });
      closeForm();
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      apiEndpoints.products.update(id, payload),
    onSuccess: () => {
      toast({ title: "Product updated", description: "Product information has been updated successfully." });
      closeForm();
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiEndpoints.products.delete(id),
    onSuccess: () => {
      toast({ title: "Product deleted", description: "The product has been removed from catalog." });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const formBusy = createMutation.isPending || updateMutation.isPending;

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      const active = product.is_active !== false;
      if (statusFilter === "active" && !active) return false;
      if (statusFilter === "inactive" && active) return false;
      if (!term) return true;
      return [product.name, product.old_code, product.new_code, product.code, product.sku, product.generic_name, product.business_unit]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [products, searchTerm, statusFilter]);

  const totals = useMemo(() => {
    const active = products.filter((product) => product.is_active !== false).length;
    return { total: products.length, active, inactive: products.length - active };
  }, [products]);

  const uomOptions = useMemo(() => {
    const names = uoms.map((item) => item.name);
    const source = names.length > 0 ? names : FALLBACK_UOMS;
    if (formData.unit_of_measure && !source.includes(formData.unit_of_measure)) {
      return [formData.unit_of_measure, ...source];
    }
    return source;
  }, [formData.unit_of_measure, uoms]);

  const packOptions = useMemo(() => {
    const names = packagings.map((item) => item.name);
    const source = names.length > 0 ? names : FALLBACK_PACKS;
    if (formData.primary_packaging && !source.includes(formData.primary_packaging)) {
      return [formData.primary_packaging, ...source];
    }
    return source;
  }, [formData.primary_packaging, packagings]);

  const businessUnitOptions = useMemo(() => {
    if (formData.business_unit && !BUSINESS_UNITS.includes(formData.business_unit)) {
      return [formData.business_unit, ...BUSINESS_UNITS];
    }
    return BUSINESS_UNITS;
  }, [formData.business_unit]);

  const buildPayload = (active: boolean) => ({
    name: formData.name.trim(),
    old_code: formData.old_code || undefined,
    new_code: formData.new_code || undefined,
    generic_name: formData.generic_name || undefined,
    base_price: 0,
    unit_of_measure: formData.unit_of_measure || "PCS",
    business_unit: formData.business_unit || undefined,
    primary_packaging: formData.primary_packaging || undefined,
    product_type_commercial: formData.product_type_commercial,
    product_type_sample: formData.product_type_sample,
    product_type_institutional: formData.product_type_institutional,
    product_type_export: formData.product_type_export,
    cold_chain_available: formData.cold_chain_available,
    ifc_value1: asNumber(formData.ifc_value1),
    ifc_value2: asNumber(formData.ifc_value2),
    ifc_result: ifcResult ?? undefined,
    mc_value1: asNumber(formData.mc_value1),
    mc_value2: asNumber(formData.mc_value2),
    mc_value3: asNumber(formData.mc_value3),
    mc_result: mcResult ?? undefined,
    free_goods_threshold: asNumber(formData.free_goods_threshold) ?? 100,
    free_goods_quantity: asNumber(formData.free_goods_quantity) ?? 5,
    is_active: active,
  });

  const openCreate = () => {
    setEditTarget(null);
    setFormData(emptyForm);
    setIsActive(true);
    setSkuPreview("PRD-XXXX");
    setShowForm(true);
  };

  const openEdit = (product: ProductRecord) => {
    setEditTarget(product);
    setSkuPreview(product.sku || product.code || "PRD-XXXX");
    setIsActive(product.is_active !== false);
    setFormData({
      old_code: product.old_code || "",
      new_code: product.new_code || product.code || "",
      name: product.name || "",
      generic_name: product.generic_name || "",
      unit_of_measure: product.unit_of_measure || "",
      business_unit: product.business_unit || "",
      primary_packaging: product.primary_packaging || "",
      product_type_commercial: Boolean(product.product_type_commercial),
      product_type_sample: Boolean(product.product_type_sample),
      product_type_institutional: Boolean(product.product_type_institutional),
      product_type_export: Boolean(product.product_type_export),
      cold_chain_available: Boolean(product.cold_chain_available),
      ifc_value1: product.ifc_value1 != null ? String(product.ifc_value1) : "",
      ifc_value2: product.ifc_value2 != null ? String(product.ifc_value2) : "",
      mc_value1: product.mc_value1 != null ? String(product.mc_value1) : "",
      mc_value2: product.mc_value2 != null ? String(product.mc_value2) : "",
      mc_value3: product.mc_value3 != null ? String(product.mc_value3) : "",
      free_goods_threshold: product.free_goods_threshold != null ? String(product.free_goods_threshold) : "100",
      free_goods_quantity: product.free_goods_quantity != null ? String(product.free_goods_quantity) : "5",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditTarget(null);
    setFormData(emptyForm);
    setSkuPreview("PRD-XXXX");
    setIsActive(true);
  };

  const handleChange = (field: keyof typeof emptyForm, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!formData.name.trim() || formBusy) return;
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, payload: buildPayload(isActive) });
      return;
    }
    createMutation.mutate(buildPayload(true));
  };

  const columns: DataTableColumn<ProductRecord>[] = [
    {
      key: "name",
      label: "Product Name",
      render: (val) => <span className="font-medium text-[#0C4DA1] dark:text-[#70ADFF]">{String(val || "—")}</span>,
    },
    {
      key: "old_code",
      label: "Old Code",
      className: "font-mono text-[13px]",
      render: (val) => String(val || "—"),
    },
    {
      key: "new_code",
      label: "New Code",
      className: "font-mono text-[13px]",
      render: (val, row) => String(val || row.code || "—"),
    },
    {
      key: "generic_name",
      label: "Generic Name",
      render: (val) => String(val || "—"),
    },
    {
      key: "unit_of_measure",
      label: "UOM",
      render: (val) => String(val || "—"),
    },
    {
      key: "is_active",
      label: "Status",
      render: (_val, row) =>
        row.is_active === false ? (
          <span className="inline-flex rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-semibold text-[#B91C1C] dark:bg-[#3B1212] dark:text-[#FCA5A5]">
            Inactive
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]">
            Active
          </span>
        ),
    },
    {
      key: "id",
      label: "Actions",
      align: "right",
      headerClassName: "text-right",
      render: (_val, row) => (
        <div className="flex justify-end gap-0.5">
          <ActionIconButton
            label="Edit product"
            disabled={formBusy || deleteMutation.isPending}
            onClick={() => openEdit(row)}
            className="text-[#0C4DA1] hover:bg-[#EAF2FC] hover:text-[#0A3F86]"
          >
            <Pencil className="h-4 w-4" />
          </ActionIconButton>
          <ActionIconButton
            label="Delete product"
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

  return (
    <ThemeScope className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-hidden">
        <motion.div {...motionProps} className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard title="Products" value={totals.total} icon={Package} accent="blue" />
          <KpiCard title="Active" value={totals.active} icon={CheckCircle2} accent="green" />
          <KpiCard title="Inactive" value={totals.inactive} icon={XCircle} accent="purple" />
        </motion.div>

        <motion.div {...motionProps} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DataTable
            className="min-h-0 min-w-0 flex-1 overflow-hidden"
            title="Product Catalog"
            description="Manage product catalog, SKUs, and inventory items."
            toolbarIcon={<Package className="h-4 w-4" />}
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: "Search products...",
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
                  New Product
                </Button>
              </div>
            }
            data={filtered}
            columns={columns}
            loading={isLoading}
            error={isError ? (error instanceof Error ? error.message : "Unable to load products") : undefined}
            getRowId={(row) => row.id}
            resetPageKey={`${statusFilter}|${searchTerm}|${filtered.length}`}
            emptyMessage="No products found"
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
                <Package className="h-4 w-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                  {editTarget ? "Edit Product" : "Add Product"}
                </DialogTitle>
                <DialogDescription className="text-sm text-[#64748B] dark:text-[#A9B8CC]">
                  {editTarget ? "Update product information." : "Create a new product in the catalog."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="nt-form nt-form-compact min-h-0 flex-1 overflow-y-auto px-5 py-3">
              <section>
                <h3 className="mb-2 text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">Product details</h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className={fieldWrapClass}>
                    <Label className={cn(labelClass, "inline-flex items-center gap-1.5")}>
                      <Barcode className="h-3.5 w-3.5 text-[#64748B]" />
                      SKU
                    </Label>
                    <Input value={skuPreview} disabled className={cn(fieldClass, "font-mono")} />
                    <p className="text-[11px] text-[#64748B]">Auto-generated and cannot be changed</p>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="product-name">
                      Product name {requiredMark}
                    </Label>
                    <Input
                      id="product-name"
                      value={formData.name}
                      onChange={(event) => handleChange("name", event.target.value)}
                      placeholder="Enter product name"
                      required
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="old-code">
                      Old code
                    </Label>
                    <Input
                      id="old-code"
                      value={formData.old_code}
                      onChange={(event) => handleChange("old_code", event.target.value)}
                      placeholder="Old code"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="new-code">
                      New code
                    </Label>
                    <Input
                      id="new-code"
                      value={formData.new_code}
                      onChange={(event) => handleChange("new_code", event.target.value)}
                      placeholder="New code"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="generic-name">
                      Generic name
                    </Label>
                    <Input
                      id="generic-name"
                      value={formData.generic_name}
                      onChange={(event) => handleChange("generic_name", event.target.value)}
                      placeholder="Optional"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="business-unit">
                      Business unit
                    </Label>
                    <Select
                      value={formData.business_unit || undefined}
                      onValueChange={(value) => handleChange("business_unit", value)}
                    >
                      <SelectTrigger id="business-unit" className={fieldClass}>
                        <SelectValue placeholder="Select business unit" />
                      </SelectTrigger>
                      <SelectContent className={selectPanelClass}>
                        {businessUnitOptions.map((item) => (
                          <SelectItem key={item} value={item} className={selectItemClass}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="uom">
                      UOM
                    </Label>
                    <Select
                      value={formData.unit_of_measure || undefined}
                      onValueChange={(value) => handleChange("unit_of_measure", value)}
                    >
                      <SelectTrigger id="uom" className={fieldClass}>
                        <SelectValue placeholder="Select UOM" />
                      </SelectTrigger>
                      <SelectContent className={selectPanelClass}>
                        {uomOptions.map((item) => (
                          <SelectItem key={item} value={item} className={selectItemClass}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="primary-packaging">
                      Primary packaging
                    </Label>
                    <Select
                      value={formData.primary_packaging || undefined}
                      onValueChange={(value) => handleChange("primary_packaging", value)}
                    >
                      <SelectTrigger id="primary-packaging" className={fieldClass}>
                        <SelectValue placeholder="Select packaging" />
                      </SelectTrigger>
                      <SelectContent className={selectPanelClass}>
                        {packOptions.map((item) => (
                          <SelectItem key={item} value={item} className={selectItemClass}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-2.5 rounded-lg border border-[#E3EAF3] px-3 py-2 dark:border-[#2C3B50]">
                  <Label className={labelClass}>Product type</Label>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                    {[
                      ["product_type_commercial", "Commercial"],
                      ["product_type_sample", "Sample"],
                      ["product_type_institutional", "Institutional"],
                      ["product_type_export", "Export"],
                      ["cold_chain_available", "Cold chain"],
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-[13px]">
                        <Checkbox
                          checked={Boolean(formData[key as keyof typeof emptyForm])}
                          onCheckedChange={(checked) => handleChange(key as keyof typeof emptyForm, checked === true)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </section>

              <section className="mt-3">
                <h3 className="mb-2 text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">Pack size</h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>IFC</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={formData.ifc_value1}
                        onChange={(event) => handleChange("ifc_value1", event.target.value)}
                        className={cn(fieldClass, "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none")}
                      />
                      <span className="text-[#64748B]">×</span>
                      <Input
                        type="number"
                        value={formData.ifc_value2}
                        onChange={(event) => handleChange("ifc_value2", event.target.value)}
                        className={cn(fieldClass, "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none")}
                      />
                      <span className="text-[#64748B]">=</span>
                      <Input value={ifcResult != null && Number.isFinite(ifcResult) ? String(ifcResult) : ""} disabled className={fieldClass} />
                    </div>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>MC</Label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        value={formData.mc_value1}
                        onChange={(event) => handleChange("mc_value1", event.target.value)}
                        className={cn(fieldClass, "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none")}
                      />
                      <span className="text-[#64748B]">×</span>
                      <Input
                        type="number"
                        value={formData.mc_value2}
                        onChange={(event) => handleChange("mc_value2", event.target.value)}
                        className={cn(fieldClass, "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none")}
                      />
                      <span className="text-[#64748B]">×</span>
                      <Input
                        type="number"
                        value={formData.mc_value3}
                        onChange={(event) => handleChange("mc_value3", event.target.value)}
                        className={cn(fieldClass, "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none")}
                      />
                      <span className="text-[#64748B]">=</span>
                      <Input value={mcResult != null && Number.isFinite(mcResult) ? String(mcResult) : ""} disabled className={fieldClass} />
                    </div>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="free-threshold">
                      Free goods threshold
                    </Label>
                    <Input
                      id="free-threshold"
                      type="number"
                      min="0"
                      value={formData.free_goods_threshold}
                      onChange={(event) => handleChange("free_goods_threshold", event.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="free-quantity">
                      Free goods quantity
                    </Label>
                    <Input
                      id="free-quantity"
                      type="number"
                      min="0"
                      value={formData.free_goods_quantity}
                      onChange={(event) => handleChange("free_goods_quantity", event.target.value)}
                      className={fieldClass}
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
                    aria-label="Product status"
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
                <Button type="submit" variant="ntPrimary" disabled={formBusy || !formData.name.trim()}>
                  {formBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editTarget ? "Update Product" : "Create Product"}
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
                    Delete this product?
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm text-[#64748B] dark:text-[#A9B8CC]">
                    {deleteTarget ? `${deleteTarget.name} will be removed from the catalog.` : ""}
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
              Delete product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ThemeScope>
  );
}
