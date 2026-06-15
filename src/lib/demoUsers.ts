export interface DemoUser {
  id: string;
  label: string;
  role: string;
  email: string;
  password: string;
  description: string;
}

/** Seeded credentials from backend/db/seed_test_users.py */
export const DEMO_USERS: DemoUser[] = [
  {
    id: "admin",
    label: "Admin",
    role: "admin",
    email: "admin@swiftdistro.com",
    password: "admin123",
    description: "Full access — all modules and settings",
  },
  {
    id: "manager",
    label: "Manager",
    role: "manager",
    email: "john.smith@swiftdistro.com",
    password: "admin123",
    description: "Depot manager — orders, billing, reports",
  },
  {
    id: "user",
    label: "PSO / User",
    role: "user",
    email: "sarah.johnson@swiftdistro.com",
    password: "admin123",
    description: "Field user — assigned orders and collections",
  },
];
