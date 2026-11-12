import { Toaster as Sonner, toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      offset={16}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast w-[min(380px,calc(100vw-24px))] rounded-xl border border-[#E2E8F0] bg-white p-3.5 text-sm font-medium text-[#1E293B] shadow-md dark:border-[#2C3B50] dark:bg-[#151F30] dark:text-[#F1F5F9]",
          title: "text-sm font-semibold",
          description: "text-xs text-[#64748B] dark:text-[#A9B8CC]",
          actionButton: "bg-[#0C4DA1] text-white",
          cancelButton: "bg-[#F1F5F9] text-[#64748B] dark:bg-[#1B304D] dark:text-[#A9B8CC]",
          success: "border-[#E2E8F0]",
          error: "border-[#E2E8F0]",
          warning: "border-[#E2E8F0]",
          info: "border-[#E2E8F0]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
