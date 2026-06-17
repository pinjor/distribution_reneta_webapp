import { useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MenuSectionGrid } from "@/components/navigation/MenuSectionGrid";
import { getCockpitSections } from "@/lib/menuNavigation";

export default function DistributionCockpit() {
  useEffect(() => {
    document.title = "Distribution Cockpit | Renata";
  }, []);

  const sections = getCockpitSections();

  return (
    <div className="relative min-h-full">
      {/* Soft ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-brand-from/10 blur-3xl animate-float-slow" />
        <div className="absolute top-1/3 -left-24 h-72 w-72 rounded-full bg-brand-tile-to/40 blur-3xl animate-float-slower" />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-brand-to/10 blur-3xl animate-float-slow" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-8"
      >
        <PageHeader
          title="Distribution Cockpit"
          subtitle="Your command center — every module and submenu in one beautifully organized hub"
          icon={BarChart3}
        />

        <MenuSectionGrid sections={sections} />
      </motion.div>
    </div>
  );
}
