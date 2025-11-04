import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserSquare2, ArrowLeft, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MasterDataTable, ColumnDef } from "@/components/master-data/MasterDataTable";
import { generateCode } from "@/utils/codeGenerator";
import { getBadgeVariant } from "@/utils/badgeColors";

interface Employee {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: "active" | "inactive";
}

export default function Employees() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [newEmployeeCode, setNewEmployeeCode] = useState<string>("");
  const [employees, setEmployees] = useState<Employee[]>([
    { id: "1", code: "EMP-0001", name: "John Smith", email: "john.smith@acme.com", phone: "+1 555-0101", role: "Manager", department: "Warehouse", status: "active" },
    { id: "2", code: "EMP-0002", name: "Sarah Johnson", email: "sarah.j@acme.com", phone: "+1 555-0102", role: "Supervisor", department: "Distribution", status: "active" },
    { id: "3", code: "EMP-0003", name: "Mike Davis", email: "mike.d@acme.com", phone: "+1 555-0103", role: "Operator", department: "Warehouse", status: "active" },
    { id: "4", code: "EMP-0004", name: "Emily Brown", email: "emily.b@acme.com", phone: "+1 555-0104", role: "Driver", department: "Distribution", status: "inactive" },
  ]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    department: "",
  });

  useEffect(() => {
    document.title = "Employees | App";
  }, []);

  const generateEmployeeCode = (): string => {
    const existingCodes = employees.map(e => e.code);
    return generateCode("EMP", existingCodes);
  };

  // Generate code when form opens for new employee
  useEffect(() => {
    if (showAddForm && !editMode) {
      setNewEmployeeCode(generateEmployeeCode());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddForm, editMode]);

  const handleAdd = () => {
    if (editMode && selectedEmployee) {
      setEmployees(prev => prev.map(e => 
        e.id === selectedEmployee.id 
          ? { 
              ...e, 
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
              role: formData.role,
              department: formData.department,
            }
          : e
      ));
      toast({
        title: "Employee updated",
        description: "Employee information has been updated successfully.",
      });
    } else {
      const newCode = generateEmployeeCode();
      const newEmployee: Employee = {
        id: Date.now().toString(),
        code: newCode,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        department: formData.department,
        status: "active",
      };
      setEmployees(prev => [...prev, newEmployee]);
      toast({
        title: "Employee added",
        description: `New employee created with code ${newCode}.`,
      });
    }
    resetForm();
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      role: employee.role,
      department: employee.department,
    });
    setEditMode(true);
    setShowAddForm(true);
  };

  const handleDelete = (employee: Employee) => {
    setEmployees(prev => prev.filter(e => e.id !== employee.id));
    toast({
      title: "Employee removed",
      description: "The employee has been deleted.",
      variant: "destructive",
    });
  };

  const handleCancel = () => {
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "",
      department: "",
    });
    setNewEmployeeCode("");
    setEditMode(false);
    setSelectedEmployee(null);
    setShowAddForm(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Define table columns
  const columns: ColumnDef<Employee>[] = [
    {
      key: "name",
      header: "Name",
      render: (_, employee) => (
        <span className="font-medium">{employee.name}</span>
      ),
    },
    {
      key: "email",
      header: "Contact",
      render: (_, employee) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-3 w-3 text-muted-foreground" />
            {employee.email}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-3 w-3" />
            {employee.phone}
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
    },
    {
      key: "department",
      header: "Department",
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
            <UserSquare2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">
              {editMode ? "Edit Employee" : "Add New Employee"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {editMode ? "Update employee information" : "Register a new staff member"}
          </p>
        </header>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="space-y-6 max-w-4xl">
              {/* Code Field - Auto-generated */}
              <div className="space-y-2">
                <Label htmlFor="code">Employee Code *</Label>
                <Input
                  id="code"
                  value={editMode && selectedEmployee?.code ? selectedEmployee.code : newEmployeeCode}
                  disabled
                  className="bg-muted font-mono font-semibold"
                  placeholder="Auto-generated"
                />
                <p className="text-xs text-muted-foreground">Auto-generated code (cannot be changed)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emp-name">Full Name *</Label>
                <Input
                  id="emp-name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="John Smith"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email *
                </Label>
                <Input
                  id="emp-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="john@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Phone
                </Label>
                <Input
                  id="emp-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+1 555-0000"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emp-role">Role *</Label>
                  <Select value={formData.role} onValueChange={(val) => handleChange("role", val)}>
                    <SelectTrigger id="emp-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Supervisor">Supervisor</SelectItem>
                      <SelectItem value="Operator">Operator</SelectItem>
                      <SelectItem value="Driver">Driver</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emp-dept">Department *</Label>
                  <Select value={formData.department} onValueChange={(val) => handleChange("department", val)}>
                    <SelectTrigger id="emp-dept">
                      <SelectValue placeholder="Select dept" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Warehouse">Warehouse</SelectItem>
                      <SelectItem value="Distribution">Distribution</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleAdd}>
                  {editMode ? "Update Employee" : "Create Employee"}
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
          <UserSquare2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Employee Management</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage staff, roles, and access permissions</p>
      </header>

      <MasterDataTable
        title="All Employees"
        description={`Total staff: ${employees.length}`}
        data={employees}
        columns={columns}
        searchPlaceholder="Search employees..."
        searchFields={["name", "code", "email", "role", "department"]}
        itemsPerPage={10}
        onAdd={() => setShowAddForm(true)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage="No employees found"
        showCode={true}
        codeKey="code"
      />
    </main>
  );
}
