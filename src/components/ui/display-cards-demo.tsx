import DisplayCards from "@/components/ui/display-cards";
import { Sparkles } from "lucide-react";

const demoCards = [
  {
    icon: <Sparkles className="size-4 text-white" />,
    title: "Featured",
    description: "Discover amazing content",
    date: "Just now",
    className:
      "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-full before:outline-1 before:rounded-xl before:outline-brand-from/20 before:h-full before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[30%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  },
  {
    icon: <Sparkles className="size-4 text-white" />,
    title: "Popular",
    description: "Trending this week",
    date: "2 days ago",
    className:
      "[grid-area:stack] translate-x-12 translate-y-10 hover:-translate-y-1 before:absolute before:w-full before:outline-1 before:rounded-xl before:outline-brand-from/20 before:h-full before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[30%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  },
  {
    icon: <Sparkles className="size-4 text-white" />,
    title: "New",
    description: "Latest updates and features",
    date: "Today",
    className: "[grid-area:stack] translate-x-24 translate-y-20 hover:translate-y-10",
  },
];

/** Standalone demo — import where needed for previews */
export function DisplayCardsDemo() {
  return (
    <div className="flex min-h-[400px] w-full items-center justify-center py-20">
      <div className="w-full max-w-3xl">
        <DisplayCards cards={demoCards} />
      </div>
    </div>
  );
}
