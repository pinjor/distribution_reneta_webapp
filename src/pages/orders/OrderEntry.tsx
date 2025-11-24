import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { masterData, type CustomerOption, type DepotOption, type EmployeeOption, type ProductOption } from "@/lib/masterData";
import { apiEndpoints } from "@/lib/api";
import { CalendarIcon, Loader2, Trash2, ChevronsUpDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  payload?: any;
}

interface SearchableComboboxProps {
  label: string;
  placeholder: string;
  options: ComboboxOption[];
  value: string;
  onSelect: (value: ComboboxOption) => void;
  disabled?: boolean;
  emptyMessage?: string;
  error?: string;
}

interface ApiOrderItem {
  id: number;
  old_code: string;
  new_code?: string | null;
  product_name: string;
  pack_size?: string | null;
  quantity: number | string;
  trade_price: number | string;
  delivery_date: string;
  selected?: boolean | null;
}

interface ApiOrder {
  id: number;
  order_number?: string | null;
  depot_code: string;
  depot_name: string;
  customer_id: string;
  customer_name: string;
  customer_code?: string | null;
  pso_id: string;
  pso_name: string;
  pso_code?: string | null;
  delivery_date: string;
  status: "Draft" | "Submitted" | "Approved" | "Partially Approved";
  notes?: string | null;
  items: ApiOrderItem[];
}

interface DraftItem {
  key: string;
  id?: number;
  oldCode: string;
  newCode?: string;
  productName: string;
  packSize?: string;
  quantity: number;
  tradePrice: number;
  deliveryDate: string;
  selected: boolean;
}

interface FormState {
  customerId: string;
  psoId: string;
  depotCode: string;
  oldCode: string;
  newCode: string;
  productName: string;
  packSize: string;
  quantity: string;
  tradePrice: string;
  deliveryDate: string;
}

const createKey = () => Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString(36).toUpperCase();

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().split("T")[0];
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

function SearchableCombobox({ label, placeholder, options, value, onSelect, disabled, emptyMessage, error }: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <Button
            variant="outline"
            role="combobox"
            className={cn("w-full justify-between", !selected && "text-muted-foreground", error && "border-destructive")}
          >
            {selected ? (
              <span className="text-left flex-1">
                <span className="block font-medium text-foreground">{selected.label}</span>
                {selected.description && (
                  <span className="block text-xs text-muted-foreground">{selected.description}</span>
                )}
              </span>
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>{emptyMessage || "No results found."}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.description ?? ""}`}
                    onSelect={() => {
                      onSelect(option);
                      setOpen(false);
                    }}
                    className="flex flex-col items-start gap-1"
                  >
                    <span className="text-sm font-medium text-foreground">{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function OrderEntry() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [depots, setDepots] = useState<DepotOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [orderType, setOrderType] = useState<"without" | "with">("without");
  const [referenceOrders, setReferenceOrders] = useState<ApiOrder[]>([]);
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [referenceId, setReferenceId] = useState("");

  const [form, setForm] = useState<FormState>({
    customerId: "",
    psoId: "",
    depotCode: "",
    oldCode: "",
    newCode: "",
    productName: "",
    packSize: "",
    quantity: "",
    tradePrice: "",
    deliveryDate: today(),
  });

  const clearError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  useEffect(() => {
    document.title = "Order | Order Management";
  }, []);

  const loadReferenceOrders = useCallback(async () => {
    if (referenceOrders.length > 0 || referenceLoading) return;
    try {
      setReferenceLoading(true);
      const data: ApiOrder[] = await apiEndpoints.orders.getAll();
      const filtered = data.filter((order) => order.status !== "Draft");
      setReferenceOrders(filtered);
    } catch (error: any) {
      console.error("Failed to load reference orders", error);
      toast({
        title: "Unable to load reference orders",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setReferenceLoading(false);
    }
  }, [referenceOrders.length, referenceLoading, toast]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingMasters(true);
        const [depotData, customerData, employeeData, productData] = await Promise.all([
          masterData.getDepots(),
          masterData.getCustomers(),
          masterData.getEmployees(),
          masterData.getProducts(),
        ]);
        if (!mounted) return;
        setDepots(depotData);
        setCustomers(customerData);
        setEmployees(employeeData);
        setProducts(productData);
      } catch (error) {
        console.error("Failed to load master data", error);
        toast({
          title: "Master data unavailable",
          description: "Some dropdowns are using fallback values. Check your network connection.",
          variant: "destructive",
        });
      } finally {
        if (mounted) setLoadingMasters(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [toast]);

  useEffect(() => {
    if (orderType === "with") {
      setOrderId(null);
      loadReferenceOrders();
    } else {
      setReferenceId("");
      clearError("reference");
    }
  }, [orderType, loadReferenceOrders]);

  const selectedCustomer = customers.find((cust) => cust.id === form.customerId);
  const selectedEmployee = employees.find((emp) => emp.id === form.psoId);
  const selectedDepot = depots.find((depot) => depot.code === form.depotCode);

  const selectedProduct = useMemo(
    () => products.find((product) => product.oldCode === form.oldCode),
    [products, form.oldCode],
  );

  useEffect(() => {
    if (!selectedProduct) {
      setForm((prev) => ({
        ...prev,
        newCode: "",
        productName: "",
        packSize: "",
      }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      newCode: selectedProduct.newCode || "",
      productName: selectedProduct.name,
      packSize: selectedProduct.packSize || "",
      tradePrice: prev.tradePrice || (selectedProduct.tradePrice ? String(selectedProduct.tradePrice) : ""),
    }));
    clearError("oldCode");
  }, [selectedProduct]);

  const mapApiItemToDraft = (item: ApiOrderItem, clone: boolean = false): DraftItem => ({
    key: createKey(),
    id: clone ? undefined : item.id,
    oldCode: item.old_code,
    newCode: item.new_code || "",
    productName: item.product_name,
    packSize: item.pack_size || "",
    quantity: Number(item.quantity ?? 0),
    tradePrice: Number(item.trade_price ?? 0),
    deliveryDate: item.delivery_date,
    selected: item.selected !== false,
  });

  const loadOrder = async (id: number) => {
    setLoadingOrder(true);
    try {
      const data: ApiOrder = await apiEndpoints.orders.getById(id);
      setOrderType("without");
      setReferenceId("");
      setOrderId(data.id);
      setItems(data.items.map(mapApiItemToDraft));
      setForm((prev) => ({
        ...prev,
        customerId: data.customer_id,
        psoId: data.pso_id,
        depotCode: data.depot_code,
        deliveryDate: data.delivery_date,
        oldCode: "",
        newCode: "",
        productName: "",
        packSize: "",
        quantity: "",
        tradePrice: "",
      }));
    } catch (error: any) {
      console.error("Failed to load order", error);
      toast({
        title: "Unable to load order",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoadingOrder(false);
    }
  };

  useEffect(() => {
    const editParam = searchParams.get("orderId");
    if (!editParam) {
      setOrderId(null);
      setItems([]);
      return;
    }
    const parsedId = Number(editParam);
    if (Number.isNaN(parsedId)) {
      toast({
        title: "Invalid order reference",
        description: "The requested order id is not valid.",
        variant: "destructive",
      });
      return;
    }
    loadOrder(parsedId);
  }, [searchParams]);

  const customerOptions: ComboboxOption[] = customers.map((cust) => ({
    value: cust.id,
    label: cust.name,
    description: `${cust.code}${cust.city ? ` • ${cust.city}` : ""}`,
    payload: cust,
  }));

  const employeeOptions: ComboboxOption[] = employees.map((emp) => ({
    value: emp.id,
    label: emp.name,
    description: `${emp.code}${emp.designation ? ` • ${emp.designation}` : ""}`,
    payload: emp,
  }));

  const depotOptions: ComboboxOption[] = depots.map((depot) => ({
    value: depot.code,
    label: depot.name,
    description: depot.code,
    payload: depot,
  }));

  const productOptions: ComboboxOption[] = products.map((product) => ({
    value: product.oldCode,
    label: `${product.oldCode} — ${product.name}`,
    description: `${product.newCode || "-"} • ${product.packSize}${product.tradePrice ? ` • ${product.tradePrice}` : ""}`,
    payload: product,
  }));

  const referenceOptions: ComboboxOption[] = referenceOrders.map((order) => ({
    value: String(order.id),
    label: order.order_number || `Order #${order.id}`,
    description: `${order.depot_name} • ${formatDate(order.delivery_date)} • ${order.status}`,
    payload: order,
  }));

  const applyReferenceOrder = (order: ApiOrder) => {
    setReferenceId(String(order.id));
    setOrderId(null);
    setForm((prev) => ({
      ...prev,
      customerId: order.customer_id,
      psoId: order.pso_id,
      depotCode: order.depot_code,
      deliveryDate: order.delivery_date,
      oldCode: "",
      newCode: "",
      productName: "",
      packSize: "",
      quantity: "",
      tradePrice: "",
    }));
    ["customerId", "psoId", "depotCode", "oldCode", "quantity", "items"].forEach(clearError);
    setItems(order.items.map((item) => mapApiItemToDraft(item, true)));
  };

  const handleAddItem = () => {
    const newErrors: Record<string, string> = {};
    if (!form.customerId) newErrors.customerId = "Select a customer";
    if (!form.psoId) newErrors.psoId = "Select a PSO/employee";
    if (!form.depotCode) newErrors.depotCode = "Select a depot";
    if (!form.oldCode) newErrors.oldCode = "Select an old item code";

    const quantity = Number(form.quantity);
    if (!quantity || quantity <= 0) newErrors.quantity = "Quantity must be greater than zero";

    setErrors((prev) => ({ ...prev, ...newErrors }));
    if (Object.keys(newErrors).length > 0) return;

    const tradePrice = Number(form.tradePrice || 0);

    const newItem: DraftItem = {
      key: createKey(),
      oldCode: form.oldCode,
      newCode: form.newCode,
      productName: form.productName,
      packSize: form.packSize,
      quantity,
      tradePrice,
      deliveryDate: form.deliveryDate,
      selected: true,
    };

    setItems((prev) => [...prev, newItem]);
    clearError("items");
    toast({
      title: "Line item added",
      description: `${form.productName || form.oldCode} was added to the order list.`,
    });

    setForm((prev) => ({
      ...prev,
      oldCode: "",
      newCode: "",
      productName: "",
      packSize: "",
      quantity: "",
      tradePrice: "",
    }));
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  const mapDraftItemsToPayload = () =>
    items.map((item) => ({
      id: item.id,
      old_code: item.oldCode,
      new_code: item.newCode || null,
      product_name: item.productName,
      pack_size: item.packSize || null,
      quantity: item.quantity,
      trade_price: item.tradePrice,
      delivery_date: item.deliveryDate,
      selected: item.selected,
    }));

  const canSave = Boolean(form.customerId && form.psoId && form.depotCode && items.length > 0);

  const handleSave = async (navigateAfter: boolean) => {
    if (!canSave) {
      setErrors((prev) => ({
        ...prev,
        ...(items.length === 0 ? { items: "Add at least one item" } : {}),
      }));
      toast({
        title: "Incomplete order",
        description: "Select customer, PSO, depot, and add at least one item before saving.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCustomer || !selectedEmployee || !selectedDepot) {
      toast({
        title: "Missing master data",
        description: "Ensure selected values exist in master data.",
        variant: "destructive",
      });
      return;
    }

    if (orderType === "with" && !referenceId) {
      setErrors((prev) => ({ ...prev, reference: "Select a reference order" }));
      toast({
        title: "Reference required",
        description: "Choose an existing order to reference or switch back to the without-reference flow.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      depot_code: selectedDepot.code,
      depot_name: selectedDepot.name,
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.name,
      customer_code: selectedCustomer.code,
      pso_id: selectedEmployee.id,
      pso_name: selectedEmployee.name,
      pso_code: selectedEmployee.code,
      delivery_date: form.deliveryDate,
      notes:
        referenceId && referenceOrders.length
          ? `Reference order ${
              referenceOrders.find((order) => String(order.id) === referenceId)?.order_number || `#${referenceId}`
            }`
          : undefined,
      items: mapDraftItemsToPayload(),
    };

    try {
      setSaving(true);
      const response: ApiOrder = orderId
        ? await apiEndpoints.orders.update(orderId, payload)
        : await apiEndpoints.orders.create(payload);
      setOrderId(response.id);
      setItems(response.items.map(mapApiItemToDraft));
      toast({
        title: "Order saved",
        description: navigateAfter
          ? "Draft order saved and ready for review."
          : "Draft order saved. You can continue adding items or navigate away.",
      });
      if (navigateAfter) {
        navigate("/orders", { replace: true });
      }
    } catch (error: any) {
      console.error("Failed to save order", error);
      toast({
        title: "Unable to save order",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const isBusy = saving || loadingOrder;

  return (
    <main className="p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Order Management</h1>
        <p className="text-muted-foreground">
          Create a customer order without reference, add multiple items, and review the draft before saving.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Order type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={orderType}
            onValueChange={(value) => setOrderType(value as "without" | "with")}
            className="flex gap-8"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="with" id="order-type-with" />
              <Label htmlFor="order-type-with" className="text-sm text-muted-foreground">
                With reference
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="without" id="order-type-without" />
              <Label htmlFor="order-type-without" className="text-sm font-medium text-foreground">
                Without reference
              </Label>
            </div>
          </RadioGroup>
          {orderType === "with" && (
            <SearchableCombobox
              label="Reference order"
              placeholder={referenceLoading ? "Loading reference orders..." : "Select reference order"}
              options={referenceOptions}
              value={referenceId}
              onSelect={(option) => {
                const refOrder: ApiOrder | undefined = option.payload;
                if (refOrder) {
                  applyReferenceOrder(refOrder);
                  clearError("reference");
                } else {
                  setReferenceId(option.value);
                }
              }}
              disabled={referenceLoading}
              emptyMessage={referenceOrders.length ? "No matching order" : "No submitted/approved orders yet"}
              error={errors.reference}
            />
          )}
          <Separator />
          <div className="grid gap-4 md:grid-cols-4">
            <SearchableCombobox
              label="Customer"
              placeholder="Select customer"
              options={customerOptions}
              value={form.customerId}
              onSelect={(option) => {
                setForm((prev) => ({ ...prev, customerId: option.value }));
                clearError("customerId");
              }}
              disabled={loadingMasters || loadingOrder}
              error={errors.customerId}
            />
            <SearchableCombobox
              label="PSO / Employee"
              placeholder="Select employee"
              options={employeeOptions}
              value={form.psoId}
              onSelect={(option) => {
                setForm((prev) => ({ ...prev, psoId: option.value }));
                clearError("psoId");
              }}
              disabled={loadingMasters || loadingOrder}
              error={errors.psoId}
            />
            <SearchableCombobox
              label="Depot"
              placeholder="Select depot"
              options={depotOptions}
              value={form.depotCode}
              onSelect={(option) => {
                setForm((prev) => ({ ...prev, depotCode: option.value }));
                clearError("depotCode");
              }}
              disabled={loadingMasters || loadingOrder}
              error={errors.depotCode}
            />
            <SearchableCombobox
              label="Old item code"
              placeholder="Select item"
              options={productOptions}
              value={form.oldCode}
              onSelect={(option) => {
                setForm((prev) => ({ ...prev, oldCode: option.value }));
                clearError("oldCode");
              }}
              emptyMessage={products.length ? "No product matches" : "No products available"}
              disabled={loadingMasters || loadingOrder}
              error={errors.oldCode}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">New item code</Label>
              <Input value={form.newCode} readOnly placeholder="Auto-filled" className="border-dashed bg-muted" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium text-muted-foreground">Product name</Label>
              <Input value={form.productName} readOnly placeholder="Auto-filled" className="border-dashed bg-muted" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Pack size</Label>
              <Input value={form.packSize} readOnly placeholder="Auto-filled" className="border-dashed bg-muted" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Quantity</Label>
              <Input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, quantity: event.target.value }));
                  clearError("quantity");
                }}
                placeholder="Enter quantity"
                className={errors.quantity ? "border-destructive" : undefined}
              />
              {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Trade price</Label>
              <Input
                type="number"
                min={0}
                value={form.tradePrice}
                onChange={(event) => setForm((prev) => ({ ...prev, tradePrice: event.target.value }))}
                placeholder="Trade price"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Delivery date</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={form.deliveryDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, deliveryDate: event.target.value }))}
                />
                <CalendarIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <div className="flex items-end justify-end">
              <Button onClick={handleAddItem} className="w-full md:w-auto" disabled={loadingMasters || isBusy}>
                {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add item
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Draft items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4 text-sm text-muted-foreground bg-muted/40 rounded-md p-4">
            <div>
              <span className="block font-medium text-foreground">Customer</span>
              <span>{selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.code})` : "—"}</span>
            </div>
            <div>
              <span className="block font-medium text-foreground">PSO / Employee</span>
              <span>{selectedEmployee ? `${selectedEmployee.name} (${selectedEmployee.code})` : "—"}</span>
            </div>
            <div>
              <span className="block font-medium text-foreground">Depot</span>
              <span>{selectedDepot ? `${selectedDepot.name} (${selectedDepot.code})` : "—"}</span>
            </div>
            <div>
              <span className="block font-medium text-foreground">Delivery date</span>
              <span>{form.deliveryDate || "—"}</span>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow className="uppercase text-xs text-muted-foreground tracking-wide">
                  <TableHead className="w-12">SL</TableHead>
                  <TableHead className="w-36">Old code</TableHead>
                  <TableHead className="w-36">New code</TableHead>
                  <TableHead>Product name</TableHead>
                  <TableHead className="w-28">Pack</TableHead>
                  <TableHead className="w-20 text-right">Qty</TableHead>
                  <TableHead className="w-32 text-right">Trade price</TableHead>
                  <TableHead className="w-32 text-right">Delivery</TableHead>
                  <TableHead className="w-16 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-6 text-center text-sm text-muted-foreground">
                      No items added yet. Use the form above to add lines.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => (
                    <TableRow key={item.key} className="text-sm">
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{item.oldCode}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{item.newCode || "—"}</TableCell>
                      <TableCell className="font-medium text-foreground">{item.productName}</TableCell>
                      <TableCell>{item.packSize || "—"}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">৳{item.tradePrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{item.deliveryDate}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => removeItem(item.key)} disabled={isBusy}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {errors.items && <p className="text-xs text-destructive">{errors.items}</p>}

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Total quantity: <span className="font-semibold text-foreground">{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </span>
            <span>
              Total trade value: <span className="font-semibold text-foreground">৳{items.reduce((sum, item) => sum + item.tradePrice * item.quantity, 0).toFixed(2)}</span>
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" disabled={!canSave || isBusy} onClick={() => handleSave(false)}>
          {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save draft
        </Button>
        <Button onClick={() => handleSave(true)} disabled={!canSave || isBusy}>
          {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save & Continue
        </Button>
      </div>
    </main>
  );
}
