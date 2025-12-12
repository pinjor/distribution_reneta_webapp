import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { 
  Search, 
  RefreshCw,
  Loader2,
  FileText,
  DollarSign,
  Coins,
  Download,
  User,
  TrendingUp,
  Calendar,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CollectionReport {
  collection_person_id: number;
  collection_person_name: string;
  total_collected: number;
  total_deposited: number;
  total_pending: number;
  transaction_count: number;
  deposits: CollectionDeposit[];
  transactions: CollectionTransaction[];
}

interface CollectionDeposit {
  id: number;
  deposit_number: string;
  deposit_date: string;
  deposit_method: string;
  deposit_amount: number;
  transaction_number: string;
  approved: boolean;
}

interface CollectionTransaction {
  id: number;
  order_id: number;
  order_number?: string;
  memo_number?: string;
  customer_name?: string;
  collection_date: string;
  collection_type: string;
  collected_amount: number;
  pending_amount: number;
  total_amount: number;
}

export default function CollectionReports() {
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Collection Reports | Renata";
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedPersons, setExpandedPersons] = useState<Set<number>>(new Set());

  const { data: reportsData, isLoading, refetch } = useQuery({
    queryKey: ['billing-reports', startDate, endDate],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const result = await apiEndpoints.billing.reports.getAll(params);
      return Array.isArray(result) ? result : [];
    },
  });

  const reports = reportsData || [];

  const filteredReports = reports.filter((report: CollectionReport) => {
    const term = searchTerm.toLowerCase();
    return report.collection_person_name.toLowerCase().includes(term);
  });

  const togglePerson = (personId: number) => {
    setExpandedPersons((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(personId)) {
        newSet.delete(personId);
      } else {
        newSet.add(personId);
      }
      return newSet;
    });
  };

  const getTotalStats = () => {
    const totals = reports.reduce(
      (acc, report) => ({
        total_collected: acc.total_collected + Number(report.total_collected),
        total_deposited: acc.total_deposited + Number(report.total_deposited),
        total_pending: acc.total_pending + Number(report.total_pending),
        transaction_count: acc.transaction_count + report.transaction_count,
      }),
      { total_collected: 0, total_deposited: 0, total_pending: 0, transaction_count: 0 }
    );
    return totals;
  };

  const totals = getTotalStats();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Collection Reports</h1>
          <p className="text-muted-foreground mt-1">
            View collection history and statistics by collection person
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Collected</p>
                <p className="text-2xl font-bold">৳{totals.total_collected.toFixed(2)}</p>
              </div>
              <Coins className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Deposited</p>
                <p className="text-2xl font-bold">৳{totals.total_deposited.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pending</p>
                <p className="text-2xl font-bold">৳{totals.total_pending.toFixed(2)}</p>
              </div>
              <FileText className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold">{totals.transaction_count}</p>
              </div>
              <User className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search Collection Person</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setSearchTerm("");
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Person Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No reports found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report: CollectionReport) => {
                const isExpanded = expandedPersons.has(report.collection_person_id);
                return (
                  <Collapsible
                    key={report.collection_person_id}
                    open={isExpanded}
                    onOpenChange={() => togglePerson(report.collection_person_id)}
                  >
                    <Card>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5" />
                              ) : (
                                <ChevronRight className="h-5 w-5" />
                              )}
                              <div>
                                <CardTitle className="text-lg">{report.collection_person_name}</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {report.transaction_count} transactions
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6 text-right">
                              <div>
                                <p className="text-sm text-muted-foreground">Collected</p>
                                <p className="text-lg font-semibold text-green-600">
                                  ৳{Number(report.total_collected).toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Deposited</p>
                                <p className="text-lg font-semibold text-blue-600">
                                  ৳{Number(report.total_deposited).toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Pending</p>
                                <p className="text-lg font-semibold text-orange-600">
                                  ৳{Number(report.total_pending).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-6">
                          {/* Deposits Table */}
                          {report.deposits.length > 0 && (
                            <div>
                              <h3 className="font-semibold mb-3">Deposits</h3>
                              <div className="rounded-md border">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Deposit Number</TableHead>
                                      <TableHead>Date</TableHead>
                                      <TableHead>Method</TableHead>
                                      <TableHead>Transaction Number</TableHead>
                                      <TableHead className="text-right">Amount</TableHead>
                                      <TableHead>Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {report.deposits.map((deposit) => (
                                      <TableRow key={deposit.id}>
                                        <TableCell className="font-medium">{deposit.deposit_number}</TableCell>
                                        <TableCell>{format(new Date(deposit.deposit_date), "MMM dd, yyyy")}</TableCell>
                                        <TableCell>
                                          <Badge variant="outline">{deposit.deposit_method}</Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">{deposit.transaction_number}</TableCell>
                                        <TableCell className="text-right font-medium">
                                          ৳{Number(deposit.deposit_amount).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                          {deposit.approved ? (
                                            <Badge className="bg-green-600">Approved</Badge>
                                          ) : (
                                            <Badge variant="outline">Pending</Badge>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}

                          {/* Transactions Table */}
                          {report.transactions.length > 0 && (
                            <div>
                              <h3 className="font-semibold mb-3">Transactions</h3>
                              <div className="rounded-md border">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Memo No.</TableHead>
                                      <TableHead>Order No.</TableHead>
                                      <TableHead>Customer</TableHead>
                                      <TableHead>Date</TableHead>
                                      <TableHead>Type</TableHead>
                                      <TableHead className="text-right">Total</TableHead>
                                      <TableHead className="text-right">Collected</TableHead>
                                      <TableHead className="text-right">Pending</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {report.transactions.map((transaction) => (
                                      <TableRow key={transaction.id}>
                                        <TableCell className="font-medium">
                                          {transaction.memo_number || "—"}
                                        </TableCell>
                                        <TableCell>{transaction.order_number || "—"}</TableCell>
                                        <TableCell>{transaction.customer_name || "—"}</TableCell>
                                        <TableCell>{format(new Date(transaction.collection_date), "MMM dd, yyyy")}</TableCell>
                                        <TableCell>
                                          <Badge
                                            variant={
                                              transaction.collection_type === "Fully Collected"
                                                ? "default"
                                                : "outline"
                                            }
                                          >
                                            {transaction.collection_type}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          ৳{Number(transaction.total_amount).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right text-green-600 font-medium">
                                          ৳{Number(transaction.collected_amount).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right text-orange-600">
                                          ৳{Number(transaction.pending_amount).toFixed(2)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

