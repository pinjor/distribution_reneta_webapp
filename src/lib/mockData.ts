export const recentReceipts = [
  { id: "GR-2026-001", date: "2026-04-15", challan: "CH-45678", product: "Omeprazole Capsule 20 mg", batch: "2024001", qty: 5000, source: "Kushtia Depot" },
  { id: "GR-2026-002", date: "2026-04-14", challan: "CH-45679", product: "Paracetamol Tablet 500 mg", batch: "2024004", qty: 3000, source: "Khulna Depot" },
  { id: "GR-2026-003", date: "2026-04-14", challan: "CH-45680", product: "Amoxicillin Capsule 250 mg", batch: "2024006", qty: 4500, source: "Dhaka Central Depot" },
  { id: "GR-2026-004", date: "2026-04-13", challan: "CH-45681", product: "Cetirizine Tablet 10 mg", batch: "2024009", qty: 2000, source: "Kushtia Depot" },
  { id: "GR-2026-005", date: "2026-04-12", challan: "CH-45682", product: "Metformin Tablet 500 mg", batch: "2024010", qty: 6000, source: "Khulna Depot" },
  { id: "GR-2026-006", date: "2026-04-11", challan: "CH-45683", product: "Levetiracetam Syrup 100 ml", batch: "2024012", qty: 1500, source: "Square Pharmaceuticals" },
  { id: "GR-2026-007", date: "2026-04-10", challan: "CH-45684", product: "Tab Betahistine 16 mg", batch: "2024015", qty: 2800, source: "Beximco Factory" },
];

export const pendingOrders = [
  { id: "DO-2026-1001", customer: "Hospital Dispensary Satkania", items: "Omeprazole, Paracetamol", qty: 250, priority: "High", expiry: "2026-12-15" },
  { id: "DO-2026-1002", customer: "Heraj Market Pharmacy", items: "Amoxicillin 250mg", qty: 180, priority: "Medium", expiry: "2026-11-20" },
  { id: "DO-2026-1003", customer: "Rajbari Community Clinic", items: "Cetirizine, Metformin", qty: 320, priority: "High", expiry: "2026-10-30" },
  { id: "DO-2026-1004", customer: "SUFIA PHARMACY", items: "Paracetamol 500mg", qty: 500, priority: "Low", expiry: "2027-01-15" },
  { id: "DO-2026-1005", customer: "Dhaka Medical Pharmacy", items: "Omeprazole, Amoxicillin", qty: 400, priority: "Medium", expiry: "2026-12-25" },
  { id: "DO-2026-1006", customer: "Popular Pharmacy", items: "Levetiracetam Syrup", qty: 150, priority: "High", expiry: "2026-09-30" },
];

export const batchLedger = [
  { batch: "2024001", product: "Omeprazole Capsule 20 mg", storage: "Ambient", stock: 4750, reserved: 250, available: 4500, expiry: "2026-03-15", status: "Unrestricted" },
  { batch: "2024006", product: "Amoxicillin Capsule 250 mg", storage: "Cool", stock: 2820, reserved: 180, available: 2640, expiry: "2025-11-30", status: "Unrestricted" },
  { batch: "2024004", product: "Paracetamol Tablet 500 mg", storage: "Ambient", stock: 4100, reserved: 400, available: 3700, expiry: "2025-12-31", status: "Unrestricted" },
  { batch: "2024009", product: "Cetirizine Tablet 10 mg", storage: "Ambient", stock: 1680, reserved: 320, available: 1360, expiry: "2026-01-20", status: "Restricted" },
  { batch: "2024010", product: "Metformin Tablet 500 mg", storage: "Ambient", stock: 6000, reserved: 0, available: 6000, expiry: "2026-05-18", status: "Unrestricted" },
  { batch: "2024012", product: "Levetiracetam Syrup 100 ml", storage: "Cool", stock: 2200, reserved: 150, available: 2050, expiry: "2026-08-10", status: "Unrestricted" },
];

export const adjustmentRequests = [
  { id: "ADJ-2026-01", product: "Paracetamol Tablet 500 mg", batch: "2024004", qty: -50, reason: "Damaged", submittedBy: "Rahim Uddin", date: "2026-04-14", status: "Pending" },
  { id: "ADJ-2026-02", product: "Amoxicillin Capsule 250 mg", batch: "2024006", qty: 25, reason: "Cycle Count Variance", submittedBy: "Farhana Akter", date: "2026-04-13", status: "Approved" },
  { id: "ADJ-2026-03", product: "Cetirizine Tablet 10 mg", batch: "2024009", qty: -15, reason: "Quality Issue", submittedBy: "Karim Ahmed", date: "2026-04-12", status: "Rejected" },
  { id: "ADJ-2026-04", product: "Omeprazole Capsule 20 mg", batch: "2024001", qty: -30, reason: "Expired batch", submittedBy: "Rahim Uddin", date: "2026-04-11", status: "Pending" },
  { id: "ADJ-2026-05", product: "Metformin Tablet 500 mg", batch: "2024010", qty: 40, reason: "Found during audit", submittedBy: "Farhana Akter", date: "2026-04-10", status: "Approved" },
];

export const vehicles = [
  { id: "VH-001", type: "Refrigerated Van", regNo: "DH-KA-12-3456", capacity: 2000, depot: "Kushtia Depot", vendor: "MediCare Cold Chain BD", status: "Active" },
  { id: "VH-002", type: "Standard Truck", regNo: "KH-02-AB-5678", capacity: 5000, depot: "Khulna Depot", vendor: "Beximco Logistics", status: "Active" },
  { id: "VH-003", type: "Mini Truck", regNo: "DH-03-CD-9012", capacity: 1000, depot: "Dhaka Central Depot", vendor: "Incepta Transport", status: "Maintenance" },
  { id: "VH-004", type: "Refrigerated Truck", regNo: "CT-04-EF-3456", capacity: 3000, depot: "Kushtia Depot", vendor: "MediCare Cold Chain BD", status: "Active" },
  { id: "VH-005", type: "Covered Van", regNo: "RJ-05-GH-7890", capacity: 2500, depot: "Khulna Depot", vendor: "Opsonin Distribution", status: "Active" },
];

export const drivers = [
  { id: "DRV-001", name: "Mohammad Rahman", license: "DH123456789012", expiry: "2026-08-15", contact: "+880 1712-345678", vehicle: "DH-KA-12-3456", route: "Kushtia North", status: "On Route" },
  { id: "DRV-002", name: "Abdul Karim", license: "KH223456789013", expiry: "2025-12-20", contact: "+880 1812-345679", vehicle: "KH-02-AB-5678", route: "Khulna South", status: "Available" },
  { id: "DRV-003", name: "Mohammad Hasan", license: "DH323456789014", expiry: "2026-03-10", contact: "+880 1912-345680", vehicle: "DH-03-CD-9012", route: "Dhaka Central", status: "Off Duty" },
  { id: "DRV-004", name: "Abdullah Ali", license: "CT123456789015", expiry: "2027-01-05", contact: "+880 1612-345681", vehicle: "CT-04-EF-3456", route: "Chattogram Route", status: "On Route" },
  { id: "DRV-005", name: "Jamal Hossain", license: "RJ523456789016", expiry: "2026-06-30", contact: "+880 1512-345682", vehicle: "RJ-05-GH-7890", route: "Rajbari Circuit", status: "Available" },
];

export const routes = [
  { id: "R-1", name: "Kushtia North Circuit", stops: 12, distance: "45 km", avgTime: "4h 30m" },
  { id: "R-2", name: "Khulna South Circuit", stops: 15, distance: "52 km", avgTime: "5h 15m" },
  { id: "R-3", name: "Dhaka East Express", stops: 8, distance: "28 km", avgTime: "3h" },
  { id: "R-4", name: "Rajbari - Faridpur Route", stops: 10, distance: "38 km", avgTime: "4h" },
  { id: "R-5", name: "Chattogram Coastal Route", stops: 14, distance: "60 km", avgTime: "5h 45m" },
];

export const invoices = [
  { id: "INV-2026-0001", customer: "Hospital Dispensary Satkania", date: "2026-04-15", amount: 45680.50, mode: "Credit", status: "Paid", dueDate: "2026-05-15" },
  { id: "INV-2026-0002", customer: "Heraj Market Pharmacy", date: "2026-04-14", amount: 32450.00, mode: "Cash", status: "Paid", dueDate: "2026-04-14" },
  { id: "INV-2026-0003", customer: "Rajbari Community Clinic", date: "2026-04-13", amount: 58920.75, mode: "Credit", status: "Pending", dueDate: "2026-05-13" },
  { id: "INV-2026-0004", customer: "SUFIA PHARMACY", date: "2026-04-12", amount: 67340.00, mode: "Credit", status: "Overdue", dueDate: "2026-03-28" },
  { id: "INV-2026-0005", customer: "Dhaka Medical Pharmacy", date: "2026-04-11", amount: 41200.25, mode: "Cash", status: "Paid", dueDate: "2026-04-11" },
  { id: "INV-2026-0006", customer: "Popular Pharmacy", date: "2026-04-10", amount: 28750.00, mode: "Credit", status: "Pending", dueDate: "2026-05-10" },
];
