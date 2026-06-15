import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { shineHoverClasses, shineHoverSoftClasses } from "@/components/ui/shine-hover";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: cn(
          shineHoverClasses,
          "bg-gradient-to-r from-brand-from to-brand-to text-white hover:from-[#0088c4] hover:to-[#006aad] shadow-lg shadow-brand-from/30 hover:shadow-xl hover:shadow-brand-from/40",
        ),
        destructive: cn(
          shineHoverClasses,
          "bg-gradient-to-r from-rose-500 via-red-500 to-pink-600 text-white hover:from-rose-600 hover:via-red-600 hover:to-pink-700 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/50",
        ),
        outline: cn(
          shineHoverSoftClasses,
          "border-2 border-brand-from/40 bg-white hover:bg-brand-tile-from hover:border-brand-from hover:shadow-md text-brand-deep font-semibold",
        ),
        secondary: cn(
          shineHoverClasses,
          "bg-gradient-to-r from-brand-from to-brand-to text-white hover:from-[#0088c4] hover:to-[#006aad] shadow-lg shadow-brand-from/30 hover:shadow-xl hover:shadow-brand-from/40",
        ),
        ghost: cn(
          shineHoverSoftClasses,
          "hover:bg-brand-tile-from hover:text-brand-deep hover:shadow-sm font-medium",
        ),
        link: "text-brand-from font-semibold underline-offset-4 hover:text-brand-to hover:underline transition-colors",
        headerAction: cn(
          shineHoverSoftClasses,
          "bg-white text-brand-deep hover:bg-white/90 shadow-md font-semibold border-0",
        ),
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10 overflow-visible",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
