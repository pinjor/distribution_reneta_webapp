import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Eye, Loader2, Package, PlusCircle, RefreshCw, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { cn } from "@/lib/utils";
import { DeliveryStatusBadge } from "@/pages/delivery/DeliveryStatusBadge";

interface DepotTransfer {
  id: number;
  transfer_number: string;
  status: string;
  transfer_date: string;
  from_depot_name?: string;
  to_depot_name?: string;
  total_items: number;
  total_quantity: number;
  total_value: number;
  vehicle_registration?: string;
  created_at?: string;
}

type TransferRow = DepotTransfer & { sl: number };

const fieldClass =
  "h-10 rounded-lg border border-[#CBD5E1] bg-white text-[13px] shadow-none focus:ring-0 focus-visible:border-[#0C4DA1] focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/20 dark:border-[#2C3B50] dark:bg-[#151F30]";
const labelClass = "text-[13px] font-medium text-[#172B4D] dark:text-[#F1F5F9]";
const selectPanelClass = "nt-select-panel z-[200] rounded-xl border p-1 shadow-lg";
const selectItemClass = "cursor-pointer rounded-md py-2 pl-8 pr-3 text-[13px] leading-snug";

const normalizeStatus = (status: string): string => {
  if (!status) return "";
  const statusStr = String(status);
  if (statusStr.includes("DRAFT") || statusStr.includes("Draft")) return "Draft";
  if (statusStr.includes("PENDING") || statusStr.includes("Pending")) return "Pending";
  if (statusStr.includes("APPROVED") || statusStr.includes("Approved")) return "Approved";
  if (statusStr.includes("IN_TRANSIT") || statusStr.includes("In Transit")) return "In Transit";
  if (statusStr.includes("RECEIVED") || statusStr.includes("Received")) return "Received";
  if (statusStr.includes("CANCELLED") || statusStr.includes("Cancelled")) return "Cancelled";
  return statusStr;
};

const statusClass: Record<string, string> = {
  Draft: "bg-[#F1F5F9] text-[#475569] dark:bg-[#1B283B] dark:text-[#A9B8CC]",
  Pending: "bg-[#FEF3C7] text-[#B45309] dark:bg-[#3B2A0A] dark:text-[#FBBF24]",
  Approved: "bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]",
  "In Transit": "bg-[#FFEDD5] text-[#C2410C] dark:bg-[#3B1F0A] dark:text-[#FB923C]",
  Received: "bg-[#ECFDF5] text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]",
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

export default function DepotDeliveryList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [receivingId, setReceivingId] = useState<number | null>(null);

  const { data: transfersData, isLoading: loading, refetch } = useQuery({
    queryKey: ["depot-transfers", statusFilter],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (statusFilter && statusFilter !== "all") {
        params.status_filter = statusFilter;
      }
      const result = await apiEndpoints.depotTransfers.getAll(params);
      return Array.isArray(result) ? result : result?.data || result || [];
    },
  });

  const transfers = Array.isArray(transfersData) ? transfersData : [];

  const filteredTransfers = transfers
    .map((transfer: DepotTransfer) => ({
      ...transfer,
      status: normalizeStatus(transfer.status),
    }))
    .filter((transfer: DepotTransfer) => {
      const term = searchTerm.toLowerCase();
      return (
        transfer.transfer_number.toLowerCase().includes(term) ||
        transfer.from_depot_name?.toLowerCase().includes(term) ||
        transfer.to_depot_name?.toLowerCase().includes(term) ||
        transfer.vehicle_registration?.toLowerCase().includes(term)
      );
    });

  const totalQuantity = filteredTransfers.reduce((sum, transfer) => sum + Number(transfer.total_quantity || 0), 0);

  const handleApprove = async (transferId: number) => {
    if (!user || !user.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to approve transfers",
        variant: "destructive",
      });
      return;
    }

    try {
      setApprovingId(transferId);
      await apiEndpoints.depotTransfers.approve(transferId, user.id);
      toast({ title: "Transfer approved successfully", description: "Stock has been reduced from source depot" });
      queryClient.invalidateQueries({ queryKey: ["depot-transfers"] });
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
      setApprovingId(null);
    }
  };

  const handleReceive = async (transferId: number) => {
    const userId = user?.id || 1;

    if (!userId) {
      toast({
        title: "Authentication required",
        description: "Please log in to receive transfers",
        variant: "destructive",
      });
      return;
    }

    try {
      setReceivingId(transferId);
      await apiEndpoints.depotTransfers.receive(transferId, userId);
      toast({ title: "Transfer received successfully", description: "Stock has been increased in destination depot" });
      queryClient.invalidateQueries({ queryKey: ["depot-transfers"] });
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
      setReceivingId(null);
    }
  };

  const tableRows: TransferRow[] = filteredTransfers.map((transfer, index) => ({
    ...transfer,
    sl: index + 1,
  }));

  const columns: DataTableColumn<TransferRow>[] = [
    { key: "sl", label: "SL", className: "w-12 tabular-nums text-[#64748B]" },
    {
      key: "transfer_number",
      label: "Transfer number",
      render: (val) => <span className="font-medium text-[#172B4D] dark:text-[#F1F5F9]">{String(val || "—")}</span>,
    },
    {
      key: "transfer_date",
      label: "Date",
      className: "whitespace-nowrap tabular-nums",
      render: (val) => (val ? new Date(String(val)).toLocaleDateString() : "—"),
    },
    { key: "from_depot_name", label: "From depot", render: (val) => String(val || "—") },
    { key: "to_depot_name", label: "To depot", render: (val) => String(val || "—") },
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
      render: (val) => `৳${Number(val || 0).toFixed(2)}`,
    },
    { key: "vehicle_registration", label: "Vehicle", render: (val) => String(val || "—") },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <DeliveryStatusBadge
          status={String(val || "")}
          label={String(val || "—")}
          className={statusClass[String(val)] || "bg-[#F1F5F9] text-[#475569]"}
        />
      ),
    },
    {
      key: "id",
      label: "Actions",
      align: "right",
      headerClassName: "text-right",
      render: (_val, row) => {
        const canApprove = row.status === "Pending";
        const canReceive = row.status === "In Transit";
        return (
          <div className="flex justify-end gap-0.5">
            <ActionIconButton
              label={canApprove ? "Approve this transfer" : "Only Pending transfers can be approved"}
              disabled={approvingId === row.id || !canApprove}
              onClick={() => handleApprove(row.id)}
              className="text-[#16A34A] hover:bg-[#ECFDF5] hover:text-[#15803D]"
            >
              {approvingId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            </ActionIconButton>
            <ActionIconButton
              label={canReceive ? "Receive this transfer" : "Only In Transit transfers can be received"}
              disabled={receivingId === row.id || !canReceive}
              onClick={() => handleReceive(row.id)}
              className="text-[#0C4DA1] hover:bg-[#EAF2FC] hover:text-[#0C4DA1]"
            >
              {receivingId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
            </ActionIconButton>
            <ActionIconButton
              label="View transfer"
              onClick={() => navigate(`/delivery/depot/${row.id}`)}
              className="text-[#475569] hover:bg-[#EAF2FC] hover:text-[#0C4DA1]"
            >
              <Eye className="h-4 w-4" />
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
            <div className="w-[260px] max-w-full space-y-1">
              <Label className={labelClass}>Search</Label>
              <Input
                placeholder="Search number, depot, or vehicle"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn("w-full", fieldClass)}
              />
            </div>
            <div className="w-[168px] space-y-1">
              <Label className={labelClass}>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className={cn("w-full", fieldClass)}>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent className={selectPanelClass}>
                  <SelectItem value="all" className={selectItemClass}>
                    All statuses
                  </SelectItem>
                  <SelectItem value="Draft" className={selectItemClass}>
                    Draft
                  </SelectItem>
                  <SelectItem value="Pending" className={selectItemClass}>
                    Pending
                  </SelectItem>
                  <SelectItem value="Approved" className={selectItemClass}>
                    Approved
                  </SelectItem>
                  <SelectItem value="In Transit" className={selectItemClass}>
                    In Transit
                  </SelectItem>
                  <SelectItem value="Received" className={selectItemClass}>
                    Received
                  </SelectItem>
                </SelectContent>
              </Select>
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
            title="Depot transfers"
            description="Transfer stock between depots and distribution centers."
            toolbarIcon={<Warehouse className="h-4 w-4" />}
            toolbarActions={
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="ntSecondary" className="!h-8" onClick={() => refetch()} disabled={loading}>
                  <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                  Refresh
                </Button>
                <Button type="button" variant="ntPrimary" className="!h-8" onClick={() => navigate("/delivery/depot/new")}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  New Transfer Request
                </Button>
              </div>
            }
            data={tableRows}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.id}
            resetPageKey={`${statusFilter}|${searchTerm}|${filteredTransfers.length}`}
            emptyMessage={searchTerm ? "No transfers found matching your search." : "No depot transfer requests yet."}
          />
        </motion.div>
      </div>
    </ThemeScope>
  );
}
