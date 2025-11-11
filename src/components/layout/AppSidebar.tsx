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
  PlusCircle,
  List,
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
  ClipboardList,
  TruckIcon,
  Ruler,
  DollarSign,
  PackageCheck,
  ClipboardCheck,
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
      { 
        title: "Stock Issuance", 
        icon: PackageMinus, 
        subItems: [
          { title: "Order List", icon: ClipboardList, path: "/warehouse/issuance/orders" },
          { title: "Vehicle Loading Panel", icon: TruckIcon, path: "/warehouse/issuance/loading" },
        ]
      },
      { title: "Stock Maintenance", icon: Wrench, path: "/warehouse/maintenance" },
      { 
        title: "Stock Adjustment", 
        icon: AlertCircle, 
        subItems: [
          { title: "New Adjustment", icon: PlusCircle, path: "/warehouse/adjustment/new" },
          { title: "Adjustment Request", icon: List, path: "/warehouse/adjustment/request" },
        ]
      },
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
    title: "Receive Product",
    icon: Package2,
    subItems: [
      { title: "Receive from Factory", icon: PlusCircle, path: "/receive/factory" },
      { title: "Receive from Depot", icon: PackagePlus, path: "/receive/depot" },
      { title: "Stock Return Receive", icon: PackageMinus, path: "/receive/return" },
      { title: "All Receipts", icon: ClipboardList, path: "/receive/list" },
    ],
  },
  {
    title: "Order Management",
    icon: ClipboardList,
    subItems: [
      { title: "Order", icon: PlusCircle, path: "/orders/new" },
      { title: "Order List", icon: List, path: "/orders" },
      { title: "Delivery Orders", icon: TruckIcon, path: "/orders/delivery" },
      { title: "Packing", icon: PackageCheck, path: "/orders/packing" },
      { title: "Picking", icon: ClipboardCheck, path: "/orders/picking" },
      { title: "Order Tracking", icon: MapPinned, path: "/orders/tracking" },
    ],
  },
  {
    title: "Master Data",
    icon: Settings,
    subItems: [
      { title: "Company", icon: Building2, path: "/settings/company" },
      { title: "Depot", icon: Warehouse, path: "/settings/depot" },
      { title: "Employees", icon: UserSquare2, path: "/settings/employees" },
      { title: "Customers", icon: UserCheck, path: "/settings/customers" },
      { title: "Vendors", icon: Users, path: "/settings/vendors" },
      { title: "Products", icon: Package, path: "/settings/products" },
      { title: "Materials", icon: Package2, path: "/settings/materials" },
      { title: "Shipping Points", icon: MapPinned, path: "/settings/shipping-points" },
      { title: "UOM", icon: Ruler, path: "/settings/uom" },
      { title: "Primary Packaging", icon: Package2, path: "/settings/primary-packaging" },
      { title: "Price Setup", icon: DollarSign, path: "/settings/price-setup" },
      { title: "Role Master", icon: Users, path: "/settings/role-master" },
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
        const hasActiveChild = item.subItems.some((sub) => {
          if (sub.path) return location.pathname === sub.path;
          if (sub.subItems) {
            const hasNestedActive = sub.subItems.some((nested) => location.pathname === nested.path);
            if (hasNestedActive) newOpenMenus[sub.title] = true;
            return hasNestedActive;
          }
          return false;
        });
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
    subItems?.some((item) => {
      if (item.path) return location.pathname === item.path;
      if (item.subItems) return item.subItems.some((nested: any) => location.pathname === nested.path);
      return false;
    });

  return (
    <Sidebar className={open ? "w-72" : "w-16"} collapsible="icon">
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
                            {item.subItems.map((subItem) => 
                              subItem.subItems ? (
                                <Collapsible
                                  key={subItem.title}
                                  open={openMenus[subItem.title]}
                                  onOpenChange={() => toggleMenu(subItem.title)}
                                >
                                  <SidebarMenuSubItem>
                                    <CollapsibleTrigger asChild>
                                      <SidebarMenuSubButton
                                        className={`flex items-center gap-2 px-3 py-2 pl-10 rounded-button transition-colors ${
                                          isParentActive(subItem.subItems)
                                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                            : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                                        }`}
                                      >
                                        <subItem.icon className="h-4 w-4 flex-shrink-0" />
                                        <span className="text-sm flex-1 truncate">{subItem.title}</span>
                                        <ChevronDown
                                          className={`h-3 w-3 transition-transform duration-200 ${
                                            openMenus[subItem.title] ? "rotate-180" : ""
                                          }`}
                                        />
                                      </SidebarMenuSubButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="animate-accordion-down">
                                      <SidebarMenuSub>
                                        {subItem.subItems.map((nestedItem) => (
                                          <SidebarMenuSubItem key={nestedItem.title}>
                                             <SidebarMenuSubButton asChild isActive={isActive(nestedItem.path)}>
                                               <NavLink
                                                 to={nestedItem.path}
                                                 className={`flex items-center gap-2 px-3 py-2 pl-16 rounded-button transition-colors ${
                                                   isActive(nestedItem.path)
                                                     ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                                                     : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                                                 }`}
                                               >
                                                 <nestedItem.icon className="h-3.5 w-3.5 flex-shrink-0" />
                                                 <span className="text-sm truncate">{nestedItem.title}</span>
                                              </NavLink>
                                            </SidebarMenuSubButton>
                                          </SidebarMenuSubItem>
                                        ))}
                                      </SidebarMenuSub>
                                    </CollapsibleContent>
                                  </SidebarMenuSubItem>
                                </Collapsible>
                              ) : (
                                <SidebarMenuSubItem key={subItem.title}>
                                   <SidebarMenuSubButton asChild isActive={isActive(subItem.path)}>
                                     <NavLink
                                       to={subItem.path}
                                       className={`flex items-center gap-2 px-3 py-2 pl-10 rounded-button transition-colors ${
                                         isActive(subItem.path)
                                           ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                                           : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                                       }`}
                                     >
                                       <subItem.icon className="h-4 w-4 flex-shrink-0" />
                                       <span className="text-sm truncate">{subItem.title}</span>
                                    </NavLink>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              )
                            )}
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
