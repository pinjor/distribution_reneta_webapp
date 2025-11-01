import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserCheck, Plus, Search, Edit, Trash2, Building2, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  balance: string;
  status: "active" | "inactive" | "pending";
}

export default function Customers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([
    { id: "1", name: "Global Retail Inc", company: "Retail", email: "orders@globalretail.com", phone: "+1 555-1001", balance: "$12,500", status: "active" },
    { id: "2", name: "Premium Foods Co", company: "Food & Beverage", email: "supply@premiumfoods.com", phone: "+1 555-1002", balance: "$8,200", status: "active" },
    { id: "3", name: "Tech Solutions Ltd", company: "Technology", email: "logistics@techsol.com", phone: "+1 555-1003", balance: "$0", status: "pending" },
    { id: "4", name: "Manufacturing Plus", company: "Manufacturing", email: "contact@mfgplus.com", phone: "+1 555-1004", balance: "-$1,500", status: "active" },
  ]);

  useEffect(() => {
    document.title = "Customers | App";
  }, []);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    toast({
      title: "Customer added",
      description: "New customer has been created successfully.",
    });
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    toast({
      title: "Customer deleted",
      description: "The customer has been removed.",
      variant: "destructive",
    });
  };

  return (
    <main className="p-6">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <UserCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Customer Management</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage customer accounts, contracts, and relationships</p>
      </header>

      <Card className="card-elevated">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>All Customers</CardTitle>
              <CardDescription>Total accounts: {customers.length}</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Customer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Customer</DialogTitle>
                    <DialogDescription>Create a new customer account</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="cust-name">Customer Name *</Label>
                      <Input id="cust-name" placeholder="ABC Corporation" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cust-company">Industry / Type</Label>
                      <Input id="cust-company" placeholder="Retail, Manufacturing, etc." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cust-email">Email *</Label>
                      <Input id="cust-email" type="email" placeholder="contact@customer.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cust-phone">Phone</Label>
                      <Input id="cust-phone" type="tel" placeholder="+1 555-0000" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleAdd}>Create Customer</Button>
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
                <TableHead>Customer Name</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {customer.company}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      <div>{customer.email}</div>
                      <div className="text-muted-foreground">{customer.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className={customer.balance.includes('-') ? 'text-destructive font-medium' : ''}>
                        {customer.balance}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      customer.status === "active" ? "status-success" :
                      customer.status === "pending" ? "status-warning" :
                      "status-neutral"
                    }>
                      {customer.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(customer.id)}
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
