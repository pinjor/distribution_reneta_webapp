import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { BarChart3, Download, FileText, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { apiEndpoints } from "@/lib/api";
import { cn } from "@/lib/utils";
import { asList, fieldClass, KpiCard, selectItemClass, selectPanelClass } from "@/components/transport/transportUi";

type ReportRegistryItem = {
  id: string;
  name: string;
  category: string;
};

type ReportRunResult = {
  report: string;
  rows?: Record<string, unknown>[];
  message?: string;
};

type ReportRow = Record<string, unknown> & { __rowId: string };

function formatColumnLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function categoryLabel(category: string) {
  if (!category) return "Other";
  return category.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ReportCenterPage() {
  const reduceMotion = useReducedMotion();
  const [selectedReport, setSelectedReport] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    document.title = "Report Center | Renata";
  }, []);

  const { data: registry, isLoading: registryLoading } = useQuery({
    queryKey: ["report-registry"],
    queryFn: async () => asList<ReportRegistryItem>(await apiEndpoints.platformReports.registry()),
  });

  const reports = registry || [];

  const selectedReportMeta = useMemo(
    () => reports.find((item) => item.id === selectedReport),
    [reports, selectedReport],
  );

  const groupedReports = useMemo(() => {
    const groups = new Map<string, ReportRegistryItem[]>();
    for (const report of reports) {
      const key = report.category || "other";
      const list = groups.get(key) || [];
      list.push(report);
      groups.set(key, list);
    }
    return Array.from(groups.entries());
  }, [reports]);

  const { data: reportData, refetch, isFetching, isError, error } = useQuery({
    queryKey: ["report-run", selectedReport],
    queryFn: () => apiEndpoints.platformReports.run(selectedReport) as Promise<ReportRunResult>,
    enabled: !!selectedReport,
  });

  const sourceRows = reportData?.rows ?? [];
  const rows: ReportRow[] = useMemo(
    () => sourceRows.map((row, index) => ({ ...row, __rowId: `${selectedReport}-${index}` })),
    [sourceRows, selectedReport],
  );

  const columnKeys = useMemo(() => {
    if (sourceRows.length === 0) return [];
    return Object.keys(sourceRows[0]);
  }, [sourceRows]);

  const columns: DataTableColumn<ReportRow>[] = useMemo(
    () =>
      columnKeys.map((column) => ({
        key: column as keyof ReportRow,
        label: formatColumnLabel(column),
        className: "max-w-xs truncate",
        render: (val) => formatCellValue(val),
      })),
    [columnKeys],
  );

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      columnKeys.some((column) => formatCellValue(row[column]).toLowerCase().includes(term)),
    );
  }, [rows, columnKeys, searchTerm]);

  const handleExport = () => {
    if (!selectedReport) return;
    window.open(apiEndpoints.platformReports.exportCsv(selectedReport), "_blank");
  };

  const reportTitle =
    selectedReportMeta?.name ||
    (reportData?.report ? formatColumnLabel(reportData.report) : "Report Results");

  const emptyMessage = !selectedReport
    ? "Select a report to run"
    : reportData?.message && rows.length === 0
      ? reportData.message
      : "No data returned for this report.";

  const motionProps = {
    initial: reduceMotion ? false : { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: reduceMotion ? 0 : 0.18 },
  };

  return (
    <ThemeScope className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-hidden">
        <motion.div {...motionProps} className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard title="Reports available" value={reports.length} icon={BarChart3} accent="blue" />
          <KpiCard title="Category" value={selectedReportMeta ? categoryLabel(selectedReportMeta.category) : "—"} icon={FileText} accent="purple" />
          <KpiCard title="Result rows" value={sourceRows.length} icon={FileText} accent="green" />
        </motion.div>

        <motion.div {...motionProps} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DataTable
            className="min-h-0 min-w-0 flex-1 overflow-hidden"
            title={reportTitle}
            description={
              selectedReport
                ? `${sourceRows.length} row${sourceRows.length === 1 ? "" : "s"} returned.`
                : `${reports.length} reports available.`
            }
            toolbarIcon={<BarChart3 className="h-4 w-4" />}
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: "Search results...",
            }}
            toolbarFilters={
              <Select value={selectedReport} onValueChange={setSelectedReport}>
                <SelectTrigger className={cn("h-9 w-[280px]", fieldClass)} aria-label="Select report">
                  <SelectValue placeholder="Select report" />
                </SelectTrigger>
                <SelectContent className={selectPanelClass}>
                  {groupedReports.map(([category, items]) => (
                    <SelectGroup key={category}>
                      <SelectLabel className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                        {categoryLabel(category)}
                      </SelectLabel>
                      {items.map((report) => (
                        <SelectItem key={report.id} value={report.id} className={selectItemClass}>
                          {report.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            }
            toolbarActions={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="ntPrimary"
                  className="!h-8"
                  onClick={() => refetch()}
                  disabled={!selectedReport || isFetching}
                >
                  {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  {isFetching ? "Running…" : "Run"}
                </Button>
                <Button
                  type="button"
                  variant="ntSecondary"
                  className="!h-8"
                  onClick={handleExport}
                  disabled={!selectedReport}
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </Button>
              </div>
            }
            data={filteredRows}
            columns={columns.length > 0 ? columns : [{ key: "__rowId", label: "Results", render: () => "—" }]}
            loading={registryLoading || (Boolean(selectedReport) && isFetching && !reportData)}
            error={isError ? (error instanceof Error ? error.message : "Unable to run report") : undefined}
            getRowId={(row) => row.__rowId}
            resetPageKey={`${selectedReport}|${searchTerm}|${filteredRows.length}`}
            emptyMessage={emptyMessage}
          />
        </motion.div>
      </div>
    </ThemeScope>
  );
}
