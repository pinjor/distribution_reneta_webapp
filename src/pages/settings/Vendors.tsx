import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Vendors() {
  useEffect(() => {
    document.title = "Vendors Settings | App";
  }, []);

  return (
    <main className="p-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Vendors</h1>
        <p className="text-sm text-muted-foreground">Manage vendor onboarding and contracts.</p>
      </header>

      <section className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Vendor List</CardTitle>
            <CardDescription>Procurement and supplier settings</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Placeholder content. Add vendors table and details here.
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
