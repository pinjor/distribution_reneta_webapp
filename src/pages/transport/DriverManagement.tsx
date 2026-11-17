import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { TransportQuickNav } from "@/components/transport/TransportQuickNav";
import {
  ActionIconButton,
  asList,
  dialogContentClass,
  fieldClass,
  fieldWrapClass,
  KpiCard,
  labelClass,
  requiredMark,
  sectionMotion,
  selectItemClass,
  selectPanelClass,
  StatusPill,
} from "@/components/transport/transportUi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { useTableSort } from "@/hooks/useTableSort";

const driverSchema = z.object({
  driver_id: z.string().min(1, "Driver ID is required"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().optional(),
  license_number: z.string().min(1, "License number is required"),
  license_expiry: z.string().optional(),
  contact: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  status: z.string().default("Available"),
});

type DriverFormData = z.infer<typeof driverSchema>;

interface TransportDriver {
  id: number;
  driver_id: string;
  first_name?: string;
  last_name?: string;
  license_number?: string;
  license_expiry?: string;
  contact?: string;
  email?: string;
  address?: string;
  status?: string;
}

export default function DriverManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<TransportDriver | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: driversResponse = [], isLoading } = useQuery({
    queryKey: ["transport", "drivers"],
    queryFn: () => apiEndpoints.transport.drivers.getAll(),
  });

  const drivers = asList<TransportDriver>(driversResponse);

  const form = useForm<DriverFormData>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      driver_id: "",
      first_name: "",
      last_name: "",
      license_number: "",
      license_expiry: "",
      contact: "",
      email: "",
      address: "",
      status: "Available",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: DriverFormData) => apiEndpoints.transport.drivers.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transport", "drivers"] });
      toast({ title: "Success", description: "Driver created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create driver",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: DriverFormData }) =>
      apiEndpoints.transport.drivers.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transport", "drivers"] });
      toast({ title: "Success", description: "Driver updated successfully" });
      setIsDialogOpen(false);
      setEditingDriver(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update driver",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiEndpoints.transport.drivers.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transport", "drivers"] });
      toast({ title: "Success", description: "Driver deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete driver",
        variant: "destructive",
      });
    },
  });

  const openAddDialog = () => {
    setEditingDriver(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const handleEdit = (driver: TransportDriver) => {
    setEditingDriver(driver);
    form.reset({
      driver_id: driver.driver_id,
      first_name: driver.first_name,
      last_name: driver.last_name || "",
      license_number: driver.license_number,
      license_expiry: driver.license_expiry || "",
      contact: driver.contact || "",
      email: driver.email || "",
      address: driver.address || "",
      status: driver.status || "Available",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this driver?")) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: DriverFormData) => {
    const submitData = {
      ...data,
      email: data.email === "" ? undefined : data.email,
      license_expiry: data.license_expiry === "" ? undefined : data.license_expiry,
    };

    if (editingDriver) {
      updateMutation.mutate({ id: editingDriver.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const filteredDrivers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return drivers;
    return drivers.filter((driver) =>
      [driver.driver_id, driver.first_name, driver.last_name, driver.license_number, driver.contact, driver.email, driver.status]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(term)),
    );
  }, [drivers, searchTerm]);

  const tableRows = filteredDrivers.map((driver) => ({
    ...driver,
    name: `${driver.first_name || ""} ${driver.last_name || ""}`.trim() || "—",
  }));

  const { sortedData, sortKey, sortOrder, handleSort } = useTableSort(tableRows, "driver_id");
  const motionProps = sectionMotion(reduceMotion);
  const saving = createMutation.isPending || updateMutation.isPending;

  const columns: DataTableColumn<(typeof tableRows)[number]>[] = [
    {
      key: "driver_id",
      label: "Driver ID",
      sortable: true,
      render: (val) => <span className="font-medium text-[#172B4D] dark:text-[#F1F5F9]">{String(val || "—")}</span>,
    },
    { key: "name", label: "Name", sortable: true, render: (val) => String(val || "—") },
    { key: "license_number", label: "License Number", sortable: true, render: (val) => String(val || "—") },
    { key: "contact", label: "Contact", sortable: true, render: (val) => String(val || "-") },
    { key: "email", label: "Email", sortable: true, render: (val) => String(val || "-") },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (val) => <StatusPill value={String(val || "—")} active={String(val) === "Available"} />,
    },
    {
      key: "id",
      label: "Actions",
      align: "right",
      headerClassName: "text-right",
      render: (_val, row) => (
        <div className="flex justify-end gap-0.5">
          <ActionIconButton
            label="Edit driver"
            onClick={() => handleEdit(row)}
            className="text-[#475569] hover:bg-[#EAF2FC] hover:text-[#0C4DA1]"
          >
            <Pencil className="h-4 w-4" />
          </ActionIconButton>
          <ActionIconButton
            label="Delete driver"
            onClick={() => handleDelete(row.id)}
            disabled={deleteMutation.isPending}
            className="text-[#94A3B8] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
          >
            <Trash2 className="h-4 w-4" />
          </ActionIconButton>
        </div>
      ),
    },
  ];

  return (
    <ThemeScope className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-x-hidden">
        <motion.div {...motionProps} className="shrink-0">
          <TransportQuickNav />
        </motion.div>

        <motion.div {...motionProps} className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard title="Total Drivers" value={drivers.length} icon={Users} accent="blue" />
          <KpiCard
            title="Available"
            value={drivers.filter((d) => d.status === "Available").length}
            icon={Users}
            accent="green"
          />
          <KpiCard
            title="On Trip"
            value={drivers.filter((d) => d.status === "On Trip").length}
            icon={Users}
            accent="purple"
          />
        </motion.div>

        <motion.div {...motionProps} className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DataTable
            className="min-h-0 min-w-0 flex-1 overflow-hidden"
            title="Drivers"
            description="List of all drivers in the system"
            toolbarIcon={<Users className="h-4 w-4" />}
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: "Search drivers...",
            }}
            toolbarActions={
              <Button type="button" variant="ntPrimary" className="!h-8" onClick={openAddDialog} aria-label="Add Driver">
                <Plus className="h-3.5 w-3.5" />
                Add Driver
              </Button>
            }
            data={sortedData}
            columns={columns}
            loading={isLoading}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={handleSort}
            getRowId={(row) => row.id}
            resetPageKey={`${searchTerm}|${String(sortKey ?? "")}|${sortOrder}|${sortedData.length}`}
            emptyMessage={searchTerm ? "No drivers found matching your search." : "No drivers found"}
          />
        </motion.div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={dialogContentClass}>
          <DialogHeader className="shrink-0 space-y-0.5 border-b border-[#E3EAF3] px-5 py-3 text-left dark:border-[#2C3B50]">
            <div className="flex items-start gap-3 pr-6">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]">
                <Users className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                  {editingDriver ? "Edit driver" : "Add driver"}
                </DialogTitle>
                <DialogDescription className="text-sm text-[#64748B] dark:text-[#A9B8CC]">
                  {editingDriver ? "Update driver information" : "Enter driver details"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
              <div className="nt-form nt-form-compact min-h-0 flex-1 overflow-y-auto px-5 py-3">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="driver_id"
                    render={({ field }) => (
                      <FormItem className={fieldWrapClass}>
                        <FormLabel className={labelClass}>Driver ID {requiredMark}</FormLabel>
                        <FormControl>
                          <Input className={fieldClass} {...field} disabled={!!editingDriver} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="license_number"
                    render={({ field }) => (
                      <FormItem className={fieldWrapClass}>
                        <FormLabel className={labelClass}>License Number {requiredMark}</FormLabel>
                        <FormControl>
                          <Input className={fieldClass} {...field} disabled={!!editingDriver} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem className={fieldWrapClass}>
                        <FormLabel className={labelClass}>First Name {requiredMark}</FormLabel>
                        <FormControl>
                          <Input className={fieldClass} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem className={fieldWrapClass}>
                        <FormLabel className={labelClass}>Last Name</FormLabel>
                        <FormControl>
                          <Input className={fieldClass} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contact"
                    render={({ field }) => (
                      <FormItem className={fieldWrapClass}>
                        <FormLabel className={labelClass}>Contact</FormLabel>
                        <FormControl>
                          <Input className={fieldClass} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className={fieldWrapClass}>
                        <FormLabel className={labelClass}>Email</FormLabel>
                        <FormControl>
                          <Input type="email" className={fieldClass} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="license_expiry"
                    render={({ field }) => (
                      <FormItem className={fieldWrapClass}>
                        <FormLabel className={labelClass}>License Expiry</FormLabel>
                        <FormControl>
                          <Input type="date" className={fieldClass} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem className={fieldWrapClass}>
                        <FormLabel className={labelClass}>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className={fieldClass}>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className={selectPanelClass}>
                            <SelectItem value="Available" className={selectItemClass}>Available</SelectItem>
                            <SelectItem value="On Route" className={selectItemClass}>On Route</SelectItem>
                            <SelectItem value="Off Duty" className={selectItemClass}>Off Duty</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className={`${fieldWrapClass} sm:col-span-2`}>
                        <FormLabel className={labelClass}>Address</FormLabel>
                        <FormControl>
                          <Textarea className={fieldClass} rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <DialogFooter className="shrink-0 gap-2 border-t border-[#E3EAF3] px-5 py-3 dark:border-[#2C3B50]">
                <Button
                  type="button"
                  variant="ntSecondary"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingDriver(null);
                    form.reset();
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="ntPrimary" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingDriver ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </ThemeScope>
  );
}
