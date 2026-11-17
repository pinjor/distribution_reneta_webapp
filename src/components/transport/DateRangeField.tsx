import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigation, type CaptionProps } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fieldClass, labelClass } from "@/components/transport/transportUi";
import { NAVY_TEAL_SCOPE_CLASS } from "@/lib/navyTealTheme";
import { cn } from "@/lib/utils";

function parseISODate(value: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

const rangeCalendarClassNames = {
  caption: "relative",
  nav: "hidden",
  cell: "h-9 w-9 p-0 text-center relative focus-within:relative [&:has([aria-selected])]:bg-transparent",
  head_cell: "w-9 font-medium text-[11px] text-[#94A3B8]",
  day: "h-8 w-8 rounded-full p-0 font-normal text-[13px] text-[#1E293B] hover:bg-[#EAF2FC] dark:text-[#F1F5F9] dark:hover:bg-[#1B304D]",
  day_today:
    "relative bg-transparent font-medium text-[#0C4DA1] after:absolute after:bottom-0.5 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-[#0C4DA1] aria-selected:!bg-[#0C4DA1] aria-selected:!text-white aria-selected:after:bg-white dark:text-[#70ADFF] dark:after:bg-[#70ADFF]",
  day_selected:
    "!rounded-full !bg-[#0C4DA1] !text-white font-semibold hover:!bg-[#0C4DA1] hover:!text-white focus:!bg-[#0C4DA1] focus:!text-white dark:!bg-[#70ADFF] dark:!text-[#0B1220]",
  day_range_middle:
    "aria-selected:!bg-[#EAF2FC] aria-selected:!text-[#0C4DA1] aria-selected:!rounded-none dark:aria-selected:!bg-[#1B304D] dark:aria-selected:!text-[#70ADFF]",
  day_range_end: "day-range-end !rounded-full",
  day_outside: "text-[#CBD5E1] opacity-100 aria-selected:!bg-[#0C4DA1] aria-selected:!text-white dark:text-[#64748B]",
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function nextMonthDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

export function DateRangeField({
  startDate,
  endDate,
  onChange,
}: {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const from = parseISODate(startDate);
  const to = parseISODate(endDate);
  const [leftMonth, setLeftMonth] = useState<Date>(() => startOfMonth(from || new Date()));
  const [rightMonth, setRightMonth] = useState<Date>(() => startOfMonth(to || nextMonthDate(from || new Date())));
  const { fromYear, toYear } = getDateYearBounds();

  const label =
    from && to
      ? `${format(from, "dd MMM yyyy")} – ${format(to, "dd MMM yyyy")}`
      : from
        ? format(from, "dd MMM yyyy")
        : to
          ? format(to, "dd MMM yyyy")
          : "Select dates";

  return (
    <div className="nt-date-field relative w-[240px] max-w-full space-y-1">
      <label className={labelClass}>Date</label>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) return;
          const nextLeft = startOfMonth(from || new Date());
          setLeftMonth(nextLeft);
          setRightMonth(startOfMonth(to || nextMonthDate(nextLeft)));
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            aria-label="Date range"
            className={cn("w-full justify-between rounded-lg px-2.5 active:scale-100", fieldClass, !from && !to && "text-[#94A3B8]")}
          >
            <span className={cn("truncate", (from || to) && "text-[#172B4D] dark:text-[#F1F5F9]")}>{label}</span>
            <CalendarIcon className="h-4 w-4 shrink-0 text-[#0C4DA1]" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={8}
          collisionPadding={16}
          className={cn(
            NAVY_TEAL_SCOPE_CLASS,
            "nt-date-popover z-[200] w-auto rounded-2xl border border-[#E2E8F0] bg-white p-0 shadow-lg dark:border-[#2C3B50] dark:bg-[#151F30]",
          )}
        >
          <div className="flex flex-col sm:flex-row">
            <Calendar
              mode="single"
              month={leftMonth}
              onMonthChange={setLeftMonth}
              selected={from}
              fromYear={fromYear}
              toYear={toYear}
              captionLayout="buttons"
              onSelect={(day) => {
                if (!day) return;
                onChange(toISODate(day), endDate);
              }}
              showOutsideDays
              className="p-3"
              components={{ Caption: DatePickerCaption }}
              classNames={rangeCalendarClassNames}
            />
            <div className="hidden w-px self-stretch bg-[#E2E8F0] sm:block dark:bg-[#2C3B50]" />
            <Calendar
              mode="single"
              month={rightMonth}
              onMonthChange={setRightMonth}
              selected={to}
              fromYear={fromYear}
              toYear={toYear}
              captionLayout="buttons"
              onSelect={(day) => {
                if (!day) return;
                onChange(startDate, toISODate(day));
              }}
              showOutsideDays
              className="p-3"
              components={{ Caption: DatePickerCaption }}
              classNames={rangeCalendarClassNames}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
