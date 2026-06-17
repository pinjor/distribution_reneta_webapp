import { useState } from "react";
import { cn } from "@/lib/utils";

/** Unsplash stock images for image gallery demos */
export const EXPAND_CARD_DEMO_IMAGES = [
  "https://images.unsplash.com/photo-1587854691652-6622fac98528?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1504813184591-015728f98b98?w=400&h=600&fit=crop",
];

export interface ExpandCardItem {
  id?: string;
  title?: string;
  description?: string;
  subtitle?: string;
  image?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export interface ExpandCardsProps {
  items?: ExpandCardItem[];
  /** Index of initially expanded card (0-based) */
  defaultExpanded?: number;
  /** Collapsed width */
  collapsedWidth?: string;
  /** Expanded width */
  expandedWidth?: string;
  /** Card height */
  height?: string;
  className?: string;
  /** Image gallery mode — uses Unsplash demo images when items omitted */
  imageGallery?: boolean;
}

export function ExpandCards({
  items,
  defaultExpanded = 0,
  collapsedWidth = "5rem",
  expandedWidth = "24rem",
  height = "24rem",
  className,
  imageGallery = false,
}: ExpandCardsProps) {
  const [expandedIndex, setExpandedIndex] = useState(defaultExpanded);

  const cards: ExpandCardItem[] =
    items ??
    (imageGallery
      ? EXPAND_CARD_DEMO_IMAGES.map((src, i) => ({
          id: String(i),
          title: `Module ${i + 1}`,
          image: src,
        }))
      : []);

  const getWidth = (index: number) => (index === expandedIndex ? expandedWidth : collapsedWidth);

  if (cards.length === 0) return null;

  return (
    <div className={cn("w-full overflow-x-auto pb-2", className)}>
      <div className="flex min-w-min items-center justify-center gap-1 px-1">
        {cards.map((item, idx) => {
          const isExpanded = idx === expandedIndex;
          const hasImage = Boolean(item.image);

          return (
            <div
              key={item.id ?? idx}
              role={item.onClick ? "button" : undefined}
              tabIndex={item.onClick ? 0 : undefined}
              className={cn(
                "relative shrink-0 cursor-pointer overflow-hidden rounded-3xl transition-all duration-500 ease-in-out",
                "border-2 border-brand-from/10 hover:border-brand-from/30",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-from/40 focus-visible:ring-offset-2",
                !hasImage && "bg-gradient-to-br from-brand-from via-brand-to to-brand-deep",
              )}
              style={{ width: getWidth(idx), height }}
              onMouseEnter={() => setExpandedIndex(idx)}
              onFocus={() => setExpandedIndex(idx)}
              onClick={() => item.onClick?.()}
              onKeyDown={
                item.onClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        item.onClick?.();
                      }
                    }
                  : undefined
              }
            >
              {hasImage ? (
                <>
                  <img
                    className="h-full w-full object-cover"
                    src={item.image}
                    alt={item.title ?? `Card ${idx + 1}`}
                    loading="lazy"
                  />
                  {isExpanded && item.title && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                      <p className="text-lg font-semibold text-white">{item.title}</p>
                      {item.description && (
                        <p className="text-sm text-white/80 mt-1 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div
                  className={cn(
                    "flex h-full flex-col justify-between p-4 text-white transition-all duration-500",
                    isExpanded ? "items-start" : "items-center justify-center",
                  )}
                >
                  {item.icon && (
                    <span
                      className={cn(
                        "inline-flex items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm transition-all duration-500",
                        isExpanded ? "h-12 w-12" : "h-10 w-10",
                      )}
                    >
                      {item.icon}
                    </span>
                  )}
                  {isExpanded && (
                    <div className="mt-auto w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                      {item.subtitle && (
                        <p className="text-[10px] font-medium uppercase tracking-widest text-white/70 mb-1">
                          {item.subtitle}
                        </p>
                      )}
                      {item.title && (
                        <p className="text-lg font-bold leading-tight text-white">{item.title}</p>
                      )}
                      {item.description && (
                        <p className="mt-2 text-sm text-white/85 line-clamp-3 leading-relaxed">{item.description}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Full-page image gallery demo (original expand-on-hover pattern) */
export default function ExpandOnHover() {
  return (
    <div className="w-full min-h-[28rem] rounded-3xl bg-brand-tile-from/50">
      <div className="flex min-h-[28rem] w-full items-center justify-center p-4 lg:p-8">
        <ExpandCards imageGallery defaultExpanded={2} className="max-w-6xl mx-auto" />
      </div>
    </div>
  );
}
