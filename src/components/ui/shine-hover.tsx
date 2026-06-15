import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shine sweep animation applied on hover.
 * Use on solid/filled surfaces (buttons, colored tiles, badges).
 */
export const shineHoverClasses =
  "relative overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:z-0 before:bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.7)_50%,transparent_75%,transparent_100%)] before:bg-[length:250%_250%,100%_100%] before:bg-[position:200%_0,0_0] before:bg-no-repeat before:transition-[background-position_0s_ease] before:duration-1000 hover:before:bg-[position:-100%_0,0_0] dark:before:bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.5)_50%,transparent_75%,transparent_100%)] disabled:hover:before:bg-[position:200%_0,0_0] [&>*]:relative [&>*]:z-[1]";

/** Softer shine for outline / ghost / low-contrast surfaces */
export const shineHoverSoftClasses =
  "relative overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:z-0 before:bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.35)_50%,transparent_75%,transparent_100%)] before:bg-[length:250%_250%,100%_100%] before:bg-[position:200%_0,0_0] before:bg-no-repeat before:transition-[background-position_0s_ease] before:duration-1000 hover:before:bg-[position:-100%_0,0_0] dark:before:bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.25)_50%,transparent_75%,transparent_100%)] disabled:hover:before:bg-[position:200%_0,0_0] [&>*]:relative [&>*]:z-[1]";

export function ButtonShineHoverDemo() {
  return (
    <Button className="text-white bg-blue-500 hover:bg-blue-500/90">
      Shine Hover
    </Button>
  );
}

export default ButtonShineHoverDemo;

export function withShineHover(className?: string, soft = false) {
  return cn(soft ? shineHoverSoftClasses : shineHoverClasses, className);
}
