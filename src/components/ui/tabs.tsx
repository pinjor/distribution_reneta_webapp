import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const tabsListVariants = cva("inline-flex items-center justify-center text-muted-foreground", {
  variants: {
    variant: {
      default: "h-10 rounded-md bg-muted p-1",
      header:
        "h-auto w-full sm:w-auto gap-1 rounded-xl bg-white/15 p-1.5 backdrop-blur-sm border border-white/25 shadow-inner",
      brand:
        "h-auto w-full sm:w-auto gap-1 rounded-xl bg-gradient-to-r from-brand-tile-from to-brand-tile-to p-1.5 border border-brand-from/20 shadow-sm",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const tabsTriggerVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "rounded-sm px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        header:
          "gap-2 rounded-lg px-4 py-2.5 text-white/80 hover:text-white data-[state=active]:bg-white data-[state=active]:text-brand-deep data-[state=active]:shadow-md data-[state=active]:font-semibold",
        brand:
          "gap-2 rounded-lg px-4 py-2.5 text-brand-to/80 hover:text-brand-deep data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand-from data-[state=active]:to-brand-to data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:font-semibold",
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
