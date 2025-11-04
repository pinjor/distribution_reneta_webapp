const API_URL = import.meta.env.VITE_API_URL || 'http://localhost/api';

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
      if (!response.ok) {
        if (response.status === 401) {
          // Unauthorized - clear tokens
          localStorage.removeItem("token");
          sessionStorage.removeItem("token");
          localStorage.removeItem("user");
          throw new Error("Authentication required");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
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
  
  materials: {
    getAll: () => api.get('/materials'),
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
    getAll: (roleType?: string) => api.get(roleType ? `/role-masters?role_type=${roleType}` : '/role-masters'),
    getById: (id: number) => api.get(`/role-masters/${id}`),
    create: (data: any) => api.post('/role-masters', data),
    update: (id: number, data: any) => api.put(`/role-masters/${id}`, data),
    delete: (id: number) => api.delete(`/role-masters/${id}`),
    getHierarchy: (id: number) => api.get(`/role-masters/${id}/hierarchy`),
    getPathToNSH: (id: number) => api.get(`/role-masters/${id}/path-to-nsh`),
    getSubordinates: (id: number) => api.get(`/role-masters/${id}/subordinates`),
    getByEmployee: (employeeId: number) => api.get(`/role-masters/by-employee/${employeeId}`),
    getByType: (roleType: string) => api.get(`/role-masters/by-type/${roleType}`),
  },
  
  vehicles: {
    getAll: () => api.get('/vehicles'),
    create: (data: any) => api.post('/vehicles', data),
  },
  
  drivers: {
    getAll: () => api.get('/drivers'),
    create: (data: any) => api.post('/drivers', data),
  },
  
  routes: {
    getAll: () => api.get('/routes'),
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
  },
  
  stockMaintenance: {
    getLedger: () => api.get('/stock/maintenance'),
  },
  
  vehicleLoadings: {
    getAll: () => api.get('/vehicle/loadings'),
  },
  
  // Analytics & Billing
  analytics: {
    salesTrend: () => api.get('/analytics/sales-trend'),
    stockChart: () => api.get('/analytics/stock-chart'),
  },
  
  billing: {
    getInvoices: () => api.get('/billing/invoices'),
  },
};

