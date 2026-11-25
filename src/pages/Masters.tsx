import { useEffect, useState } from "react";
import { Building2, MapPin, Users, User, Truck as TruckIcon, Navigation } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { apiEndpoints } from "@/lib/api";

export default function Masters() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [depots, setDepots] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [shippingPoints, setShippingPoints] = useState<any[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMasters = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [companyRows, depotRows, employeeRows, customerRows, vendorRows, shippingRows] = await Promise.all([
        apiEndpoints.companies.getAll(),
        apiEndpoints.depots.getAll(),
        apiEndpoints.employees.getAll(),
        apiEndpoints.customers.getAll(),
        apiEndpoints.vendors.getAll(),
        apiEndpoints.shippingPoints.getAll(),
      ]);
      setCompanies(Array.isArray(companyRows) ? companyRows : []);
      setDepots(Array.isArray(depotRows) ? depotRows : []);
      setEmployees(Array.isArray(employeeRows) ? employeeRows : []);
      setCustomers(Array.isArray(customerRows) ? customerRows : []);
      setVendors(Array.isArray(vendorRows) ? vendorRows : []);
      setShippingPoints(Array.isArray(shippingRows) ? shippingRows : []);
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load master data");
      setCompanies([]);
      setDepots([]);
      setEmployees([]);
      setCustomers([]);
      setVendors([]);
      setShippingPoints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasters();
  }, []);

  const depotName = (depotId: number | undefined) => {
    const depot = depots.find((row) => row.id === depotId);
    return depot?.name || depot?.code || "—";
  };

  const emptyRow = (colSpan: number, label: string) => (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-muted-foreground">
        {loading ? "Loading..." : loadError ? loadError : `No ${label} found`}
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Data Management"
        subtitle="Configure and manage system master data"
        icon={Building2}
        variant="slate"
      />

      <Card className="p-6">
        {loadError && (
          <div className="mb-4 flex items-center justify-between gap-4 text-sm text-destructive">
            <span>{loadError}</span>
            <Button variant="outline" size="sm" onClick={loadMasters}>Retry</Button>
          </div>
        )}
        <Tabs defaultValue="company">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="depot">Depot</TabsTrigger>
            <TabsTrigger value="employee">Employee</TabsTrigger>
            <TabsTrigger value="customer">Customer</TabsTrigger>
            <TabsTrigger value="vendor">Vendor</TabsTrigger>
            <TabsTrigger value="shipping">Shipping</TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Company Master</h2>
              </div>
              <Button onClick={() => navigate("/settings/company")}>Manage Companies</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.length === 0
                  ? emptyRow(4, "companies")
                  : companies.map((company) => (
                      <TableRow key={company.id || company.code}>
                        <TableCell className="font-medium">{company.code}</TableCell>
                        <TableCell>{company.name}</TableCell>
                        <TableCell>{company.address || "—"}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => navigate("/settings/company")}>Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="depot" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Depot/Plant Master</h2>
              </div>
              <Button onClick={() => navigate("/settings/depot")}>Manage Depots</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {depots.length === 0
                  ? emptyRow(5, "depots")
                  : depots.map((depot) => (
                      <TableRow key={depot.id || depot.code}>
                        <TableCell className="font-medium">{depot.code}</TableCell>
                        <TableCell>{depot.name}</TableCell>
                        <TableCell>{depot.company?.name || "—"}</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => navigate("/settings/depot")}>Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="employee" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Employee & Role Assignment</h2>
              </div>
              <Button onClick={() => navigate("/settings/employees")}>Manage Employees</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Depot Access</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0
                  ? emptyRow(6, "employees")
                  : employees.map((emp) => (
                      <TableRow key={emp.id || emp.employee_id}>
                        <TableCell className="font-medium">{emp.employee_id}</TableCell>
                        <TableCell>{[emp.first_name, emp.last_name].filter(Boolean).join(" ")}</TableCell>
                        <TableCell>{emp.email || "—"}</TableCell>
                        <TableCell>{emp.role || emp.designation || "—"}</TableCell>
                        <TableCell>{depotName(emp.depot_id)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => navigate("/settings/employees")}>Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="customer" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Customer Setup</h2>
              </div>
              <Button onClick={() => navigate("/settings/customers")}>Manage Customers</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Assigned Depot</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length === 0
                  ? emptyRow(6, "customers")
                  : customers.map((customer) => (
                      <TableRow key={customer.id || customer.code}>
                        <TableCell className="font-medium">{customer.code}</TableCell>
                        <TableCell>{customer.name}</TableCell>
                        <TableCell>{customer.type || "—"}</TableCell>
                        <TableCell>{customer.phone || customer.email || "—"}</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => navigate("/settings/customers")}>Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="vendor" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <TruckIcon className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Transport Vendor Master</h2>
              </div>
              <Button onClick={() => navigate("/settings/vendors")}>Manage Vendors</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Contract Info</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.length === 0
                  ? emptyRow(5, "vendors")
                  : vendors.map((vendor) => (
                      <TableRow key={vendor.id || vendor.code}>
                        <TableCell className="font-medium">{vendor.code}</TableCell>
                        <TableCell>{vendor.name}</TableCell>
                        <TableCell>{vendor.phone || vendor.email || "—"}</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => navigate("/settings/vendors")}>Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="shipping" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Shipping Point Master</h2>
              </div>
              <Button onClick={() => navigate("/settings/route-shipping-points")}>Manage Shipping Points</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Linked Depot</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shippingPoints.length === 0
                  ? emptyRow(4, "shipping points")
                  : shippingPoints.map((point) => (
                      <TableRow key={point.id || point.code}>
                        <TableCell className="font-medium">{point.code}</TableCell>
                        <TableCell>{point.name}</TableCell>
                        <TableCell>{depotName(point.depot_id)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => navigate("/settings/route-shipping-points")}>Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
