import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Users, ArrowLeft, Star, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MasterDataTable, ColumnDef } from "@/components/master-data/MasterDataTable";
import { generateCode } from "@/utils/codeGenerator";
import { getBadgeVariant } from "@/utils/badgeColors";

interface Vendor {
  id: string;
  code: string;
  name: string;
  category: string;
  email: string;
  phone: string;
  rating: number;
  status: "active" | "inactive" | "pending";
}

export default function Vendors() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [newVendorCode, setNewVendorCode] = useState<string>("");
  const [vendors, setVendors] = useState<Vendor[]>([
    { id: "1", code: "VEND-0001", name: "Logistics Pro Inc", category: "Transportation", email: "sales@logisticspro.com", phone: "+1 555-2001", rating: 4.8, status: "active" },
    { id: "2", code: "VEND-0002", name: "PackMasters Supply", category: "Packaging", email: "info@packmasters.com", phone: "+1 555-2002", rating: 4.5, status: "active" },
    { id: "3", code: "VEND-0003", name: "Tech Equipment Co", category: "Equipment", email: "contact@techequip.com", phone: "+1 555-2003", rating: 4.2, status: "pending" },
    { id: "4", code: "VEND-0004", name: "Global Freight", category: "Freight", email: "orders@globalfreight.com", phone: "+1 555-2004", rating: 3.9, status: "active" },
  ]);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    email: "",
    phone: "",
    rating: "",
  });

  useEffect(() => {
    document.title = "Vendors | Renata";
  }, []);

  const generateVendorCode = (): string => {
    const existingCodes = vendors.map(v => v.code);
    return generateCode("VEND", existingCodes);
  };

  // Generate code when form opens for new vendor
  useEffect(() => {
    if (showAddForm && !editMode) {
      setNewVendorCode(generateVendorCode());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddForm, editMode]);

  const handleAdd = () => {
    if (editMode && selectedVendor) {
      setVendors(prev => prev.map(v => 
        v.id === selectedVendor.id 
          ? { 
              ...v, 
              name: formData.name,
              category: formData.category,
              email: formData.email,
              phone: formData.phone,
              rating: formData.rating ? parseFloat(formData.rating) : v.rating,
            }
          : v
      ));
      toast({
        title: "Vendor updated",
        description: "Vendor information has been updated successfully.",
      });
    } else {
      const newCode = generateVendorCode();
      const newVendor: Vendor = {
        id: Date.now().toString(),
        code: newCode,
        name: formData.name,
        category: formData.category,
        email: formData.email,
        phone: formData.phone,
        rating: formData.rating ? parseFloat(formData.rating) : 0,
        status: "active",
      };
      setVendors(prev => [...prev, newVendor]);
      toast({
        title: "Vendor added",
        description: `New vendor created with code ${newCode}.`,
      });
    }
    resetForm();
  };

  const handleEdit = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setFormData({
      name: vendor.name,
      category: vendor.category,
      email: vendor.email,
      phone: vendor.phone,
      rating: vendor.rating.toString(),
    });
    setEditMode(true);
    setShowAddForm(true);
  };

  const handleDelete = (vendor: Vendor) => {
    setVendors(prev => prev.filter(v => v.id !== vendor.id));
    toast({
      title: "Vendor deleted",
      description: "The vendor has been removed.",
      variant: "destructive",
    });
  };

  const handleCancel = () => {
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      email: "",
      phone: "",
      rating: "",
    });
    setNewVendorCode("");
    setEditMode(false);
    setSelectedVendor(null);
    setShowAddForm(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Define table columns
  const columns: ColumnDef<Vendor>[] = [
    {
      key: "name",
      header: "Vendor Name",
      render: (_, vendor) => (
        <span className="font-medium">{vendor.name}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
    },
    {
      key: "email",
      header: "Contact",
      render: (_, vendor) => (
        <div className="space-y-1 text-sm">
          <div>{vendor.email}</div>
          <div className="text-muted-foreground">{vendor.phone}</div>
        </div>
      ),
    },
    {
      key: "rating",
      header: "Rating",
      render: (value) => (
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-warning text-warning" />
          <span className="font-medium">{Number(value)}</span>
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
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">
              {editMode ? "Edit Vendor" : "Add New Vendor"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {editMode ? "Update vendor information" : "Onboard a new supplier or service provider"}
          </p>
        </header>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="space-y-6 max-w-4xl">
              {/* Code Field - Auto-generated */}
              <div className="space-y-2">
                <Label htmlFor="code">Vendor Code *</Label>
                <Input
                  id="code"
                  value={editMode && selectedVendor?.code ? selectedVendor.code : newVendorCode}
                  disabled
                  className="bg-muted font-mono font-semibold"
                  placeholder="Auto-generated"
                />
                <p className="text-xs text-muted-foreground">Auto-generated code (cannot be changed)</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendor-name">Vendor Name *</Label>
                  <Input
                    id="vendor-name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="ABC Suppliers"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor-category">Category</Label>
                  <Input
                    id="vendor-category"
                    value={formData.category}
                    onChange={(e) => handleChange("category", e.target.value)}
                    placeholder="Transportation, Equipment, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor-email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email *
                  </Label>
                  <Input
                    id="vendor-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="contact@vendor.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor-phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Phone
                  </Label>
                  <Input
                    id="vendor-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="+1 555-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor-rating" className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    Rating
                  </Label>
                  <Input
                    id="vendor-rating"
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={formData.rating}
                    onChange={(e) => handleChange("rating", e.target.value)}
                    placeholder="4.5"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleAdd}>
                  {editMode ? "Update Vendor" : "Create Vendor"}
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
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Vendor Management</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage suppliers, contractors, and service providers</p>
      </header>

      <MasterDataTable
        title="All Vendors"
        description={`Total suppliers: ${vendors.length}`}
        data={vendors}
        columns={columns}
        searchPlaceholder="Search vendors..."
        searchFields={["name", "code", "category", "email"]}
        itemsPerPage={10}
        onAdd={() => setShowAddForm(true)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage="No vendors found"
        showCode={true}
        codeKey="code"
      />
    </main>
  );
}
