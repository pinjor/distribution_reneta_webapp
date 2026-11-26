import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { PackagePlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiEndpoints } from "@/lib/api";

export default function OpeningStockDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const load = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setRow(await apiEndpoints.openingStock.getById(id));
    } catch (error: any) {
      setRow(null);
      toast({ title: "Unable to load request", description: error?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (row?.requestNumber) {
      document.title = `${row.requestNumber} | Renata`;
    } else {
      document.title = "Opening Stock | Renata";
    }
  }, [row?.requestNumber]);

  const isAdmin = (user?.role || "").toLowerCase() === "admin";
  const canApprove = isAdmin && row?.status === "Pending Approval" && row?.requestedBy !== user?.id;

  const approve = async () => {
    if (!id || busy) return;
    setBusy(true);
    try {
      const saved = await apiEndpoints.openingStock.approve(id);
      setRow(saved);
      toast({ title: "Request approved", description: "Inventory was not posted. Posting remains blocked until policy sign-off." });
    } catch (error: any) {
      toast({ title: "Approve failed", description: error?.message, variant: "destructive" });
    } finally {
      setBusy(false);
      setApproveOpen(false);
    }
  };

  const reject = async () => {
    if (!id || busy) return;
    if (!reason.trim()) {
      toast({ title: "Rejection remarks are required", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const saved = await apiEndpoints.openingStock.reject(id, reason.trim());
      setRow(saved);
      toast({ title: "Request rejected" });
    } catch (error: any) {
      toast({ title: "Reject failed", description: error?.message, variant: "destructive" });
    } finally {
      setBusy(false);
      setRejectOpen(false);
    }
  };

  if (loading) {
    return <main className="p-6">Loading opening stock request…</main>;
  }
  if (!row) {
    return <main className="p-6">Opening stock request was not found.</main>;
  }

  const cardClass =
    "card-elevated overflow-hidden border border-[#D5E1F2] bg-white shadow-[0_16px_40px_-28px_rgba(12,76,161,0.45)]";
  const outlineBtn =
    "border-[#0C4CA1] bg-white text-[#0C4CA1] hover:bg-[#E7EEF8] hover:text-[#08357A]";
  const primaryBtn = "bg-[#0C4CA1] text-white hover:bg-[#08357A]";

  return (
    <main className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {row.status === "Draft" && (
          <Button variant="outline" size="sm" className={outlineBtn} onClick={() => navigate(`/receive/opening-stock/${row.id}/edit`)}>Edit Draft</Button>
        )}
        {canApprove && (
          <>
            <Button size="sm" className={primaryBtn} onClick={() => setApproveOpen(true)} disabled={busy}>Approve</Button>
            <Button variant="destructive" size="sm" onClick={() => setRejectOpen(true)} disabled={busy}>Reject</Button>
          </>
        )}
        <Button variant="outline" size="sm" className={outlineBtn} onClick={() => navigate("/receive/opening-stock")}>Back</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0C4CA1] text-white shadow-[0_8px_16px_-10px_rgba(12,76,161,0.9)]">
                <PackagePlus className="h-4 w-4" />
              </div>
              <div>
                <span className="block text-[#0C4CA1]">{row.requestNumber}</span>
                <span className="text-sm font-normal text-[#2C4A73]">Request</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[#0B1B33]">
            <p>Depot: {row.depotName}</p>
            <p>Requester: {row.requestedByName}</p>
            <p>Request date: {row.requestDate ? format(new Date(row.requestDate), "dd MMM yyyy HH:mm") : "—"}</p>
            <p>Opening date: {row.openingDate}</p>
            <p>Remarks: {row.remarks || "—"}</p>
          </CardContent>
        </Card>
        <Card className={cardClass}>
          <CardHeader><CardTitle className="text-[#0C4CA1]">Review and posting</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-[#0B1B33]">
            <p>Approval status: <Badge>{row.status}</Badge></p>
            <p>Posting status: <Badge variant="outline">{row.postingStatus === "posted" ? "Posted" : "Not Posted"}</Badge></p>
            <p>Inventory posted: {row.inventoryPosted ? "Yes" : "No"}</p>
            <p>Reviewer: {row.reviewedByName || "—"}</p>
            <p>Rejection reason: {row.reviewReason || "—"}</p>
            <p className="text-muted-foreground">{row.postingBlockedReason}</p>
          </CardContent>
        </Card>
      </div>

      <Card className={cardClass}>
        <CardHeader><CardTitle className="text-[#0C4CA1]">Product / batch lines</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Mfg</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>UoM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(row.items || []).map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.productName}</TableCell>
                  <TableCell>{item.sku || item.productCode}</TableCell>
                  <TableCell>{item.batchNumber}</TableCell>
                  <TableCell>{item.manufacturingDate || "—"}</TableCell>
                  <TableCell>{item.expiryDate}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.unitOfMeasure || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-4 text-sm">Total quantity: {row.totalQuantity}</p>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader><CardTitle className="text-[#0C4CA1]">Audit timeline</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(row.history || []).length === 0 && <p className="text-sm text-muted-foreground">No history yet.</p>}
          {(row.history || []).map((event: any) => (
            <div key={event.id} className="text-sm border-b pb-2">
              <p className="font-medium">{event.action} → {event.toStatus}</p>
              <p>{event.actorName} · {event.createdAt ? format(new Date(event.createdAt), "dd MMM yyyy HH:mm") : ""}</p>
              {event.note && <p className="text-muted-foreground">{event.note}</p>}
            </div>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve this opening stock request?</AlertDialogTitle>
            <AlertDialogDescription>
              Approval records the administrative decision. Physical inventory posting is not authorized on this environment, so on-hand and available quantities will not increase.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={approve}>Approve</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this opening stock request?</AlertDialogTitle>
            <AlertDialogDescription>Inventory will not change. A rejection reason is required.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Rejection remarks</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy || !reason.trim()} onClick={reject}>Reject</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
