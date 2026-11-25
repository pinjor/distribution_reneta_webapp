import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPinned, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { MasterDataTable, ColumnDef } from "@/components/master-data/MasterDataTable";
import { apiEndpoints } from "@/lib/api";

interface DepotRoute {
  id: string;
  depotCode: string;
  depotName: string;
  routeCode: string;
  routeName: string;
}

interface DepotOption {
  id: number;
  code: string;
  name: string;
}

export default function ShippingPoints() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<DepotRoute | null>(null);
  const [routes, setRoutes] = useState<DepotRoute[]>([]);
  const [depotOptions, setDepotOptions] = useState<DepotOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    depotCode: "",
    routeCode: "",
    routeName: "",
  });

  const formatApiError = (err: unknown): string => {
    const anyErr = err as { message?: string; details?: { detail?: unknown } };
    const detail = anyErr?.details?.detail;
    if (Array.isArray(detail)) {
      return detail.map((item: any) => item?.msg || JSON.stringify(item)).join("; ");
    }
    if (typeof detail === "string") return detail;
    return anyErr?.message || "Request failed";
  };

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [depotRows, routeRows] = await Promise.all([
        apiEndpoints.depots.getAll(),
        apiEndpoints.routes.getAll(),
      ]);
      const depots: DepotOption[] = Array.isArray(depotRows)
        ? depotRows
            .filter((item: any) => item?.code && item?.name)
            .map((item: any) => ({ id: Number(item.id), code: String(item.code), name: String(item.name) }))
        : [];
      setDepotOptions(depots);
      const byId = new Map(depots.map((d) => [d.id, d]));
      const mapped: DepotRoute[] = Array.isArray(routeRows)
        ? routeRows.map((row: any) => {
            const depot = byId.get(Number(row.depot_id));
            return {
              id: String(row.id),
              depotCode: depot?.code || "",
              depotName: depot?.name || "",
              routeCode: row.code || row.route_id || "",
              routeName: row.name || "",
            };
          })
        : [];
      setRoutes(mapped);
    } catch (err) {
      const message = formatApiError(err);
      setError(message);
      setRoutes([]);
      toast({ title: "Failed to load shipping routes", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    document.title = "Shipping Routes | Renata";
    loadPageData();
  }, [loadPageData]);

  const resetForm = () => {
    setFormData({ depotCode: "", routeCode: "", routeName: "" });
    setSelectedRoute(null);
    setEditMode(false);
    setShowAddForm(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAdd = async () => {
    if (!formData.depotCode || !formData.routeCode || !formData.routeName) {
      toast({
        title: "Missing information",
        description: "Please provide depot, route code, and route name.",
        variant: "destructive",
      });
      return;
    }

    const depotInfo = depotOptions.find((option) => option.code === formData.depotCode);
    if (!depotInfo) {
      toast({
        title: "Invalid depot",
        description: "Please select a valid depot.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      route_id: formData.routeCode.trim(),
      name: formData.routeName.trim(),
      depot_id: depotInfo.id,
      status: "Active",
    };
    setSaving(true);
    try {
      if (editMode && selectedRoute) {
        await apiEndpoints.routes.update(Number(selectedRoute.id), payload);
        toast({
          title: "Route updated",
          description: "Depot route information has been updated successfully.",
        });
      } else {
        await apiEndpoints.routes.create(payload);
        toast({
          title: "Route added",
          description: `New route ${payload.route_id} - ${payload.name} created for ${depotInfo.name}.`,
        });
      }
      await loadPageData();
      resetForm();
    } catch (err) {
      toast({
        title: editMode ? "Failed to update route" : "Failed to create route",
        description: formatApiError(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (route: DepotRoute) => {
    setSelectedRoute(route);
    setFormData({
      depotCode: route.depotCode,
      routeCode: route.routeCode,
      routeName: route.routeName,
    });
    setEditMode(true);
    setShowAddForm(true);
  };

  const handleDelete = async (route: DepotRoute) => {
    if (!window.confirm(`Delete route ${route.routeCode} - ${route.routeName}? This cannot be undone.`)) return;
    try {
      await apiEndpoints.routes.delete(Number(route.id));
      toast({ title: "Route deleted", description: "The depot route has been removed.", variant: "destructive" });
      await loadPageData();
    } catch (err) {
      toast({ title: "Failed to delete route", description: formatApiError(err), variant: "destructive" });
    }
  };

  const columns: ColumnDef<DepotRoute>[] = [
    {
      key: "depotName",
      header: "Depot Name",
      render: (_, route) => <span className="font-medium">{`${route.depotCode} - ${route.depotName}`}</span>,
    },
    {
      key: "routeName",
      header: "Route Name",
    },
    {
      key: "completeRouteName",
      header: "Complete Route Name",
      render: (_, route) => <span>{`${route.routeCode} - ${route.routeName}`}</span>,
    },
  ];

  if (showAddForm) {
    const depotPreview = depotOptions.find((option) => option.code === formData.depotCode);

    return (
      <div className="space-y-6">
        <PageHeader
          title={editMode ? "Edit Shipping Route" : "Add Shipping Route"}
          subtitle={editMode ? "Update depot aligned shipping route information" : "Create a new route for the selected depot"}
          icon={MapPinned}
          variant="indigo"
          actions={(
            <Button
              variant="secondary"
              size="sm"
              onClick={resetForm}
             
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
        />

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="space-y-6 max-w-3xl">
              <div className="space-y-2">
                <Label htmlFor="sp-depot">Depot *</Label>
                <Select value={formData.depotCode} onValueChange={(value) => handleChange("depotCode", value)}>
                  <SelectTrigger id="sp-depot">
                    <SelectValue placeholder="Select depot" />
                  </SelectTrigger>
                  <SelectContent>
                    {depotOptions.map((option) => (
                      <SelectItem key={option.code} value={option.code}>
                        {`${option.code} - ${option.name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sp-route-code">Route Code *</Label>
                <Input
                  id="sp-route-code"
                  value={formData.routeCode}
                  onChange={(e) => handleChange("routeCode", e.target.value)}
                  placeholder="Enter route code"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sp-route-name">Route Name *</Label>
                <Input
                  id="sp-route-name"
                  value={formData.routeName}
                  onChange={(e) => handleChange("routeName", e.target.value)}
                  placeholder="Enter route name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sp-complete-name">Complete Route Name</Label>
                <Input
                  id="sp-complete-name"
                  value={formData.routeCode && formData.routeName ? `${formData.routeCode} - ${formData.routeName}` : ""}
                  readOnly
                  className="bg-muted"
                  placeholder="Route code and name preview"
                />
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Selected depot: {depotPreview ? `${depotPreview.code} - ${depotPreview.name}` : "Not selected"}</p>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={saving}>
                  {saving ? "Saving..." : editMode ? "Update Route" : "Create Route"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipping Routes"
        subtitle="Manage depot specific shipping routes and alignment"
        icon={MapPinned}
        variant="indigo"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <MasterDataTable
        title="Depot Shipping Routes"
        description={`Total routes: ${routes.length}`}
        data={routes}
        columns={columns}
        searchPlaceholder="Search routes..."
        searchFields={["depotName", "routeCode", "routeName"]}
        itemsPerPage={10}
        onAdd={() => setShowAddForm(true)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage={loading ? "Loading routes..." : "No routes found"}
        showCode={true}
        codeKey="routeCode"
      />
    </div>
  );
}
