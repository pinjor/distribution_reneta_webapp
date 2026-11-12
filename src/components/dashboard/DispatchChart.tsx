import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useTheme } from "@/contexts/ThemeContext";

interface DispatchChartProps {
  pending?: number;
  validated?: number;
  assigned?: number;
  delivered?: number;
}

const SLICE_COLORS_LIGHT = ["#64748B", "#0C4DA1", "#2874C7", "#093D82"];
const SLICE_COLORS_DARK = ["#A9B8CC", "#70ADFF", "#4594E8", "#9AC6FF"];

export function DispatchChart({
  pending = 0,
  validated = 0,
  assigned = 0,
  delivered = 0,
}: DispatchChartProps) {
  const { theme } = useTheme();
  const slices = theme === "dark" ? SLICE_COLORS_DARK : SLICE_COLORS_LIGHT;

  const data = [
    { name: "Pending Validation", value: pending, color: slices[0] },
    { name: "Validated", value: validated, color: slices[1] },
    { name: "Assigned", value: assigned, color: slices[2] },
    { name: "Delivered", value: delivered, color: slices[3] },
  ].filter((d) => d.value > 0);

  const chartData =
    data.length > 0
      ? data
      : [{ name: "No orders", value: 1, color: theme === "dark" ? "#2C3B50" : "#E2E8F0" }];

  return (
    <Card className="p-6 card-elevated border-2 border-brand-from/20 bg-card">
      <h3 className="text-lg font-semibold mb-1 text-brand-deep">Order Pipeline Mix</h3>
      <p className="text-xs text-brand-muted mb-4">Live distribution by lifecycle stage</p>
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
              color: "hsl(var(--card-foreground))",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
