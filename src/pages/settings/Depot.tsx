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
  warehouse?: string;
  zone?: string;
  storageType?: "General Store" | "Cold" | "Cool";
}

const STORAGE_KEY = "depotMasterData";

const defaultDepots: Depot[] = [
  {
    id: "120",
    code: "120",
    name: "Kushtia Depot",
    location: "Kushtia",
    capacity: "45,000 sq ft",
    status: "active",
    warehouse: "Warehouse-KU",
    zone: "Zone-01",
    storageType: "General Store",
  },
  {
    id: "107",
    code: "107",
    name: "Khulna Depot",
    location: "Khulna",
    capacity: "38,000 sq ft",
    status: "active",
    warehouse: "Warehouse-KH",
    zone: "Zone-02",
    storageType: "Cool",
  },
  {
    id: "DEPT-0001",
    code: "DEPT-0001",
    name: "Main Warehouse",
    location: "New York, NY",
    capacity: "50,000 sq ft",
    status: "active",
    warehouse: "Warehouse-1",
    zone: "Zone-1",
    storageType: "General Store",
  },
];

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

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    location: "",
    capacity: "",
  });

  const [depots, setDepots] = useState<Depot[]>(() => {
    if (typeof window === "undefined") {
      return defaultDepots;
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Depot[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn("Failed to parse depot master data from storage", error);
    }

    return defaultDepots;
  });

  useEffect(() => {
    document.title = "Depot Settings | Renata";
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const data = await apiEndpoints.companies.getAll();
      setCompanies(data);
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(depots));
      window.dispatchEvent(new Event("depot-data-updated"));
    } catch (error) {
      console.warn("Failed to persist depot master data", error);
    }
  }, [depots]);

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

  const handleAdd = () => {
    if (!validateDepot()) return;

    if (editMode && selectedDepot) {
      setDepots((prev) =>
        prev.map((depot) =>
          depot.id === selectedDepot.id
            ? {
                ...depot,
                code: formData.code.trim(),
                name: formData.name,
                location: formData.location,
                capacity: formData.capacity,
                warehouse,
                zone,
                storageType,
              }
            : depot,
        ),
      );
      toast({
        title: "Depot updated",
        description: "Depot information has been updated successfully.",
      });
    } else {
      const newDepot: Depot = {
        id: formData.code.trim(),
        code: formData.code.trim(),
        name: formData.name,
        location: formData.location,
        capacity: formData.capacity,
        status: "active",
        warehouse,
        zone,
        storageType,
      };
      setDepots((prev) => [...prev, newDepot]);
      toast({
        title: "Depot added",
        description: `New depot created with code ${newDepot.code}.`,
      });
    }

    resetForm();
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
    setEditMode(true);
    setShowAddForm(true);
  };

  const handleDelete = (depot: Depot) => {
    setDepots((prev) => prev.filter((item) => item.id !== depot.id));
    toast({
      title: "Depot deleted",
      description: "The depot has been removed.",
      variant: "destructive",
    });
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
      <main className="p-6">
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" onClick={handleCancel} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Warehouse className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">
              {editMode ? "Edit Depot" : "Add New Depot"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {editMode ? "Update depot information" : "Create a new depot or warehouse"}
          </p>
        </header>

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
                </div>
              </div>

              <div className="border-t pt-6 mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="h-5 w-5 text-primary" />
                  <Label className="text-lg font-semibold text-primary">Hierarchical Structure</Label>
                </div>

                <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label htmlFor="depot-warehouse">Warehouse *</Label>
                    <Input
                      id="depot-warehouse"
                      placeholder="e.g., Warehouse-1"
                      value={warehouse}
                      onChange={(e) => setWarehouse(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">The warehouse name under this depot</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="depot-zone">Zone *</Label>
                    <Input
                      id="depot-zone"
                      placeholder="e.g., Zone-1"
                      value={zone}
                      onChange={(e) => setZone(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">The zone within the warehouse</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="depot-storage-type">Storage Type *</Label>
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
                    <p className="text-xs text-muted-foreground">The storage type for this zone (General Store, Cold, or Cool)</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleAdd}>{editMode ? "Update Depot" : "Create Depot"}</Button>
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
          <Warehouse className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Depot Management</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage warehouses, distribution centers, and storage facilities</p>
      </header>

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
        emptyMessage="No depots found"
        showCode={true}
        codeKey="code"
      />
    </main>
  );
}
