import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import Login from "@/pages/Login";
import SampleGiftDeliveryList from "@/pages/delivery/SampleGiftDeliveryList";
import SampleGiftDeliveryForm from "@/pages/delivery/SampleGiftDeliveryForm";
import SampleGiftDeliveryDetail from "@/pages/delivery/SampleGiftDeliveryDetail";
import SampleGiftDraftPreview from "@/pages/delivery/SampleGiftDraftPreview";
import ExportDeliveryList from "@/pages/delivery/ExportDeliveryList";
import ExportDeliveryForm from "@/pages/delivery/ExportDeliveryForm";
import ExportDeliveryDetail from "@/pages/delivery/ExportDeliveryDetail";
import ExportDraftPreview from "@/pages/delivery/ExportDraftPreview";
import IsolatedHome from "./IsolatedHome";
import { IsolatedWorkflowBar } from "./IsolatedWorkflowBar";
import WarehouseDocumentPreview from "./WarehouseDocumentPreview";

const queryClient = new QueryClient();

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<MainLayout><IsolatedHome /></MainLayout>} />
      <Route path="/delivery/sample-gift" element={<MainLayout><SampleGiftDeliveryList /></MainLayout>} />
      <Route path="/delivery/sample-gift/new" element={<MainLayout><SampleGiftDeliveryForm /></MainLayout>} />
      <Route path="/delivery/sample-gift/:id/edit" element={<MainLayout><SampleGiftDeliveryForm /></MainLayout>} />
      <Route path="/delivery/sample-gift/:id/preview" element={<MainLayout><SampleGiftDraftPreview /></MainLayout>} />
      <Route path="/delivery/sample-gift/:id/warehouse/:docType" element={<MainLayout><WarehouseDocumentPreview /></MainLayout>} />
      <Route path="/delivery/sample-gift/:id/warehouse" element={<MainLayout><WarehouseDocumentPreview /></MainLayout>} />
      <Route
        path="/delivery/sample-gift/:id"
        element={(
          <MainLayout>
            <IsolatedWorkflowBar module="sample_gift" />
            <SampleGiftDeliveryDetail />
          </MainLayout>
        )}
      />
      <Route path="/delivery/export" element={<MainLayout><ExportDeliveryList /></MainLayout>} />
      <Route path="/delivery/export/new" element={<MainLayout><ExportDeliveryForm /></MainLayout>} />
      <Route path="/delivery/export/:id/edit" element={<MainLayout><ExportDeliveryForm /></MainLayout>} />
      <Route path="/delivery/export/:id/preview" element={<MainLayout><ExportDraftPreview /></MainLayout>} />
      <Route path="/delivery/export/:id/warehouse/:docType" element={<MainLayout><WarehouseDocumentPreview /></MainLayout>} />
      <Route path="/delivery/export/:id/warehouse" element={<MainLayout><WarehouseDocumentPreview /></MainLayout>} />
      <Route
        path="/delivery/export/:id"
        element={(
          <MainLayout>
            <IsolatedWorkflowBar module="export" />
            <ExportDeliveryDetail />
          </MainLayout>
        )}
      />
      <Route path="*" element={<MainLayout><IsolatedHome /></MainLayout>} />
    </>,
  ),
);

export default function IsolatedWorkflowApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <RouterProvider router={router} />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
