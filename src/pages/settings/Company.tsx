import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Company() {
  useEffect(() => {
    document.title = "Company Settings | App";
  }, []);

  return (
    <main className="p-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Company Settings</h1>
        <p className="text-sm text-muted-foreground">Manage company details and preferences.</p>
      </header>

      <section className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Configuration coming soon</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This is a placeholder page. Add your company profile and branding settings here.
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
