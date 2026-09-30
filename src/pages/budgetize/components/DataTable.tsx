import type { ReactNode } from 'react';
import { functionalUpdate, useTable, type RowData } from '@tanstack/react-table';
import { useTablePrefs } from './useTablePrefs';
import { budgetTableFeatures, type BudgetColumn } from './tableFeatures';

interface Props<T extends RowData> {
  /** Stable key for remembering this table's layout. */
  tableId: string;
  data: T[];
  columns: BudgetColumn<T>[];
  getRowId: (row: T) => string;
  className?: string;
  rowClassName?: (row: T) => string | undefined;
  enableSorting?: boolean;
  /** Return 0 to skip a cell covered by a rowSpan above it. */
  getCellRowSpan?: (columnId: string, row: T, rowIndex: number) => number;
}

// Called as a plain function, not via flexRender, so inputs in cells aren't remounted (and blurred) on each render.
function render<C>(content: string | ((ctx: C) => ReactNode) | undefined, ctx: C): ReactNode {
  return typeof content === 'function' ? content(ctx) : content;
}

export function DataTable<T extends RowData>({
  tableId,
  data,
  columns,
  getRowId,
  className,
  rowClassName,
  enableSorting = true,
  getCellRowSpan,
}: Props<T>) {
  const { prefs, setPrefs, reset } = useTablePrefs(tableId);

  const table = useTable({
    features: budgetTableFeatures,
    data,
    columns,
    getRowId: (row) => getRowId(row),
    state: {
      columnSizing: prefs.sizing,
      columnVisibility: prefs.visibility,
      sorting: enableSorting ? prefs.sorting : [],
    },
    onColumnSizingChange: (u) => setPrefs((p) => ({ ...p, sizing: functionalUpdate(u, p.sizing) })),
    onColumnVisibilityChange: (u) =>
      setPrefs((p) => ({ ...p, visibility: functionalUpdate(u, p.visibility) })),
    onSortingChange: (u) => setPrefs((p) => ({ ...p, sorting: functionalUpdate(u, p.sorting) })),
    enableSorting,
    columnResizeMode: 'onChange',
    defaultColumn: { minSize: 40, size: 140 },
  });

  const hideable = table.getAllLeafColumns().filter((c) => c.getCanHide());
  const hasFooter = table.getVisibleLeafColumns().some((c) => c.columnDef.footer !== undefined);

  return (
    <div className="data-table">
      <div className="data-table-toolbar">
        <details className="data-table-columns">
          <summary className="btn ghost">Columns</summary>
          <div className="data-table-columns-menu">
            {hideable.map((column) => (
              <label key={column.id}>
                <input
                  type="checkbox"
                  checked={column.getIsVisible()}
                  onChange={column.getToggleVisibilityHandler()}
                />
                {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
              </label>
            ))}
            <button type="button" className="btn ghost" onClick={reset}>
              Reset layout
            </button>
          </div>
        </details>
      </div>
      <div className="table-wrap data-table-wrap">
        <table
          className={`bills-table ${className ?? ''}`}
          style={{ width: table.getTotalSize() }}
        >
          <colgroup>
            {table.getVisibleLeafColumns().map((column) => (
              <col key={column.id} style={{ width: column.getSize() }} />
            ))}
          </colgroup>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const { column } = header;
                  const meta = column.columnDef.meta;
                  const sorted = column.getIsSorted();
                  const label = render(column.columnDef.header, header.getContext());
                  return (
                    <th
                      key={header.id}
                      title={meta?.headerTitle}
                      aria-label={meta?.headerAriaLabel}
                      aria-sort={
                        sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined
                      }
                    >
                      {column.getCanSort() ? (
                        <button
                          type="button"
                          className="th-sort"
                          onClick={column.getToggleSortingHandler()}
                        >
                          {label}
                          <span aria-hidden="true" className="sort-indicator">
                            {sorted === 'asc' ? '▲' : sorted === 'desc' ? '▼' : ''}
                          </span>
                        </button>
                      ) : (
                        label
                      )}
                      {column.getCanResize() && (
                        <div
                          role="separator"
                          aria-orientation="vertical"
                          title="Drag to resize, double-click to reset"
                          className={`col-resizer${column.getIsResizing() ? ' resizing' : ''}`}
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          onDoubleClick={() => column.resetSize()}
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, rowIndex) => (
              <tr key={row.id} className={rowClassName?.(row.original)}>
                {row.getVisibleCells().map((cell) => {
                  const span = getCellRowSpan?.(cell.column.id, row.original, rowIndex) ?? 1;
                  if (span === 0) return null;
                  return (
                    <td
                      key={cell.id}
                      rowSpan={span > 1 ? span : undefined}
                      className={cell.column.columnDef.meta?.cellClassName}
                    >
                      {render(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {hasFooter && (
            <tfoot>
              {table.getFooterGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => (
                    <td key={header.id}>
                      {render(header.column.columnDef.footer, header.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
