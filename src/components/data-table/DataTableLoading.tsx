interface DataTableLoadingProps {
  columns: number;
  rows?: number;
}

export function DataTableLoading({ columns, rows = 6 }: DataTableLoadingProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-[#E3EAF3] dark:border-[#2C3B50]">
          {Array.from({ length: columns }).map((__, colIndex) => (
            <td key={colIndex} className="px-4 py-3">
              <div className="h-3.5 w-full max-w-[9rem] animate-pulse rounded bg-[#EAF2FC] motion-reduce:animate-none dark:bg-[#1B304D]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
