import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiEndpoints } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Search,
  CheckCircle2,
  Clock4,
  MinusCircle,
  MoveRight,
  PackageSearch,
  MapPinned,
  ArrowRight,
} from "lucide-react";

interface TrackingNode {
  key: string;
  label: string;
  status: string;
  timestamp?: string;
}

interface TrackingResponse {
  order_id: number;
  order_number?: string;
  delivery_number?: string;
  current_status: string;
  steps: TrackingNode[];
}

const statusStyles: Record<
  string,
  {
    ring: string;
    iconBg: string;
    iconColor: string;
    label: string;
  }
> = {
  completed: {
    ring: "border-emerald-500 bg-emerald-50",
    iconBg: "bg-emerald-500",
    iconColor: "text-white",
    label: "Completed",
  },
  current: {
    ring: "border-sky-500 bg-sky-50 shadow-sky-200",
    iconBg: "bg-sky-500",
    iconColor: "text-white",
    label: "In Progress",
  },
  blocked: {
    ring: "border-red-500 bg-red-50",
    iconBg: "bg-red-500",
    iconColor: "text-white",
    label: "Blocked",
  },
  pending: {
    ring: "border-muted-foreground/40 bg-muted",
    iconBg: "bg-muted-foreground/30",
    iconColor: "text-muted-foreground",
    label: "Pending",
  },
};

const infoPills = [
  { title: "Fulfillment", caption: "Order processing + logistics", Icon: PackageSearch },
  { title: "Delivery flow", caption: "Packing → Loading → Shipping", Icon: MapPinned },
];

export default function OrderTrackingPage() {
  const { toast } = useToast();
  const [orderInput, setOrderInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tracking, setTracking] = useState<TrackingResponse | null>(null);

  const handleFetch = async () => {
    if (!orderInput) {
      toast({ title: "Enter an order ID or number", variant: "destructive" });
      return;
    }
    try {
      setLoading(true);
      const response = await apiEndpoints.deliveryOrders.track(orderInput.trim());
      setTracking(response);
    } catch (error) {
      console.error("Tracking lookup failed", error);
      toast({ title: "Order not found", description: "Check the ID or order number.", variant: "destructive" });
      setTracking(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Order Fulfillment Tracker</h1>
          <p className="text-muted-foreground">
            Follow an order across packing, loading, shipment, and delivery with live status updates.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Enter order ID / number / delivery"
            value={orderInput}
            onChange={(e) => setOrderInput(e.target.value)}
            className="w-60"
          />
          <Button onClick={handleFetch} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
            Track
          </Button>
        </div>
      </header>

      {tracking ? (
        <Card>
          <CardHeader className="flex flex-col gap-3 border-b bg-gradient-to-r from-muted/70 via-muted/40 to-background sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl font-semibold text-foreground">
                Order #{tracking.order_number || tracking.order_id}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Delivery reference: {tracking.delivery_number || "Pending"}
              </p>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              Current status: {tracking.current_status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-[260px_1fr]">
              <div className="space-y-3">
                <div className="rounded-xl border bg-background p-4 shadow-sm">
                  <p className="text-sm font-semibold text-foreground">Snapshot</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Updated {new Date().toLocaleString()} — statuses refresh as warehouse teams advance the delivery.
                  </p>
                  <div className="mt-4 space-y-2 text-sm">
                    {infoPills.map(({ title, caption, Icon }) => (
                      <div key={title} className="flex items-start gap-3 rounded-lg border border-dashed border-muted-foreground/30 p-3">
                        <div className="rounded-full bg-muted px-2 py-1">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{title}</p>
                          <p className="text-xs text-muted-foreground">{caption}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-background p-6">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Process flow
                </p>
                <div className="mt-4">
                  <div className="grid gap-4 md:grid-cols-6">
                    {tracking.steps.map((step, index) => {
                      const style = statusStyles[step.status] ?? statusStyles.pending;
                      const timestamp = step.timestamp
                        ? new Date(step.timestamp).toLocaleString()
                        : "Awaiting update";
                      const Icon = step.status === "completed" ? CheckCircle2 : step.status === "current" ? MoveRight : step.status === "blocked" ? MinusCircle : Clock4;

                      return (
                        <div key={step.key} className="flex flex-col items-center text-center">
                          <div className="relative flex items-center justify-center">
                            <div
                              className={`flex h-20 w-20 items-center justify-center rounded-full border-4 ${style.ring} shadow-sm transition-all duration-300`}
                            >
                              <span className={`flex h-10 w-10 items-center justify-center rounded-full ${style.iconBg}`}>
                                <Icon className={`h-5 w-5 ${style.iconColor}`} />
                              </span>
                            </div>
                            {index < tracking.steps.length - 1 && (
                              <span className="absolute left-[110%] top-1/2 hidden h-0.5 w-10 -translate-y-1/2 rounded-full bg-border md:block" />
                            )}
                          </div>
                          <div className="mt-3 space-y-1">
                            <p className="text-sm font-semibold text-foreground">{step.label}</p>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{style.label}</p>
                            <p className="text-xs text-muted-foreground/80">{timestamp}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-semibold text-foreground">Completed</p>
                        <p>Milestones finished successfully.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-white">
                        <MoveRight className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-semibold text-foreground">In Progress</p>
                        <p>Current warehouse activity.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted-foreground/30 text-muted-foreground">
                        <Clock4 className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-semibold text-foreground">Pending</p>
                        <p>Awaiting previous step completion.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white">
                        <MinusCircle className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-semibold text-foreground">Blocked</p>
                        <p>Requires intervention before continuing.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="grid place-items-center gap-3 py-16 text-center text-muted-foreground">
            <PackageSearch className="h-12 w-12 text-muted-foreground/60" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Track an order to view the process flow</p>
              <p className="text-xs">Use an internal ID, an `ORD-` number, or the delivery `DLV-` reference.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
