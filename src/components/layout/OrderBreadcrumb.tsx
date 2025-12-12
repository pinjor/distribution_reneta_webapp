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
  "/orders/collection-approval": "Approval for Collection",
  "/orders/mis-report": "MIS Report",
};

export function OrderBreadcrumb() {
  const location = useLocation();
  const pathname = location.pathname;

  // Only show breadcrumb on order management pages
  if (!pathname.startsWith("/orders")) {
    return null;
  }

  const breadcrumbItems = [
    {
      title: "Home",
      href: "/",
    },
    {
      title: "Order Management",
      href: "/distribution/cockpit",
    },
  ];

  // Get current page title
  const currentPageTitle = routeTitles[pathname] || pathname.split("/").pop()?.replace(/-/g, " ") || "Order";

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/" className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span>Home</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/distribution/cockpit">Order Management</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{currentPageTitle}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

