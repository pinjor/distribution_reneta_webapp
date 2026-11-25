import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, ArrowLeft, Mail, Phone, MapPin, GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { MasterDataTable, ColumnDef } from "@/components/master-data/MasterDataTable";
import { generateCode } from "@/utils/codeGenerator";
import { getBadgeVariant } from "@/utils/badgeColors";
import { apiEndpoints } from "@/lib/api";

interface Doctor {
  id: string;
  code: string;
  name: string;
  specialization: string;
  registrationNumber: string;
  qualification: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  status: "active" | "inactive";
}

export default function Doctor() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [newDoctorCode, setNewDoctorCode] = useState<string>("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    specialization: "",
    registrationNumber: "",
    qualification: "",
    email: "",
    phone: "",
    address: "",
    city: "",
  });

  const mapDoctor = (row: any): Doctor => ({
    id: String(row.id),
    code: row.code || "",
    name: row.name || "",
    specialization: row.specialization || "",
    registrationNumber: row.registration_number || "",
    qualification: row.qualification || "",
    email: row.email || "",
    phone: row.phone || "",
    address: row.address || "",
    city: row.city || "",
    status: row.is_active === false ? "inactive" : "active",
  });

  const formatApiError = (err: unknown): string => {
    const anyErr = err as { message?: string; details?: { detail?: unknown } };
    const detail = anyErr?.details?.detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item: any) => item?.msg || JSON.stringify(item))
        .join("; ");
    }
    if (typeof detail === "string") return detail;
    return anyErr?.message || "Request failed";
  };

  const loadDoctors = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await apiEndpoints.doctors.getAll();
      setDoctors(Array.isArray(rows) ? rows.map(mapDoctor) : []);
    } catch (err) {
      const message = formatApiError(err);
      setError(message);
      setDoctors([]);
      toast({
        title: "Failed to load doctors",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Doctor | Renata";
    loadDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateDoctorCode = (): string => {
    const existingCodes = doctors.map(d => d.code);
    return generateCode("DOC", existingCodes);
  };

  // Generate code when form opens for new doctor
  useEffect(() => {
    if (showAddForm && !editMode) {
      setNewDoctorCode(generateDoctorCode());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddForm, editMode]);

  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.specialization.trim() || !formData.registrationNumber.trim()) {
      toast({
        title: "Missing required fields",
        description: "Name, specialization, and registration number are required.",
        variant: "destructive",
      });
      return;
    }
    const payload = {
      name: formData.name.trim(),
      specialization: formData.specialization.trim(),
      registration_number: formData.registrationNumber.trim(),
      qualification: formData.qualification || null,
      email: formData.email || null,
      phone: formData.phone || null,
      address: formData.address || null,
      city: formData.city || null,
    };
    setSaving(true);
    try {
      if (editMode && selectedDoctor) {
        await apiEndpoints.doctors.update(Number(selectedDoctor.id), payload);
        toast({
          title: "Doctor updated",
          description: "Doctor information has been updated successfully.",
        });
      } else {
        const created = await apiEndpoints.doctors.create({
          ...payload,
          code: newDoctorCode || undefined,
          is_active: true,
        });
        toast({
          title: "Doctor added",
          description: `New doctor created with code ${created.code}.`,
        });
      }
      await loadDoctors();
      resetForm();
    } catch (err) {
      toast({
        title: editMode ? "Failed to update doctor" : "Failed to create doctor",
        description: formatApiError(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setFormData({
      name: doctor.name,
      specialization: doctor.specialization,
      registrationNumber: doctor.registrationNumber,
      qualification: doctor.qualification,
      email: doctor.email,
      phone: doctor.phone,
      address: doctor.address,
      city: doctor.city,
    });
    setEditMode(true);
    setShowAddForm(true);
  };

  const handleDelete = async (doctor: Doctor) => {
    if (!window.confirm(`Delete doctor ${doctor.name}? This cannot be undone.`)) return;
    try {
      await apiEndpoints.doctors.delete(Number(doctor.id));
      toast({
        title: "Doctor deleted",
        description: "The doctor has been removed.",
        variant: "destructive",
      });
      await loadDoctors();
    } catch (err) {
      toast({
        title: "Failed to delete doctor",
        description: formatApiError(err),
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
      specialization: "",
      registrationNumber: "",
      qualification: "",
      email: "",
      phone: "",
      address: "",
      city: "",
    });
    setNewDoctorCode("");
    setEditMode(false);
    setSelectedDoctor(null);
    setShowAddForm(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Define table columns
  const columns: ColumnDef<Doctor>[] = [
    {
      key: "name",
      header: "Doctor Name",
      render: (_, doctor) => (
        <span className="font-medium">{doctor.name}</span>
      ),
    },
    {
      key: "specialization",
      header: "Specialization",
      render: (_, doctor) => (
        <Badge variant="outline">{doctor.specialization}</Badge>
      ),
    },
    {
      key: "qualification",
      header: "Qualification",
      render: (_, doctor) => (
        <div className="flex items-center gap-2 text-sm">
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
          {doctor.qualification}
        </div>
      ),
    },
    {
      key: "registrationNumber",
      header: "Registration",
      render: (_, doctor) => (
        <span className="text-sm text-muted-foreground">{doctor.registrationNumber}</span>
      ),
    },
    {
      key: "email",
      header: "Contact",
      render: (_, doctor) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-3 w-3 text-muted-foreground" />
            {doctor.email}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-3 w-3" />
            {doctor.phone}
          </div>
        </div>
      ),
    },
    {
      key: "city",
      header: "Location",
      render: (_, doctor) => (
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <div>
            <div>{doctor.city}</div>
            <div className="text-muted-foreground text-xs">{doctor.address}</div>
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
          title={editMode ? "Edit Doctor" : "Add New Doctor"}
          subtitle={editMode ? "Update doctor information" : "Create a new doctor profile"}
          icon={User}
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
                <Label htmlFor="code">Doctor Code *</Label>
                <Input
                  id="code"
                  value={editMode && selectedDoctor?.code ? selectedDoctor.code : newDoctorCode}
                  disabled
                  className="bg-muted font-mono font-semibold"
                  placeholder="Auto-generated"
                />
                <p className="text-xs text-muted-foreground">Auto-generated code (cannot be changed)</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Doctor Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Dr. Full Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization *</Label>
                  <Input
                    id="specialization"
                    value={formData.specialization}
                    onChange={(e) => handleChange("specialization", e.target.value)}
                    placeholder="Cardiology, Pediatrics, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Registration Number *</Label>
                  <Input
                    id="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={(e) => handleChange("registrationNumber", e.target.value)}
                    placeholder="BMDC-XXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualification" className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    Qualification
                  </Label>
                  <Input
                    id="qualification"
                    value={formData.qualification}
                    onChange={(e) => handleChange("qualification", e.target.value)}
                    placeholder="MBBS, MD, FCPS, etc."
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
                    placeholder="doctor@example.com"
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
                    placeholder="+880 1712-345678"
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
                  placeholder="123 Medical Tower, Area"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={saving}>
                  {saving ? "Saving..." : editMode ? "Update Doctor" : "Create Doctor"}
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
        title="Doctor Management"
        subtitle="Manage doctor profiles and registrations"
        icon={User}
        variant="slate"
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <MasterDataTable
        title="All Doctors"
        description={`Total doctors: ${doctors.length}`}
        data={doctors}
        columns={columns}
        searchPlaceholder="Search doctors..."
        searchFields={["name", "code", "specialization", "registrationNumber", "email", "city"]}
        itemsPerPage={10}
        onAdd={() => setShowAddForm(true)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage={loading ? "Loading doctors..." : "No doctors found"}
        showCode={true}
        codeKey="code"
      />
    </div>
  );
}

