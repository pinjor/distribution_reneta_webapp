import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { shineHoverSoftClasses } from "@/components/ui/shine-hover";
import { brandIconBoxClasses, brandLabelClasses, brandMutedClasses } from "@/lib/brandTheme";

interface NavTileCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  onClick?: () => void;
  className?: string;
}

export function NavTileCard({ title, description, icon: Icon, onClick, className }: NavTileCardProps) {
  return (
    <Card
      className={cn("card-tile cursor-pointer", shineHoverSoftClasses, className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={cn("p-3 rounded-lg", brandIconBoxClasses)}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h3 className={cn("font-semibold", brandLabelClasses)}>{title}</h3>
            {description && (
              <p className={cn("text-sm mt-0.5", brandMutedClasses)}>{description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatTileCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

export function StatTileCard({
  label,
  value,
  icon: Icon,
  onClick,
  active,
  className,
}: StatTileCardProps) {
  return (
    <Card
      className={cn(
        "card-tile",
        onClick && "cursor-pointer",
        active && "card-tile-active",
        shineHoverSoftClasses,
        className,
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className={cn("text-sm", brandMutedClasses)}>{label}</p>
            <p className={cn("text-2xl font-bold tabular-nums", brandLabelClasses)}>{value}</p>
          </div>
          <Icon className="h-8 w-8 shrink-0 text-brand-from" />
        </div>
      </CardContent>
    </Card>
  );
}
