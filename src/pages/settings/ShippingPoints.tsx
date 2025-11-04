import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { MapPinned, ArrowLeft, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MasterDataTable, ColumnDef } from "@/components/master-data/MasterDataTable";
import { generateCode } from "@/utils/codeGenerator";
import { getBadgeVariant } from "@/utils/badgeColors";

interface ShippingPoint {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  zone: string;
  capacity: string;
  status: "active" | "inactive" | "maintenance";
}

export default function ShippingPoints() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<ShippingPoint | null>(null);
  const [newPointCode, setNewPointCode] = useState<string>("");
  const [shippingPoints, setShippingPoints] = useState<ShippingPoint[]>([
    { id: "1", code: "SP-0001", name: "Downtown Hub", address: "500 Main St", city: "New York, NY", zone: "Zone A", capacity: "200 orders/day", status: "active" },
    { id: "2", code: "SP-0002", name: "Airport Terminal", address: "Terminal 2, Gate 5", city: "Newark, NJ", zone: "Zone B", capacity: "150 orders/day", status: "active" },
    { id: "3", code: "SP-0003", name: "Port Facility", address: "Port 12, Dock 8", city: "Jersey City, NJ", zone: "Zone C", capacity: "300 orders/day", status: "maintenance" },
    { id: "4", code: "SP-0004", name: "Suburban Center", address: "45 Commerce Blvd", city: "Stamford, CT", zone: "Zone D", capacity: "100 orders/day", status: "active" },
  ]);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    zone: "",
    capacity: "",
  });

  useEffect(() => {
    document.title = "Shipping Points | App";
  }, []);

  const generatePointCode = (): string => {
    const existingCodes = shippingPoints.map(p => p.code);
    return generateCode("SP", existingCodes);
  };

  // Generate code when form opens for new point
  useEffect(() => {
    if (showAddForm && !editMode) {
      setNewPointCode(generatePointCode());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddForm, editMode]);

  const handleAdd = () => {
    if (editMode && selectedPoint) {
      setShippingPoints(prev => prev.map(p => 
        p.id === selectedPoint.id 
          ? { 
              ...p, 
              name: formData.name,
              address: formData.address,
              city: formData.city,
              zone: formData.zone,
              capacity: formData.capacity,
            }
          : p
      ));
      toast({
        title: "Shipping point updated",
        description: "Shipping point information has been updated successfully.",
      });
    } else {
      const newCode = generatePointCode();
      const newPoint: ShippingPoint = {
        id: Date.now().toString(),
        code: newCode,
        name: formData.name,
        address: formData.address,
        city: formData.city,
        zone: formData.zone,
        capacity: formData.capacity,
        status: "active",
      };
      setShippingPoints(prev => [...prev, newPoint]);
      toast({
        title: "Shipping point added",
        description: `New location created with code ${newCode}.`,
      });
    }
    resetForm();
  };

  const handleEdit = (point: ShippingPoint) => {
    setSelectedPoint(point);
    setFormData({
      name: point.name,
      address: point.address,
      city: point.city,
      zone: point.zone,
      capacity: point.capacity,
    });
    setEditMode(true);
    setShowAddForm(true);
  };

  const handleDelete = (point: ShippingPoint) => {
    setShippingPoints(prev => prev.filter(p => p.id !== point.id));
    toast({
      title: "Shipping point deleted",
      description: "The location has been removed.",
      variant: "destructive",
    });
  };

  const handleCancel = () => {
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      city: "",
      zone: "",
      capacity: "",
    });
    setNewPointCode("");
    setEditMode(false);
    setSelectedPoint(null);
    setShowAddForm(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Define table columns
  const columns: ColumnDef<ShippingPoint>[] = [
    {
      key: "name",
      header: "Name",
      render: (_, point) => (
        <span className="font-medium">{point.name}</span>
      ),
    },
    {
      key: "address",
      header: "Location",
      render: (_, point) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Navigation className="h-3 w-3 text-muted-foreground" />
            {point.address}
          </div>
          <div className="text-sm text-muted-foreground">{point.city}</div>
        </div>
      ),
    },
    {
      key: "zone",
      header: "Zone",
      render: (value) => (
        <Badge variant="outline" className="text-xs">
          {String(value)}
        </Badge>
      ),
    },
    {
      key: "capacity",
      header: "Capacity",
    },
    {
      key: "status",
      header: "Status",
      render: (value) => (
        <Badge variant={getBadgeVariant(value)}>
          {String(value)}
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
            <MapPinned className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">
              {editMode ? "Edit Shipping Point" : "Add Shipping Point"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {editMode ? "Update shipping point information" : "Create a new distribution or delivery location"}
          </p>
        </header>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="space-y-6 max-w-4xl">
              {/* Code Field - Auto-generated */}
              <div className="space-y-2">
                <Label htmlFor="code">Point Code *</Label>
                <Input
                  id="code"
                  value={editMode && selectedPoint?.code ? selectedPoint.code : newPointCode}
                  disabled
                  className="bg-muted font-mono font-semibold"
                  placeholder="Auto-generated"
                />
                <p className="text-xs text-muted-foreground">Auto-generated code (cannot be changed)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sp-zone">Zone</Label>
                <Input
                  id="sp-zone"
                  value={formData.zone}
                  onChange={(e) => handleChange("zone", e.target.value)}
                  placeholder="Zone A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sp-name">Location Name *</Label>
                <Input
                  id="sp-name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Downtown Hub"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sp-address">Address</Label>
                <Input
                  id="sp-address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="123 Main Street"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sp-city">City, State</Label>
                <Input
                  id="sp-city"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="New York, NY"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sp-capacity">Capacity</Label>
                <Input
                  id="sp-capacity"
                  value={formData.capacity}
                  onChange={(e) => handleChange("capacity", e.target.value)}
                  placeholder="200 orders/day"
                />
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleAdd}>
                  {editMode ? "Update Point" : "Create Point"}
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
          <MapPinned className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Shipping Points</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage distribution nodes and delivery locations</p>
      </header>

      <MasterDataTable
        title="All Shipping Points"
        description={`Total locations: ${shippingPoints.length}`}
        data={shippingPoints}
        columns={columns}
        searchPlaceholder="Search locations..."
        searchFields={["name", "code", "city", "zone"]}
        itemsPerPage={10}
        onAdd={() => setShowAddForm(true)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage="No shipping points found"
        showCode={true}
        codeKey="code"
      />
    </main>
  );
}
