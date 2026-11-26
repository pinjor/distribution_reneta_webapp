import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ClipboardList,
  Home,
  LayoutGrid,
  Package,
  PlusCircle,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCockpitSections, type MenuNavItem } from "@/lib/menuNavigation";
import { usePermissions } from "@/hooks/usePermissions";

const SECTION_ICONS: Record<string, LucideIcon> = {
  "Inventory Management": Warehouse,
  "Stock Receive": Package,
  "Order Management": ClipboardList,
};

function CockpitLink({ item }: { item: MenuNavItem }) {
  const navigate = useNavigate();
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => navigate(item.path)}
      className="group relative flex flex-col rounded-2xl border border-[#D5E1F2] bg-white p-4 text-left shadow-[0_10px_24px_-18px_rgba(12,76,161,0.6)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#0C4CA1] hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0C4CA1]/40 focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0C4CA1] text-white transition-transform duration-300 group-hover:scale-105">
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#0C4CA1]/40 transition-all duration-300 group-hover:text-[#0C4CA1] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
      <p className="mt-3 text-sm font-semibold leading-snug text-[#0B1B33]">{item.title}</p>
      {item.description && (
        <p className="mt-1 text-xs leading-relaxed text-[#2C4A73]">{item.description}</p>
      )}
    </button>
  );
}

export default function DistributionCockpit() {
  const navigate = useNavigate();
  const permissions = usePermissions();
  const loading = permissions === null;
  const sections = useMemo(() => getCockpitSections(permissions), [permissions]);
  const shortcutCount = sections.reduce((sum, section) => sum + section.items.length, 0);
  const inventoryCount = sections
    .filter((section) => /inventory|stock receive|warehouse/i.test(section.title))
    .reduce((sum, section) => sum + section.items.length, 0);
  const orderCount = sections
    .filter((section) => /order|billing|transport/i.test(section.title))
    .reduce((sum, section) => sum + section.items.length, 0);

  useEffect(() => {
    document.title = "Distribution Cockpit | Renata";
  }, []);

  const formatCount = (value: number) => (loading ? "..." : String(value));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          size="sm"
          className="bg-[#0C4CA1] text-white hover:bg-[#08357A]"
          onClick={() => navigate("/")}
        >
          <Home className="h-4 w-4 mr-1.5" />
          Dashboard
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-[#0C4CA1] bg-white text-[#0C4CA1] hover:bg-[#E7EEF8] hover:text-[#08357A]"
          onClick={() => navigate("/orders/new")}
        >
          <PlusCircle className="h-4 w-4 mr-1.5" />
          New Order
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Modules"
          value={formatCount(sections.length)}
          icon={LayoutGrid}
          description="Visible cockpit sections"
          index={0}
        />
        <KPICard
          title="Shortcuts"
          value={formatCount(shortcutCount)}
          icon={Package}
          description="Pages you can open from here"
          index={1}
        />
        <KPICard
          title="Inventory"
          value={formatCount(inventoryCount)}
          icon={Warehouse}
          description="Stock and receive screens"
          index={2}
        />
        <KPICard
          title="Orders & field"
          value={formatCount(orderCount)}
          icon={ClipboardList}
          description="Order, billing and transport"
          index={3}
        />
      </div>

      {!loading && sections.length === 0 && (
        <Card className="border-[#D5E1F2] p-6">
          <p className="text-sm text-[#2C4A73]">No modules are available for this account.</p>
        </Card>
      )}

      {sections.map((section) => {
        const SectionIcon = SECTION_ICONS[section.title] ?? LayoutGrid;
        return (
          <Card
            key={section.title}
            className="card-elevated overflow-hidden border border-[#D5E1F2] bg-white shadow-[0_16px_40px_-28px_rgba(12,76,161,0.45)]"
          >
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0C4CA1] text-white shadow-[0_8px_16px_-10px_rgba(12,76,161,0.9)]">
                  <SectionIcon className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[#0C4CA1]">{section.title}</span>
                  <span className="text-sm font-normal text-[#2C4A73]">
                    {section.items.length} {section.items.length === 1 ? "screen" : "screens"} in this module
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("grid gap-4", "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4")}>
                {section.items.map((item) => (
                  <CockpitLink key={item.path} item={item} />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
