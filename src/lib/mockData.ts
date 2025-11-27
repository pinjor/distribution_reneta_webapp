export const recentReceipts = [
  { id: "GR-2025-001", date: "2025-01-15", challan: "CH-45678", product: "Paracetamol 500mg", batch: "PCM-2501-A", qty: 5000, source: "Mumbai Central" },
  { id: "GR-2025-002", date: "2025-01-15", challan: "CH-45679", product: "Amoxicillin 250mg", batch: "AMX-2501-B", qty: 3000, source: "Delhi Main" },
  { id: "GR-2025-003", date: "2025-01-14", challan: "CH-45680", product: "Ibuprofen 400mg", batch: "IBU-2501-C", qty: 4500, source: "Bangalore Hub" },
  { id: "GR-2025-004", date: "2025-01-14", challan: "CH-45681", product: "Cetirizine 10mg", batch: "CET-2501-D", qty: 2000, source: "Chennai Depot" },
  { id: "GR-2025-005", date: "2025-01-13", challan: "CH-45682", product: "Metformin 500mg", batch: "MET-2501-E", qty: 6000, source: "Hyderabad Warehouse" },
];

export const pendingOrders = [
  { id: "DO-2025-1001", customer: "Rahman Pharmacy - Dhaka", items: "Paracetamol 500mg, Ibuprofen 400mg", qty: 250, priority: "High", expiry: "2025-12-15" },
  { id: "DO-2025-1002", customer: "Karim Medical - Chittagong", items: "Amoxicillin 250mg", qty: 180, priority: "Medium", expiry: "2025-11-20" },
  { id: "DO-2025-1003", customer: "Hasan Pharmacy - Sylhet", items: "Cetirizine 10mg, Metformin 500mg", qty: 320, priority: "High", expiry: "2025-10-30" },
  { id: "DO-2025-1004", customer: "Ali Pharmacy - Rajshahi", items: "Paracetamol 500mg", qty: 500, priority: "Low", expiry: "2026-01-15" },
  { id: "DO-2025-1005", customer: "Islamia Pharmacy - Khulna", items: "Ibuprofen 400mg, Amoxicillin 250mg", qty: 400, priority: "Medium", expiry: "2025-12-25" },
];

export const batchLedger = [
  { batch: "6000001", product: "Paracetamol 500mg", storage: "Ambient", stock: 4750, reserved: 250, available: 4500, expiry: "2025-12-15", status: "Unrestricted" },
  { batch: "7000001", product: "Amoxicillin 250mg", storage: "Cool", stock: 2820, reserved: 180, available: 2640, expiry: "2025-11-20", status: "Unrestricted" },
  { batch: "10000001", product: "Ibuprofen 400mg", storage: "Ambient", stock: 4100, reserved: 400, available: 3700, expiry: "2026-03-10", status: "Unrestricted" },
  { batch: "8000001", product: "Cetirizine 10mg", storage: "Ambient", stock: 1680, reserved: 320, available: 1360, expiry: "2025-10-30", status: "Restricted" },
  { batch: "9000001", product: "Metformin 500mg", storage: "Ambient", stock: 6000, reserved: 0, available: 6000, expiry: "2026-05-18", status: "Unrestricted" },
];

export const adjustmentRequests = [
  { id: "ADJ-2025-01", product: "Paracetamol 500mg", batch: "6000001", qty: -50, reason: "Damaged", submittedBy: "Abdul Karim", date: "2025-01-14", status: "Pending" },
  { id: "ADJ-2025-02", product: "Amoxicillin 250mg", batch: "AMX-2501-B", qty: 25, reason: "Cycle Count Variance", submittedBy: "Fatema Khatun", date: "2025-01-13", status: "Approved" },
  { id: "ADJ-2025-03", product: "Cetirizine 10mg", batch: "CET-2501-D", qty: -15, reason: "Quality Issue", submittedBy: "Mohammad Hasan", date: "2025-01-12", status: "Rejected" },
];

export const vehicles = [
  { id: "VH-001", type: "Refrigerated Van", regNo: "KA-01-AB-1234", capacity: 2000, depot: "Bangalore Hub", vendor: "Cold Chain Logistics", status: "Active" },
  { id: "VH-002", type: "Standard Truck", regNo: "KA-02-CD-5678", capacity: 5000, depot: "Bangalore Hub", vendor: "Fast Transport Co", status: "Active" },
  { id: "VH-003", type: "Mini Truck", regNo: "KA-03-EF-9012", capacity: 1000, depot: "Bangalore Hub", vendor: "Quick Delivery Ltd", status: "Maintenance" },
  { id: "VH-004", type: "Refrigerated Truck", regNo: "KA-04-GH-3456", capacity: 3000, depot: "Chennai Depot", vendor: "Cold Chain Logistics", status: "Active" },
];

export const drivers = [
  { id: "DR-001", name: "Mohammad Rahman", license: "KA123456789012", expiry: "2026-08-15", contact: "+91-9876543210", vehicle: "KA-01-AB-1234", route: "Bangalore North", status: "On Route" },
  { id: "DR-002", name: "Abdul Karim", license: "KA223456789013", expiry: "2025-12-20", contact: "+91-9876543211", vehicle: "KA-02-CD-5678", route: "Bangalore South", status: "Available" },
  { id: "DR-003", name: "Mohammad Hasan", license: "KA323456789014", expiry: "2026-03-10", contact: "+91-9876543212", vehicle: "KA-03-EF-9012", route: "HSR - Koramangala", status: "Off Duty" },
  { id: "DR-004", name: "Abdullah Ali", license: "TN123456789015", expiry: "2027-01-05", contact: "+91-9876543213", vehicle: "KA-04-GH-3456", route: "Chennai Central", status: "On Route" },
];

export const routes = [
  { id: "RT-001", name: "Bangalore North Circuit", stops: 12, distance: "45 km", avgTime: "4h 30m" },
  { id: "RT-002", name: "Bangalore South Circuit", stops: 15, distance: "52 km", avgTime: "5h 15m" },
  { id: "RT-003", name: "HSR - Koramangala Express", stops: 8, distance: "28 km", avgTime: "3h" },
  { id: "RT-004", name: "Whitefield - Electronic City", stops: 10, distance: "38 km", avgTime: "4h" },
];

export const invoices = [
  { id: "INV-2025-0001", customer: "Rahman Pharmacy - Dhaka", date: "2025-01-15", amount: 45680.50, mode: "Credit", status: "Paid", dueDate: "2025-02-14" },
  { id: "INV-2025-0002", customer: "Karim Medical - Chittagong", date: "2025-01-15", amount: 32450.00, mode: "Cash", status: "Paid", dueDate: "2025-01-15" },
  { id: "INV-2025-0003", customer: "Hasan Pharmacy - Sylhet", date: "2025-01-14", amount: 58920.75, mode: "Credit", status: "Pending", dueDate: "2025-02-13" },
  { id: "INV-2025-0004", customer: "Ali Pharmacy - Rajshahi", date: "2025-01-14", amount: 67340.00, mode: "Credit", status: "Overdue", dueDate: "2025-01-29" },
  { id: "INV-2025-0005", customer: "Islamia Pharmacy - Khulna", date: "2025-01-13", amount: 41200.25, mode: "Cash", status: "Paid", dueDate: "2025-01-13" },
];

