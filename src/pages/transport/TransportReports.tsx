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
  CalendarRange,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";
import { TransportPageHeader } from "@/components/transport/TransportPageHeader";
import { TransportQuickNav } from "@/components/transport/TransportQuickNav";
import { TransportStatCard } from "@/components/transport/TransportStatCard";
import { cn } from "@/lib/utils";
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

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];
const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

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
  borderAccent,
  children,
}: {
  title: string;
  description: string;
  borderAccent: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("border-2 overflow-hidden", borderAccent)}>
      <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

export default function TransportReports() {
  const { toast } = useToast();
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
    <div className="space-y-6">
      <TransportPageHeader
        title="Transport Reports & Analytics"
        subtitle="Fleet performance, trip costs, fuel spend, and expense breakdowns — all in one place."
        icon={TrendingUp}
        variant="orange"
        actions={
          <Button
            onClick={() => handleExportPDF(activeTab)}
            className="bg-white text-orange-700 hover:bg-white/90 shadow-md font-semibold"
          >
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        }
      />

      <TransportQuickNav />

      {/* Filters */}
      <Card className="border-2 border-orange-100 dark:border-orange-900/40 bg-gradient-to-br from-orange-50/40 to-card dark:from-orange-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-orange-500 text-white">
              <CalendarRange className="h-4 w-4" />
            </div>
            Report Filters
          </CardTitle>
          <CardDescription>Refine analytics by date range, vehicle, or driver</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Vehicle</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="All vehicles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All vehicles</SelectItem>
                  {vehicles.map((vehicle: { id: number; registration_number: string }) => (
                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                      {vehicle.registration_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Driver</Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger>
                  <SelectValue placeholder="All drivers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All drivers</SelectItem>
                  {drivers.map((driver: { id: number; first_name: string; last_name?: string }) => (
                    <SelectItem key={driver.id} value={driver.id.toString()}>
                      {driver.first_name} {driver.last_name || ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/60">
          <TabsTrigger
            value="general"
            className="gap-2 py-2.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white"
          >
            <BarChart3 className="h-4 w-4" />
            General Report
          </TabsTrigger>
          <TabsTrigger
            value="vehicle"
            className="gap-2 py-2.5 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
          >
            <Truck className="h-4 w-4" />
            Vehicle Expenses
          </TabsTrigger>
          <TabsTrigger
            value="driver"
            className="gap-2 py-2.5 data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
          >
            <User className="h-4 w-4" />
            Driver Expenses
          </TabsTrigger>
        </TabsList>

        {/* General tab */}
        <TabsContent value="general" className="space-y-6 mt-6">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <TransportStatCard
                  title="Total Trips"
                  value={report.total_trips || 0}
                  icon={Route}
                  accent="blue"
                  description="Completed assignments"
                />
                <TransportStatCard
                  title="Total Distance"
                  value={`${(report.total_distance || 0).toFixed(1)} km`}
                  icon={TrendingUp}
                  accent="emerald"
                  description="Fleet kilometers covered"
                />
                <TransportStatCard
                  title="Fuel Cost"
                  value={`৳${(report.total_fuel_cost || 0).toFixed(2)}`}
                  icon={Fuel}
                  accent="amber"
                  description="Estimated fuel spend"
                />
                <TransportStatCard
                  title="Total Expenses"
                  value={`৳${(report.total_expenses || 0).toFixed(2)}`}
                  icon={Receipt}
                  accent="rose"
                  description="All trip-related costs"
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {fuelVsOther.length > 0 && (
                  <ChartCard
                    title="Cost Breakdown"
                    description="Fuel vs other transport expenses"
                    borderAccent="border-amber-200 dark:border-amber-900/40"
                  >
                    <ResponsiveContainer width="100%" height={200}>
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
                    <PieLegendList items={fuelVsOther} colors={PIE_COLORS} showPercent />
                  </ChartCard>
                )}

                {expensePieData.length > 0 && (
                  <ChartCard
                    title="Top Trip Expenses"
                    description="Highest spending trips in selected period"
                    borderAccent="border-violet-200 dark:border-violet-900/40"
                  >
                    <ResponsiveContainer width="100%" height={200}>
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
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={report.trips_by_vehicle}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="registration_number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Bar dataKey="trip_count" fill="#3b82f6" name="Trips" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="total_distance" fill="#10b981" name="Distance (km)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {report.trips_by_driver?.length > 0 && (
                <ChartCard
                  title="Trips by Driver"
                  description="Performance across your driver fleet"
                  borderAccent="border-emerald-200 dark:border-emerald-900/40"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={report.trips_by_driver}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="driver_name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Bar dataKey="trip_count" fill="#f59e0b" name="Trips" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="total_distance" fill="#8b5cf6" name="Distance (km)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {report.monthly_stats?.length > 0 && (
                <ChartCard
                  title="Monthly Trends"
                  description="Distance and fuel cost over time"
                  borderAccent="border-indigo-200 dark:border-indigo-900/40"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={report.monthly_stats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Line type="monotone" dataKey="total_distance" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} name="Distance (km)" />
                      <Line type="monotone" dataKey="total_fuel_cost" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} name="Fuel Cost (৳)" />
                    </LineChart>
                  </ResponsiveContainer>
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
        <TabsContent value="vehicle" className="space-y-6 mt-6">
          {isLoadingVehicle ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : vehicleExpenses?.vehicles?.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <TransportStatCard
                  title="Total Vehicles"
                  value={vehicleExpenses.summary?.total_vehicles || 0}
                  icon={Truck}
                  accent="blue"
                />
                <TransportStatCard
                  title="Total Trips"
                  value={vehicleExpenses.summary?.total_trips || 0}
                  icon={Route}
                  accent="violet"
                />
                <TransportStatCard
                  title="Total Expenses"
                  value={`৳${vehicleExpenses.total_expenses?.toFixed(2) || "0.00"}`}
                  icon={Receipt}
                  accent="amber"
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
        <TabsContent value="driver" className="space-y-6 mt-6">
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
                <TransportStatCard
                  title="Total Drivers"
                  value={driverExpenses.summary?.total_drivers || 0}
                  icon={User}
                  accent="emerald"
                />
                <TransportStatCard
                  title="Total Trips"
                  value={driverExpenses.summary?.total_trips || 0}
                  icon={Route}
                  accent="violet"
                />
                <TransportStatCard
                  title="Total Expenses"
                  value={`৳${driverExpenses.total_expenses?.toFixed(2) || "0.00"}`}
                  icon={Receipt}
                  accent="amber"
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
  );
}
