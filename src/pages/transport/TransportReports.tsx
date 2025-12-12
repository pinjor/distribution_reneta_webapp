import { useState } from "react";
import { TrendingUp, Download, Loader2, Calendar, Truck, User } from "lucide-react";
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

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

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
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (vehicleId && vehicleId !== "all") params.vehicle_id = parseInt(vehicleId);
      if (driverId && driverId !== "all") params.driver_id = parseInt(driverId);
      return apiEndpoints.transport.reports.getReport(params);
    },
    enabled: true,
    retry: 1,
  });

  const { data: vehicleExpenses, isLoading: isLoadingVehicle, error: vehicleError } = useQuery({
    queryKey: ["transport", "vehicle-expenses", startDate, endDate, vehicleId],
    queryFn: () => {
      const params: any = {};
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
      const params: any = {};
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
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (vehicleId && vehicleId !== "all") params.vehicle_id = parseInt(vehicleId);
      if (driverId && driverId !== "all") params.driver_id = parseInt(driverId);
      params.report_type = reportType;

      const blob = await apiEndpoints.transport.reports.getPDF(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = `${reportType}_expense_report_${startDate || "all"}_${endDate || "present"}.pdf`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "PDF report downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate PDF",
        variant: "destructive",
      });
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
          <h1 className="text-3xl font-bold tracking-tight">Transport Reports & Analytics</h1>
          <p className="text-muted-foreground">View transport costs and performance metrics</p>
        </div>
        <Button onClick={() => handleExportPDF(activeTab)}>
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter report data by date range, vehicle, or driver</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Vehicle</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="All vehicles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All vehicles</SelectItem>
                  {vehicles.map((vehicle: any) => (
                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                      {vehicle.registration_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Driver</Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger>
                  <SelectValue placeholder="All drivers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All drivers</SelectItem>
                  {drivers.map((driver: any) => (
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "general" | "vehicle" | "driver")}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General Report</TabsTrigger>
          <TabsTrigger value="vehicle">Vehicle Expenses</TabsTrigger>
          <TabsTrigger value="driver">Driver Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {isLoading ? (
            <Card>
              <CardContent className="py-8">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              </CardContent>
            </Card>
          ) : reportError ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-red-500">
                  Error loading report: {reportError instanceof Error ? reportError.message : "Unknown error"}
                </div>
              </CardContent>
            </Card>
          ) : report ? (
        <>
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Trips</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{report?.total_trips || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Distance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{(report?.total_distance || 0).toFixed(2)} km</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Fuel Cost</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">৳{(report?.total_fuel_cost || 0).toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">৳{(report?.total_expenses || 0).toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          {report?.trips_by_vehicle && report.trips_by_vehicle.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Trips by Vehicle</CardTitle>
                <CardDescription>Distribution of trips across vehicles</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={report.trips_by_vehicle}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="registration_number" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="trip_count" fill="#3b82f6" name="Trips" />
                    <Bar dataKey="total_distance" fill="#10b981" name="Distance (km)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {report?.trips_by_driver && report.trips_by_driver.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Trips by Driver</CardTitle>
                <CardDescription>Distribution of trips across drivers</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={report.trips_by_driver}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="driver_name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="trip_count" fill="#f59e0b" name="Trips" />
                    <Bar dataKey="total_distance" fill="#8b5cf6" name="Distance (km)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {report?.monthly_stats && report.monthly_stats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Monthly Statistics</CardTitle>
                <CardDescription>Trends over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={report.monthly_stats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="total_distance"
                      stroke="#3b82f6"
                      name="Distance (km)"
                    />
                    <Line
                      type="monotone"
                      dataKey="total_fuel_cost"
                      stroke="#ef4444"
                      name="Fuel Cost (৳)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {report?.expenses_by_trip && report.expenses_by_trip.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Expenses by Trip Number</CardTitle>
                <CardDescription>Total expenses for each trip</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Trip Number</TableHead>
                        <TableHead>Expense Count</TableHead>
                        <TableHead className="text-right">Total Amount (৳)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.expenses_by_trip.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            <Badge variant="outline">{item.trip_number}</Badge>
                          </TableCell>
                          <TableCell>{item.expense_count}</TableCell>
                          <TableCell className="text-right font-medium">
                            ৳{item.total_amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Grand Total:</span>
                    <span className="text-2xl font-bold">
                      ৳{(report?.expenses_by_trip || []).reduce((sum: number, item: any) => sum + (item?.total_amount || 0), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              No data available. Create some trips to see reports.
            </div>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="vehicle" className="space-y-6">
          {isLoadingVehicle ? (
            <Card>
              <CardContent className="py-8">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              </CardContent>
            </Card>
          ) : vehicleExpenses && vehicleExpenses.vehicles?.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Vehicles</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{vehicleExpenses.summary?.total_vehicles || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Trips</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{vehicleExpenses.summary?.total_trips || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Expenses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">৳{vehicleExpenses.total_expenses?.toFixed(2) || "0.00"}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Vehicle Expense Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vehicle ID</TableHead>
                        <TableHead>Registration</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Trips</TableHead>
                        <TableHead>Expenses</TableHead>
                        <TableHead className="text-right">Total Amount (৳)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicleExpenses.vehicles.map((v: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{v.vehicle_id}</TableCell>
                          <TableCell className="font-medium">{v.registration_number}</TableCell>
                          <TableCell>{v.model || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{v.vehicle_type || "-"}</Badge>
                          </TableCell>
                          <TableCell>{v.trip_count}</TableCell>
                          <TableCell>{v.expense_count}</TableCell>
                          <TableCell className="text-right font-medium">
                            ৳{(v.total_expenses || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  No vehicle expense data available.
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="driver" className="space-y-6">
          {isLoadingDriver ? (
            <Card>
              <CardContent className="py-8">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              </CardContent>
            </Card>
          ) : driverError ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-red-500">
                  Error loading driver expenses: {driverError instanceof Error ? driverError.message : "Unknown error"}
                </div>
              </CardContent>
            </Card>
          ) : driverExpenses && driverExpenses.drivers?.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Drivers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{driverExpenses.summary?.total_drivers || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Trips</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{driverExpenses.summary?.total_trips || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Expenses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">৳{driverExpenses.total_expenses?.toFixed(2) || "0.00"}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Driver Expense Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Driver ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>License</TableHead>
                        <TableHead>Trips</TableHead>
                        <TableHead>Expenses</TableHead>
                        <TableHead className="text-right">Total Amount (৳)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {driverExpenses.drivers.map((d: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{d.driver_id}</TableCell>
                          <TableCell className="font-medium">{d.driver_name}</TableCell>
                          <TableCell>{d.license_number || "-"}</TableCell>
                          <TableCell>{d.trip_count}</TableCell>
                          <TableCell>{d.expense_count}</TableCell>
                          <TableCell className="text-right font-medium">
                            ৳{(d.total_expenses || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  No driver expense data available.
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

