import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, ArrowLeft, Mail, Phone, MapPin } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { MasterDataTable, ColumnDef } from "@/components/master-data/MasterDataTable";
import { generateCode } from "@/utils/codeGenerator";
import { getBadgeVariant } from "@/utils/badgeColors";
import { apiEndpoints } from "@/lib/api";

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
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const mapCompany = (row: any): Company => ({
    id: String(row.id),
    code: row.code || "",
    name: row.name || "",
    registrationNumber: "",
    taxId: row.gstin || "",
    email: row.email || "",
    phone: row.phone || "",
    address: row.address || "",
    city: row.city || "",
    country: row.country || "",
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

  const loadCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await apiEndpoints.companies.getAll();
      setCompanies(Array.isArray(rows) ? rows.map(mapCompany) : []);
    } catch (err) {
      const message = formatApiError(err);
      setError(message);
      setCompanies([]);
      toast({ title: "Failed to load companies", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Company Settings | Renata";
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Missing required fields", description: "Company name is required.", variant: "destructive" });
      return;
    }
    const payload = {
      name: formData.name.trim(),
      address: formData.address || null,
      city: formData.city || null,
      country: formData.country || null,
      email: formData.email || null,
      phone: formData.phone || null,
      gstin: formData.taxId || null,
    };
    setSaving(true);
    try {
      if (editMode && selectedCompany) {
        await apiEndpoints.companies.update(Number(selectedCompany.id), payload);
        toast({ title: "Company updated", description: "Company information has been updated successfully." });
      } else {
        const created = await apiEndpoints.companies.create({
          ...payload,
          code: newCompanyCode || generateCompanyCode(),
          is_active: true,
        });
        toast({ title: "Company added", description: `New company created with code ${created.code}.` });
      }
      await loadCompanies();
      resetForm();
    } catch (err) {
      toast({
        title: editMode ? "Failed to update company" : "Failed to create company",
        description: formatApiError(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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

  const handleDelete = async (company: Company) => {
    if (!window.confirm(`Delete company ${company.name}? This cannot be undone.`)) return;
    try {
      await apiEndpoints.companies.delete(Number(company.id));
      toast({ title: "Company deleted", description: "The company has been removed.", variant: "destructive" });
      await loadCompanies();
    } catch (err) {
      toast({ title: "Failed to delete company", description: formatApiError(err), variant: "destructive" });
    }
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
      <div className="space-y-6">
        <PageHeader
          title={editMode ? "Edit Company" : "Add New Company"}
          subtitle={editMode ? "Update company information" : "Create a new company profile"}
          icon={Building2}
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
                  <p className="text-xs text-muted-foreground">Not stored in the database. Tax ID is saved as GSTIN.</p>
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
                <Button onClick={handleAdd} disabled={saving}>
                  {saving ? "Saving..." : editMode ? "Update Company" : "Create Company"}
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
        title="Company Management"
        subtitle="Manage company profiles and business entities"
        icon={Building2}
        variant="slate"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

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
        emptyMessage={loading ? "Loading companies..." : "No companies found"}
        showCode={true}
        codeKey="code"
      />
    </div>
  );
}
