import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { depot: "Central", stock: 12500 },
  { depot: "North", stock: 8200 },
  { depot: "South", stock: 9800 },
  { depot: "East", stock: 7100 },
  { depot: "West", stock: 10300 },
];

export function StockChart() {
  return (
    <Card className="p-6 card-elevated">
      <h3 className="text-lg font-medium mb-4">Depot-wise Stock Levels</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="depot"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            axisLine={{ stroke: "hsl(var(--border))" }}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            axisLine={{ stroke: "hsl(var(--border))" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius-button)",
            }}
          />
          <Bar dataKey="stock" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
