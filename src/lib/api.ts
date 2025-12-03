const API_URL = import.meta.env.VITE_API_URL || 'http://localhost/api';

const buildQuery = (params?: Record<string, any>): string => {
  if (!params || Object.keys(params).length === 0) return "";
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.append(key, String(value));
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
};

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      // If we get a CORS error or network error, try direct backend connection
      if (!response.ok && response.status === 0) {
        console.warn("Proxy request failed, trying direct backend connection");
        const directUrl = url.replace('/api', 'http://localhost:8000/api');
        const directResponse = await fetch(directUrl, config);
        if (directResponse.ok) {
          return await directResponse.json();
        }
      }
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          sessionStorage.removeItem("token");
          localStorage.removeItem("user");
          throw new Error("Authentication required");
        }

        let message = `Request failed with status ${response.status}`;
        let errorDetails: any = null;
        try {
          const contentType = response.headers.get("Content-Type") || "";
          if (contentType.includes("application/json")) {
            const body = await response.json();
            errorDetails = body;
            message = body?.detail || body?.message || body?.error || JSON.stringify(body) || message;
          } else {
            const text = await response.text();
            if (text) message = text;
          }
        } catch (parseError) {
          console.warn("Failed to parse error response", parseError);
        }

        const error = new Error(message);
        (error as any).status = response.status;
        (error as any).details = errorDetails;
        console.error(`API Error [${response.status}]:`, errorDetails || message);
        throw error;
      }
      const contentType = response.headers.get("Content-Type") || "";
      if (contentType.includes("application/json")) {
        return await response.json();
      }
      return await response.text();
    } catch (error: any) {
      console.error('API request failed:', error);
      
      // If it's a network/CORS error, try direct backend connection as fallback
      if ((error.message?.includes("Failed to fetch") || error.message?.includes("CORS") || error.name === "TypeError") && 
          this.baseUrl.includes('/api')) {
        console.warn("Network/CORS error detected, trying direct backend connection");
        try {
          // Replace the baseUrl with direct backend URL, keeping the /api prefix
          const directUrl = url.replace(this.baseUrl, 'http://localhost:8000/api');
          const directResponse = await fetch(directUrl, config);
          if (directResponse.ok) {
            const contentType = directResponse.headers.get("Content-Type") || "";
            if (contentType.includes("application/json")) {
              return await directResponse.json();
            }
            return await directResponse.text();
          } else {
            console.error(`Direct backend connection failed with status: ${directResponse.status}`);
          }
        } catch (directError) {
          console.error("Direct backend connection also failed:", directError);
        }
      }
      
      throw error;
    }
  }

  async get(endpoint: string): Promise<any> {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint: string, data: any): Promise<any> {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint: string, data: any): Promise<any> {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint: string): Promise<any> {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(API_URL);

// API endpoints
export const apiEndpoints = {
  // Authentication
  auth: {
    login: (data: any) => api.post('/auth/login', data),
    signup: (data: any) => api.post('/auth/signup', data),
    me: () => api.get('/auth/me'),
    refresh: () => api.post('/auth/refresh'),
  },
  
  // Dashboard
  dashboard: {
    kpis: () => api.get('/dashboard/kpis'),
  },
  
  // Masters
  companies: {
    getAll: () => api.get('/companies'),
    getById: (id: number) => api.get(`/companies/${id}`),
    create: (data: any) => api.post('/companies', data),
    update: (id: number, data: any) => api.put(`/companies/${id}`, data),
    delete: (id: number) => api.delete(`/companies/${id}`),
  },
  
  depots: {
    getAll: () => api.get('/depots'),
    getById: (id: number) => api.get(`/depots/${id}`),
    create: (data: any) => api.post('/depots', data),
  },
  
  employees: {
    getAll: () => api.get('/employees'),
    getById: (id: number) => api.get(`/employees/${id}`),
    create: (data: any) => api.post('/employees', data),
    update: (id: number, data: any) => api.put(`/employees/${id}`, data),
    delete: (id: number) => api.delete(`/employees/${id}`),
  },
  
  customers: {
    getAll: () => api.get('/customers'),
    create: (data: any) => api.post('/customers', data),
  },
  
  vendors: {
    getAll: () => api.get('/vendors'),
    create: (data: any) => api.post('/vendors', data),
  },
  
  products: {
    getAll: () => api.get('/products'),
    getById: (id: number) => api.get(`/products/${id}`),
    create: (data: any) => api.post('/products', data),
    update: (id: number, data: any) => api.put(`/products/${id}`, data),
    delete: (id: number) => api.delete(`/products/${id}`),
  },
  
  shippingPoints: {
    getAll: () => api.get('/shipping-points'),
  },
  
  uoms: {
    getAll: () => api.get('/uoms'),
    getById: (id: number) => api.get(`/uoms/${id}`),
    create: (data: any) => api.post('/uoms', data),
    update: (id: number, data: any) => api.put(`/uoms/${id}`, data),
    delete: (id: number) => api.delete(`/uoms/${id}`),
  },
  
  primaryPackagings: {
    getAll: () => api.get('/primary-packagings'),
    getById: (id: number) => api.get(`/primary-packagings/${id}`),
    create: (data: any) => api.post('/primary-packagings', data),
    update: (id: number, data: any) => api.put(`/primary-packagings/${id}`, data),
    delete: (id: number) => api.delete(`/primary-packagings/${id}`),
  },
  
  priceSetups: {
    getAll: () => api.get('/price-setups'),
    getById: (id: number) => api.get(`/price-setups/${id}`),
    create: (data: any) => api.post('/price-setups', data),
    update: (id: number, data: any) => api.put(`/price-setups/${id}`, data),
    delete: (id: number) => api.delete(`/price-setups/${id}`),
  },
  
  roleMasters: {
    getAll: (roleType?: string) => api.get(roleType ? `/role-masters/?role_type=${roleType}` : '/role-masters/'),
    getById: (id: number) => api.get(`/role-masters/${id}`),
    create: (data: any) => api.post('/role-masters/', data),
    update: (id: number, data: any) => api.put(`/role-masters/${id}`, data),
    delete: (id: number) => api.delete(`/role-masters/${id}`),
    getHierarchy: (id: number) => api.get(`/role-masters/${id}/hierarchy`),
    getPathToNSH: (id: number) => api.get(`/role-masters/${id}/path-to-nsh`),
    getSubordinates: (id: number) => api.get(`/role-masters/${id}/subordinates`),
    getByEmployee: (employeeId: number) => api.get(`/role-masters/by-employee/${employeeId}`),
    getByType: (roleType: string) => api.get(`/role-masters/by-type/${roleType}`),
  },

  orders: {
    getAll: () => api.get('/orders'),
    getById: (id: number | string) => api.get(`/orders/${id}`),
    create: (data: any) => api.post('/orders', data),
    update: (id: number | string, data: any) => api.put(`/orders/${id}`, data),
    submit: (id: number | string) => api.post(`/orders/${id}/submit`, {}),
    validate: (data: any) => api.post('/orders/validate', data),
    delete: (id: number | string) => api.delete(`/orders/${id}`),
    getRouteWise: (routeCode: string) => api.get(`/orders/route-wise/${routeCode}`),
    getAllRouteWise: () => api.get('/orders/route-wise/all'),
    printRouteWise: (data: any) => api.post('/orders/route-wise/print', data),
    getCollectionApprovalList: (params?: Record<string, any>) => api.get(`/orders/collection-approval${buildQuery(params)}`),
    approveCollection: (id: number) => api.post(`/orders/${id}/approve-collection`, {}),
    markPartialCollection: (id: number) => api.post(`/orders/${id}/mark-partial-collection`, {}),
    markPostponedCollection: (id: number) => api.post(`/orders/${id}/mark-postponed-collection`, {}),
    assignRouteWise: (data: any) => api.post('/orders/route-wise/assign', data),
    validateRouteWise: (data: any) => api.post('/orders/route-wise/validate', data),
    getAssigned: (params?: Record<string, any>) => api.get(`/orders/assigned${buildQuery(params)}`),
    updateAssignedStatus: (id: number, data: any) => api.put(`/orders/assigned/${id}/status`, data),
    createAssignedFromBarcodes: (data: { memo_numbers: string[]; employee_id: number; vehicle_id: number }) => 
      api.post('/orders/assigned/from-barcodes', data),
    getMISReport: (params?: Record<string, any>) => api.get(`/orders/mis-report${buildQuery(params)}`),
    getMISReportDetail: (memoId: number | string) => api.get(`/orders/mis-report/${memoId}`),
  },

  productReceipts: {
    getAll: (params?: Record<string, any>) => api.get(`/product-receipts${buildQuery(params)}`),
    getById: (id: number | string) => api.get(`/product-receipts/${id}`),
    create: (data: any) => api.post('/product-receipts', data),
    update: (id: number | string, data: any) => api.put(`/product-receipts/${id}`, data),
    approve: (id: number | string) => api.post(`/product-receipts/${id}/approve`, {}),
    delete: (id: number | string) => api.delete(`/product-receipts/${id}`),
    report: (id: number | string) => api.get(`/product-receipts/${id}/report`),
  },

  orderDeliveries: {
    getAll: (params?: Record<string, any>) => api.get(`/order-deliveries${buildQuery(params)}`),
    getById: (id: number | string) => api.get(`/order-deliveries/${id}`),
    create: (data: any) => api.post('/order-deliveries', data),
    createFromOrder: (orderId: number | string, params?: Record<string, any>) =>
      api.post(`/order-deliveries/from-order/${orderId}${buildQuery(params)}`, {}),
    update: (id: number | string, data: any) => api.put(`/order-deliveries/${id}`, data),
    delete: (id: number | string) => api.delete(`/order-deliveries/${id}`),
    track: (orderId: number | string) => api.get(`/order-deliveries/tracking/${orderId}`),
  },

  pickingOrders: {
    getAll: () => api.get('/picking-orders'),
    getById: (id: number | string) => api.get(`/picking-orders/${id}`),
    create: (data: any) => api.post('/picking-orders', data),
    approve: (id: number | string) => api.post(`/picking-orders/${id}/approve`, {}),
    report: (id: number | string) => api.get(`/picking-orders/${id}/report`),
  },

  vehicles: {
    getAll: () => api.get('/vehicles'),
    create: (data: any) => api.post('/vehicles', data),
    update: (id: number | string, data: any) => api.put(`/vehicles/${id}`, data),
  },
  
  drivers: {
    getAll: () => api.get('/drivers'),
    create: (data: any) => api.post('/drivers', data),
  },
  
  routes: {
    getAll: () => api.get('/routes'),
  },

  masterData: {
    employees: () => api.get('/employees'),
    vehicles: () => api.get('/vehicles'),
    routes: () => api.get('/routes'),
  },
  
  // Stock operations
  stockReceipts: {
    getAll: () => api.get('/stock/receipts'),
  },
  
  stockIssuances: {
    getAll: () => api.get('/stock/issuances'),
  },
  
  stockAdjustments: {
    getAll: () => api.get('/stock/adjustments'),
    create: (data: any) => api.post('/stock/adjustments', data),
    getById: (id: number) => api.get(`/stock/adjustments/${id}`),
  },
  
  stockMaintenance: {
    getLedger: () => api.get('/stock/maintenance'),
    getProductBatches: (productId: number, depotId?: number) => {
      const params = depotId ? `?depot_id=${depotId}` : '';
      return api.get(`/stock/maintenance/product/${productId}/batches${params}`);
    },
    getProductCurrentStock: (productId: number, depotId?: number) => {
      const params = depotId ? `?depot_id=${depotId}` : '';
      return api.get(`/stock/maintenance/product/${productId}/current-stock${params}`);
    },
  },
  
  productItemStock: {
    getAll: (params?: Record<string, any>) => api.get(`/product-item-stock${buildQuery(params)}`),
    getById: (id: number) => api.get(`/product-item-stock/${id}`),
    create: (data: any) => api.post('/product-item-stock', data),
    update: (id: number, data: any) => api.put(`/product-item-stock/${id}`, data),
    getDetails: (stockId: number) => api.get(`/product-item-stock/${stockId}/details`),
    createDetail: (stockId: number, data: any) => api.post(`/product-item-stock/${stockId}/details`, data),
    getProductSummary: (productId: number, depotId?: number) => {
      const params = depotId ? `?depot_id=${depotId}` : '';
      return api.get(`/product-item-stock/product/${productId}/summary${params}`);
    },
  },
  
  vehicleLoadings: {
    getAll: () => api.get('/vehicle/loadings'),
  },
  
  invoices: {
    getAll: () => api.get('/invoices'),
    getById: (id: number | string) => api.get(`/invoices/${id}`),
    create: (data: any) => api.post('/invoices', data),
    generateBulk: (challanId: number) => api.post(`/invoices/generate-bulk/${challanId}`, {}),
    download: (id: number | string) => api.get(`/invoices/${id}/download`),
  },
  
  depotTransfers: {
    getAll: (params?: Record<string, any>) => api.get(`/depot-transfers${buildQuery(params)}`),
    getById: (id: number) => api.get(`/depot-transfers/${id}`),
    create: (data: any) => api.post('/depot-transfers', data),
    approve: (id: number, approvedBy: number) => api.post(`/depot-transfers/${id}/approve`, { approved_by: approvedBy }),
    receive: (id: number, receivedBy: number) => api.post(`/depot-transfers/${id}/receive`, { received_by: receivedBy }),
  },
  
  billing: {
    deposits: {
      getAll: (params?: Record<string, any>) => api.get(`/billing/deposits${buildQuery(params)}`),
      getById: (id: number) => api.get(`/billing/deposits/${id}`),
      create: (data: any) => api.post('/billing/deposits', data),
      update: (id: number, data: any) => api.put(`/billing/deposits/${id}`, data),
      approve: (id: number, approverId: number) => api.post(`/billing/deposits/${id}/approve?approver_id=${approverId}`, {}),
      receiveRemaining: (id: number, amount: number, receivedBy: number, notes?: string) => 
        api.post(`/billing/deposits/${id}/receive-remaining?received_amount=${amount}&received_by=${receivedBy}${notes ? `&receipt_notes=${encodeURIComponent(notes)}` : ''}`, {}),
    },
    transactions: {
      getAll: (params?: Record<string, any>) => api.get(`/billing/transactions${buildQuery(params)}`),
      create: (data: any) => api.post('/billing/transactions', data),
    },
    reports: {
      getByPerson: (personId: number, params?: Record<string, any>) => api.get(`/billing/reports/collection-person/${personId}${buildQuery(params)}`),
      getAll: (params?: Record<string, any>) => api.get(`/billing/reports/all${buildQuery(params)}`),
    },
  },
  
};

