import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { brandButtonClasses, brandButtonSoftClasses } from "@/lib/brandTheme";
import { shineHoverSoftClasses } from "@/components/ui/shine-hover";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold text-brand-deep ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-from/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: cn(shineHoverSoftClasses, brandButtonClasses),
        destructive: cn(
          shineHoverSoftClasses,
          "rounded-full bg-gradient-to-r from-rose-500 via-red-500 to-pink-600 text-white border-0 hover:from-rose-600 hover:via-red-600 hover:to-pink-700 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/50",
        ),
        outline: cn(
          shineHoverSoftClasses,
          brandButtonClasses,
          "border-2 border-brand-from/45",
        ),
        secondary: cn(shineHoverSoftClasses, brandButtonSoftClasses),
        ghost: cn(
          shineHoverSoftClasses,
          "rounded-full border border-transparent hover:bg-brand-tile-from hover:border-brand-from/25 hover:shadow-sm",
        ),
        link: "rounded-none border-0 bg-transparent p-0 h-auto shadow-none text-brand-deep underline-offset-4 hover:text-brand-to hover:underline",
        headerAction: cn(shineHoverSoftClasses, brandButtonClasses, "shadow-md hover:shadow-lg"),
      },
      size: {
        default: "h-10 px-5 rounded-full",
        sm: "h-9 px-4 text-xs rounded-full",
        lg: "h-11 px-8 rounded-full",
        icon: "h-10 w-10 rounded-full overflow-visible",
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
