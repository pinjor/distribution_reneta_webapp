import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Receipt, Plus, Edit, Trash2, Loader2, Calculator, Truck, User, MapPin, DollarSign, Filter, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";
import { TripExpenseItem } from "./TripExpenseItem";

const expenseSchema = z.object({
  trip_number: z.string().min(1, "Trip number is required"),
  expense_type: z.string().min(1, "Expense type is required"),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().optional(),
  expense_date: z.string().min(1, "Expense date is required"),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

export default function ExpenseManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [autoCalculatedAmount, setAutoCalculatedAmount] = useState<number | null>(null);
  const [selectedTripForAdd, setSelectedTripForAdd] = useState<string | null>(null);
  const [expandedTrips, setExpandedTrips] = useState<string[]>([]);
  
  // Filter states
  const [searchTripNumber, setSearchTripNumber] = useState<string>("");
  const [filterExpenseType, setFilterExpenseType] = useState<string>("all");
  const [filterRouteId, setFilterRouteId] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { data: trips = [] } = useQuery({
    queryKey: ["transport", "trips"],
    queryFn: () => apiEndpoints.transport.trips.getAll(),
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ["transport", "expenses"],
    queryFn: () => apiEndpoints.transport.expenses.getAll({}),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["transport", "vehicles"],
    queryFn: () => apiEndpoints.transport.vehicles.getAll(),
  });

  const { data: routes = [] } = useQuery({
    queryKey: ["routes"],
    queryFn: () => apiEndpoints.routes.getAll(),
  });

  // Group expenses by trip number
  const expensesByTrip = useMemo(() => {
    if (!trips || !Array.isArray(trips) || !allExpenses || !Array.isArray(allExpenses)) {
      return {};
    }
    return trips.reduce((acc: any, trip: any) => {
      if (!trip?.trip_number) return acc;
      const tripExpenses = allExpenses.filter((exp: any) => exp?.trip_number === trip.trip_number);
      acc[trip.trip_number] = {
        trip,
        expenses: tripExpenses,
        total: tripExpenses.reduce((sum: number, exp: any) => sum + (parseFloat(exp?.amount || 0) || 0), 0),
      };
      return acc;
    }, {});
  }, [trips, allExpenses]);

  // Get unique trip numbers with expenses (filtered)
  const tripNumbersWithExpenses = useMemo(() => {
    let filtered = Object.keys(expensesByTrip).filter(Boolean);
    
    // Filter by trip number search
    if (searchTripNumber) {
      filtered = filtered.filter((tripNumber) =>
        tripNumber.toLowerCase().includes(searchTripNumber.toLowerCase())
      );
    }
    
    // Filter by expense type
    if (filterExpenseType !== "all") {
      filtered = filtered.filter((tripNumber) => {
        const tripData = expensesByTrip[tripNumber];
        return tripData?.expenses?.some((exp: any) => exp.expense_type === filterExpenseType);
      });
    }
    
    // Filter by route
    if (filterRouteId !== "all") {
      filtered = filtered.filter((tripNumber) => {
        const tripData = expensesByTrip[tripNumber];
        return tripData?.trip?.route_id === parseInt(filterRouteId);
      });
    }
    
    // Filter by date range
    if (startDate || endDate) {
      filtered = filtered.filter((tripNumber) => {
        const tripData = expensesByTrip[tripNumber];
        const tripDate = tripData?.trip?.trip_date;
        if (!tripDate) return false;
        
        const date = new Date(tripDate);
        if (startDate && date < new Date(startDate)) return false;
        if (endDate && date > new Date(endDate)) return false;
        return true;
      });
    }
    
    return filtered;
  }, [expensesByTrip, searchTripNumber, filterExpenseType, filterRouteId, startDate, endDate]);
  
  // Calculate filtered totals
  const filteredTotals = useMemo(() => {
    let totalExpenses = 0;
    let totalAmount = 0;
    
    tripNumbersWithExpenses.forEach((tripNumber) => {
      const tripData = expensesByTrip[tripNumber];
      if (tripData) {
        totalExpenses += tripData.expenses?.length || 0;
        totalAmount += tripData.total || 0;
      }
    });
    
    return { totalExpenses, totalAmount };
  }, [tripNumbersWithExpenses, expensesByTrip]);
  
  // Clear all filters
  const clearFilters = () => {
    setSearchTripNumber("");
    setFilterExpenseType("all");
    setFilterRouteId("all");
    setStartDate("");
    setEndDate("");
  };
  
  const hasActiveFilters = searchTripNumber || filterExpenseType !== "all" || filterRouteId !== "all" || startDate || endDate;

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      trip_number: "",
      expense_type: "",
      amount: 0,
      description: "",
      expense_date: new Date().toISOString().split("T")[0],
    },
  });

  const formTripNumber = form.watch("trip_number");

  // Auto-calculate expense based on route shipping points
  const handleCalculateExpense = () => {
    if (!formTripNumber) {
      toast({
        title: "Error",
        description: "Please select a trip number first",
        variant: "destructive",
      });
      return;
    }

    const trip = trips.find((t: any) => t.trip_number === formTripNumber);
    if (!trip) {
      toast({
        title: "Error",
        description: "Trip not found",
        variant: "destructive",
      });
      return;
    }

    const vehicle = vehicles.find((v: any) => v.id === trip.vehicle_id);
    if (!vehicle || !vehicle.fuel_rate) {
      toast({
        title: "Error",
        description: "Vehicle not found or fuel rate not set",
        variant: "destructive",
      });
      return;
    }

    // For now, use trip distance if available
    const distance = trip.distance_km || 0;
    if (distance === 0) {
      toast({
        title: "Warning",
        description: "Distance not available for this trip",
        variant: "destructive",
      });
      return;
    }

    const calculatedAmount = parseFloat(distance) * parseFloat(vehicle.fuel_rate);
    setAutoCalculatedAmount(calculatedAmount);
    form.setValue("amount", calculatedAmount);
    form.setValue("expense_type", "fuel");
    form.setValue("description", `Auto-calculated fuel cost for ${distance} km`);

    toast({
      title: "Calculated",
      description: `Estimated fuel cost: ৳${calculatedAmount.toFixed(2)} for ${distance} km`,
    });
  };

  const createMutation = useMutation({
    mutationFn: (data: ExpenseFormData) => {
      const trip = trips.find((t: any) => t.trip_number === data.trip_number);
      return apiEndpoints.transport.expenses.create({
        ...data,
        route_id: trip?.route_id || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transport", "expenses"] });
      toast({ title: "Success", description: "Expense added successfully" });
      setIsDialogOpen(false);
      form.reset();
      setAutoCalculatedAmount(null);
      setSelectedTripForAdd(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add expense",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiEndpoints.transport.expenses.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transport", "expenses"] });
      toast({ title: "Success", description: "Expense updated successfully" });
      setIsDialogOpen(false);
      setEditingExpense(null);
      form.reset();
      setAutoCalculatedAmount(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update expense",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiEndpoints.transport.expenses.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transport", "expenses"] });
      toast({ title: "Success", description: "Expense deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete expense",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ExpenseFormData) => {
    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (expense: any) => {
    setEditingExpense(expense);
    form.reset({
      trip_number: expense.trip_number || "",
      expense_type: expense.expense_type,
      amount: expense.amount,
      description: expense.description || "",
      expense_date: expense.expense_date,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleAdd = (tripNumber?: string) => {
    setEditingExpense(null);
    setSelectedTripForAdd(tripNumber || null);
    form.reset({
      trip_number: tripNumber || "",
      expense_type: "",
      amount: 0,
      description: "",
      expense_date: new Date().toISOString().split("T")[0],
    });
    setAutoCalculatedAmount(null);
    setIsDialogOpen(true);
  };

  // Group expenses by shipping point for a trip
  const getExpensesByShippingPoint = (tripNumber: string, routeShippingPoints: any[], expenses: any[]) => {
    if (!routeShippingPoints || routeShippingPoints.length === 0) {
      return [{ shippingPoint: null, expenses, total: expenses.reduce((sum: number, exp: any) => sum + (parseFloat(exp.amount) || 0), 0) }];
    }

    // For now, distribute expenses evenly across shipping points or show all expenses together
    // In a real scenario, you might want to link expenses to specific shipping points
    const expensesPerPoint = Math.ceil(expenses.length / routeShippingPoints.length);
    const grouped: any[] = [];

    routeShippingPoints.forEach((rsp: any, index: number) => {
      const startIdx = index * expensesPerPoint;
      const endIdx = Math.min(startIdx + expensesPerPoint, expenses.length);
      const pointExpenses = expenses.slice(startIdx, endIdx);
      const total = pointExpenses.reduce((sum: number, exp: any) => sum + (parseFloat(exp.amount) || 0), 0);

      grouped.push({
        shippingPoint: rsp,
        expenses: pointExpenses,
        total,
      });
    });

    // Add any remaining expenses to the last shipping point
    if (grouped.length > 0 && expenses.length > routeShippingPoints.length * expensesPerPoint) {
      const remaining = expenses.slice(routeShippingPoints.length * expensesPerPoint);
      if (remaining.length > 0) {
        const lastGroup = grouped[grouped.length - 1];
        lastGroup.expenses = [...lastGroup.expenses, ...remaining];
        lastGroup.total = lastGroup.expenses.reduce((sum: number, exp: any) => sum + (parseFloat(exp.amount) || 0), 0);
      }
    }

    return grouped;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expense Management</h1>
          <p className="text-muted-foreground">
            View and manage expenses by trip number
          </p>
        </div>
        <Button onClick={() => handleAdd()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Trip Number</label>
              <Input
                placeholder="Search trip number..."
                value={searchTripNumber}
                onChange={(e) => setSearchTripNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Expense Type</label>
              <Select value={filterExpenseType} onValueChange={setFilterExpenseType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="fuel">Fuel</SelectItem>
                  <SelectItem value="toll">Toll</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Route</label>
              <Select value={filterRouteId} onValueChange={setFilterRouteId}>
                <SelectTrigger>
                  <SelectValue placeholder="All routes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Routes</SelectItem>
                  {routes.map((route: any) => (
                    <SelectItem key={route.id} value={route.id.toString()}>
                      {route.name || route.route_id || `Route ${route.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Showing {tripNumbersWithExpenses.length} trip(s)</span>
                <span>•</span>
                <span>{filteredTotals.totalExpenses} expense(s)</span>
                <span>•</span>
                <span className="font-semibold">Total: ৳{filteredTotals.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {tripNumbersWithExpenses.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              No expenses found. Create trips and add expenses to see them here.
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Trip-wise Expenses</CardTitle>
            <CardDescription>
              {hasActiveFilters ? (
                <>
                  {tripNumbersWithExpenses.length} trip{tripNumbersWithExpenses.length !== 1 ? "s" : ""} found
                  {filteredTotals.totalExpenses > 0 && (
                    <> • {filteredTotals.totalExpenses} expense{filteredTotals.totalExpenses !== 1 ? "s" : ""} • Total: ৳{filteredTotals.totalAmount.toFixed(2)}</>
                  )}
                </>
              ) : (
                <>
                  {tripNumbersWithExpenses.length} trip{tripNumbersWithExpenses.length !== 1 ? "s" : ""} with expenses
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion 
              type="multiple" 
              className="w-full"
              onValueChange={(values) => {
                setExpandedTrips(values);
              }}
            >
              {tripNumbersWithExpenses.map((tripNumber) => {
                const tripData = expensesByTrip[tripNumber];
                if (!tripData) return null;
                const trip = tripData.trip;
                const expenses = tripData.expenses || [];
                const total = tripData.total || 0;
                const vehicle = (vehicles || []).find((v: any) => v.id === trip?.vehicle_id);
                const driver = trip?.driver;

                return (
                  <AccordionItem key={tripNumber} value={tripNumber}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="text-lg px-3 py-1">
                            {tripNumber}
                          </Badge>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {driver && driver.first_name
                                  ? `${driver.first_name} ${driver.last_name || ""}`.trim()
                                  : "N/A"}
                              </span>
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="flex items-center gap-1">
                              <Truck className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {vehicle?.registration_number || vehicle?.vehicle_id || trip?.vehicle_id || "N/A"}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">
                            {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
                          </span>
                          <span className="text-lg font-semibold">
                            Total: ৳{total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <TripExpenseItem
                        tripNumber={tripNumber}
                        trip={trip}
                        expenses={expenses}
                        total={total}
                        vehicle={vehicle}
                        driver={driver}
                        onAddExpense={handleAdd}
                        onEditExpense={handleEdit}
                        onDeleteExpense={handleDelete}
                        isExpanded={expandedTrips.includes(tripNumber)}
                      />
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? "Edit Expense" : "Add Expense"}
            </DialogTitle>
            <DialogDescription>
              {selectedTripForAdd ? `Add expense for trip: ${selectedTripForAdd}` : "Create an expense for a trip"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="trip_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trip Number *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!!selectedTripForAdd}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select or enter trip number" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {trips
                          .filter((t: any) => t.trip_number)
                          .map((trip: any) => (
                            <SelectItem key={trip.trip_number} value={trip.trip_number}>
                              {trip.trip_number}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCalculateExpense}
                  disabled={!formTripNumber}
                  className="flex-1"
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  Auto-Calculate Fuel Cost
                </Button>
              </div>
              {autoCalculatedAmount !== null && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    Auto-calculated amount: ৳{autoCalculatedAmount.toFixed(2)}
                  </p>
                </div>
              )}
              <FormField
                control={form.control}
                name="expense_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select expense type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fuel">Fuel</SelectItem>
                        <SelectItem value="toll">Toll</SelectItem>
                        <SelectItem value="repair">Repair</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (৳) *</FormLabel>
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
                name="expense_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Optional description" />
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
                    setAutoCalculatedAmount(null);
                    setSelectedTripForAdd(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {editingExpense ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
