import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ListFilter,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
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

interface CompanyRecord {
  id: number;
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  is_active?: boolean;
}

const emptyForm = {
  name: "",
  address: "",
  city: "",
  state: "",
  country: "Bangladesh",
  pincode: "",
  phone: "",
  email: "",
  gstin: "",
};

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

export default function Company() {
  const reduceMotion = useReducedMotion();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<CompanyRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyRecord | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [generatedCode, setGeneratedCode] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    document.title = "Company | Renata";
  }, []);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => asList<CompanyRecord>(await apiEndpoints.companies.getAll()),
  });

  const companies = data || [];

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiEndpoints.companies.create(payload),
    onSuccess: () => {
      toast({ title: "Company added", description: `${formData.name} has been created.` });
      closeForm();
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      apiEndpoints.companies.update(id, payload),
    onSuccess: () => {
      toast({ title: "Company updated", description: "Company information has been updated successfully." });
      closeForm();
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiEndpoints.companies.delete(id),
    onSuccess: () => {
      toast({ title: "Company deleted", description: "The company has been removed." });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const formBusy = createMutation.isPending || updateMutation.isPending;

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return companies.filter((company) => {
      const active = company.is_active !== false;
      if (statusFilter === "active" && !active) return false;
      if (statusFilter === "inactive" && active) return false;
      if (!term) return true;
      return [company.name, company.code, company.email, company.phone, company.city, company.country, company.gstin]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [companies, searchTerm, statusFilter]);

  const totals = useMemo(() => {
    const active = companies.filter((company) => company.is_active !== false).length;
    return { total: companies.length, active, inactive: companies.length - active };
  }, [companies]);

  const openCreate = () => {
    setEditTarget(null);
    setFormData(emptyForm);
    setIsActive(true);
    setGeneratedCode(generateCode("COMP", companies.map((company) => company.code)));
    setShowForm(true);
  };

  const openEdit = (company: CompanyRecord) => {
    setEditTarget(company);
    setGeneratedCode(company.code);
    setIsActive(company.is_active !== false);
    setFormData({
      name: company.name || "",
      address: company.address || "",
      city: company.city || "",
      state: company.state || "",
      country: company.country || "Bangladesh",
      pincode: company.pincode || "",
      phone: company.phone || "",
      email: company.email || "",
      gstin: company.gstin || "",
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

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!formData.name.trim() || formBusy) return;

    if (editTarget) {
      updateMutation.mutate({
        id: editTarget.id,
        payload: {
          name: formData.name.trim(),
          address: formData.address || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          is_active: isActive,
        },
      });
      return;
    }

    createMutation.mutate({
      name: formData.name.trim(),
      code: generatedCode,
      address: formData.address || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      country: formData.country || "Bangladesh",
      pincode: formData.pincode || undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      gstin: formData.gstin || undefined,
      is_active: true,
    });
  };

  const columns: DataTableColumn<CompanyRecord>[] = [
    {
      key: "code",
      label: "Code",
      className: "font-mono text-[13px]",
    },
    {
      key: "name",
      label: "Company Name",
      render: (val) => <span className="font-medium text-[#0C4DA1] dark:text-[#70ADFF]">{String(val || "—")}</span>,
    },
    {
      key: "email",
      label: "Contact",
      render: (_val, row) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-[13px]">
            <Mail className="h-3 w-3 text-[#64748B]" />
            {row.email || "—"}
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-[#64748B] dark:text-[#A9B8CC]">
            <Phone className="h-3 w-3" />
            {row.phone || "—"}
          </div>
        </div>
      ),
    },
    {
      key: "city",
      label: "Location",
      render: (_val, row) => (
        <div className="flex items-center gap-1.5 text-[13px]">
          <MapPin className="h-3.5 w-3.5 text-[#64748B]" />
          <span>
            {row.city || "—"}
            {row.country ? <span className="text-[#64748B] dark:text-[#A9B8CC]"> · {row.country}</span> : null}
          </span>
        </div>
      ),
    },
    {
      key: "gstin",
      label: "GSTIN",
      render: (val) => String(val || "—"),
    },
    {
      key: "is_active",
      label: "Status",
      render: (_val, row) =>
        row.is_active === false ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-semibold text-[#B91C1C] dark:bg-[#3B1212] dark:text-[#FCA5A5]">
            Inactive
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]">
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
            label="Edit company"
            disabled={formBusy || deleteMutation.isPending}
            onClick={() => openEdit(row)}
            className="text-[#0C4DA1] hover:bg-[#EAF2FC] hover:text-[#0A3F86]"
          >
            <Pencil className="h-4 w-4" />
          </ActionIconButton>
          <ActionIconButton
            label="Delete company"
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
          <KpiCard title="Companies" value={totals.total} icon={Building2} accent="blue" />
          <KpiCard title="Active" value={totals.active} icon={CheckCircle2} accent="green" />
          <KpiCard title="Inactive" value={totals.inactive} icon={XCircle} accent="purple" />
        </motion.div>

        <motion.div {...motionProps} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DataTable
            className="min-h-0 min-w-0 flex-1 overflow-hidden"
            title="Company Master"
            description="Manage company profiles and business entities."
            toolbarIcon={<Building2 className="h-4 w-4" />}
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: "Search companies...",
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
                  New Company
                </Button>
              </div>
            }
            data={filtered}
            columns={columns}
            loading={isLoading}
            error={isError ? (error instanceof Error ? error.message : "Unable to load companies") : undefined}
            getRowId={(row) => row.id}
            resetPageKey={`${statusFilter}|${searchTerm}|${filtered.length}`}
            emptyMessage="No companies found"
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
                <Building2 className="h-4 w-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                  {editTarget ? "Edit Company" : "Add Company"}
                </DialogTitle>
                <DialogDescription className="text-sm text-[#64748B] dark:text-[#A9B8CC]">
                  {editTarget ? "Update company information." : "Create a new company profile."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="nt-form nt-form-compact min-h-0 flex-1 overflow-y-auto px-5 py-3">
              <section>
                <h3 className="mb-2 text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">Company details</h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Company code</Label>
                    <Input value={generatedCode} disabled className={cn(fieldClass, "font-mono")} />
                    <p className="text-[11px] text-[#64748B]">Auto-generated and cannot be changed</p>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="company-name">
                      Company name {requiredMark}
                    </Label>
                    <Input
                      id="company-name"
                      value={formData.name}
                      onChange={(event) => handleChange("name", event.target.value)}
                      placeholder="Enter company name"
                      required
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="company-email">
                      Email
                    </Label>
                    <Input
                      id="company-email"
                      type="email"
                      value={formData.email}
                      onChange={(event) => handleChange("email", event.target.value)}
                      placeholder="contact@company.com"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="company-phone">
                      Phone
                    </Label>
                    <Input
                      id="company-phone"
                      value={formData.phone}
                      onChange={(event) => handleChange("phone", event.target.value)}
                      placeholder="+880 ..."
                      className={fieldClass}
                    />
                  </div>
                  {!editTarget ? (
                    <div className={fieldWrapClass}>
                      <Label className={labelClass} htmlFor="company-gstin">
                        GSTIN
                      </Label>
                      <Input
                        id="company-gstin"
                        value={formData.gstin}
                        onChange={(event) => handleChange("gstin", event.target.value)}
                        placeholder="GSTIN"
                        className={fieldClass}
                      />
                    </div>
                  ) : null}
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="company-city">
                      City
                    </Label>
                    <Input
                      id="company-city"
                      value={formData.city}
                      onChange={(event) => handleChange("city", event.target.value)}
                      placeholder="City"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="company-state">
                      State
                    </Label>
                    <Input
                      id="company-state"
                      value={formData.state}
                      onChange={(event) => handleChange("state", event.target.value)}
                      placeholder="State"
                      className={fieldClass}
                    />
                  </div>
                  {!editTarget ? (
                    <>
                      <div className={fieldWrapClass}>
                        <Label className={labelClass} htmlFor="company-country">
                          Country
                        </Label>
                        <Input
                          id="company-country"
                          value={formData.country}
                          onChange={(event) => handleChange("country", event.target.value)}
                          placeholder="Country"
                          className={fieldClass}
                        />
                      </div>
                      <div className={fieldWrapClass}>
                        <Label className={labelClass} htmlFor="company-pincode">
                          Pincode
                        </Label>
                        <Input
                          id="company-pincode"
                          value={formData.pincode}
                          onChange={(event) => handleChange("pincode", event.target.value)}
                          placeholder="Pincode"
                          className={fieldClass}
                        />
                      </div>
                    </>
                  ) : null}
                </div>
                <div className={`${fieldWrapClass} mt-2.5`}>
                  <Label className={labelClass} htmlFor="company-address">
                    Address
                  </Label>
                  <Textarea
                    id="company-address"
                    value={formData.address}
                    onChange={(event) => handleChange("address", event.target.value)}
                    placeholder="Street address"
                    rows={2}
                    className="min-h-[64px] rounded-lg border border-[#CBD5E1] text-[13px] shadow-none focus-visible:border-[#0C4DA1] focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/20 dark:border-[#2C3B50] dark:bg-[#151F30]"
                  />
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
                    aria-label="Company status"
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
                  {editTarget ? "Update Company" : "Create Company"}
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
                    Delete this company?
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm text-[#64748B] dark:text-[#A9B8CC]">
                    {deleteTarget ? `${deleteTarget.name} (${deleteTarget.code}) will be removed.` : ""}
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
              Delete company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ThemeScope>
  );
}
