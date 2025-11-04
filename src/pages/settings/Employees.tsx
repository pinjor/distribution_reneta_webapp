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
import { apiEndpoints } from "@/lib/api";

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

interface RoleMaster {
  id: number;
  code: string;
  name: string;
  role_type: string;
}

export default function Employees() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [newEmployeeCode, setNewEmployeeCode] = useState<string>("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<RoleMaster[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    department: "",
    role_master_id: "",
  });

  useEffect(() => {
    document.title = "Employees | App";
    fetchEmployees();
    fetchRoles();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await apiEndpoints.employees.getAll();
      setEmployees(data.map((emp: any) => ({
        id: emp.id.toString(),
        code: emp.employee_id || `EMP-${emp.id}`,
        name: `${emp.first_name} ${emp.last_name || ""}`.trim(),
        email: emp.email || "",
        phone: emp.phone || "",
        role: emp.designation || "",
        department: emp.department || "",
        status: emp.is_active ? "active" : "inactive",
        role_master_id: emp.role_master_id,
      })));
    } catch (error) {
      console.error("Failed to fetch employees:", error);
      toast({
        title: "Error",
        description: "Failed to load employees. Please try again.",
        variant: "destructive",
      });
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await apiEndpoints.roleMasters.getAll();
      setRoles(data);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
    }
  };

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

  const handleAdd = async () => {
    try {
      const nameParts = formData.name.split(" ");
      const employeeData: any = {
        employee_id: newEmployeeCode || `EMP-${Date.now()}`,
        first_name: nameParts[0] || formData.name,
        last_name: nameParts.slice(1).join(" ") || "",
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        designation: formData.role || undefined,
        department: formData.department || undefined,
        role_master_id: formData.role_master_id ? parseInt(formData.role_master_id) : undefined,
        is_active: true,
      };

      if (editMode && selectedEmployee) {
        await apiEndpoints.employees.update(parseInt(selectedEmployee.id), employeeData);
        toast({
          title: "Employee updated",
          description: "Employee information has been updated successfully.",
        });
      } else {
        await apiEndpoints.employees.create(employeeData);
        toast({
          title: "Employee added",
          description: `New employee created with code ${employeeData.employee_id}.`,
        });
      }

      await fetchEmployees();
      resetForm();
    } catch (error: any) {
      console.error("Failed to save employee:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save employee. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    const employeeData = employee as any;
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      role: employee.role,
      department: employee.department,
      role_master_id: employeeData.role_master_id?.toString() || "none",
    });
    setNewEmployeeCode(employee.code);
    setEditMode(true);
    setShowAddForm(true);
  };

  const handleDelete = async (employee: Employee) => {
    try {
      await apiEndpoints.employees.delete(parseInt(employee.id));
      toast({
        title: "Employee deleted",
        description: "The employee has been removed.",
        variant: "destructive",
      });
      await fetchEmployees();
    } catch (error: any) {
      console.error("Failed to delete employee:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete employee. Please try again.",
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
      email: "",
      phone: "",
      role: "",
      department: "",
      role_master_id: "none",
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
                  <Label htmlFor="emp-role">Designation *</Label>
                  <Select value={formData.role} onValueChange={(val) => handleChange("role", val)}>
                    <SelectTrigger id="emp-role">
                      <SelectValue placeholder="Select designation" />
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

              <div className="space-y-2">
                <Label htmlFor="role_master">Role Master Assignment</Label>
                <Select 
                  value={formData.role_master_id} 
                  onValueChange={(val) => handleChange("role_master_id", val)}
                >
                  <SelectTrigger id="role_master">
                    <SelectValue placeholder="Select role master (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.name} ({role.code}) - {role.role_type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Assign employee to a role in the sales hierarchy (NSH, TSM, RSM, DSM, SM, SO)
                </p>
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
