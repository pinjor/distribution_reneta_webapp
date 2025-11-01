import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Materials() {
  useEffect(() => {
    document.title = "Materials Settings | App";
  }, []);

  return (
    <main className="p-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Materials</h1>
        <p className="text-sm text-muted-foreground">Manage material master data.</p>
      </header>

      <section className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Catalog</CardTitle>
            <CardDescription>Materials and attributes</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Placeholder content. Add materials table and forms here.
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
