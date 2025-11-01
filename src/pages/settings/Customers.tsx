import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Customers() {
  useEffect(() => {
    document.title = "Customers Settings | App";
  }, []);

  return (
    <main className="p-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Customers</h1>
        <p className="text-sm text-muted-foreground">Manage customers, contracts, and pricing.</p>
      </header>

      <section className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Customer List</CardTitle>
            <CardDescription>CRM and account settings</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Placeholder content. Add customers table and details here.
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
