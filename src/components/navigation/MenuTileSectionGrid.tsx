import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { NavTileCard } from "@/components/ui/tile-card";
import type { MenuNavSection } from "@/lib/menuNavigation";
import { cn } from "@/lib/utils";
import { brandLabelClasses } from "@/lib/brandTheme";

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

interface MenuTileSectionGridProps {
  sections: MenuNavSection[];
  className?: string;
}

/** Previous animated gradient tile card layout — used when NAV_CARD_VARIANT is `'tile'` */
export function MenuTileSectionGrid({ sections, className }: MenuTileSectionGridProps) {
  const navigate = useNavigate();

  return (
    <div className={cn("space-y-10", className)}>
      {sections.map((section, sectionIndex) => (
        <motion.section
          key={section.title}
          custom={sectionIndex}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={sectionVariants}
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-gradient-to-b from-brand-from to-brand-deep" />
            <div>
              <h2 className={cn("text-xl font-bold tracking-tight", brandLabelClasses)}>{section.title}</h2>
              <p className="text-sm text-brand-to/80 mt-0.5">{section.items.length} modules</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {section.items.map((item, itemIndex) => (
              <NavTileCard
                key={item.path}
                title={item.title}
                description={item.description}
                icon={item.icon}
                index={sectionIndex * 10 + itemIndex}
                onClick={() => navigate(item.path)}
              />
            ))}
          </div>
        </motion.section>
      ))}
    </div>
  );
}
