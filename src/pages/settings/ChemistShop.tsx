import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Package, ArrowLeft, Mail, Phone, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MasterDataTable, ColumnDef } from "@/components/master-data/MasterDataTable";
import { generateCode } from "@/utils/codeGenerator";
import { getBadgeVariant } from "@/utils/badgeColors";

interface ChemistShop {
  id: string;
  code: string;
  name: string;
  ownerName: string;
  licenseNumber: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  status: "active" | "inactive";
}

export default function ChemistShop() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedChemistShop, setSelectedChemistShop] = useState<ChemistShop | null>(null);
  const [newChemistShopCode, setNewChemistShopCode] = useState<string>("");
  const [chemistShops, setChemistShops] = useState<ChemistShop[]>([
    { 
      id: "1", 
      code: "CHEM-0001",
      name: "Green Pharmacy", 
      ownerName: "Mohammad Rahman", 
      licenseNumber: "LIC-2024-001", 
      email: "info@greenpharmacy.com", 
      phone: "+880 1712-345678", 
      address: "123 Main Street, Dhanmondi", 
      city: "Dhaka", 
      status: "active" 
    },
    { 
      id: "2", 
      code: "CHEM-0002",
      name: "City Medical Store", 
      ownerName: "Fatema Khatun", 
      licenseNumber: "LIC-2024-002", 
      email: "contact@citymedical.com", 
      phone: "+880 1712-345679", 
      address: "456 Commerce Road, Gulshan", 
      city: "Dhaka", 
      status: "active" 
    },
    { 
      id: "3", 
      code: "CHEM-0003",
      name: "Modern Pharmacy", 
      ownerName: "Abdul Karim", 
      licenseNumber: "LIC-2024-003", 
      email: "admin@modernpharma.com", 
      phone: "+880 1712-345680", 
      address: "789 Market Avenue, Banani", 
      city: "Dhaka", 
      status: "inactive" 
    },
  ]);

  const [formData, setFormData] = useState({
    name: "",
    ownerName: "",
    licenseNumber: "",
    email: "",
    phone: "",
    address: "",
    city: "",
  });

  useEffect(() => {
    document.title = "Chemist Shop | Renata";
  }, []);

  const generateChemistShopCode = (): string => {
    const existingCodes = chemistShops.map(c => c.code);
    return generateCode("CHEM", existingCodes);
  };

  // Generate code when form opens for new chemist shop
  useEffect(() => {
    if (showAddForm && !editMode) {
      setNewChemistShopCode(generateChemistShopCode());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddForm, editMode]);

  const handleAdd = () => {
    if (editMode && selectedChemistShop) {
      setChemistShops(prev => prev.map(c => 
        c.id === selectedChemistShop.id 
          ? { ...c, ...formData }
          : c
      ));
      toast({
        title: "Chemist Shop updated",
        description: "Chemist shop information has been updated successfully.",
      });
    } else {
      const newCode = generateChemistShopCode();
      const newChemistShop: ChemistShop = {
        id: Date.now().toString(),
        code: newCode,
        ...formData,
        status: "active",
      };
      setChemistShops(prev => [...prev, newChemistShop]);
      toast({
        title: "Chemist Shop added",
        description: `New chemist shop created with code ${newCode}.`,
      });
    }
    resetForm();
  };

  const handleEdit = (chemistShop: ChemistShop) => {
    setSelectedChemistShop(chemistShop);
    setFormData({
      name: chemistShop.name,
      ownerName: chemistShop.ownerName,
      licenseNumber: chemistShop.licenseNumber,
      email: chemistShop.email,
      phone: chemistShop.phone,
      address: chemistShop.address,
      city: chemistShop.city,
    });
    setEditMode(true);
    setShowAddForm(true);
  };

  const handleDelete = (chemistShop: ChemistShop) => {
    setChemistShops(prev => prev.filter(c => c.id !== chemistShop.id));
    toast({
      title: "Chemist Shop deleted",
      description: "The chemist shop has been removed.",
      variant: "destructive",
    });
  };

  const handleCancel = () => {
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      ownerName: "",
      licenseNumber: "",
      email: "",
      phone: "",
      address: "",
      city: "",
    });
    setNewChemistShopCode("");
    setEditMode(false);
    setSelectedChemistShop(null);
    setShowAddForm(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Define table columns
  const columns: ColumnDef<ChemistShop>[] = [
    {
      key: "name",
      header: "Shop Name",
      render: (_, shop) => (
        <span className="font-medium">{shop.name}</span>
      ),
    },
    {
      key: "ownerName",
      header: "Owner Name",
    },
    {
      key: "licenseNumber",
      header: "License Number",
      render: (_, shop) => (
        <span className="text-sm text-muted-foreground">{shop.licenseNumber}</span>
      ),
    },
    {
      key: "email",
      header: "Contact",
      render: (_, shop) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-3 w-3 text-muted-foreground" />
            {shop.email}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-3 w-3" />
            {shop.phone}
          </div>
        </div>
      ),
    },
    {
      key: "city",
      header: "Location",
      render: (_, shop) => (
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <div>
            <div>{shop.city}</div>
            <div className="text-muted-foreground text-xs">{shop.address}</div>
          </div>
        </div>
      ),
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
            <Package className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">
              {editMode ? "Edit Chemist Shop" : "Add New Chemist Shop"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {editMode ? "Update chemist shop information" : "Create a new chemist shop profile"}
          </p>
        </header>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="space-y-6 max-w-4xl">
              {/* Code Field - Auto-generated */}
              <div className="space-y-2">
                <Label htmlFor="code">Chemist Shop Code *</Label>
                <Input
                  id="code"
                  value={editMode && selectedChemistShop?.code ? selectedChemistShop.code : newChemistShopCode}
                  disabled
                  className="bg-muted font-mono font-semibold"
                  placeholder="Auto-generated"
                />
                <p className="text-xs text-muted-foreground">Auto-generated code (cannot be changed)</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Shop Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Enter shop name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Owner Name *</Label>
                  <Input
                    id="ownerName"
                    value={formData.ownerName}
                    onChange={(e) => handleChange("ownerName", e.target.value)}
                    placeholder="Enter owner name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">License Number</Label>
                  <Input
                    id="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={(e) => handleChange("licenseNumber", e.target.value)}
                    placeholder="LIC-XXXX-XXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="contact@shop.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Phone *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="+880 1712-345678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    placeholder="City"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Address
                </Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="123 Main Street, Area"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleAdd}>
                  {editMode ? "Update Chemist Shop" : "Create Chemist Shop"}
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
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Chemist Shop Management</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage chemist shop profiles and licenses</p>
      </header>

      <MasterDataTable
        title="All Chemist Shops"
        description={`Total shops: ${chemistShops.length}`}
        data={chemistShops}
        columns={columns}
        searchPlaceholder="Search chemist shops..."
        searchFields={["name", "code", "ownerName", "email", "licenseNumber", "city"]}
        itemsPerPage={10}
        onAdd={() => setShowAddForm(true)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage="No chemist shops found"
        showCode={true}
        codeKey="code"
      />
    </main>
  );
}

