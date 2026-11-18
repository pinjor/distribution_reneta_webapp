import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Flag,
  ListFilter,
  Minus,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  UserCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

interface CustomerRecord {
  id: number;
  name: string;
  code: string;
  type?: string | null;
  address?: string | null;
  ship_to_party?: string | null;
  sold_to_party?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  email?: string | null;
  priority?: string | null;
  delivery_status_block?: boolean;
  delivery_status_open?: boolean;
  credit_status_cash?: boolean;
  credit_status_credit?: boolean;
  payment_days?: number | null;
  is_active?: boolean;
}

const CUSTOMER_TYPES = ["Retailer", "Chemist shop", "Institution", "Corporate", "Hospital", "Others"];
const PRIORITIES = ["High", "Medium", "Low"];
const PAYMENT_DAYS = ["7", "15", "30", "45"];

const emptyForm = {
  name: "",
  type: "Retailer",
  email: "",
  phone: "",
  city: "",
  state: "",
  address: "",
  ship_to_party: "",
  sold_to_party: "",
  priority: "Medium",
  delivery_status_block: false,
  delivery_status_open: true,
  credit_status_cash: false,
  credit_status_credit: true,
  payment_days: "",
};

function StatusFilterOption({
  icon: Icon,
  label,
  tone,
}: {
  icon: typeof ListFilter;
  label: string;
  tone: "navy" | "green" | "red" | "slate";
}) {
  const toneClass = {
    navy: "bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]",
    green: "bg-[#ECFDF5] text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]",
    red: "bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#3B1212] dark:text-[#FCA5A5]",
    slate: "bg-[#F1F5F9] text-[#475569] dark:bg-[#1B283B] dark:text-[#A9B8CC]",
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

function priorityTone(value?: string | null) {
  if (value === "High") return "bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#3B1212] dark:text-[#FCA5A5]";
  if (value === "Low") return "bg-[#F1F5F9] text-[#475569] dark:bg-[#1B283B] dark:text-[#A9B8CC]";
  return "bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]";
}

export default function Customers() {
  const reduceMotion = useReducedMotion();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomerRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerRecord | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [generatedCode, setGeneratedCode] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [soldToEditedManually, setSoldToEditedManually] = useState(false);

  useEffect(() => {
    document.title = "Customers | Renata";
  }, []);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => asList<CustomerRecord>(await apiEndpoints.customers.getAll()),
  });

  const customers = data || [];

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiEndpoints.customers.create(payload),
    onSuccess: () => {
      toast({ title: "Customer added", description: `${formData.name} has been created.` });
      closeForm();
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      apiEndpoints.customers.update(id, payload),
    onSuccess: () => {
      toast({ title: "Customer updated", description: "Customer information has been updated successfully." });
      closeForm();
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiEndpoints.customers.delete(id),
    onSuccess: () => {
      toast({ title: "Customer deleted", description: "The customer has been removed." });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const formBusy = createMutation.isPending || updateMutation.isPending;

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return customers.filter((customer) => {
      const active = customer.is_active !== false;
      if (statusFilter === "active" && !active) return false;
      if (statusFilter === "inactive" && active) return false;
      if (priorityFilter !== "all" && (customer.priority || "Medium") !== priorityFilter) return false;
      if (!term) return true;
      return [
        customer.name,
        customer.code,
        customer.type,
        customer.email,
        customer.phone,
        customer.city,
        customer.state,
        customer.priority,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [customers, priorityFilter, searchTerm, statusFilter]);

  const totals = useMemo(() => {
    const active = customers.filter((customer) => customer.is_active !== false).length;
    return { total: customers.length, active, inactive: customers.length - active };
  }, [customers]);

  const typeOptions = useMemo(() => {
    if (formData.type && !CUSTOMER_TYPES.includes(formData.type)) {
      return [formData.type, ...CUSTOMER_TYPES];
    }
    return CUSTOMER_TYPES;
  }, [formData.type]);

  const buildPayload = (active: boolean) => ({
    name: formData.name.trim(),
    code: generatedCode,
    type: formData.type || "Retailer",
    address: formData.address.trim() || undefined,
    ship_to_party: formData.ship_to_party.trim() || undefined,
    sold_to_party: formData.sold_to_party.trim() || formData.address.trim() || undefined,
    city: formData.city.trim() || undefined,
    state: formData.state.trim() || undefined,
    phone: formData.phone.trim() || undefined,
    email: formData.email.trim() || undefined,
    priority: formData.priority || "Medium",
    delivery_status_block: formData.delivery_status_block,
    delivery_status_open: formData.delivery_status_open,
    credit_status_cash: formData.credit_status_cash,
    credit_status_credit: formData.credit_status_credit,
    payment_days: formData.payment_days ? Number(formData.payment_days) : undefined,
    is_active: active,
  });

  const openCreate = () => {
    setEditTarget(null);
    setFormData(emptyForm);
    setSoldToEditedManually(false);
    setIsActive(true);
    setGeneratedCode(generateCode("CUST", customers.map((customer) => customer.code)));
    setShowForm(true);
  };

  const openEdit = (customer: CustomerRecord) => {
    setEditTarget(customer);
    setGeneratedCode(customer.code);
    setIsActive(customer.is_active !== false);
    setSoldToEditedManually(Boolean(customer.sold_to_party && customer.sold_to_party !== customer.address));
    setFormData({
      name: customer.name || "",
      type: customer.type || "Retailer",
      email: customer.email || "",
      phone: customer.phone || "",
      city: customer.city || "",
      state: customer.state || "",
      address: customer.address || "",
      ship_to_party: customer.ship_to_party || "",
      sold_to_party: customer.sold_to_party || customer.address || "",
      priority: customer.priority || "Medium",
      delivery_status_block: Boolean(customer.delivery_status_block),
      delivery_status_open: customer.delivery_status_open !== false,
      credit_status_cash: Boolean(customer.credit_status_cash),
      credit_status_credit: customer.credit_status_credit !== false,
      payment_days: customer.payment_days ? String(customer.payment_days) : "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditTarget(null);
    setFormData(emptyForm);
    setGeneratedCode("");
    setIsActive(true);
    setSoldToEditedManually(false);
  };

  const handleChange = (field: keyof typeof emptyForm, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      address: value,
      sold_to_party: soldToEditedManually ? prev.sold_to_party : value,
    }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!formData.name.trim() || formBusy) return;

    if (editTarget) {
      updateMutation.mutate({
        id: editTarget.id,
        payload: buildPayload(isActive),
      });
      return;
    }

    createMutation.mutate(buildPayload(true));
  };

  const columns: DataTableColumn<CustomerRecord>[] = [
    {
      key: "code",
      label: "Code",
      className: "font-mono text-[13px]",
    },
    {
      key: "name",
      label: "Customer",
      render: (val) => <span className="font-medium text-[#0C4DA1] dark:text-[#70ADFF]">{String(val || "—")}</span>,
    },
    {
      key: "type",
      label: "Type",
      render: (val) => String(val || "Retailer"),
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
            {row.state ? <span className="text-[#64748B] dark:text-[#A9B8CC]"> · {row.state}</span> : null}
          </span>
        </div>
      ),
    },
    {
      key: "priority",
      label: "Priority",
      render: (val) => (
        <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", priorityTone(String(val || "Medium")))}>
          {String(val || "Medium")}
        </span>
      ),
    },
    {
      key: "delivery_status_open",
      label: "Delivery",
      render: (_val, row) =>
        row.delivery_status_block ? (
          <span className="inline-flex rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-semibold text-[#B91C1C] dark:bg-[#3B1212] dark:text-[#FCA5A5]">
            Block
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]">
            Open
          </span>
        ),
    },
    {
      key: "credit_status_credit",
      label: "Credit",
      render: (_val, row) =>
        row.credit_status_cash && !row.credit_status_credit ? (
          <span className="inline-flex rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-semibold text-[#475569] dark:bg-[#1B283B] dark:text-[#A9B8CC]">
            Cash
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-[#EAF2FC] px-2 py-0.5 text-[11px] font-semibold text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]">
            Credit
          </span>
        ),
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
            label="Edit customer"
            disabled={formBusy || deleteMutation.isPending}
            onClick={() => openEdit(row)}
            className="text-[#0C4DA1] hover:bg-[#EAF2FC] hover:text-[#0A3F86]"
          >
            <Pencil className="h-4 w-4" />
          </ActionIconButton>
          <ActionIconButton
            label="Delete customer"
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
          <KpiCard title="Customers" value={totals.total} icon={UserCheck} accent="blue" />
          <KpiCard title="Active" value={totals.active} icon={CheckCircle2} accent="green" />
          <KpiCard title="Inactive" value={totals.inactive} icon={XCircle} accent="purple" />
        </motion.div>

        <motion.div {...motionProps} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DataTable
            className="min-h-0 min-w-0 flex-1 overflow-hidden"
            title="Customer Master"
            description="Manage customer accounts, contracts, and relationships."
            toolbarIcon={<UserCheck className="h-4 w-4" />}
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: "Search customers...",
            }}
            toolbarFilters={
              <div className="flex flex-wrap items-center gap-2">
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
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className={cn("h-9 w-[180px]", fieldClass)} aria-label="Priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={selectPanelClass}>
                    <SelectItem value="all" className={selectItemClass}>
                      <StatusFilterOption icon={Flag} label="All Priority" tone="navy" />
                    </SelectItem>
                    <SelectItem value="High" className={selectItemClass}>
                      <StatusFilterOption icon={ArrowUp} label="High" tone="red" />
                    </SelectItem>
                    <SelectItem value="Medium" className={selectItemClass}>
                      <StatusFilterOption icon={Minus} label="Medium" tone="navy" />
                    </SelectItem>
                    <SelectItem value="Low" className={selectItemClass}>
                      <StatusFilterOption icon={ArrowDown} label="Low" tone="slate" />
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
            toolbarActions={
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="ntSecondary" className="!h-8" onClick={() => refetch()} disabled={isFetching}>
                  {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Refresh
                </Button>
                <Button type="button" variant="ntPrimary" className="!h-8" onClick={openCreate}>
                  <Plus className="h-3.5 w-3.5" />
                  New Customer
                </Button>
              </div>
            }
            data={filtered}
            columns={columns}
            loading={isLoading}
            error={isError ? (error instanceof Error ? error.message : "Unable to load customers") : undefined}
            getRowId={(row) => row.id}
            resetPageKey={`${statusFilter}|${priorityFilter}|${searchTerm}|${filtered.length}`}
            emptyMessage="No customers found"
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
                <UserCheck className="h-4 w-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                  {editTarget ? "Edit Customer" : "Add Customer"}
                </DialogTitle>
                <DialogDescription className="text-sm text-[#64748B] dark:text-[#A9B8CC]">
                  {editTarget ? "Update customer information." : "Create a new customer account."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="nt-form nt-form-compact min-h-0 flex-1 overflow-y-auto px-5 py-3">
              <section>
                <h3 className="mb-2 text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">Customer details</h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Customer code</Label>
                    <Input value={generatedCode} disabled className={cn(fieldClass, "font-mono")} />
                    <p className="text-[11px] text-[#64748B]">Auto-generated and cannot be changed</p>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="cust-name">
                      Customer name {requiredMark}
                    </Label>
                    <Input
                      id="cust-name"
                      value={formData.name}
                      onChange={(event) => handleChange("name", event.target.value)}
                      placeholder="Customer name"
                      required
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="cust-type">
                      Customer type
                    </Label>
                    <Select value={formData.type} onValueChange={(value) => handleChange("type", value)}>
                      <SelectTrigger id="cust-type" className={fieldClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={selectPanelClass}>
                        {typeOptions.map((item) => (
                          <SelectItem key={item} value={item} className={selectItemClass}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="cust-priority">
                      Priority
                    </Label>
                    <Select value={formData.priority} onValueChange={(value) => handleChange("priority", value)}>
                      <SelectTrigger id="cust-priority" className={fieldClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={selectPanelClass}>
                        {PRIORITIES.map((item) => (
                          <SelectItem key={item} value={item} className={selectItemClass}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="cust-email">
                      Email
                    </Label>
                    <Input
                      id="cust-email"
                      type="email"
                      value={formData.email}
                      onChange={(event) => handleChange("email", event.target.value)}
                      placeholder="contact@customer.com"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="cust-phone">
                      Phone
                    </Label>
                    <Input
                      id="cust-phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(event) => handleChange("phone", event.target.value)}
                      placeholder="+880 ..."
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="cust-city">
                      City
                    </Label>
                    <Input
                      id="cust-city"
                      value={formData.city}
                      onChange={(event) => handleChange("city", event.target.value)}
                      placeholder="City"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="cust-state">
                      State
                    </Label>
                    <Input
                      id="cust-state"
                      value={formData.state}
                      onChange={(event) => handleChange("state", event.target.value)}
                      placeholder="State"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="cust-ship">
                      Ship to party
                    </Label>
                    <Input
                      id="cust-ship"
                      value={formData.ship_to_party}
                      onChange={(event) => handleChange("ship_to_party", event.target.value)}
                      placeholder="Delivery address"
                      className={fieldClass}
                    />
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass} htmlFor="cust-sold">
                      Sold to party
                    </Label>
                    <Input
                      id="cust-sold"
                      value={formData.sold_to_party}
                      onChange={(event) => {
                        setSoldToEditedManually(true);
                        handleChange("sold_to_party", event.target.value);
                      }}
                      placeholder="Defaults to customer address"
                      className={fieldClass}
                    />
                  </div>
                </div>
                <div className={`${fieldWrapClass} mt-2.5`}>
                  <Label className={labelClass} htmlFor="cust-address">
                    Address
                  </Label>
                  <Textarea
                    id="cust-address"
                    value={formData.address}
                    onChange={(event) => handleAddressChange(event.target.value)}
                    placeholder="Street address"
                    rows={2}
                    className="min-h-[64px] rounded-lg border border-[#CBD5E1] text-[13px] shadow-none focus-visible:border-[#0C4DA1] focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/20 dark:border-[#2C3B50] dark:bg-[#151F30]"
                  />
                </div>
              </section>

              <section className="mt-3">
                <h3 className="mb-2 text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">Preferences</h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Delivery status</Label>
                    <div className="flex h-10 items-center gap-4 rounded-lg border border-[#CBD5E1] px-3 dark:border-[#2C3B50]">
                      <label className="flex items-center gap-2 text-[13px]">
                        <Checkbox
                          checked={formData.delivery_status_open}
                          onCheckedChange={(checked) => handleChange("delivery_status_open", checked === true)}
                        />
                        Open
                      </label>
                      <label className="flex items-center gap-2 text-[13px]">
                        <Checkbox
                          checked={formData.delivery_status_block}
                          onCheckedChange={(checked) => handleChange("delivery_status_block", checked === true)}
                        />
                        Block
                      </label>
                    </div>
                  </div>
                  <div className={fieldWrapClass}>
                    <Label className={labelClass}>Credit status</Label>
                    <div className="flex h-10 items-center gap-4 rounded-lg border border-[#CBD5E1] px-3 dark:border-[#2C3B50]">
                      <label className="flex items-center gap-2 text-[13px]">
                        <Checkbox
                          checked={formData.credit_status_cash}
                          onCheckedChange={(checked) => {
                            handleChange("credit_status_cash", checked === true);
                            if (checked === true) handleChange("credit_status_credit", false);
                          }}
                        />
                        Cash
                      </label>
                      <label className="flex items-center gap-2 text-[13px]">
                        <Checkbox
                          checked={formData.credit_status_credit}
                          onCheckedChange={(checked) => {
                            handleChange("credit_status_credit", checked === true);
                            if (checked === true) handleChange("credit_status_cash", false);
                          }}
                        />
                        Credit
                      </label>
                    </div>
                  </div>
                  <div className={`${fieldWrapClass} sm:col-span-2`}>
                    <Label className={labelClass}>Payment days</Label>
                    <RadioGroup
                      value={formData.payment_days}
                      onValueChange={(value) => handleChange("payment_days", value)}
                      className="flex flex-wrap gap-4 pt-1"
                    >
                      {PAYMENT_DAYS.map((days) => (
                        <div key={days} className="flex items-center gap-2">
                          <RadioGroupItem value={days} id={`days-${days}`} />
                          <Label htmlFor={`days-${days}`} className="cursor-pointer font-normal">
                            {days} days
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
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
                    aria-label="Customer status"
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
                  {editTarget ? "Update Customer" : "Create Customer"}
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
                    Delete this customer?
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
              Delete customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ThemeScope>
  );
}
