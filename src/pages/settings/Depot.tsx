import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Depot() {
  useEffect(() => {
    document.title = "Depot Settings | App";
  }, []);

  return (
    <main className="p-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Depot Settings</h1>
        <p className="text-sm text-muted-foreground">Manage depots, locations, and configurations.</p>
      </header>

      <section className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Depots</CardTitle>
            <CardDescription>Setup and manage your depots</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Placeholder content. Add depot list, creation forms, and details here.
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
