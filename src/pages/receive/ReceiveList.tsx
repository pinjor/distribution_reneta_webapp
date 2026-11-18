import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import { CheckCircle2, ClipboardList, Download, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { cn } from "@/lib/utils";

interface ReceiptItem {
  id: number;
  receipt_number: string;
  source_type: "FACTORY" | "DEPOT" | "RETURN";
  status: "Draft" | "Approved";
  issued_date?: string;
  shipment_mode?: string;
  delivery_person?: string;
  target_depot_id?: number;
  items: Array<{ depot_quantity: number }>;
}

type ReceiptRow = ReceiptItem & { sl: number; totalQty: number };

const fieldClass =
  "h-10 rounded-lg border border-[#CBD5E1] bg-white text-[13px] shadow-none focus:ring-0 focus-visible:border-[#0C4DA1] focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/20 dark:border-[#2C3B50] dark:bg-[#151F30]";
const labelClass = "text-[13px] font-medium text-[#172B4D] dark:text-[#F1F5F9]";
const selectPanelClass = "nt-select-panel z-[200] rounded-xl border p-1 shadow-lg";
const selectItemClass = "cursor-pointer rounded-md py-2 pl-8 pr-3 text-[13px] leading-snug";

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

function sourceLabel(source: ReceiptItem["source_type"]) {
  if (source === "FACTORY") return "Factory";
  if (source === "DEPOT") return "Depot";
  return "Stock return";
}

export default function ReceiveList() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (sourceFilter !== "ALL") params.source_type = sourceFilter;
      if (statusFilter !== "ALL") params.status_filter = statusFilter;
      const response = await apiEndpoints.productReceipts.getAll(params);
      setReceipts(response.data || []);
    } catch (error) {
      console.error("Failed to load receipts", error);
      toast({ title: "Unable to load receipts", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sourceFilter, statusFilter]);

  const totalQuantity = useMemo(
    () =>
      receipts.reduce(
        (sum, receipt) =>
          sum + receipt.items.reduce((subtotal, item) => subtotal + (Number(item.depot_quantity) || 0), 0),
        0,
      ),
    [receipts],
  );

  const handleDelete = async (id: number) => {
    try {
      await apiEndpoints.productReceipts.delete(id);
      toast({ title: "Receipt deleted" });
      loadData();
    } catch (error) {
      console.error("Failed to delete receipt", error);
      toast({ title: "Unable to delete receipt", variant: "destructive" });
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await apiEndpoints.productReceipts.approve(id);
      toast({ title: "Receipt approved" });
      loadData();
    } catch (error) {
      console.error("Failed to approve receipt", error);
      toast({ title: "Unable to approve receipt", variant: "destructive" });
    }
  };

  const handleView = (id: number) => {
    navigate(`/receive/report/${id}`);
  };

  const handlePrint = (id: number) => {
    window.open(`/receive/report/${id}`, "_blank");
  };

  const tableRows: ReceiptRow[] = receipts.map((receipt, index) => ({
    ...receipt,
    sl: index + 1,
    totalQty: receipt.items.reduce((sum, item) => sum + (Number(item.depot_quantity) || 0), 0),
  }));

  const columns: DataTableColumn<ReceiptRow>[] = [
    { key: "sl", label: "SL", className: "w-12 tabular-nums text-[#64748B]" },
    {
      key: "receipt_number",
      label: "Receipt number",
      render: (val) => <span className="font-medium text-[#172B4D] dark:text-[#F1F5F9]">{String(val || "—")}</span>,
    },
    {
      key: "source_type",
      label: "Source",
      render: (val) => (
        <span className="inline-flex rounded-full border border-[#E3EAF3] bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-semibold text-[#0C4DA1] dark:border-[#2C3B50] dark:bg-[#1B304D] dark:text-[#70ADFF]">
          {sourceLabel(val as ReceiptItem["source_type"])}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (val) => {
        const approved = val === "Approved";
        return (
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
              approved
                ? "bg-[#ECFDF5] text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]"
                : "bg-[#F1F5F9] text-[#475569] dark:bg-[#1B283B] dark:text-[#A9B8CC]",
            )}
          >
            {String(val || "—")}
          </span>
        );
      },
    },
    {
      key: "issued_date",
      label: "Issued date",
      className: "whitespace-nowrap tabular-nums",
      render: (val) => (val ? format(new Date(String(val)), "dd MMM yyyy") : "—"),
    },
    { key: "shipment_mode", label: "Shipment mode", render: (val) => String(val || "—") },
    { key: "delivery_person", label: "Delivery person", render: (val) => String(val || "—") },
    {
      key: "totalQty",
      label: "Total qty",
      align: "right",
      className: "tabular-nums",
    },
    {
      key: "id",
      label: "Actions",
      align: "right",
      headerClassName: "text-right",
      render: (_val, row) => {
        const isDraft = row.status === "Draft";
        return (
          <div className="flex justify-end gap-0.5">
            <ActionIconButton label="View report" onClick={() => handleView(row.id)} className="text-[#475569] hover:bg-[#EAF2FC] hover:text-[#0C4DA1]">
              <Eye className="h-4 w-4" />
            </ActionIconButton>
            <ActionIconButton
              label="Edit receipt"
              disabled={!isDraft}
              onClick={() => navigate(`/receive/${row.source_type.toLowerCase()}?receiptId=${row.id}`)}
              className="text-[#475569] hover:bg-[#EAF2FC] hover:text-[#0C4DA1]"
            >
              <Pencil className="h-4 w-4" />
            </ActionIconButton>
            <ActionIconButton label="Print report" onClick={() => handlePrint(row.id)} className="text-[#475569] hover:bg-[#EAF2FC] hover:text-[#0C4DA1]">
              <Download className="h-4 w-4" />
            </ActionIconButton>
            <ActionIconButton
              label="Approve receipt"
              disabled={!isDraft}
              onClick={() => handleApprove(row.id)}
              className="text-[#16A34A] hover:bg-[#ECFDF5] hover:text-[#15803D]"
            >
              <CheckCircle2 className="h-4 w-4" />
            </ActionIconButton>
            <ActionIconButton
              label="Delete receipt"
              disabled={!isDraft}
              onClick={() => handleDelete(row.id)}
              className="text-[#94A3B8] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
            >
              <Trash2 className="h-4 w-4" />
            </ActionIconButton>
          </div>
        );
      },
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
            <div className="w-[180px] max-w-full space-y-1">
              <Label className={labelClass}>Source</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className={cn("w-full", fieldClass)}>
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent className={selectPanelClass}>
                  <SelectItem value="ALL" className={selectItemClass}>
                    All sources
                  </SelectItem>
                  <SelectItem value="FACTORY" className={selectItemClass}>
                    Factory
                  </SelectItem>
                  <SelectItem value="DEPOT" className={selectItemClass}>
                    Depot
                  </SelectItem>
                  <SelectItem value="RETURN" className={selectItemClass}>
                    Stock return
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[160px] max-w-full space-y-1">
              <Label className={labelClass}>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className={cn("w-full", fieldClass)}>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent className={selectPanelClass}>
                  <SelectItem value="ALL" className={selectItemClass}>
                    All statuses
                  </SelectItem>
                  <SelectItem value="Draft" className={selectItemClass}>
                    Draft
                  </SelectItem>
                  <SelectItem value="Approved" className={selectItemClass}>
                    Approved
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="ml-auto pb-1 text-[13px] text-[#64748B]">
              Total quantity{" "}
              <span className="font-semibold tabular-nums text-[#172B4D] dark:text-[#F1F5F9]">{totalQuantity.toLocaleString()}</span>
            </p>
          </div>
        </motion.div>

        <motion.div {...sectionMotion} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DataTable
            className="min-h-0 min-w-0 flex-1 overflow-hidden"
            title="Product receipts"
            description="Factory, depot, and stock return receipts."
            toolbarIcon={<ClipboardList className="h-4 w-4" />}
            toolbarActions={
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="ntPrimary" className="!h-8" onClick={() => navigate("/receive/factory")}>
                  New Factory Receipt
                </Button>
                <Button type="button" variant="ntSecondary" className="!h-8" onClick={() => navigate("/receive/depot")}>
                  New Depot Receipt
                </Button>
                <Button type="button" variant="ntSecondary" className="!h-8" onClick={() => navigate("/receive/return")}>
                  New Return Receipt
                </Button>
              </div>
            }
            data={tableRows}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.id}
            resetPageKey={`${sourceFilter}|${statusFilter}|${receipts.length}`}
            emptyMessage="No receipts found. Create a new receipt to get started."
          />
        </motion.div>
      </div>
    </ThemeScope>
  );
}
