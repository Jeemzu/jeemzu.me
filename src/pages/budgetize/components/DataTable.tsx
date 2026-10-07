import { useState, type ReactNode } from 'react';
import { functionalUpdate, useTable, type ExpandedState, type RowData } from '@tanstack/react-table';
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
  /** Nested rows shown when their parent is expanded; adds Expand/Collapse all to the toolbar. */
  getSubRows?: (row: T) => T[] | undefined;
  /** Column ids hidden until the user turns them on. */
  defaultHidden?: string[];
}

// Called as a plain function, not via flexRender, so inputs in cells aren't remounted (and blurred) on each render.
function render<C>(content: string | ((ctx: C) => ReactNode) | undefined, ctx: C): ReactNode {
  return typeof content === 'function' ? content(ctx) : content;
}

function columnLabel(parentHeader: unknown, header: unknown, id: string): string {
  const own = typeof header === 'string' ? header : id;
  return typeof parentHeader === 'string' ? `${parentHeader}: ${own}` : own;
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
  getSubRows,
  defaultHidden,
}: Props<T>) {
  const { prefs, setPrefs, reset } = useTablePrefs(tableId, defaultHidden);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const table = useTable({
    features: budgetTableFeatures,
    data,
    columns,
    getRowId: (row) => getRowId(row),
    getSubRows,
    state: {
      columnSizing: prefs.sizing,
      columnVisibility: prefs.visibility,
      sorting: enableSorting ? prefs.sorting : [],
      expanded,
    },
    onColumnSizingChange: (u) => setPrefs((p) => ({ ...p, sizing: functionalUpdate(u, p.sizing) })),
    onColumnVisibilityChange: (u) =>
      setPrefs((p) => ({ ...p, visibility: functionalUpdate(u, p.visibility) })),
    onSortingChange: (u) => setPrefs((p) => ({ ...p, sorting: functionalUpdate(u, p.sorting) })),
    onExpandedChange: setExpanded,
    // Editing balances above the table changes `data`; keep open rows open.
    autoResetExpanded: false,
    enableSorting,
    columnResizeMode: 'onChange',
    defaultColumn: { minSize: 40, size: 140 },
  });

  const hideable = table.getAllLeafColumns().filter((c) => c.getCanHide());
  const hasFooter = table.getVisibleLeafColumns().some((c) => c.columnDef.footer !== undefined);
  // Marked by id, not :first-child, because a rowSpan above shifts which <td> comes first.
  const stickyId = table.getVisibleLeafColumns()[0]?.id;
  const stickyClass = (columnId: string) => (columnId === stickyId ? 'sticky-col' : undefined);
  const grouped = table.getHeaderGroups().length > 1;
  // A divider marks each boundary where a column group starts or ends.
  const leaves = table.getVisibleLeafColumns();
  const topId = (column: (typeof leaves)[number]) => {
    let top = column;
    while (top.parent) top = top.parent;
    return top.id;
  };
  const sepIds = new Set(
    leaves
      .filter((column, i) => {
        const prev = leaves[i - 1];
        return prev && (column.parent || prev.parent) && topId(column) !== topId(prev);
      })
      .map((column) => column.id),
  );
  const sepClass = (columnId: string) => (sepIds.has(columnId) ? 'col-sep' : undefined);

  return (
    <div className="data-table">
      <div className="data-table-toolbar">
        {getSubRows && (
          <button
            type="button"
            className="btn ghost"
            onClick={() => table.toggleAllRowsExpanded(!table.getIsAllRowsExpanded())}
          >
            {table.getIsAllRowsExpanded() ? 'Collapse all' : 'Expand all'}
          </button>
        )}
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
                {columnLabel(column.parent?.columnDef.header, column.columnDef.header, column.id)}
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
          className={`bills-table ${grouped ? 'grouped' : ''} ${className ?? ''}`}
          style={{ width: '100%', minWidth: table.getTotalSize() }}
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
                  if (header.rowSpan === 0) return null;
                  const { column } = header;
                  // Judged by the column, not the header: an ungrouped column in a grouped table is a
                  // row-spanning placeholder whose subHeaders hold its own leaf header.
                  const isLeaf = column.columns.length === 0;
                  const meta = column.columnDef.meta;
                  const sorted = column.getIsSorted();
                  const label = render(column.columnDef.header, header.getContext());
                  let firstLeaf = header;
                  while (firstLeaf.subHeaders.length > 0) firstLeaf = firstLeaf.subHeaders[0];
                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan > 1 ? header.colSpan : undefined}
                      rowSpan={header.rowSpan > 1 ? header.rowSpan : undefined}
                      className={
                        [
                          stickyClass(column.id),
                          sepClass(firstLeaf.column.id),
                          !isLeaf && 'group-header',
                          meta?.headerClassName,
                        ]
                          .filter(Boolean)
                          .join(' ') || undefined
                      }
                      title={meta?.headerTitle}
                      aria-label={meta?.headerAriaLabel}
                      aria-sort={
                        sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined
                      }
                    >
                      {isLeaf && column.getCanSort() ? (
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
                      {isLeaf && column.getCanResize() && (
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
                      className={
                        [
                          stickyClass(cell.column.id),
                          sepClass(cell.column.id),
                          cell.column.columnDef.meta?.cellClassName,
                        ]
                          .filter(Boolean)
                          .join(' ') || undefined
                      }
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
              {/* Only the leaf row; group-level footer rows would be empty. */}
              {table.getFooterGroups().slice(0, 1).map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => (
                    <td
                      key={header.id}
                      className={
                        [stickyClass(header.column.id), sepClass(header.column.id)]
                          .filter(Boolean)
                          .join(' ') || undefined
                      }
                    >
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
