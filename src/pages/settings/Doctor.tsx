import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  GraduationCap,
  ListFilter,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Stethoscope,
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

interface DoctorRecord {
  id: number;
  code: string;
  name: string;
  specialization: string;
  registration_number: string;
  qualification?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  is_active: boolean;
}

const emptyForm = {
  name: "",
  specialization: "",
  registration_number: "",
  qualification: "",
  email: "",
  phone: "",
  address: "",
  city: "",
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

export default function Doctor() {
  const reduceMotion = useReducedMotion();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<DoctorRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DoctorRecord | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [generatedCode, setGeneratedCode] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    document.title = "Doctor | Renata";
  }, []);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["doctors", { include_inactive: true }],
    queryFn: async () => asList<DoctorRecord>(await apiEndpoints.doctors.getAll({ include_inactive: true })),
  });

  const doctors = data || [];

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiEndpoints.doctors.create(payload),
    onSuccess: () => {
      toast({ title: "Doctor added", description: `New doctor created with code ${generatedCode}.` });
      closeForm();
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      apiEndpoints.doctors.update(id, payload),
    onSuccess: () => {
      toast({ title: "Doctor updated", description: "Doctor information has been updated successfully." });
      closeForm();
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiEndpoints.doctors.delete(id),
    onSuccess: () => {
      toast({ title: "Doctor deleted", description: "The doctor has been removed." });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const formBusy = createMutation.isPending || updateMutation.isPending;

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return doctors.filter((doctor) => {
      if (statusFilter === "active" && !doctor.is_active) return false;
      if (statusFilter === "inactive" && doctor.is_active) return false;
      if (!term) return true;
      return [
        doctor.code,
        doctor.name,
        doctor.specialization,
        doctor.registration_number,
        doctor.qualification,
        doctor.email,
        doctor.city,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [doctors, searchTerm, statusFilter]);

  const totals = useMemo(() => {
    const active = doctors.filter((doctor) => doctor.is_active).length;
    return { total: doctors.length, active, inactive: doctors.length - active };
  }, [doctors]);

  const openCreate = () => {
    setEditTarget(null);
    setFormData(emptyForm);
    setIsActive(true);
    setGeneratedCode(generateCode("DOC", doctors.map((doctor) => doctor.code)));
    setShowForm(true);
  };

  const openEdit = (doctor: DoctorRecord) => {
    setEditTarget(doctor);
    setGeneratedCode(doctor.code);
    setIsActive(doctor.is_active !== false);
    setFormData({
      name: doctor.name || "",
      specialization: doctor.specialization || "",
      registration_number: doctor.registration_number || "",
      qualification: doctor.qualification || "",
      email: doctor.email || "",
      phone: doctor.phone || "",
      address: doctor.address || "",
      city: doctor.city || "",
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

  const canSubmit = Boolean(
    formData.name.trim() &&
      formData.specialization.trim() &&
      formData.registration_number.trim() &&
      formData.email.trim() &&
      formData.phone.trim(),
  );

  const buildPayload = () => ({
    name: formData.name.trim(),
    specialization: formData.specialization.trim(),
    registration_number: formData.registration_number.trim(),
    qualification: formData.qualification.trim() || null,
    email: formData.email.trim() || null,
    phone: formData.phone.trim() || null,
    address: formData.address.trim() || null,
    city: formData.city.trim() || null,
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
      code: generatedCode,
      is_active: true,
    });
  };

  const columns: DataTableColumn<DoctorRecord>[] = [
    {
      key: "code",
      label: "Code",
      className: "font-mono text-[13px]",
    },
    {
      key: "name",
      label: "Doctor Name",
      render: (val) => <span className="font-medium text-[#0C4DA1] dark:text-[#70ADFF]">{String(val || "—")}</span>,
    },
    {
      key: "specialization",
      label: "Specialization",
      render: (val) => (
        <span className="inline-flex rounded-full bg-[#EAF2FC] px-2 py-0.5 text-[11px] font-semibold text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]">
          {String(val || "—")}
        </span>
      ),
    },
    {
      key: "qualification",
      label: "Qualification",
      render: (val) => (
        <span className="inline-flex items-center gap-1.5">
          <GraduationCap className="h-3.5 w-3.5 text-[#64748B]" />
          {String(val || "—")}
        </span>
      ),
    },
    {
      key: "registration_number",
      label: "Registration",
      render: (val) => String(val || "—"),
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
            {row.address ? <span className="text-[#64748B] dark:text-[#A9B8CC]"> · {row.address}</span> : null}
          </span>
        </div>
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
            label="Edit doctor"
            disabled={formBusy || deleteMutation.isPending}
            onClick={() => openEdit(row)}
            className="text-[#0C4DA1] hover:bg-[#EAF2FC] hover:text-[#0A3F86]"
          >
            <Pencil className="h-4 w-4" />
          </ActionIconButton>
          <ActionIconButton
            label="Delete doctor"
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
          <KpiCard title="Doctors" value={totals.total} icon={Stethoscope} accent="blue" />
          <KpiCard title="Active" value={totals.active} icon={CheckCircle2} accent="green" />
          <KpiCard title="Inactive" value={totals.inactive} icon={XCircle} accent="purple" />
        </motion.div>

        <motion.div {...motionProps} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DataTable
            className="min-h-0 min-w-0 flex-1 overflow-hidden"
            title="All Doctors"
            description="Manage doctor profiles and registrations."
            toolbarIcon={<Stethoscope className="h-4 w-4" />}
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: "Search doctors...",
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
                  Add Doctor
                </Button>
              </div>
            }
            data={filtered}
            columns={columns}
            loading={isLoading}
            error={isError ? (error instanceof Error ? error.message : "Unable to load doctors") : undefined}
            getRowId={(row) => row.id}
            resetPageKey={`${statusFilter}|${searchTerm}|${filtered.length}`}
            emptyMessage="No doctors found"
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
                <Stethoscope className="h-4 w-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                  {editTarget ? "Edit Doctor" : "Add New Doctor"}
                </DialogTitle>
                <DialogDescription className="text-sm text-[#64748B] dark:text-[#A9B8CC]">
                  {editTarget ? "Update doctor information." : "Create a new doctor profile."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="nt-form nt-form-compact min-h-0 flex-1 overflow-y-auto px-5 py-3">
              <section>
                <h3 className="mb-2 text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">Doctor details</h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="doc-code">
                      Doctor code {requiredMark}
                    </Label>
                    <Input id="doc-code" value={generatedCode} disabled className={cn(fieldClass, "font-mono")} />
                    <p className="text-[11px] text-[#64748B]">Auto-generated code (cannot be changed)</p>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="doc-name">
                      Doctor name {requiredMark}
                    </Label>
                    <Input
                      id="doc-name"
                      value={formData.name}
                      onChange={(event) => handleChange("name", event.target.value)}
                      placeholder="Dr. Full Name"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="doc-specialization">
                      Specialization {requiredMark}
                    </Label>
                    <Input
                      id="doc-specialization"
                      value={formData.specialization}
                      onChange={(event) => handleChange("specialization", event.target.value)}
                      placeholder="Cardiology, Pediatrics, etc."
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="doc-registration">
                      Registration number {requiredMark}
                    </Label>
                    <Input
                      id="doc-registration"
                      value={formData.registration_number}
                      onChange={(event) => handleChange("registration_number", event.target.value)}
                      placeholder="BMDC-XXXXX"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="doc-qualification">
                      Qualification
                    </Label>
                    <Input
                      id="doc-qualification"
                      value={formData.qualification}
                      onChange={(event) => handleChange("qualification", event.target.value)}
                      placeholder="MBBS, MD, FCPS, etc."
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="doc-email">
                      Email {requiredMark}
                    </Label>
                    <Input
                      id="doc-email"
                      type="email"
                      value={formData.email}
                      onChange={(event) => handleChange("email", event.target.value)}
                      placeholder="doctor@example.com"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="doc-phone">
                      Phone {requiredMark}
                    </Label>
                    <Input
                      id="doc-phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(event) => handleChange("phone", event.target.value)}
                      placeholder="+880 1712-345678"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="doc-city">
                      City
                    </Label>
                    <Input
                      id="doc-city"
                      value={formData.city}
                      onChange={(event) => handleChange("city", event.target.value)}
                      placeholder="City"
                      className={fieldClass}
                    />
                  </div>
                  <div className={`${fieldWrapClass} sm:col-span-2`}>
                    <Label className={labelClass} htmlFor="doc-address">
                      Address
                    </Label>
                    <Textarea
                      id="doc-address"
                      value={formData.address}
                      onChange={(event) => handleChange("address", event.target.value)}
                      placeholder="123 Medical Tower, Area"
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
                    aria-label="Doctor status"
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
                  {editTarget ? "Update Doctor" : "Create Doctor"}
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
                    Delete this doctor?
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
              Delete doctor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ThemeScope>
  );
}
