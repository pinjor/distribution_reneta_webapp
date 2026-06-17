import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { brandLabelClasses } from "@/lib/brandTheme";

export interface DisplayCardProps {
  className?: string;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  date?: string;
  iconClassName?: string;
  titleClassName?: string;
  onClick?: () => void;
}

export function DisplayCard({
  className,
  icon = <Sparkles className="size-4 text-white" />,
  title = "Featured",
  description = "Discover amazing content",
  date = "Just now",
  iconClassName = "text-brand-from",
  titleClassName = brandLabelClasses,
  onClick,
}: DisplayCardProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
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
      className={cn(
        "relative flex h-36 w-full min-w-[16rem] max-w-[22rem] -skew-y-[8deg] select-none flex-col justify-between rounded-xl border-2 border-brand-from/15 bg-brand-tile-from/70 backdrop-blur-sm px-4 py-3 transition-all duration-700",
        "after:absolute after:-right-1 after:top-[-5%] after:h-[110%] after:w-[60%] after:bg-gradient-to-l after:from-background/90 after:to-transparent after:content-[''] after:pointer-events-none",
        "hover:border-brand-from/40 hover:bg-white/80 hover:shadow-[0_20px_48px_-16px_rgba(106,198,223,0.45)]",
        "[&>*]:flex [&>*]:items-center [&>*]:gap-2",
        onClick && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-from/40 focus-visible:ring-offset-2",
        className,
      )}
    >
      <div>
        <span className={cn("relative inline-block rounded-full bg-gradient-to-br from-brand-from to-brand-to p-1.5 shadow-sm", iconClassName)}>
          {icon}
        </span>
        <p className={cn("text-lg font-semibold mt-2", titleClassName)}>{title}</p>
      </div>
      <p className="text-sm text-brand-deep/80 line-clamp-2 leading-snug">{description}</p>
      <p className="text-xs text-brand-to/70">{date}</p>
    </div>
  );
}

export interface DisplayCardsProps {
  cards?: DisplayCardProps[];
  className?: string;
}

const STACK_OFFSETS = [
  "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-full before:outline-1 before:rounded-xl before:outline-brand-from/20 before:h-full before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[30%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  "[grid-area:stack] translate-x-8 sm:translate-x-16 translate-y-8 sm:translate-y-10 hover:-translate-y-1 before:absolute before:w-full before:outline-1 before:rounded-xl before:outline-brand-from/20 before:h-full before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[30%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  "[grid-area:stack] translate-x-16 sm:translate-x-32 translate-y-16 sm:translate-y-20 hover:translate-y-10",
];

export default function DisplayCards({ cards, className }: DisplayCardsProps) {
  const defaultCards: DisplayCardProps[] = [
    { className: STACK_OFFSETS[0] },
    { className: STACK_OFFSETS[1] },
    { className: STACK_OFFSETS[2] },
  ];

  const displayCards = cards?.length ? cards : defaultCards;

  return (
    <div
      className={cn(
        "grid [grid-template-areas:'stack'] place-items-center opacity-100 animate-in fade-in-0 duration-700 min-h-[14rem]",
        className,
      )}
    >
      {displayCards.map((cardProps, index) => (
        <DisplayCard key={index} {...cardProps} />
      ))}
    </div>
  );
}
