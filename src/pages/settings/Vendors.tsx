import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Users, ArrowLeft, Star, Mail, Phone } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { MasterDataTable, ColumnDef } from "@/components/master-data/MasterDataTable";
import { generateCode } from "@/utils/codeGenerator";
import { getBadgeVariant } from "@/utils/badgeColors";
import { apiEndpoints } from "@/lib/api";

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
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    email: "",
    phone: "",
    rating: "",
  });

  const mapVendor = (row: any): Vendor => ({
    id: String(row.id),
    code: row.code || "",
    name: row.name || "",
    category: "",
    email: row.email || "",
    phone: row.phone || "",
    rating: 0,
    status: row.is_active === false ? "inactive" : "active",
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

  const loadVendors = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await apiEndpoints.vendors.getAll();
      setVendors(Array.isArray(rows) ? rows.map(mapVendor) : []);
    } catch (err) {
      const message = formatApiError(err);
      setError(message);
      setVendors([]);
      toast({ title: "Failed to load vendors", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Vendors | Renata";
    loadVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Missing required fields", description: "Vendor name is required.", variant: "destructive" });
      return;
    }
    const payload = {
      name: formData.name.trim(),
      email: formData.email || null,
      phone: formData.phone || null,
    };
    setSaving(true);
    try {
      if (editMode && selectedVendor) {
        await apiEndpoints.vendors.update(Number(selectedVendor.id), payload);
        toast({ title: "Vendor updated", description: "Vendor information has been updated successfully." });
      } else {
        const created = await apiEndpoints.vendors.create({
          ...payload,
          code: newVendorCode || generateVendorCode(),
          is_active: true,
        });
        toast({ title: "Vendor added", description: `New vendor created with code ${created.code}.` });
      }
      await loadVendors();
      resetForm();
    } catch (err) {
      toast({
        title: editMode ? "Failed to update vendor" : "Failed to create vendor",
        description: formatApiError(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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

  const handleDelete = async (vendor: Vendor) => {
    if (!window.confirm(`Delete vendor ${vendor.name}? This cannot be undone.`)) return;
    try {
      await apiEndpoints.vendors.delete(Number(vendor.id));
      toast({ title: "Vendor deleted", description: "The vendor has been removed.", variant: "destructive" });
      await loadVendors();
    } catch (err) {
      toast({ title: "Failed to delete vendor", description: formatApiError(err), variant: "destructive" });
    }
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
      <div className="space-y-6">
        <PageHeader
          title={editMode ? "Edit Vendor" : "Add New Vendor"}
          subtitle={editMode ? "Update vendor information" : "Onboard a new supplier or service provider"}
          icon={Users}
          variant="slate"
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
                  <p className="text-xs text-muted-foreground">Not stored in the database.</p>
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
                  <p className="text-xs text-muted-foreground">Not stored in the database.</p>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={saving}>
                  {saving ? "Saving..." : editMode ? "Update Vendor" : "Create Vendor"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show list view
  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Management"
        subtitle="Manage suppliers, contractors, and service providers"
        icon={Users}
        variant="slate"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

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
        emptyMessage={loading ? "Loading vendors..." : "No vendors found"}
        showCode={true}
        codeKey="code"
      />
    </div>
  );
}
