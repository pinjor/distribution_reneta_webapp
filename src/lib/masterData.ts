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

export class MasterDataLoadError extends Error {
  constructor(resource: string, cause?: unknown) {
    super(`Failed to load ${resource} from the server`);
    this.name = "MasterDataLoadError";
    if (cause instanceof Error && cause.message) {
      this.message = cause.message;
    }
  }
}

export const masterData = {
  async getDepots(): Promise<DepotOption[]> {
    try {
      const data = await apiEndpoints.depots.getAll();
      if (!Array.isArray(data)) {
        throw new MasterDataLoadError("depots");
      }
      return data
        .filter((item: any) => item?.code && item?.name)
        .map((item: any) => ({ code: String(item.code), name: String(item.name) }));
    } catch (error) {
      throw error instanceof MasterDataLoadError
        ? error
        : new MasterDataLoadError("depots", error);
    }
  },

  async getCustomers(): Promise<CustomerOption[]> {
    try {
      const data = await apiEndpoints.customers.getAll();
      if (!Array.isArray(data)) {
        throw new MasterDataLoadError("customers");
      }
      return data
        .filter((item: any) => item)
        .map((item: any) => ({
          id: String(item.id ?? item.code ?? item.customer_id ?? ""),
          code: String(item.code ?? item.customer_id ?? item.id ?? ""),
          name: String(item.name ?? item.customer_name ?? item.company ?? ""),
          city: item.city || item.town || "",
          phone: item.phone || "",
        }))
        .filter((customer: CustomerOption) => customer.code && customer.name);
    } catch (error) {
      throw error instanceof MasterDataLoadError
        ? error
        : new MasterDataLoadError("customers", error);
    }
  },

  async getEmployees(): Promise<EmployeeOption[]> {
    try {
      const data = await apiEndpoints.employees.getAll();
      if (!Array.isArray(data)) {
        throw new MasterDataLoadError("employees");
      }
      return data
        .filter((item: any) => item)
        .map((item: any) => ({
          id: String(item.id ?? item.employee_id ?? ""),
          code: String(item.employee_id ?? item.code ?? item.id ?? ""),
          name: `${item.first_name ?? ""} ${item.last_name ?? ""}`.trim() || item.name || item.full_name || "",
          designation: item.designation || item.role || item.title || "",
        }))
        .filter((emp: EmployeeOption) => emp.code && emp.name);
    } catch (error) {
      throw error instanceof MasterDataLoadError
        ? error
        : new MasterDataLoadError("employees", error);
    }
  },

  async getProducts(): Promise<ProductOption[]> {
    try {
      const data = await apiEndpoints.products.getAll();
      if (!Array.isArray(data)) {
        throw new MasterDataLoadError("products");
      }
      return data
        .filter((item: any) => {
          if (!item) return false;
          if (item.is_active === false) return false;
          const hasName = item.name || item.product_name;
          const hasCode = item.old_code || item.code || item.sku;
          return hasName && hasCode;
        })
        .map((item: any) => {
          const oldCode = item.old_code || item.code || item.sku || "";
          const newCode = item.new_code || item.code || item.sku || "";
          return {
            id: String(item.id ?? item.sku ?? ""),
            oldCode: String(oldCode),
            newCode: String(newCode),
            name: String(item.name ?? item.product_name ?? ""),
            packSize: String(item.primary_packaging ?? item.unit_of_measure ?? item.pack_size ?? ""),
            tradePrice: Number(item.base_price ?? item.trade_price ?? 0),
            freeGoodsThreshold: Number(item.free_goods_threshold ?? 0) || undefined,
            freeGoodsQuantity: Number(item.free_goods_quantity ?? 0) || undefined,
          };
        });
    } catch (error) {
      throw error instanceof MasterDataLoadError
        ? error
        : new MasterDataLoadError("products", error);
    }
  },
};
