import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useTheme } from "@/contexts/ThemeContext";

const DEPOT_COLORS_LIGHT = ["#0C4DA1", "#2874C7", "#093D82", "#4594E8", "#64748B"];
const DEPOT_COLORS_DARK = ["#70ADFF", "#4594E8", "#9AC6FF", "#2874C7", "#A9B8CC"];

const data = [
  { depot: "Central", stock: 12500 },
  { depot: "North", stock: 8200 },
  { depot: "South", stock: 9800 },
  { depot: "East", stock: 7100 },
  { depot: "West", stock: 10300 },
];

export function StockChart() {
  const { theme } = useTheme();
  const colors = theme === "dark" ? DEPOT_COLORS_DARK : DEPOT_COLORS_LIGHT;

  return (
    <Card className="p-6 card-elevated border-2 border-brand-from/20 bg-card">
      <h3 className="text-lg font-semibold mb-1 text-brand-deep">Depot-wise Stock Levels</h3>
      <p className="text-xs text-brand-muted mb-4">Sellable inventory across depots</p>
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
              color: "hsl(var(--card-foreground))",
            }}
          />
          <Bar dataKey="stock" radius={[8, 8, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={`bar-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
