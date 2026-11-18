import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import { FileText, Loader2, RefreshCw, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { apiEndpoints } from "@/lib/api";
import { cn } from "@/lib/utils";
import { fieldClass, KpiCard } from "@/components/transport/transportUi";

interface AuditLog {
  id: number;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  user_name?: string | null;
  depot_code?: string | null;
  depot_id?: number | null;
  created_at?: string | null;
}

interface AuditLogListResponse {
  total?: number;
  items?: AuditLog[];
}

function actionTone(action?: string) {
  const value = (action || "").toUpperCase();
  if (value.includes("REJECT") || value.includes("DELETE") || value.includes("BLOCK")) {
    return "bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#3B1212] dark:text-[#FCA5A5]";
  }
  if (value.includes("APPROVE") || value.includes("CREATE") || value.includes("SUCCESS")) {
    return "bg-[#ECFDF5] text-[#15803D] dark:bg-[#052E1C] dark:text-[#4ADE80]";
  }
  if (value.includes("UPDATE") || value.includes("VERIFY")) {
    return "bg-[#EAF2FC] text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]";
  }
  return "bg-[#F8FAFC] text-[#475569] dark:bg-[#1B283B] dark:text-[#A9B8CC]";
}

export default function AuditLogsPage() {
  const reduceMotion = useReducedMotion();
  const [entityType, setEntityType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    document.title = "Audit Logs | Renata";
  }, []);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["audit-logs", entityType],
    queryFn: async () => {
      const result = (await apiEndpoints.auditLogs.list(
        entityType ? { entity_type: entityType } : undefined,
      )) as AuditLogListResponse | AuditLog[];
      if (Array.isArray(result)) {
        return { total: result.length, items: result };
      }
      return {
        total: Number(result?.total ?? result?.items?.length ?? 0),
        items: Array.isArray(result?.items) ? result.items : [],
      };
    },
  });

  const items = data?.items || [];
  const total = data?.total ?? items.length;

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return items;
    return items.filter((log) =>
      [log.action, log.entity_type, log.entity_id, log.user_name, log.depot_code, log.depot_id]
        .filter((value) => value !== undefined && value !== null)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [items, searchTerm]);

  const columns: DataTableColumn<AuditLog>[] = [
    {
      key: "created_at",
      label: "Time",
      className: "whitespace-nowrap tabular-nums",
      render: (val) => (val ? format(new Date(String(val)), "MMM dd, yyyy HH:mm") : "—"),
    },
    {
      key: "action",
      label: "Action",
      render: (val) => (
        <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", actionTone(String(val || "")))}>
          {String(val || "—")}
        </span>
      ),
    },
    {
      key: "entity_type",
      label: "Entity",
      render: (_val, row) => (
        <span>
          <span className="font-medium text-[#172B4D] dark:text-[#F1F5F9]">{row.entity_type || "—"}</span>
          <span className="text-[#64748B] dark:text-[#A9B8CC]"> / {row.entity_id || "—"}</span>
        </span>
      ),
    },
    {
      key: "user_name",
      label: "User",
      render: (val) => String(val || "—"),
    },
    {
      key: "depot_code",
      label: "Depot",
      render: (_val, row) => String(row.depot_code || row.depot_id || "—"),
    },
  ];

  const motionProps = {
    initial: reduceMotion ? false : { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: reduceMotion ? 0 : 0.18 },
  };

  return (
    <ThemeScope className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-hidden">
        <motion.div {...motionProps} className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard title="Matching records" value={total} icon={ShieldCheck} accent="blue" />
          <KpiCard title="Loaded rows" value={items.length} icon={FileText} accent="green" />
          <KpiCard title="Visible" value={filtered.length} icon={User} accent="purple" />
        </motion.div>

        <motion.div {...motionProps} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DataTable
            className="min-h-0 min-w-0 flex-1 overflow-hidden"
            title="Audit Logs"
            description="Immutable audit trail for critical business actions."
            toolbarIcon={<ShieldCheck className="h-4 w-4" />}
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: "Search loaded logs...",
            }}
            toolbarFilters={
              <Input
                value={entityType}
                onChange={(event) => setEntityType(event.target.value)}
                placeholder="Entity type (e.g. order)"
                aria-label="Entity type"
                className={cn("h-9 w-[220px]", fieldClass)}
              />
            }
            toolbarActions={
              <Button type="button" variant="ntSecondary" className="!h-8" onClick={() => refetch()} disabled={isFetching}>
                {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Refresh
              </Button>
            }
            data={filtered}
            columns={columns}
            loading={isLoading}
            error={isError ? (error instanceof Error ? error.message : "Unable to load audit logs") : undefined}
            getRowId={(row) => row.id}
            resetPageKey={`${entityType}|${searchTerm}|${filtered.length}`}
            emptyMessage="No audit logs found"
          />
        </motion.div>
      </div>
    </ThemeScope>
  );
}
