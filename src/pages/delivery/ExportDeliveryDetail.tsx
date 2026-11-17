import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Globe, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { DeliveryStatusBadge } from "@/pages/delivery/DeliveryStatusBadge";

interface ExportDeliveryItem {
  product_name: string;
  quantity: number;
  unit_value?: number;
}

interface ExportDelivery {
  id: number;
  delivery_number: string;
  status: string;
  delivery_date: string;
  destination_country?: string;
  port_of_loading?: string;
  port_of_discharge?: string;
  shipping_line?: string;
  container_number?: string;
  items?: ExportDeliveryItem[];
}

type ItemRow = ExportDeliveryItem & { sl: number; line_value: number };

const statusLabels: Record<string, string> = {
  CustomsCleared: "Customs Cleared",
  InTransit: "In Transit",
};

const statusClass: Record<string, string> = {
  Draft: "bg-[#F1F5F9] text-[#475569] dark:bg-[#1B283B] dark:text-[#A9B8CC]",
  Pending: "bg-[#FEF3C7] text-[#B45309] dark:bg-[#3B2A0A] dark:text-[#FBBF24]",
  CustomsCleared: "bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]",
  InTransit: "bg-[#FFEDD5] text-[#C2410C] dark:bg-[#3B1F0A] dark:text-[#FB923C]",
  Shipped: "bg-[#EDE9FE] text-[#6D28D9] dark:bg-[#2E1065] dark:text-[#C4B5FD]",
  Delivered: "bg-[#ECFDF5] text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]",
  Cancelled: "bg-[#FEF2F2] text-[#DC2626] dark:bg-[#3B1212] dark:text-[#F87171]",
};

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusLabel(status: string) {
  return statusLabels[status] || status;
}

function printExportDelivery(delivery: ExportDelivery) {
  const previous = document.getElementById("export-delivery-print-frame");
  previous?.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "export-delivery-print-frame";
  iframe.setAttribute("title", `Export Delivery ${delivery.delivery_number}`);
  iframe.style.cssText = "position:absolute;left:-9999px;top:0;width:210mm;height:297mm;border:0;";
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    iframe.remove();
    return false;
  }

  const totalQuantity = delivery.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const totalValue = delivery.items?.reduce((sum, item) => sum + item.quantity * (item.unit_value || 0), 0) || 0;
  const itemRows =
    !delivery.items || delivery.items.length === 0
      ? `<tr><td colspan="5" class="center">No items</td></tr>`
      : delivery.items
          .map(
            (item, index) => `<tr>
              <td class="center">${index + 1}</td>
              <td>${escapeHtml(item.product_name || "—")}</td>
              <td class="right">${escapeHtml(Number(item.quantity || 0).toLocaleString())}</td>
              <td class="right">${escapeHtml(item.unit_value != null ? Number(item.unit_value).toLocaleString() : "—")}</td>
              <td class="right">${escapeHtml((item.quantity * (item.unit_value || 0)).toLocaleString())}</td>
            </tr>`,
          )
          .join("");

  frameDocument.open();
  frameDocument.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(delivery.delivery_number)}</title>
    <style>
      @page { size: A4 portrait; margin: 12mm; }
      body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 8px; }
      h1 { font-size: 20px; letter-spacing: .08em; text-align: center; margin: 0 0 4px; }
      .subtitle { text-align: center; text-transform: uppercase; font-size: 13px; margin: 0 0 16px; }
      .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 32px; font-size: 13px; margin-bottom: 16px; }
      .meta p { margin: 3px 0; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #111; padding: 6px 8px; }
      th { text-transform: uppercase; background: #f3f3f3; }
      .center { text-align: center; }
      .right { text-align: right; }
    </style>
  </head>
  <body>
    <h1>RENATA LIMITED</h1>
    <p class="subtitle">Export Delivery</p>
    <div class="meta">
      <div>
        <p><strong>Delivery No:</strong> ${escapeHtml(delivery.delivery_number)}</p>
        <p><strong>Delivery Date:</strong> ${escapeHtml(new Date(delivery.delivery_date).toLocaleDateString())}</p>
        <p><strong>Status:</strong> ${escapeHtml(statusLabel(delivery.status))}</p>
        <p><strong>Destination:</strong> ${escapeHtml(delivery.destination_country || "—")}</p>
      </div>
      <div>
        <p><strong>Port of Loading:</strong> ${escapeHtml(delivery.port_of_loading || "—")}</p>
        <p><strong>Port of Discharge:</strong> ${escapeHtml(delivery.port_of_discharge || "—")}</p>
        <p><strong>Shipping Line:</strong> ${escapeHtml(delivery.shipping_line || "—")}</p>
        <p><strong>Container:</strong> ${escapeHtml(delivery.container_number || "—")}</p>
        <p><strong>Total Value:</strong> ${escapeHtml(totalValue.toLocaleString())}</p>
      </div>
    </div>
    <table>
      <thead>
        <tr><th>SL</th><th>Product Name</th><th>Quantity</th><th>Unit Value</th><th>Total Value</th></tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
  </body>
</html>`);
  frameDocument.close();

  const cleanup = () => {
    iframe.remove();
  };
  frameWindow.addEventListener("afterprint", cleanup);
  window.setTimeout(() => {
    frameWindow.focus();
    frameWindow.print();
  }, 150);
  return true;
}

export default function ExportDeliveryDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [delivery, setDelivery] = useState<ExportDelivery | null>(null);

  const handlePrint = (record: ExportDelivery) => {
    const opened = printExportDelivery(record);
    if (!opened) {
      toast({ title: "Unable to open print preview", variant: "destructive" });
    }
  };

  useEffect(() => {
    const fetchDelivery = async () => {
      try {
        setLoading(true);
        // Mock data
        const mockDelivery: ExportDelivery = {
          id: Number(id),
          delivery_number: `EX-2025-${String(id).padStart(3, "0")}`,
          status: "InTransit",
          delivery_date: "2025-01-15",
          destination_country: "USA",
          port_of_loading: "Mumbai",
          port_of_discharge: "Los Angeles",
          shipping_line: "Maersk Line",
          container_number: "MSKU1234567",
          items: [
            { product_name: "Paracetamol 500mg", quantity: 2000, unit_value: 25 },
            { product_name: "Amoxicillin 250mg", quantity: 1500, unit_value: 30 },
          ],
        };
        setDelivery(mockDelivery);
      } catch (error) {
        console.error("Failed to load export delivery", error);
        toast({ title: "Unable to load delivery details", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDelivery();
    }
  }, [id, toast]);

  useEffect(() => {
    if (!delivery || searchParams.get("print") !== "1") return;
    const timer = window.setTimeout(() => {
      handlePrint(delivery);
      navigate(`/delivery/export/${delivery.id}`, { replace: true });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [delivery, searchParams, navigate]);

  const sectionMotion = {
    initial: reduceMotion ? false : { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0 : 0.18 },
  };

  if (loading) {
    return (
      <ThemeScope className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden">
        <Loader2 className="h-8 w-8 animate-spin text-[#0C4DA1]" />
        <p className="mt-3 text-sm text-[#64748B]">Loading delivery details...</p>
      </ThemeScope>
    );
  }

  if (!delivery) {
    return (
      <ThemeScope className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden">
        <p className="text-sm text-[#64748B]">Delivery not found.</p>
        <Button type="button" variant="ntSecondary" className="mt-3" onClick={() => navigate("/delivery/export")}>
          Back to deliveries
        </Button>
      </ThemeScope>
    );
  }

  const totalQuantity = delivery.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const totalValue = delivery.items?.reduce((sum, item) => sum + item.quantity * (item.unit_value || 0), 0) || 0;
  const itemRows: ItemRow[] = (delivery.items || []).map((item, index) => ({
    ...item,
    sl: index + 1,
    line_value: item.quantity * (item.unit_value || 0),
  }));

  const columns: DataTableColumn<ItemRow>[] = [
    { key: "sl", label: "SL", className: "w-12 tabular-nums text-[#64748B]" },
    {
      key: "product_name",
      label: "Product name",
      render: (val) => <span className="font-medium text-[#172B4D] dark:text-[#F1F5F9]">{String(val || "—")}</span>,
    },
    {
      key: "quantity",
      label: "Quantity",
      align: "right",
      className: "tabular-nums",
      render: (val) => Number(val || 0).toLocaleString(),
    },
    {
      key: "unit_value",
      label: "Unit value",
      align: "right",
      className: "tabular-nums",
      render: (val) => (val == null || val === "" ? "—" : Number(val).toLocaleString()),
    },
    {
      key: "line_value",
      label: "Total value",
      align: "right",
      className: "tabular-nums",
      render: (val) => Number(val || 0).toLocaleString(),
    },
  ];

  const infoItem = (label: string, value: string) => (
    <div className="min-w-0 space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">{label}</p>
      <p className="truncate text-[13px] font-medium text-[#172B4D] dark:text-[#F1F5F9]">{value}</p>
    </div>
  );

  return (
    <ThemeScope className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-x-hidden">
        <motion.div {...sectionMotion} className="nt-form nt-form-compact nt-form-card shrink-0 overflow-hidden px-4 py-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Delivery</p>
              <p className="truncate font-mono text-[13px] font-semibold text-[#172B4D] dark:text-[#F1F5F9]">{delivery.delivery_number}</p>
            </div>
            <DeliveryStatusBadge
              status={delivery.status}
              label={statusLabel(delivery.status)}
              size="md"
              className={statusClass[delivery.status] || "bg-[#F1F5F9] text-[#475569]"}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {infoItem("Delivery date", new Date(delivery.delivery_date).toLocaleDateString())}
            {infoItem("Destination", delivery.destination_country || "—")}
            {infoItem("Port of loading", delivery.port_of_loading || "—")}
            {infoItem("Port of discharge", delivery.port_of_discharge || "—")}
            {infoItem("Shipping line", delivery.shipping_line || "—")}
            {infoItem("Container", delivery.container_number || "—")}
            {infoItem("Total items", String(delivery.items?.length || 0))}
            {infoItem("Total quantity", totalQuantity.toLocaleString())}
            {infoItem("Total value", totalValue.toLocaleString())}
          </div>
        </motion.div>

        <motion.div {...sectionMotion} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DataTable
            className="min-h-0 min-w-0 flex-1 overflow-hidden"
            title="Export items"
            description={`${delivery.items?.length || 0} item${(delivery.items?.length || 0) === 1 ? "" : "s"} · Qty ${totalQuantity.toLocaleString()}`}
            toolbarIcon={<Globe className="h-4 w-4" />}
            toolbarActions={
              <Button type="button" variant="ntSecondary" className="!h-8" onClick={() => handlePrint(delivery)}>
                <Printer className="h-3.5 w-3.5" />
                Print
              </Button>
            }
            data={itemRows}
            columns={columns}
            getRowId={(_row, index) => index}
            resetPageKey={itemRows.length}
            emptyMessage="No items on this delivery."
          />
        </motion.div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[#E3EAF3] bg-white/80 py-2 dark:border-[#2C3B50] dark:bg-[#151F30]/80">
          <Button type="button" variant="ntSecondary" onClick={() => navigate("/delivery/export")}>
            Back
          </Button>
        </div>
      </div>
    </ThemeScope>
  );
}
