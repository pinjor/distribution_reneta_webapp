import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MasterDataTable, ColumnDef } from "@/components/master-data/MasterDataTable";
import { apiEndpoints } from "@/lib/api";
import { generateCode } from "@/utils/codeGenerator";
import { getBadgeVariant } from "@/utils/badgeColors";

type RoleType = "NSH" | "TSM" | "RSM" | "DSM" | "SM" | "SO";

interface RoleMaster {
  id: number;
  code: string;
  role_type: RoleType;
  name: string;
  parent_id?: number;
  parent_name?: string;
  employee_id?: number;
  employee_name?: string;
  territory?: string;
  region?: string;
  district?: string;
  area?: string;
  description?: string;
  is_active: boolean;
}

interface Employee {
  id: number;
  employee_id: string;
  first_name: string;
  last_name?: string;
}

const ROLE_TYPES: RoleType[] = ["NSH", "TSM", "RSM", "DSM", "SM", "SO"];
const ROLE_LABELS: Record<RoleType, string> = {
  NSH: "National Sales Head",
  TSM: "Territory Sales Manager",
  RSM: "Regional Sales Manager",
  DSM: "District Sales Manager",
  SM: "Sales Manager",
  SO: "Sales Officer",
};

const PARENT_ROLE_TYPES: Record<RoleType, RoleType[] | null> = {
  NSH: null, // NSH has no parent
  TSM: ["NSH"],
  RSM: ["TSM"],
  DSM: ["RSM"],
  SM: ["DSM"],
  SO: ["SM"],
};

export default function RoleMaster() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleMaster | null>(null);
  const [roles, setRoles] = useState<RoleMaster[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [parentRoles, setParentRoles] = useState<RoleMaster[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    role_type: "" as RoleType | "",
    name: "",
    parent_id: "none",
    employee_id: "none",
    territory: "",
    region: "",
    district: "",
    area: "",
    description: "",
  });

  const [newRoleCode, setNewRoleCode] = useState<string>("");

  useEffect(() => {
    fetchRoles();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (formData.role_type) {
      fetchParentRoles();
    } else {
      setParentRoles([]);
    }
  }, [formData.role_type]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const data = await apiEndpoints.roleMasters.getAll();
      setRoles(data);
    } catch (error) {
      console.error("Failed to fetch Role Masters:", error);
      toast({
        title: "Error",
        description: "Failed to load Role Masters. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await apiEndpoints.employees.getAll();
      setEmployees(data);
    } catch (error) {
      console.error("Failed to fetch Employees:", error);
    }
  };

  const fetchParentRoles = async () => {
    if (!formData.role_type) return;
    
    const validParentTypes = PARENT_ROLE_TYPES[formData.role_type];
    if (!validParentTypes) return; // NSH has no parent

    try {
      const allRoles = await apiEndpoints.roleMasters.getAll();
      const filtered = allRoles.filter(
        (role: RoleMaster) => validParentTypes.includes(role.role_type)
      );
      setParentRoles(filtered);
    } catch (error) {
      console.error("Failed to fetch Parent Roles:", error);
    }
  };

  useEffect(() => {
    document.title = "Role Master | App";
  }, []);

  const generateRoleCode = (): string => {
    const existingCodes = roles.map(r => r.code);
    return generateCode("RM", existingCodes);
  };

  useEffect(() => {
    if (showAddForm && !editMode) {
      setNewRoleCode(generateRoleCode());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddForm, editMode]);

  const handleAdd = async () => {
    try {
      if (!formData.role_type) {
        toast({
          title: "Validation Error",
          description: "Please select a role type.",
          variant: "destructive",
        });
        return;
      }

      if (formData.role_type !== "NSH" && (!formData.parent_id || formData.parent_id === "none")) {
        toast({
          title: "Validation Error",
          description: "Please select a parent role.",
          variant: "destructive",
        });
        return;
      }

      const roleData: any = {
        code: newRoleCode,
        role_type: formData.role_type,
        name: formData.name,
        parent_id: formData.parent_id && formData.parent_id !== "none" ? parseInt(formData.parent_id) : null,
        employee_id: formData.employee_id && formData.employee_id !== "none" ? parseInt(formData.employee_id) : null,
        territory: formData.territory || null,
        region: formData.region || null,
        district: formData.district || null,
        area: formData.area || null,
        description: formData.description || null,
        is_active: true,
      };

      if (editMode && selectedRole) {
        await apiEndpoints.roleMasters.update(selectedRole.id, roleData);
        toast({
          title: "Role Master updated",
          description: "Role Master information has been updated successfully.",
        });
      } else {
        await apiEndpoints.roleMasters.create(roleData);
        toast({
          title: "Role Master added",
          description: `New Role Master created with code ${newRoleCode}.`,
        });
      }

      await fetchRoles();
      resetForm();
    } catch (error: any) {
      console.error("Failed to save Role Master:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save Role Master. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (role: RoleMaster) => {
    setSelectedRole(role);
    setFormData({
      role_type: role.role_type,
      name: role.name,
      parent_id: role.parent_id?.toString() || "none",
      employee_id: role.employee_id?.toString() || "none",
      territory: role.territory || "",
      region: role.region || "",
      district: role.district || "",
      area: role.area || "",
      description: role.description || "",
    });
    setNewRoleCode(role.code);
    setEditMode(true);
    setShowAddForm(true);
  };

  const handleDelete = async (role: RoleMaster) => {
    try {
      await apiEndpoints.roleMasters.delete(role.id);
      toast({
        title: "Role Master deleted",
        description: "The Role Master has been removed.",
        variant: "destructive",
      });
      await fetchRoles();
    } catch (error: any) {
      console.error("Failed to delete Role Master:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete Role Master. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      role_type: "" as RoleType | "",
      name: "",
      parent_id: "none",
      employee_id: "none",
      territory: "",
      region: "",
      district: "",
      area: "",
      description: "",
    });
    setNewRoleCode("");
    setEditMode(false);
    setSelectedRole(null);
    setShowAddForm(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => {
      if (field === "role_type") {
        // Reset parent_id when role type changes
        return { ...prev, [field]: value, parent_id: "none" };
      }
      return { ...prev, [field]: value };
    });
  };

  const columns: ColumnDef<RoleMaster>[] = [
    {
      key: "code",
      header: "Code",
      render: (value) => (
        <span className="font-mono font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
          {String(value)}
        </span>
      ),
    },
    {
      key: "role_type",
      header: "Role Type",
      render: (value) => (
        <Badge variant={getBadgeVariant(value as string)}>
          {ROLE_LABELS[value as RoleType] || value}
        </Badge>
      ),
    },
    {
      key: "name",
      header: "Name",
      render: (_, role) => (
        <span className="font-medium">{role.name}</span>
      ),
    },
    {
      key: "parent_name",
      header: "Parent",
      render: (value) => (
        <span className="text-muted-foreground">{value || "-"}</span>
      ),
    },
    {
      key: "employee_name",
      header: "Employee",
      render: (value) => (
        <span className="text-muted-foreground">{value || "-"}</span>
      ),
    },
    {
      key: "territory",
      header: "Territory",
      render: (value) => (
        <span className="text-muted-foreground">{value || "-"}</span>
      ),
    },
    {
      key: "region",
      header: "Region",
      render: (value) => (
        <span className="text-muted-foreground">{value || "-"}</span>
      ),
    },
    {
      key: "district",
      header: "District",
      render: (value) => (
        <span className="text-muted-foreground">{value || "-"}</span>
      ),
    },
  ];

  if (showAddForm) {
    const showTerritory = formData.role_type === "TSM";
    const showRegion = formData.role_type === "RSM";
    const showDistrict = formData.role_type === "DSM";
    const showArea = formData.role_type === "SM";
    const showParent = formData.role_type !== "NSH" && formData.role_type !== "";

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
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">
              {editMode ? "Edit Role Master" : "Add New Role Master"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {editMode ? "Update Role Master information" : "Create a new Role Master with hierarchical structure"}
          </p>
        </header>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="space-y-6 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="code" className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Code *
                </Label>
                <Input
                  id="code"
                  value={newRoleCode}
                  disabled
                  className="bg-muted font-mono font-semibold"
                  placeholder="Auto-generated"
                />
                <p className="text-xs text-muted-foreground">Auto-generated code (cannot be changed)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role_type">Role Type *</Label>
                <Select
                  value={formData.role_type && formData.role_type !== "" ? formData.role_type : undefined}
                  onValueChange={(val) => handleChange("role_type", val)}
                >
                  <SelectTrigger id="role_type">
                    <SelectValue placeholder="Select role type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {ROLE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Enter role name (e.g., North Zone Sales Head)"
                  required
                />
              </div>

              {showParent && (
                <div className="space-y-2">
                  <Label htmlFor="parent_id">Parent Role *</Label>
                  <Select
                    value={formData.parent_id && formData.parent_id !== "" ? formData.parent_id : "none"}
                    onValueChange={(val) => handleChange("parent_id", val)}
                  >
                    <SelectTrigger id="parent_id">
                      <SelectValue placeholder="Select parent role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {parentRoles
                        .filter((role) => role.id != null && role.id !== undefined)
                        .map((role) => {
                          const roleId = String(role.id);
                          if (!roleId || roleId === "") return null;
                          return (
                            <SelectItem key={role.id} value={roleId}>
                              {role.name} ({role.code})
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                  {parentRoles.length === 0 && formData.role_type && (
                    <p className="text-xs text-muted-foreground">
                      No {PARENT_ROLE_TYPES[formData.role_type]?.[0]} roles available. Create parent roles first.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="employee_id">Assigned Employee</Label>
                  <Select
                    value={formData.employee_id && formData.employee_id !== "" ? formData.employee_id : "none"}
                    onValueChange={(val) => handleChange("employee_id", val)}
                  >
                    <SelectTrigger id="employee_id">
                      <SelectValue placeholder="Select employee (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {employees
                        .filter((emp) => emp.id != null && emp.id !== undefined)
                        .map((emp) => {
                          const empId = String(emp.id);
                          if (!empId || empId === "") return null;
                          return (
                            <SelectItem key={emp.id} value={empId}>
                              {emp.first_name} {emp.last_name || ""} ({emp.employee_id})
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
              </div>

              {showTerritory && (
                <div className="space-y-2">
                  <Label htmlFor="territory">Territory</Label>
                  <Input
                    id="territory"
                    value={formData.territory}
                    onChange={(e) => handleChange("territory", e.target.value)}
                    placeholder="Enter territory name"
                  />
                </div>
              )}

              {showRegion && (
                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <Input
                    id="region"
                    value={formData.region}
                    onChange={(e) => handleChange("region", e.target.value)}
                    placeholder="Enter region name"
                  />
                </div>
              )}

              {showDistrict && (
                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  <Input
                    id="district"
                    value={formData.district}
                    onChange={(e) => handleChange("district", e.target.value)}
                    placeholder="Enter district name"
                  />
                </div>
              )}

              {showArea && (
                <div className="space-y-2">
                  <Label htmlFor="area">Area</Label>
                  <Input
                    id="area"
                    value={formData.area}
                    onChange={(e) => handleChange("area", e.target.value)}
                    placeholder="Enter area name"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Enter description (optional)"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleAdd}>
                  {editMode ? "Update Role Master" : "Create Role Master"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="p-6">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Role Master Management</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage hierarchical role structure (NSH → TSM → RSM → DSM → SM → SO)</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading Role Masters...</p>
        </div>
      ) : (
        <MasterDataTable
          title="Role Master Catalog"
          description={`Total Roles: ${roles.length}`}
          data={roles}
          columns={columns}
          searchPlaceholder="Search Role Masters..."
          searchFields={["name", "code", "role_type"]}
          itemsPerPage={10}
          onAdd={() => setShowAddForm(true)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyMessage="No Role Masters found"
          showCode={false}
        />
      )}
    </main>
  );
}

