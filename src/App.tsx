import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/warehouse/receipt" element={<StockReceipt />} />
            <Route path="/warehouse/issuance" element={<StockIssuance />} />
            <Route path="/warehouse/issuance/orders" element={<OrderList />} />
            <Route path="/warehouse/issuance/loading" element={<VehicleLoading />} />
            <Route path="/warehouse/maintenance" element={<StockMaintenance />} />
            <Route path="/warehouse/adjustment" element={<StockAdjustment />} />
            <Route path="/warehouse/adjustment/new" element={<NewAdjustment />} />
            <Route path="/warehouse/adjustment/request" element={<AdjustmentRequest />} />
            <Route path="/distribution/vehicles" element={<Vehicles />} />
            <Route path="/distribution/drivers" element={<Drivers />} />
            <Route path="/distribution/routes" element={<RoutePlanning />} />
            <Route path="/distribution/reconciliation" element={<Reconciliation />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/masters" element={<Masters />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
