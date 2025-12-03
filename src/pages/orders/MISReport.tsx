import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { 
  Search, 
  Filter,
  Eye,
  Calendar,
  FileText,
  Truck,
  Package,
  CheckCircle2,
  Clock,
  XCircle,
  DollarSign,
  MapPin,
  User,
  Printer,
  Loader2,
  RefreshCw,
  List,
} from "lucide-react";
import { format } from "date-fns";

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

export default function MISReport() {
  const { toast } = useToast();
  
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
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 2,
    }).format(amount);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            MIS Report
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive memo lifecycle tracking and analytics
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters Card */}
      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            Filters
          </CardTitle>
          <CardDescription>Filter memos by date range, status, and route</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="start-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Start Date
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="end-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                End Date
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="status-filter" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Status
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_validation">Pending Validation</SelectItem>
                  <SelectItem value="validated">Validated</SelectItem>
                  <SelectItem value="pending_print">Pending Print</SelectItem>
                  <SelectItem value="printed">Printed</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="loaded">Loaded</SelectItem>
                  <SelectItem value="collected">Collected</SelectItem>
                  <SelectItem value="postponed">Postponed</SelectItem>
                  <SelectItem value="pending_collection">Pending Collection</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Route Filter */}
            <div className="space-y-2">
              <Label htmlFor="route-filter" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Route
              </Label>
              <Select value={routeFilter} onValueChange={setRouteFilter}>
                <SelectTrigger id="route-filter">
                  <SelectValue placeholder="All Routes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Routes</SelectItem>
                  {uniqueRoutes.map((route) => (
                    <SelectItem key={route} value={route as string}>
                      {route}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4">
            <Label htmlFor="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </Label>
            <Input
              id="search"
              placeholder="Search by memo number, customer, route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Memos List Card */}
      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Memo List
              </CardTitle>
              <CardDescription className="mt-1">
                Showing {filteredMemos.length} memo{filteredMemos.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
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
                          {memo.memo_number || memo.order_number || `#${memo.id}`}
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
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              Memo Details - {memoDetail?.memo_number || memoDetail?.order_number || `#${selectedMemo}`}
            </DialogTitle>
            <DialogDescription>
              Complete lifecycle history and transaction details
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : memoDetail ? (
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Customer</Label>
                      <p className="font-medium">{memoDetail.customer_name}</p>
                      {memoDetail.customer_code && (
                        <p className="text-sm text-muted-foreground">{memoDetail.customer_code}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">PSO</Label>
                      <p className="font-medium">{memoDetail.pso_name || "N/A"}</p>
                      {memoDetail.pso_code && (
                        <p className="text-sm text-muted-foreground">{memoDetail.pso_code}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Route</Label>
                      <p className="font-medium">{memoDetail.route_code || "N/A"}</p>
                      {memoDetail.route_name && (
                        <p className="text-sm text-muted-foreground">{memoDetail.route_name}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Delivery Date</Label>
                      <p className="font-medium">{formatDate(memoDetail.delivery_date)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lifecycle Timeline */}
              <Card>
                <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Complete Lifecycle Timeline
                  </CardTitle>
                  <CardDescription>
                    Full process flow from order creation to completion
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4 relative">
                    {/* Connecting Line */}
                    <div className="absolute left-6 top-12 bottom-4 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-green-200"></div>
                    
                    {/* Step 1: Order Creation */}
                    <div className="flex items-start gap-4 relative z-10">
                      <div className="p-2 rounded-full bg-indigo-100 text-indigo-600 border-2 border-indigo-300">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm">1. Order Creation</div>
                        <div className="text-sm text-muted-foreground">
                          Created on {formatDateTime(memoDetail.created_at)}
                          {memoDetail.order_number && (
                            <> • Order #: {memoDetail.order_number}</>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Step 2: Order List (Pending) */}
                    <div className="flex items-start gap-4 relative z-10">
                      <div className={`p-2 rounded-full border-2 ${
                        !memoDetail.validated ? 'bg-yellow-100 text-yellow-600 border-yellow-300' : 'bg-gray-100 text-gray-400 border-gray-300'
                      }`}>
                        <List className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm">2. Order List (Pending)</div>
                        <div className="text-sm text-muted-foreground">
                          {!memoDetail.validated ? (
                            <>Currently pending in Delivery Order list</>
                          ) : (
                            <>Moved from Delivery Order list after validation</>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Validation */}
                    <div className="flex items-start gap-4 relative z-10">
                      <div className={`p-2 rounded-full border-2 ${memoDetail.validated ? 'bg-green-100 text-green-600 border-green-300' : 'bg-gray-100 text-gray-400 border-gray-300'}`}>
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm">3. Validation</div>
                        <div className="text-sm text-muted-foreground">
                          {memoDetail.validated ? (
                            <>Validated on {formatDateTime(memoDetail.validated_at)} → Moved to Route Wise Order List</>
                          ) : (
                            "Pending validation (stays in Delivery Order list)"
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Step 4: Route Wise Order List */}
                    {memoDetail.validated && (
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="p-2 rounded-full bg-indigo-100 text-indigo-600 border-2 border-indigo-300">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm">4. Route Wise Order List</div>
                          <div className="text-sm text-muted-foreground">
                            Appears in Route Wise Memo List
                            {memoDetail.route_code && (
                              <> • Route: {memoDetail.route_code}</>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 5: Printing */}
                    {memoDetail.validated && (
                      <div className="flex items-start gap-4 relative z-10">
                        <div className={`p-2 rounded-full border-2 ${memoDetail.printed ? 'bg-teal-100 text-teal-600 border-teal-300' : 'bg-gray-100 text-gray-400 border-gray-300'}`}>
                          <Printer className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm">5. Printing</div>
                          <div className="text-sm text-muted-foreground">
                            {memoDetail.printed ? (
                              <>Printed on {formatDateTime(memoDetail.printed_at)}</>
                            ) : (
                              "Pending print"
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 6: Assignment */}
                    {memoDetail.assigned && (
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="p-2 rounded-full bg-purple-100 text-purple-600 border-2 border-purple-300">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm">6. Assignment</div>
                          <div className="text-sm text-muted-foreground">
                            Assigned to {memoDetail.assigned_employee_name || "N/A"}
                            {memoDetail.assigned_employee_code && (
                              <> ({memoDetail.assigned_employee_code})</>
                            )}
                            {memoDetail.assigned_vehicle_registration && (
                              <> • Vehicle: {memoDetail.assigned_vehicle_registration}</>
                            )}
                            {memoDetail.assigned_at && (
                              <> • {formatDateTime(memoDetail.assigned_at)}</>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 7: Loading */}
                    {memoDetail.loaded && (
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="p-2 rounded-full bg-blue-100 text-blue-600 border-2 border-blue-300">
                          <Truck className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm">7. Loading</div>
                          <div className="text-sm text-muted-foreground">
                            Loading #: {memoDetail.loading_number || "N/A"}
                            {memoDetail.loading_date && (
                              <> • Loading Date: {formatDate(memoDetail.loading_date)}</>
                            )}
                            {memoDetail.loaded_at && (
                              <> • Loaded at {formatDateTime(memoDetail.loaded_at)}</>
                            )}
                            <> → Appears in Loading Memo List</>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 8: Accepted (from Mobile App) */}
                    {memoDetail.loaded && (
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="p-2 rounded-full bg-emerald-100 text-emerald-600 border-2 border-emerald-300">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm">8. Accepted by Delivery Person</div>
                          <div className="text-sm text-muted-foreground">
                            {memoDetail.delivery_status ? (
                              <>Accepted via Mobile App → Marked as "Accepted" in Loading Number</>
                            ) : (
                              "Pending acceptance from mobile app (not integrated yet)"
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 9: Delivery Status */}
                    {memoDetail.delivery_status && (
                      <div className="flex items-start gap-4 relative z-10">
                        <div className={`p-2 rounded-full border-2 ${
                          memoDetail.delivery_status === "Fully Delivered" ? 'bg-green-100 text-green-600 border-green-300' :
                          memoDetail.delivery_status === "Partial Delivered" ? 'bg-orange-100 text-orange-600 border-orange-300' :
                          'bg-rose-100 text-rose-600 border-rose-300'
                        }`}>
                          <Package className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm">9. Delivery Status</div>
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">{memoDetail.delivery_status}</span>
                            {memoDetail.delivery_status === "Partial Delivered" && (
                              <> → Partial quantity delivered</>
                            )}
                            {memoDetail.delivery_status === "Postponed" && (
                              <> → Delivery postponed</>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 10: Collection */}
                    {(memoDetail.collection_status || memoDetail.collected_amount !== null) && (
                      <div className="flex items-start gap-4 relative z-10">
                        <div className={`p-2 rounded-full border-2 ${
                          memoDetail.collection_status === "Fully Collected" ? 'bg-green-100 text-green-600 border-green-300' :
                          memoDetail.collection_status === "Partially Collected" ? 'bg-orange-100 text-orange-600 border-orange-300' :
                          memoDetail.collection_status === "Postponed" ? 'bg-rose-100 text-rose-600 border-rose-300' :
                          'bg-gray-100 text-gray-400 border-gray-300'
                        }`}>
                          <DollarSign className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm">10. Collection</div>
                          <div className="text-sm text-muted-foreground">
                            Status: {memoDetail.collection_status || "Pending"}
                            {memoDetail.collected_amount !== null && (
                              <> • Collected Amount: {formatCurrency(memoDetail.collected_amount)}</>
                            )}
                            {memoDetail.pending_amount && memoDetail.pending_amount > 0 && (
                              <> • Pending Amount: {formatCurrency(memoDetail.pending_amount)}</>
                            )}
                            {memoDetail.collection_source && (
                              <> • Source: {memoDetail.collection_source}</>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 11: Collection Approval */}
                    {memoDetail.collection_approved && (
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="p-2 rounded-full bg-blue-100 text-blue-600 border-2 border-blue-300">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm">11. Collection Approval</div>
                          <div className="text-sm text-muted-foreground">
                            Approved on {formatDateTime(memoDetail.collection_approved_at)}
                            {memoDetail.collection_approved_by_name && (
                              <> by {memoDetail.collection_approved_by_name}</>
                            )}
                            <> → Approved via "Approval for Collection"</>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 12: Deposit */}
                    {memoDetail.collection_approved && (
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="p-2 rounded-full bg-green-100 text-green-600 border-2 border-green-300">
                          <DollarSign className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm">12. Deposit</div>
                          <div className="text-sm text-muted-foreground">
                            {memoDetail.collected_amount !== null && memoDetail.collected_amount > 0 ? (
                              <>Deposit Amount: {formatCurrency(memoDetail.collected_amount)}</>
                            ) : (
                              "Deposit information"
                            )}
                            <> → Collection deposited through banking (BRAC/bKash/Nagad)</>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 13: Remaining Cash Return */}
                    {memoDetail.collection_approved && memoDetail.pending_amount && memoDetail.pending_amount > 0 && (
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="p-2 rounded-full bg-yellow-100 text-yellow-600 border-2 border-yellow-300">
                          <DollarSign className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm">13. Remaining Cash Return</div>
                          <div className="text-sm text-muted-foreground">
                            Pending Amount: {formatCurrency(memoDetail.pending_amount)}
                            <> → Returned to depot through "Approval for Collection"</>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 14: Process Complete */}
                    {memoDetail.collection_approved && (
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="p-2 rounded-full bg-green-100 text-green-600 border-2 border-green-300">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-green-700">14. Process Complete</div>
                          <div className="text-sm text-muted-foreground">
                            All steps completed successfully
                            {memoDetail.collection_approved_at && (
                              <> • Completed on {formatDateTime(memoDetail.collection_approved_at)}</>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Products */}
              <Card>
                <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Products ({memoDetail.total_items_count})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product Code</TableHead>
                          <TableHead>Product Name</TableHead>
                          <TableHead>Pack Size</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Delivered</TableHead>
                          <TableHead className="text-right">Returned</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {memoDetail.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.product_code}</TableCell>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell>{item.pack_size || "N/A"}</TableCell>
                            <TableCell className="text-right">{item.total_quantity}</TableCell>
                            <TableCell className="text-right">
                              {item.delivered_quantity !== null ? item.delivered_quantity : "N/A"}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.returned_quantity !== null ? item.returned_quantity : "N/A"}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.unit_price)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.total_price)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold bg-muted/50">
                          <TableCell colSpan={7} className="text-right">Total Amount:</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(memoDetail.total_amount)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load memo details
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

