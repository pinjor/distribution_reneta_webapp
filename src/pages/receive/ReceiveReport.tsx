import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiEndpoints } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface ReceiptReport {
  id: number;
  receipt_number: string;
  source_type: string;
  issued_date?: string;
  tfa_number?: string;
  iso_number?: string;
  shipment_mode?: string;
  delivery_person?: string;
  vehicle_info?: string;
  vat_number?: string;
  to_address?: string;
  items: Array<{
    legacy_code?: string;
    item_code?: string;
    item_name: string;
    pack_size?: string;
    uom?: string;
    expiry_date?: string;
    batch_number?: string;
    number_of_ifc?: number;
    depot_quantity?: number;
    ifc_per_full_mc?: number;
    number_of_full_mc?: number;
    ifc_in_loose_mc?: number;
  }>;
}

export default function ReceiveReport() {
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptReport | null>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await apiEndpoints.productReceipts.report(id);
        if (!mounted) return;
        setReceipt(data);
      } catch (error) {
        console.error("Failed to load report", error);
        toast({ title: "Unable to load report", variant: "destructive" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, toast]);

  const handlePrint = () => {
    window.print();
  };

  if (loading || !receipt) {
    return (
      <main className="p-6 space-y-4">
        <p className="text-muted-foreground">Loading receipt...</p>
      </main>
    );
  }

  const totalQuantity = receipt.items.reduce((sum, item) => sum + (item.depot_quantity || 0), 0);

  return (
    <main className="p-6 space-y-4 print:p-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Product Receive Report</h1>
        <Button onClick={handlePrint} className="hidden print:hidden md:inline-flex">
          Print
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-1">
              <p><span className="font-medium">Receipt No:</span> {receipt.receipt_number}</p>
              <p><span className="font-medium">Source type:</span> {receipt.source_type}</p>
              <p><span className="font-medium">Issued date:</span> {receipt.issued_date || "—"}</p>
              <p><span className="font-medium">Shipment mode:</span> {receipt.shipment_mode || "—"}</p>
              <p><span className="font-medium">Delivery person:</span> {receipt.delivery_person || "—"}</p>
            </div>
            <div className="space-y-1">
              <p><span className="font-medium">Vehicle:</span> {receipt.vehicle_info || "—"}</p>
              <p><span className="font-medium">TFA number:</span> {receipt.tfa_number || "—"}</p>
              <p><span className="font-medium">ISO number:</span> {receipt.iso_number || "—"}</p>
              <p><span className="font-medium">VAT number:</span> {receipt.vat_number || "—"}</p>
            </div>
          </div>

          <div className="space-y-1 text-sm">
            <p className="font-medium">Delivery To:</p>
            <p className="whitespace-pre-line text-muted-foreground">{receipt.to_address || "—"}</p>
          </div>

          <div className="border rounded-md overflow-hidden text-xs">
            <table className="w-full border-collapse">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr className="uppercase">
                  <th className="border px-2 py-2">Legacy Code</th>
                  <th className="border px-2 py-2">Item Code</th>
                  <th className="border px-2 py-2">Item Name</th>
                  <th className="border px-2 py-2">Pack Size</th>
                  <th className="border px-2 py-2">UOM</th>
                  <th className="border px-2 py-2">Expiry Date</th>
                  <th className="border px-2 py-2">Batch No.</th>
                  <th className="border px-2 py-2">No. of IFC</th>
                  <th className="border px-2 py-2">Depot Qty</th>
                  <th className="border px-2 py-2">IFC/Full MC</th>
                  <th className="border px-2 py-2">No. of Full MC</th>
                  <th className="border px-2 py-2">IFC in Loose MC</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((item, index) => (
                  <tr key={index}>
                    <td className="border px-2 py-2 text-center">{item.legacy_code || ""}</td>
                    <td className="border px-2 py-2 text-center">{item.item_code || ""}</td>
                    <td className="border px-2 py-2">{item.item_name}</td>
                    <td className="border px-2 py-2 text-center">{item.pack_size || ""}</td>
                    <td className="border px-2 py-2 text-center">{item.uom || ""}</td>
                    <td className="border px-2 py-2 text-center">{item.expiry_date || ""}</td>
                    <td className="border px-2 py-2 text-center">{item.batch_number || ""}</td>
                    <td className="border px-2 py-2 text-right">{item.number_of_ifc ?? ""}</td>
                    <td className="border px-2 py-2 text-right">{item.depot_quantity ?? ""}</td>
                    <td className="border px-2 py-2 text-right">{item.ifc_per_full_mc ?? ""}</td>
                    <td className="border px-2 py-2 text-right">{item.number_of_full_mc ?? ""}</td>
                    <td className="border px-2 py-2 text-right">{item.ifc_in_loose_mc ?? ""}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="border px-2 py-2 text-right" colSpan={8}>
                    Total
                  </td>
                  <td className="border px-2 py-2 text-right">{totalQuantity}</td>
                  <td className="border px-2 py-2" colSpan={3}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
