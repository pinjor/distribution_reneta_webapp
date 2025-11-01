import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Plus, Search, Edit, Trash2, Mail, Phone, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Company {
  id: string;
  name: string;
  registrationNumber: string;
  taxId: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  status: "active" | "inactive";
}

export default function Company() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([
    { 
      id: "1", 
      name: "Acme Corporation", 
      registrationNumber: "REG-2024-001", 
      taxId: "TAX-123456789", 
      email: "contact@acme.com", 
      phone: "+1 (555) 123-4567", 
      address: "123 Business St, Suite 100", 
      city: "New York", 
      country: "United States", 
      status: "active" 
    },
    { 
      id: "2", 
      name: "Global Industries Ltd", 
      registrationNumber: "REG-2024-002", 
      taxId: "TAX-987654321", 
      email: "info@global.com", 
      phone: "+1 (555) 234-5678", 
      address: "456 Commerce Ave", 
      city: "Boston", 
      country: "United States", 
      status: "active" 
    },
    { 
      id: "3", 
      name: "Tech Logistics Inc", 
      registrationNumber: "REG-2024-003", 
      taxId: "TAX-456789123", 
      email: "admin@techlog.com", 
      phone: "+1 (555) 345-6789", 
      address: "789 Innovation Dr", 
      city: "San Francisco", 
      country: "United States", 
      status: "inactive" 
    },
  ]);

  const [formData, setFormData] = useState({
    name: "",
    registrationNumber: "",
    taxId: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
  });

  useEffect(() => {
    document.title = "Company Settings | App";
  }, []);

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    if (editMode && selectedCompany) {
      setCompanies(prev => prev.map(c => 
        c.id === selectedCompany.id 
          ? { ...c, ...formData }
          : c
      ));
      toast({
        title: "Company updated",
        description: "Company information has been updated successfully.",
      });
    } else {
      const newCompany: Company = {
        id: Date.now().toString(),
        ...formData,
        status: "active",
      };
      setCompanies(prev => [...prev, newCompany]);
      toast({
        title: "Company added",
        description: "New company has been created successfully.",
      });
    }
    resetForm();
  };

  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
      registrationNumber: company.registrationNumber,
      taxId: company.taxId,
      email: company.email,
      phone: company.phone,
      address: company.address,
      city: company.city,
      country: company.country,
    });
    setEditMode(true);
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    setCompanies(prev => prev.filter(c => c.id !== id));
    toast({
      title: "Company deleted",
      description: "The company has been removed.",
      variant: "destructive",
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      registrationNumber: "",
      taxId: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      country: "",
    });
    setEditMode(false);
    setSelectedCompany(null);
    setOpen(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <main className="p-6">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Company Management</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage company profiles and business entities</p>
      </header>

      <Card className="card-elevated">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>All Companies</CardTitle>
              <CardDescription>Total entities: {companies.length}</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search companies..."
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
                    Add Company
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editMode ? "Edit Company" : "Add New Company"}</DialogTitle>
                    <DialogDescription>
                      {editMode ? "Update company information" : "Create a new company profile"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Company Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleChange("name", e.target.value)}
                          placeholder="Enter company name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="regNumber">Registration Number</Label>
                        <Input
                          id="regNumber"
                          value={formData.registrationNumber}
                          onChange={(e) => handleChange("registrationNumber", e.target.value)}
                          placeholder="REG-XXXX-XXX"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="taxId">Tax ID / EIN</Label>
                        <Input
                          id="taxId"
                          value={formData.taxId}
                          onChange={(e) => handleChange("taxId", e.target.value)}
                          placeholder="TAX-XXXXXXX"
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
                          placeholder="contact@company.com"
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
                          placeholder="+1 (555) 000-0000"
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
                        placeholder="123 Main St, Suite 100"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={(e) => handleChange("country", e.target.value)}
                        placeholder="Country"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={resetForm}>Cancel</Button>
                    <Button onClick={handleAdd}>{editMode ? "Update" : "Create"} Company</Button>
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
                <TableHead>Company Name</TableHead>
                <TableHead>Registration</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompanies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      <div>{company.registrationNumber}</div>
                      <div className="text-muted-foreground">{company.taxId}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {company.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {company.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div>{company.city}</div>
                        <div className="text-muted-foreground">{company.country}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={company.status === "active" ? "status-success" : "status-neutral"}>
                      {company.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleEdit(company)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(company.id)}
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
