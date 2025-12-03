import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, ArrowLeft, Mail, Phone, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MasterDataTable, ColumnDef } from "@/components/master-data/MasterDataTable";
import { generateCode } from "@/utils/codeGenerator";
import { getBadgeVariant } from "@/utils/badgeColors";

interface Company {
  id: string;
  code: string;
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [newCompanyCode, setNewCompanyCode] = useState<string>("");
  const [companies, setCompanies] = useState<Company[]>([
    { 
      id: "1", 
      code: "COMP-0001",
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
      code: "COMP-0002",
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
      code: "COMP-0003",
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
    document.title = "Company Settings | Renata";
  }, []);

  const generateCompanyCode = (): string => {
    const existingCodes = companies.map(c => c.code);
    return generateCode("COMP", existingCodes);
  };

  // Generate code when form opens for new company
  useEffect(() => {
    if (showAddForm && !editMode) {
      setNewCompanyCode(generateCompanyCode());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddForm, editMode]);

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
      const newCode = generateCompanyCode();
      const newCompany: Company = {
        id: Date.now().toString(),
        code: newCode,
        ...formData,
        status: "active",
      };
      setCompanies(prev => [...prev, newCompany]);
      toast({
        title: "Company added",
        description: `New company created with code ${newCode}.`,
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
    setShowAddForm(true);
  };

  const handleDelete = (company: Company) => {
    setCompanies(prev => prev.filter(c => c.id !== company.id));
    toast({
      title: "Company deleted",
      description: "The company has been removed.",
      variant: "destructive",
    });
  };

  const handleCancel = () => {
    resetForm();
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
    setNewCompanyCode("");
    setEditMode(false);
    setSelectedCompany(null);
    setShowAddForm(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Define table columns
  const columns: ColumnDef<Company>[] = [
    {
      key: "name",
      header: "Company Name",
      render: (_, company) => (
        <span className="font-medium">{company.name}</span>
      ),
    },
    {
      key: "registrationNumber",
      header: "Registration",
      render: (_, company) => (
        <div className="space-y-1 text-sm">
          <div>{company.registrationNumber}</div>
          <div className="text-muted-foreground">{company.taxId}</div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Contact",
      render: (_, company) => (
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
      ),
    },
    {
      key: "city",
      header: "Location",
      render: (_, company) => (
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <div>
            <div>{company.city}</div>
            <div className="text-muted-foreground">{company.country}</div>
          </div>
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
            <Building2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">
              {editMode ? "Edit Company" : "Add New Company"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {editMode ? "Update company information" : "Create a new company profile"}
          </p>
        </header>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="space-y-6 max-w-4xl">
              {/* Code Field - Auto-generated */}
              <div className="space-y-2">
                <Label htmlFor="code">Company Code *</Label>
                <Input
                  id="code"
                  value={editMode && selectedCompany?.code ? selectedCompany.code : newCompanyCode}
                  disabled
                  className="bg-muted font-mono font-semibold"
                  placeholder="Auto-generated"
                />
                <p className="text-xs text-muted-foreground">Auto-generated code (cannot be changed)</p>
              </div>

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

              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleAdd}>
                  {editMode ? "Update Company" : "Create Company"}
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
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Company Management</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage company profiles and business entities</p>
      </header>

      <MasterDataTable
        title="All Companies"
        description={`Total entities: ${companies.length}`}
        data={companies}
        columns={columns}
        searchPlaceholder="Search companies..."
        searchFields={["name", "code", "email", "registrationNumber", "city", "country"]}
        itemsPerPage={10}
        onAdd={() => setShowAddForm(true)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage="No companies found"
        showCode={true}
        codeKey="code"
      />
    </main>
  );
}
