import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Loader2, PackageCheck, Printer, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { DeliveryStatusBadge } from "@/pages/delivery/DeliveryStatusBadge";

interface DepotTransferItem {
  id: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  batch_number?: string;
  expiry_date?: string;
  quantity: number;
  unit_price: number;
}

interface DepotTransfer {
  id: number;
  transfer_number: string;
  status: string;
  transfer_date: string;
  from_depot_id: number;
  from_depot_name?: string;
  to_depot_id: number;
  to_depot_name?: string;
  vehicle_id?: number;
  vehicle_registration?: string;
  driver_name?: string;
  transfer_note?: string;
  remarks?: string;
  approved_by?: number;
  approved_at?: string;
  received_by?: number;
  received_at?: string;
  total_items: number;
  total_quantity: number;
  total_value: number;
  items: DepotTransferItem[];
}

type ItemRow = DepotTransferItem & { sl: number; amount: number };

const statusClass: Record<string, string> = {
  Draft: "bg-[#F1F5F9] text-[#475569] dark:bg-[#1B283B] dark:text-[#A9B8CC]",
  Pending: "bg-[#FEF3C7] text-[#B45309] dark:bg-[#3B2A0A] dark:text-[#FBBF24]",
  Approved: "bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]",
  "In Transit": "bg-[#FFEDD5] text-[#C2410C] dark:bg-[#3B1F0A] dark:text-[#FB923C]",
  Received: "bg-[#ECFDF5] text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]",
  Cancelled: "bg-[#FEF2F2] text-[#DC2626] dark:bg-[#3B1212] dark:text-[#F87171]",
};

export default function DepotDeliveryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const [approving, setApproving] = useState(false);
  const [receiving, setReceiving] = useState(false);

  const { data: transfer, isLoading: loading, refetch } = useQuery({
    queryKey: ["depot-transfer", id],
    queryFn: async () => {
      if (!id) return null;
      return await apiEndpoints.depotTransfers.getById(Number(id));
    },
    enabled: !!id,
  });

  const handleApprove = async () => {
    if (!transfer) {
      toast({ title: "Transfer not found", variant: "destructive" });
      return;
    }

    if (!user || !user.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to approve transfers",
        variant: "destructive",
      });
      return;
    }

    if (transfer.status !== "Draft" && transfer.status !== "Pending") {
      toast({ title: "Only Draft or Pending transfers can be approved", variant: "destructive" });
      return;
    }

    try {
      setApproving(true);
      await apiEndpoints.depotTransfers.approve(transfer.id, user.id);
      toast({ title: "Transfer approved successfully", description: "Stock has been reduced from source depot" });
      refetch();
    } catch (error: any) {
      console.error("Failed to approve transfer", error);
      const errorMessage = error?.message || error?.details || "Unknown error occurred";
      toast({
        title: "Unable to approve transfer",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setApproving(false);
    }
  };

  const handleReceive = async () => {
    if (!transfer) {
      toast({ title: "Transfer not found", variant: "destructive" });
      return;
    }

    if (!user || !user.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to receive transfers",
        variant: "destructive",
      });
      return;
    }

    if (transfer.status !== "In Transit") {
      toast({ title: "Only In Transit transfers can be received", variant: "destructive" });
      return;
    }

    try {
      setReceiving(true);
      await apiEndpoints.depotTransfers.receive(transfer.id, user.id);
      toast({ title: "Transfer received successfully", description: "Stock has been increased in destination depot" });
      refetch();
    } catch (error: any) {
      console.error("Failed to receive transfer", error);
      const errorMessage = error?.message || error?.details || "Unknown error occurred";
      toast({
        title: "Unable to receive transfer",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setReceiving(false);
    }
  };

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

  if (!transfer) {
    return (
      <ThemeScope className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden">
        <p className="text-sm text-[#64748B]">Transfer not found.</p>
        <Button type="button" variant="ntSecondary" className="mt-3" onClick={() => navigate("/delivery/depot")}>
          Back to transfers
        </Button>
      </ThemeScope>
    );
  }

  const canApprove = transfer.status === "Pending";
  const canReceive = transfer.status === "In Transit";
  const itemRows: ItemRow[] = (transfer.items || []).map((item, index) => ({
    ...item,
    sl: index + 1,
    amount: Number(item.quantity) * Number(item.unit_price),
  }));

  const columns: DataTableColumn<ItemRow>[] = [
    { key: "sl", label: "SL", className: "w-12 tabular-nums text-[#64748B]" },
    { key: "product_code", label: "Product code", className: "font-mono text-xs", render: (val) => String(val || "—") },
    {
      key: "product_name",
      label: "Product name",
      render: (val) => <span className="font-medium text-[#172B4D] dark:text-[#F1F5F9]">{String(val || "—")}</span>,
    },
    { key: "batch_number", label: "Batch number", className: "font-mono text-xs", render: (val) => String(val || "—") },
    {
      key: "expiry_date",
      label: "Expiry date",
      className: "whitespace-nowrap tabular-nums",
      render: (val) => (val ? new Date(String(val)).toLocaleDateString() : "—"),
    },
    {
      key: "quantity",
      label: "Quantity",
      align: "right",
      className: "tabular-nums",
      render: (val) => Number(val || 0).toLocaleString(),
    },
    {
      key: "unit_price",
      label: "Unit price",
      align: "right",
      className: "tabular-nums",
      render: (val) => `৳${Number(val || 0).toFixed(2)}`,
    },
    {
      key: "amount",
      label: "Amount",
      align: "right",
      className: "tabular-nums",
      render: (val) => `৳${Number(val || 0).toFixed(2)}`,
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
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Transfer</p>
              <p className="truncate font-mono text-[13px] font-semibold text-[#172B4D] dark:text-[#F1F5F9]">{transfer.transfer_number}</p>
            </div>
            <DeliveryStatusBadge
              status={transfer.status}
              label={transfer.status}
              size="md"
              className={statusClass[transfer.status] || "bg-[#F1F5F9] text-[#475569]"}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {infoItem("Transfer date", new Date(transfer.transfer_date).toLocaleDateString())}
            {infoItem("From depot", transfer.from_depot_name || "—")}
            {infoItem("To depot", transfer.to_depot_name || "—")}
            {infoItem("Vehicle", transfer.vehicle_registration || "—")}
            {infoItem("Driver", transfer.driver_name || "—")}
            {infoItem("Total items", String(transfer.total_items))}
            {infoItem("Total quantity", Number(transfer.total_quantity).toLocaleString())}
            {infoItem("Total value", `৳${Number(transfer.total_value).toFixed(2)}`)}
            {transfer.approved_at ? infoItem("Approved at", new Date(transfer.approved_at).toLocaleString()) : null}
            {transfer.received_at ? infoItem("Received at", new Date(transfer.received_at).toLocaleString()) : null}
            {transfer.transfer_note ? infoItem("Transfer note", transfer.transfer_note) : null}
            {transfer.remarks ? infoItem("Remarks", transfer.remarks) : null}
          </div>
        </motion.div>

        <motion.div {...sectionMotion} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DataTable
            className="min-h-0 min-w-0 flex-1 overflow-hidden"
            title="Transfer items"
            description={`${transfer.total_items} item${transfer.total_items === 1 ? "" : "s"} · Qty ${Number(transfer.total_quantity).toLocaleString()}`}
            toolbarIcon={<Warehouse className="h-4 w-4" />}
            toolbarActions={
              <Button type="button" variant="ntSecondary" className="!h-8">
                <Printer className="h-3.5 w-3.5" />
                Print
              </Button>
            }
            data={itemRows}
            columns={columns}
            getRowId={(row) => row.id}
            resetPageKey={itemRows.length}
            emptyMessage="No items on this transfer."
          />
        </motion.div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[#E3EAF3] bg-white/80 py-2 dark:border-[#2C3B50] dark:bg-[#151F30]/80">
          <Button type="button" variant="ntSecondary" onClick={() => navigate("/delivery/depot")}>
            Back
          </Button>
          {canApprove && (
            <Button type="button" variant="ntPrimary" onClick={handleApprove} disabled={approving || !user || !user.id}>
              {approving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Approve Transfer
                </>
              )}
            </Button>
          )}
          {canReceive && (
            <Button type="button" variant="ntPrimary" onClick={handleReceive} disabled={receiving || !user || !user.id}>
              {receiving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Receiving...
                </>
              ) : (
                <>
                  <PackageCheck className="h-4 w-4" />
                  Receive Transfer
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </ThemeScope>
  );
}
