import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

const routeTitles: Record<string, string> = {
  "/orders/new": "Sales Order",
  "/orders": "Delivery Order",
  "/orders/route-wise": "Route Wise Memo List",
  "/orders/assigned": "Assigned Order List",
  "/orders/remaining-cash-list": "Remaining Cash and Collection",
  "/orders/collection-approval": "Approval for Collection",
  "/orders/mis-report": "MIS Report",
  "/orders/tracking": "Order Lifecycle Tracker",
};

export function OrderBreadcrumb() {
  const location = useLocation();
  const pathname = location.pathname;

  if (!pathname.startsWith("/orders")) {
    return null;
  }

  const currentPageTitle = routeTitles[pathname] || pathname.split("/").pop()?.replace(/-/g, " ") || "Order";

  return (
    <Breadcrumb className="mb-0 shrink-0">
      <BreadcrumbList className="text-[13px] text-[#64748B] dark:text-[#A9B8CC]">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/" className="inline-flex items-center gap-1 hover:text-[#0C4DA1]">
              <Home className="h-3.5 w-3.5" />
              <span>Home</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/distribution/cockpit" className="hover:text-[#0C4DA1]">
              Order Management
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="font-medium text-[#0C4DA1] dark:text-[#70ADFF]">{currentPageTitle}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
