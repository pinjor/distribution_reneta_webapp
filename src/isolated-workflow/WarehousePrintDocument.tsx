import { useState } from "react";
import type { WarehousePrintLine, WarehousePrintView } from "./warehouseDocuments";

const COLUMN_LABEL: Record<keyof WarehousePrintLine, string> = {
  product: "Product",
  productId: "ID",
  sku: "SKU",
  batch: "Batch",
  expiry: "Expiry",
  reserved: "Reserved",
  requested: "Requested pick",
  picked: "Picked",
  issued: "Issued qty",
  discrepancy: "Discrepancy",
};

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
        <p className="text-xs text-muted-foreground">Isolated warehouse test document</p>
      </div>
    </div>
  );
}

export function WarehousePrintDocument({ view }: { view: WarehousePrintView }) {
  return (
    <article className="draft-print-sheet relative mx-auto max-w-[210mm] overflow-hidden bg-white text-foreground">
      <div
        className="draft-watermark pointer-events-none absolute inset-x-0 top-1/3 z-0 text-center text-3xl sm:text-4xl font-bold tracking-widest text-destructive/25 -rotate-12 select-none px-4"
        data-testid="warehouse-watermark"
        aria-hidden="true"
      >
        {view.watermark}
      </div>
      <div className="relative z-10">
        <header className="border-b pb-4 mb-4 space-y-3">
          <DraftPrintBrand />
          <p
            className="text-center text-sm font-bold tracking-wide border border-destructive/60 bg-destructive/10 py-2 px-3 break-words"
            data-testid="warehouse-not-for-dispatch"
          >
            {view.watermark}
          </p>
          <div>
            <h1 className="text-xl font-semibold break-all" data-testid="warehouse-doc-title">
              {view.title}
            </h1>
            <p className="text-sm break-all" data-testid="warehouse-doc-status">
              {view.status}
            </p>
            {view.failedDelivery ? (
              <p className="text-sm font-semibold text-destructive" data-testid="warehouse-failed-delivery">
                Failed delivery — not delivered
              </p>
            ) : null}
          </div>
        </header>

        {view.unavailable ? (
          <p className="text-sm mb-6" data-testid="warehouse-unavailable">
            {view.unavailable}
          </p>
        ) : (
          <>
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
                  {view.columns.map((column) => (
                    <th key={column} className="py-2 pr-2">
                      {COLUMN_LABEL[column]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view.lines.length === 0 ? (
                  <tr>
                    <td className="py-4" colSpan={view.columns.length}>
                      {view.emptyLinesLabel}
                    </td>
                  </tr>
                ) : (
                  view.lines.map((line, index) => (
                    <tr key={`${line.batch}-${index}`} className="draft-print-row border-b align-top">
                      {view.columns.map((column) => (
                        <td key={column} className="py-2 pr-2 break-words">
                          {line[column]}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}

        {view.audit.length > 0 && !view.unavailable ? (
          <section className="mb-6" data-testid="warehouse-audit">
            <h2 className="text-sm font-semibold mb-2">Fulfillment history</h2>
            <ul className="text-sm space-y-1">
              {view.audit.map((row, index) => (
                <li key={`${row.action}-${index}`}>
                  {row.action}: {row.fromStatus} → {row.toStatus}
                  {row.actor !== "—" ? ` · actor ${row.actor}` : ""}
                  {row.at !== "—" ? ` · ${row.at}` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words" data-testid="warehouse-print-disclaimer">
          {view.disclaimer}
        </p>
      </div>
    </article>
  );
}
