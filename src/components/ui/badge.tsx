import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-sm",
  {
    variants: {
      variant: {
        default: "border-transparent bg-gradient-to-r from-brand-from to-brand-to text-white hover:from-brand-hover-from hover:to-brand-hover-to shadow-brand-from/20",
        secondary: "border-transparent bg-gradient-to-r from-brand-to to-brand-deep text-white hover:from-brand-from hover:to-brand-to shadow-brand-to/20",
        destructive: "border-transparent bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-red-500/20",
        success: "border-transparent bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/20",
        warning: "border-transparent bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-amber-500/20",
        info: "border-transparent bg-gradient-to-r from-brand-from to-brand-to text-white hover:from-brand-hover-from hover:to-brand-hover-to shadow-brand-from/20",
        outline: "text-foreground border-2 border-gray-300 hover:border-gray-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps 
  extends React.HTMLAttributes<HTMLDivElement>, 
    VariantProps<typeof badgeVariants> {
  children?: React.ReactNode;
}

function Badge({ className, variant, children, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props}>{children}</div>;
}

export { Badge, badgeVariants };
