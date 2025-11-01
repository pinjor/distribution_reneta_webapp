import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package2, Plus, Search, Edit, Trash2, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([
    { id: "1", code: "MAT-001", name: "Steel Rods 10mm", category: "Raw Material", unit: "kg", price: "$2.50", stock: 5000, status: "active" },
    { id: "2", code: "MAT-002", name: "Cardboard Box Large", category: "Packaging", unit: "unit", price: "$1.20", stock: 1200, status: "active" },
    { id: "3", code: "MAT-003", name: "Plastic Pellets", category: "Raw Material", unit: "kg", price: "$3.80", stock: 3500, status: "active" },
    { id: "4", code: "MAT-004", name: "Wooden Pallet", category: "Logistics", unit: "unit", price: "$12.00", stock: 0, status: "discontinued" },
  ]);

  useEffect(() => {
    document.title = "Materials | App";
  }, []);

  const filteredMaterials = materials.filter(material =>
    material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    material.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    material.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    toast({
      title: "Material added",
      description: "New material has been created in the catalog.",
    });
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    setMaterials(prev => prev.filter(m => m.id !== id));
    toast({
      title: "Material deleted",
      description: "The material has been removed from catalog.",
      variant: "destructive",
    });
  };

  return (
    <main className="p-6">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Package2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Materials Master</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage materials, SKUs, and product catalog</p>
      </header>

      <Card className="card-elevated">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Material Catalog</CardTitle>
              <CardDescription>Total items: {materials.length}</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search materials..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Material
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Material</DialogTitle>
                    <DialogDescription>Create a new material in the catalog</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="mat-code">Material Code *</Label>
                      <Input id="mat-code" placeholder="MAT-XXX" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mat-name">Material Name *</Label>
                      <Input id="mat-name" placeholder="Product name" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="mat-category">Category</Label>
                        <Select>
                          <SelectTrigger id="mat-category">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="raw">Raw Material</SelectItem>
                            <SelectItem value="packaging">Packaging</SelectItem>
                            <SelectItem value="logistics">Logistics</SelectItem>
                            <SelectItem value="finished">Finished Good</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mat-unit">Unit</Label>
                        <Select>
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
                    <div className="space-y-2">
                      <Label htmlFor="mat-price">Unit Price</Label>
                      <Input id="mat-price" type="number" placeholder="0.00" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleAdd}>Create Material</Button>
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
                <TableHead>Code</TableHead>
                <TableHead>Material Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell className="font-medium">{material.code}</TableCell>
                  <TableCell>{material.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      {material.category}
                    </div>
                  </TableCell>
                  <TableCell>{material.unit}</TableCell>
                  <TableCell className="font-medium">{material.price}</TableCell>
                  <TableCell>
                    <span className={material.stock === 0 ? 'text-destructive font-medium' : ''}>
                      {material.stock} {material.unit}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      material.status === "active" ? "status-success" :
                      material.status === "discontinued" ? "status-error" :
                      "status-neutral"
                    }>
                      {material.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(material.id)}
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
