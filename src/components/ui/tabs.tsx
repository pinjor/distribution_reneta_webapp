import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const tabsListVariants = cva("inline-flex items-center justify-center text-muted-foreground", {
  variants: {
    variant: {
      default:
        "h-auto gap-1 rounded-full bg-brand-tile-from p-1 border border-brand-from/20 shadow-sm",
      header:
        "h-auto w-full sm:w-auto gap-1 rounded-full bg-white/15 p-1.5 backdrop-blur-sm border border-white/25 shadow-inner",
      brand:
        "h-auto w-full sm:w-auto gap-1 rounded-full bg-brand-tile-from p-1.5 border border-brand-from/25 shadow-sm",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const tabsTriggerVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-from/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "gap-2 rounded-full px-4 py-2 text-brand-deep/70 hover:text-brand-deep data-[state=active]:bg-white data-[state=active]:text-brand-deep data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-brand-from/20",
        header:
          "gap-2 rounded-full px-4 py-2.5 text-white/85 hover:text-white data-[state=active]:bg-white data-[state=active]:text-brand-deep data-[state=active]:shadow-md data-[state=active]:font-semibold",
        brand:
          "gap-2 rounded-full px-4 py-2.5 text-brand-deep/70 hover:text-brand-deep data-[state=active]:bg-white data-[state=active]:text-brand-deep data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-brand-from/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(tabsListVariants({ variant }), className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

export interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof tabsTriggerVariants> {}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(tabsTriggerVariants({ variant }), className)}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants, tabsTriggerVariants };
