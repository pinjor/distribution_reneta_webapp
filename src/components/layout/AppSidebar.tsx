import {
  Home,
  Package,
  Truck,
  Settings,
  CheckSquare,
  CreditCard,
  BarChart3,
  ChevronDown,
  PackagePlus,
  PackageMinus,
  Wrench,
  AlertCircle,
  Car,
  Users,
  MapPin,
  GitCompare,
  Building2,
  Warehouse,
  UserSquare2,
  UserCheck,
  Package2,
  MapPinned,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useEffect } from "react";

const menuItems = [
  { title: "Dashboard", icon: Home, path: "/" },
  {
    title: "Warehouse",
    icon: Package,
    subItems: [
      { title: "Stock Receipt", icon: PackagePlus, path: "/warehouse/receipt" },
      { title: "Stock Issuance", icon: PackageMinus, path: "/warehouse/issuance" },
      { title: "Stock Maintenance", icon: Wrench, path: "/warehouse/maintenance" },
      { title: "Stock Adjustment", icon: AlertCircle, path: "/warehouse/adjustment" },
    ],
  },
  {
    title: "Distribution",
    icon: Truck,
    subItems: [
      { title: "Vehicles", icon: Car, path: "/distribution/vehicles" },
      { title: "Drivers", icon: Users, path: "/distribution/drivers" },
      { title: "Route Planning", icon: MapPin, path: "/distribution/routes" },
      { title: "Reconciliation", icon: GitCompare, path: "/distribution/reconciliation" },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    subItems: [
      { title: "Company", icon: Building2, path: "/settings/company" },
      { title: "Depot", icon: Warehouse, path: "/settings/depot" },
      { title: "Employees", icon: UserSquare2, path: "/settings/employees" },
      { title: "Customers", icon: UserCheck, path: "/settings/customers" },
      { title: "Vendors", icon: Users, path: "/settings/vendors" },
      { title: "Materials", icon: Package2, path: "/settings/materials" },
      { title: "Shipping Points", icon: MapPinned, path: "/settings/shipping-points" },
    ],
  },
  { title: "Approvals", icon: CheckSquare, path: "/approvals" },
  { title: "Billing", icon: CreditCard, path: "/billing" },
  { title: "Analytics", icon: BarChart3, path: "/analytics" },
];

export function AppSidebar() {
  const location = useLocation();
  const { open } = useSidebar();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  // Auto-open parent menu if child is active
  useEffect(() => {
    const newOpenMenus: Record<string, boolean> = {};
    menuItems.forEach((item) => {
      if (item.subItems) {
        const hasActiveChild = item.subItems.some((sub) => location.pathname === sub.path);
        if (hasActiveChild) {
          newOpenMenus[item.title] = true;
        }
      }
    });
    setOpenMenus(newOpenMenus);
  }, [location.pathname]);

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isActive = (path: string) => location.pathname === path;
  const isParentActive = (subItems?: any[]) =>
    subItems?.some((item) => location.pathname === item.path);

  return (
    <Sidebar className={open ? "w-64" : "w-16"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 px-4 py-3">
            {open && "Main Menu"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) =>
                item.subItems ? (
                  <Collapsible
                    key={item.title}
                    open={openMenus[item.title]}
                    onOpenChange={() => toggleMenu(item.title)}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className={`flex items-center gap-3 px-4 py-3 rounded-button transition-colors ${
                            isParentActive(item.subItems)
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "hover:bg-sidebar-accent text-sidebar-foreground"
                          }`}
                        >
                          <item.icon className="h-5 w-5" />
                          {open && (
                            <>
                              <span className="text-sm font-medium flex-1">{item.title}</span>
                              <ChevronDown
                                className={`h-4 w-4 transition-transform duration-200 ${
                                  openMenus[item.title] ? "rotate-180" : ""
                                }`}
                              />
                            </>
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      {open && (
                        <CollapsibleContent className="animate-accordion-down">
                          <SidebarMenuSub>
                            {item.subItems.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton asChild isActive={isActive(subItem.path)}>
                                  <NavLink
                                    to={subItem.path}
                                    className={`flex items-center gap-3 px-4 py-2.5 pl-12 rounded-button transition-colors ${
                                      isActive(subItem.path)
                                        ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                                        : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                                    }`}
                                  >
                                    <subItem.icon className="h-4 w-4" />
                                    <span className="text-sm">{subItem.title}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      )}
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.path || "")}>
                      <NavLink
                        to={item.path || "/"}
                        className={`flex items-center gap-3 px-4 py-3 rounded-button transition-colors ${
                          isActive(item.path || "")
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "hover:bg-sidebar-accent text-sidebar-foreground"
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                        {open && <span className="text-sm font-medium">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
