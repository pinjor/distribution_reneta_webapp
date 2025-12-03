import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ruler, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MasterDataTable, ColumnDef } from "@/components/master-data/MasterDataTable";
import { apiEndpoints } from "@/lib/api";
import { generateCode } from "@/utils/codeGenerator";

interface UOM {
  id: number;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export default function UOM() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedUOM, setSelectedUOM] = useState<UOM | null>(null);
  const [uoms, setUOMs] = useState<UOM[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const [newUOMCode, setNewUOMCode] = useState<string>("");

  useEffect(() => {
    fetchUOMs();
  }, []);

  const fetchUOMs = async () => {
    try {
      setLoading(true);
      const data = await apiEndpoints.uoms.getAll();
      setUOMs(data);
    } catch (error) {
      console.error("Failed to fetch UOMs:", error);
      toast({
        title: "Error",
        description: "Failed to load UOMs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "UOM | Renata";
  }, []);

  const generateUOMCode = (): string => {
    const existingCodes = uoms.map(u => u.code);
    return generateCode("UOM", existingCodes);
  };

  useEffect(() => {
    if (showAddForm && !editMode) {
      setNewUOMCode(generateUOMCode());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddForm, editMode]);

  const handleAdd = async () => {
    try {
      const uomData: any = {
        code: newUOMCode,
        name: formData.name,
        description: formData.description || undefined,
        is_active: true,
      };

      if (editMode && selectedUOM) {
        await apiEndpoints.uoms.update(selectedUOM.id, uomData);
        toast({
          title: "UOM updated",
          description: "UOM information has been updated successfully.",
        });
      } else {
        await apiEndpoints.uoms.create(uomData);
        toast({
          title: "UOM added",
          description: `New UOM created with code ${newUOMCode}.`,
        });
      }

      await fetchUOMs();
      resetForm();
    } catch (error: any) {
      console.error("Failed to save UOM:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save UOM. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (uom: UOM) => {
    setSelectedUOM(uom);
    setFormData({
      name: uom.name,
      description: uom.description || "",
    });
    setNewUOMCode(uom.code);
    setEditMode(true);
    setShowAddForm(true);
  };

  const handleDelete = async (uom: UOM) => {
    try {
      await apiEndpoints.uoms.delete(uom.id);
      toast({
        title: "UOM deleted",
        description: "The UOM has been removed.",
        variant: "destructive",
      });
      await fetchUOMs();
    } catch (error: any) {
      console.error("Failed to delete UOM:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete UOM. Please try again.",
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
    setNewUOMCode("");
    setEditMode(false);
    setSelectedUOM(null);
    setShowAddForm(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const columns: ColumnDef<UOM>[] = [
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
      render: (_, uom) => (
        <span className="font-medium">{uom.name}</span>
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
            <Ruler className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">
              {editMode ? "Edit UOM" : "Add New UOM"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {editMode ? "Update UOM information" : "Create a new UOM (Unit of Measure)"}
          </p>
        </header>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="space-y-6 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="code" className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-muted-foreground" />
                  Code *
                </Label>
                <Input
                  id="code"
                  value={newUOMCode}
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
                  placeholder="Enter UOM name (e.g., PCS, kg, liter)"
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
                  {editMode ? "Update UOM" : "Create UOM"}
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
          <Ruler className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">UOM Management</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage Units of Measure (UOM) for products</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading UOMs...</p>
        </div>
      ) : (
        <MasterDataTable
          title="UOM Catalog"
          description={`Total UOMs: ${uoms.length}`}
          data={uoms}
          columns={columns}
          searchPlaceholder="Search UOMs..."
          searchFields={["name", "code", "description"]}
          itemsPerPage={10}
          onAdd={() => setShowAddForm(true)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyMessage="No UOMs found"
          showCode={false}
        />
      )}
    </main>
  );
}

