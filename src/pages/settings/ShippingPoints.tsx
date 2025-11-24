import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPinned, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MasterDataTable, ColumnDef } from "@/components/master-data/MasterDataTable";

interface DepotRoute {
  id: string;
  depotCode: string;
  depotName: string;
  routeCode: string;
  routeName: string;
}

interface DepotOption {
  code: string;
  name: string;
}

const DEPOT_STORAGE_KEY = "depotMasterData";

const defaultDepotOptions: DepotOption[] = [
  { code: "120", name: "Kushtia Depot" },
  { code: "107", name: "Khulna Depot" },
];

const initialRoutes: DepotRoute[] = [
  { id: "20045", depotCode: "120", depotName: "Kushtia Depot", routeCode: "20045", routeName: "Vangura - 2" },
  { id: "20046", depotCode: "120", depotName: "Kushtia Depot", routeCode: "20046", routeName: "Rajbari - 1" },
  { id: "20047", depotCode: "120", depotName: "Kushtia Depot", routeCode: "20047", routeName: "Rajbari - 2" },
  { id: "20048", depotCode: "120", depotName: "Kushtia Depot", routeCode: "20048", routeName: "Pangsha - 1" },
  { id: "20049", depotCode: "120", depotName: "Kushtia Depot", routeCode: "20049", routeName: "Pangsha - 2" },
  { id: "20050", depotCode: "120", depotName: "Kushtia Depot", routeCode: "20050", routeName: "Baliakandi" },
  { id: "07001", depotCode: "107", depotName: "Khulna Depot", routeCode: "07001", routeName: "Heraj Market" },
  { id: "07002", depotCode: "107", depotName: "Khulna Depot", routeCode: "07002", routeName: "Moylapota" },
  { id: "07003", depotCode: "107", depotName: "Khulna Depot", routeCode: "07003", routeName: "Gollamari Sachibunia" },
  { id: "07004", depotCode: "107", depotName: "Khulna Depot", routeCode: "07004", routeName: "Shishu Hospital+ Rupsha" },
  { id: "07005", depotCode: "107", depotName: "Khulna Depot", routeCode: "07005", routeName: "Shantidham" },
  { id: "07006", depotCode: "107", depotName: "Khulna Depot", routeCode: "07006", routeName: "KMCH" },
];

export default function ShippingPoints() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<DepotRoute | null>(null);
  const [routes, setRoutes] = useState<DepotRoute[]>(initialRoutes);
  const [depotOptions, setDepotOptions] = useState<DepotOption[]>(() => {
    if (typeof window === "undefined") {
      return defaultDepotOptions;
    }
    try {
      const stored = window.localStorage.getItem(DEPOT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Array<{ code?: string; name?: string }>;
        if (Array.isArray(parsed)) {
          const mapped = parsed
            .filter((item) => item?.code && item?.name)
            .map((item) => ({ code: String(item.code), name: String(item.name) }));
          if (mapped.length > 0) {
            return mapped;
          }
        }
      }
    } catch (error) {
      console.warn("Failed to parse depot options", error);
    }
    return defaultDepotOptions;
  });
  const [formData, setFormData] = useState({
    depotCode: "",
    routeCode: "",
    routeName: "",
  });

  useEffect(() => {
    document.title = "Shipping Routes | App";
  }, []);

  const refreshDepotOptions = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(DEPOT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Array<{ code?: string; name?: string }>;
        if (Array.isArray(parsed)) {
          const mapped = parsed
            .filter((item) => item?.code && item?.name)
            .map((item) => ({ code: String(item.code), name: String(item.name) }));
          if (mapped.length > 0) {
            setDepotOptions(mapped);
            return;
          }
        }
      }
    } catch (error) {
      console.warn("Failed to refresh depot options", error);
    }
    setDepotOptions(defaultDepotOptions);
  }, []);

  useEffect(() => {
    refreshDepotOptions();
    if (typeof window === "undefined") return;
    window.addEventListener("depot-data-updated", refreshDepotOptions);
    window.addEventListener("storage", refreshDepotOptions);
    return () => {
      window.removeEventListener("depot-data-updated", refreshDepotOptions);
      window.removeEventListener("storage", refreshDepotOptions);
    };
  }, [refreshDepotOptions]);

  const resetForm = () => {
    setFormData({ depotCode: "", routeCode: "", routeName: "" });
    setSelectedRoute(null);
    setEditMode(false);
    setShowAddForm(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAdd = () => {
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

    if (editMode && selectedRoute) {
      setRoutes((prev) =>
        prev.map((route) =>
          route.id === selectedRoute.id
            ? {
                ...route,
                depotCode: depotInfo.code,
                depotName: depotInfo.name,
                routeCode: formData.routeCode,
                routeName: formData.routeName,
              }
            : route,
        ),
      );
      toast({
        title: "Route updated",
        description: "Depot route information has been updated successfully.",
      });
    } else {
      const exists = routes.some((route) => route.routeCode === formData.routeCode);
      if (exists) {
        toast({
          title: "Duplicate route code",
          description: "This route code already exists. Please use a different code.",
          variant: "destructive",
        });
        return;
      }

      const newRoute: DepotRoute = {
        id: formData.routeCode,
        depotCode: depotInfo.code,
        depotName: depotInfo.name,
        routeCode: formData.routeCode,
        routeName: formData.routeName,
      };

      setRoutes((prev) => [...prev, newRoute]);
      toast({
        title: "Route added",
        description: `New route ${newRoute.routeCode} - ${newRoute.routeName} created for ${depotInfo.name}.`,
      });
    }

    resetForm();
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

  const handleDelete = (route: DepotRoute) => {
    setRoutes((prev) => prev.filter((item) => item.id !== route.id));
    toast({
      title: "Route deleted",
      description: "The depot route has been removed.",
      variant: "destructive",
    });
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
      <main className="p-6">
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" onClick={resetForm} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <MapPinned className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">
              {editMode ? "Edit Shipping Route" : "Add Shipping Route"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {editMode ? "Update depot aligned shipping route information" : "Create a new route for the selected depot"}
          </p>
        </header>

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
                <Button onClick={handleAdd}>{editMode ? "Update Route" : "Create Route"}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="p-6">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <MapPinned className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Shipping Routes</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage depot specific shipping routes and alignment</p>
      </header>

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
        emptyMessage="No routes found"
        showCode={true}
        codeKey="routeCode"
      />
    </main>
  );
}
