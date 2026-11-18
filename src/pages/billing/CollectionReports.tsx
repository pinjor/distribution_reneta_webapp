import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";
import {
  ChevronDown,
  ChevronRight,
  Coins,
  FileText,
  Loader2,
  RefreshCw,
  RotateCcw,
  TrendingUp,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { DateRangeField } from "@/components/transport/DateRangeField";
import { ActionIconButton, KpiCard, sectionMotion } from "@/components/transport/transportUi";
import { cn } from "@/lib/utils";

interface CollectionReport {
  collection_person_id: number;
  collection_person_name: string;
  total_collected: number;
  total_deposited: number;
  total_pending: number;
  transaction_count: number;
  deposits: CollectionDeposit[];
  transactions: CollectionTransaction[];
}

interface CollectionDeposit {
  id: number;
  deposit_number: string;
  deposit_date: string;
  deposit_method: string;
  deposit_amount: number;
  transaction_number: string;
  approved: boolean;
  rejected?: boolean;
}

interface CollectionTransaction {
  id: number;
  order_id: number;
  order_number?: string;
  memo_number?: string;
  customer_name?: string;
  collection_date: string;
  collection_type: string;
  collected_amount: number;
  pending_amount: number;
  total_amount: number;
}

function formatMoney(value: number) {
  return `৳${Number(value).toFixed(2)}`;
}

export default function CollectionReports() {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    document.title = "Collection Reports | Renata";
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedPersons, setExpandedPersons] = useState<Set<number>>(new Set());

  const { data: reportsData, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["billing-reports", startDate, endDate],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const result = await apiEndpoints.billing.reports.getAll(params);
      return Array.isArray(result) ? result : [];
    },
  });

  const reports = reportsData || [];

  const filteredReports = reports.filter((report: CollectionReport) => {
    const term = searchTerm.toLowerCase();
    return report.collection_person_name.toLowerCase().includes(term);
  });

  const togglePerson = (personId: number) => {
    setExpandedPersons((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(personId)) {
        newSet.delete(personId);
      } else {
        newSet.add(personId);
      }
      return newSet;
    });
  };

  const getTotalStats = () => {
    const totals = reports.reduce(
      (acc, report) => ({
        total_collected: acc.total_collected + Number(report.total_collected),
        total_deposited: acc.total_deposited + Number(report.total_deposited),
        total_pending: acc.total_pending + Number(report.total_pending),
        transaction_count: acc.transaction_count + report.transaction_count,
      }),
      { total_collected: 0, total_deposited: 0, total_pending: 0, transaction_count: 0 },
    );
    return totals;
  };

  const totals = getTotalStats();
  const motionProps = sectionMotion(reduceMotion);
  const expandedReports = filteredReports.filter((report) => expandedPersons.has(report.collection_person_id));

  const personColumns: DataTableColumn<CollectionReport>[] = [
    {
      key: "collection_person_name",
      label: "Collection Person",
      render: (val) => <span className="font-medium text-[#172B4D] dark:text-[#F1F5F9]">{String(val || "—")}</span>,
    },
    {
      key: "transaction_count",
      label: "Transactions",
      className: "tabular-nums",
      render: (val) => String(val ?? 0),
    },
    {
      key: "total_collected",
      label: "Collected",
      align: "right",
      className: "tabular-nums font-medium text-[#15803D]",
      render: (val) => formatMoney(Number(val)),
    },
    {
      key: "total_deposited",
      label: "Deposited",
      align: "right",
      className: "tabular-nums font-medium text-[#0C4DA1]",
      render: (val) => formatMoney(Number(val)),
    },
    {
      key: "total_pending",
      label: "Pending",
      align: "right",
      className: "tabular-nums font-medium text-[#B45309]",
      render: (val) => formatMoney(Number(val)),
    },
    {
      key: "collection_person_id",
      label: "Details",
      align: "right",
      headerClassName: "text-right",
      render: (_val, row) => {
        const isExpanded = expandedPersons.has(row.collection_person_id);
        return (
          <div
            className="flex justify-end"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <ActionIconButton
              label={isExpanded ? "Hide details" : "Show details"}
              onClick={() => togglePerson(row.collection_person_id)}
              className="text-[#0C4DA1] hover:bg-[#EAF2FC]"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </ActionIconButton>
          </div>
        );
      },
    },
  ];

  const depositColumns: DataTableColumn<CollectionDeposit>[] = [
    {
      key: "deposit_number",
      label: "Deposit Number",
      render: (val) => <span className="font-medium text-[#0C4DA1] dark:text-[#70ADFF]">{String(val || "—")}</span>,
    },
    {
      key: "deposit_date",
      label: "Date",
      className: "whitespace-nowrap",
      render: (val) => (val ? format(new Date(String(val)), "MMM dd, yyyy") : "—"),
    },
    {
      key: "deposit_method",
      label: "Method",
      render: (val) => (
        <span className="inline-flex rounded-full border border-[#E3EAF3] bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-semibold text-[#0C4DA1] dark:border-[#2C3B50] dark:bg-[#1B304D] dark:text-[#70ADFF]">
          {String(val || "—")}
        </span>
      ),
    },
    {
      key: "transaction_number",
      label: "Transaction Number",
      className: "font-mono text-[13px]",
    },
    {
      key: "deposit_amount",
      label: "Amount",
      align: "right",
      className: "tabular-nums font-medium",
      render: (val) => formatMoney(Number(val)),
    },
    {
      key: "approved",
      label: "Status",
      render: (_val, row) =>
        row.rejected ? (
          <span className="inline-flex rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-semibold text-[#B91C1C] dark:bg-[#3B1212] dark:text-[#FCA5A5]">
            Rejected
          </span>
        ) : row.approved ? (
          <span className="inline-flex rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]">
            Approved
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-[#FFFBEB] px-2 py-0.5 text-[11px] font-semibold text-[#B45309] dark:bg-[#3B2A0A] dark:text-[#FBBF24]">
            Pending
          </span>
        ),
    },
  ];

  const transactionColumns: DataTableColumn<CollectionTransaction>[] = [
    {
      key: "memo_number",
      label: "Memo No.",
      render: (val) => <span className="font-medium">{String(val || "—")}</span>,
    },
    {
      key: "order_number",
      label: "Order No.",
      render: (val) => String(val || "—"),
    },
    {
      key: "customer_name",
      label: "Customer",
      render: (val) => String(val || "—"),
    },
    {
      key: "collection_date",
      label: "Date",
      className: "whitespace-nowrap",
      render: (val) => (val ? format(new Date(String(val)), "MMM dd, yyyy") : "—"),
    },
    {
      key: "collection_type",
      label: "Type",
      render: (val) => {
        const type = String(val || "—");
        const full = type === "Fully Collected";
        return (
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
              full
                ? "bg-[#ECFDF5] text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]"
                : "border border-[#E3EAF3] bg-[#F8FAFC] text-[#475569] dark:border-[#2C3B50] dark:bg-[#1B283B] dark:text-[#A9B8CC]",
            )}
          >
            {type}
          </span>
        );
      },
    },
    {
      key: "total_amount",
      label: "Total",
      align: "right",
      className: "tabular-nums",
      render: (val) => formatMoney(Number(val)),
    },
    {
      key: "collected_amount",
      label: "Collected",
      align: "right",
      className: "tabular-nums font-medium text-[#15803D]",
      render: (val) => formatMoney(Number(val)),
    },
    {
      key: "pending_amount",
      label: "Pending",
      align: "right",
      className: "tabular-nums text-[#B45309]",
      render: (val) => formatMoney(Number(val)),
    },
  ];

  const hasExpanded = expandedReports.length > 0;

  return (
    <ThemeScope className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-hidden">
        <motion.div {...motionProps} className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Total Collected" value={formatMoney(totals.total_collected)} icon={Coins} accent="green" />
          <KpiCard title="Total Deposited" value={formatMoney(totals.total_deposited)} icon={TrendingUp} accent="blue" />
          <div className="rounded-xl border border-[#E3EAF3] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-[#2C3B50] dark:bg-[#151F30]">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFFBEB] text-[#B45309] dark:bg-[#3B2A0A] dark:text-[#FBBF24]">
                <FileText className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#64748B] dark:text-[#A9B8CC]">Total Pending</p>
                <p className="text-xl font-semibold tabular-nums tracking-tight text-[#172B4D] dark:text-[#F1F5F9]">
                  {formatMoney(totals.total_pending)}
                </p>
              </div>
            </div>
          </div>
          <KpiCard title="Total Transactions" value={totals.transaction_count} icon={User} accent="purple" />
        </motion.div>

        <motion.div {...motionProps} className="nt-form shrink-0">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
            <DateRangeField
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
            />
            <Button
              type="button"
              variant="ntSecondary"
              className="!h-10"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setSearchTerm("");
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear Filters
            </Button>
          </div>
        </motion.div>

        <motion.div
          {...motionProps}
          className={cn("flex min-h-0 min-w-0 flex-col", hasExpanded ? "h-[11.5rem] shrink-0" : "min-h-0 flex-1")}
        >
          <DataTable
            className="min-h-0 min-w-0 flex-1 overflow-hidden"
            title="Collection Person Reports"
            description="View collection history and statistics by collection person."
            toolbarIcon={<FileText className="h-4 w-4" />}
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: "Search by name...",
            }}
            toolbarActions={
              <Button type="button" variant="ntSecondary" className="!h-8" onClick={() => refetch()} disabled={isFetching}>
                {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Refresh
              </Button>
            }
            data={filteredReports}
            columns={personColumns}
            loading={isLoading}
            error={isError ? (error instanceof Error ? error.message : "Unable to load reports") : undefined}
            getRowId={(row) => row.collection_person_id}
            onRowClick={(row) => togglePerson(row.collection_person_id)}
            getRowClassName={(row) =>
              expandedPersons.has(row.collection_person_id)
                ? "bg-[#EAF2FC]/70 dark:bg-[#1B304D]/40"
                : ""
            }
            resetPageKey={`${startDate}|${endDate}|${searchTerm}|${filteredReports.length}`}
            emptyMessage="No reports found"
          />
        </motion.div>

        {expandedReports.map((report) => (
          <motion.div
            key={report.collection_person_id}
            {...motionProps}
            className="nt-page-scroll flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto rounded-2xl border border-[#E3EAF3] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-[#2C3B50] dark:bg-[#151F30]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div>
                <p className="text-sm font-semibold text-[#172B4D] dark:text-[#F1F5F9]">{report.collection_person_name}</p>
                <p className="text-[12px] text-[#64748B] dark:text-[#A9B8CC]">{report.transaction_count} transactions</p>
              </div>
              <Button type="button" variant="ntSecondary" className="!h-8" onClick={() => togglePerson(report.collection_person_id)}>
                Hide details
              </Button>
            </div>

            {report.deposits.length > 0 ? (
              <DataTable
                className="h-[28rem] min-h-[28rem] shrink-0 overflow-hidden"
                title="Deposits"
                toolbarIcon={<Coins className="h-4 w-4" />}
                data={report.deposits}
                columns={depositColumns}
                getRowId={(row) => row.id}
                initialPageSize={20}
                resetPageKey={`${report.collection_person_id}|deposits|${report.deposits.length}`}
                emptyMessage="No deposits found"
              />
            ) : null}

            {report.transactions.length > 0 ? (
              <DataTable
                className="h-[28rem] min-h-[28rem] shrink-0 overflow-hidden"
                title="Transactions"
                toolbarIcon={<FileText className="h-4 w-4" />}
                data={report.transactions}
                columns={transactionColumns}
                getRowId={(row) => row.id}
                initialPageSize={20}
                resetPageKey={`${report.collection_person_id}|transactions|${report.transactions.length}`}
                emptyMessage="No transactions found"
              />
            ) : null}
          </motion.div>
        ))}
      </div>
    </ThemeScope>
  );
}
