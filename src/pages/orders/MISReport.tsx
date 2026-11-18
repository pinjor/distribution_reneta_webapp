import { useState, useEffect, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  Eye,
  FileBarChart,
  FileText,
  Filter,
  List,
  Loader2,
  MapPin,
  MapPinned,
  Package,
  Pause,
  Printer,
  RefreshCw,
  Search,
  Truck,
  User,
  UserRound,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { FilterSelect, OrderPageShell, OrderPanel, dialogContentClass, fieldClass, tableHeadClass } from "@/components/orders/orderMgmtUi";
import { NtDateField } from "@/components/theme/NtDateField";


interface MISReportMemo {
  id: number;
  order_id: number;
  order_number: string | null;
  memo_number: string | null;
  customer_name: string;
  customer_code: string | null;
  route_code: string | null;
  route_name: string | null;
  delivery_date: string;
  validated: boolean;
  validated_at: string | null;
  printed: boolean;
  printed_at: string | null;
  postponed: boolean;
  assigned: boolean;
  assigned_at: string | null;
  assigned_employee_name: string | null;
  assigned_vehicle_registration: string | null;
  loaded: boolean;
  loaded_at: string | null;
  loading_number: string | null;
  collection_status: string | null;
  collection_type: string | null;
  collected_amount: number | null;
  pending_amount: number | null;
  collection_approved: boolean;
  collection_approved_at: string | null;
  total_amount: number;
  status: string;
  created_at: string;
}

interface MISReportMemoDetail extends MISReportMemo {
  customer_id: string | null;
  pso_name: string | null;
  pso_code: string | null;
  pso_id: string | null;
  assigned_employee_id: number | null;
  assigned_employee_code: string | null;
  assigned_vehicle_id: number | null;
  assigned_vehicle_model: string | null;
  loading_date: string | null;
  delivery_status: string | null;
  collection_approved_by_name: string | null;
  collection_source: string | null;
  items: Array<{
    product_code: string;
    product_name: string;
    pack_size: string | null;
    total_quantity: number;
    delivered_quantity: number | null;
    returned_quantity: number | null;
    unit_price: number;
    discount_percent: number;
    total_price: number;
  }>;
  total_items_count: number;
  updated_at: string | null;
}

const timelineToneClass = {
  done: "border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]",
  active: "border-[#BFDBFE] bg-[#EAF2FC] text-[#0C4DA1]",
  pending: "border-[#E3EAF3] bg-[#F8FAFC] text-[#94A3B8] dark:border-[#2C3B50] dark:bg-[#1B283B]",
  warn: "border-[#FED7AA] bg-[#FFEDD5] text-[#C2410C]",
  danger: "border-[#FECACA] bg-[#FEE2E2] text-[#B91C1C]",
} as const;

function TimelineStep({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: LucideIcon;
  tone: keyof typeof timelineToneClass;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="relative z-10 flex items-start gap-3">
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", timelineToneClass[tone])}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-[13px] font-semibold text-[#172B4D] dark:text-[#F1F5F9]">{title}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-[#64748B]">{children}</p>
      </div>
    </div>
  );
}

export default function MISReport() {
  const { toast } = useToast();
  
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    document.title = "MIS Report | Renata";
  }, []);

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [routeFilter, setRouteFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedMemo, setSelectedMemo] = useState<number | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Check for memo_id in query params to auto-open detail dialog (only on mount)
  useEffect(() => {
    const memoIdParam = searchParams.get('memo_id');
    if (memoIdParam) {
      const memoId = parseInt(memoIdParam, 10);
      if (!isNaN(memoId)) {
        setSelectedMemo(memoId);
        setShowDetailDialog(true);
        // Remove query param after opening
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('memo_id');
        setSearchParams(newSearchParams, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch memos
  const { data: memosData, isLoading, refetch } = useQuery({
    queryKey: ['mis-report', startDate, endDate, statusFilter, routeFilter],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (routeFilter && routeFilter !== "all") params.route_code = routeFilter;
      const result = await apiEndpoints.orders.getMISReport(params);
      return Array.isArray(result) ? result : [];
    },
  });

  // Fetch memo detail
  const { data: memoDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['mis-report-detail', selectedMemo],
    queryFn: async () => {
      if (!selectedMemo) return null;
      return await apiEndpoints.orders.getMISReportDetail(selectedMemo);
    },
    enabled: !!selectedMemo && showDetailDialog,
  });

  const memos = memosData || [];

  // Get unique routes for filter
  const uniqueRoutes = Array.from(
    new Set(memos.map((m: MISReportMemo) => m.route_code).filter(Boolean))
  ).sort();

  // Filter by search term
  const filteredMemos = memos.filter((memo: MISReportMemo) => {
    const term = searchTerm.toLowerCase();
    return (
      (memo.memo_number || "").toLowerCase().includes(term) ||
      memo.customer_name.toLowerCase().includes(term) ||
      (memo.customer_code || "").toLowerCase().includes(term) ||
      (memo.route_code || "").toLowerCase().includes(term) ||
      (memo.route_name || "").toLowerCase().includes(term)
    );
  });

  const handleViewDetail = (memoId: number) => {
    setSelectedMemo(memoId);
    setShowDetailDialog(true);
  };

  const getStatusBadge = (memo: MISReportMemo) => {
    if (memo.postponed) {
      return <Badge variant="destructive" className="bg-rose-600">Postponed</Badge>;
    }
    if (memo.collection_status === "Fully Collected") {
      return <Badge className="bg-green-600">Fully Collected</Badge>;
    }
    if (memo.collection_status === "Partially Collected") {
      return <Badge className="bg-orange-600">Partially Collected</Badge>;
    }
    if (memo.loaded) {
      return <Badge className="bg-blue-600">Loaded</Badge>;
    }
    if (memo.assigned) {
      return <Badge className="bg-purple-600">Assigned</Badge>;
    }
    if (memo.printed) {
      return <Badge className="bg-teal-600">Printed</Badge>;
    }
    if (memo.validated) {
      return <Badge className="bg-indigo-600">Validated</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "N/A";
    return `৳${Number(amount).toFixed(2)}`;
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return "N/A";
    try {
      return format(new Date(dateStr), "dd MMM yyyy, HH:mm");
    } catch {
      return dateStr;
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "N/A";
    try {
      return format(new Date(dateStr), "dd MMM yyyy");
    } catch {
      return dateStr;
    }
  };

  return (
    <OrderPageShell>
      <OrderPanel className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64 shrink-0">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#64748B]" />
            <Input
              id="search"
              aria-label="Search"
              placeholder="Search memo, customer, route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(fieldClass, "h-8 pl-8")}
            />
          </div>
          <NtDateField
            id="start-date"
            value={startDate}
            onChange={setStartDate}
            placeholder="Start date"
            className="w-[10.75rem]"
          />
          <NtDateField
            id="end-date"
            value={endDate}
            onChange={setEndDate}
            placeholder="End date"
            className="w-[10.75rem]"
          />
          <FilterSelect
            id="status-filter"
            label="Status"
            value={statusFilter}
            onValueChange={setStatusFilter}
            placeholder="All statuses"
            icon={Clock}
            triggerClassName="w-[9.5rem] min-w-0"
            items={[
              { value: "all", label: "All statuses", icon: Clock },
              { value: "pending_validation", label: "Pending Validation", icon: Clock },
              { value: "validated", label: "Validated", icon: CheckCircle2 },
              { value: "pending_print", label: "Pending Print", icon: Clock },
              { value: "printed", label: "Printed", icon: Printer },
              { value: "assigned", label: "Assigned", icon: UserRound },
              { value: "loaded", label: "Loaded", icon: Truck },
              { value: "collected", label: "Collected", icon: Coins },
              { value: "postponed", label: "Postponed", icon: Pause },
              { value: "pending_collection", label: "Pending Collection", icon: Coins },
            ]}
          />
          <FilterSelect
            id="route-filter"
            label="Route"
            value={routeFilter}
            onValueChange={setRouteFilter}
            placeholder="All routes"
            icon={MapPinned}
            triggerClassName="w-[9.5rem] min-w-0"
            items={[
              { value: "all", label: "All routes", icon: MapPinned },
              ...uniqueRoutes.map((route) => ({
                value: route as string,
                label: String(route),
                icon: MapPinned,
              })),
            ]}
          />
          <Button type="button" variant="ntSecondary" className="!h-8 ml-auto" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </OrderPanel>

      <OrderPanel>
          <div className="flex items-center justify-between border-b border-[#E3EAF3] px-5 py-3 dark:border-[#2C3B50]">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                <FileText className="h-4 w-4 text-[#0C4DA1]" />
                Memo List
              </h2>
              <p className="mt-1 text-xs text-[#64748B] dark:text-[#A9B8CC]">
                Showing {filteredMemos.length} memo{filteredMemos.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredMemos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No memos found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your filters or date range
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold">Memo No.</TableHead>
                    <TableHead className="font-bold">Customer</TableHead>
                    <TableHead className="font-bold">Route</TableHead>
                    <TableHead className="font-bold">Delivery Date</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold">Amount</TableHead>
                    <TableHead className="font-bold">Collection</TableHead>
                    <TableHead className="font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMemos.map((memo: MISReportMemo) => (
                    <TableRow key={memo.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          {memo.memo_number || memo.order_number || `order-${memo.id}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{memo.customer_name}</div>
                          {memo.customer_code && (
                            <div className="text-sm text-muted-foreground">{memo.customer_code}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {memo.route_code && (
                          <div>
                            <div className="font-medium">{memo.route_code}</div>
                            {memo.route_name && (
                              <div className="text-sm text-muted-foreground">{memo.route_name}</div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(memo.delivery_date)}</TableCell>
                      <TableCell>{getStatusBadge(memo)}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(memo.total_amount)}
                      </TableCell>
                      <TableCell>
                        {memo.collected_amount !== null && memo.collected_amount !== undefined ? (
                          <div>
                            <div className="font-medium text-green-600">
                              {formatCurrency(memo.collected_amount)}
                            </div>
                            {memo.pending_amount && memo.pending_amount > 0 && (
                              <div className="text-sm text-muted-foreground">
                                Pending: {formatCurrency(memo.pending_amount)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetail(memo.id)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
      </OrderPanel>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className={cn(dialogContentClass, "max-w-[860px] !flex h-[min(90vh,52rem)]")}>
          <div className="border-b border-[#E3EAF3] px-5 py-4 dark:border-[#2C3B50]">
            <DialogHeader className="space-y-1 pr-6 text-left">
              <DialogTitle className="text-base font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                {memoDetail?.memo_number || memoDetail?.order_number || `order-${selectedMemo}`}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-[#64748B]">
                Lifecycle history and line items for this memo.
              </DialogDescription>
            </DialogHeader>
          </div>

          <ScrollArea
            type="always"
            className="min-h-0 flex-1"
            scrollbarClassName="w-1 border-l-0 p-0 bg-transparent [&>div]:bg-[#C5D0DC]"
          >
          <div className="px-5 py-4">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#0C4DA1]" />
              </div>
            ) : memoDetail ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-[#E3EAF3] bg-[#F8FBFF] px-4 py-3 dark:border-[#2C3B50] dark:bg-[#1B283B] sm:grid-cols-4">
                  <div>
                    <p className="text-[11px] text-[#64748B]">Customer</p>
                    <p className="text-[13px] font-semibold text-[#172B4D] dark:text-[#F1F5F9]">{memoDetail.customer_name}</p>
                    {memoDetail.customer_code && <p className="text-[12px] text-[#64748B]">{memoDetail.customer_code}</p>}
                  </div>
                  <div>
                    <p className="text-[11px] text-[#64748B]">PSO</p>
                    <p className="text-[13px] font-semibold text-[#172B4D] dark:text-[#F1F5F9]">{memoDetail.pso_name || "N/A"}</p>
                    {memoDetail.pso_code && <p className="text-[12px] text-[#64748B]">{memoDetail.pso_code}</p>}
                  </div>
                  <div>
                    <p className="text-[11px] text-[#64748B]">Route</p>
                    <p className="text-[13px] font-semibold text-[#172B4D] dark:text-[#F1F5F9]">{memoDetail.route_code || "N/A"}</p>
                    {memoDetail.route_name && <p className="text-[12px] text-[#64748B]">{memoDetail.route_name}</p>}
                  </div>
                  <div>
                    <p className="text-[11px] text-[#64748B]">Delivery date</p>
                    <p className="text-[13px] font-semibold text-[#172B4D] dark:text-[#F1F5F9]">{formatDate(memoDetail.delivery_date)}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-[#E3EAF3] px-4 py-3 dark:border-[#2C3B50]">
                  <p className="mb-3 text-[13px] font-semibold text-[#172B4D] dark:text-[#F1F5F9]">Lifecycle</p>
                  <div className="relative space-y-3">
                    <div className="absolute bottom-2 left-4 top-2 w-px bg-[#E3EAF3] dark:bg-[#2C3B50]" />
                    <TimelineStep icon={FileText} tone="active" title="1. Order Creation">
                      Created on {formatDateTime(memoDetail.created_at)}
                      {memoDetail.order_number && <> • Order: {memoDetail.order_number || `order-${memoDetail.order_id}`}</>}
                    </TimelineStep>
                    <TimelineStep icon={List} tone={!memoDetail.validated ? "warn" : "pending"} title="2. Order List (Pending)">
                      {!memoDetail.validated ? "Currently pending in Delivery Order list" : "Moved from Delivery Order list after validation"}
                    </TimelineStep>
                    <TimelineStep icon={CheckCircle2} tone={memoDetail.validated ? "done" : "pending"} title="3. Validation">
                      {memoDetail.validated
                        ? `Validated on ${formatDateTime(memoDetail.validated_at)} → Moved to Route Wise Order List`
                        : "Pending validation (stays in Delivery Order list)"}
                    </TimelineStep>
                    {memoDetail.validated && (
                      <TimelineStep icon={MapPin} tone="active" title="4. Route Wise Order List">
                        Appears in Route Wise Memo List
                        {memoDetail.route_code && <> • Route: {memoDetail.route_code}</>}
                      </TimelineStep>
                    )}
                    {memoDetail.validated && (
                      <TimelineStep icon={Printer} tone={memoDetail.printed ? "done" : "pending"} title="5. Printing">
                        {memoDetail.printed ? `Printed on ${formatDateTime(memoDetail.printed_at)}` : "Pending print"}
                      </TimelineStep>
                    )}
                    {memoDetail.assigned && (
                      <TimelineStep icon={User} tone="active" title="6. Assignment">
                        Assigned to {memoDetail.assigned_employee_name || "N/A"}
                        {memoDetail.assigned_employee_code && <> ({memoDetail.assigned_employee_code})</>}
                        {memoDetail.assigned_vehicle_registration && <> • Vehicle: {memoDetail.assigned_vehicle_registration}</>}
                        {memoDetail.assigned_at && <> • {formatDateTime(memoDetail.assigned_at)}</>}
                      </TimelineStep>
                    )}
                    {memoDetail.loaded && (
                      <TimelineStep icon={Truck} tone="active" title="7. Loading">
                        Loading #: {memoDetail.loading_number || "N/A"}
                        {memoDetail.loading_date && <> • Loading Date: {formatDate(memoDetail.loading_date)}</>}
                        {memoDetail.loaded_at && <> • Loaded at {formatDateTime(memoDetail.loaded_at)}</>}
                        <> → Appears in Loading Memo List</>
                      </TimelineStep>
                    )}
                    {memoDetail.loaded && (
                      <TimelineStep icon={CheckCircle2} tone={memoDetail.delivery_status ? "done" : "pending"} title="8. Accepted by Delivery Person">
                        {memoDetail.delivery_status
                          ? 'Accepted via Mobile App → Marked as "Accepted" in Loading Number'
                          : "Pending acceptance from mobile app (not integrated yet)"}
                      </TimelineStep>
                    )}
                    {memoDetail.delivery_status && (
                      <TimelineStep
                        icon={Package}
                        tone={
                          memoDetail.delivery_status === "Fully Delivered"
                            ? "done"
                            : memoDetail.delivery_status === "Partial Delivered"
                              ? "warn"
                              : "danger"
                        }
                        title="9. Delivery Status"
                      >
                        <span className="font-medium text-[#172B4D] dark:text-[#F1F5F9]">{memoDetail.delivery_status}</span>
                        {memoDetail.delivery_status === "Partial Delivered" && <> → Partial quantity delivered</>}
                        {memoDetail.delivery_status === "Postponed" && <> → Delivery postponed</>}
                      </TimelineStep>
                    )}
                    {(memoDetail.collection_status || memoDetail.collected_amount !== null) && (
                      <TimelineStep
                        icon={Coins}
                        tone={
                          memoDetail.collection_status === "Fully Collected"
                            ? "done"
                            : memoDetail.collection_status === "Partially Collected"
                              ? "warn"
                              : memoDetail.collection_status === "Postponed"
                                ? "danger"
                                : "pending"
                        }
                        title="10. Collection"
                      >
                        Status: {memoDetail.collection_status || "Pending"}
                        {memoDetail.collected_amount !== null && <> • Collected Amount: {formatCurrency(memoDetail.collected_amount)}</>}
                        {memoDetail.pending_amount && memoDetail.pending_amount > 0 && <> • Pending Amount: {formatCurrency(memoDetail.pending_amount)}</>}
                        {memoDetail.collection_source && <> • Source: {memoDetail.collection_source}</>}
                      </TimelineStep>
                    )}
                    {memoDetail.collection_approved && (
                      <TimelineStep icon={CheckCircle2} tone="done" title="11. Collection Approval">
                        Approved on {formatDateTime(memoDetail.collection_approved_at)}
                        {memoDetail.collection_approved_by_name && <> by {memoDetail.collection_approved_by_name}</>}
                        <> → Approved via "Approval for Collection"</>
                      </TimelineStep>
                    )}
                    {memoDetail.collection_approved && (
                      <TimelineStep icon={Coins} tone="done" title="12. Deposit">
                        {memoDetail.collected_amount !== null && memoDetail.collected_amount > 0
                          ? <>Deposit Amount: {formatCurrency(memoDetail.collected_amount)}</>
                          : "Deposit information"}
                        <> → Collection deposited through banking (BRAC/bKash/Nagad)</>
                      </TimelineStep>
                    )}
                    {memoDetail.collection_approved && memoDetail.pending_amount && memoDetail.pending_amount > 0 && (
                      <TimelineStep icon={Coins} tone="warn" title="13. Remaining Cash Return">
                        Pending Amount: {formatCurrency(memoDetail.pending_amount)}
                        <> → Returned to depot through "Approval for Collection"</>
                      </TimelineStep>
                    )}
                    {memoDetail.collection_approved && (
                      <TimelineStep icon={CheckCircle2} tone="done" title="14. Process Complete">
                        All steps completed successfully
                        {memoDetail.collection_approved_at && <> • Completed on {formatDateTime(memoDetail.collection_approved_at)}</>}
                      </TimelineStep>
                    )}
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-[#E3EAF3] dark:border-[#2C3B50]">
                  <div className="border-b border-[#E3EAF3] px-4 py-2.5 dark:border-[#2C3B50]">
                    <p className="text-[13px] font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                      Products ({memoDetail.total_items_count})
                    </p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className={tableHeadClass}>Code</TableHead>
                        <TableHead className={tableHeadClass}>Product</TableHead>
                        <TableHead className={tableHeadClass}>Pack</TableHead>
                        <TableHead className={cn(tableHeadClass, "text-right")}>Qty</TableHead>
                        <TableHead className={cn(tableHeadClass, "text-right")}>Delivered</TableHead>
                        <TableHead className={cn(tableHeadClass, "text-right")}>Returned</TableHead>
                        <TableHead className={cn(tableHeadClass, "text-right")}>Unit price</TableHead>
                        <TableHead className={cn(tableHeadClass, "text-right")}>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {memoDetail.items.map((item, index) => (
                        <TableRow key={index} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1B283B]">
                          <TableCell className="font-mono text-[13px] font-medium">{item.product_code}</TableCell>
                          <TableCell className="text-[13px]">{item.product_name}</TableCell>
                          <TableCell className="text-[13px] text-[#64748B]">{item.pack_size || "N/A"}</TableCell>
                          <TableCell className="text-right tabular-nums text-[13px]">{item.total_quantity}</TableCell>
                          <TableCell className="text-right tabular-nums text-[13px]">
                            {item.delivered_quantity !== null ? item.delivered_quantity : "N/A"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-[13px]">
                            {item.returned_quantity !== null ? item.returned_quantity : "N/A"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-[13px]">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell className="text-right tabular-nums text-[13px] font-semibold">{formatCurrency(item.total_price)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-[#F8FBFF] hover:bg-[#F8FBFF] dark:bg-[#1B283B] dark:hover:bg-[#1B283B]">
                        <TableCell colSpan={7} className="text-right text-[13px] font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                          Total amount
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[13px] font-semibold text-[#172B4D] dark:text-[#F1F5F9]">
                          {formatCurrency(memoDetail.total_amount)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-[#64748B]">Failed to load memo details</p>
            )}
          </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </OrderPageShell>
  );
}

