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
import StockReceipt from "./pages/StockReceipt";
import StockIssuance from "./pages/StockIssuance";
import OrderEntry from "./pages/orders/OrderEntry";
import OrderListPage from "./pages/orders/OrderListPage";
import RouteWiseOrderList from "./pages/orders/RouteWiseOrderList";
import AssignedOrderList from "./pages/orders/AssignedOrderList";
import DistributionCockpit from "./pages/orders/DistributionCockpit";
import ApprovalForCollection from "./pages/orders/ApprovalForCollection";
import MISReport from "./pages/orders/MISReport";
import CollectionDeposits from "./pages/billing/CollectionDeposits";
import CollectionReports from "./pages/billing/CollectionReports";
import RemainingCashDeposit from "./pages/billing/RemainingCashDeposit";
import ReceiveFactory from "./pages/receive/ReceiveFactory";
import ReceiveDepot from "./pages/receive/ReceiveDepot";
import ReceiveReturn from "./pages/receive/ReceiveReturn";
import ReceiveList from "./pages/receive/ReceiveList";
import ReceiveReport from "./pages/receive/ReceiveReport";
import OrderDeliveryList from "./pages/orders/OrderDeliveryList";
import OrderDeliveryDetail from "./pages/orders/OrderDeliveryDetail";
import OrderTrackingPage from "./pages/orders/OrderTrackingPage";
import PackingBoard from "./pages/orders/PackingBoard";
import PackingReport from "./pages/orders/PackingReport";
import PickingOrdersList from "./pages/orders/PickingOrdersList";
import PickingOrderCreate from "./pages/orders/PickingOrderCreate";
import PickingOrderDetail from "./pages/orders/PickingOrderDetail";
import PickingOrderPrint from "./pages/orders/PickingOrderPrint";
import VehicleLoading from "./pages/VehicleLoading";
import StockMaintenance from "./pages/StockMaintenance";
import StockAdjustment from "./pages/StockAdjustment";
import NewAdjustment from "./pages/NewAdjustment";
import AdjustmentRequest from "./pages/AdjustmentRequest";
import Vehicles from "./pages/Vehicles";
import Drivers from "./pages/Drivers";
import RoutePlanning from "./pages/RoutePlanning";
import Reconciliation from "./pages/Reconciliation";
import Masters from "./pages/Masters";
import DepotDeliveryList from "./pages/delivery/DepotDeliveryList";
import DepotDeliveryForm from "./pages/delivery/DepotDeliveryForm";
import DepotDeliveryDetail from "./pages/delivery/DepotDeliveryDetail";
import SampleGiftDeliveryList from "./pages/delivery/SampleGiftDeliveryList";
import SampleGiftDeliveryForm from "./pages/delivery/SampleGiftDeliveryForm";
import SampleGiftDeliveryDetail from "./pages/delivery/SampleGiftDeliveryDetail";
import ExportDeliveryList from "./pages/delivery/ExportDeliveryList";
import ExportDeliveryForm from "./pages/delivery/ExportDeliveryForm";
import ExportDeliveryDetail from "./pages/delivery/ExportDeliveryDetail";
import Company from "./pages/settings/Company";
import Depot from "./pages/settings/Depot";
import Employees from "./pages/settings/Employees";
import Customers from "./pages/settings/Customers";
import Vendors from "./pages/settings/Vendors";
import Products from "./pages/settings/Products";
import ShippingPoints from "./pages/settings/ShippingPoints";
import UOM from "./pages/settings/UOM";
import PrimaryPackaging from "./pages/settings/PrimaryPackaging";
import PriceSetup from "./pages/settings/PriceSetup";
import RoleMaster from "./pages/settings/RoleMaster";
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
              <Route path="/warehouse/receipt" element={<MainLayout><StockReceipt /></MainLayout>} />
              <Route path="/warehouse/issuance" element={<MainLayout><StockIssuance /></MainLayout>} />
              <Route path="/orders/new" element={<MainLayout><OrderEntry /></MainLayout>} />
              <Route path="/orders" element={<MainLayout><OrderListPage /></MainLayout>} />
              <Route path="/orders/route-wise" element={<MainLayout><RouteWiseOrderList /></MainLayout>} />
              <Route path="/orders/assigned" element={<MainLayout><AssignedOrderList /></MainLayout>} />
              <Route path="/orders/collection-approval" element={<MainLayout><ApprovalForCollection /></MainLayout>} />
              <Route path="/orders/mis-report" element={<MainLayout><MISReport /></MainLayout>} />
              <Route path="/distribution/cockpit" element={<MainLayout><DistributionCockpit /></MainLayout>} />
              <Route path="/orders/delivery" element={<MainLayout><OrderDeliveryList /></MainLayout>} />
              <Route path="/orders/delivery/:id" element={<MainLayout><OrderDeliveryDetail /></MainLayout>} />
              <Route path="/orders/tracking" element={<MainLayout><OrderTrackingPage /></MainLayout>} />
              <Route path="/orders/picking" element={<MainLayout><PackingBoard /></MainLayout>} />
              <Route path="/orders/picking/report" element={<MainLayout><PackingReport /></MainLayout>} />
              <Route path="/orders/loading-request" element={<MainLayout><PickingOrdersList /></MainLayout>} />
              <Route path="/orders/loading-request/new" element={<MainLayout><PickingOrderCreate /></MainLayout>} />
              <Route path="/orders/loading-request/:id" element={<MainLayout><PickingOrderDetail /></MainLayout>} />
              <Route path="/orders/loading-request/:id/print" element={<MainLayout><PickingOrderPrint /></MainLayout>} />
              <Route path="/orders/loading-list" element={<MainLayout><VehicleLoading /></MainLayout>} />
              <Route path="/delivery/depot" element={<MainLayout><DepotDeliveryList /></MainLayout>} />
              <Route path="/delivery/depot/new" element={<MainLayout><DepotDeliveryForm /></MainLayout>} />
              <Route path="/delivery/depot/:id" element={<MainLayout><DepotDeliveryDetail /></MainLayout>} />
              <Route path="/delivery/sample-gift" element={<MainLayout><SampleGiftDeliveryList /></MainLayout>} />
              <Route path="/delivery/sample-gift/new" element={<MainLayout><SampleGiftDeliveryForm /></MainLayout>} />
              <Route path="/delivery/sample-gift/:id" element={<MainLayout><SampleGiftDeliveryDetail /></MainLayout>} />
              <Route path="/delivery/export" element={<MainLayout><ExportDeliveryList /></MainLayout>} />
              <Route path="/delivery/export/new" element={<MainLayout><ExportDeliveryForm /></MainLayout>} />
              <Route path="/delivery/export/:id" element={<MainLayout><ExportDeliveryDetail /></MainLayout>} />
              <Route path="/receive/factory" element={<MainLayout><ReceiveFactory /></MainLayout>} />
              <Route path="/receive/depot" element={<MainLayout><ReceiveDepot /></MainLayout>} />
              <Route path="/receive/return" element={<MainLayout><ReceiveReturn /></MainLayout>} />
              <Route path="/receive/list" element={<MainLayout><ReceiveList /></MainLayout>} />
              <Route path="/receive/report/:id" element={<MainLayout><ReceiveReport /></MainLayout>} />
              <Route path="/warehouse/issuance/loading" element={<MainLayout><VehicleLoading /></MainLayout>} />
              <Route path="/warehouse/maintenance" element={<MainLayout><StockMaintenance /></MainLayout>} />
              <Route path="/warehouse/adjustment" element={<MainLayout><StockAdjustment /></MainLayout>} />
              <Route path="/warehouse/adjustment/new" element={<MainLayout><NewAdjustment /></MainLayout>} />
              <Route path="/warehouse/adjustment/request" element={<MainLayout><AdjustmentRequest /></MainLayout>} />
              <Route path="/distribution/vehicles" element={<MainLayout><Vehicles /></MainLayout>} />
              <Route path="/distribution/drivers" element={<MainLayout><Drivers /></MainLayout>} />
              <Route path="/distribution/routes" element={<MainLayout><RoutePlanning /></MainLayout>} />
              <Route path="/distribution/reconciliation" element={<MainLayout><Reconciliation /></MainLayout>} />
              <Route path="/masters" element={<MainLayout><Masters /></MainLayout>} />
              <Route path="/settings/company" element={<MainLayout><Company /></MainLayout>} />
              <Route path="/settings/depot" element={<MainLayout><Depot /></MainLayout>} />
              <Route path="/settings/employees" element={<MainLayout><Employees /></MainLayout>} />
              <Route path="/settings/customers" element={<MainLayout><Customers /></MainLayout>} />
              <Route path="/settings/vendors" element={<MainLayout><Vendors /></MainLayout>} />
              <Route path="/settings/products" element={<MainLayout><Products /></MainLayout>} />
              <Route path="/settings/shipping-points" element={<MainLayout><ShippingPoints /></MainLayout>} />
              <Route path="/settings/uom" element={<MainLayout><UOM /></MainLayout>} />
              <Route path="/settings/primary-packaging" element={<MainLayout><PrimaryPackaging /></MainLayout>} />
              <Route path="/settings/price-setup" element={<MainLayout><PriceSetup /></MainLayout>} />
              <Route path="/settings/role-master" element={<MainLayout><RoleMaster /></MainLayout>} />
              <Route path="/billing/deposits" element={<MainLayout><CollectionDeposits /></MainLayout>} />
              <Route path="/billing/deposits/remaining-cash" element={<MainLayout><RemainingCashDeposit /></MainLayout>} />
              <Route path="/billing/reports" element={<MainLayout><CollectionReports /></MainLayout>} />
              <Route path="*" element={<MainLayout><NotFound /></MainLayout>} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
