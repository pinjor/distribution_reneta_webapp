import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Warehouse, ArrowLeft, MapPin, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MasterDataTable, ColumnDef } from "@/components/master-data/MasterDataTable";
import { generateCode } from "@/utils/codeGenerator";
import { getBadgeVariant } from "@/utils/badgeColors";

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

export default function Depot() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedDepot, setSelectedDepot] = useState<Depot | null>(null);
  const [newDepotCode, setNewDepotCode] = useState<string>("");
  const [warehouse, setWarehouse] = useState("");
  const [zone, setZone] = useState("");
  const [storageType, setStorageType] = useState<"General Store" | "Cold" | "Cool">("General Store");
  
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    capacity: "",
  });
  
  const [depots, setDepots] = useState<Depot[]>([
    { id: "1", code: "DEPT-0001", name: "Main Warehouse", location: "New York, NY", capacity: "50,000 sq ft", status: "active", warehouse: "Warehouse-1", zone: "Zone-1", storageType: "General Store" },
    { id: "2", code: "DEPT-0002", name: "Distribution Center East", location: "Boston, MA", capacity: "35,000 sq ft", status: "active", warehouse: "Warehouse-1", zone: "Zone-2", storageType: "Cold" },
    { id: "3", code: "DEPT-0003", name: "Regional Hub", location: "Philadelphia, PA", capacity: "28,000 sq ft", status: "inactive", warehouse: "Warehouse-2", zone: "Zone-1", storageType: "Cool" },
  ]);

  useEffect(() => {
    document.title = "Depot Settings | App";
  }, []);

  const generateDepotCode = (): string => {
    const existingCodes = depots.map(d => d.code);
    return generateCode("DEPT", existingCodes);
  };

  // Generate code when form opens for new depot
  useEffect(() => {
    if (showAddForm && !editMode) {
      setNewDepotCode(generateDepotCode());
    }
  }, [showAddForm, editMode]);

  const handleAdd = () => {
    if (editMode && selectedDepot) {
      setDepots(prev => prev.map(d => 
        d.id === selectedDepot.id 
          ? { 
              ...d, 
              name: formData.name,
              location: formData.location,
              capacity: formData.capacity,
              warehouse: warehouse,
              zone: zone,
              storageType: storageType,
            }
          : d
      ));
      toast({
        title: "Depot updated",
        description: "Depot information has been updated successfully.",
      });
    } else {
      const newCode = generateDepotCode();
      const newDepot: Depot = {
        id: Date.now().toString(),
        code: newCode,
        name: formData.name,
        location: formData.location,
        capacity: formData.capacity,
        status: "active",
        warehouse: warehouse,
        zone: zone,
        storageType: storageType,
      };
      setDepots(prev => [...prev, newDepot]);
      toast({
        title: "Depot added",
        description: `New depot created with code ${newCode}.`,
      });
    }
    resetForm();
  };

  const handleEdit = (depot: Depot) => {
    setSelectedDepot(depot);
    setFormData({
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
    setDepots(prev => prev.filter(d => d.id !== depot.id));
    toast({
      title: "Depot deleted",
      description: "The depot has been removed.",
      variant: "destructive",
    });
  };

  const handleCancel = () => {
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      location: "",
      capacity: "",
    });
    setWarehouse("");
    setZone("");
    setStorageType("General Store");
    setEditMode(false);
    setSelectedDepot(null);
    setNewDepotCode("");
    setShowAddForm(false);
  };

  // Define table columns
  const columns: ColumnDef<Depot>[] = [
    {
      key: "name",
      header: "Depot Name",
      render: (_, depot) => (
        <span className="font-medium">{depot.name}</span>
      ),
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
  ];

  // Show form page if showAddForm is true
  if (showAddForm) {
    return (
      <main className="p-6">
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="gap-2"
            >
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
                  <Label htmlFor="depot-name">Depot Name *</Label>
                  <Input 
                    id="depot-name" 
                    placeholder="Main Warehouse" 
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depot-location">Location *</Label>
                  <Input 
                    id="depot-location" 
                    placeholder="City, State" 
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="depot-capacity">Capacity</Label>
                  <Input 
                    id="depot-capacity" 
                    placeholder="50,000 sq ft" 
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                  />
                </div>
              </div>

              {/* Hierarchical Structure */}
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
                      placeholder="e.g., Zone-1, Zone-2" 
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
                <Button onClick={handleAdd}>
                  {editMode ? "Update Depot" : "Create Depot"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Show list view
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
        searchFields={["name", "location", "warehouse", "zone"]}
        itemsPerPage={10}
        onAdd={() => setShowAddForm(true)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage="No depots found"
        showCode={false}
      />
    </main>
  );
}
