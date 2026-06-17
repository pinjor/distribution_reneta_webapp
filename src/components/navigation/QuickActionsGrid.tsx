import { ExpandCards } from "@/components/ui/expand-cards";
import DisplayCards, { type DisplayCardProps } from "@/components/ui/display-cards";
import { NavTileCard } from "@/components/ui/tile-card";
import { NAV_CARD_VARIANT } from "@/lib/uiDesign";
import { cn } from "@/lib/utils";
import { brandLabelClasses } from "@/lib/brandTheme";
import type { LucideIcon } from "lucide-react";

const STACK_OFFSETS = [
  "[grid-area:stack] hover:-translate-y-8 before:absolute before:w-full before:outline-1 before:rounded-xl before:outline-brand-from/20 before:h-full before:content-[''] before:bg-blend-overlay before:bg-background/40 grayscale-[25%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  "[grid-area:stack] translate-x-6 sm:translate-x-12 translate-y-6 sm:translate-y-8 hover:-translate-y-1 before:absolute before:w-full before:outline-1 before:rounded-xl before:outline-brand-from/20 before:h-full before:content-[''] before:bg-blend-overlay before:bg-background/40 grayscale-[25%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  "[grid-area:stack] translate-x-12 sm:translate-x-24 translate-y-12 sm:translate-y-16 hover:translate-y-8",
];

export interface QuickActionItem {
  title: string;
  icon: LucideIcon;
  path: string;
  description?: string;
}

interface QuickActionsGridProps {
  actions: QuickActionItem[];
  onNavigate: (path: string) => void;
  className?: string;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function QuickActionsGrid({ actions, onNavigate, className }: QuickActionsGridProps) {
  if (NAV_CARD_VARIANT === "tile") {
    return (
      <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4", className)}>
        {actions.map((action, index) => (
          <NavTileCard
            key={action.path}
            title={action.title}
            icon={action.icon}
            index={index}
            compact
            onClick={() => onNavigate(action.path)}
          />
        ))}
      </div>
    );
  }

  if (NAV_CARD_VARIANT === "expand") {
    return (
      <ExpandCards
        className={cn("rounded-3xl border border-brand-from/10 bg-brand-tile-from/30 p-4", className)}
        defaultExpanded={1}
        collapsedWidth="4.5rem"
        expandedWidth="20rem"
        height="18rem"
        items={actions.map((action) => ({
          id: action.path,
          title: action.title,
          description: action.description ?? `Go to ${action.title}`,
          subtitle: "Quick action",
          icon: <action.icon className="size-5 text-white" strokeWidth={2.25} />,
          onClick: () => onNavigate(action.path),
        }))}
      />
    );
  }

  const stacks = chunk(actions, 3);

  return (
    <div className={cn("grid gap-10 sm:grid-cols-2", className)}>
      {stacks.map((group, stackIndex) => {
        const cards: DisplayCardProps[] = group.map((action, cardIndex) => ({
          title: action.title,
          description: action.description ?? `Go to ${action.title}`,
          date: "Quick action",
          icon: <action.icon className="size-4 text-white" strokeWidth={2.25} />,
          onClick: () => onNavigate(action.path),
          className: STACK_OFFSETS[cardIndex],
        }));

        return (
          <div key={stackIndex} className="flex justify-center py-2">
            <DisplayCards cards={cards} className="w-full max-w-[22rem]" />
          </div>
        );
      })}
    </div>
  );
}

export function QuickActionsHeading({ className }: { className?: string }) {
  return (
    <h2 className={cn("text-lg font-semibold mb-4", brandLabelClasses, className)}>
      Quick Actions
    </h2>
  );
}
