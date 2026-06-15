import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { apiEndpoints } from "@/lib/api";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

export default function AuditLogsPage() {
  const [entityType, setEntityType] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", entityType],
    queryFn: () => apiEndpoints.auditLogs.list(entityType ? { entity_type: entityType } : undefined),
  });

  const items = data?.items || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle="Immutable audit trail for critical business actions"
        icon={ShieldCheck}
        variant="slate"
      />
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <Input placeholder="Entity type (e.g. order)" value={entityType} onChange={(e) => setEntityType(e.target.value)} className="max-w-sm" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          {isLoading ? <p>Loading...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Depot</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.created_at}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.entity_type} / {log.entity_id}</TableCell>
                    <TableCell>{log.user_name || "-"}</TableCell>
                    <TableCell>{log.depot_code || log.depot_id || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
