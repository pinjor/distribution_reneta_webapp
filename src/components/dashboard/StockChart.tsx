import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const DEPOT_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4"];

const data = [
  { depot: "Central", stock: 12500 },
  { depot: "North", stock: 8200 },
  { depot: "South", stock: 9800 },
  { depot: "East", stock: 7100 },
  { depot: "West", stock: 10300 },
];

export function StockChart() {
  return (
    <Card className="p-6 card-elevated border-2 border-blue-100 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/50 to-card dark:from-blue-950/20">
      <h3 className="text-lg font-semibold mb-1">Depot-wise Stock Levels</h3>
      <p className="text-xs text-muted-foreground mb-4">Sellable inventory across depots</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="depot"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Bar dataKey="stock" radius={[8, 8, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={`bar-${index}`} fill={DEPOT_COLORS[index % DEPOT_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
