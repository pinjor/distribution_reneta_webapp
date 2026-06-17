import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { apiEndpoints } from "@/lib/api";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

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

function formatColumnLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export default function ReportCenterPage() {
  const [selectedReport, setSelectedReport] = useState("");
  const { data: registry } = useQuery({
    queryKey: ["report-registry"],
    queryFn: apiEndpoints.platformReports.registry,
  });

  const selectedReportMeta = useMemo(
    () => (registry as ReportRegistryItem[] | undefined)?.find((item) => item.id === selectedReport),
    [registry, selectedReport],
  );

  const { data: reportData, refetch, isFetching } = useQuery({
    queryKey: ["report-run", selectedReport],
    queryFn: () => apiEndpoints.platformReports.run(selectedReport) as Promise<ReportRunResult>,
    enabled: !!selectedReport,
  });

  const rows = reportData?.rows ?? [];
  const columns = useMemo(() => {
    if (rows.length === 0) return [];
    return Object.keys(rows[0]);
  }, [rows]);

  const handleExport = () => {
    if (!selectedReport) return;
    window.open(apiEndpoints.platformReports.exportCsv(selectedReport), "_blank");
  };

  const reportTitle =
    selectedReportMeta?.name ||
    (reportData?.report ? formatColumnLabel(reportData.report) : "Report Results");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Center"
        subtitle={`${(registry as ReportRegistryItem[] | undefined)?.length || 0} reports available`}
        icon={FileText}
      />
      <Card>
        <CardHeader>
          <CardTitle>Run Report</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 flex-wrap">
          <Select value={selectedReport} onValueChange={setSelectedReport}>
            <SelectTrigger className="w-80">
              <SelectValue placeholder="Select report" />
            </SelectTrigger>
            <SelectContent>
              {((registry as ReportRegistryItem[] | undefined) || []).map((report) => (
                <SelectItem key={report.id} value={report.id}>
                  {report.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => refetch()} disabled={!selectedReport || isFetching}>
            {isFetching ? "Running…" : "Run"}
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={!selectedReport}>
            Export CSV
          </Button>
        </CardContent>
      </Card>

      {reportData && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>{reportTitle}</CardTitle>
            <span className="text-sm text-muted-foreground">
              {rows.length} row{rows.length === 1 ? "" : "s"}
            </span>
          </CardHeader>
          <CardContent>
            {reportData.message && rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{reportData.message}</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No data returned for this report.</p>
            ) : (
              <div className="rounded-lg border overflow-auto max-h-[32rem]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((column) => (
                        <TableHead key={column} className="whitespace-nowrap">
                          {formatColumnLabel(column)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {columns.map((column) => (
                          <TableCell key={column} className="max-w-xs truncate" title={formatCellValue(row[column])}>
                            {formatCellValue(row[column])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
