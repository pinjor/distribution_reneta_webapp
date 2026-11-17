/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, useReducedMotion } from "framer-motion";
import { Receipt, Plus, Loader2, Calculator, Truck, User, DollarSign, X, Search } from "lucide-react";
import { DateRangeField } from "@/components/transport/DateRangeField";
import { TransportQuickNav } from "@/components/transport/TransportQuickNav";
import {
  dialogContentClass,
  fieldClass,
  fieldWrapClass,
  KpiCard,
  labelClass,
  requiredMark,
  sectionMotion,
  selectItemClass,
  selectPanelClass,
} from "@/components/transport/transportUi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { TripExpenseItem } from "./TripExpenseItem";
import { cn } from "@/lib/utils";

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
  const reduceMotion = useReducedMotion();
  const motionProps = sectionMotion(reduceMotion);
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
    <ThemeScope className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-x-hidden">
        <motion.div {...motionProps} className="shrink-0">
          <TransportQuickNav />
        </motion.div>

        <motion.div {...motionProps} className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard title="Trips with Expenses" value={tripNumbersWithExpenses.length} icon={Receipt} accent="blue" />
          <KpiCard title="Total Expense Items" value={filteredTotals.totalExpenses} icon={DollarSign} accent="green" />
          <KpiCard title="Total Amount" value={`৳${filteredTotals.totalAmount.toFixed(2)}`} icon={Calculator} accent="purple" />
        </motion.div>

        <motion.div {...motionProps} className="nt-form shrink-0">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
            <div className="w-[240px] max-w-full space-y-1">
              <label className={labelClass} htmlFor="expense-trip-search">Search</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" aria-hidden />
                <Input
                  id="expense-trip-search"
                  placeholder="Trip number"
                  value={searchTripNumber}
                  onChange={(e) => setSearchTripNumber(e.target.value)}
                  className={cn("nt-search-input w-full", fieldClass)}
                />
                {searchTripNumber ? (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#94A3B8] hover:text-[#172B4D]"
                    onClick={() => setSearchTripNumber("")}
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="w-[160px] space-y-1">
              <label className={labelClass}>Type</label>
              <Select value={filterExpenseType} onValueChange={setFilterExpenseType}>
                <SelectTrigger className={cn("w-full", fieldClass)}>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent className={selectPanelClass}>
                  <SelectItem value="all" className={selectItemClass}>All types</SelectItem>
                  <SelectItem value="fuel" className={selectItemClass}>Fuel</SelectItem>
                  <SelectItem value="toll" className={selectItemClass}>Toll</SelectItem>
                  <SelectItem value="maintenance" className={selectItemClass}>Maintenance</SelectItem>
                  <SelectItem value="repair" className={selectItemClass}>Repair</SelectItem>
                  <SelectItem value="other" className={selectItemClass}>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px] space-y-1">
              <label className={labelClass}>Route</label>
              <Select value={filterRouteId} onValueChange={setFilterRouteId}>
                <SelectTrigger className={cn("w-full", fieldClass)}>
                  <SelectValue placeholder="All routes" />
                </SelectTrigger>
                <SelectContent className={selectPanelClass}>
                  <SelectItem value="all" className={selectItemClass}>All routes</SelectItem>
                  {routes.map((route: { id: number; name?: string; route_id?: string }) => (
                    <SelectItem key={route.id} value={route.id.toString()} className={selectItemClass}>
                      {route.name || route.route_id || `Route ${route.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DateRangeField
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
            />
            {hasActiveFilters ? (
              <Button type="button" variant="ntSecondary" className="!h-8" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            ) : null}
            <Button type="button" variant="ntPrimary" className="!h-8 ml-auto" onClick={() => handleAdd()} aria-label="Add Expense">
              <Plus className="h-3.5 w-3.5" />
              Add Expense
            </Button>
          </div>
        </motion.div>

        <motion.div
          {...motionProps}
          className="nt-page-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded-2xl border border-[#E3EAF3] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-[#2C3B50] dark:bg-[#151F30]"
        >
          {tripNumbersWithExpenses.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-[#64748B]">
              No expenses found. Create trips and add expenses to see them here.
            </p>
          ) : (
            <div className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">Trip-wise Expenses</h3>
                  <p className="text-xs text-[#64748B] dark:text-[#A9B8CC]">
                    {hasActiveFilters ? (
                      <>
                        {tripNumbersWithExpenses.length} trip{tripNumbersWithExpenses.length !== 1 ? "s" : ""} found
                        {filteredTotals.totalExpenses > 0 && (
                          <>
                            {" "}
                            • {filteredTotals.totalExpenses} expense{filteredTotals.totalExpenses !== 1 ? "s" : ""} • Total: ৳
                            {filteredTotals.totalAmount.toFixed(2)}
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        {tripNumbersWithExpenses.length} trip{tripNumbersWithExpenses.length !== 1 ? "s" : ""} with expenses
                      </>
                    )}
                  </p>
                </div>
              </div>
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
                  const vehicle = (vehicles || []).find((v: { id?: number }) => v.id === trip?.vehicle_id);
                  const driver = trip?.driver;

                  return (
                    <AccordionItem key={tripNumber} value={tripNumber} className="border-[#E3EAF3] dark:border-[#2C3B50]">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex w-full items-center justify-between pr-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="rounded-full bg-[#EAF2FC] px-2.5 py-0.5 text-xs font-semibold text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]">
                              {tripNumber}
                            </span>
                            <div className="flex min-w-0 items-center gap-3 text-[13px] text-[#475569]">
                              <span className="inline-flex items-center gap-1">
                                <User className="h-3.5 w-3.5" />
                                {driver && driver.first_name
                                  ? `${driver.first_name} ${driver.last_name || ""}`.trim()
                                  : "N/A"}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Truck className="h-3.5 w-3.5" />
                                {vehicle?.registration_number || vehicle?.vehicle_id || trip?.vehicle_id || "N/A"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-[13px]">
                            <span className="text-[#64748B]">
                              {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
                            </span>
                            <span className="font-semibold tabular-nums text-[#172B4D] dark:text-[#F1F5F9]">
                              ৳{total.toFixed(2)}
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
            </div>
          )}
        </motion.div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={dialogContentClass}>
          <DialogHeader className="shrink-0 space-y-0.5 border-b border-[#E3EAF3] px-5 py-3 text-left dark:border-[#2C3B50]">
            <div className="flex items-start gap-3 pr-6">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]">
                <Receipt className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                  {editingExpense ? "Edit expense" : "Add expense"}
                </DialogTitle>
                <DialogDescription className="text-sm text-[#64748B] dark:text-[#A9B8CC]">
                  {selectedTripForAdd ? `Add expense for trip: ${selectedTripForAdd}` : "Create an expense for a trip"}
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
                    name="trip_number"
                    render={({ field }) => (
                      <FormItem className={`${fieldWrapClass} sm:col-span-2`}>
                        <FormLabel className={labelClass}>Trip Number {requiredMark}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!!selectedTripForAdd}>
                          <FormControl>
                            <SelectTrigger className={fieldClass}>
                              <SelectValue placeholder="Select or enter trip number" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className={selectPanelClass}>
                            {trips
                              .filter((t: { trip_number?: string }) => t.trip_number)
                              .map((trip: { trip_number: string }) => (
                                <SelectItem key={trip.trip_number} value={trip.trip_number} className={selectItemClass}>
                                  {trip.trip_number}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="sm:col-span-2">
                    <Button type="button" variant="ntSecondary" className="!h-8" onClick={handleCalculateExpense} disabled={!formTripNumber}>
                      <Calculator className="h-3.5 w-3.5" />
                      Auto-Calculate Fuel Cost
                    </Button>
                    {autoCalculatedAmount !== null ? (
                      <p className="mt-2 rounded-lg bg-[#EAF2FC] px-3 py-2 text-[13px] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]">
                        Auto-calculated amount: ৳{autoCalculatedAmount.toFixed(2)}
                      </p>
                    ) : null}
                  </div>
                  <FormField
                    control={form.control}
                    name="expense_type"
                    render={({ field }) => (
                      <FormItem className={fieldWrapClass}>
                        <FormLabel className={labelClass}>Expense Type {requiredMark}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className={fieldClass}>
                              <SelectValue placeholder="Select expense type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className={selectPanelClass}>
                            <SelectItem value="fuel" className={selectItemClass}>Fuel</SelectItem>
                            <SelectItem value="toll" className={selectItemClass}>Toll</SelectItem>
                            <SelectItem value="repair" className={selectItemClass}>Repair</SelectItem>
                            <SelectItem value="maintenance" className={selectItemClass}>Maintenance</SelectItem>
                            <SelectItem value="other" className={selectItemClass}>Other</SelectItem>
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
                      <FormItem className={fieldWrapClass}>
                        <FormLabel className={labelClass}>Amount (৳) {requiredMark}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            className={fieldClass}
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
                      <FormItem className={fieldWrapClass}>
                        <FormLabel className={labelClass}>Expense Date {requiredMark}</FormLabel>
                        <FormControl>
                          <Input type="date" className={fieldClass} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className={`${fieldWrapClass} sm:col-span-2`}>
                        <FormLabel className={labelClass}>Description</FormLabel>
                        <FormControl>
                          <Textarea className={fieldClass} {...field} placeholder="Optional description" />
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
                    setAutoCalculatedAmount(null);
                    setSelectedTripForAdd(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="ntPrimary" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editingExpense ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </ThemeScope>
  );
}
