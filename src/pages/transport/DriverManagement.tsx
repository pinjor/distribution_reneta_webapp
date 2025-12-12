import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Users, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";

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

export default function DriverManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ["transport", "drivers"],
    queryFn: () => apiEndpoints.transport.drivers.getAll(),
  });

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
    mutationFn: (data: any) => apiEndpoints.transport.drivers.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transport", "drivers"] });
      toast({ title: "Success", description: "Driver created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create driver",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiEndpoints.transport.drivers.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transport", "drivers"] });
      toast({ title: "Success", description: "Driver updated successfully" });
      setIsDialogOpen(false);
      setEditingDriver(null);
      form.reset();
    },
    onError: (error: any) => {
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
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete driver",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (driver: any) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Driver Management</h1>
          <p className="text-muted-foreground">Manage your fleet drivers</p>
        </div>
        <Button onClick={() => {
          setEditingDriver(null);
          form.reset();
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Driver
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Drivers</CardTitle>
          <CardDescription>List of all drivers in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>License Number</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No drivers found
                  </TableCell>
                </TableRow>
              ) : (
                drivers.map((driver: any) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.driver_id}</TableCell>
                    <TableCell>
                      {driver.first_name} {driver.last_name || ""}
                    </TableCell>
                    <TableCell>{driver.license_number}</TableCell>
                    <TableCell>{driver.contact || "-"}</TableCell>
                    <TableCell>{driver.email || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={driver.status === "Available" ? "default" : "secondary"}>
                        {driver.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(driver)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(driver.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDriver ? "Edit Driver" : "Add New Driver"}</DialogTitle>
            <DialogDescription>
              {editingDriver ? "Update driver information" : "Add a new driver to the system"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="driver_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Driver ID *</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!!editingDriver} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="license_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Number *</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!!editingDriver} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="license_expiry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Expiry</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        >
                          <option value="Available">Available</option>
                          <option value="On Route">On Route</option>
                          <option value="Off Duty">Off Duty</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingDriver(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingDriver ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

