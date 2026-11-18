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
  Trash2,
  Users,
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

type RoleType = "NSH" | "TSM" | "RSM" | "DSM" | "SM" | "SO";

interface RoleRecord {
  id: number;
  code: string;
  role_type: RoleType;
  name: string;
  parent_id?: number | null;
  parent_name?: string | null;
  employee_id?: number | null;
  employee_name?: string | null;
  territory?: string | null;
  region?: string | null;
  district?: string | null;
  area?: string | null;
  description?: string | null;
  is_active: boolean;
}

interface EmployeeOption {
  id: number;
  employee_id: string;
  first_name: string;
  last_name?: string | null;
}

const ROLE_TYPES: RoleType[] = ["NSH", "TSM", "RSM", "DSM", "SM", "SO"];
const ROLE_LABELS: Record<RoleType, string> = {
  NSH: "National Sales Head",
  TSM: "Territory Sales Manager",
  RSM: "Regional Sales Manager",
  DSM: "District Sales Manager",
  SM: "Sales Manager",
  SO: "Sales Officer",
};
const PARENT_ROLE_TYPES: Record<RoleType, RoleType[] | null> = {
  NSH: null,
  TSM: ["NSH"],
  RSM: ["TSM"],
  DSM: ["RSM"],
  SM: ["DSM"],
  SO: ["SM"],
};

const emptyForm = {
  role_type: "",
  name: "",
  parent_id: "none",
  employee_id: "none",
  territory: "",
  region: "",
  district: "",
  area: "",
  description: "",
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

function employeeLabel(employee: EmployeeOption) {
  return `${employee.first_name || ""} ${employee.last_name || ""} (${employee.employee_id || "N/A"})`.trim();
}

export default function RoleMaster() {
  const reduceMotion = useReducedMotion();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<RoleRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleRecord | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [generatedCode, setGeneratedCode] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    document.title = "Role Master | Renata";
  }, []);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["role-masters", { include_inactive: true }],
    queryFn: async () => asList<RoleRecord>(await apiEndpoints.roleMasters.getAll({ include_inactive: true })),
  });

  const { data: employeesData } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => asList<EmployeeOption>(await apiEndpoints.employees.getAll()),
  });

  const roles = data || [];
  const employees = employeesData || [];

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiEndpoints.roleMasters.create(payload),
    onSuccess: () => {
      toast({ title: "Role Master added", description: `New Role Master created with code ${generatedCode}.` });
      closeForm();
      queryClient.invalidateQueries({ queryKey: ["role-masters"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      apiEndpoints.roleMasters.update(id, payload),
    onSuccess: () => {
      toast({ title: "Role Master updated", description: "Role Master information has been updated successfully." });
      closeForm();
      queryClient.invalidateQueries({ queryKey: ["role-masters"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiEndpoints.roleMasters.delete(id),
    onSuccess: () => {
      toast({ title: "Role Master deleted", description: "The Role Master has been removed." });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["role-masters"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const formBusy = createMutation.isPending || updateMutation.isPending;
  const selectedRoleType = (formData.role_type || "") as RoleType | "";
  const showParent = selectedRoleType !== "" && selectedRoleType !== "NSH";
  const parentTypes = selectedRoleType ? PARENT_ROLE_TYPES[selectedRoleType] : null;

  const parentRoles = useMemo(() => {
    if (!parentTypes) return [];
    const filtered = roles.filter((role) => parentTypes.includes(role.role_type) && role.id !== editTarget?.id);
    const currentParent = roles.find((role) => role.id === Number(formData.parent_id));
    if (currentParent && !filtered.some((role) => role.id === currentParent.id)) {
      return [currentParent, ...filtered];
    }
    return filtered;
  }, [editTarget?.id, formData.parent_id, parentTypes, roles]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return roles.filter((role) => {
      if (statusFilter === "active" && !role.is_active) return false;
      if (statusFilter === "inactive" && role.is_active) return false;
      if (!term) return true;
      return [role.code, role.name, role.role_type, ROLE_LABELS[role.role_type], role.parent_name, role.employee_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [roles, searchTerm, statusFilter]);

  const totals = useMemo(() => {
    const active = roles.filter((role) => role.is_active).length;
    return { total: roles.length, active, inactive: roles.length - active };
  }, [roles]);

  const openCreate = () => {
    setEditTarget(null);
    setFormData(emptyForm);
    setIsActive(true);
    setGeneratedCode(generateCode("RM", roles.map((role) => role.code)));
    setShowForm(true);
  };

  const openEdit = (role: RoleRecord) => {
    setEditTarget(role);
    setGeneratedCode(role.code);
    setIsActive(role.is_active !== false);
    setFormData({
      role_type: role.role_type || "",
      name: role.name || "",
      parent_id: role.parent_id ? String(role.parent_id) : "none",
      employee_id: role.employee_id ? String(role.employee_id) : "none",
      territory: role.territory || "",
      region: role.region || "",
      district: role.district || "",
      area: role.area || "",
      description: role.description || "",
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
    setFormData((prev) => {
      if (field === "role_type") {
        return { ...prev, role_type: value, parent_id: "none" };
      }
      return { ...prev, [field]: value };
    });
  };

  const canSubmit =
    Boolean(formData.role_type && formData.name.trim()) &&
    (formData.role_type === "NSH" || (formData.parent_id && formData.parent_id !== "none"));

  const buildPayload = () => ({
    code: generatedCode,
    role_type: formData.role_type,
    name: formData.name.trim(),
    parent_id: formData.parent_id && formData.parent_id !== "none" ? Number(formData.parent_id) : null,
    employee_id: formData.employee_id && formData.employee_id !== "none" ? Number(formData.employee_id) : null,
    territory: formData.territory.trim() || null,
    region: formData.region.trim() || null,
    district: formData.district.trim() || null,
    area: formData.area.trim() || null,
    description: formData.description.trim() || null,
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

  const columns: DataTableColumn<RoleRecord>[] = [
    {
      key: "code",
      label: "Code",
      className: "font-mono text-[13px]",
    },
    {
      key: "role_type",
      label: "Role Type",
      render: (val) => (
        <span className="inline-flex rounded-full bg-[#EAF2FC] px-2 py-0.5 text-[11px] font-semibold text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]">
          {ROLE_LABELS[val as RoleType] || String(val || "—")}
        </span>
      ),
    },
    {
      key: "name",
      label: "Name",
      render: (val) => <span className="font-medium text-[#0C4DA1] dark:text-[#70ADFF]">{String(val || "—")}</span>,
    },
    {
      key: "parent_name",
      label: "Parent",
      render: (val) => String(val || "—"),
    },
    {
      key: "employee_name",
      label: "Employee",
      render: (val) => String(val || "—"),
    },
    {
      key: "territory",
      label: "Territory",
      render: (val) => String(val || "—"),
    },
    {
      key: "region",
      label: "Region",
      render: (val) => String(val || "—"),
    },
    {
      key: "district",
      label: "District",
      render: (val) => String(val || "—"),
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
            label="Edit role"
            disabled={formBusy || deleteMutation.isPending}
            onClick={() => openEdit(row)}
            className="text-[#0C4DA1] hover:bg-[#EAF2FC] hover:text-[#0A3F86]"
          >
            <Pencil className="h-4 w-4" />
          </ActionIconButton>
          <ActionIconButton
            label="Delete role"
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
          <KpiCard title="Roles" value={totals.total} icon={Users} accent="blue" />
          <KpiCard title="Active" value={totals.active} icon={CheckCircle2} accent="green" />
          <KpiCard title="Inactive" value={totals.inactive} icon={XCircle} accent="purple" />
        </motion.div>

        <motion.div {...motionProps} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DataTable
            className="min-h-0 min-w-0 flex-1 overflow-hidden"
            title="Role Master Catalog"
            description="Manage hierarchical roles: NSH → TSM → RSM → DSM → SM → SO."
            toolbarIcon={<Users className="h-4 w-4" />}
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: "Search Role Masters...",
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
                  Add Role
                </Button>
              </div>
            }
            data={filtered}
            columns={columns}
            loading={isLoading}
            error={isError ? (error instanceof Error ? error.message : "Unable to load role masters") : undefined}
            getRowId={(row) => row.id}
            resetPageKey={`${statusFilter}|${searchTerm}|${filtered.length}`}
            emptyMessage="No Role Masters found"
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
                <Users className="h-4 w-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                  {editTarget ? "Edit Role Master" : "Add New Role Master"}
                </DialogTitle>
                <DialogDescription className="text-sm text-[#64748B] dark:text-[#A9B8CC]">
                  {editTarget
                    ? "Update role, parent, and assignment information."
                    : "Create a role in the NSH → TSM → RSM → DSM → SM → SO hierarchy."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="nt-form nt-form-compact min-h-0 flex-1 overflow-y-auto px-5 py-3">
              <section>
                <h3 className="mb-2 text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">Role details</h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="role-code">
                      Code {requiredMark}
                    </Label>
                    <Input id="role-code" value={generatedCode} disabled className={cn(fieldClass, "font-mono")} />
                    <p className="text-[11px] text-[#64748B]">Auto-generated code (cannot be changed)</p>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="role-type">
                      Role type {requiredMark}
                    </Label>
                    <Select value={formData.role_type || undefined} onValueChange={(value) => handleChange("role_type", value)}>
                      <SelectTrigger id="role-type" className={fieldClass}>
                        <SelectValue placeholder="Select role type" />
                      </SelectTrigger>
                      <SelectContent className={selectPanelClass}>
                        {ROLE_TYPES.map((type) => (
                          <SelectItem key={type} value={type} className={selectItemClass}>
                            {ROLE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={`${fieldWrapClass} sm:col-span-2`}>
                    <Label className={labelClass} htmlFor="role-name">
                      Name {requiredMark}
                    </Label>
                    <Input
                      id="role-name"
                      value={formData.name}
                      onChange={(event) => handleChange("name", event.target.value)}
                      placeholder="Enter role name (e.g., North Zone Sales Head)"
                      className={fieldClass}
                    />
                  </div>
                  {showParent && (
                    <div className={`${fieldWrapClass} sm:col-span-2`}>
                      <Label className={labelClass} htmlFor="role-parent">
                        Parent role {requiredMark}
                      </Label>
                      <Select value={formData.parent_id || "none"} onValueChange={(value) => handleChange("parent_id", value)}>
                        <SelectTrigger id="role-parent" className={fieldClass}>
                          <SelectValue placeholder="Select parent role" />
                        </SelectTrigger>
                        <SelectContent className={selectPanelClass}>
                          <SelectItem value="none" className={selectItemClass}>
                            None
                          </SelectItem>
                          {parentRoles.map((role) => (
                            <SelectItem key={role.id} value={String(role.id)} className={selectItemClass}>
                              {role.name} ({role.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {parentRoles.length === 0 && selectedRoleType && (
                        <p className="text-[11px] text-[#64748B]">
                          No {parentTypes?.[0]} roles available. Create parent roles first.
                        </p>
                      )}
                    </div>
                  )}
                  <div className={`${fieldWrapClass} sm:col-span-2`}>
                    <Label className={labelClass} htmlFor="role-employee">
                      Assigned employee
                    </Label>
                    <Select value={formData.employee_id || "none"} onValueChange={(value) => handleChange("employee_id", value)}>
                      <SelectTrigger id="role-employee" className={fieldClass}>
                        <SelectValue placeholder="Select employee (optional)" />
                      </SelectTrigger>
                      <SelectContent className={selectPanelClass}>
                        <SelectItem value="none" className={selectItemClass}>
                          None
                        </SelectItem>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={String(employee.id)} className={selectItemClass}>
                            {employeeLabel(employee)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedRoleType === "TSM" && (
                    <div className={`${fieldWrapClass} sm:col-span-2`}>
                      <Label className={labelClass} htmlFor="role-territory">
                        Territory
                      </Label>
                      <Input
                        id="role-territory"
                        value={formData.territory}
                        onChange={(event) => handleChange("territory", event.target.value)}
                        placeholder="Enter territory name"
                        className={fieldClass}
                      />
                    </div>
                  )}
                  {selectedRoleType === "RSM" && (
                    <div className={`${fieldWrapClass} sm:col-span-2`}>
                      <Label className={labelClass} htmlFor="role-region">
                        Region
                      </Label>
                      <Input
                        id="role-region"
                        value={formData.region}
                        onChange={(event) => handleChange("region", event.target.value)}
                        placeholder="Enter region name"
                        className={fieldClass}
                      />
                    </div>
                  )}
                  {selectedRoleType === "DSM" && (
                    <div className={`${fieldWrapClass} sm:col-span-2`}>
                      <Label className={labelClass} htmlFor="role-district">
                        District
                      </Label>
                      <Input
                        id="role-district"
                        value={formData.district}
                        onChange={(event) => handleChange("district", event.target.value)}
                        placeholder="Enter district name"
                        className={fieldClass}
                      />
                    </div>
                  )}
                  {selectedRoleType === "SM" && (
                    <div className={`${fieldWrapClass} sm:col-span-2`}>
                      <Label className={labelClass} htmlFor="role-area">
                        Area
                      </Label>
                      <Input
                        id="role-area"
                        value={formData.area}
                        onChange={(event) => handleChange("area", event.target.value)}
                        placeholder="Enter area name"
                        className={fieldClass}
                      />
                    </div>
                  )}
                  <div className={`${fieldWrapClass} sm:col-span-2`}>
                    <Label className={labelClass} htmlFor="role-description">
                      Description
                    </Label>
                    <Textarea
                      id="role-description"
                      value={formData.description}
                      onChange={(event) => handleChange("description", event.target.value)}
                      placeholder="Enter description (optional)"
                      rows={3}
                      className={cn(fieldClass, "h-auto min-h-[72px] py-2")}
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
                    aria-label="Role status"
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
                  {editTarget ? "Update Role" : "Create Role"}
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
                    Delete this role?
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
            Roles with subordinates cannot be deleted until those roles are reassigned.
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
              Delete role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ThemeScope>
  );
}
