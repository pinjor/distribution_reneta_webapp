import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MasterDataTable, ColumnDef } from "@/components/master-data/MasterDataTable";
import { apiEndpoints } from "@/lib/api";
import { generateCode } from "@/utils/codeGenerator";

interface PrimaryPackaging {
  id: number;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export default function PrimaryPackaging() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedPackaging, setSelectedPackaging] = useState<PrimaryPackaging | null>(null);
  const [packagings, setPackagings] = useState<PrimaryPackaging[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const [newPackagingCode, setNewPackagingCode] = useState<string>("");

  useEffect(() => {
    fetchPackagings();
  }, []);

  const fetchPackagings = async () => {
    try {
      setLoading(true);
      const data = await apiEndpoints.primaryPackagings.getAll();
      setPackagings(data);
    } catch (error) {
      console.error("Failed to fetch Primary Packagings:", error);
      toast({
        title: "Error",
        description: "Failed to load Primary Packagings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Primary Packaging | App";
  }, []);

  const generatePackagingCode = (): string => {
    const existingCodes = packagings.map(p => p.code);
    return generateCode("PP", existingCodes);
  };

  useEffect(() => {
    if (showAddForm && !editMode) {
      setNewPackagingCode(generatePackagingCode());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddForm, editMode]);

  const handleAdd = async () => {
    try {
      const packagingData: any = {
        code: newPackagingCode,
        name: formData.name,
        description: formData.description || undefined,
        is_active: true,
      };

      if (editMode && selectedPackaging) {
        await apiEndpoints.primaryPackagings.update(selectedPackaging.id, packagingData);
        toast({
          title: "Primary Packaging updated",
          description: "Primary Packaging information has been updated successfully.",
        });
      } else {
        await apiEndpoints.primaryPackagings.create(packagingData);
        toast({
          title: "Primary Packaging added",
          description: `New Primary Packaging created with code ${newPackagingCode}.`,
        });
      }

      await fetchPackagings();
      resetForm();
    } catch (error: any) {
      console.error("Failed to save Primary Packaging:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save Primary Packaging. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (packaging: PrimaryPackaging) => {
    setSelectedPackaging(packaging);
    setFormData({
      name: packaging.name,
      description: packaging.description || "",
    });
    setNewPackagingCode(packaging.code);
    setEditMode(true);
    setShowAddForm(true);
  };

  const handleDelete = async (packaging: PrimaryPackaging) => {
    try {
      await apiEndpoints.primaryPackagings.delete(packaging.id);
      toast({
        title: "Primary Packaging deleted",
        description: "The Primary Packaging has been removed.",
        variant: "destructive",
      });
      await fetchPackagings();
    } catch (error: any) {
      console.error("Failed to delete Primary Packaging:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete Primary Packaging. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
    });
    setNewPackagingCode("");
    setEditMode(false);
    setSelectedPackaging(null);
    setShowAddForm(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const columns: ColumnDef<PrimaryPackaging>[] = [
    {
      key: "code",
      header: "Code",
      render: (value) => (
        <span className="font-mono font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
          {String(value)}
        </span>
      ),
    },
    {
      key: "name",
      header: "Name",
      render: (_, packaging) => (
        <span className="font-medium">{packaging.name}</span>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (value) => (
        <span className="text-muted-foreground">{value || "-"}</span>
      ),
    },
  ];

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
              {editMode ? "Edit Primary Packaging" : "Add New Primary Packaging"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {editMode ? "Update Primary Packaging information" : "Create a new Primary Packaging type"}
          </p>
        </header>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="space-y-6 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="code" className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  Code *
                </Label>
                <Input
                  id="code"
                  value={newPackagingCode}
                  disabled
                  className="bg-muted font-mono font-semibold"
                  placeholder="Auto-generated"
                />
                <p className="text-xs text-muted-foreground">Auto-generated code (cannot be changed)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Enter packaging name (e.g., Bottle, Blister, Vial, Injection)"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Enter description (optional)"
                />
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleAdd}>
                  {editMode ? "Update Primary Packaging" : "Create Primary Packaging"}
                </Button>
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
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Primary Packaging Management</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage Primary Packaging types for products</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading Primary Packagings...</p>
        </div>
      ) : (
        <MasterDataTable
          title="Primary Packaging Catalog"
          description={`Total Primary Packagings: ${packagings.length}`}
          data={packagings}
          columns={columns}
          searchPlaceholder="Search Primary Packagings..."
          searchFields={["name", "code", "description"]}
          itemsPerPage={10}
          onAdd={() => setShowAddForm(true)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyMessage="No Primary Packagings found"
          showCode={false}
        />
      )}
    </main>
  );
}

