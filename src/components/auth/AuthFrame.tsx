import type { ReactNode } from "react";

export const authFieldClass =
  "h-12 w-full rounded-xl border border-[#C5D4EE] bg-white px-3.5 text-[15px] text-[#0B1B33] shadow-[0_1px_2px_rgba(12,76,161,0.06)] outline-none transition-[border-color,box-shadow] placeholder:text-[#3E5C8A] focus-visible:border-[#0C4CA1] focus-visible:ring-2 focus-visible:ring-[#0C4CA1]/25 disabled:cursor-not-allowed disabled:opacity-60";

export const authButtonClass =
  "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0C4CA1] text-sm font-semibold text-white shadow-[0_14px_28px_-16px_rgba(12,76,161,0.9)] transition-colors hover:bg-[#0A3F86] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C4CA1] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70";

export function AuthFrame({
  brandName,
  brandSubtitle,
  children,
}: {
  brandName: string;
  brandSubtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#E7EDF7] p-3 text-[#0B1B33] selection:bg-[#0C4CA1] selection:text-white sm:p-5">
      <style>{`
        @keyframes route-draw {
          from { stroke-dashoffset: 320; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1180px] overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-28px_rgba(12,76,161,0.45)] sm:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="relative hidden overflow-hidden bg-[#0C4CA1] text-white lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-12">
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 640 800" fill="none" aria-hidden>
            <path d="M40 620 C180 560 220 420 360 390 C470 368 520 250 600 160" stroke="white" strokeOpacity="0.22" strokeWidth="2" />
            <path
              d="M40 620 C180 560 220 420 360 390 C470 368 520 250 600 160"
              stroke="white"
              strokeWidth="2.5"
              strokeDasharray="320"
              strokeLinecap="round"
              style={{ animation: "route-draw 1.4s cubic-bezier(0.16, 1, 0.3, 1) both" }}
            />
            <circle cx="40" cy="620" r="7" fill="white" />
            <circle cx="360" cy="390" r="6" fill="white" fillOpacity="0.85" />
            <circle cx="600" cy="160" r="8" fill="white" />
            <circle cx="520" cy="640" r="90" stroke="white" strokeOpacity="0.16" />
            <circle cx="560" cy="680" r="46" stroke="white" strokeOpacity="0.2" />
          </svg>
          <div className="relative">
            <img
              src="/renata-logo.png"
              alt="Renata"
              className="h-14 w-auto rounded-2xl bg-white px-3 py-2 shadow-[0_16px_30px_-18px_rgba(0,0,0,0.55)]"
            />
          </div>
          <div className="relative max-w-md">
            <h1 className="text-[3.25rem] font-semibold leading-[0.98] tracking-[-0.04em] text-white">
              {brandName}
            </h1>
            <p className="mt-5 max-w-[28ch] text-lg leading-relaxed text-[#D6E4FA]">{brandSubtitle}</p>
          </div>
          <p className="relative text-sm text-[#D6E4FA]">Factory · Depot · Route · Collection</p>
        </aside>

        <main className="flex max-h-[calc(100vh-1.5rem)] items-start justify-center overflow-y-auto px-5 py-10 sm:max-h-[calc(100vh-2.5rem)] sm:px-10">
          <div className="my-auto w-full max-w-[26rem]">
            <div className="mb-8 lg:hidden">
              <img src="/renata-logo.png" alt="Renata" className="mb-4 h-10 w-auto" />
              <p className="text-sm font-medium text-[#0C4CA1]">{brandName}</p>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
