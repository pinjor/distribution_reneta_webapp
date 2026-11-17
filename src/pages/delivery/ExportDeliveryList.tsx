import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Eye, Globe, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { cn } from "@/lib/utils";
import { DeliveryStatusBadge } from "@/pages/delivery/DeliveryStatusBadge";

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
  total_items: number;
  total_quantity: number;
  total_value: number;
  created_at?: string;
}

type DeliveryRow = ExportDelivery & { sl: number };

const fieldClass =
  "h-10 rounded-lg border border-[#CBD5E1] bg-white text-[13px] shadow-none focus:ring-0 focus-visible:border-[#0C4DA1] focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/20 dark:border-[#2C3B50] dark:bg-[#151F30]";
const labelClass = "text-[13px] font-medium text-[#172B4D] dark:text-[#F1F5F9]";

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

function ActionIconButton({
  label,
  onClick,
  className,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={onClick}
          aria-label={label}
          className={cn("h-8 w-8 rounded-md p-0", className)}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export default function ExportDeliveryList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const [deliveries, setDeliveries] = useState<ExportDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      // In production, this would call a specific API endpoint for export deliveries
      // const result = await apiEndpoints.orderDeliveries.getExportDeliveries();
      // For now, using mock data
      const mockDeliveries: ExportDelivery[] = [
        { id: 1, delivery_number: "EX-2026-001", status: "InTransit", delivery_date: "2026-04-15", destination_country: "Malaysia", port_of_loading: "Chattogram", port_of_discharge: "Port Klang", shipping_line: "Maersk Line", container_number: "MSKU1234567", total_items: 25, total_quantity: 5000, total_value: 125000 },
        { id: 2, delivery_number: "EX-2026-002", status: "CustomsCleared", delivery_date: "2026-04-14", destination_country: "India", port_of_loading: "Mongla", port_of_discharge: "Kolkata", shipping_line: "CMA CGM", container_number: "CMAU9876543", total_items: 18, total_quantity: 3600, total_value: 95000 },
        { id: 3, delivery_number: "EX-2026-003", status: "Shipped", delivery_date: "2026-04-13", destination_country: "Nepal", port_of_loading: "Benapole", port_of_discharge: "Birgunj", shipping_line: "Himalaya Logistics", container_number: "HMLU4455667", total_items: 12, total_quantity: 2400, total_value: 62000 },
        { id: 4, delivery_number: "EX-2026-004", status: "Draft", delivery_date: "2026-04-16", destination_country: "Sri Lanka", port_of_loading: "Chattogram", port_of_discharge: "Colombo", shipping_line: "Bay Line Shipping", container_number: "BLSU7788990", total_items: 20, total_quantity: 4000, total_value: 108000 },
        { id: 5, delivery_number: "EX-2026-005", status: "Delivered", delivery_date: "2026-04-10", destination_country: "Singapore", port_of_loading: "Chattogram", port_of_discharge: "Singapore", shipping_line: "Evergreen Marine", container_number: "EVGU3344556", total_items: 30, total_quantity: 6000, total_value: 185000 },
        { id: 6, delivery_number: "EX-2026-006", status: "Pending", delivery_date: "2026-04-17", destination_country: "UAE", port_of_loading: "Chattogram", port_of_discharge: "Jebel Ali", shipping_line: "MSC", container_number: "MSCU1122334", total_items: 22, total_quantity: 4400, total_value: 142000 },
      ];
      setDeliveries(mockDeliveries);
    } catch (error) {
      console.error("Failed to load export deliveries", error);
      toast({ title: "Unable to load export deliveries", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const filteredDeliveries = deliveries.filter((delivery) => {
    const term = searchTerm.toLowerCase();
    return (
      delivery.delivery_number.toLowerCase().includes(term) ||
      delivery.destination_country?.toLowerCase().includes(term) ||
      delivery.port_of_loading?.toLowerCase().includes(term) ||
      delivery.port_of_discharge?.toLowerCase().includes(term) ||
      delivery.shipping_line?.toLowerCase().includes(term) ||
      delivery.container_number?.toLowerCase().includes(term)
    );
  });

  const totalQuantity = filteredDeliveries.reduce((sum, delivery) => sum + Number(delivery.total_quantity || 0), 0);

  const tableRows: DeliveryRow[] = filteredDeliveries.map((delivery, index) => ({
    ...delivery,
    sl: index + 1,
  }));

  const columns: DataTableColumn<DeliveryRow>[] = [
    { key: "sl", label: "SL", className: "w-12 tabular-nums text-[#64748B]" },
    {
      key: "delivery_number",
      label: "Delivery number",
      render: (val) => <span className="font-medium text-[#172B4D] dark:text-[#F1F5F9]">{String(val || "—")}</span>,
    },
    {
      key: "delivery_date",
      label: "Date",
      className: "whitespace-nowrap tabular-nums",
      render: (val) => (val ? new Date(String(val)).toLocaleDateString() : "—"),
    },
    { key: "destination_country", label: "Destination", render: (val) => String(val || "—") },
    { key: "port_of_loading", label: "Port of loading", render: (val) => String(val || "—") },
    { key: "port_of_discharge", label: "Port of discharge", render: (val) => String(val || "—") },
    { key: "shipping_line", label: "Shipping line", render: (val) => String(val || "—") },
    {
      key: "container_number",
      label: "Container",
      className: "font-mono text-xs",
      render: (val) => String(val || "—"),
    },
    { key: "total_items", label: "Items", className: "tabular-nums" },
    {
      key: "total_quantity",
      label: "Quantity",
      align: "right",
      className: "tabular-nums",
      render: (val) => Number(val || 0).toLocaleString(),
    },
    {
      key: "total_value",
      label: "Value",
      align: "right",
      className: "tabular-nums",
      render: (val) => Number(val || 0).toLocaleString(),
    },
    {
      key: "status",
      label: "Status",
      render: (val) => {
        const status = String(val || "");
        return (
          <DeliveryStatusBadge
            status={status}
            label={statusLabels[status] || status || "—"}
            className={statusClass[status] || "bg-[#F1F5F9] text-[#475569]"}
          />
        );
      },
    },
    {
      key: "id",
      label: "Actions",
      align: "right",
      headerClassName: "text-right",
      render: (_val, row) => (
        <div className="flex justify-end gap-0.5">
          <ActionIconButton
            label="View delivery"
            onClick={() => navigate(`/delivery/export/${row.id}`)}
            className="text-[#475569] hover:bg-[#EAF2FC] hover:text-[#0C4DA1]"
          >
            <Eye className="h-4 w-4" />
          </ActionIconButton>
          <ActionIconButton
            label="Print delivery"
            onClick={() => navigate(`/delivery/export/${row.id}?print=1`)}
            className="text-[#475569] hover:bg-[#EAF2FC] hover:text-[#0C4DA1]"
          >
            <Printer className="h-4 w-4" />
          </ActionIconButton>
        </div>
      ),
    },
  ];

  const sectionMotion = {
    initial: reduceMotion ? false : { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0 : 0.18 },
  };

  return (
    <ThemeScope className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-x-hidden">
        <motion.div {...sectionMotion} className="nt-form shrink-0">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
            <div className="w-[320px] max-w-full space-y-1">
              <Label className={labelClass}>Search</Label>
              <Input
                placeholder="Number, country, or container"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn("w-full", fieldClass)}
              />
            </div>
            <p className="pb-2 text-[13px] text-[#64748B]">
              Total quantity{" "}
              <span className="font-semibold tabular-nums text-[#172B4D] dark:text-[#F1F5F9]">{totalQuantity.toLocaleString()}</span>
            </p>
          </div>
        </motion.div>

        <motion.div {...sectionMotion} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DataTable
            className="min-h-0 min-w-0 flex-1 overflow-hidden"
            title="Export deliveries"
            description="International export deliveries and shipping documentation."
            toolbarIcon={<Globe className="h-4 w-4" />}
            toolbarActions={
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="ntSecondary" className="!h-8" onClick={fetchDeliveries} disabled={loading}>
                  <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                  Refresh
                </Button>
                <Button type="button" variant="ntPrimary" className="!h-8" onClick={() => navigate("/delivery/export/new")}>
                  <Globe className="h-3.5 w-3.5" />
                  New Export
                </Button>
              </div>
            }
            data={tableRows}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.id}
            resetPageKey={`${searchTerm}|${filteredDeliveries.length}`}
            emptyMessage={searchTerm ? "No deliveries found matching your search." : "No export deliveries yet."}
          />
        </motion.div>
      </div>
    </ThemeScope>
  );
}
