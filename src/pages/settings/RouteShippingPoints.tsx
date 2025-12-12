import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MapPin, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";

const routeShippingPointSchema = z.object({
  route_id: z.number().positive("Route is required"),
  shipping_point_id: z.number().positive("Shipping point is required"),
  distance_km: z.number().positive("Distance must be positive"),
  sequence: z.number().int().positive("Sequence must be a positive integer"),
});

type RouteShippingPointFormData = z.infer<typeof routeShippingPointSchema>;

export default function RouteShippingPoints() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const { data: routeShippingPoints = [], isLoading } = useQuery({
    queryKey: ["route-shipping-points"],
    queryFn: async () => {
      const response = await apiEndpoints.routeShippingPoints.getAll();
      return response;
    },
  });

  const { data: routes = [] } = useQuery({
    queryKey: ["routes"],
    queryFn: apiEndpoints.routes.getAll,
  });

  const { data: shippingPoints = [] } = useQuery({
    queryKey: ["shipping-points"],
    queryFn: apiEndpoints.shippingPoints.getAll,
  });

  const form = useForm<RouteShippingPointFormData>({
    resolver: zodResolver(routeShippingPointSchema),
    defaultValues: {
      route_id: undefined as any,
      shipping_point_id: undefined as any,
      distance_km: 0,
      sequence: 1,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: RouteShippingPointFormData) =>
      apiEndpoints.routeShippingPoints.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["route-shipping-points"] });
      toast({ title: "Success", description: "Route shipping point added successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add route shipping point",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiEndpoints.routeShippingPoints.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["route-shipping-points"] });
      toast({ title: "Success", description: "Route shipping point updated successfully" });
      setIsDialogOpen(false);
      setEditingItem(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update route shipping point",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiEndpoints.routeShippingPoints.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["route-shipping-points"] });
      toast({ title: "Success", description: "Route shipping point deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete route shipping point",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RouteShippingPointFormData) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    form.reset({
      route_id: item.route_id,
      shipping_point_id: item.shipping_point_id,
      distance_km: item.distance_km,
      sequence: item.sequence,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this route shipping point?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.reset({
      route_id: undefined as any,
      shipping_point_id: undefined as any,
      distance_km: 0,
      sequence: 1,
    });
    setIsDialogOpen(true);
  };

  // Group by route for better display
  const groupedByRoute = routeShippingPoints.reduce((acc: any, item: any) => {
    const routeId = item.route_id;
    if (!acc[routeId]) {
      acc[routeId] = [];
    }
    acc[routeId].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Route Shipping Points</h1>
          <p className="text-muted-foreground">
            Manage shipping points for routes with distance tracking
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Shipping Point to Route
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {Object.keys(groupedByRoute).length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  No route shipping points found. Add one to get started.
                </div>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedByRoute).map(([routeId, items]: [string, any]) => {
              const route = routes.find((r: any) => r.id === parseInt(routeId));
              return (
                <Card key={routeId}>
                  <CardHeader>
                    <CardTitle>
                      {route?.name || route?.route_id || `Route ${routeId}`}
                    </CardTitle>
                    <CardDescription>
                      {items.length} shipping point{items.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sequence</TableHead>
                          <TableHead>Shipping Point</TableHead>
                          <TableHead>Distance (km)</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items
                          .sort((a: any, b: any) => a.sequence - b.sequence)
                          .map((item: any) => {
                            const shippingPoint = shippingPoints.find(
                              (sp: any) => sp.id === item.shipping_point_id
                            );
                            return (
                              <TableRow key={item.id}>
                                <TableCell>{item.sequence}</TableCell>
                                <TableCell>
                                  {shippingPoint?.name || `Shipping Point ${item.shipping_point_id}`}
                                </TableCell>
                                <TableCell>{item.distance_km} km</TableCell>
                                <TableCell>
                                  <Badge variant={item.is_active ? "default" : "secondary"}>
                                    {item.is_active ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEdit(item)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDelete(item.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Route Shipping Point" : "Add Shipping Point to Route"}
            </DialogTitle>
            <DialogDescription>
              Link a shipping point to a route with distance information
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="route_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Route *</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a route" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {routes.map((route: any) => (
                          <SelectItem key={route.id} value={route.id.toString()}>
                            {route.name} ({route.route_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shipping_point_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipping Point *</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a shipping point" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {shippingPoints.map((sp: any) => (
                          <SelectItem key={sp.id} value={sp.id.toString()}>
                            {sp.name} ({sp.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="distance_km"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distance (km) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sequence"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sequence *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {editingItem ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

