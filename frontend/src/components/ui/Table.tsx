import { clsx } from "clsx";

export interface Column<T> {
  key: string;
  header: string;
  /** O'ng tomonga tekislanadi — raqamlar uchun (ko'z ustunni tez skanerlaydi). */
  numeric?: boolean;
  render: (row: T) => React.ReactNode;
}

/**
 * Umumiy admin jadvali. Avval har sahifa xom `<table>` yozardi (KPI, navbat)
 * va ustun balandligi/rangi/skroll xatti-harakati bir-biriga o'xshamasdi.
 *
 * Gorizontal skroll ATAYLAB jadvalning o'zida (`overflow-x-auto`) — sahifa
 * tanasi hech qachon yon tomonga surilmasin (docs/10 §8 a11y).
 */
export function Table<T>({
  columns,
  rows,
  rowKey,
  empty = "Ma'lumot yo'q",
  onRowClass,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: string;
  onRowClass?: (row: T) => string | undefined;
}) {
  if (rows.length === 0) {
    return <div className="py-14 text-center text-text-muted text-sm">{empty}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-text-muted">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={clsx("py-2 px-3 font-medium whitespace-nowrap", column.numeric && "text-center")}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={rowKey(row)} className={onRowClass?.(row)}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={clsx(
                    "py-3 px-3 text-text-secondary whitespace-nowrap",
                    column.numeric && "text-center font-mono tabular-nums"
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
