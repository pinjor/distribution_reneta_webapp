import { Building2, MapPin, Users, User, Truck as TruckIcon, Navigation } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";

const companies = [
  { code: "C001", name: "PharmaCorp India Ltd", address: "Mumbai, Maharashtra" },
  { code: "C002", name: "MediDistribute Pvt Ltd", address: "Chennai, Tamil Nadu" },
];

const depots = [
  { code: "D001", name: "Chennai Main Depot", company: "Renata Pharmaceuticals Limited", capacity: "50000 units" },
  { code: "D002", name: "Chennai South Depot", company: "Renata Pharmaceuticals Limited", capacity: "30000 units" },
];

const employees = [
  { id: "E001", name: "Mohammad Rahman", username: "rkumar", role: "Warehouse Manager", depot: "Chennai Main" },
  { id: "E002", name: "Fatema Khatun", username: "psharma", role: "Dispatcher", depot: "Chennai South" },
];

const customers = [
  { code: "CU001", name: "Rahman Pharmacy", type: "Retail", contact: "+91-9876543210", depot: "Chennai Main" },
  { code: "CU002", name: "City Hospital", type: "Institution", contact: "+91-9876543211", depot: "Chennai South" },
];

const vendors = [
  { code: "V001", name: "LogiTrans Services", contact: "+91-9876543220", contract: "Valid till Dec 2025" },
  { code: "V002", name: "QuickMove Logistics", contact: "+91-9876543221", contract: "Valid till Mar 2026" },
];

export default function Masters() {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Master Data Management</h1>
        <p className="text-muted-foreground">Configure and manage system master data</p>
      </div>

      <Card className="p-6">
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
                {companies.map((company) => (
                  <TableRow key={company.code}>
                    <TableCell className="font-medium">{company.code}</TableCell>
                    <TableCell>{company.name}</TableCell>
                    <TableCell>{company.address}</TableCell>
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
                {depots.map((depot) => (
                  <TableRow key={depot.code}>
                    <TableCell className="font-medium">{depot.code}</TableCell>
                    <TableCell>{depot.name}</TableCell>
                    <TableCell>{depot.company}</TableCell>
                    <TableCell>{depot.capacity}</TableCell>
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
                {employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.id}</TableCell>
                    <TableCell>{emp.name}</TableCell>
                    <TableCell>{emp.username}</TableCell>
                    <TableCell>{emp.role}</TableCell>
                    <TableCell>{emp.depot}</TableCell>
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
                {customers.map((customer) => (
                  <TableRow key={customer.code}>
                    <TableCell className="font-medium">{customer.code}</TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.type}</TableCell>
                    <TableCell>{customer.contact}</TableCell>
                    <TableCell>{customer.depot}</TableCell>
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
                {vendors.map((vendor) => (
                  <TableRow key={vendor.code}>
                    <TableCell className="font-medium">{vendor.code}</TableCell>
                    <TableCell>{vendor.name}</TableCell>
                    <TableCell>{vendor.contact}</TableCell>
                    <TableCell>{vendor.contract}</TableCell>
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
              <Button onClick={() => navigate("/settings/shipping-points")}>Manage Shipping Points</Button>
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
                <TableRow>
                  <TableCell className="font-medium">SP001</TableCell>
                  <TableCell>Chennai Port</TableCell>
                  <TableCell>Chennai Main Depot</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => navigate("/settings/shipping-points")}>Edit</Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
