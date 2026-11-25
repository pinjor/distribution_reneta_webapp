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
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { MasterDataTable, ColumnDef } from "@/components/master-data/MasterDataTable";
import { generateCode } from "@/utils/codeGenerator";
import { getBadgeVariant } from "@/utils/badgeColors";
import { apiEndpoints } from "@/lib/api";

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
  const [companies, setCompanies] = useState<Array<{ id: number; name: string; code: string }>>([]);
  
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapCustomer = (row: any): Customer => ({
    id: String(row.id),
    code: row.code || "",
    name: row.name || "",
    company: row.type || "",
    email: row.email || "",
    phone: row.phone || "",
    address: row.address || "",
    city: row.city || "",
    shipToParty: row.ship_to_party || "",
    soldToParty: row.sold_to_party || row.address || "",
    priority: row.priority || "Medium",
    deliveryStatus: row.delivery_status_block ? "Block" : "Open",
    creditStatus: row.credit_status_cash ? "Cash" : "Credit",
    paymentDays: row.payment_days ?? undefined,
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

  const loadCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await apiEndpoints.customers.getAll();
      setCustomers(Array.isArray(rows) ? rows.map(mapCustomer) : []);
    } catch (err) {
      const message = formatApiError(err);
      setError(message);
      setCustomers([]);
      toast({ title: "Failed to load customers", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Customers | Renata";
    fetchCompanies();
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCompanies = async () => {
    try {
      const data = await apiEndpoints.companies.getAll();
      setCompanies(data);
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    }
  };

  const generateCustomerCode = (): string => {
    const existingCodes = customers.map(c => c.code);
    return generateCode("CUST", existingCodes);
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Missing required fields", description: "Customer name is required.", variant: "destructive" });
      return;
    }
    const payload = {
      name: formData.name.trim(),
      type: formData.company || "Retailer",
      email: formData.email || null,
      phone: formData.phone || null,
      address: formData.address || null,
      city: formData.city || null,
      ship_to_party: formData.shipToParty || null,
      sold_to_party: formData.soldToParty || formData.address || null,
      priority,
      delivery_status_block: deliveryBlock,
      delivery_status_open: deliveryOpen,
      credit_status_cash: creditCash,
      credit_status_credit: creditCredit,
      payment_days: paymentDays ? parseInt(paymentDays, 10) : null,
    };
    setSaving(true);
    try {
      if (editMode && selectedCustomer) {
        await apiEndpoints.customers.update(Number(selectedCustomer.id), payload);
        toast({ title: "Customer updated", description: "Customer information has been updated successfully." });
      } else {
        const created = await apiEndpoints.customers.create({
          ...payload,
          code: newCustomerCode || undefined,
        });
        toast({ title: "Customer added", description: `New customer created with code ${created.code}.` });
      }
      await loadCustomers();
      resetForm();
    } catch (err) {
      toast({
        title: editMode ? "Failed to update customer" : "Failed to create customer",
        description: formatApiError(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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

  const handleDelete = async (customer: Customer) => {
    if (!window.confirm(`Delete customer ${customer.name}? This cannot be undone.`)) return;
    try {
      await apiEndpoints.customers.delete(Number(customer.id));
      toast({ title: "Customer deleted", description: "The customer has been removed.", variant: "destructive" });
      await loadCustomers();
    } catch (err) {
      toast({ title: "Failed to delete customer", description: formatApiError(err), variant: "destructive" });
    }
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
      <div className="space-y-6">
        <PageHeader
          title={editMode ? "Edit Customer" : "Add New Customer"}
          subtitle={editMode ? "Update customer information" : "Create a new customer account"}
          icon={UserCheck}
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
                  <Label htmlFor="cust-company">Company *</Label>
                  <Select 
                    value={formData.company} 
                    onValueChange={(val) => setFormData(prev => ({ ...prev, company: val }))}
                  >
                    <SelectTrigger id="cust-company">
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.length > 0 ? (
                        companies.map((company) => (
                          <SelectItem key={company.id} value={company.name}>
                            {company.name} ({company.code})
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No companies available</div>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Select company from master data</p>
                </div>
              </div>

              {/* Customer Type */}
              <div className="space-y-3">
                <Label>Customer Type</Label>
                <p className="text-xs text-muted-foreground">These checkboxes are not stored in the database. Industry / type is saved as the customer type field.</p>
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
                <Button onClick={handleAdd} disabled={saving}>
                  {saving ? "Saving..." : editMode ? "Update Customer" : "Create Customer"}
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
        title="Customer Management"
        subtitle="Manage customer accounts, contracts, and relationships"
        icon={UserCheck}
        variant="slate"
      />

      {error && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={loadCustomers}>Retry</Button>
        </div>
      )}

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
        emptyMessage={loading ? "Loading customers..." : "No customers found"}
        showCode={true}
        codeKey="code"
      />
    </div>
  );
}
