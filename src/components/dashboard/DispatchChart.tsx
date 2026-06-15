import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface DispatchChartProps {
  pending?: number;
  validated?: number;
  assigned?: number;
  delivered?: number;
}

const SLICE_COLORS = ["#9ca3af", "#4f46e5", "#7c3aed", "#059669"];

export function DispatchChart({
  pending = 0,
  validated = 0,
  assigned = 0,
  delivered = 0,
}: DispatchChartProps) {
  const data = [
    { name: "Pending Validation", value: pending, color: SLICE_COLORS[0] },
    { name: "Validated", value: validated, color: SLICE_COLORS[1] },
    { name: "Assigned", value: assigned, color: SLICE_COLORS[2] },
    { name: "Delivered", value: delivered, color: SLICE_COLORS[3] },
  ].filter((d) => d.value > 0);

  const chartData = data.length > 0 ? data : [{ name: "No orders", value: 1, color: "#e5e7eb" }];

  return (
    <Card className="p-6 card-elevated border-2 border-violet-100 dark:border-violet-900/40 bg-gradient-to-br from-violet-50/50 to-card dark:from-violet-950/20">
      <h3 className="text-lg font-semibold mb-1">Order Pipeline Mix</h3>
      <p className="text-xs text-muted-foreground mb-4">Live distribution by lifecycle stage</p>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={95}
            paddingAngle={3}
            dataKey="value"
            label={({ name, percent }) =>
              percent > 0 ? `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%` : ""
            }
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
