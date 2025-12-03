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
import { masterData, type CustomerOption, type EmployeeOption, type ProductOption } from "@/lib/masterData";
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
  hideDescriptionWhenSelected?: boolean;  // New prop to hide description when selected
}

interface ApiOrderItem {
  id: number;
  product_code: string;  // Renamed from old_code
  product_name: string;
  pack_size?: string | null;
  quantity: number | string;
  free_goods?: number | string | null;
  total_quantity?: number | string | null;
  trade_price: number | string;
  unit_price?: number | string | null;
  discount_percent?: number | string | null;
  batch_number?: string | null;  // Added
  current_stock?: number | string | null;  // Added
  delivery_date: string;
  selected?: boolean | null;
}

interface ApiOrder {
  id: number;
  order_number?: string | null;
  depot_code?: string | null;
  depot_name?: string | null;
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
  productCode: string;  // Renamed from oldCode
  productName: string;
  packSize?: string;
  quantity: number;
  freeGoods: number;
  totalQuantity: number;
  tradePrice: number;
  unitPrice: number;
  discountPercent: number;
  batchNumber?: string;  // Added
  currentStock?: number;  // Added
  deliveryDate: string;
  selected: boolean;
}

interface FormState {
  customerId: string;
  psoId: string;
  routeCode: string;  // Added route selection
  productCode: string;  // Renamed from oldCode
  productName: string;
  packSize: string;
  quantity: string;
  freeGoods: string;
  tradePrice: string;
  unitPrice: string;
  discountPercent: string;
  batchNumber: string;  // Added
  currentStock: string;  // Added (read-only)
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
                {selected.description && label !== "Product code" && (
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
            <CommandInput placeholder={`Search ${label?.toLowerCase() || 'item'}...`} />
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
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [shippingPoints, setShippingPoints] = useState<Array<{id: number; code: string; name: string; city?: string}>>([]);
  const [batches, setBatches] = useState<Array<{batch_number: string; available_quantity: number; expiry_date?: string}>>([]);
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
    routeCode: "",  // Added
    productCode: "",  // Renamed from oldCode
    productName: "",
    packSize: "",
    quantity: "",
    freeGoods: "0",
    tradePrice: "",
    unitPrice: "",
    discountPercent: "0",
    batchNumber: "",  // Added
    currentStock: "",  // Added
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
    document.title = "Order | Renata";
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
        const [customerData, employeeData, productData, routesData] = await Promise.all([
          masterData.getCustomers(),  // Use masterData for proper transformation
          masterData.getEmployees(),
          masterData.getProducts(),
          apiEndpoints.routes.getAll(),  // Use routes API instead of shipping points
        ]);
        if (!mounted) return;
        setCustomers(customerData);
        setEmployees(employeeData);
        setProducts(productData);
        // Transform routes data (stored in shippingPoints state for compatibility)
        const transformedRoutes = Array.isArray(routesData) 
          ? routesData
              .filter((route: any) => route && (route.code || route.route_id))
              .map((route: any) => ({
                id: route.id,
                code: route.code || route.route_id || String(route.id),
                name: route.name || route.code || route.route_id || `Route ${route.id}`,
                city: route.city || "",
              }))
          : [];
        setShippingPoints(transformedRoutes);
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

  const selectedProduct = useMemo(
    () => products.find((product) => product.oldCode === form.productCode),
    [products, form.productCode],
  );

  // Load batches and current stock when product is selected (depot is optional)
  useEffect(() => {
    // Clear batches immediately when product changes or is cleared
    if (!selectedProduct || !form.productCode) {
      setBatches([]);
      setForm((prev) => ({
        ...prev,
        batchNumber: "",
        currentStock: "",
      }));
      return;
    }

    const loadProductStock = async () => {
      try {
        // Try to get product ID - first from selectedProduct.id, or find by code
        // No depot filtering - use central stock
        let productId = Number(selectedProduct.id);
        
        // If product ID is invalid, try to find product by code
        if (isNaN(productId) || productId === 0) {
          console.warn("Invalid product ID, trying to find product by code:", selectedProduct.oldCode);
          try {
            const allProducts = await apiEndpoints.products.getAll();
            const foundProduct = allProducts.find((p: any) => 
              p.code === selectedProduct.oldCode || 
              p.old_code === selectedProduct.oldCode ||
              p.sku === selectedProduct.oldCode
            );
            if (foundProduct) {
              productId = Number(foundProduct.id);
              console.log("Found product by code, ID:", productId);
            } else {
              console.error("Could not find product with code:", selectedProduct.oldCode);
              setBatches([]);
              setForm((prev) => ({
                ...prev,
                batchNumber: "",
                currentStock: "0",
              }));
              return;
            }
          } catch (err) {
            console.error("Failed to fetch products to find ID:", err);
            setBatches([]);
            setForm((prev) => ({
              ...prev,
              batchNumber: "",
              currentStock: "0",
            }));
            return;
          }
        }

        // Get batches with FEFO (central stock - no depot filtering)
        // Only show batches with available stock
        const batchesData = await apiEndpoints.stockMaintenance.getProductBatches(productId);
        console.log("Loaded batches for product ID:", productId, "code:", selectedProduct.oldCode, "batches:", batchesData);
        
        if (Array.isArray(batchesData) && batchesData.length > 0) {
          // Filter batches that have batch_number and available_quantity > 0
          const validBatches = batchesData.filter(
            (batch) => batch.batch_number && (batch.available_quantity || 0) > 0
          );
          
          if (validBatches.length > 0) {
            setBatches(validBatches);
            
            // Auto-select first batch (FEFO) and set its stock
            const firstBatch = validBatches[0];
            if (firstBatch && firstBatch.batch_number) {
              setForm((prev) => ({
                ...prev,
                batchNumber: firstBatch.batch_number,
                currentStock: String(firstBatch.available_quantity || 0),
              }));
            }
          } else {
            // No batches with stock available
            setBatches([]);
            setForm((prev) => ({
              ...prev,
              batchNumber: "",
              currentStock: "0",
            }));
            toast({
              title: "No stock available",
              description: "This product has no batches with available stock.",
              variant: "destructive",
            });
          }
        } else {
          console.warn("No batches found for product ID:", productId);
          setBatches([]);
          setForm((prev) => ({
            ...prev,
            batchNumber: "",
            currentStock: "0",
          }));
          toast({
            title: "No batches available",
            description: "This product has no batch numbers. Products without batch numbers have no stock.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to load product stock", error);
        setBatches([]);
        setForm((prev) => ({
          ...prev,
          batchNumber: "",
          currentStock: "0",
        }));
      }
    };

    loadProductStock();
  }, [selectedProduct, toast]);

  // Calculate free goods based on product threshold
  useEffect(() => {
    if (!selectedProduct || !form.quantity) {
      setForm((prev) => ({
        ...prev,
        freeGoods: "0",
      }));
      return;
    }

    const quantity = Number(form.quantity) || 0;
    const threshold = selectedProduct.freeGoodsThreshold || 100;
    const freeGoodsQty = selectedProduct.freeGoodsQuantity || 5;

    // Calculate free goods: (quantity / threshold) * freeGoodsQuantity
    const calculatedFreeGoods = Math.floor(quantity / threshold) * freeGoodsQty;

    setForm((prev) => ({
      ...prev,
      freeGoods: String(calculatedFreeGoods),
    }));
  }, [selectedProduct, form.quantity]);

  // Product selection effect - auto-populate all fields from database
  useEffect(() => {
    if (!selectedProduct) {
      setForm((prev) => ({
        ...prev,
        productName: "",
        packSize: "",
        tradePrice: "",
        unitPrice: "",
      }));
      return;
    }
    // Auto-populate all fields from selected product
    const tradePrice = selectedProduct.tradePrice || 0;
    setForm((prev) => ({
      ...prev,
      productName: selectedProduct.name || "",
      packSize: selectedProduct.packSize || "",
      tradePrice: String(tradePrice),
      unitPrice: String(tradePrice), // Default unit price to trade price
    }));
    clearError("productCode");
  }, [selectedProduct]);

  const mapApiItemToDraft = (item: ApiOrderItem, clone: boolean = false): DraftItem => {
    const qty = Number(item.quantity ?? 0);
    const freeGoods = Number(item.free_goods ?? 0);
    const totalQty = Number(item.total_quantity ?? qty + freeGoods);
    const unitPrice = Number(item.unit_price ?? item.trade_price ?? 0);
    const discountPercent = Number(item.discount_percent ?? 0);
    
    return {
      key: createKey(),
      id: clone ? undefined : item.id,
      productCode: item.product_code || (item as any).old_code || "",  // Support both old and new field names
      productName: item.product_name,
      packSize: item.pack_size || "",
      quantity: qty,
      freeGoods: freeGoods,
      totalQuantity: totalQty,
      tradePrice: Number(item.trade_price ?? 0),
      unitPrice: unitPrice,
      discountPercent: discountPercent,
      batchNumber: item.batch_number || "",  // Added
      currentStock: item.current_stock ? Number(item.current_stock) : undefined,  // Added
      deliveryDate: item.delivery_date,
      selected: item.selected !== false,
    };
  };

  const loadOrder = async (id: number) => {
    setLoadingOrder(true);
    try {
      // Clear previous state first
      setBatches([]);
      setForm((prev) => ({
        ...prev,
        productCode: "",
        batchNumber: "",
        currentStock: "",
        productName: "",
        packSize: "",
        quantity: "",
        freeGoods: "0",
        tradePrice: "",
        unitPrice: "",
        discountPercent: "0",
      }));
      
      const data: ApiOrder = await apiEndpoints.orders.getById(id);
      setOrderType("without");
      setReferenceId("");
      setOrderId(data.id);
      setItems(data.items.map(mapApiItemToDraft));
      setForm((prev) => ({
        ...prev,
        customerId: data.customer_id,
        psoId: data.pso_id,
        routeCode: data.route_code || "",
        deliveryDate: data.delivery_date,
        productCode: "",
        batchNumber: "",
        currentStock: "",
        productName: "",
        packSize: "",
        quantity: "",
        freeGoods: "0",
        tradePrice: "",
        unitPrice: "",
        discountPercent: "0",
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
      // Clear all state when no orderId in URL (new order)
      setOrderId(null);
      setItems([]);
      setBatches([]);
      setForm((prev) => ({
        ...prev,
        productCode: "",
        batchNumber: "",
        currentStock: "",
        productName: "",
        packSize: "",
        quantity: "",
        freeGoods: "0",
        tradePrice: "",
        unitPrice: "",
        discountPercent: "0",
      }));
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
    description: `${cust.phone || cust.code}${cust.city ? ` • ${cust.city}` : ""}`,
    payload: cust,
  }));

  const employeeOptions: ComboboxOption[] = employees.map((emp) => ({
    value: emp.id,
    label: emp.name,
    description: `${emp.code}${emp.designation ? ` • ${emp.designation}` : ""}`,
    payload: emp,
  }));


  const productOptions: ComboboxOption[] = products.map((product) => ({
    value: product.oldCode,
    label: product.oldCode,  // Show only the code when selected
    description: `${product.name}${product.packSize ? ` • ${product.packSize}` : ""}${product.tradePrice ? ` • ৳${product.tradePrice}` : ""}`,  // Show in dropdown for selection
    payload: product,
  }));

  const routeOptions: ComboboxOption[] = shippingPoints.map((route: any) => ({
    value: route.code || route.route_id || String(route.id),
    label: route.name || route.code || route.route_id || `Route ${route.id}`,
    description: route.code || route.route_id || "",
    payload: route,
  }));

  // Debug: Log batches when they change
  useEffect(() => {
    if (batches.length > 0) {
      console.log("Batches available:", batches.length, batches);
    } else if (form.productCode) {
      console.log("No batches found for product:", form.productCode);
    }
  }, [batches, form.productCode]);

  // Helper function to check if batch number is numeric
  const isNumericBatch = (batchNo: string | null | undefined): boolean => {
    if (!batchNo) return false;
    const cleaned = String(batchNo).trim();
    return /^\d+$/.test(cleaned); // Only digits
  };

  const batchOptions: ComboboxOption[] = batches
    .filter((batch) => {
      // Only show batches with stock AND numeric batch numbers
      return batch && 
             batch.batch_number && 
             (batch.available_quantity || 0) > 0 &&
             isNumericBatch(batch.batch_number);
    })
    .map((batch) => ({
      value: String(batch.batch_number || ""),
      label: String(batch.batch_number || "Unknown Batch"),
      description: `Stock: ${batch.available_quantity || 0}${batch.expiry_date ? ` • Exp: ${new Date(batch.expiry_date).toLocaleDateString()}` : ""}`,
      payload: batch,
    }));

  // Update stock when batch is selected
  useEffect(() => {
    if (form.batchNumber && batches.length > 0) {
      const selectedBatch = batches.find((b) => b.batch_number === form.batchNumber);
      if (selectedBatch) {
        setForm((prev) => ({
          ...prev,
          currentStock: String(selectedBatch.available_quantity || 0),
        }));
      }
    }
  }, [form.batchNumber, batches]);

  const referenceOptions: ComboboxOption[] = referenceOrders.map((order) => ({
    value: String(order.id),
    label: order.order_number || `Order #${order.id}`,
    description: `${formatDate(order.delivery_date)} • ${order.status}`,
    payload: order,
  }));

  const applyReferenceOrder = (order: ApiOrder) => {
    setReferenceId(String(order.id));
    setOrderId(null);
    // Clear batches when applying reference order
    setBatches([]);
    setForm((prev) => ({
      ...prev,
      customerId: order.customer_id,
      psoId: order.pso_id,
      routeCode: order.route_code || "",
      deliveryDate: order.delivery_date,
      productCode: "",
      batchNumber: "",
      currentStock: "",
      productName: "",
      packSize: "",
      quantity: "",
      freeGoods: "0",
      tradePrice: "",
      unitPrice: "",
      discountPercent: "0",
    }));
    ["customerId", "psoId", "productCode", "quantity", "items"].forEach(clearError);
    setItems(order.items.map((item) => mapApiItemToDraft(item, true)));
  };

  const handleAddItem = () => {
    const newErrors: Record<string, string> = {};
    if (!form.customerId) newErrors.customerId = "Select a customer";
    if (!form.psoId) newErrors.psoId = "Select a PSO/employee";
    if (!form.productCode) newErrors.productCode = "Select a product code";
    if (!form.batchNumber) {
      newErrors.batchNumber = "Batch number is required. Products without batch numbers have no stock.";
    } else {
      // Validate batch number is numeric only
      const batchNo = form.batchNumber.trim();
      if (!/^\d+$/.test(batchNo)) {
        newErrors.batchNumber = "Batch number must be numeric only (digits only).";
      }
    }

    const quantity = Number(form.quantity);
    if (!quantity || quantity <= 0) {
      newErrors.quantity = "Quantity must be greater than zero";
    } else {
      // Check if quantity exceeds available stock for selected batch
      const availableStock = Number(form.currentStock || 0);
      if (quantity > availableStock) {
        newErrors.quantity = `Quantity cannot exceed available stock (${availableStock}) for this batch`;
      }
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
    if (Object.keys(newErrors).length > 0) {
      toast({
        title: "Validation error",
        description: "Please fix the errors before adding the item.",
        variant: "destructive",
      });
      return;
    }

    const tradePrice = Number(form.tradePrice || 0);
    const freeGoods = Number(form.freeGoods || 0);
    const totalQuantity = quantity + freeGoods;
    const unitPrice = Number(form.unitPrice || tradePrice || 0);
    const discountPercent = Number(form.discountPercent || 0);
    const newItem: DraftItem = {
      key: createKey(),
      productCode: form.productCode,
      productName: form.productName,
      packSize: form.packSize,
      quantity,
      freeGoods,
      totalQuantity,
      tradePrice,
      unitPrice,
      discountPercent,
      batchNumber: form.batchNumber || undefined,
      currentStock: form.currentStock ? Number(form.currentStock) : undefined,
      deliveryDate: form.deliveryDate,
      selected: true,
    };

    setItems((prev) => [...prev, newItem]);
    clearError("items");
    toast({
      title: "Line item added",
      description: `${form.productName || form.productCode} was added to the order list.`,
    });

    setForm((prev) => ({
      ...prev,
      productCode: "",
      productName: "",
      packSize: "",
      quantity: "",
      freeGoods: "0",
      tradePrice: "",
      unitPrice: "",
      discountPercent: "0",
      batchNumber: "",
      currentStock: "",
    }));
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  const mapDraftItemsToPayload = () =>
    items.map((item) => ({
      id: item.id,
      product_code: item.productCode,
      product_name: item.productName,
      pack_size: item.packSize || null,
      quantity: item.quantity,
      free_goods: item.freeGoods || 0,
      total_quantity: item.totalQuantity || item.quantity + item.freeGoods,
      trade_price: item.tradePrice,
      unit_price: item.unitPrice || item.tradePrice,
      discount_percent: item.discountPercent || 0,
      batch_number: item.batchNumber || null,
      current_stock: item.currentStock || null,
      delivery_date: item.deliveryDate,
      selected: item.selected,
    }));

  const canSave = Boolean(form.customerId && form.psoId && items.length > 0);

  const handleSave = async (navigateAfter: boolean) => {
    if (!canSave) {
      setErrors((prev) => ({
        ...prev,
        ...(items.length === 0 ? { items: "Add at least one item" } : {}),
      }));
      toast({
        title: "Incomplete order",
        description: "Select customer, PSO, and add at least one item before saving.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCustomer || !selectedEmployee) {
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

    // Get route name from selected route
    const selectedRoute = shippingPoints.find((route: any) => 
      (route.code || route.route_id || String(route.id)) === form.routeCode
    );
    const routeName = selectedRoute?.name || form.routeCode || null;
    const routeCode = form.routeCode || null;

    const payload = {
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.name,
      customer_code: selectedCustomer.code,
      pso_id: selectedEmployee.id,
      pso_name: selectedEmployee.name,
      pso_code: selectedEmployee.code,
      route_code: routeCode,
      route_name: routeName,
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
              label="Route"
              placeholder="Select route"
              options={routeOptions}
              value={form.routeCode}
              onSelect={(option) => {
                setForm((prev) => ({ ...prev, routeCode: option.value }));
                clearError("routeCode");
              }}
              emptyMessage={shippingPoints.length ? "No route matches" : "No routes available"}
              disabled={loadingMasters || loadingOrder}
              error={errors.routeCode}
            />
            <SearchableCombobox
              label="Product code"
              placeholder="Select product"
              options={productOptions}
              value={form.productCode}
              onSelect={(option) => {
                setForm((prev) => ({ ...prev, productCode: option.value }));
                clearError("productCode");
              }}
              emptyMessage={products.length ? "No product matches" : "No products available"}
              disabled={loadingMasters || loadingOrder}
              error={errors.productCode}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
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
              <SearchableCombobox
                label="Batch number *"
                placeholder={!form.productCode ? "Select product first" : batchOptions.length === 0 ? "No numeric batches available" : "Select batch (FEFO - Numeric only)"}
                options={batchOptions}
                value={form.batchNumber}
                onSelect={(option) => {
                  // Validate that selected batch number is numeric
                  if (!/^\d+$/.test(option.value.trim())) {
                    toast({
                      title: "Invalid batch number",
                      description: "Batch numbers must be numeric only (digits only).",
                      variant: "destructive",
                    });
                    return;
                  }
                  const selectedBatch = batches.find((b) => b.batch_number === option.value);
                  setForm((prev) => ({ 
                    ...prev, 
                    batchNumber: option.value.trim(),
                    currentStock: selectedBatch ? String(selectedBatch.available_quantity || 0) : prev.currentStock
                  }));
                  clearError("batchNumber");
                }}
                emptyMessage={batchOptions.length ? "No batch matches" : form.productCode ? "No numeric batches with stock available for this product" : "Select a product first"}
                disabled={loadingMasters || loadingOrder || !form.productCode}
                error={errors.batchNumber}
              />
              {form.productCode && batchOptions.length === 0 && batches.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Note: Only numeric batch numbers are shown. This product has {batches.length} batch(s) but none are numeric.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Available stock (Batch)</Label>
              <Input 
                value={form.currentStock || "0"} 
                readOnly 
                placeholder="Select batch to see stock" 
                className="border-dashed bg-muted" 
                disabled 
              />
              {form.batchNumber && form.currentStock && (
                <p className="text-xs text-muted-foreground">
                  Stock for batch {form.batchNumber}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Quantity *</Label>
              <Input
                type="number"
                min={1}
                max={Number(form.currentStock || 0)}
                value={form.quantity}
                onChange={(event) => {
                  const value = event.target.value;
                  const numValue = Number(value);
                  const maxStock = Number(form.currentStock || 0);
                  
                  // Prevent entering value greater than stock
                  if (value && numValue > maxStock) {
                    toast({
                      title: "Quantity exceeds stock",
                      description: `Maximum available stock is ${maxStock} for this batch.`,
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  setForm((prev) => ({ ...prev, quantity: value }));
                  clearError("quantity");
                }}
                placeholder="Enter quantity"
                className={errors.quantity ? "border-destructive" : undefined}
              />
              {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
              {form.currentStock && form.quantity && Number(form.quantity) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Max: {form.currentStock} (available stock for selected batch)
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Free goods</Label>
              <Input
                type="number"
                min={0}
                value={form.freeGoods}
                onChange={(event) => setForm((prev) => ({ ...prev, freeGoods: event.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Unit Price</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.unitPrice}
                onChange={(event) => setForm((prev) => ({ ...prev, unitPrice: event.target.value }))}
                placeholder="Unit price"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Trade price</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.tradePrice}
                onChange={(event) => setForm((prev) => ({ ...prev, tradePrice: event.target.value }))}
                placeholder="Trade price"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Discount %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={form.discountPercent}
                onChange={(event) => setForm((prev) => ({ ...prev, discountPercent: event.target.value }))}
                placeholder="0"
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
              <span className="block font-medium text-foreground">Delivery date</span>
              <span>{form.deliveryDate || "—"}</span>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow className="uppercase text-xs text-muted-foreground tracking-wide">
                  <TableHead className="w-12">SL</TableHead>
                  <TableHead className="w-32">Product code</TableHead>
                  <TableHead className="w-24">Batch</TableHead>
                  <TableHead className="w-24">Size</TableHead>
                  <TableHead className="w-24 text-right">Free goods</TableHead>
                  <TableHead className="w-24 text-right">Total Qty</TableHead>
                  <TableHead className="w-28 text-right">Unit Price</TableHead>
                  <TableHead className="w-28 text-right">Price - Dis.%</TableHead>
                  <TableHead className="w-32 text-right">Total Price</TableHead>
                  <TableHead className="w-16 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-6 text-center text-sm text-muted-foreground">
                      No items added yet. Use the form above to add lines.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => {
                    const priceAfterDiscount = item.unitPrice * (1 - item.discountPercent / 100);
                    const totalPrice = priceAfterDiscount * item.totalQuantity;
                    return (
                      <TableRow key={item.key} className="text-sm">
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{item.productCode}</TableCell>
                        <TableCell className="font-mono text-xs">{item.batchNumber || "—"}</TableCell>
                        <TableCell>{item.packSize || "—"}</TableCell>
                        <TableCell className="text-right">{item.freeGoods}</TableCell>
                        <TableCell className="text-right">{item.totalQuantity}</TableCell>
                        <TableCell className="text-right">৳{item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right">৳{priceAfterDiscount.toFixed(2)} ({item.discountPercent}%)</TableCell>
                        <TableCell className="text-right font-medium">৳{totalPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => removeItem(item.key)} disabled={isBusy}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {errors.items && <p className="text-xs text-destructive">{errors.items}</p>}

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Total quantity: <span className="font-semibold text-foreground">{items.reduce((sum, item) => sum + item.totalQuantity, 0)}</span>
            </span>
            <span>
              Total value: <span className="font-semibold text-foreground">৳{items.reduce((sum, item) => {
                const priceAfterDiscount = item.unitPrice * (1 - item.discountPercent / 100);
                return sum + priceAfterDiscount * item.totalQuantity;
              }, 0).toFixed(2)}</span>
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
