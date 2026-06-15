import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { apiEndpoints, api } from "@/lib/api";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

export default function ReportCenterPage() {
  const [selectedReport, setSelectedReport] = useState("");
  const { data: registry } = useQuery({
    queryKey: ["report-registry"],
    queryFn: apiEndpoints.platformReports.registry,
  });
  const { data: reportData, refetch, isFetching } = useQuery({
    queryKey: ["report-run", selectedReport],
    queryFn: () => apiEndpoints.platformReports.run(selectedReport),
    enabled: !!selectedReport,
  });

  const handleExport = () => {
    if (!selectedReport) return;
    window.open(apiEndpoints.platformReports.exportCsv(selectedReport), "_blank");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Center"
        subtitle={`${registry?.length || 0} reports available`}
        icon={FileText}
        variant="slate"
      />
      <Card>
        <CardHeader><CardTitle>Run Report</CardTitle></CardHeader>
        <CardContent className="flex gap-4 flex-wrap">
          <Select value={selectedReport} onValueChange={setSelectedReport}>
            <SelectTrigger className="w-80"><SelectValue placeholder="Select report" /></SelectTrigger>
            <SelectContent>
              {(registry || []).map((r: any) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => refetch()} disabled={!selectedReport || isFetching}>Run</Button>
          <Button variant="outline" onClick={handleExport} disabled={!selectedReport}>Export CSV</Button>
        </CardContent>
      </Card>
      {reportData && (
        <Card>
          <CardHeader><CardTitle>{reportData.report}</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto max-h-96">{JSON.stringify(reportData.rows?.slice(0, 50) || reportData, null, 2)}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
