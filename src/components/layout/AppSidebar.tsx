import { ChevronDown } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
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
import { AppBrand } from "@/components/layout/AppBrand";
import { SIDEBAR_MENU, filterSidebarMenu } from "@/lib/menuNavigation";
import { usePermissions } from "@/hooks/usePermissions";

const menuLabelClass = "min-w-0 flex-1 whitespace-normal break-words text-sm leading-snug";
const subButtonFitClass =
  "h-auto min-h-7 overflow-visible py-1.5 [&>span:last-child]:whitespace-normal [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip";

export function AppSidebar() {
  const location = useLocation();
  const { open } = useSidebar();
  const permissions = usePermissions();
  const menuItems = filterSidebarMenu(SIDEBAR_MENU, permissions);
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
  }, [location.pathname, permissions]);

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
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <AppBrand collapsed={!open} variant="sidebar" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="py-2">
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) =>
                item.subItems ? (
                  <Collapsible
                    key={item.title}
                    open={openMenus[item.title] ?? false}
                    onOpenChange={() => toggleMenu(item.title)}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className={`flex h-auto min-h-8 items-center gap-3 overflow-visible px-4 py-3 rounded-button transition-colors [&>span:last-child]:whitespace-normal [&>span:last-child]:overflow-visible ${
                            isParentActive(item.subItems)
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "hover:bg-sidebar-accent text-sidebar-foreground"
                          }`}
                        >
                          <item.icon className="h-5 w-5" />
                          {open && (
                            <>
                              <span className={`${menuLabelClass} font-medium`}>{item.title}</span>
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
                                        className={`${subButtonFitClass} flex items-center gap-2 px-3 py-2 pl-10 rounded-button transition-colors ${
                                          isParentActive(subItem.subItems)
                                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                            : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                                        }`}
                                      >
                                        <subItem.icon className="h-4 w-4 flex-shrink-0" />
                                        <span className={menuLabelClass}>{subItem.title}</span>
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
                                             <SidebarMenuSubButton
                                               asChild
                                               isActive={isActive(nestedItem.path)}
                                               className={subButtonFitClass}
                                             >
                                               <NavLink
                                                 to={nestedItem.path}
                                                 className={`flex items-center gap-2 px-3 py-2 pl-6 rounded-button transition-colors ${
                                                   isActive(nestedItem.path)
                                                     ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                                                     : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                                                 }`}
                                               >
                                                 <nestedItem.icon className="h-3.5 w-3.5 flex-shrink-0" />
                                                 <span className={menuLabelClass}>{nestedItem.title}</span>
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
                                   <SidebarMenuSubButton
                                     asChild
                                     isActive={isActive(subItem.path)}
                                     className={subButtonFitClass}
                                   >
                                     <NavLink
                                       to={subItem.path}
                                       className={`flex items-center gap-2 px-3 py-2 pl-10 rounded-button transition-colors ${
                                         isActive(subItem.path)
                                           ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                                           : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                                       }`}
                                     >
                                       <subItem.icon className="h-4 w-4 flex-shrink-0" />
                                       <span className={menuLabelClass}>{subItem.title}</span>
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
                        {open && <span className={`${menuLabelClass} font-medium`}>{item.title}</span>}
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
