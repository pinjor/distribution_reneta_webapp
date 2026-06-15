import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { brandIconBoxClasses, brandLabelClasses, brandMutedClasses } from "@/lib/brandTheme";

interface TransportStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  accent?: string;
}

export function TransportStatCard({
  title,
  value,
  icon: Icon,
  description,
}: TransportStatCardProps) {
  return (
    <Card className="p-5 border-2 transition-shadow hover:shadow-md card-tile">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium", brandMutedClasses)}>{title}</p>
          <p className={cn("text-2xl sm:text-3xl font-bold tracking-tight mt-1", brandLabelClasses)}>
            {value}
          </p>
          {description && (
            <p className={cn("text-xs mt-1.5", brandMutedClasses)}>{description}</p>
          )}
        </div>
        <div className={cn("h-11 w-11 shrink-0 rounded-xl flex items-center justify-center", brandIconBoxClasses)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
