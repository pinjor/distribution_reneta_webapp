import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { apiEndpoints } from "@/lib/api";

export interface UserDepot {
  id: number;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
}

export interface User {
  id: number;
  employee_id: string;
  email: string;
  first_name: string;
  last_name?: string;
  role: string;
  department?: string;
  designation?: string;
  phone?: string;
  depot_id?: number;
  depot?: UserDepot | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User, rememberMe?: boolean) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function persistUser(userData: User) {
  localStorage.setItem("user", JSON.stringify(userData));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const profile = await apiEndpoints.auth.me();
      setUser(profile);
      persistUser(profile);
    } catch (error) {
      console.error("Failed to refresh profile:", error);
      logout();
    }
  }, [logout]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (!token) {
        setIsLoading(false);
        return;
      }

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          logout();
        }
      }

      await refreshUser();
      setIsLoading(false);
    };

    checkAuth();
  }, [logout, refreshUser]);

  const login = (token: string, userData: User, rememberMe = false) => {
    if (rememberMe) {
      localStorage.setItem("token", token);
      sessionStorage.removeItem("token");
    } else {
      sessionStorage.setItem("token", token);
      localStorage.removeItem("token");
    }
    persistUser(userData);
    setUser(userData);
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function getUserDisplayName(user: User | null): string {
  if (!user) return "User";
  return [user.first_name, user.last_name].filter(Boolean).join(" ");
}

export function getUserInitials(user: User | null): string {
  if (!user) return "U";
  const first = user.first_name?.[0] ?? "";
  const last = user.last_name?.[0] ?? "";
  return (first + last).toUpperCase() || "U";
}

export function formatRoleLabel(role?: string): string {
  if (!role) return "User";
  return role.charAt(0).toUpperCase() + role.slice(1);
}
