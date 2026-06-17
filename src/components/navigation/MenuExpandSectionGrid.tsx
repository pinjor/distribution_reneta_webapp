import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ExpandCards } from "@/components/ui/expand-cards";
import type { MenuNavSection } from "@/lib/menuNavigation";
import { cn } from "@/lib/utils";
import { brandLabelClasses } from "@/lib/brandTheme";

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] },
  }),
};

interface MenuExpandSectionGridProps {
  sections: MenuNavSection[];
  className?: string;
}

const MAX_PER_ROW = 8;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Expand-on-hover card rows for each menu section */
export function MenuExpandSectionGrid({ sections, className }: MenuExpandSectionGridProps) {
  const navigate = useNavigate();

  return (
    <div className={cn("space-y-12", className)}>
      {sections.map((section, sectionIndex) => {
        const rows = chunk(section.items, MAX_PER_ROW);

        return (
          <motion.section
            key={section.title}
            custom={sectionIndex}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={sectionVariants}
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="h-8 w-1 rounded-full bg-gradient-to-b from-brand-from to-brand-deep" />
              <div>
                <h2 className={cn("text-xl font-bold tracking-tight", brandLabelClasses)}>{section.title}</h2>
                <p className="text-sm text-brand-to/80 mt-0.5">
                  {section.items.length} modules — hover to expand, click to open
                </p>
              </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-brand-from/10 bg-brand-tile-from/30 p-4 sm:p-6">
              {rows.map((row, rowIndex) => (
                <ExpandCards
                  key={`${section.title}-row-${rowIndex}`}
                  defaultExpanded={Math.min(1, row.length - 1)}
                  collapsedWidth="4.5rem"
                  expandedWidth="22rem"
                  height="20rem"
                  items={row.map((item) => ({
                    id: item.path,
                    title: item.title,
                    description: item.description,
                    subtitle: section.title,
                    icon: <item.icon className="size-5 text-white" strokeWidth={2.25} />,
                    onClick: () => navigate(item.path),
                  }))}
                />
              ))}
            </div>
          </motion.section>
        );
      })}
    </div>
  );
}
