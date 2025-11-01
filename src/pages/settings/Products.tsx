import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Plus, Search, Edit, Trash2, Barcode, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  price: string;
  stock: number;
  unit: string;
  status: "active" | "inactive" | "discontinued";
}

export default function Products() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
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
    name: "",
    category: "",
    brand: "",
    price: "",
    stock: "",
    unit: "",
    description: "",
  });

  useEffect(() => {
    document.title = "Products | App";
  }, []);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              stock: parseInt(formData.stock) || 0,
              unit: formData.unit,
            }
          : p
      ));
      toast({
        title: "Product updated",
        description: "Product information has been updated successfully.",
      });
    } else {
      const newProduct: Product = {
        id: Date.now().toString(),
        sku: formData.sku,
        name: formData.name,
        category: formData.category,
        brand: formData.brand,
        price: formData.price,
        stock: parseInt(formData.stock) || 0,
        unit: formData.unit,
        status: "active",
      };
      setProducts(prev => [...prev, newProduct]);
      toast({
        title: "Product added",
        description: "New product has been created successfully.",
      });
    }
    resetForm();
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      category: product.category,
      brand: product.brand,
      price: product.price,
      stock: product.stock.toString(),
      unit: product.unit,
      description: "",
    });
    setEditMode(true);
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    toast({
      title: "Product deleted",
      description: "The product has been removed from catalog.",
      variant: "destructive",
    });
  };

  const resetForm = () => {
    setFormData({
      sku: "",
      name: "",
      category: "",
      brand: "",
      price: "",
      stock: "",
      unit: "",
      description: "",
    });
    setEditMode(false);
    setSelectedProduct(null);
    setOpen(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <main className="p-6">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Product Management</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage product catalog, SKUs, and inventory items</p>
      </header>

      <Card className="card-elevated">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Product Catalog</CardTitle>
              <CardDescription>Total products: {products.length}</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Dialog open={open} onOpenChange={(isOpen) => {
                setOpen(isOpen);
                if (!isOpen) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editMode ? "Edit Product" : "Add New Product"}</DialogTitle>
                    <DialogDescription>
                      {editMode ? "Update product information" : "Create a new product in the catalog"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <div className="space-y-2">
                        <Label htmlFor="stock">Stock Quantity</Label>
                        <Input
                          id="stock"
                          type="number"
                          value={formData.stock}
                          onChange={(e) => handleChange("stock", e.target.value)}
                          placeholder="0"
                        />
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
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={resetForm}>Cancel</Button>
                    <Button onClick={handleAdd}>{editMode ? "Update" : "Create"} Product</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Barcode className="h-4 w-4 text-muted-foreground" />
                      {product.sku}
                    </div>
                  </TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell className="text-muted-foreground">{product.brand}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.category}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{product.price}</TableCell>
                  <TableCell>
                    <span className={product.stock === 0 ? 'text-destructive font-medium' : ''}>
                      {product.stock} {product.unit}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      product.status === "active" ? "status-success" :
                      product.status === "discontinued" ? "status-error" :
                      "status-neutral"
                    }>
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleEdit(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
