import { useState } from "react";
import type { DraftPrintView } from "@/lib/draftPrint";

function DraftPrintBrand() {
  const [hideLogo, setHideLogo] = useState(false);
  return (
    <div className="flex items-center gap-3 min-w-0">
      {!hideLogo && (
        <img
          src="/renata-logo.png"
          alt=""
          className="h-10 w-10 shrink-0 rounded-md object-cover"
          onError={() => setHideLogo(true)}
        />
      )}
      <div className="min-w-0">
        <p className="font-bold tracking-[0.08em] truncate">RENATA DMS</p>
        <p className="text-xs text-muted-foreground">Internal Draft Preview</p>
      </div>
    </div>
  );
}

export function DraftPrintDocument({ view }: { view: DraftPrintView }) {
  const showMoney = view.module === "export";
  return (
    <article className="draft-print-sheet relative mx-auto max-w-[210mm] overflow-hidden bg-white text-foreground">
      <div
        className="draft-watermark pointer-events-none absolute inset-x-0 top-1/3 z-0 text-center text-4xl font-bold tracking-widest text-destructive/20 -rotate-12 select-none"
        data-testid="draft-watermark"
        aria-hidden="true"
      >
        {view.watermark}
      </div>
      <div className="relative z-10">

      <header className="border-b pb-4 mb-4 space-y-3">
        <DraftPrintBrand />
        <p
          className="text-center text-sm font-bold tracking-wide border border-destructive/60 bg-destructive/10 py-2 px-3 break-words"
          data-testid="draft-not-for-dispatch"
        >
          {view.notForDispatch}
        </p>
        <div>
          <h1 className="text-xl font-semibold break-all">{view.title}</h1>
          <p className="text-sm break-all">
            {view.documentNumber} · {view.status} · {view.date}
          </p>
        </div>
      </header>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-6">
        {view.fields.map((field) => (
          <div key={field.label} className="min-w-0">
            <dt className="text-xs uppercase text-muted-foreground">{field.label}</dt>
            <dd className="whitespace-pre-wrap break-words">{field.value}</dd>
          </div>
        ))}
      </dl>

      <table className="w-full text-sm border-collapse mb-4">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-2">Product</th>
            <th className="py-2 pr-2">ID</th>
            {view.module === "sample_gift" ? <th className="py-2 pr-2">Gift type</th> : null}
            {showMoney ? (
              <>
                <th className="py-2 pr-2">Batch</th>
                <th className="py-2 pr-2">Expiry</th>
                <th className="py-2 pr-2">HSN</th>
              </>
            ) : null}
            <th className="py-2 pr-2 text-right">Qty</th>
            {showMoney ? (
              <>
                <th className="py-2 pr-2 text-right">Unit price</th>
                <th className="py-2 text-right">Line total</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {view.lines.length === 0 ? (
            <tr>
              <td className="py-4" colSpan={showMoney ? 9 : 4}>
                {view.emptyLinesLabel}
              </td>
            </tr>
          ) : (
            view.lines.map((line, index) => (
              <tr key={`${line.productId}-${index}`} className="draft-print-row border-b align-top">
                <td className="py-2 pr-2 break-words">{line.productName}</td>
                <td className="py-2 pr-2 break-all">{line.productId}</td>
                {view.module === "sample_gift" ? (
                  <td className="py-2 pr-2 break-words">{line.extra[0]?.value || "—"}</td>
                ) : null}
                {showMoney
                  ? line.extra.map((field) => (
                      <td key={field.label} className="py-2 pr-2 break-words">
                        {field.value}
                      </td>
                    ))
                  : null}
                <td className="py-2 pr-2 text-right whitespace-nowrap">{line.quantity}</td>
                {showMoney ? (
                  <>
                    <td className="py-2 pr-2 text-right whitespace-nowrap">{line.unitPrice}</td>
                    <td className="py-2 text-right whitespace-nowrap">{line.lineTotal}</td>
                  </>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>

      <dl className="text-sm space-y-1 mb-6">
        {view.totals.map((field) => (
          <div key={field.label} className="flex justify-between gap-4">
            <dt>{field.label}</dt>
            <dd className="font-medium">{field.value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words" data-testid="draft-print-disclaimer">
        {view.disclaimer}
      </p>
      </div>
    </article>
  );
}
