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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { AppBrand } from "@/components/layout/AppBrand";
import { SIDEBAR_MENU } from "@/lib/menuNavigation";
import { cn } from "@/lib/utils";

const menuItems = SIDEBAR_MENU;

/** Two-line label with full-text tooltip when visually clamped. */
function NavLabel({
  children,
  className,
  forceTooltip = false,
}: {
  children: string;
  className?: string;
  forceTooltip?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      setTruncated(el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);
    };

    check();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(check) : null;
    ro?.observe(el);
    window.addEventListener("resize", check);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", check);
    };
  }, [children]);

  const label = (
    <span
      ref={ref}
      className={cn(
        "min-w-0 flex-1 text-left leading-snug break-words whitespace-normal line-clamp-2",
        className,
      )}
    >
      {children}
    </span>
  );

  if (!truncated && !forceTooltip) {
    return label;
  }

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>{label}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        sideOffset={10}
        className="z-[80] max-w-xs border-sidebar-border bg-[#14263D] text-sidebar-foreground shadow-lg"
      >
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

function ParentButtonClasses(active: boolean) {
  return cn(
    "relative flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150",
    "[&>span:last-child]:whitespace-normal",
    active
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
      : "hover:bg-sidebar-accent/80 text-sidebar-foreground font-semibold",
  );
}

function ChildLinkClasses(active: boolean, nested = false) {
  return cn(
    "relative flex items-start gap-2 rounded-lg transition-colors duration-150",
    "[&>span:last-child]:whitespace-normal",
    nested ? "px-3 py-2 pl-4" : "px-3 py-2",
    active
      ? "bg-sidebar-primary/20 text-sidebar-primary-foreground font-medium before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-full before:bg-sidebar-primary"
      : "hover:bg-sidebar-accent/50 text-sidebar-foreground/85 font-normal",
  );
}

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

  const chevron = (isOpen: boolean, size: "sm" | "md" = "md"): ReactNode => (
    <ChevronDown
      className={cn(
        "shrink-0 text-sidebar-foreground/60 transition-transform duration-200 ease-out motion-reduce:transition-none",
        size === "sm" ? "h-3.5 w-3.5 mt-0.5" : "h-4 w-4 mt-0.5",
        isOpen && "rotate-180",
      )}
      aria-hidden
    />
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="sticky top-0 z-10 shrink-0 border-b border-sidebar-border/80 bg-sidebar px-3 py-3.5">
        <AppBrand collapsed={!open} variant="sidebar" />
      </SidebarHeader>
      <SidebarContent className="px-1 pb-3">
        <SidebarGroup className="py-2">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
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
                          className={ParentButtonClasses(Boolean(isParentActive(item.subItems)))}
                        >
                          <item.icon className="h-5 w-5 shrink-0 mt-0.5 opacity-90" />
                          {open && (
                            <>
                              <NavLabel className="text-sm font-semibold">{item.title}</NavLabel>
                              {chevron(Boolean(openMenus[item.title]))}
                            </>
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      {open && (
                        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                          <SidebarMenuSub className="mx-2 mt-1 mb-1 border-l border-sidebar-border/70 pl-2">
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
                                        className={cn(
                                          ChildLinkClasses(Boolean(isParentActive(subItem.subItems))),
                                          "w-full cursor-pointer",
                                        )}
                                      >
                                        <subItem.icon className="h-4 w-4 flex-shrink-0 opacity-80" />
                                        <NavLabel className="text-[13px]">{subItem.title}</NavLabel>
                                        {chevron(Boolean(openMenus[subItem.title]), "sm")}
                                      </SidebarMenuSubButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                                      <SidebarMenuSub className="mx-1 mt-0.5 border-l border-sidebar-border/50 pl-2">
                                        {subItem.subItems.map((nestedItem) => (
                                          <SidebarMenuSubItem key={nestedItem.title}>
                                            <SidebarMenuSubButton
                                              asChild
                                              isActive={isActive(nestedItem.path)}
                                            >
                                              <NavLink
                                                to={nestedItem.path}
                                                className={ChildLinkClasses(
                                                  isActive(nestedItem.path),
                                                  true,
                                                )}
                                              >
                                                <nestedItem.icon className="h-3.5 w-3.5 flex-shrink-0 opacity-75" />
                                                <NavLabel className="text-[13px]">
                                                  {nestedItem.title}
                                                </NavLabel>
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
                                  >
                                    <NavLink
                                      to={subItem.path}
                                      className={ChildLinkClasses(isActive(subItem.path))}
                                    >
                                      <subItem.icon className="h-4 w-4 flex-shrink-0 opacity-80" />
                                      <NavLabel className="text-[13px]">{subItem.title}</NavLabel>
                                    </NavLink>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ),
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
                        className={cn(
                          "relative flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150",
                          isActive(item.path || "")
                            ? "bg-sidebar-primary/20 text-sidebar-primary-foreground font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-full before:bg-sidebar-primary"
                            : "hover:bg-sidebar-accent text-sidebar-foreground font-semibold",
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0 mt-0.5" />
                        {open && (
                          <NavLabel className="text-sm font-semibold">{item.title}</NavLabel>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ),
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
