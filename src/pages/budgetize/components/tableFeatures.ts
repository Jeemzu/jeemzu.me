import {
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createExpandedRowModel,
  createSortedRowModel,
  metaHelper,
  rowExpandingFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table';

export interface BudgetColumnMeta {
  headerTitle?: string;
  headerAriaLabel?: string;
  cellClassName?: string;
}

export const budgetTableFeatures = tableFeatures({
  columnSizingFeature,
  columnResizingFeature,
  columnVisibilityFeature,
  rowExpandingFeature,
  rowSortingFeature,
  expandedRowModel: createExpandedRowModel(),
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
  columnMeta: metaHelper<BudgetColumnMeta>(),
});

export type BudgetTableFeatures = typeof budgetTableFeatures;

export type BudgetColumn<T extends RowData> = ColumnDef<BudgetTableFeatures, T, unknown>;
