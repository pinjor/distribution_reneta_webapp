import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Plus, Search, Edit, Trash2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Vendor {
  id: string;
  name: string;
  category: string;
  email: string;
  phone: string;
  rating: number;
  status: "active" | "inactive" | "pending";
}

export default function Vendors() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([
    { id: "1", name: "Logistics Pro Inc", category: "Transportation", email: "sales@logisticspro.com", phone: "+1 555-2001", rating: 4.8, status: "active" },
    { id: "2", name: "PackMasters Supply", category: "Packaging", email: "info@packmasters.com", phone: "+1 555-2002", rating: 4.5, status: "active" },
    { id: "3", name: "Tech Equipment Co", category: "Equipment", email: "contact@techequip.com", phone: "+1 555-2003", rating: 4.2, status: "pending" },
    { id: "4", name: "Global Freight", category: "Freight", email: "orders@globalfreight.com", phone: "+1 555-2004", rating: 3.9, status: "active" },
  ]);

  useEffect(() => {
    document.title = "Vendors | App";
  }, []);

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    toast({
      title: "Vendor added",
      description: "New vendor has been onboarded successfully.",
    });
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    setVendors(prev => prev.filter(v => v.id !== id));
    toast({
      title: "Vendor deleted",
      description: "The vendor has been removed.",
      variant: "destructive",
    });
  };

  return (
    <main className="p-6">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Vendor Management</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage suppliers, contractors, and service providers</p>
      </header>

      <Card className="card-elevated">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>All Vendors</CardTitle>
              <CardDescription>Total suppliers: {vendors.length}</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Vendor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Vendor</DialogTitle>
                    <DialogDescription>Onboard a new supplier or service provider</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="vendor-name">Vendor Name *</Label>
                      <Input id="vendor-name" placeholder="ABC Suppliers" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vendor-category">Category</Label>
                      <Input id="vendor-category" placeholder="Transportation, Equipment, etc." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vendor-email">Email *</Label>
                      <Input id="vendor-email" type="email" placeholder="contact@vendor.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vendor-phone">Phone</Label>
                      <Input id="vendor-phone" type="tel" placeholder="+1 555-0000" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleAdd}>Add Vendor</Button>
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
                <TableHead>Vendor Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">{vendor.name}</TableCell>
                  <TableCell>{vendor.category}</TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      <div>{vendor.email}</div>
                      <div className="text-muted-foreground">{vendor.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-warning text-warning" />
                      <span className="font-medium">{vendor.rating}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      vendor.status === "active" ? "status-success" :
                      vendor.status === "pending" ? "status-warning" :
                      "status-neutral"
                    }>
                      {vendor.status}
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
                        onClick={() => handleDelete(vendor.id)}
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
