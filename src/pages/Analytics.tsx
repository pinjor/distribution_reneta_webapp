import { useState } from "react";
import { BarChart3, TrendingUp, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const depotStockData = [
  { name: "Chennai Main", value: 45000 },
  { name: "Chennai South", value: 32000 },
  { name: "Chennai North", value: 28000 },
  { name: "Chennai East", value: 21000 },
];

const dispatchTrendData = [
  { month: "Sep", dispatched: 120, delivered: 115 },
  { month: "Oct", dispatched: 145, delivered: 140 },
  { month: "Nov", dispatched: 165, delivered: 160 },
  { month: "Dec", dispatched: 178, delivered: 172 },
  { month: "Jan", dispatched: 192, delivered: 188 },
];

const categoryData = [
  { name: "Antibiotics", value: 35 },
  { name: "Analgesics", value: 25 },
  { name: "Vitamins", value: 20 },
  { name: "Others", value: 20 },
];

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--info))", "hsl(var(--warning))"];

export default function Analytics() {
  const [depot, setDepot] = useState("all");
  const [dateRange, setDateRange] = useState("30days");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Analytics & Reports</h1>
        <p className="text-muted-foreground">Comprehensive insights and data visualization</p>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Analytics Builder</h2>
          </div>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        <div className="flex gap-4 mb-6">
          <Select value={depot} onValueChange={setDepot}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select depot" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Depots</SelectItem>
              <SelectItem value="main">Chennai Main</SelectItem>
              <SelectItem value="south">Chennai South</SelectItem>
              <SelectItem value="north">Chennai North</SelectItem>
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

          <Input type="date" className="w-[180px]" placeholder="Start date" />
          <Input type="date" className="w-[180px]" placeholder="End date" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Receipts</p>
            <p className="text-2xl font-semibold mb-2">245</p>
            <div className="flex items-center gap-1 text-success">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">+12%</span>
            </div>
          </Card>

          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Dispatches</p>
            <p className="text-2xl font-semibold mb-2">192</p>
            <div className="flex items-center gap-1 text-success">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">+8%</span>
            </div>
          </Card>

          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Stock Adjustments</p>
            <p className="text-2xl font-semibold mb-2">18</p>
            <div className="flex items-center gap-1 text-warning">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">+3%</span>
            </div>
          </Card>

          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Revenue</p>
            <p className="text-2xl font-semibold mb-2">₹4.27L</p>
            <div className="flex items-center gap-1 text-success">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">+15%</span>
            </div>
          </Card>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Depot-wise Stock Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={depotStockData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }} 
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Product Category Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
                  borderRadius: "8px"
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Dispatch & Delivery Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dispatchTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px"
              }} 
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="dispatched" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="delivered" 
              stroke="hsl(var(--success))" 
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
