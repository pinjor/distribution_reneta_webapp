import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Approvals from "./pages/Approvals";
import StockReceipt from "./pages/StockReceipt";
import StockIssuance from "./pages/StockIssuance";
import OrderList from "./pages/OrderList";
import VehicleLoading from "./pages/VehicleLoading";
import StockMaintenance from "./pages/StockMaintenance";
import StockAdjustment from "./pages/StockAdjustment";
import NewAdjustment from "./pages/NewAdjustment";
import AdjustmentRequest from "./pages/AdjustmentRequest";
import Vehicles from "./pages/Vehicles";
import Drivers from "./pages/Drivers";
import RoutePlanning from "./pages/RoutePlanning";
import Reconciliation from "./pages/Reconciliation";
import Billing from "./pages/Billing";
import Analytics from "./pages/Analytics";
import Masters from "./pages/Masters";
import Company from "./pages/settings/Company";
import Depot from "./pages/settings/Depot";
import Employees from "./pages/settings/Employees";
import Customers from "./pages/settings/Customers";
import Vendors from "./pages/settings/Vendors";
import Products from "./pages/settings/Products";
import Materials from "./pages/settings/Materials";
import ShippingPoints from "./pages/settings/ShippingPoints";
import UOM from "./pages/settings/UOM";
import PrimaryPackaging from "./pages/settings/PrimaryPackaging";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
              <Route path="/approvals" element={<MainLayout><Approvals /></MainLayout>} />
              <Route path="/warehouse/receipt" element={<MainLayout><StockReceipt /></MainLayout>} />
              <Route path="/warehouse/issuance" element={<MainLayout><StockIssuance /></MainLayout>} />
              <Route path="/warehouse/issuance/orders" element={<MainLayout><OrderList /></MainLayout>} />
              <Route path="/warehouse/issuance/loading" element={<MainLayout><VehicleLoading /></MainLayout>} />
              <Route path="/warehouse/maintenance" element={<MainLayout><StockMaintenance /></MainLayout>} />
              <Route path="/warehouse/adjustment" element={<MainLayout><StockAdjustment /></MainLayout>} />
              <Route path="/warehouse/adjustment/new" element={<MainLayout><NewAdjustment /></MainLayout>} />
              <Route path="/warehouse/adjustment/request" element={<MainLayout><AdjustmentRequest /></MainLayout>} />
              <Route path="/distribution/vehicles" element={<MainLayout><Vehicles /></MainLayout>} />
              <Route path="/distribution/drivers" element={<MainLayout><Drivers /></MainLayout>} />
              <Route path="/distribution/routes" element={<MainLayout><RoutePlanning /></MainLayout>} />
              <Route path="/distribution/reconciliation" element={<MainLayout><Reconciliation /></MainLayout>} />
              <Route path="/billing" element={<MainLayout><Billing /></MainLayout>} />
              <Route path="/analytics" element={<MainLayout><Analytics /></MainLayout>} />
              <Route path="/masters" element={<MainLayout><Masters /></MainLayout>} />
              <Route path="/settings/company" element={<MainLayout><Company /></MainLayout>} />
              <Route path="/settings/depot" element={<MainLayout><Depot /></MainLayout>} />
              <Route path="/settings/employees" element={<MainLayout><Employees /></MainLayout>} />
              <Route path="/settings/customers" element={<MainLayout><Customers /></MainLayout>} />
              <Route path="/settings/vendors" element={<MainLayout><Vendors /></MainLayout>} />
              <Route path="/settings/products" element={<MainLayout><Products /></MainLayout>} />
              <Route path="/settings/materials" element={<MainLayout><Materials /></MainLayout>} />
              <Route path="/settings/shipping-points" element={<MainLayout><ShippingPoints /></MainLayout>} />
              <Route path="/settings/uom" element={<MainLayout><UOM /></MainLayout>} />
              <Route path="/settings/primary-packaging" element={<MainLayout><PrimaryPackaging /></MainLayout>} />
              <Route path="*" element={<MainLayout><NotFound /></MainLayout>} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
