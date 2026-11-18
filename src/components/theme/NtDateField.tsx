import { useEffect, useRef, useState } from "react";
import { useNavigation, type CaptionProps } from "react-day-picker";
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function formatDisplayDate(value: string) {
  const date = parseISODate(value);
  if (!date) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const DATE_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getDateYearBounds(now = new Date()) {
  const currentYear = now.getFullYear();
  return { fromYear: currentYear - 20, toYear: currentYear + 20 };
}

function DatePickerCaption({ displayMonth }: CaptionProps) {
  const { goToMonth, nextMonth, previousMonth } = useNavigation();
  const [menu, setMenu] = useState<"month" | "year" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const year = displayMonth.getFullYear();
  const monthIndex = displayMonth.getMonth();
  const { fromYear, toYear } = getDateYearBounds();
  const years = Array.from({ length: toYear - fromYear + 1 }, (_, index) => fromYear + index);

  useEffect(() => {
    if (!menu) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenu(null);
      }
    };
    document.addEventListener("pointerdown", closeOnOutside, true);
    return () => document.removeEventListener("pointerdown", closeOnOutside, true);
  }, [menu]);

  useEffect(() => {
    if (menu !== "year") return;
    const active = menuRef.current?.querySelector<HTMLElement>("[data-current-year='true']");
    active?.scrollIntoView({ block: "center" });
  }, [menu]);

  const goTo = (next: Date) => {
    goToMonth(next);
    setMenu(null);
  };

  return (
    <div className="relative mb-2 flex items-center justify-between px-1">
      <button
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center text-[#1E293B] hover:text-[#0C4DA1] disabled:opacity-30 dark:text-[#F1F5F9] dark:hover:text-[#70ADFF]"
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(previousMonth)}
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="inline-flex items-center gap-0.5 border-0 bg-transparent px-1 text-sm font-semibold text-[#1E293B] hover:text-[#0C4DA1] dark:text-[#F1F5F9] dark:hover:text-[#70ADFF]"
          onClick={() => setMenu(menu === "month" ? null : "month")}
        >
          {DATE_MONTHS[monthIndex]}
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-0.5 border-0 bg-transparent px-1 text-sm font-semibold text-[#1E293B] hover:text-[#0C4DA1] dark:text-[#F1F5F9] dark:hover:text-[#70ADFF]"
          onClick={() => setMenu(menu === "year" ? null : "year")}
        >
          {year}
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </button>
      </div>
      <button
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center text-[#1E293B] hover:text-[#0C4DA1] disabled:opacity-30 dark:text-[#F1F5F9] dark:hover:text-[#70ADFF]"
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(nextMonth)}
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      {menu === "month" && (
        <div
          ref={menuRef}
          className="absolute left-1/2 top-9 z-20 grid w-[220px] -translate-x-1/2 grid-cols-2 gap-0.5 rounded-xl border border-[#E2E8F0] bg-white p-1.5 shadow-lg dark:border-[#2C3B50] dark:bg-[#151F30]"
        >
          {DATE_MONTHS.map((label, index) => (
            <button
              key={label}
              type="button"
              className={cn(
                "rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-[#EAF2FC] hover:text-[#0C4DA1] dark:hover:bg-[#1B304D] dark:hover:text-[#70ADFF]",
                index === monthIndex && "bg-[#EAF2FC] font-semibold text-[#0C4DA1] dark:bg-[#1B304D] dark:text-[#70ADFF]",
              )}
              onClick={() => goTo(new Date(year, index, 1))}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {menu === "year" && (
        <div
          ref={menuRef}
          className="nt-date-year-list absolute left-1/2 top-9 z-20 h-[168px] w-[4.75rem] -translate-x-1/2 overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white py-1 pl-1 pr-0.5 shadow-lg dark:border-[#2C3B50] dark:bg-[#151F30]"
        >
          {years.map((item) => (
            <button
              key={item}
              type="button"
              data-current-year={item === year ? "true" : undefined}
              className={cn(
                "flex w-full items-center justify-center rounded-md px-2 py-1 text-[12px] hover:bg-[#EAF2FC] hover:text-[#0C4DA1] dark:hover:bg-[#1B304D] dark:hover:text-[#70ADFF]",
                item === year && "bg-[#0C4DA1] font-semibold text-white hover:bg-[#0C4DA1] hover:text-white dark:bg-[#70ADFF] dark:text-[#0B1220]",
              )}
              onClick={() => goTo(new Date(item, monthIndex, 1))}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const triggerClass =
  "h-8 w-full justify-between rounded-lg border border-[#CBD5E1] bg-white px-2.5 text-[13px] shadow-none focus:ring-0 focus-visible:border-[#0C4DA1] focus-visible:ring-2 focus-visible:ring-[#0C4DA1]/20 dark:border-[#2C3B50] dark:bg-[#151F30]";

export function NtDateField({
  id,
  value,
  onChange,
  placeholder = "Select date",
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseISODate(value);
  const [month, setMonth] = useState<Date>(selected || new Date());
  const { fromYear, toYear } = getDateYearBounds();

  return (
    <div className={cn("nt-date-field relative min-w-0", className)}>
      <Popover
        modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next && selected) setMonth(selected);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className={cn(triggerClass, "active:scale-100", !value && "text-[#94A3B8]")}
          >
            <span className={cn("truncate", value && "text-[#172B4D] dark:text-[#F1F5F9]")}>
              {value ? formatDisplayDate(value) : placeholder}
            </span>
            <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-[#0C4DA1]" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={6}
          className="nt-date-popover z-[300] w-auto rounded-2xl border border-[#E2E8F0] bg-white p-0 shadow-lg dark:border-[#2C3B50] dark:bg-[#151F30]"
        >
          <Calendar
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={selected}
            onSelect={(day) => {
              if (!day) return;
              onChange(toISODate(day));
              setMonth(day);
              setOpen(false);
            }}
            fromYear={fromYear}
            toYear={toYear}
            captionLayout="buttons"
            showOutsideDays
            className="p-3"
            components={{ Caption: DatePickerCaption }}
            classNames={{
              caption: "relative",
              nav: "hidden",
              cell: "h-9 w-9 p-0 text-center relative focus-within:relative [&:has([aria-selected])]:bg-transparent",
              head_cell: "w-9 font-medium text-[11px] text-[#94A3B8]",
              day: "h-8 w-8 rounded-full p-0 font-normal text-[13px] text-[#1E293B] hover:bg-[#EAF2FC] dark:text-[#F1F5F9] dark:hover:bg-[#1B304D]",
              day_today:
                "relative bg-transparent font-medium text-[#0C4DA1] after:absolute after:bottom-0.5 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-[#0C4DA1] aria-selected:!bg-[#0C4DA1] aria-selected:!text-white aria-selected:after:bg-white dark:text-[#70ADFF] dark:after:bg-[#70ADFF]",
              day_selected:
                "!rounded-full !bg-[#0C4DA1] !text-white font-semibold hover:!bg-[#0C4DA1] hover:!text-white focus:!bg-[#0C4DA1] focus:!text-white dark:!bg-[#70ADFF] dark:!text-[#0B1220]",
              day_outside: "text-[#CBD5E1] opacity-100 aria-selected:!bg-[#0C4DA1] aria-selected:!text-white dark:text-[#64748B]",
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
