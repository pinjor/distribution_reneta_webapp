import { useState } from "react";
import {
  TrendingUp,
  Download,
  Loader2,
  Truck,
  User,
  Route,
  Fuel,
  Receipt,
  BarChart3,
  PieChartIcon,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";
import { DateRangeField } from "@/components/transport/DateRangeField";
import { TransportQuickNav } from "@/components/transport/TransportQuickNav";
import { fieldClass, KpiCard, labelClass, sectionMotion, selectItemClass, selectPanelClass } from "@/components/transport/transportUi";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHART_COLORS = ["#0C4DA1", "#15803D", "#7C3AED", "#C2410C", "#DC2626", "#0E7490"];
const PIE_COLORS = ["#0C4DA1", "#15803D", "#7C3AED", "#DC2626", "#C2410C"];

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
};

function PieLegendList({
  items,
  colors,
  showPercent,
}: {
  items: { name: string; value: number }[];
  colors: string[];
  showPercent?: boolean;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <ul className="mt-3 space-y-2 border-t pt-3">
      {items.map((item, i) => {
        const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : "0";
        return (
          <li key={item.name} className="flex items-center gap-2 text-xs min-w-0">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            <span className="truncate flex-1 min-w-0 text-muted-foreground" title={item.name}>
              {item.name}
            </span>
            {showPercent && (
              <span className="text-muted-foreground tabular-nums shrink-0">{pct}%</span>
            )}
            <span className="font-semibold tabular-nums shrink-0">৳{item.value.toFixed(2)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  borderAccent?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-w-0 overflow-hidden rounded-2xl border border-[#E3EAF3] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-[#2C3B50] dark:bg-[#151F30]">
      <CardHeader className="border-b border-[#E3EAF3] pb-3 dark:border-[#2C3B50]">
        <CardTitle className="text-base text-[#172B4D] dark:text-[#F1F5F9]">{title}</CardTitle>
        <CardDescription className="text-[#64748B]">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

export default function TransportReports() {
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const motionProps = sectionMotion(reduceMotion);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [vehicleId, setVehicleId] = useState<string>("all");
  const [driverId, setDriverId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"general" | "vehicle" | "driver">("general");

  const { data: vehicles = [] } = useQuery({
    queryKey: ["transport", "vehicles"],
    queryFn: () => apiEndpoints.transport.vehicles.getAll(),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["transport", "drivers"],
    queryFn: () => apiEndpoints.transport.drivers.getAll(),
  });

  const { data: report, isLoading, error: reportError } = useQuery({
    queryKey: ["transport", "reports", startDate, endDate, vehicleId, driverId],
    queryFn: () => {
      const params: Record<string, string | number> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (vehicleId && vehicleId !== "all") params.vehicle_id = parseInt(vehicleId);
      if (driverId && driverId !== "all") params.driver_id = parseInt(driverId);
      return apiEndpoints.transport.reports.getReport(params);
    },
    retry: 1,
  });

  const { data: vehicleExpenses, isLoading: isLoadingVehicle } = useQuery({
    queryKey: ["transport", "vehicle-expenses", startDate, endDate, vehicleId],
    queryFn: () => {
      const params: Record<string, string | number> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (vehicleId && vehicleId !== "all") params.vehicle_id = parseInt(vehicleId);
      return apiEndpoints.transport.reports.getVehicleExpenses(params);
    },
    enabled: activeTab === "vehicle",
    retry: 1,
  });

  const { data: driverExpenses, isLoading: isLoadingDriver, error: driverError } = useQuery({
    queryKey: ["transport", "driver-expenses", startDate, endDate, driverId],
    queryFn: () => {
      const params: Record<string, string | number> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (driverId && driverId !== "all") params.driver_id = parseInt(driverId);
      return apiEndpoints.transport.reports.getDriverExpenses(params);
    },
    enabled: activeTab === "driver",
    retry: 1,
  });

  const handleExportPDF = async (reportType: "general" | "vehicle" | "driver" = "general") => {
    try {
      const params: Record<string, string | number> = { report_type: reportType };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (vehicleId && vehicleId !== "all") params.vehicle_id = parseInt(vehicleId);
      if (driverId && driverId !== "all") params.driver_id = parseInt(driverId);

      const blob = await apiEndpoints.transport.reports.getPDF(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportType}_expense_report_${startDate || "all"}_${endDate || "present"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Success", description: "PDF report downloaded successfully" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to generate PDF";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const expensePieData = report?.expenses_by_trip?.length
    ? report.expenses_by_trip.slice(0, 5).map((item: { trip_number: string; total_amount: number }) => ({
        name: item.trip_number,
        value: item.total_amount,
      }))
    : [];

  const fuelVsOther =
    report && (report.total_fuel_cost || report.total_expenses)
      ? [
          { name: "Fuel Cost", value: report.total_fuel_cost || 0 },
          {
            name: "Other Expenses",
            value: Math.max(0, (report.total_expenses || 0) - (report.total_fuel_cost || 0)),
          },
        ].filter((d) => d.value > 0)
      : [];

  return (
    <ThemeScope className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
      <div className="flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col gap-3 overflow-x-hidden">
      <motion.div {...motionProps} className="shrink-0">
        <TransportQuickNav />
      </motion.div>

      <motion.div {...motionProps} className="nt-form shrink-0">
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
          <DateRangeField
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
          />
          <div className="w-[180px] space-y-1">
            <label className={labelClass}>Vehicle</label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger className={cn("w-full", fieldClass)}>
                <SelectValue placeholder="All vehicles" />
              </SelectTrigger>
              <SelectContent className={selectPanelClass}>
                <SelectItem value="all" className={selectItemClass}>All vehicles</SelectItem>
                {vehicles.map((vehicle: { id: number; registration_number: string }) => (
                  <SelectItem key={vehicle.id} value={vehicle.id.toString()} className={selectItemClass}>
                    {vehicle.registration_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[180px] space-y-1">
            <label className={labelClass}>Driver</label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger className={cn("w-full", fieldClass)}>
                <SelectValue placeholder="All drivers" />
              </SelectTrigger>
              <SelectContent className={selectPanelClass}>
                <SelectItem value="all" className={selectItemClass}>All drivers</SelectItem>
                {drivers.map((driver: { id: number; first_name: string; last_name?: string }) => (
                  <SelectItem key={driver.id} value={driver.id.toString()} className={selectItemClass}>
                    {driver.first_name} {driver.last_name || ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="ntPrimary" className="!h-8" onClick={() => handleExportPDF(activeTab)}>
            <Download className="h-3.5 w-3.5" />
            Export PDF
          </Button>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="min-w-0 max-w-full">
        <TabsList className="inline-flex h-auto w-fit justify-start gap-0.5 rounded-xl border border-[#E3EAF3] bg-[#F8FAFC] p-1 dark:border-[#2C3B50] dark:bg-[#1B283B]">
          <TabsTrigger
            value="general"
            className="gap-1.5 rounded-lg px-3 py-1.5 text-[13px] data-[state=active]:bg-white data-[state=active]:text-[#0C4DA1] data-[state=active]:shadow-sm"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            General Report
          </TabsTrigger>
          <TabsTrigger
            value="vehicle"
            className="gap-1.5 rounded-lg px-3 py-1.5 text-[13px] data-[state=active]:bg-white data-[state=active]:text-[#0C4DA1] data-[state=active]:shadow-sm"
          >
            <Truck className="h-3.5 w-3.5" />
            Vehicle Expenses
          </TabsTrigger>
          <TabsTrigger
            value="driver"
            className="gap-1.5 rounded-lg px-3 py-1.5 text-[13px] data-[state=active]:bg-white data-[state=active]:text-[#0C4DA1] data-[state=active]:shadow-sm"
          >
            <User className="h-3.5 w-3.5" />
            Driver Expenses
          </TabsTrigger>
        </TabsList>

        {/* General tab */}
        <TabsContent value="general" className="mt-6 min-w-0 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-48 rounded-xl border-2 border-dashed">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : reportError ? (
            <Card className="border-2 border-destructive/30">
              <CardContent className="py-8 text-center text-destructive">
                Error loading report: {reportError instanceof Error ? reportError.message : "Unknown error"}
              </CardContent>
            </Card>
          ) : report ? (
            <>
              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                  title="Total Trips"
                  value={report.total_trips || 0}
                  icon={Route}
                  accent="blue"
                  description="Completed assignments"
                />
                <KpiCard
                  title="Total Distance"
                  value={`${(report.total_distance || 0).toFixed(1)} km`}
                  icon={TrendingUp}
                  accent="green"
                  description="Fleet kilometers covered"
                />
                <KpiCard
                  title="Fuel Cost"
                  value={`৳${(report.total_fuel_cost || 0).toFixed(2)}`}
                  icon={Fuel}
                  accent="purple"
                  description="Estimated fuel spend"
                />
                <KpiCard
                  title="Total Expenses"
                  value={`৳${(report.total_expenses || 0).toFixed(2)}`}
                  icon={Receipt}
                  accent="purple"
                  description="All trip-related costs"
                />
              </div>

              <div className="grid min-w-0 gap-6 lg:grid-cols-2">
                {fuelVsOther.length > 0 && (
                  <ChartCard
                    title="Cost Breakdown"
                    description="Fuel vs other transport expenses"
                    borderAccent="border-amber-200 dark:border-amber-900/40"
                  >
                    <div className="h-[200px] w-full min-w-0 overflow-hidden">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={fuelVsOther}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                            label={false}
                          >
                            {fuelVsOther.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `৳${v.toFixed(2)}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <PieLegendList items={fuelVsOther} colors={PIE_COLORS} showPercent />
                  </ChartCard>
                )}

                {expensePieData.length > 0 && (
                  <ChartCard
                    title="Top Trip Expenses"
                    description="Highest spending trips in selected period"
                    borderAccent="border-violet-200 dark:border-violet-900/40"
                  >
                    <div className="h-[200px] w-full min-w-0 overflow-hidden">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expensePieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                            label={false}
                          >
                            {expensePieData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="transparent" />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={tooltipStyle}
                            formatter={(v: number) => `৳${v.toFixed(2)}`}
                            labelFormatter={(label) => String(label)}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <PieLegendList items={expensePieData} colors={CHART_COLORS} />
                  </ChartCard>
                )}
              </div>

              {report.trips_by_vehicle?.length > 0 && (
                <ChartCard
                  title="Trips by Vehicle"
                  description="Trip count and distance per vehicle"
                  borderAccent="border-blue-200 dark:border-blue-900/40"
                >
                  <div className="h-[300px] w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.trips_by_vehicle} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="registration_number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Bar dataKey="trip_count" fill="#3b82f6" name="Trips" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="total_distance" fill="#10b981" name="Distance (km)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  </div>
                </ChartCard>
              )}

              {report.trips_by_driver?.length > 0 && (
                <ChartCard
                  title="Trips by Driver"
                  description="Performance across your driver fleet"
                  borderAccent="border-emerald-200 dark:border-emerald-900/40"
                >
                  <div className="h-[300px] w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.trips_by_driver} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="driver_name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Bar dataKey="trip_count" fill="#f59e0b" name="Trips" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="total_distance" fill="#8b5cf6" name="Distance (km)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  </div>
                </ChartCard>
              )}

              {report.monthly_stats?.length > 0 && (
                <ChartCard
                  title="Monthly Trends"
                  description="Distance and fuel cost over time"
                  borderAccent="border-indigo-200 dark:border-indigo-900/40"
                >
                  <div className="h-[300px] w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={report.monthly_stats} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Line type="monotone" dataKey="total_distance" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} name="Distance (km)" />
                      <Line type="monotone" dataKey="total_fuel_cost" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} name="Fuel Cost (৳)" />
                    </LineChart>
                  </ResponsiveContainer>
                  </div>
                </ChartCard>
              )}

              {report.expenses_by_trip?.length > 0 && (
                <Card className="border-2 border-rose-100 dark:border-rose-900/40">
                  <CardHeader className="bg-gradient-to-r from-rose-50/60 to-transparent dark:from-rose-950/20">
                    <CardTitle className="flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5 text-rose-600" />
                      Expenses by Trip Number
                    </CardTitle>
                    <CardDescription>Detailed breakdown per trip</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Trip Number</TableHead>
                          <TableHead>Expense Count</TableHead>
                          <TableHead className="text-right">Total Amount (৳)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.expenses_by_trip.map((item: { trip_number: string; expense_count: number; total_amount: number }, index: number) => (
                          <TableRow key={index} className="hover:bg-muted/50">
                            <TableCell>
                              <Badge className="bg-violet-500 hover:bg-violet-600">{item.trip_number}</Badge>
                            </TableCell>
                            <TableCell>{item.expense_count}</TableCell>
                            <TableCell className="text-right font-semibold text-rose-600 dark:text-rose-400">
                              ৳{item.total_amount.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 pt-4 border-t flex justify-between items-center rounded-lg bg-orange-50 dark:bg-orange-950/30 px-4 py-3">
                      <span className="font-semibold">Grand Total</span>
                      <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        ৳
                        {(report.expenses_by_trip || [])
                          .reduce((sum: number, item: { total_amount?: number }) => sum + (item?.total_amount || 0), 0)
                          .toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="border-2 border-dashed">
              <CardContent className="py-12 text-center">
                <Route className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">No data available. Create some trips to see reports.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Vehicle tab */}
        <TabsContent value="vehicle" className="mt-6 min-w-0 space-y-6">
          {isLoadingVehicle ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : vehicleExpenses?.vehicles?.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard
                  title="Total Vehicles"
                  value={vehicleExpenses.summary?.total_vehicles || 0}
                  icon={Truck}
                  accent="blue"
                />
                <KpiCard
                  title="Total Trips"
                  value={vehicleExpenses.summary?.total_trips || 0}
                  icon={Route}
                  accent="purple"
                />
                <KpiCard
                  title="Total Expenses"
                  value={`৳${vehicleExpenses.total_expenses?.toFixed(2) || "0.00"}`}
                  icon={Receipt}
                  accent="purple"
                />
              </div>

              <Card className="border-2 border-blue-100 dark:border-blue-900/40">
                <CardHeader className="bg-gradient-to-r from-blue-50/60 to-transparent dark:from-blue-950/20">
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-blue-600" />
                    Vehicle Expense Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vehicle ID</TableHead>
                        <TableHead>Registration</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Trips</TableHead>
                        <TableHead>Expenses</TableHead>
                        <TableHead className="text-right">Total (৳)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicleExpenses.vehicles.map((v: Record<string, unknown>, index: number) => (
                        <TableRow key={index} className="hover:bg-muted/50">
                          <TableCell>{String(v.vehicle_id)}</TableCell>
                          <TableCell className="font-medium">{String(v.registration_number)}</TableCell>
                          <TableCell>{String(v.model || "-")}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-blue-300 text-blue-700">
                              {String(v.vehicle_type || "-")}
                            </Badge>
                          </TableCell>
                          <TableCell>{String(v.trip_count)}</TableCell>
                          <TableCell>{String(v.expense_count)}</TableCell>
                          <TableCell className="text-right font-semibold text-blue-600">
                            ৳{Number(v.total_expenses || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-2 border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                No vehicle expense data available.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Driver tab */}
        <TabsContent value="driver" className="mt-6 min-w-0 space-y-6">
          {isLoadingDriver ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : driverError ? (
            <Card className="border-2 border-destructive/30">
              <CardContent className="py-8 text-center text-destructive">
                Error loading driver expenses: {driverError instanceof Error ? driverError.message : "Unknown error"}
              </CardContent>
            </Card>
          ) : driverExpenses?.drivers?.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard
                  title="Total Drivers"
                  value={driverExpenses.summary?.total_drivers || 0}
                  icon={User}
                  accent="green"
                />
                <KpiCard
                  title="Total Trips"
                  value={driverExpenses.summary?.total_trips || 0}
                  icon={Route}
                  accent="purple"
                />
                <KpiCard
                  title="Total Expenses"
                  value={`৳${driverExpenses.total_expenses?.toFixed(2) || "0.00"}`}
                  icon={Receipt}
                  accent="purple"
                />
              </div>

              <Card className="border-2 border-emerald-100 dark:border-emerald-900/40">
                <CardHeader className="bg-gradient-to-r from-emerald-50/60 to-transparent dark:from-emerald-950/20">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-emerald-600" />
                    Driver Expense Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Driver ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>License</TableHead>
                        <TableHead>Trips</TableHead>
                        <TableHead>Expenses</TableHead>
                        <TableHead className="text-right">Total (৳)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {driverExpenses.drivers.map((d: Record<string, unknown>, index: number) => (
                        <TableRow key={index} className="hover:bg-muted/50">
                          <TableCell>{String(d.driver_id)}</TableCell>
                          <TableCell className="font-medium">{String(d.driver_name)}</TableCell>
                          <TableCell>{String(d.license_number || "-")}</TableCell>
                          <TableCell>{String(d.trip_count)}</TableCell>
                          <TableCell>{String(d.expense_count)}</TableCell>
                          <TableCell className="text-right font-semibold text-emerald-600">
                            ৳{Number(d.total_expenses || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-2 border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                No driver expense data available.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </ThemeScope>
  );
}
