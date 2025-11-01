import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const expiryData = [
  { product: "Paracetamol 500mg", batch: "PCM2024-11", expiry: "2025-01-15", days: 7, severity: "error" },
  { product: "Amoxicillin 250mg", batch: "AMX2024-08", expiry: "2025-01-20", days: 12, severity: "warning" },
  { product: "Ibuprofen 400mg", batch: "IBU2024-09", expiry: "2025-01-25", days: 17, severity: "warning" },
  { product: "Vitamin C 1000mg", batch: "VTC2024-12", expiry: "2025-02-01", days: 24, severity: "info" },
  { product: "Aspirin 100mg", batch: "ASP2024-10", expiry: "2025-02-05", days: 28, severity: "info" },
];

export function ExpiryAlerts() {
  return (
    <Card className="p-6 card-elevated">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Expiry Alerts</h3>
        <Button variant="ghost" size="sm">View All</Button>
      </div>
      <div className="space-y-3">
        {expiryData.map((item, index) => (
          <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
            <AlertCircle
              className={`h-5 w-5 mt-0.5 ${
                item.severity === "error"
                  ? "text-destructive"
                  : item.severity === "warning"
                  ? "text-warning"
                  : "text-info"
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.product}</p>
              <p className="text-xs text-muted-foreground">Batch: {item.batch}</p>
              <p className="text-xs text-muted-foreground">Expires: {item.expiry}</p>
            </div>
            <div className="text-right">
              <span
                className={`text-xs font-medium ${
                  item.severity === "error"
                    ? "text-destructive"
                    : item.severity === "warning"
                    ? "text-warning"
                    : "text-info"
                }`}
              >
                {item.days} days
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
