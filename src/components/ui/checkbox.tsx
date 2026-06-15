import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const CHECK_PATH =
  "M 2.45 24.95 V 33.95 C 2.45 35.9382 4.0618 37.55 6.05 37.55 H 33.95 C 35.9382 37.55 37.55 35.9382 37.55 33.95 V 6.05 C 37.55 4.0618 35.9382 2.45 33.95 2.45 H 6.05 C 4.0618 2.45 2.45 4.0618 2.45 6.05 V 22.0617 C 2.45 23.0443 2.8516 23.9841 3.5616 24.6633 L 10.0451 30.8649 C 11.5404 32.2952 13.9308 32.1735 15.2731 30.5988 L 36.2 6.05";

export interface AnimatedCheckMarkProps {
  checked: boolean;
  size?: number;
  color?: string;
  duration?: number;
  className?: string;
}

/** Standalone animated checkmark SVG (demo / custom layouts) */
export function AnimatedCheckMark({
  checked,
  size = 20,
  color = "#0ea5e9",
  duration = 0.45,
  className,
}: AnimatedCheckMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <motion.path
        d={CHECK_PATH}
        stroke={color}
        strokeLinecap="round"
        strokeWidth={3}
        fill="none"
        initial={false}
        animate={{
          strokeDasharray: checked ? 150 : 132,
          strokeDashoffset: checked ? -134 : 0,
        }}
        transition={{ duration, ease: "easeInOut" }}
      />
    </svg>
  );
}

export interface CheckBoxProps {
  checked: boolean;
  onClick: () => void;
  size?: number;
  color?: string;
  duration?: number;
  className?: string;
}

/** Demo-style clickable animated checkbox */
export const CheckBox = ({
  checked,
  onClick,
  size = 20,
  color = "#0ea5e9",
  duration = 0.45,
  className,
}: CheckBoxProps) => {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-sky-200 bg-sky-50/80 p-0.5",
        "transition-colors hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      <AnimatedCheckMark checked={checked} size={size} color={color} duration={duration} />
    </button>
  );
};

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & {
    checkColor?: string;
    checkDuration?: number;
  }
>(
  (
    {
      className,
      checkColor = "#0ea5e9",
      checkDuration = 0.45,
      checked,
      onCheckedChange,
      ...props
    },
    ref,
  ) => {
    const [isChecked, setIsChecked] = React.useState(checked === true);

    React.useEffect(() => {
      if (checked !== undefined) {
        setIsChecked(checked === true || checked === "indeterminate");
      }
    }, [checked]);

    return (
      <CheckboxPrimitive.Root
        ref={ref}
        checked={checked}
        onCheckedChange={(value) => {
          if (checked === undefined) {
            setIsChecked(value === true || value === "indeterminate");
          }
          onCheckedChange?.(value);
        }}
        className={cn(
          "peer inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px]",
          "border border-sky-300/90 bg-sky-50/90 shadow-sm",
          "transition-colors hover:bg-sky-100/90 hover:border-sky-400",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[state=checked]:border-sky-500 data-[state=checked]:bg-sky-50",
          "data-[state=indeterminate]:border-sky-500 data-[state=indeterminate]:bg-sky-50",
          className,
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator forceMount asChild>
          <span className="flex items-center justify-center">
            <AnimatedCheckMark
              checked={isChecked}
              size={16}
              color={checkColor}
              duration={checkDuration}
            />
          </span>
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );
  },
);
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
