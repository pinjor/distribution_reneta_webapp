import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Package, ArrowLeft, Barcode, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateCode } from "@/utils/codeGenerator";
import { Checkbox } from "@/components/ui/checkbox";
import { MasterDataTable, ColumnDef } from "@/components/master-data/MasterDataTable";
import { getBadgeVariant } from "@/utils/badgeColors";

interface Product {
  id: string;
  sku: string;
  code?: string; // New Code (auto-generated)
  oldCode?: string; // Old Code (user input)
  name: string;
  category: string;
  brand: string;
  price: string;
  stock: number;
  unit: string;
  status: "active" | "inactive" | "discontinued";
  primaryPackaging?: "Bottle" | "Blister" | "Vial" | "Injection";
  productType?: {
    commercial?: boolean;
    sample?: boolean;
    institutional?: boolean;
    export?: boolean;
  };
  ifcValue1?: number;
  ifcValue2?: number;
  ifcResult?: number;
  mcValue1?: number;
  mcValue2?: number;
  mcValue3?: number;
  mcResult?: number;
}

export default function Products() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([
    { id: "1", sku: "PRD-001", name: "Premium Widget A", category: "Electronics", brand: "TechBrand", price: "$49.99", stock: 250, unit: "unit", status: "active" },
    { id: "2", sku: "PRD-002", name: "Industrial Component B", category: "Hardware", brand: "IndustrialCo", price: "$125.50", stock: 150, unit: "unit", status: "active" },
    { id: "3", sku: "PRD-003", name: "Consumer Gadget C", category: "Electronics", brand: "GadgetPro", price: "$89.00", stock: 0, unit: "unit", status: "inactive" },
    { id: "4", sku: "PRD-004", name: "Office Supply Kit", category: "Office", brand: "OfficePlus", price: "$35.75", stock: 500, unit: "pack", status: "active" },
  ]);

  const [formData, setFormData] = useState({
    sku: "",
    oldCode: "",
    name: "",
    category: "",
    brand: "",
    price: "",
    unit: "",
    description: "",
    primaryPackaging: "" as "Bottle" | "Blister" | "Vial" | "Injection" | "",
    productType: {
      commercial: false,
      sample: false,
      institutional: false,
      export: false,
    },
    ifcValue1: "",
    ifcValue2: "",
    mcValue1: "",
    mcValue2: "",
    mcValue3: "",
  });
  
  const [newProductCode, setNewProductCode] = useState<string>("");

  // Calculate IFC result
  const ifcResult = formData.ifcValue1 && formData.ifcValue2 
    ? parseFloat(formData.ifcValue1) * parseFloat(formData.ifcValue2)
    : null;

  // Calculate MC result
  const mcResult = formData.mcValue1 && formData.mcValue2 && formData.mcValue3
    ? parseFloat(formData.mcValue1) * parseFloat(formData.mcValue2) * parseFloat(formData.mcValue3)
    : null;

  useEffect(() => {
    document.title = "Products | App";
  }, []);

  const generateProductCode = (): string => {
    const existingCodes = products.filter(p => p.code).map(p => p.code!);
    return generateCode("PROD", existingCodes);
  };

  // Generate code when form opens for new product
  useEffect(() => {
    if (showAddForm && !editMode) {
      setNewProductCode(generateProductCode());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddForm, editMode]);

  const handleAdd = () => {
    if (editMode && selectedProduct) {
      setProducts(prev => prev.map(p => 
        p.id === selectedProduct.id 
          ? { 
              ...p, 
              sku: formData.sku,
              name: formData.name,
              category: formData.category,
              brand: formData.brand,
              price: formData.price,
              stock: p.stock || 0, // Preserve existing stock value, don't update
              unit: formData.unit,
              primaryPackaging: formData.primaryPackaging || undefined,
              productType: formData.productType,
              oldCode: formData.oldCode || undefined,
              ifcValue1: formData.ifcValue1 ? parseFloat(formData.ifcValue1) : undefined,
              ifcValue2: formData.ifcValue2 ? parseFloat(formData.ifcValue2) : undefined,
              ifcResult: ifcResult || undefined,
              mcValue1: formData.mcValue1 ? parseFloat(formData.mcValue1) : undefined,
              mcValue2: formData.mcValue2 ? parseFloat(formData.mcValue2) : undefined,
              mcValue3: formData.mcValue3 ? parseFloat(formData.mcValue3) : undefined,
              mcResult: mcResult || undefined,
            }
          : p
      ));
      toast({
        title: "Product updated",
        description: "Product information has been updated successfully.",
      });
    } else {
      const newCode = generateProductCode();
      const newProduct: Product = {
        id: Date.now().toString(),
        sku: formData.sku,
        code: newCode,
        oldCode: formData.oldCode || undefined,
        name: formData.name,
        category: formData.category,
        brand: formData.brand,
        price: formData.price,
        stock: 0, // Keep for backwards compatibility but not editable
        unit: formData.unit,
        status: "active",
        primaryPackaging: formData.primaryPackaging || undefined,
        productType: formData.productType,
        ifcValue1: formData.ifcValue1 ? parseFloat(formData.ifcValue1) : undefined,
        ifcValue2: formData.ifcValue2 ? parseFloat(formData.ifcValue2) : undefined,
        ifcResult: ifcResult || undefined,
        mcValue1: formData.mcValue1 ? parseFloat(formData.mcValue1) : undefined,
        mcValue2: formData.mcValue2 ? parseFloat(formData.mcValue2) : undefined,
        mcValue3: formData.mcValue3 ? parseFloat(formData.mcValue3) : undefined,
        mcResult: mcResult || undefined,
      };
      setProducts(prev => [...prev, newProduct]);
      toast({
        title: "Product added",
        description: `New product created with code ${newCode}.`,
      });
    }
    resetForm();
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      sku: product.sku,
      oldCode: product.oldCode || "",
      name: product.name,
      category: product.category,
      brand: product.brand,
      price: product.price,
      unit: product.unit,
      description: "",
      primaryPackaging: product.primaryPackaging || "",
      productType: product.productType || {
        commercial: false,
        sample: false,
        institutional: false,
        export: false,
      },
      ifcValue1: product.ifcValue1?.toString() || "",
      ifcValue2: product.ifcValue2?.toString() || "",
      mcValue1: product.mcValue1?.toString() || "",
      mcValue2: product.mcValue2?.toString() || "",
      mcValue3: product.mcValue3?.toString() || "",
    });
    setEditMode(true);
    setShowAddForm(true);
  };

  const handleDelete = (product: Product) => {
    setProducts(prev => prev.filter(p => p.id !== product.id));
    toast({
      title: "Product deleted",
      description: "The product has been removed from catalog.",
      variant: "destructive",
    });
  };

  const handleCancel = () => {
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      sku: "",
      oldCode: "",
      name: "",
      category: "",
      brand: "",
      price: "",
      unit: "",
      description: "",
      primaryPackaging: "",
      productType: {
        commercial: false,
        sample: false,
        institutional: false,
        export: false,
      },
      ifcValue1: "",
      ifcValue2: "",
      mcValue1: "",
      mcValue2: "",
      mcValue3: "",
    });
    setNewProductCode("");
    setEditMode(false);
    setSelectedProduct(null);
    setShowAddForm(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Define table columns
  const columns: ColumnDef<Product>[] = [
    {
      key: "sku",
      header: "SKU",
      render: (_, product) => (
        <div className="flex items-center gap-2">
          <Barcode className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{product.sku}</span>
        </div>
      ),
    },
    {
      key: "name",
      header: "Product Name",
      render: (_, product) => (
        <span className="font-medium">{product.name}</span>
      ),
    },
    {
      key: "brand",
      header: "Brand",
    },
    {
      key: "category",
      header: "Category",
      render: (value) => (
        <Badge variant="outline" className="text-xs">{String(value)}</Badge>
      ),
    },
    {
      key: "price",
      header: "Price",
      render: (value) => (
        <span className="font-medium">{value}</span>
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
              {editMode ? "Edit Product" : "Add New Product"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {editMode ? "Update product information" : "Create a new product in the catalog"}
          </p>
        </header>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="space-y-6 max-w-4xl">
              {/* Code Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="old-code">Old Code</Label>
                  <Input
                    id="old-code"
                    value={formData.oldCode}
                    onChange={(e) => handleChange("oldCode", e.target.value)}
                    placeholder="Enter old code"
                  />
                  <p className="text-xs text-muted-foreground">Manually enter the old product code</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-code">New Code</Label>
                  <Input
                    id="new-code"
                    value={editMode && selectedProduct?.code ? selectedProduct.code : newProductCode}
                    disabled
                    className="bg-muted font-mono font-semibold"
                    placeholder="Auto-generated"
                  />
                  <p className="text-xs text-muted-foreground">Auto-generated code (cannot be changed)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku" className="flex items-center gap-2">
                    <Barcode className="h-4 w-4 text-muted-foreground" />
                    SKU / Product Code *
                  </Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => handleChange("sku", e.target.value)}
                    placeholder="PRD-XXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => handleChange("brand", e.target.value)}
                    placeholder="Brand name"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Enter product name"
                />
              </div>

              {/* Product Type */}
              <div className="space-y-3">
                <Label>Product Type</Label>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="product-type-commercial"
                      checked={formData.productType.commercial}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          productType: { ...prev.productType, commercial: checked === true }
                        }))
                      }
                    />
                    <Label htmlFor="product-type-commercial" className="font-normal cursor-pointer">
                      Commercial
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="product-type-sample"
                      checked={formData.productType.sample}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          productType: { ...prev.productType, sample: checked === true }
                        }))
                      }
                    />
                    <Label htmlFor="product-type-sample" className="font-normal cursor-pointer">
                      Sample
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="product-type-institutional"
                      checked={formData.productType.institutional}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          productType: { ...prev.productType, institutional: checked === true }
                        }))
                      }
                    />
                    <Label htmlFor="product-type-institutional" className="font-normal cursor-pointer">
                      Institutional
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="product-type-export"
                      checked={formData.productType.export}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          productType: { ...prev.productType, export: checked === true }
                        }))
                      }
                    />
                    <Label htmlFor="product-type-export" className="font-normal cursor-pointer">
                      Export
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Product description"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(val) => handleChange("category", val)}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Electronics">Electronics</SelectItem>
                      <SelectItem value="Hardware">Hardware</SelectItem>
                      <SelectItem value="Office">Office</SelectItem>
                      <SelectItem value="Consumer Goods">Consumer Goods</SelectItem>
                      <SelectItem value="Industrial">Industrial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select value={formData.unit} onValueChange={(val) => handleChange("unit", val)}>
                    <SelectTrigger id="unit">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unit">unit</SelectItem>
                      <SelectItem value="pack">pack</SelectItem>
                      <SelectItem value="box">box</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="liter">liter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="price" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Unit Price
                </Label>
                <Input
                  id="price"
                  value={formData.price}
                  onChange={(e) => handleChange("price", e.target.value)}
                  placeholder="$0.00"
                />
              </div>

              {/* Primary Packaging */}
              <div className="space-y-2">
                <Label htmlFor="primary-packaging">Primary Packaging</Label>
                <Select 
                  value={formData.primaryPackaging} 
                  onValueChange={(val) => handleChange("primaryPackaging", val)}
                >
                  <SelectTrigger id="primary-packaging">
                    <SelectValue placeholder="Select primary packaging" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bottle">Bottle</SelectItem>
                    <SelectItem value="Blister">Blister</SelectItem>
                    <SelectItem value="Vial">Vial</SelectItem>
                    <SelectItem value="Injection">Injection</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Pack Size */}
              <div className="border-t pt-6 mt-6">
                <Label className="text-base font-semibold mb-4 block">Pack Size</Label>
                
                {/* IFC Section */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="font-medium">IFC</Label>
                  </div>
                  <div className="grid grid-cols-4 gap-2 items-center">
                    <Input
                      type="number"
                      value={formData.ifcValue1}
                      onChange={(e) => handleChange("ifcValue1", e.target.value)}
                      placeholder="5"
                      className="text-center"
                    />
                    <span className="text-center">×</span>
                    <Input
                      type="number"
                      value={formData.ifcValue2}
                      onChange={(e) => handleChange("ifcValue2", e.target.value)}
                      placeholder="10"
                      className="text-center"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-center font-medium">=</span>
                      <Input
                        value={ifcResult !== null ? ifcResult.toString() : ""}
                        disabled
                        className="bg-muted font-semibold text-center"
                        placeholder="Result"
                      />
                    </div>
                  </div>
                </div>

                {/* MC Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="font-medium">MC</Label>
                  </div>
                  <div className="grid grid-cols-6 gap-2 items-center">
                    <Input
                      type="number"
                      value={formData.mcValue1}
                      onChange={(e) => handleChange("mcValue1", e.target.value)}
                      placeholder="18"
                      className="text-center"
                    />
                    <span className="text-center">×</span>
                    <Input
                      type="number"
                      value={formData.mcValue2}
                      onChange={(e) => handleChange("mcValue2", e.target.value)}
                      placeholder="5"
                      className="text-center"
                    />
                    <span className="text-center">×</span>
                    <Input
                      type="number"
                      value={formData.mcValue3}
                      onChange={(e) => handleChange("mcValue3", e.target.value)}
                      placeholder="10"
                      className="text-center"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-center font-medium">=</span>
                      <Input
                        value={mcResult !== null ? mcResult.toString() : ""}
                        disabled
                        className="bg-muted font-semibold text-center"
                        placeholder="Result"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleAdd}>
                  {editMode ? "Update Product" : "Create Product"}
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
          <h1 className="text-2xl font-semibold text-foreground">Product Management</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage product catalog, SKUs, and inventory items</p>
      </header>

      <MasterDataTable
        title="Product Catalog"
        description={`Total products: ${products.length}`}
        data={products}
        columns={columns}
        searchPlaceholder="Search products..."
        searchFields={["name", "sku", "code", "category", "brand"]}
        itemsPerPage={10}
        onAdd={() => setShowAddForm(true)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage="No products found"
        showCode={true}
        codeKey="code"
      />
    </main>
  );
}
