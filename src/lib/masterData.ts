import { apiEndpoints } from "@/lib/api";

export interface DepotOption {
  code: string;
  name: string;
}

export interface CustomerOption {
  id: string;
  code: string;
  name: string;
  city?: string;
  phone?: string;
}

export interface EmployeeOption {
  id: string;
  code: string;
  name: string;
  designation?: string;
}

export interface ProductOption {
  id: string;
  oldCode: string;
  newCode: string;
  name: string;
  packSize: string;
  tradePrice: number;
  freeGoodsThreshold?: number;
  freeGoodsQuantity?: number;
}

const makeId = () => Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString(36).toUpperCase();

const DEPOT_STORAGE_KEY = "depotMasterData";

const fallbackDepots: DepotOption[] = [
  { code: "120", name: "Kushtia Depot" },
  { code: "107", name: "Khulna Depot" },
  { code: "115", name: "Dhaka Depot" },
];

const fallbackCustomers: CustomerOption[] = [
  { id: "1", code: "CUST-0001", name: "Global Retail Inc", city: "New York" },
  { id: "2", code: "CUST-0002", name: "Premium Foods Co", city: "Los Angeles" },
  { id: "3", code: "CUST-0003", name: "Tech Solutions Ltd", city: "San Francisco" },
];

const fallbackEmployees: EmployeeOption[] = [
  { id: "101", code: "EMP-0101", name: "Rahim Uddin", designation: "PSO" },
  { id: "102", code: "EMP-0102", name: "Karim Ahmed", designation: "Senior PSO" },
  { id: "103", code: "EMP-0103", name: "Farhana Akter", designation: "Territory Officer" },
];

const fallbackProducts: ProductOption[] = [
  {
    id: "M01000676",
    oldCode: "M01000676",
    newCode: "N01000676",
    name: "Tab Betahistine Dihydrochloride 16 mg",
    packSize: "Nos",
    tradePrice: 120,
  },
  {
    id: "M03000079",
    oldCode: "M03000079",
    newCode: "N03000079",
    name: "Levetiracetam 100 ml",
    packSize: "Phial",
    tradePrice: 220,
  },
  {
    id: "M04000123",
    oldCode: "M04000123",
    newCode: "N04000123",
    name: "Omeprazole 20 mg",
    packSize: "Bottle",
    tradePrice: 95,
  },
];

export const masterData = {
  async getDepots(): Promise<DepotOption[]> {
    if (typeof window === "undefined") return fallbackDepots;
    try {
      const data = await apiEndpoints.depots.getAll();
      if (Array.isArray(data)) {
        const mapped = data
          .filter((item: any) => item?.code && item?.name)
          .map((item: any) => ({ code: String(item.code), name: String(item.name) }));
        if (mapped.length) return mapped;
      }
    } catch (error) {
      console.warn("Failed to fetch depots from API", error);
    }
    try {
      const stored = window.localStorage.getItem(DEPOT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Array<{ code?: string; name?: string }>;
        const mapped = parsed
          .filter((item) => item?.code && item?.name)
          .map((item) => ({ code: String(item.code), name: String(item.name) }));
        if (mapped.length) return mapped;
      }
    } catch (error) {
      console.warn("Failed to read depot master data", error);
    }
    return fallbackDepots;
  },

  async getCustomers(): Promise<CustomerOption[]> {
    try {
      const data = await apiEndpoints.customers.getAll();
      if (!Array.isArray(data)) return fallbackCustomers;
      const mapped = data
        .filter((item: any) => item)
        .map((item: any) => ({
          id: String(item.id ?? item.code ?? item.customer_id ?? makeId()),
          code: String(item.code ?? item.customer_id ?? item.id ?? ""),
          name: String(item.name ?? item.customer_name ?? item.company ?? ""),
          city: item.city || item.town || "",
          phone: item.phone || "",
        }))
        .filter((customer: CustomerOption) => customer.code && customer.name);
      return mapped;
    } catch (error) {
      console.warn("Falling back to sample customers", error);
      return fallbackCustomers;
    }
  },

  async getEmployees(): Promise<EmployeeOption[]> {
    try {
      const data = await apiEndpoints.employees.getAll();
      if (!Array.isArray(data)) return fallbackEmployees;
      const mapped = data
        .filter((item: any) => item)
        .map((item: any) => ({
          id: String(item.id ?? item.employee_id ?? makeId()),
          code: String(item.employee_id ?? item.code ?? item.id ?? ""),
          name: `${item.first_name ?? ""} ${item.last_name ?? ""}`.trim() || item.name || item.full_name || "",
          designation: item.designation || item.role || item.title || "",
        }))
        .filter((emp: EmployeeOption) => emp.code && emp.name);
      return mapped;
    } catch (error) {
      console.warn("Falling back to sample employees", error);
      return fallbackEmployees;
    }
  },

  async getProducts(): Promise<ProductOption[]> {
    try {
      const data = await apiEndpoints.products.getAll();
      if (!Array.isArray(data)) {
        console.warn("Products API did not return an array:", data);
        return fallbackProducts;
      }
      
      console.log(`Loaded ${data.length} products from API`);
      
      const mapped = data
        .filter((item: any) => {
          // Filter out null/undefined items and inactive products
          if (!item) return false;
          if (item.is_active === false) return false;
          // Ensure we have at least a name and some form of code
          const hasName = item.name || item.product_name;
          const hasCode = item.old_code || item.code || item.sku;
          return hasName && hasCode;
        })
        .map((item: any) => {
          // Use code as oldCode if old_code is not available (for new products)
          const oldCode = item.old_code || item.code || item.sku || "";
          const newCode = item.new_code || item.code || item.sku || "";
          
          return {
            id: String(item.id ?? item.sku ?? makeId()),
            oldCode: String(oldCode),
            newCode: String(newCode),
            name: String(item.name ?? item.product_name ?? ""),
            packSize: String(item.primary_packaging ?? item.unit_of_measure ?? item.pack_size ?? ""),
            tradePrice: Number(item.base_price ?? item.trade_price ?? 0),
            freeGoodsThreshold: Number(item.free_goods_threshold ?? 100),
            freeGoodsQuantity: Number(item.free_goods_quantity ?? 5),
          };
        });
      
      console.log(`Mapped ${mapped.length} valid products`);
      
      if (mapped.length === 0) {
        console.warn("No valid products found, using fallback");
        return fallbackProducts;
      }
      
      return mapped;
    } catch (error) {
      console.error("Error loading products:", error);
      console.warn("Falling back to sample products");
      return fallbackProducts;
    }
  },
};
