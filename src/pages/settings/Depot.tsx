import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Warehouse, ArrowLeft, MapPin, Layers } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { MasterDataTable, ColumnDef } from "@/components/master-data/MasterDataTable";
import { getBadgeVariant } from "@/utils/badgeColors";
import { apiEndpoints } from "@/lib/api";

interface Depot {
  id: string;
  code: string;
  name: string;
  location: string;
  capacity: string;
  status: "active" | "inactive";
  companyId?: string;
  warehouse?: string;
  zone?: string;
  storageType?: "General Store" | "Cold" | "Cool";
}


export default function Depot() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedDepot, setSelectedDepot] = useState<Depot | null>(null);
  const [warehouse, setWarehouse] = useState("");
  const [zone, setZone] = useState("");
  const [storageType, setStorageType] = useState<"General Store" | "Cold" | "Cool">("General Store");
  const [companies, setCompanies] = useState<Array<{ id: number; name: string; code: string }>>([]);
  const [companyId, setCompanyId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    location: "",
    capacity: "",
  });

  const [depots, setDepots] = useState<Depot[]>([]);

  const mapDepot = (row: any): Depot => ({
    id: String(row.id),
    code: row.code || "",
    name: row.name || "",
    location: row.city || row.address || "",
    capacity: "",
    status: row.is_active === false ? "inactive" : "active",
    companyId: row.company_id != null ? String(row.company_id) : "",
    warehouse: "",
    zone: "",
    storageType: "General Store",
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

  const loadDepots = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await apiEndpoints.depots.getAll();
      setDepots(Array.isArray(rows) ? rows.map(mapDepot) : []);
    } catch (err) {
      const message = formatApiError(err);
      setError(message);
      setDepots([]);
      toast({ title: "Failed to load depots", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Depot Settings | Renata";
    fetchCompanies();
    loadDepots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCompanies = async () => {
    try {
      const data = await apiEndpoints.companies.getAll();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      location: "",
      capacity: "",
    });
    setWarehouse("");
    setZone("");
    setStorageType("General Store");
    setCompanyId("");
    setEditMode(false);
    setSelectedDepot(null);
    setShowAddForm(false);
  };

  const handleChange = (field: "code" | "name" | "location" | "capacity", value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateDepot = (): boolean => {
    if (!formData.code.trim() || !formData.name.trim() || !formData.location.trim()) {
      toast({
        title: "Missing information",
        description: "Depot code, name, and location are required.",
        variant: "destructive",
      });
      return false;
    }

    const duplicate = depots.some(
      (depot) => depot.code.trim().toLowerCase() === formData.code.trim().toLowerCase() && depot.id !== selectedDepot?.id,
    );

    if (duplicate) {
      toast({
        title: "Duplicate depot code",
        description: "This depot code already exists. Please provide a unique code.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleAdd = async () => {
    if (!validateDepot()) return;
    if (!companyId) {
      toast({
        title: "Missing information",
        description: "Company is required.",
        variant: "destructive",
      });
      return;
    }
    const payload = {
      code: formData.code.trim(),
      name: formData.name.trim(),
      city: formData.location.trim(),
      address: formData.location.trim(),
      company_id: Number(companyId),
      is_active: true,
    };
    setSaving(true);
    try {
      if (editMode && selectedDepot) {
        await apiEndpoints.depots.update(Number(selectedDepot.id), payload);
        toast({ title: "Depot updated", description: "Depot information has been updated successfully." });
      } else {
        const created = await apiEndpoints.depots.create(payload);
        toast({ title: "Depot added", description: `New depot created with code ${created.code}.` });
      }
      await loadDepots();
      resetForm();
    } catch (err) {
      toast({
        title: editMode ? "Failed to update depot" : "Failed to create depot",
        description: formatApiError(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (depot: Depot) => {
    setSelectedDepot(depot);
    setFormData({
      code: depot.code,
      name: depot.name,
      location: depot.location,
      capacity: depot.capacity,
    });
    setWarehouse(depot.warehouse || "");
    setZone(depot.zone || "");
    setStorageType(depot.storageType || "General Store");
    setCompanyId(depot.companyId || "");
    setEditMode(true);
    setShowAddForm(true);
  };

  const handleDelete = async (depot: Depot) => {
    if (!window.confirm(`Delete depot ${depot.name}? This cannot be undone.`)) return;
    try {
      await apiEndpoints.depots.delete(Number(depot.id));
      toast({ title: "Depot deleted", description: "The depot has been removed.", variant: "destructive" });
      await loadDepots();
    } catch (err) {
      toast({ title: "Failed to delete depot", description: formatApiError(err), variant: "destructive" });
    }
  };

  const handleCancel = () => {
    resetForm();
  };

  const columns: ColumnDef<Depot>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Depot Name",
        render: (_, depot) => <span className="font-medium">{depot.name}</span>,
      },
      {
        key: "location",
        header: "Location",
        render: (_, depot) => (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {depot.location}
          </div>
        ),
      },
      {
        key: "capacity",
        header: "Capacity",
      },
      {
        key: "warehouse",
        header: "Warehouse",
        render: (value) => value || "-",
      },
      {
        key: "zone",
        header: "Zone",
        render: (value) => value || "-",
      },
      {
        key: "storageType",
        header: "Storage Type",
        render: (value) => (
          <Badge variant={getBadgeVariant(value)}>
            {value || "-"}
          </Badge>
        ),
      },
    ],
    [],
  );

  if (showAddForm) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={editMode ? "Edit Depot" : "Add New Depot"}
          subtitle={editMode ? "Update depot information" : "Create a new depot or warehouse"}
          icon={Warehouse}
          variant="indigo"
          actions={(
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCancel}
             
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
        />

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="space-y-6 max-w-4xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="depot-company">Company *</Label>
                  <Select value={companyId} onValueChange={setCompanyId}>
                    <SelectTrigger id="depot-company">
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.length > 0 ? (
                        companies.map((company) => (
                          <SelectItem key={company.id} value={String(company.id)}>
                            {company.name} ({company.code})
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No companies available</div>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Select company from master data</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depot-code">Depot Code *</Label>
                  <Input
                    id="depot-code"
                    placeholder="e.g., 120"
                    value={formData.code}
                    onChange={(e) => handleChange("code", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Unique identifier used throughout the system.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depot-name">Depot Name *</Label>
                  <Input
                    id="depot-name"
                    placeholder="Kushtia Depot"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depot-location">Location *</Label>
                  <Input
                    id="depot-location"
                    placeholder="City, Region"
                    value={formData.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depot-capacity">Capacity</Label>
                  <Input
                    id="depot-capacity"
                    placeholder="50,000 sq ft"
                    value={formData.capacity}
                    onChange={(e) => handleChange("capacity", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Not stored in the database.</p>
                </div>
              </div>

              <div className="border-t pt-6 mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="h-5 w-5 text-primary" />
                  <Label className="text-lg font-semibold text-primary">Hierarchical Structure</Label>
                </div>

                <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label htmlFor="depot-warehouse">Warehouse</Label>
                    <Input
                      id="depot-warehouse"
                      placeholder="e.g., Warehouse-1"
                      value={warehouse}
                      onChange={(e) => setWarehouse(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Not stored in the database.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="depot-zone">Zone</Label>
                    <Input
                      id="depot-zone"
                      placeholder="e.g., Zone-1"
                      value={zone}
                      onChange={(e) => setZone(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Not stored in the database.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="depot-storage-type">Storage Type</Label>
                    <Select value={storageType} onValueChange={(value: "General Store" | "Cold" | "Cool") => setStorageType(value)}>
                      <SelectTrigger id="depot-storage-type">
                        <SelectValue placeholder="Select storage type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General Store">General Store</SelectItem>
                        <SelectItem value="Cold">Cold</SelectItem>
                        <SelectItem value="Cool">Cool</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Not stored in the database.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={saving}>
                  {saving ? "Saving..." : editMode ? "Update Depot" : "Create Depot"}
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
        title="Depot Management"
        subtitle="Manage warehouses, distribution centers, and storage facilities"
        icon={Warehouse}
        variant="indigo"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <MasterDataTable
        title="All Depots"
        description={`Total locations: ${depots.length}`}
        data={depots}
        columns={columns}
        searchPlaceholder="Search depots..."
        searchFields={["code", "name", "location", "warehouse", "zone"]}
        itemsPerPage={10}
        onAdd={() => setShowAddForm(true)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage={loading ? "Loading depots..." : "No depots found"}
        showCode={true}
        codeKey="code"
      />
    </div>
  );
}
