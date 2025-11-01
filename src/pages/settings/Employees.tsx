import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Employees() {
  useEffect(() => {
    document.title = "Employees Settings | App";
  }, []);

  return (
    <main className="p-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Employees</h1>
        <p className="text-sm text-muted-foreground">Manage employee profiles, roles, and permissions.</p>
      </header>

      <section className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Directory</CardTitle>
            <CardDescription>Employee management</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Placeholder content. Add employees table and role management here.
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
