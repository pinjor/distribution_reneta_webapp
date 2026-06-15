import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { apiEndpoints } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Scale } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

export default function Reconciliation() {
  const [loadingNumber, setLoadingNumber] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pending, isLoading } = useQuery({
    queryKey: ["reconciliation-pending"],
    queryFn: apiEndpoints.reconciliation.pending,
  });

  const createMutation = useMutation({
    mutationFn: (ln: string) => apiEndpoints.reconciliation.createFromAssignment(ln),
    onSuccess: () => {
      toast({ title: "Reconciliation created" });
      queryClient.invalidateQueries({ queryKey: ["reconciliation-pending"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => apiEndpoints.reconciliation.approve(id),
    onSuccess: () => {
      toast({ title: "Reconciliation approved" });
      queryClient.invalidateQueries({ queryKey: ["reconciliation-pending"] });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Post-Delivery Reconciliation"
        subtitle="Finance reconciliation from assignment loading numbers"
        icon={Scale}
        variant="sky"
      />

      <Card>
        <CardHeader><CardTitle>Create Reconciliation</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="Loading number e.g. 20250615-0001" value={loadingNumber} onChange={(e) => setLoadingNumber(e.target.value)} />
          <Button onClick={() => createMutation.mutate(loadingNumber)} disabled={!loadingNumber}>Create</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pending Reconciliations</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p>Loading...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reconciliation No</TableHead>
                  <TableHead>Loading #</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Collected</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(pending || []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.reconciliation_no}</TableCell>
                    <TableCell>{r.loading_number}</TableCell>
                    <TableCell>{Number(r.total_delivered_value).toLocaleString()}</TableCell>
                    <TableCell>{Number(r.total_collection_value).toLocaleString()}</TableCell>
                    <TableCell className={Number(r.variance_amount) !== 0 ? "text-destructive font-semibold" : "text-success"}>
                      {Number(r.variance_amount).toLocaleString()}
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => approveMutation.mutate(r.id)}>Approve</Button>
                    </TableCell>
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
