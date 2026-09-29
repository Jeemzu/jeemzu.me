import { useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import type { ImportPayload } from '../state/budget';
import type { CellGrid, CellValue, ColumnMapping, RowReport, WorkbookGrids } from '../lib/importer';
import {
  analyzeWorkbook,
  columnLetter,
  detectMapping,
  downloadTemplateWorkbook,
  extractBills,
  gridColumnCount,
  readWorkbook,
} from '../lib/importer';
import { formatMoney } from '../lib/money';
import { monthLabel } from '../lib/paydays';
import { monthlyGrossCents } from '../types';

const PREVIEW_ROWS = 12;
const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.xlsm', '.ods', '.csv'];

interface Props {
  dirty: boolean;
  hasData: boolean;
  onImport: (payload: ImportPayload) => void;
  onClose: () => void;
}

function displayCell(value: CellValue | undefined): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toLocaleDateString('en-US');
  return String(value);
}

function ReportTable({ reports }: { reports: RowReport[] }) {
  return (
    <div className="table-wrap report-wrap">
      <table className="report-table">
        <thead>
          <tr>
            <th>Row</th>
            <th>Name</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={`${report.rowNumber}-${report.name}`} className={`report-${report.status}`}>
              <td>{report.rowNumber}</td>
              <td>{report.name}</td>
              <td>
                {report.status === 'ok' ? '✓' : report.status === 'warning' ? '⚠' : '✕'}{' '}
                {report.message}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ImportWizard({ dirty, hasData, onImport, onClose }: Props) {
  const [workbook, setWorkbook] = useState<WorkbookGrids | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [manual, setManual] = useState(false);
  const [sheet, setSheet] = useState('');
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [dragging, setDragging] = useState(false);
  // Counts nested dragenter/dragleave pairs so child elements don't flicker the highlight.
  const dragDepth = useRef(0);

  const analysis = useMemo(() => (workbook ? analyzeWorkbook(workbook) : null), [workbook]);

  const grid: CellGrid | null = workbook && sheet ? workbook.grids[sheet] : null;
  const colCount = grid ? gridColumnCount(grid) : 0;

  const manualExtraction = useMemo(() => {
    if (!grid || !mapping) return null;
    return extractBills(grid, mapping);
  }, [grid, mapping]);

  function applySheet(grids: WorkbookGrids, name: string) {
    setSheet(name);
    const detected = detectMapping(grids.grids[name]);
    setMapping(
      detected ?? {
        headerRow: 0,
        bodyEndRow: grids.grids[name].length,
        nameCol: 0,
        amountCol: Math.min(1, gridColumnCount(grids.grids[name]) - 1),
        dueDayCol: null,
      },
    );
  }

  async function handleFile(file: File) {
    const lowerName = file.name.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
      setFileError(`Unsupported file type. Use one of: ${ACCEPTED_EXTENSIONS.join(', ')}.`);
      return;
    }
    try {
      const grids = readWorkbook(await file.arrayBuffer());
      if (grids.sheetNames.length === 0) {
        setFileError('No sheets were found in that workbook.');
        return;
      }
      setFileName(file.name);
      setWorkbook(grids);
      setManual(false);
      applySheet(grids, grids.sheetNames[0]);
      setFileError('');
    } catch {
      setFileError('Could not read that file as an Excel workbook (.xlsx).');
    }
  }

  function hasFiles(e: DragEvent) {
    return e.dataTransfer.types.includes('Files');
  }

  function handleDragEnter(e: DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }

  function handleDragOver(e: DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  function handleDragLeave(e: DragEvent) {
    if (!hasFiles(e)) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  function handleDrop(e: DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  function confirmReplace(sections: string[]): boolean {
    if (!hasData) return true;
    const suffix = dirty ? ' You have unsaved edits that will be lost.' : '';
    return window.confirm(`Importing replaces your current ${sections.join(', ')}.${suffix} Continue?`);
  }

  function handleAutoImport() {
    if (!analysis) return;
    const payload: ImportPayload = {};
    const sections: string[] = [];
    if (analysis.bills && analysis.bills.extraction.bills.length > 0) {
      payload.bills = analysis.bills.extraction.bills;
      sections.push('bills');
    }
    if (analysis.debts && analysis.debts.extraction.debts.length > 0) {
      payload.debts = analysis.debts.extraction.debts;
      sections.push('debts');
    }
    if (analysis.people.length > 0) {
      payload.people = analysis.people;
      sections.push('income');
    }
    if (sections.length === 0 || !confirmReplace(sections)) return;
    onImport(payload);
    onClose();
  }

  function handleManualImport() {
    if (!manualExtraction || manualExtraction.bills.length === 0) return;
    if (!confirmReplace(['bills'])) return;
    onImport({ bills: manualExtraction.bills });
    onClose();
  }

  const autoBillCount = analysis?.bills?.extraction.bills.length ?? 0;
  const autoDebtCount = analysis?.debts?.extraction.debts.length ?? 0;
  const autoPeopleCount = analysis?.people.length ?? 0;
  const autoHasAnything = autoBillCount + autoDebtCount + autoPeopleCount > 0;

  const headerTexts: string[] = [];
  if (grid && mapping) {
    const headerRow = grid[mapping.headerRow] ?? [];
    for (let i = 0; i < colCount; i++) headerTexts.push(displayCell(headerRow[i]).trim());
  }

  const columnOptions = headerTexts.map((text, i) => (
    <option key={i} value={i}>
      {columnLetter(i)} — {text || '(blank)'}
    </option>
  ));

  const okCount = manualExtraction?.reports.filter((r) => r.status === 'ok').length ?? 0;
  const warnCount = manualExtraction?.reports.filter((r) => r.status === 'warning').length ?? 0;
  const errorCount = manualExtraction?.reports.filter((r) => r.status === 'error').length ?? 0;

  function updateMapping(patch: Partial<ColumnMapping>) {
    if (mapping) setMapping({ ...mapping, ...patch });
  }

  function fileInput(label: string) {
    return (
      <label className="btn file-btn">
        {label}
        <input
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
      </label>
    );
  }

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Import Excel workbook"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`modal${dragging ? ' drag-active' : ''}`}>
        <div className="modal-head">
          <h2>Import from Excel</h2>
          <button type="button" className="btn ghost" onClick={onClose} aria-label="Close import">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {workbook ? (
            <div className="import-file-row">
              {fileInput(`Change file (${fileName})`)}
              <button type="button" className="btn ghost" onClick={downloadTemplateWorkbook}>
                Download template
              </button>
              <button type="button" className="btn ghost" onClick={() => setManual(!manual)}>
                {manual ? '← Back to automatic import' : 'Map bill columns manually…'}
              </button>
            </div>
          ) : (
            <div className="dropzone">
              <p className="drop-hint">
                {dragging ? 'Drop to import' : 'Drag & drop a workbook here'}
              </p>
              <span>or</span>
              <div className="import-file-row">
                {fileInput('Choose file…')}
                <button type="button" className="btn ghost" onClick={downloadTemplateWorkbook}>
                  Download template
                </button>
              </div>
              <span className="muted">{ACCEPTED_EXTENSIONS.join(', ')}</span>
            </div>
          )}

          {workbook && dragging && <p className="drop-hint">Drop to replace {fileName}</p>}

          {fileError && <p className="banner error">{fileError}</p>}

          {workbook && analysis && !manual && (
            <>
              {!autoHasAnything && (
                <p className="banner warning">
                  Nothing recognizable was found. Try the manual column mapping, or download the
                  template and copy your bills into it.
                </p>
              )}

              <h3>
                Bills{' '}
                <span className="muted">
                  {analysis.bills
                    ? `${autoBillCount} found on “${analysis.bills.sheet}”`
                    : 'no bills table found'}
                </span>
              </h3>
              {analysis.bills && <ReportTable reports={analysis.bills.extraction.reports} />}

              <h3>
                Debt accounts{' '}
                <span className="muted">
                  {analysis.debts
                    ? `${autoDebtCount} found on “${analysis.debts.sheet}”`
                    : 'no debts table found'}
                </span>
              </h3>
              {analysis.debts && <ReportTable reports={analysis.debts.extraction.reports} />}

              <h3>
                Income{' '}
                <span className="muted">
                  {analysis.income
                    ? `${autoPeopleCount} people · ${analysis.income.extraction.months.length} months on “${analysis.income.sheet}”`
                    : 'no Gross Income table found (needs Year, Month, and “… Deposit Amount per Paycheck” columns)'}
                </span>
              </h3>
              {analysis.income && (
                <>
                  <div className="table-wrap report-wrap">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Person</th>
                          <th>Months</th>
                          <th>Range</th>
                          <th>First month gross</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.people.map((person) => {
                          const first = person.schedule[0];
                          const last = person.schedule[person.schedule.length - 1];
                          return (
                            <tr key={person.name}>
                              <td>{person.name}</td>
                              <td>{person.schedule.length}</td>
                              <td>
                                {first
                                  ? `${monthLabel(first)} – ${monthLabel(last)}`
                                  : '—'}
                              </td>
                              <td>{first ? formatMoney(monthlyGrossCents(first)) : '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <ReportTable reports={analysis.income.extraction.reports} />
                  <p className="muted">
                    Months outside this range stay blank in the projection until you add them by
                    hand.
                  </p>
                </>
              )}
            </>
          )}

          {workbook && grid && mapping && manual && (
            <>
              {workbook.sheetNames.length > 1 && (
                <div className="sheet-tabs" role="tablist" aria-label="Sheets">
                  {workbook.sheetNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      role="tab"
                      aria-selected={name === sheet}
                      className={`sheet-tab${name === sheet ? ' active' : ''}`}
                      onClick={() => applySheet(workbook, name)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}

              <div className="mapping-grid">
                <label>
                  Header row
                  <input
                    type="number"
                    min={1}
                    max={grid.length}
                    value={mapping.headerRow + 1}
                    onChange={(e) => {
                      const row = Number(e.target.value) - 1;
                      if (Number.isInteger(row) && row >= 0 && row < grid.length) {
                        updateMapping({ headerRow: row });
                      }
                    }}
                  />
                </label>
                <label>
                  Bill name
                  <select value={mapping.nameCol} onChange={(e) => updateMapping({ nameCol: Number(e.target.value) })}>
                    {columnOptions}
                  </select>
                </label>
                <label>
                  Monthly amount
                  <select value={mapping.amountCol} onChange={(e) => updateMapping({ amountCol: Number(e.target.value) })}>
                    {columnOptions}
                  </select>
                </label>
                <label>
                  Due day (optional)
                  <select
                    value={mapping.dueDayCol ?? ''}
                    onChange={(e) => updateMapping({ dueDayCol: e.target.value === '' ? null : Number(e.target.value) })}
                  >
                    <option value="">— none —</option>
                    {columnOptions}
                  </select>
                </label>
              </div>

              <h3>Sheet preview</h3>
              <div className="table-wrap preview-wrap">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th className="rownum" />
                      {Array.from({ length: colCount }, (_, i) => (
                        <th key={i} className={mappedClass(i, mapping)}>
                          {columnLetter(i)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grid.slice(0, PREVIEW_ROWS).map((row, r) => (
                      <tr key={r} className={r === mapping.headerRow ? 'header-row' : ''}>
                        <td className="rownum">{r + 1}</td>
                        {Array.from({ length: colCount }, (_, c) => (
                          <td key={c} className={mappedClass(c, mapping)}>
                            {displayCell(row[c])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {grid.length > PREVIEW_ROWS && (
                <p className="muted">Showing the first {PREVIEW_ROWS} of {grid.length} rows.</p>
              )}

              <h3>
                Import result{' '}
                <span className="muted">
                  {okCount} ready · {warnCount} warnings · {errorCount} errors
                </span>
              </h3>
              {manualExtraction && manualExtraction.reports.length > 0 ? (
                <ReportTable reports={manualExtraction.reports} />
              ) : (
                <p className="banner warning">
                  No bill rows found with this mapping. Adjust the columns above or use the template.
                </p>
              )}
            </>
          )}
        </div>

        <div className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          {manual ? (
            <button
              type="button"
              className="btn primary"
              disabled={!manualExtraction || manualExtraction.bills.length === 0}
              onClick={handleManualImport}
            >
              Import {manualExtraction?.bills.length ?? 0} bills
            </button>
          ) : (
            <button type="button" className="btn primary" disabled={!autoHasAnything} onClick={handleAutoImport}>
              Import{autoBillCount > 0 ? ` ${autoBillCount} bills` : ''}
              {autoDebtCount > 0 ? ` · ${autoDebtCount} debts` : ''}
              {autoPeopleCount > 0 ? ` · ${autoPeopleCount} people` : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function mappedClass(col: number, mapping: ColumnMapping): string {
  if (col === mapping.nameCol) return 'map-name';
  if (col === mapping.amountCol) return 'map-amount';
  if (col === mapping.dueDayCol) return 'map-due';
  return '';
}
