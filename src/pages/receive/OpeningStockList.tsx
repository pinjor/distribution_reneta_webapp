import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Eye, Pencil, PackagePlus, RefreshCw, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiEndpoints } from "@/lib/api";

interface OpeningRow {
  id: number;
  requestNumber: string;
  depotName?: string;
  productCount: number;
  totalQuantity: number;
  requestedByName?: string;
  requestDate?: string;
  status: string;
  postingStatus: string;
  reviewedByName?: string | null;
  requestedBy: number;
}

const statusVariant = (status: string) => {
  if (status === "Approved") return "default";
  if (status === "Rejected") return "destructive";
  if (status === "Pending Approval") return "secondary";
  return "outline";
};

export default function OpeningStockList() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<OpeningRow[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const limit = 20;
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [depotId, setDepotId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [depots, setDepots] = useState<Array<{ id: number; name: string }>>([]);
  const [summary, setSummary] = useState({ total: 0, pendingApproval: 0, approved: 0, rejected: 0 });
  const [summaryError, setSummaryError] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = { skip, limit };
      if (q.trim()) params.q = q.trim();
      if (status !== "all") params.status = status;
      if (depotId !== "all") params.depot_id = Number(depotId);
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const [list, counts] = await Promise.all([
        apiEndpoints.openingStock.getAll(params),
        apiEndpoints.openingStock.summary(),
      ]);
      setRows(list.items || []);
      setTotal(list.total || 0);
      setSummary({
        total: counts.total || 0,
        pendingApproval: counts.pendingApproval || 0,
        approved: counts.approved || 0,
        rejected: counts.rejected || 0,
      });
      setSummaryError(false);
    } catch (error: any) {
      setRows([]);
      setSummaryError(true);
      toast({ title: "Unable to load opening stock", description: error?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiEndpoints.depots.getAll().then((data) => setDepots(Array.isArray(data) ? data : [])).catch(() => setDepots([]));
  }, []);

  useEffect(() => {
    load();
  }, [skip, status, depotId]);

  const submitDraft = async (id: number) => {
    try {
      await apiEndpoints.openingStock.submit(id);
      toast({ title: "Submitted for approval" });
      load();
    } catch (error: any) {
      toast({ title: "Submit failed", description: error?.message, variant: "destructive" });
    }
  };

  return (
    <main className="p-6 space-y-6">
      <PageHeader
        title="Opening Stock"
        subtitle="Create, submit and track initial stock requests. Stock is added only after admin approval."
        icon={PackagePlus}
        variant="blue"
        actions={(
          <>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => navigate("/receive/opening-stock/new")}>New Request</Button>
          </>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Requests", value: summary.total },
          { label: "Pending Approval", value: summary.pendingApproval },
          { label: "Approved", value: summary.approved },
          { label: "Rejected", value: summary.rejected },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-semibold mt-1">{summaryError ? "—" : card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Request number" className="w-[200px]" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => { setSkip(0); setStatus(v); }}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Depot</Label>
              <Select value={depotId} onValueChange={(v) => { setSkip(0); setDepotId(v); }}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All depots</SelectItem>
                  {depots.map((depot) => (
                    <SelectItem key={depot.id} value={String(depot.id)}>{depot.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <Button onClick={() => { setSkip(0); load(); }} disabled={loading}>Apply</Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request Number</TableHead>
                <TableHead>Depot</TableHead>
                <TableHead>Product Count</TableHead>
                <TableHead>Total Quantity</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Request Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Posting</TableHead>
                <TableHead>Reviewed By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={10}>Loading opening stock requests…</TableCell></TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow><TableCell colSpan={10}>No opening stock requests found.</TableCell></TableRow>
              )}
              {!loading && rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.requestNumber}</TableCell>
                  <TableCell>{row.depotName || "—"}</TableCell>
                  <TableCell>{row.productCount}</TableCell>
                  <TableCell>{row.totalQuantity}</TableCell>
                  <TableCell>{row.requestedByName || "—"}</TableCell>
                  <TableCell>{row.requestDate ? format(new Date(row.requestDate), "dd MMM yyyy") : "—"}</TableCell>
                  <TableCell><Badge variant={statusVariant(row.status)}>{row.status}</Badge></TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.postingStatus === "posted" ? "Posted" : row.postingStatus === "failed" ? "Posting Failed" : "Not Posted"}</Badge>
                  </TableCell>
                  <TableCell>{row.reviewedByName || "—"}</TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/receive/opening-stock/${row.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {row.status === "Draft" && (user?.id === row.requestedBy || user?.role === "admin") && (
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/receive/opening-stock/${row.id}/edit`)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {row.status === "Draft" && (user?.id === row.requestedBy || user?.role === "admin") && (
                      <Button size="sm" variant="ghost" onClick={() => submitDraft(row.id)}>
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{total} request(s)</span>
            <div className="space-x-2">
              <Button variant="outline" size="sm" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - limit))}>Previous</Button>
              <Button variant="outline" size="sm" disabled={skip + limit >= total} onClick={() => setSkip(skip + limit)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
