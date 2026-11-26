import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PackagePlus, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";

type Line = {
  key: string;
  productId: string;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  quantity: string;
  unitOfMeasure: string;
  remarks: string;
};

const emptyLine = (): Line => ({
  key: Math.random().toString(36).slice(2),
  productId: "",
  batchNumber: "",
  manufacturingDate: "",
  expiryDate: "",
  quantity: "",
  unitOfMeasure: "",
  remarks: "",
});

export default function OpeningStockForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [depots, setDepots] = useState<Array<{ id: number; name: string }>>([]);
  const [products, setProducts] = useState<Array<{ id: number; name: string; code: string; sku: string; unit_of_measure?: string }>>([]);
  const [requestNumber, setRequestNumber] = useState("Assigned on save");
  const [depotId, setDepotId] = useState("");
  const [openingDate, setOpeningDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  useEffect(() => {
    apiEndpoints.depots.getAll().then((data) => setDepots(Array.isArray(data) ? data : [])).catch(() => setDepots([]));
    apiEndpoints.products.getAll().then((data) => setProducts(Array.isArray(data) ? data : [])).catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    if (!id) return;
    apiEndpoints.openingStock.getById(id).then((row) => {
      setRequestNumber(row.requestNumber);
      setDepotId(String(row.depotId));
      setOpeningDate(row.openingDate);
      setRemarks(row.remarks || "");
      setLines(
        (row.items || []).map((item: any) => ({
          key: String(item.id),
          productId: String(item.productId),
          batchNumber: item.batchNumber,
          manufacturingDate: item.manufacturingDate || "",
          expiryDate: item.expiryDate || "",
          quantity: String(item.quantity),
          unitOfMeasure: item.unitOfMeasure || "",
          remarks: item.remarks || "",
        })),
      );
    }).catch((error: any) => {
      toast({ title: "Unable to load draft", description: error?.message, variant: "destructive" });
    });
  }, [id]);

  const payload = () => ({
    depotId: Number(depotId),
    openingDate,
    remarks,
    items: lines.map((line) => ({
      productId: Number(line.productId),
      batchNumber: line.batchNumber.trim(),
      manufacturingDate: line.manufacturingDate || null,
      expiryDate: line.expiryDate,
      quantity: Number(line.quantity),
      unitOfMeasure: line.unitOfMeasure || undefined,
      remarks: line.remarks || undefined,
    })),
  });

  const validateClient = () => {
    if (!depotId) return "Depot is required";
    if (!openingDate) return "Opening date is required";
    if (!lines.length) return "Add at least one product row";
    const seen = new Set<string>();
    for (const line of lines) {
      if (!line.productId) return "Every row needs a product";
      if (!line.batchNumber.trim()) return "Every row needs a batch number";
      if (!line.expiryDate) return "Expiry date is required. Unknown-expiry stock is not accepted.";
      const qty = Number(line.quantity);
      if (!Number.isFinite(qty) || qty <= 0) return "Quantity must be greater than 0";
      const key = `${line.productId}:${line.batchNumber.trim()}`;
      if (seen.has(key)) return "Duplicate product/batch in this request";
      seen.add(key);
      if (line.manufacturingDate && line.manufacturingDate >= line.expiryDate) {
        return "Manufacturing date must be before expiry";
      }
    }
    return null;
  };

  const saveDraft = async () => {
    const problem = validateClient();
    if (problem) {
      toast({ title: problem, variant: "destructive" });
      return null;
    }
    setSaving(true);
    try {
      const body = payload();
      const saved = id
        ? await apiEndpoints.openingStock.update(id, body)
        : await apiEndpoints.openingStock.create(body);
      toast({ title: "Draft saved" });
      if (!id) navigate(`/receive/opening-stock/${saved.id}/edit`, { replace: true });
      return saved;
    } catch (error: any) {
      toast({ title: "Save failed", description: error?.message, variant: "destructive" });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    const saved = await saveDraft();
    if (!saved?.id) return;
    setSaving(true);
    try {
      await apiEndpoints.openingStock.submit(saved.id);
      toast({ title: "Submitted for admin approval" });
      navigate(`/receive/opening-stock/${saved.id}`);
    } catch (error: any) {
      toast({ title: "Submit failed", description: error?.message, variant: "destructive" });
    } finally {
      setSaving(false);
      setSubmitOpen(false);
    }
  };

  return (
    <main className="p-6 space-y-6">
      <PageHeader
        title={id ? "Edit Opening Stock Draft" : "New Opening Stock Request"}
        subtitle="Drafts do not change available, reserved, or physical stock."
        icon={PackagePlus}
        variant="blue"
      />
      <Card>
        <CardContent className="p-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Request Number</Label>
            <Input value={requestNumber} disabled />
          </div>
          <div className="space-y-2">
            <Label>Depot</Label>
            <Select value={depotId} onValueChange={setDepotId}>
              <SelectTrigger><SelectValue placeholder="Select depot" /></SelectTrigger>
              <SelectContent>
                {depots.map((depot) => (
                  <SelectItem key={depot.id} value={String(depot.id)}>{depot.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Opening Date</Label>
            <Input type="date" value={openingDate} onChange={(e) => setOpeningDate(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Remarks / Justification</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-medium">Product rows</h2>
            <Button variant="outline" onClick={() => setLines((current) => [...current, emptyLine()])}>
              <Plus className="h-4 w-4 mr-2" /> Add row
            </Button>
          </div>
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
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, index) => {
                const product = products.find((p) => String(p.id) === line.productId);
                return (
                  <TableRow key={line.key}>
                    <TableCell className="min-w-[220px]">
                      <Select
                        value={line.productId}
                        onValueChange={(value) => {
                          const next = products.find((p) => String(p.id) === value);
                          setLines((current) => current.map((row, i) => i === index ? { ...row, productId: value, unitOfMeasure: next?.unit_of_measure || row.unitOfMeasure } : row));
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
                        <SelectContent>
                          {products.map((productOption) => (
                            <SelectItem key={productOption.id} value={String(productOption.id)}>
                              {productOption.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{product?.sku || product?.code || "—"}</TableCell>
                    <TableCell><Input value={line.batchNumber} onChange={(e) => setLines((current) => current.map((row, i) => i === index ? { ...row, batchNumber: e.target.value } : row))} /></TableCell>
                    <TableCell><Input type="date" value={line.manufacturingDate} onChange={(e) => setLines((current) => current.map((row, i) => i === index ? { ...row, manufacturingDate: e.target.value } : row))} /></TableCell>
                    <TableCell><Input type="date" value={line.expiryDate} onChange={(e) => setLines((current) => current.map((row, i) => i === index ? { ...row, expiryDate: e.target.value } : row))} /></TableCell>
                    <TableCell><Input type="number" min="1" value={line.quantity} onChange={(e) => setLines((current) => current.map((row, i) => i === index ? { ...row, quantity: e.target.value } : row))} /></TableCell>
                    <TableCell><Input value={line.unitOfMeasure} onChange={(e) => setLines((current) => current.map((row, i) => i === index ? { ...row, unitOfMeasure: e.target.value } : row))} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setLines((current) => current.filter((_, i) => i !== index))} disabled={lines.length === 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex gap-2">
            <Button onClick={saveDraft} disabled={saving}>Save Draft</Button>
            <Button variant="secondary" onClick={() => { if (!validateClient()) setSubmitOpen(true); else toast({ title: validateClient() as string, variant: "destructive" }); }} disabled={saving}>
              Submit for Approval
            </Button>
            <Button variant="outline" onClick={() => navigate("/receive/opening-stock")}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
      <AlertDialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit this opening stock request for admin approval?</AlertDialogTitle>
            <AlertDialogDescription>Stock quantities will not change until an admin approves and posting is authorized.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={saving} onClick={submit}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
