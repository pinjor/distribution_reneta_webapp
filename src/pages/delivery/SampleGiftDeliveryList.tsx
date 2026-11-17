import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Eye, Gift, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { cn } from "@/lib/utils";

interface SampleGiftDelivery {
  id: number;
  delivery_number: string;
  status: string;
  delivery_date: string;
  recipient_name?: string;
  recipient_type?: string;
  gift_type?: string;
  total_items: number;
  total_quantity: number;
  created_at?: string;
}

type DeliveryRow = SampleGiftDelivery & { sl: number };

const fieldClass =
  "h-10 rounded-lg border border-[#CBD5E1] bg-white text-[13px] shadow-none focus:ring-0 focus-visible:border-[#0C4DA1] focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/20 dark:border-[#2C3B50] dark:bg-[#151F30]";
const labelClass = "text-[13px] font-medium text-[#172B4D] dark:text-[#F1F5F9]";

const statusClass: Record<string, string> = {
  Draft: "bg-[#F1F5F9] text-[#475569] dark:bg-[#1B283B] dark:text-[#A9B8CC]",
  Pending: "bg-[#FEF3C7] text-[#B45309] dark:bg-[#3B2A0A] dark:text-[#FBBF24]",
  Prepared: "bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]",
  Dispatched: "bg-[#FFEDD5] text-[#C2410C] dark:bg-[#3B1F0A] dark:text-[#FB923C]",
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

export default function SampleGiftDeliveryList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const [deliveries, setDeliveries] = useState<SampleGiftDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      // In production, this would call a specific API endpoint for sample gift deliveries
      // const result = await apiEndpoints.orderDeliveries.getSampleGiftDeliveries();
      // For now, using mock data
      const mockDeliveries: SampleGiftDelivery[] = [
        { id: 1, delivery_number: "SG-2026-001", status: "Dispatched", delivery_date: "2026-04-15", recipient_name: "Dr. Mohammad Rahman", recipient_type: "Doctor", gift_type: "Product Samples", total_items: 5, total_quantity: 50 },
        { id: 2, delivery_number: "SG-2026-002", status: "Prepared", delivery_date: "2026-04-14", recipient_name: "Green Pharmacy", recipient_type: "Chemist Shop", gift_type: "Promotional Items", total_items: 3, total_quantity: 30 },
        { id: 3, delivery_number: "SG-2026-003", status: "Delivered", delivery_date: "2026-04-12", recipient_name: "Dr. Fatema Khatun", recipient_type: "Doctor", gift_type: "Vaccine Samples", total_items: 4, total_quantity: 40 },
        { id: 4, delivery_number: "SG-2026-004", status: "Pending", delivery_date: "2026-04-16", recipient_name: "City Medical Store", recipient_type: "Chemist Shop", gift_type: "Product Samples", total_items: 6, total_quantity: 60 },
        { id: 5, delivery_number: "SG-2026-005", status: "Draft", delivery_date: "2026-04-17", recipient_name: "Dr. Abdul Karim", recipient_type: "Doctor", gift_type: "Conference Kit", total_items: 2, total_quantity: 20 },
        { id: 6, delivery_number: "SG-2026-006", status: "Dispatched", delivery_date: "2026-04-11", recipient_name: "Popular Pharmacy", recipient_type: "Chemist Shop", gift_type: "Promotional Items", total_items: 5, total_quantity: 45 },
      ];
      setDeliveries(mockDeliveries);
    } catch (error) {
      console.error("Failed to load sample gift deliveries", error);
      toast({ title: "Unable to load sample gift deliveries", variant: "destructive" });
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
      delivery.recipient_name?.toLowerCase().includes(term) ||
      delivery.recipient_type?.toLowerCase().includes(term) ||
      delivery.gift_type?.toLowerCase().includes(term)
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
    { key: "recipient_name", label: "Recipient", render: (val) => String(val || "—") },
    { key: "recipient_type", label: "Recipient type", render: (val) => String(val || "—") },
    { key: "gift_type", label: "Gift type", render: (val) => String(val || "—") },
    { key: "total_items", label: "Items", className: "tabular-nums" },
    {
      key: "total_quantity",
      label: "Quantity",
      align: "right",
      className: "tabular-nums",
      render: (val) => Number(val || 0).toLocaleString(),
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
            statusClass[String(val)] || "bg-[#F1F5F9] text-[#475569]",
          )}
        >
          {String(val || "—")}
        </span>
      ),
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
            onClick={() => navigate(`/delivery/sample-gift/${row.id}`)}
            className="text-[#475569] hover:bg-[#EAF2FC] hover:text-[#0C4DA1]"
          >
            <Eye className="h-4 w-4" />
          </ActionIconButton>
          <ActionIconButton
            label="Print delivery"
            onClick={() => navigate(`/delivery/sample-gift/${row.id}?print=1`)}
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
                placeholder="Number, recipient, or gift type"
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
            title="Sample gift deliveries"
            description="Sample and gift deliveries to doctors, pharmacies, and partners."
            toolbarIcon={<Gift className="h-4 w-4" />}
            toolbarActions={
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="ntSecondary" className="!h-8" onClick={fetchDeliveries} disabled={loading}>
                  <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                  Refresh
                </Button>
                <Button type="button" variant="ntPrimary" className="!h-8" onClick={() => navigate("/delivery/sample-gift/new")}>
                  <Gift className="h-3.5 w-3.5" />
                  New Sample Gift
                </Button>
              </div>
            }
            data={tableRows}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.id}
            resetPageKey={`${searchTerm}|${filteredDeliveries.length}`}
            emptyMessage={searchTerm ? "No deliveries found matching your search." : "No sample gift deliveries yet."}
          />
        </motion.div>
      </div>
    </ThemeScope>
  );
}
