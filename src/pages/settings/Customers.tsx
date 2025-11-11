import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UserCheck, ArrowLeft, Building2, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MasterDataTable, ColumnDef } from "@/components/master-data/MasterDataTable";
import { generateCode } from "@/utils/codeGenerator";
import { getBadgeVariant } from "@/utils/badgeColors";

interface Customer {
  id: string;
  code: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  shipToParty?: string;
  soldToParty?: string;
  priority?: string;
  deliveryStatus?: string;
  creditStatus?: string;
  paymentDays?: number;
  customerType?: {
    chemistShop?: boolean;
    institution?: boolean;
    corporate?: boolean;
    hospital?: boolean;
    others?: boolean;
  };
}

export default function Customers() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomerCode, setNewCustomerCode] = useState<string>("");
  const [priority, setPriority] = useState<string>("Medium");
  const [deliveryBlock, setDeliveryBlock] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(true);
  const [creditCash, setCreditCash] = useState(false);
  const [creditCredit, setCreditCredit] = useState(true);
  const [paymentDays, setPaymentDays] = useState<string>("");
  const [soldToEditedManually, setSoldToEditedManually] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    shipToParty: "",
    soldToParty: "",
  });
  
  const [customerType, setCustomerType] = useState({
    chemistShop: false,
    institution: false,
    corporate: false,
    hospital: false,
    others: false,
  });
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const base: Customer[] = [
      { id: "1", code: "CUST-0001", name: "Global Retail Inc", company: "Retail", email: "orders@globalretail.com", phone: "+1 555-1001", address: "123 Main Street", city: "New York", priority: "High", deliveryStatus: "Open", creditStatus: "Credit" },
      { id: "2", code: "CUST-0002", name: "Premium Foods Co", company: "Food & Beverage", email: "supply@premiumfoods.com", phone: "+1 555-1002", address: "456 Commerce Ave", city: "Los Angeles", priority: "Medium", deliveryStatus: "Open", creditStatus: "Cash" },
      { id: "3", code: "CUST-0003", name: "Tech Solutions Ltd", company: "Technology", email: "logistics@techsol.com", phone: "+1 555-1003", address: "789 Tech Park", city: "San Francisco", priority: "High", deliveryStatus: "Block", creditStatus: "Credit" },
      { id: "4", code: "CUST-0004", name: "Manufacturing Plus", company: "Manufacturing", email: "contact@mfgplus.com", phone: "+1 555-1004", address: "321 Industrial Blvd", city: "Chicago", priority: "Low", deliveryStatus: "Open", creditStatus: "Credit" },
      { id: "5", code: "CUST-0005", name: "Retail World Corp", company: "Retail", email: "info@retailworld.com", phone: "+1 555-1005", address: "654 Shopping Center", city: "Miami", priority: "Medium", deliveryStatus: "Open", creditStatus: "Cash" },
      { id: "6", code: "CUST-0006", name: "Supply Chain Pro", company: "Logistics", email: "contact@supplypro.com", phone: "+1 555-1006", address: "987 Warehouse Rd", city: "Dallas", priority: "High", deliveryStatus: "Open", creditStatus: "Credit" },
      { id: "7", code: "CUST-0007", name: "Consumer Goods Inc", company: "Consumer", email: "sales@consumergoods.com", phone: "+1 555-1007", address: "147 Market St", city: "Boston", priority: "Medium", deliveryStatus: "Block", creditStatus: "Credit" },
      { id: "8", code: "CUST-0008", name: "Distribution Hub", company: "Distribution", email: "info@disthub.com", phone: "+1 555-1008", address: "258 Distribution Way", city: "Seattle", priority: "Low", deliveryStatus: "Open", creditStatus: "Cash" },
      { id: "9", code: "CUST-0009", name: "Trade Partners Ltd", company: "Trading", email: "contact@tradepartners.com", phone: "+1 555-1009", address: "369 Trade Center", city: "Houston", priority: "High", deliveryStatus: "Open", creditStatus: "Credit" },
      { id: "10", code: "CUST-0010", name: "Merchant Solutions", company: "Merchant", email: "info@merchantsol.com", phone: "+1 555-1010", address: "741 Business Park", city: "Atlanta", priority: "Medium", deliveryStatus: "Open", creditStatus: "Credit" },
      { id: "11", code: "CUST-0011", name: "Wholesale Express", company: "Wholesale", email: "sales@wholesaleexp.com", phone: "+1 555-1011", address: "852 Wholesale Ave", city: "Phoenix", priority: "High", deliveryStatus: "Block", creditStatus: "Cash" },
      { id: "12", code: "CUST-0012", name: "Bulk Distributors", company: "Bulk", email: "contact@bulkdist.com", phone: "+1 555-1012", address: "963 Bulk Center", city: "Detroit", priority: "Low", deliveryStatus: "Open", creditStatus: "Credit" },
    ];
    return base.map((customer) => ({
      ...customer,
      shipToParty: customer.address,
      soldToParty: customer.address,
    }));
  });

  useEffect(() => {
    document.title = "Customers | App";
  }, []);

  const generateCustomerCode = (): string => {
    const existingCodes = customers.map(c => c.code);
    return generateCode("CUST", existingCodes);
  };

  const handleAdd = () => {
    const deliveryStatus = deliveryOpen ? "Open" : "Block";
    const creditStatus = creditCredit ? "Credit" : "Cash";
    
    if (editMode && selectedCustomer) {
      setCustomers(prev => prev.map(c => 
        c.id === selectedCustomer.id 
          ? { 
              ...c, 
              name: formData.name,
              company: formData.company,
              email: formData.email,
              phone: formData.phone,
              address: formData.address,
              city: formData.city,
              shipToParty: formData.shipToParty,
              soldToParty: formData.soldToParty || formData.address,
              priority: priority,
              deliveryStatus: deliveryStatus,
              creditStatus: creditStatus,
              paymentDays: paymentDays ? parseInt(paymentDays) : undefined,
              customerType: customerType,
            }
          : c
      ));
      toast({
        title: "Customer updated",
        description: "Customer information has been updated successfully.",
      });
    } else {
      const newCode = generateCustomerCode();
      const newCustomer: Customer = {
        id: Date.now().toString(),
        code: newCode,
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        shipToParty: formData.shipToParty,
        soldToParty: formData.soldToParty || formData.address,
        priority: priority,
        deliveryStatus: deliveryStatus,
        creditStatus: creditStatus,
        paymentDays: paymentDays ? parseInt(paymentDays) : undefined,
        customerType: customerType,
      };
      setCustomers(prev => [...prev, newCustomer]);
      toast({
        title: "Customer added",
        description: `New customer created with code ${newCode}.`,
      });
    }
    resetForm();
  };

  const handleAddressChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      address: value,
      soldToParty: soldToEditedManually ? prev.soldToParty : value,
    }));
  };

  const handleSoldToChange = (value: string) => {
    setSoldToEditedManually(true);
    setFormData(prev => ({
      ...prev,
      soldToParty: value,
    }));
  };

  // Generate code when form opens for new customer
  useEffect(() => {
    if (showAddForm && !editMode) {
      setNewCustomerCode(generateCustomerCode());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddForm, editMode]);

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      company: customer.company,
      email: customer.email,
      phone: customer.phone,
      address: customer.address || "",
      city: customer.city || "",
      shipToParty: customer.shipToParty || "",
      soldToParty: customer.soldToParty || customer.address || "",
    });
    setPriority(customer.priority || "Medium");
    setDeliveryBlock(customer.deliveryStatus === "Block");
    setDeliveryOpen(customer.deliveryStatus === "Open");
    setCreditCash(customer.creditStatus === "Cash");
    setCreditCredit(customer.creditStatus === "Credit");
    setPaymentDays(customer.paymentDays?.toString() || "");
    setSoldToEditedManually(
      !!customer.soldToParty && customer.soldToParty !== customer.address
    );
    setCustomerType(customer.customerType || {
      chemistShop: false,
      institution: false,
      corporate: false,
      hospital: false,
      others: false,
    });
    setEditMode(true);
    setShowAddForm(true);
  };

  const handleCancel = () => {
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      company: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      shipToParty: "",
      soldToParty: "",
    });
    setPriority("Medium");
    setDeliveryBlock(false);
    setDeliveryOpen(true);
    setCreditCash(false);
    setCreditCredit(true);
    setPaymentDays("");
    setCustomerType({
      chemistShop: false,
      institution: false,
      corporate: false,
      hospital: false,
      others: false,
    });
    setEditMode(false);
    setSelectedCustomer(null);
    setNewCustomerCode("");
    setShowAddForm(false);
    setSoldToEditedManually(false);
  };

  const handleDelete = (customer: Customer) => {
    setCustomers(prev => prev.filter(c => c.id !== customer.id));
    toast({
      title: "Customer deleted",
      description: "The customer has been removed.",
      variant: "destructive",
    });
  };

  // Define table columns
  const columns: ColumnDef<Customer>[] = [
    {
      key: "name",
      header: "Customer Name",
      render: (_, customer) => (
        <span className="font-medium">{customer.name}</span>
      ),
    },
    {
      key: "company",
      header: "Industry / Type",
      render: (_, customer) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          {customer.company}
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (_, customer) => (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{customer.phone}</span>
        </div>
      ),
    },
    {
      key: "shipToParty",
      header: "Ship To",
      render: (_, customer) => (
        <span className="text-xs text-muted-foreground">{customer.shipToParty || "—"}</span>
      ),
    },
    {
      key: "soldToParty",
      header: "Sold To",
      render: (_, customer) => (
        <span className="text-xs text-muted-foreground">{customer.soldToParty || customer.address || "—"}</span>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      render: (value) => (
        <Badge variant={getBadgeVariant(value)}>
          {value || "Medium"}
        </Badge>
      ),
    },
    {
      key: "deliveryStatus",
      header: "Delivery Status",
      render: (value) => (
        <Badge variant={getBadgeVariant(value)}>
          {value || "Open"}
        </Badge>
      ),
    },
    {
      key: "creditStatus",
      header: "Credit Status",
      render: (value) => (
        <Badge variant={getBadgeVariant(value)}>
          {value || "Credit"}
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
            <UserCheck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">
              {editMode ? "Edit Customer" : "Add New Customer"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {editMode ? "Update customer information" : "Create a new customer account"}
          </p>
        </header>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="space-y-6 max-w-4xl">
              {(editMode && selectedCustomer?.code) || (!editMode && newCustomerCode) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Customer Code</Label>
                    <Input 
                      value={editMode ? selectedCustomer.code : newCustomerCode}
                      disabled
                      className="bg-muted font-mono font-semibold"
                    />
                    <p className="text-xs text-muted-foreground">Auto-generated code (cannot be changed)</p>
                  </div>
                </div>
              ) : null}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cust-name">Customer Name *</Label>
                  <Input 
                    id="cust-name" 
                    placeholder="ABC Corporation" 
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cust-company">Industry / Type</Label>
                  <Input 
                    id="cust-company" 
                    placeholder="Retail, Manufacturing, etc." 
                    value={formData.company}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  />
                </div>
              </div>

              {/* Customer Type */}
              <div className="space-y-3">
                <Label>Customer Type</Label>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="customer-type-chemist"
                      checked={customerType.chemistShop}
                      onCheckedChange={(checked) => 
                        setCustomerType(prev => ({
                          ...prev,
                          chemistShop: checked === true
                        }))
                      }
                    />
                    <Label htmlFor="customer-type-chemist" className="font-normal cursor-pointer">
                      Chemist shop
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="customer-type-institution"
                      checked={customerType.institution}
                      onCheckedChange={(checked) => 
                        setCustomerType(prev => ({
                          ...prev,
                          institution: checked === true
                        }))
                      }
                    />
                    <Label htmlFor="customer-type-institution" className="font-normal cursor-pointer">
                      Institution
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="customer-type-corporate"
                      checked={customerType.corporate}
                      onCheckedChange={(checked) => 
                        setCustomerType(prev => ({
                          ...prev,
                          corporate: checked === true
                        }))
                      }
                    />
                    <Label htmlFor="customer-type-corporate" className="font-normal cursor-pointer">
                      Corporate
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="customer-type-hospital"
                      checked={customerType.hospital}
                      onCheckedChange={(checked) => 
                        setCustomerType(prev => ({
                          ...prev,
                          hospital: checked === true
                        }))
                      }
                    />
                    <Label htmlFor="customer-type-hospital" className="font-normal cursor-pointer">
                      Hospital
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="customer-type-others"
                      checked={customerType.others}
                      onCheckedChange={(checked) => 
                        setCustomerType(prev => ({
                          ...prev,
                          others: checked === true
                        }))
                      }
                    />
                    <Label htmlFor="customer-type-others" className="font-normal cursor-pointer">
                      Others
                    </Label>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cust-email">Email *</Label>
                  <Input 
                    id="cust-email" 
                    type="email" 
                    placeholder="contact@customer.com" 
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cust-phone">Phone</Label>
                  <Input 
                    id="cust-phone" 
                    type="tel" 
                    placeholder="+1 555-0000" 
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cust-city">City</Label>
                  <Input 
                    id="cust-city" 
                    placeholder="New York" 
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cust-address">Address</Label>
                  <Input 
                    id="cust-address" 
                    placeholder="123 Main Street" 
                    value={formData.address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cust-ship-to">Ship to party</Label>
                  <Input
                    id="cust-ship-to"
                    placeholder="Warehouse / Delivery address"
                    value={formData.shipToParty}
                    onChange={(e) => setFormData(prev => ({ ...prev, shipToParty: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cust-sold-to">Sold to party</Label>
                  <Input
                    id="cust-sold-to"
                    placeholder="Defaults to customer address"
                    value={formData.soldToParty}
                    onChange={(e) => handleSoldToChange(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Auto-filled from address; you can override if billing differs.</p>
                </div>
              </div>

              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-4 text-primary">Customer Preferences</h3>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="cust-priority">Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger id="cust-priority">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-3">
                    <Label>Delivery Status</Label>
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="delivery-block" checked={deliveryBlock} onCheckedChange={(checked) => setDeliveryBlock(checked === true)} />
                        <Label htmlFor="delivery-block" className="font-normal cursor-pointer">Block</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="delivery-open" checked={deliveryOpen} onCheckedChange={(checked) => setDeliveryOpen(checked === true)} />
                        <Label htmlFor="delivery-open" className="font-normal cursor-pointer">Open</Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label>Credit Status</Label>
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="credit-cash" checked={creditCash} onCheckedChange={(checked) => {
                          setCreditCash(checked === true);
                          if (checked === true) setCreditCredit(false);
                        }} />
                        <Label htmlFor="credit-cash" className="font-normal cursor-pointer">Cash</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="credit-credit" checked={creditCredit} onCheckedChange={(checked) => {
                          setCreditCredit(checked === true);
                          if (checked === true) setCreditCash(false);
                        }} />
                        <Label htmlFor="credit-credit" className="font-normal cursor-pointer">Credit</Label>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mt-4">
                      <Label>Day's</Label>
                      <RadioGroup value={paymentDays} onValueChange={setPaymentDays}>
                        <div className="flex items-center space-x-6">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="7" id="days-7" />
                            <Label htmlFor="days-7" className="font-normal cursor-pointer">7 Days</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="15" id="days-15" />
                            <Label htmlFor="days-15" className="font-normal cursor-pointer">15 Days</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="30" id="days-30" />
                            <Label htmlFor="days-30" className="font-normal cursor-pointer">30 Days</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="45" id="days-45" />
                            <Label htmlFor="days-45" className="font-normal cursor-pointer">45 Days</Label>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleAdd}>
                  {editMode ? "Update Customer" : "Create Customer"}
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
          <UserCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Customer Management</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage customer accounts, contracts, and relationships</p>
      </header>

      <MasterDataTable
        title="All Customers"
        description={`Total accounts: ${customers.length}`}
        data={customers}
        columns={columns}
        searchPlaceholder="Search customers..."
        searchFields={["name", "code", "company", "email", "phone", "city"]}
        itemsPerPage={10}
        onAdd={() => setShowAddForm(true)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage="No customers found"
        showCode={true}
        codeKey="code"
      />
    </main>
  );
}
