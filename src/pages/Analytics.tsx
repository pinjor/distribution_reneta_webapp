import { useState } from "react";
import { BarChart3, TrendingUp, Download, FileText, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";

const depotStockData = [
  { name: "Bangalore Hub", value: 45000 },
  { name: "Mumbai Central", value: 38000 },
  { name: "Delhi Main", value: 32000 },
  { name: "Chennai Depot", value: 28000 },
  { name: "Hyderabad Warehouse", value: 21000 },
];

const dispatchTrendData = [
  { month: "Sep", dispatched: 120, delivered: 115, pending: 5 },
  { month: "Oct", dispatched: 145, delivered: 140, pending: 5 },
  { month: "Nov", dispatched: 165, delivered: 160, pending: 5 },
  { month: "Dec", dispatched: 178, delivered: 172, pending: 6 },
  { month: "Jan", dispatched: 192, delivered: 188, pending: 4 },
];

const categoryData = [
  { name: "Antibiotics", value: 35 },
  { name: "Analgesics", value: 25 },
  { name: "Vitamins", value: 20 },
  { name: "Cardiac", value: 12 },
  { name: "Others", value: 8 },
];

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function Analytics() {
  const [depot, setDepot] = useState("all");
  const [dateRange, setDateRange] = useState("30days");
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleExport = async (format: string) => {
    setExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setExporting(false);
    toast.success(`Report exported as ${format.toUpperCase()}`);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
    toast.success("Data refreshed successfully");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Analytics & Reports</h1>
        <p className="text-muted-foreground">Comprehensive insights and data visualization</p>
      </div>

      <Card className="p-6 card-elevated">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Analytics Builder</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="hover-scale">
              {refreshing ? <LoadingSpinner size="sm" className="mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
            <Button size="sm" onClick={() => handleExport("pdf")} disabled={exporting} className="hover-scale">
              {exporting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex gap-4 mb-6 flex-wrap">
          <Select value={depot} onValueChange={setDepot}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select depot" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Depots</SelectItem>
              <SelectItem value="bangalore">Bangalore Hub</SelectItem>
              <SelectItem value="mumbai">Mumbai Central</SelectItem>
              <SelectItem value="delhi">Delhi Main</SelectItem>
              <SelectItem value="chennai">Chennai Depot</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {dateRange === "custom" && (
            <>
              <Input type="date" className="w-[180px]" placeholder="Start date" />
              <Input type="date" className="w-[180px]" placeholder="End date" />
            </>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 hover-scale cursor-pointer transition-all hover:shadow-lg">
            <p className="text-sm text-muted-foreground mb-1">Total Receipts</p>
            <p className="text-2xl font-semibold mb-2">245</p>
            <div className="flex items-center gap-1 text-success">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">+12% vs last month</span>
            </div>
          </Card>

          <Card className="p-4 hover-scale cursor-pointer transition-all hover:shadow-lg">
            <p className="text-sm text-muted-foreground mb-1">Total Dispatches</p>
            <p className="text-2xl font-semibold mb-2">192</p>
            <div className="flex items-center gap-1 text-success">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">+8% vs last month</span>
            </div>
          </Card>

          <Card className="p-4 hover-scale cursor-pointer transition-all hover:shadow-lg">
            <p className="text-sm text-muted-foreground mb-1">Delivery Rate</p>
            <p className="text-2xl font-semibold mb-2">97.9%</p>
            <div className="flex items-center gap-1 text-success">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">+2.1% vs last month</span>
            </div>
          </Card>

          <Card className="p-4 hover-scale cursor-pointer transition-all hover:shadow-lg">
            <p className="text-sm text-muted-foreground mb-1">Avg. Adjustments</p>
            <p className="text-2xl font-semibold mb-2">8</p>
            <div className="flex items-center gap-1 text-success">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">-15% vs last month</span>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 card-elevated">
            <h3 className="text-base font-semibold mb-4">Depot-wise Stock Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={depotStockData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6 card-elevated">
            <h3 className="text-base font-semibold mb-4">Dispatch & Delivery Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dispatchTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="dispatched" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="delivered" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="pending" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6 card-elevated">
            <h3 className="text-base font-semibold mb-4">Product Category Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6 card-elevated flex flex-col">
            <h3 className="text-base font-semibold mb-4">Quick Export Options</h3>
            <div className="flex-1 flex flex-col justify-center gap-3">
              <Button variant="outline" onClick={() => handleExport("csv")} disabled={exporting} className="justify-start hover-scale">
                <FileText className="h-4 w-4 mr-2" />
                Export as CSV
              </Button>
              <Button variant="outline" onClick={() => handleExport("pdf")} disabled={exporting} className="justify-start hover-scale">
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </Button>
              <Button variant="outline" onClick={() => handleExport("excel")} disabled={exporting} className="justify-start hover-scale">
                <FileText className="h-4 w-4 mr-2" />
                Export as Excel
              </Button>
            </div>
          </Card>
        </div>
      </Card>
    </div>
  );
}
