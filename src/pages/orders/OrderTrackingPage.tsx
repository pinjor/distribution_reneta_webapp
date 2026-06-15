import { useState, useEffect, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiEndpoints } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, PackageSearch, MapPinned, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  OrderLifecyclePipeline3D,
  getCurrentLifecycleDef,
  type LifecycleTrackingStep,
} from "@/components/orders/OrderLifecyclePipeline3D";
import { ORDER_LIFECYCLE_STEPS } from "@/lib/orderLifecycle";
import { brandLabelClasses, brandMutedClasses } from "@/lib/brandTheme";
import { cn } from "@/lib/utils";

interface TrackingResponse {
  order_id: number;
  order_number?: string;
  memo_number?: string;
  route_code?: string;
  delivery_number?: string;
  current_status?: string;
  current_stage?: string;
  current_stage_label?: string;
  steps: LifecycleTrackingStep[];
}

export default function OrderTrackingPage() {
  const { toast } = useToast();
  const [orderInput, setOrderInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tracking, setTracking] = useState<TrackingResponse | null>(null);

  useEffect(() => {
    document.title = "Order Lifecycle Tracker | Renata";
  }, []);

  const handleFetch = async () => {
    if (!orderInput.trim()) {
      toast({ title: "Enter an order ID or number", variant: "destructive" });
      return;
    }
    try {
      setLoading(true);
      const response = await apiEndpoints.orderDeliveries.track(orderInput.trim());
      setTracking(response as TrackingResponse);
    } catch (error) {
      console.error("Tracking lookup failed", error);
      toast({
        title: "Order not found",
        description: "Check the order ID, ORD number, or 8-digit memo number.",
        variant: "destructive",
      });
      setTracking(null);
    } finally {
      setLoading(false);
    }
  };

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleFetch();
  };

  const currentDef = tracking ? getCurrentLifecycleDef(tracking.steps) : null;
  const completedSteps = tracking?.steps.filter((s) => s.status === "completed").length ?? 0;

  return (
    <main className="p-6 space-y-6">
      <PageHeader
        title="Order Lifecycle Tracker"
        subtitle="Enter an order number to see where it sits in the 8-step distribution pipeline."
        icon={PackageSearch}
        variant="sky"
        actions={(
          <div className="flex gap-2 w-full sm:w-auto">
            <Input
              placeholder="Order ID / ORD number / memo number"
              value={orderInput}
              onChange={(e) => setOrderInput(e.target.value)}
              onKeyDown={onSearchKeyDown}
              className="w-full sm:w-72"
            />
            <Button onClick={handleFetch} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Track
            </Button>
          </div>
        )}
      />

      {/* Reference pipeline legend */}
      {!tracking && (
        <Card className="card-tile border-2 border-brand-from/20 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className={cn("text-base", brandLabelClasses)}>
              8-Step Distribution Lifecycle
            </CardTitle>
            <p className={cn("text-sm", brandMutedClasses)}>
              Same flow as Dashboard &amp; MIS — search an order above to highlight its current stage.
            </p>
          </CardHeader>
          <CardContent className="pb-8 pt-2">
            <OrderLifecyclePipeline3D
              steps={ORDER_LIFECYCLE_STEPS.map((s) => ({
                key: s.key,
                label: s.title,
                status: "pending",
              }))}
            />
          </CardContent>
        </Card>
      )}

      <AnimatePresence mode="wait">
        {tracking && (
          <motion.div
            key={tracking.order_id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45 }}
            className="space-y-6"
          >
            <Card className="overflow-hidden border-2 border-brand-from/25 shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-brand-tile-from via-white to-brand-tile-to">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-xl sm:text-2xl font-bold text-brand-deep">
                      {tracking.order_number || `Order #${tracking.order_id}`}
                    </CardTitle>
                    <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                      {tracking.memo_number && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-0.5 border">
                          <FileText className="h-3.5 w-3.5" />
                          Memo: {tracking.memo_number}
                        </span>
                      )}
                      {tracking.route_code && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-0.5 border">
                          <MapPinned className="h-3.5 w-3.5" />
                          Route: {tracking.route_code}
                        </span>
                      )}
                      {tracking.delivery_number && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-0.5 border">
                          DLV: {tracking.delivery_number}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-gradient-to-r from-brand-from to-brand-to text-white border-0 px-3 py-1 text-sm shadow-md">
                      Stage: {tracking.current_stage_label || currentDef?.title}
                    </Badge>
                    <Badge variant="outline" className="border-brand-from/40 text-brand-deep">
                      {completedSteps} / 8 complete
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 sm:p-8 bg-gradient-to-b from-white to-brand-tile-from/30">
                <OrderLifecyclePipeline3D steps={tracking.steps} />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {!tracking && !loading && (
        <Card className="card-tile">
          <CardContent className="grid place-items-center gap-3 py-14 text-center">
            <PackageSearch className="h-14 w-14 text-brand-from/50" />
            <div className="space-y-1 max-w-md">
              <p className={cn("text-sm font-semibold", brandLabelClasses)}>
                Track an order to view its lifecycle stage
              </p>
              <p className={cn("text-xs", brandMutedClasses)}>
                Use internal ID, order number, 8-digit memo number, or delivery reference.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
