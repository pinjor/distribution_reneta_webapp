import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import DisplayCards, { type DisplayCardProps } from "@/components/ui/display-cards";
import type { MenuNavSection } from "@/lib/menuNavigation";
import { cn } from "@/lib/utils";
import { brandLabelClasses } from "@/lib/brandTheme";

const STACK_OFFSETS = [
  "[grid-area:stack] hover:-translate-y-8 before:absolute before:w-full before:outline-1 before:rounded-xl before:outline-brand-from/20 before:h-full before:content-[''] before:bg-blend-overlay before:bg-background/40 grayscale-[25%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  "[grid-area:stack] translate-x-6 sm:translate-x-12 translate-y-6 sm:translate-y-8 hover:-translate-y-1 before:absolute before:w-full before:outline-1 before:rounded-xl before:outline-brand-from/20 before:h-full before:content-[''] before:bg-blend-overlay before:bg-background/40 grayscale-[25%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  "[grid-area:stack] translate-x-12 sm:translate-x-24 translate-y-12 sm:translate-y-16 hover:translate-y-8",
];

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
  }),
};

interface MenuDisplaySectionGridProps {
  sections: MenuNavSection[];
  className?: string;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** DisplayCards skewed-stack layout for menu sections */
export function MenuDisplaySectionGrid({ sections, className }: MenuDisplaySectionGridProps) {
  const navigate = useNavigate();

  return (
    <div className={cn("space-y-14", className)}>
      {sections.map((section, sectionIndex) => {
        const stacks = chunk(section.items, 3);

        return (
          <motion.section
            key={section.title}
            custom={sectionIndex}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={sectionVariants}
          >
            <div className="mb-8 flex items-center gap-3">
              <div className="h-8 w-1 rounded-full bg-gradient-to-b from-brand-from to-brand-deep" />
              <div>
                <h2 className={cn("text-xl font-bold tracking-tight", brandLabelClasses)}>{section.title}</h2>
                <p className="text-sm text-brand-to/80 mt-0.5">{section.items.length} modules</p>
              </div>
            </div>

            <div className="grid gap-12 sm:grid-cols-2 2xl:grid-cols-3">
              {stacks.map((group, stackIndex) => {
                const cards: DisplayCardProps[] = group.map((item, cardIndex) => ({
                  title: item.title,
                  description: item.description ?? `Open ${item.title}`,
                  date: section.title,
                  icon: <item.icon className="size-4 text-white" strokeWidth={2.25} />,
                  onClick: () => navigate(item.path),
                  className: STACK_OFFSETS[cardIndex],
                }));

                return (
                  <div key={`${section.title}-${stackIndex}`} className="flex justify-center py-2">
                    <DisplayCards cards={cards} className="w-full max-w-[22rem]" />
                  </div>
                );
              })}
            </div>
          </motion.section>
        );
      })}
    </div>
  );
}
