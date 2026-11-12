import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { QuickActionsGrid } from "@/components/navigation/QuickActionsGrid";
import { getCockpitSections } from "@/lib/menuNavigation";
import { brandLabelClasses, brandMutedClasses } from "@/lib/brandTheme";
import { cn } from "@/lib/utils";

export default function DistributionCockpit() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const sections = getCockpitSections();

  useEffect(() => {
    document.title = "Distribution Cockpit | Renata";
  }, []);

  return (
    <ThemeScope className="-mx-6 -my-6 min-h-full px-6 py-6">
      <div className="space-y-8">
        {sections.map((section, sectionIndex) => (
          <motion.section
            key={section.title}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.2,
              delay: reduceMotion ? 0 : Math.min(sectionIndex, 8) * 0.04,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="mb-3">
              <h2 className={cn("text-lg font-semibold leading-tight", brandLabelClasses)}>
                {section.title}
              </h2>
              <p className={cn("mt-0.5 text-xs", brandMutedClasses)}>
                {section.items.length} {section.items.length === 1 ? "module" : "modules"}
              </p>
            </div>
            <QuickActionsGrid
              actions={section.items}
              onNavigate={navigate}
            />
          </motion.section>
        ))}
      </div>
    </ThemeScope>
  );
}
