import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";

export default function IsolatedHome() {
  return (
    <main className="p-6 space-y-4">
      <PageHeader
        title="F.4B.3-DEV isolated workflow"
        subtitle="Test-only Submit/Approve/Reject. Not business approved. Not production."
        icon={ShieldAlert}
        variant="amber"
      />
      <p data-testid="isolated-workflow-banner" className="text-sm text-muted-foreground">
        Isolated FastAPI + disposable PostgreSQL only. Production Draft pages do not include these actions.
      </p>
      <p className="text-sm text-muted-foreground">
        Warehouse pick lists, issue slips, dispatch notes and delivery summaries are provisional test documents. They
        are not official challans.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sample/Gift</CardTitle>
          </CardHeader>
          <CardContent>
            <Link className="text-primary underline" to="/delivery/sample-gift">
              Open Sample/Gift list
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Export</CardTitle>
          </CardHeader>
          <CardContent>
            <Link className="text-primary underline" to="/delivery/export">
              Open Export list
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
