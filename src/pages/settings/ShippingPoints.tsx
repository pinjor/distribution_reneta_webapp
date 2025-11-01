import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ShippingPoints() {
  useEffect(() => {
    document.title = "Shipping Points Settings | App";
  }, []);

  return (
    <main className="p-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Shipping Points</h1>
        <p className="text-sm text-muted-foreground">Manage shipping points and distribution nodes.</p>
      </header>

      <section className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Network</CardTitle>
            <CardDescription>Locations and capabilities</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Placeholder content. Add shipping points list and details here.
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
