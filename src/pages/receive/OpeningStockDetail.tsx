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
import { PageHeader } from "@/components/layout/PageHeader";
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

  return (
    <main className="p-6 space-y-6">
      <PageHeader
        title={row.requestNumber}
        subtitle="Opening stock request. Approved does not mean inventory was posted."
        icon={PackagePlus}
        variant="blue"
        actions={(
          <div className="flex gap-2">
            {row.status === "Draft" && (
              <Button variant="outline" onClick={() => navigate(`/receive/opening-stock/${row.id}/edit`)}>Edit Draft</Button>
            )}
            {canApprove && (
              <>
                <Button onClick={() => setApproveOpen(true)} disabled={busy}>Approve</Button>
                <Button variant="destructive" onClick={() => setRejectOpen(true)} disabled={busy}>Reject</Button>
              </>
            )}
            <Button variant="outline" onClick={() => navigate("/receive/opening-stock")}>Back</Button>
          </div>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Request</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Depot: {row.depotName}</p>
            <p>Requester: {row.requestedByName}</p>
            <p>Request date: {row.requestDate ? format(new Date(row.requestDate), "dd MMM yyyy HH:mm") : "—"}</p>
            <p>Opening date: {row.openingDate}</p>
            <p>Remarks: {row.remarks || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Review and posting</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Approval status: <Badge>{row.status}</Badge></p>
            <p>Posting status: <Badge variant="outline">{row.postingStatus === "posted" ? "Posted" : "Not Posted"}</Badge></p>
            <p>Inventory posted: {row.inventoryPosted ? "Yes" : "No"}</p>
            <p>Reviewer: {row.reviewedByName || "—"}</p>
            <p>Rejection reason: {row.reviewReason || "—"}</p>
            <p className="text-muted-foreground">{row.postingBlockedReason}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Product / batch lines</CardTitle></CardHeader>
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

      <Card>
        <CardHeader><CardTitle>Audit timeline</CardTitle></CardHeader>
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
