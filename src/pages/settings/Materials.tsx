import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package2, ArrowLeft, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MasterDataTable, ColumnDef } from "@/components/master-data/MasterDataTable";
import { generateCode } from "@/utils/codeGenerator";
import { getBadgeVariant } from "@/utils/badgeColors";

interface Material {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  price: string;
  stock: number;
  status: "active" | "inactive" | "discontinued";
}

export default function Materials() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [newMaterialCode, setNewMaterialCode] = useState<string>("");
  const [materials, setMaterials] = useState<Material[]>([
    { id: "1", code: "MAT-0001", name: "Steel Rods 10mm", category: "Raw Material", unit: "kg", price: "$2.50", stock: 5000, status: "active" },
    { id: "2", code: "MAT-0002", name: "Cardboard Box Large", category: "Packaging", unit: "unit", price: "$1.20", stock: 1200, status: "active" },
    { id: "3", code: "MAT-0003", name: "Plastic Pellets", category: "Raw Material", unit: "kg", price: "$3.80", stock: 3500, status: "active" },
    { id: "4", code: "MAT-0004", name: "Wooden Pallet", category: "Logistics", unit: "unit", price: "$12.00", stock: 0, status: "discontinued" },
  ]);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    unit: "",
    price: "",
    stock: "",
  });

  useEffect(() => {
    document.title = "Materials | App";
  }, []);

  const generateMaterialCode = (): string => {
    const existingCodes = materials.map(m => m.code);
    return generateCode("MAT", existingCodes);
  };

  // Generate code when form opens for new material
  useEffect(() => {
    if (showAddForm && !editMode) {
      setNewMaterialCode(generateMaterialCode());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddForm, editMode]);

  const handleAdd = () => {
    if (editMode && selectedMaterial) {
      setMaterials(prev => prev.map(m => 
        m.id === selectedMaterial.id 
          ? { 
              ...m, 
              name: formData.name,
              category: formData.category,
              unit: formData.unit,
              price: formData.price,
              stock: formData.stock ? parseInt(formData.stock) : m.stock,
            }
          : m
      ));
      toast({
        title: "Material updated",
        description: "Material information has been updated successfully.",
      });
    } else {
      const newCode = generateMaterialCode();
      const newMaterial: Material = {
        id: Date.now().toString(),
        code: newCode,
        name: formData.name,
        category: formData.category,
        unit: formData.unit,
        price: formData.price,
        stock: formData.stock ? parseInt(formData.stock) : 0,
        status: "active",
      };
      setMaterials(prev => [...prev, newMaterial]);
      toast({
        title: "Material added",
        description: `New material created with code ${newCode}.`,
      });
    }
    resetForm();
  };

  const handleEdit = (material: Material) => {
    setSelectedMaterial(material);
    setFormData({
      name: material.name,
      category: material.category,
      unit: material.unit,
      price: material.price,
      stock: material.stock.toString(),
    });
    setEditMode(true);
    setShowAddForm(true);
  };

  const handleDelete = (material: Material) => {
    setMaterials(prev => prev.filter(m => m.id !== material.id));
    toast({
      title: "Material deleted",
      description: "The material has been removed from catalog.",
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
      unit: "",
      price: "",
      stock: "",
    });
    setNewMaterialCode("");
    setEditMode(false);
    setSelectedMaterial(null);
    setShowAddForm(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Define table columns
  const columns: ColumnDef<Material>[] = [
    {
      key: "name",
      header: "Material Name",
      render: (_, material) => (
        <span className="font-medium">{material.name}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (value) => (
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          {String(value)}
        </div>
      ),
    },
    {
      key: "unit",
      header: "Unit",
    },
    {
      key: "price",
      header: "Price",
      render: (value) => (
        <span className="font-medium">{value}</span>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      render: (value, material) => (
        <span className={material.stock === 0 ? 'text-destructive font-medium' : ''}>
          {material.stock} {material.unit}
        </span>
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
            <Package2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">
              {editMode ? "Edit Material" : "Add New Material"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {editMode ? "Update material information" : "Create a new material in the catalog"}
          </p>
        </header>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="space-y-6 max-w-4xl">
              {/* Code Field - Auto-generated */}
              <div className="space-y-2">
                <Label htmlFor="code">Material Code *</Label>
                <Input
                  id="code"
                  value={editMode && selectedMaterial?.code ? selectedMaterial.code : newMaterialCode}
                  disabled
                  className="bg-muted font-mono font-semibold"
                  placeholder="Auto-generated"
                />
                <p className="text-xs text-muted-foreground">Auto-generated code (cannot be changed)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mat-name">Material Name *</Label>
                <Input
                  id="mat-name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Product name"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mat-category">Category</Label>
                  <Select value={formData.category} onValueChange={(val) => handleChange("category", val)}>
                    <SelectTrigger id="mat-category">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Raw Material">Raw Material</SelectItem>
                      <SelectItem value="Packaging">Packaging</SelectItem>
                      <SelectItem value="Logistics">Logistics</SelectItem>
                      <SelectItem value="Finished Good">Finished Good</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mat-unit">Unit</Label>
                  <Select value={formData.unit} onValueChange={(val) => handleChange("unit", val)}>
                    <SelectTrigger id="mat-unit">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="unit">unit</SelectItem>
                      <SelectItem value="liter">liter</SelectItem>
                      <SelectItem value="meter">meter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mat-price">Unit Price</Label>
                  <Input
                    id="mat-price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleChange("price", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mat-stock">Stock Quantity</Label>
                  <Input
                    id="mat-stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => handleChange("stock", e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleAdd}>
                  {editMode ? "Update Material" : "Create Material"}
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
          <Package2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Materials Master</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage materials, SKUs, and product catalog</p>
      </header>

      <MasterDataTable
        title="Material Catalog"
        description={`Total items: ${materials.length}`}
        data={materials}
        columns={columns}
        searchPlaceholder="Search materials..."
        searchFields={["name", "code", "category"]}
        itemsPerPage={10}
        onAdd={() => setShowAddForm(true)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage="No materials found"
        showCode={true}
        codeKey="code"
      />
    </main>
  );
}
