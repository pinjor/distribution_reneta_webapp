import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const DEPOT_COLORS = ["#0C4CA1", "#3D74D6", "#08357A", "#6B93D6", "#1A5FBF"];

interface StockChartProps {
  data?: Array<{ depot: string; stock: number }>;
  isLoading?: boolean;
  isError?: boolean;
}

export function StockChart({ data = [], isLoading = false, isError = false }: StockChartProps) {
  const chartData = data.filter((row) => row.depot);

  return (
    <Card className="border border-[#D5E1F2] bg-white p-6 shadow-[0_16px_40px_-28px_rgba(12,76,161,0.45)]">
      <h3 className="text-lg font-semibold mb-1">Depot-wise Stock Levels</h3>
      <p className="text-xs text-muted-foreground mb-4">Sellable inventory from the stock ledger</p>
      {isError ? (
        <p className="text-sm text-destructive py-16 text-center">Could not load depot stock.</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground py-16 text-center">Loading stock…</p>
      ) : chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground py-16 text-center">No stock records for the current depot scope.</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
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
              {chartData.map((_, index) => (
                <Cell key={`bar-${index}`} fill={DEPOT_COLORS[index % DEPOT_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
