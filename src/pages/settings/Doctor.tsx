import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, ArrowLeft, Mail, Phone, MapPin, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MasterDataTable, ColumnDef } from "@/components/master-data/MasterDataTable";
import { generateCode } from "@/utils/codeGenerator";
import { getBadgeVariant } from "@/utils/badgeColors";

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
  const [doctors, setDoctors] = useState<Doctor[]>([
    { 
      id: "1", 
      code: "DOC-0001",
      name: "Dr. Mohammad Rahman", 
      specialization: "Cardiology", 
      registrationNumber: "BMDC-12345", 
      qualification: "MBBS, FCPS", 
      email: "dr.rahman@example.com", 
      phone: "+880 1712-345678", 
      address: "123 Medical Tower, Dhanmondi", 
      city: "Dhaka", 
      status: "active" 
    },
    { 
      id: "2", 
      code: "DOC-0002",
      name: "Dr. Fatema Khatun", 
      specialization: "Pediatrics", 
      registrationNumber: "BMDC-12346", 
      qualification: "MBBS, MD", 
      email: "dr.fatema@example.com", 
      phone: "+880 1712-345679", 
      address: "456 Health Center, Gulshan", 
      city: "Dhaka", 
      status: "active" 
    },
    { 
      id: "3", 
      code: "DOC-0003",
      name: "Dr. Abdul Karim", 
      specialization: "Orthopedics", 
      registrationNumber: "BMDC-12347", 
      qualification: "MBBS, MS", 
      email: "dr.karim@example.com", 
      phone: "+880 1712-345680", 
      address: "789 Clinic Road, Banani", 
      city: "Dhaka", 
      status: "inactive" 
    },
  ]);

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

  useEffect(() => {
    document.title = "Doctor | Renata";
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

  const handleAdd = () => {
    if (editMode && selectedDoctor) {
      setDoctors(prev => prev.map(d => 
        d.id === selectedDoctor.id 
          ? { ...d, ...formData }
          : d
      ));
      toast({
        title: "Doctor updated",
        description: "Doctor information has been updated successfully.",
      });
    } else {
      const newCode = generateDoctorCode();
      const newDoctor: Doctor = {
        id: Date.now().toString(),
        code: newCode,
        ...formData,
        status: "active",
      };
      setDoctors(prev => [...prev, newDoctor]);
      toast({
        title: "Doctor added",
        description: `New doctor created with code ${newCode}.`,
      });
    }
    resetForm();
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

  const handleDelete = (doctor: Doctor) => {
    setDoctors(prev => prev.filter(d => d.id !== doctor.id));
    toast({
      title: "Doctor deleted",
      description: "The doctor has been removed.",
      variant: "destructive",
    });
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
            <User className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">
              {editMode ? "Edit Doctor" : "Add New Doctor"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {editMode ? "Update doctor information" : "Create a new doctor profile"}
          </p>
        </header>

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
                <Button onClick={handleAdd}>
                  {editMode ? "Update Doctor" : "Create Doctor"}
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
          <User className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Doctor Management</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage doctor profiles and registrations</p>
      </header>

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
        emptyMessage="No doctors found"
        showCode={true}
        codeKey="code"
      />
    </main>
  );
}

