import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ListFilter,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  UserSquare2,
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

interface EmployeeRecord {
  id: number;
  employee_id: string;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  designation?: string | null;
  depot_id?: number | null;
  role_master_id?: number | null;
  is_active?: boolean;
}

interface DepotOption {
  id: number;
  name: string;
  code: string;
}

interface RoleMasterOption {
  id: number;
  code: string;
  name: string;
  role_type: string;
}

const DESIGNATIONS = ["Manager", "Supervisor", "Operator", "Driver"];
const DEPARTMENTS = ["Warehouse", "Distribution", "Admin"];

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  designation: "",
  department: "",
  depot_id: "",
  role_master_id: "none",
};

function employeeName(employee: EmployeeRecord) {
  return `${employee.first_name} ${employee.last_name || ""}`.trim();
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] || name.trim(),
    last_name: parts.slice(1).join(" ") || "",
  };
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

export default function Employees() {
  const reduceMotion = useReducedMotion();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<EmployeeRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRecord | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [generatedCode, setGeneratedCode] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    document.title = "Employees | Renata";
  }, []);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => asList<EmployeeRecord>(await apiEndpoints.employees.getAll()),
  });

  const { data: depotsData } = useQuery({
    queryKey: ["depots"],
    queryFn: async () => asList<DepotOption>(await apiEndpoints.depots.getAll()),
  });

  const { data: rolesData } = useQuery({
    queryKey: ["role-masters"],
    queryFn: async () => asList<RoleMasterOption>(await apiEndpoints.roleMasters.getAll()),
  });

  const employees = data || [];
  const depots = depotsData || [];
  const roles = rolesData || [];
  const depotById = useMemo(() => new Map(depots.map((depot) => [depot.id, depot])), [depots]);
  const roleById = useMemo(() => new Map(roles.map((role) => [role.id, role])), [roles]);

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiEndpoints.employees.create(payload),
    onSuccess: () => {
      toast({ title: "Employee added", description: `${formData.name} has been created.` });
      closeForm();
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      apiEndpoints.employees.update(id, payload),
    onSuccess: () => {
      toast({ title: "Employee updated", description: "Employee information has been updated successfully." });
      closeForm();
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiEndpoints.employees.delete(id),
    onSuccess: () => {
      toast({ title: "Employee deleted", description: "The employee has been removed." });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const formBusy = createMutation.isPending || updateMutation.isPending;

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return employees.filter((employee) => {
      const active = employee.is_active !== false;
      if (statusFilter === "active" && !active) return false;
      if (statusFilter === "inactive" && active) return false;
      if (!term) return true;
      const depot = employee.depot_id ? depotById.get(employee.depot_id) : undefined;
      const role = employee.role_master_id ? roleById.get(employee.role_master_id) : undefined;
      return [
        employeeName(employee),
        employee.employee_id,
        employee.email,
        employee.phone,
        employee.designation,
        employee.department,
        depot?.name,
        depot?.code,
        role?.name,
        role?.code,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [depotById, employees, roleById, searchTerm, statusFilter]);

  const totals = useMemo(() => {
    const active = employees.filter((employee) => employee.is_active !== false).length;
    return { total: employees.length, active, inactive: employees.length - active };
  }, [employees]);

  const buildPayload = (active: boolean) => {
    const names = splitName(formData.name);
    return {
      employee_id: generatedCode,
      first_name: names.first_name,
      last_name: names.last_name || undefined,
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      designation: formData.designation || undefined,
      department: formData.department || undefined,
      depot_id: formData.depot_id ? Number(formData.depot_id) : undefined,
      role_master_id:
        formData.role_master_id && formData.role_master_id !== "none" ? Number(formData.role_master_id) : undefined,
      is_active: active,
    };
  };

  const openCreate = () => {
    setEditTarget(null);
    setFormData({
      ...emptyForm,
      depot_id: depots[0] ? String(depots[0].id) : "",
    });
    setIsActive(true);
    setGeneratedCode(generateCode("EMP", employees.map((employee) => employee.employee_id)));
    setShowForm(true);
  };

  const openEdit = (employee: EmployeeRecord) => {
    setEditTarget(employee);
    setGeneratedCode(employee.employee_id);
    setIsActive(employee.is_active !== false);
    setFormData({
      name: employeeName(employee),
      email: employee.email || "",
      phone: employee.phone || "",
      designation: employee.designation || "",
      department: employee.department || "",
      depot_id: employee.depot_id ? String(employee.depot_id) : "",
      role_master_id: employee.role_master_id ? String(employee.role_master_id) : "none",
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

  const designationOptions = useMemo(() => {
    if (formData.designation && !DESIGNATIONS.includes(formData.designation)) {
      return [formData.designation, ...DESIGNATIONS];
    }
    return DESIGNATIONS;
  }, [formData.designation]);

  const departmentOptions = useMemo(() => {
    if (formData.department && !DEPARTMENTS.includes(formData.department)) {
      return [formData.department, ...DEPARTMENTS];
    }
    return DEPARTMENTS;
  }, [formData.department]);

  const canSubmit = Boolean(formData.name.trim()) && Boolean(formData.email.trim());

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || formBusy) return;

    if (editTarget) {
      updateMutation.mutate({
        id: editTarget.id,
        payload: buildPayload(isActive),
      });
      return;
    }

    createMutation.mutate(buildPayload(true));
  };

  const columns: DataTableColumn<EmployeeRecord>[] = [
    {
      key: "employee_id",
      label: "Code",
      className: "font-mono text-[13px]",
    },
    {
      key: "first_name",
      label: "Name",
      render: (_val, row) => (
        <span className="font-medium text-[#0C4DA1] dark:text-[#70ADFF]">{employeeName(row) || "—"}</span>
      ),
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
      key: "designation",
      label: "Role",
      render: (val) => String(val || "—"),
    },
    {
      key: "department",
      label: "Department",
      render: (val) => String(val || "—"),
    },
    {
      key: "depot_id",
      label: "Depot",
      render: (_val, row) => {
        const depot = row.depot_id ? depotById.get(row.depot_id) : undefined;
        return depot ? (
          <span>
            {depot.name}
            <span className="text-[#64748B] dark:text-[#A9B8CC]"> · {depot.code}</span>
          </span>
        ) : (
          "—"
        );
      },
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
            label="Edit employee"
            disabled={formBusy || deleteMutation.isPending}
            onClick={() => openEdit(row)}
            className="text-[#0C4DA1] hover:bg-[#EAF2FC] hover:text-[#0A3F86]"
          >
            <Pencil className="h-4 w-4" />
          </ActionIconButton>
          <ActionIconButton
            label="Delete employee"
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
          <KpiCard title="Employees" value={totals.total} icon={UserSquare2} accent="blue" />
          <KpiCard title="Active" value={totals.active} icon={CheckCircle2} accent="green" />
          <KpiCard title="Inactive" value={totals.inactive} icon={XCircle} accent="purple" />
        </motion.div>

        <motion.div {...motionProps} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DataTable
            className="min-h-0 min-w-0 flex-1 overflow-hidden"
            title="Employee Master"
            description="Manage staff, roles, and access permissions."
            toolbarIcon={<UserSquare2 className="h-4 w-4" />}
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: "Search employees...",
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
                  New Employee
                </Button>
              </div>
            }
            data={filtered}
            columns={columns}
            loading={isLoading}
            error={isError ? (error instanceof Error ? error.message : "Unable to load employees") : undefined}
            getRowId={(row) => row.id}
            resetPageKey={`${statusFilter}|${searchTerm}|${filtered.length}`}
            emptyMessage="No employees found"
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
                <UserSquare2 className="h-4 w-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                  {editTarget ? "Edit Employee" : "Add Employee"}
                </DialogTitle>
                <DialogDescription className="text-sm text-[#64748B] dark:text-[#A9B8CC]">
                  {editTarget ? "Update employee information." : "Register a new staff member."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="nt-form nt-form-compact min-h-0 flex-1 overflow-y-auto px-5 py-3">
              <section>
                <h3 className="mb-2 text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">Employee details</h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Employee code</Label>
                    <Input value={generatedCode} disabled className={cn(fieldClass, "font-mono")} />
                    <p className="text-[11px] text-[#64748B]">Auto-generated and cannot be changed</p>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="emp-name">
                      Full name {requiredMark}
                    </Label>
                    <Input
                      id="emp-name"
                      value={formData.name}
                      onChange={(event) => handleChange("name", event.target.value)}
                      placeholder="John Smith"
                      required
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="emp-email">
                      Email {requiredMark}
                    </Label>
                    <Input
                      id="emp-email"
                      type="email"
                      value={formData.email}
                      onChange={(event) => handleChange("email", event.target.value)}
                      placeholder="john@company.com"
                      required
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="emp-phone">
                      Phone
                    </Label>
                    <Input
                      id="emp-phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(event) => handleChange("phone", event.target.value)}
                      placeholder="+880 ..."
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="emp-role">
                      Designation {requiredMark}
                    </Label>
                    <Select value={formData.designation || undefined} onValueChange={(value) => handleChange("designation", value)}>
                      <SelectTrigger id="emp-role" className={fieldClass}>
                        <SelectValue placeholder="Select designation" />
                      </SelectTrigger>
                      <SelectContent className={selectPanelClass}>
                        {designationOptions.map((item) => (
                          <SelectItem key={item} value={item} className={selectItemClass}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="emp-dept">
                      Department {requiredMark}
                    </Label>
                    <Select value={formData.department || undefined} onValueChange={(value) => handleChange("department", value)}>
                      <SelectTrigger id="emp-dept" className={fieldClass}>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent className={selectPanelClass}>
                        {departmentOptions.map((item) => (
                          <SelectItem key={item} value={item} className={selectItemClass}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="emp-depot">
                      Depot {requiredMark}
                    </Label>
                    <Select value={formData.depot_id || undefined} onValueChange={(value) => handleChange("depot_id", value)}>
                      <SelectTrigger id="emp-depot" className={fieldClass}>
                        <SelectValue placeholder="Select depot" />
                      </SelectTrigger>
                      <SelectContent className={selectPanelClass}>
                        {depots.map((depot) => (
                          <SelectItem key={depot.id} value={String(depot.id)} className={selectItemClass}>
                            {depot.name} ({depot.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="emp-role-master">
                      Role master
                    </Label>
                    <Select value={formData.role_master_id} onValueChange={(value) => handleChange("role_master_id", value)}>
                      <SelectTrigger id="emp-role-master" className={fieldClass}>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent className={selectPanelClass}>
                        <SelectItem value="none" className={selectItemClass}>
                          None
                        </SelectItem>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={String(role.id)} className={selectItemClass}>
                            {role.name} ({role.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    aria-label="Employee status"
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
                  {editTarget ? "Update Employee" : "Create Employee"}
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
                    Delete this employee?
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm text-[#64748B] dark:text-[#A9B8CC]">
                    {deleteTarget ? `${employeeName(deleteTarget)} (${deleteTarget.employee_id}) will be removed.` : ""}
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
              Delete employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ThemeScope>
  );
}
