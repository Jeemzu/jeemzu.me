import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import { Button, Stack, Tooltip } from "@mui/material";
import { FaDownload, FaFileExport, FaTableCells, FaUpload } from "react-icons/fa6";
import ActionSidebar from "../../components/shared/ActionSidebar";
import PageHeading from "../../components/shared/PageHeading";
import type { DebtPaymentStrategy, MonthRef } from "./types";
import { emptyBudget, monthlyRecurrence } from "./types";
import { budgetHistoryReducer, initialHistoryState } from "./state/history";
import { computeMonthSummary } from "./lib/schedule";
import { addMonths, monthLabel, toISODate } from "./lib/paydays";
import { resolveProjectionStart } from "./lib/recurrence";
import {
  computeProjection,
  PROJECTION_RANGES,
  weeksForRange,
  type ProjectionRange,
} from "./lib/projection";
import { computeFundingPlan, createFundedAllocator } from "./lib/funding";
import { computeFundingWarnings } from "./lib/warnings";
import { computeDebtPayoffRecommendation } from "./lib/debtRecommendation";
import { parseBudgetData, serializeBackup } from "./lib/backup";
import { downloadBlob } from "./lib/download";
import { SummaryCards } from "./components/SummaryCards";
import { CalendarView } from "./components/CalendarView";
import { UpcomingList } from "./components/UpcomingList";
import { CategoryBreakdown } from "./components/CategoryBreakdown";
import { PeopleEditor } from "./components/PeopleEditor";
import { BillsEditor } from "./components/BillsEditor";
import { DebtsEditor } from "./components/DebtsEditor";
import { OverridesEditor } from "./components/OverridesEditor";
import { OneOffsEditor } from "./components/OneOffsEditor";
import { ProjectionView } from "./components/ProjectionView";
import { AccountPlanCard } from "./components/AccountPlanCard";
import { DebtPayoffCard } from "./components/DebtPayoffCard";
import { PersonalSplitCard } from "./components/PersonalSplitCard";
import { PersonalExpensesEditor } from "./components/PersonalExpensesEditor";
import { InfoTip } from "./components/InfoTip";
import { BudgetNotifications, type BudgetNotification } from "./components/BudgetNotifications";
import { BudgetAssistant } from "./components/BudgetAssistant";
import { useProjectionRange } from "./components/useProjectionRange";
import { useDepositMode } from "./components/useDepositMode";
import { useAuthStore } from "../../stores/authStore";
import { deleteBudget, loadBudget, saveBudget } from "../../utils/budgetApi";
import UserAuthModal from "../../components/shared/UserAuthModal";
import "./budgetize.css";

// Loaded on demand so the xlsx library stays out of the main bundle.
const ImportWizard = lazy(() =>
  import("./components/ImportWizard").then((m) => ({
    default: m.ImportWizard,
  })),
);

function currentMonth(): MonthRef {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

interface Notice {
  kind: "info" | "error";
  text: string;
}

const VIEW_TABS = [
  { id: "month", label: "This month", tooltip: "View this month's calendar, upcoming payments, and budget summary." },
  { id: "projections", label: "Projections", tooltip: "View projected balances and account funding plans." },
  { id: "personal", label: "Personal planning", tooltip: "Plan shared and individual personal expenses and balances." },
  { id: "data", label: "Edit data", tooltip: "Edit income, people, bills, debts, and one-time entries." },
  { id: "assistant", label: "Assistant", tooltip: "Chat with the budget assistant and review proposed budget changes." },
] as const;

type ViewTab = (typeof VIEW_TABS)[number]["id"];

const TOOLTIP_BG = "#1f3a5f";
const TOOLTIP_BORDER = "#c8a24a";

function SidebarTooltip({ title, children }: { title: string; children: ReactElement }) {
  return (
    <Tooltip
      title={title}
      placement="right"
      arrow
      disableFocusListener
      disableTouchListener
      slotProps={{
        tooltip: {
          sx: {
            bgcolor: TOOLTIP_BG,
            color: "#f3e7c4",
            border: `1px solid ${TOOLTIP_BORDER}`,
            borderRadius: "6px",
            fontSize: "0.8rem",
            px: 1.5,
            py: 1,
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.5)",
          },
        },
        arrow: {
          sx: {
            color: TOOLTIP_BG,
            "&::before": {
              backgroundColor: TOOLTIP_BG,
              borderLeft: `1px solid ${TOOLTIP_BORDER}`,
              borderBottom: `1px solid ${TOOLTIP_BORDER}`,
              boxSizing: "border-box",
            },
          },
        },
      }}
    >
      {children}
    </Tooltip>
  );
}

type LoadState = "loading" | "ready" | "error";

export default function BudgetizePage() {
  const { isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="budgetize">
        <div className="app">
          <p className="muted">Checking your session…</p>
        </div>
      </div>
    );
  }

  return <BudgetWorkspace />;
}

function BudgetWorkspace() {
  const { isAuthenticated } = useAuthStore();
  const [state, dispatch] = useReducer(
    budgetHistoryReducer,
    initialHistoryState,
  );
  const [monthRef, setMonthRef] = useState<MonthRef>(currentMonth);
  const [importOpen, setImportOpen] = useState(false);
  const [notices, setNotices] = useState<(Notice & { id: string })[]>([]);
  const setNotice = useCallback((notice: Notice) => {
    setNotices((previous) => [
      ...previous,
      { ...notice, id: crypto.randomUUID() },
    ]);
  }, []);
  const [tab, setTab] = useState<ViewTab>("month");
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  // Raw server payload that failed validation; enables backup + reset on the error screen.
  const [unreadable, setUnreadable] = useState<unknown>(null);
  const [resetting, setResetting] = useState(false);
  const [revision, setRevision] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [conflictId, setConflictId] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !(event.ctrlKey || event.metaKey) ||
        event.altKey ||
        loadState !== "ready"
      )
        return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.matches("input, textarea, select") || target.isContentEditable)
      )
        return;
      const key = event.key.toLowerCase();
      if (key === "z" || (key === "y" && !event.metaKey)) {
        event.preventDefault();
        dispatch({ type: key === "y" || event.shiftKey ? "redo" : "undo" });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loadState]);

  const strategy = state.data.debtStrategy;
  const setStrategy = (next: DebtPaymentStrategy) =>
    dispatch({ type: "set-debt-strategy", strategy: next });
  const customStartISO = state.data.projectionStartISO;
  const resolvedStartISO = toISODate(resolveProjectionStart(customStartISO));
  const start = useMemo(
    () => resolveProjectionStart(resolvedStartISO),
    [resolvedStartISO],
  );
  const startMonth = useMemo<MonthRef>(
    () => ({ year: start.getFullYear(), month: start.getMonth() }),
    [start],
  );
  const [projectionRange, setProjectionRange] = useProjectionRange();
  const [depositMode, setDepositMode] = useDepositMode();
  const weekCount = useMemo(
    () => weeksForRange(projectionRange, start),
    [projectionRange, start],
  );
  const rangeLabel =
    PROJECTION_RANGES.find((r) => r.value === projectionRange)?.label ??
    "8 weeks";

  useEffect(() => {
    setMonthRef(startMonth);
  }, [startMonth]);

  const fundingPlan = useMemo(
    () => computeFundingPlan(state.data, start, strategy),
    [state.data, start, strategy],
  );
  const allocationFor = useMemo(
    () => createFundedAllocator(state.data, fundingPlan, depositMode, strategy),
    [state.data, fundingPlan, depositMode, strategy],
  );
  const debtRecommendation = useMemo(
    () =>
      computeDebtPayoffRecommendation(
        state.data,
        start,
        fundingPlan,
        depositMode,
        strategy,
      ),
    [state.data, start, fundingPlan, depositMode, strategy],
  );

  const summary = useMemo(
    () =>
      computeMonthSummary(
        state.data,
        monthRef.year,
        monthRef.month,
        strategy,
        allocationFor,
      ),
    [state.data, monthRef, strategy, allocationFor],
  );

  const fundingWarnings = useMemo(() => {
    const projection = computeProjection(
      state.data,
      start,
      weekCount,
      strategy,
      depositMode,
    );
    return computeFundingWarnings(
      state.data,
      projection,
      fundingPlan,
      allocationFor,
    );
  }, [
    state.data,
    start,
    weekCount,
    strategy,
    depositMode,
    fundingPlan,
    allocationFor,
  ]);

  const load = useCallback(async () => {
    setLoadState("loading");
    setConflictId(null);
    setUnreadable(null);
    const result = await loadBudget();

    if (result.status === "ok") {
      const parsed = parseBudgetData(result.data);
      if (!parsed.ok) {
        setUnreadable(result.data ?? {});
        setLoadState("error");
        setLoadError(`Your saved budget could not be read: ${parsed.error}`);
        return;
      }
      dispatch({ type: "hydrate", data: parsed.data });
      setRevision(result.revision);
      setLoadState("ready");
      return;
    }

    if (result.status === "empty") {
      dispatch({ type: "hydrate", data: emptyBudget() });
      setRevision(null);
      setLoadState("ready");
      return;
    }

    // Editing stays blocked on failure so a later save cannot replace data we never read.
    setLoadState("error");
    setLoadError(
      result.status === "unauthorized"
        ? "Your session has expired. Sign in again to load your budget."
        : "Could not reach the server to load your budget.",
    );
  }, []);

  useEffect(() => {
    // Guests edit a blank in-memory budget; there is nothing to fetch.
    if (!useAuthStore.getState().isAuthenticated) {
      setLoadState("ready");
      return;
    }
    void load();
  }, [load]);

  // Kept in a ref so the auth-transition effect reads fresh edits without re-running on every keystroke.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const adoptSignIn = useCallback(async () => {
    if (!stateRef.current.dirty) {
      await load();
      return;
    }
    // Guest edits exist — fetch quietly instead of replacing the workspace.
    const result = await loadBudget();
    if (result.status === "empty") {
      setRevision(null);
      setNotice({
        kind: "info",
        text: "Signed in. Choose Save to store your budget.",
      });
      return;
    }
    if (result.status === "ok") {
      const keepEdits = window.confirm(
        "You already have a saved budget. Keep your current edits? Saving will then overwrite the saved budget. Cancel loads the saved budget instead.",
      );
      if (keepEdits) {
        setRevision(result.revision);
        setNotice({
          kind: "info",
          text: "Your edits are kept. Choose Save to overwrite your saved budget.",
        });
        return;
      }
      const parsed = parseBudgetData(result.data);
      if (!parsed.ok) {
        setNotice({
          kind: "error",
          text: `Your saved budget could not be read: ${parsed.error}`,
        });
        return;
      }
      dispatch({ type: "hydrate", data: parsed.data });
      setRevision(result.revision);
      return;
    }
    setNotice({
      kind: "error",
      text: "Could not load your saved budget. Your edits are still here.",
    });
  }, [load, setNotice]);

  const wasAuthenticated = useRef(isAuthenticated);
  useEffect(() => {
    if (isAuthenticated === wasAuthenticated.current) return;
    wasAuthenticated.current = isAuthenticated;
    if (isAuthenticated) {
      void adoptSignIn();
      return;
    }
    // Signing out clears the budget so it never lingers on a shared screen.
    dispatch({ type: "hydrate", data: emptyBudget() });
    setRevision(null);
    setConflictId(null);
    setNotices([]);
    setLoadState("ready");
  }, [isAuthenticated, adoptSignIn]);

  useEffect(() => {
    if (!state.dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [state.dirty]);

  async function handleSave() {
    if (saving) return;
    // Captured so edits made during the request stay marked as unsaved.
    const snapshot = state.data;
    const parsed = parseBudgetData(snapshot);
    if (!parsed.ok) {
      setNotice({ kind: "error", text: parsed.error });
      return;
    }
    setSaving(true);
    const result = await saveBudget(snapshot, revision);
    setSaving(false);

    if (result.status === "ok") {
      setRevision(result.revision);
      setConflictId(null);
      dispatch({ type: "mark-saved", data: snapshot });
      setNotice({ kind: "info", text: "Budget saved." });
      return;
    }
    if (result.status === "conflict") {
      setConflictId(crypto.randomUUID());
      return;
    }
    setNotice({
      kind: "error",
      text:
        result.status === "unauthorized"
          ? "Your session has expired, so nothing was saved. Sign in again."
          : "Could not reach the server, so nothing was saved. Your edits are still here.",
    });
  }

  function handleReload() {
    if (
      state.dirty &&
      !window.confirm(
        "Reloading replaces your unsaved edits with the saved budget. Continue?",
      )
    ) {
      return;
    }
    void load();
  }

  function handleBackupDownload() {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadBlob(
      `budgetize-backup-${stamp}.json`,
      new Blob([serializeBackup(state.data)], { type: "application/json" }),
    );
    setNotice({
      kind: "info",
      text: "Backup downloaded. This is a local copy — it does not save to the server.",
    });
  }

  async function handleSpreadsheetExport() {
    try {
      // Dynamic import keeps the xlsx library out of the main bundle.
      const { downloadExportWorkbook } =
        await import("./lib/spreadsheetExport");
      const stamp = new Date().toISOString().slice(0, 10);
      downloadExportWorkbook(state.data, start, `budgetize-${stamp}.xlsx`);
    } catch {
      setNotice({
        kind: "error",
        text: "Could not generate the spreadsheet. Please try again.",
      });
    }
  }

  async function handleTemplateDownload() {
    try {
      // Dynamic import keeps the xlsx library out of the main bundle.
      const { downloadTemplateWorkbook } = await import("./lib/importer");
      downloadTemplateWorkbook();
    } catch {
      setNotice({
        kind: "error",
        text: "Could not generate the spreadsheet template. Please try again.",
      });
    }
  }

  function handleUnreadableDownload() {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadBlob(
      `budgetize-unreadable-${stamp}.json`,
      new Blob([JSON.stringify(unreadable, null, 2)], {
        type: "application/json",
      }),
    );
  }

  async function handleStartFresh() {
    if (
      !window.confirm(
        "Permanently delete your saved budget from the server and start with an empty one? This cannot be undone.",
      )
    ) {
      return;
    }
    setResetting(true);
    const result = await deleteBudget();
    setResetting(false);

    if (result.status !== "ok") {
      setLoadError(
        result.status === "unauthorized"
          ? "Your session has expired. Sign in again to delete your saved budget."
          : "Could not reach the server, so your saved budget was not deleted.",
      );
      return;
    }
    dispatch({ type: "hydrate", data: emptyBudget() });
    setRevision(null);
    setUnreadable(null);
    setLoadState("ready");
    setNotice({
      kind: "info",
      text: "Saved budget deleted. Import a spreadsheet or add data, then choose Save.",
    });
  }

  if (loadState === "loading") {
    return (
      <div className="budgetize">
        <div className="app">
          <p className="muted">Loading your budget…</p>
        </div>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="budgetize">
        <div className="app">
          <section className="card hero">
            <h2>Budget unavailable</h2>
            <p>{loadError}</p>
            <div className="hero-actions">
              <button
                type="button"
                className="btn primary"
                onClick={() => void load()}
                disabled={resetting}
              >
                Try again
              </button>
              {unreadable !== null && (
                <>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleUnreadableDownload}
                    disabled={resetting}
                  >
                    Download saved data
                  </button>
                  <button
                    type="button"
                    className="btn danger"
                    onClick={() => void handleStartFresh()}
                    disabled={resetting}
                  >
                    {resetting
                      ? "Deleting…"
                      : "Delete saved budget & start fresh"}
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  const isEmpty =
    state.data.bills.length === 0 &&
    state.data.debts.length === 0 &&
    state.data.people.length === 0;

  const notifications: BudgetNotification[] = [
    ...(conflictId
      ? [
          {
            id: `save-conflict:${conflictId}`,
            kind: "error" as const,
            content: (
              <>
                <p>
                  This budget was saved on another device, so nothing was saved
                  here. Download a backup of your edits, then reload the newer
                  version.
                </p>
                <div className="notification-actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={handleBackupDownload}
                  >
                    Export backup
                  </button>
                  <button type="button" className="btn" onClick={handleReload}>
                    Reload
                  </button>
                </div>
              </>
            ),
          },
        ]
      : []),
    ...(!isEmpty
      ? fundingWarnings.map((warning) => ({
          id: `funding:${warning.severity}:${warning.message}`,
          kind: warning.severity,
          content: <p>{warning.message}</p>,
        }))
      : []),
    ...(state.data.debts.some((debt) => debt.balanceCents > 0)
      ? [
          {
            id: `debt:${JSON.stringify(debtRecommendation)}`,
            kind: "info" as const,
            content: <DebtPayoffCard recommendation={debtRecommendation} />,
          },
        ]
      : []),
    ...notices.map((notice) => ({
      id: notice.id,
      kind: notice.kind,
      content: (
        <>
          <p>{notice.text}</p>
          <button
            type="button"
            className="btn ghost"
            onClick={() =>
              setNotices((previous) =>
                previous.filter((entry) => entry.id !== notice.id),
              )
            }
          >
            Dismiss
          </button>
        </>
      ),
    })),
  ];

  return (
    <div
      className="budgetize"
      onFocusCapture={(event) => {
        if (event.target.matches("input, textarea, select"))
          dispatch({ type: "begin-edit" });
      }}
      onBlurCapture={(event) => {
        if (event.target.matches("input, textarea, select"))
          dispatch({ type: "end-edit" });
      }}
    >
      <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
        <ActionSidebar
          title="Budgetize tools"
          sections={[
            {
              id: "views",
              label: "Views",
              icon: <FaTableCells />,
              content: (
                <nav aria-label="Budgetize sections">
                  {VIEW_TABS.map((entry) => (
                    <SidebarTooltip
                      key={entry.id}
                      title={
                        entry.id === "assistant" && !isAuthenticated
                          ? "Sign in to use the assistant."
                          : entry.tooltip
                      }
                    >
                      <span style={{ display: "block" }}>
                        <Button
                          variant="text"
                          aria-current={tab === entry.id ? "page" : undefined}
                          disabled={
                            entry.id === "assistant" && !isAuthenticated
                          }
                          onClick={() => setTab(entry.id)}
                        >
                          {entry.label}
                        </Button>
                      </span>
                    </SidebarTooltip>
                  ))}
                </nav>
              ),
            },
            {
              id: "transfer",
              label: "Import / export",
              icon: <FaFileExport />,
              content: (
                <>
                  <SidebarTooltip title="Import an Excel budget workbook or restore a JSON backup.">
                    <Button
                      variant="text"
                      startIcon={<FaUpload />}
                      onClick={() => setImportOpen(true)}
                    >
                      Import…
                    </Button>
                  </SidebarTooltip>
                  <SidebarTooltip title="Download a blank Excel workbook to fill in and import.">
                    <Button
                      variant="text"
                      startIcon={<FaDownload />}
                      onClick={() => void handleTemplateDownload()}
                    >
                      Download template
                    </Button>
                  </SidebarTooltip>
                  <SidebarTooltip title="Download a JSON backup that can restore your budget. This does not save to your account.">
                    <Button
                      variant="text"
                      startIcon={<FaDownload />}
                      onClick={handleBackupDownload}
                    >
                      Export backup
                    </Button>
                  </SidebarTooltip>
                  <SidebarTooltip title="Export every table as a sheet in an Excel workbook for other tools. Use a JSON backup to restore your budget.">
                    <Button
                      variant="text"
                      startIcon={<FaFileExport />}
                      onClick={() => void handleSpreadsheetExport()}
                    >
                      Export spreadsheet
                    </Button>
                  </SidebarTooltip>
                </>
              ),
            },
          ]}
        />
        <div className="app workspace">
          <PageHeading title="Budgetize" />
          <header className="topbar">
            <div className="brand">
              <span className={`save-status${state.dirty ? " dirty" : ""}`}>
                {!isAuthenticated
                  ? "Guest mode — sign in to save"
                  : state.dirty
                    ? "● Unsaved changes"
                    : "✓ All changes saved"}
              </span>
            </div>
            <div className="topbar-actions">
              <button
                type="button"
                className="btn"
                disabled={state.past.length === 0 && !state.editing}
                title="Undo last budget edit (Ctrl/Cmd+Z outside a field)"
                onClick={() => dispatch({ type: "undo" })}
              >
                Undo
              </button>
              <button
                type="button"
                className="btn"
                disabled={state.future.length === 0}
                title="Redo last undone edit (Ctrl/Cmd+Shift+Z outside a field)"
                onClick={() => dispatch({ type: "redo" })}
              >
                Redo
              </button>
              {isAuthenticated && (
                <button
                  type="button"
                  className="btn"
                  onClick={handleReload}
                  disabled={saving}
                >
                  Reload
                </button>
              )}
              {isAuthenticated ? (
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => void handleSave()}
                  disabled={saving || !state.dirty}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => setLoginOpen(true)}
                >
                  Sign in to save
                </button>
              )}
            </div>
          </header>

          <main>
            <div
              className="view-bar"
              role="group"
              aria-label="Planning settings"
            >
              <div className="strategy-toggle">
                <span id="strategy-label">Debt payments</span>
                <div
                  className="seg"
                  role="group"
                  aria-labelledby="strategy-label"
                >
                  <button
                    type="button"
                    className={strategy === "suggested" ? "active" : ""}
                    title="Promo payoff amount while a promotion is active, otherwise the minimum"
                    onClick={() => setStrategy("suggested")}
                  >
                    Suggested
                  </button>
                  <button
                    type="button"
                    className={strategy === "minimum" ? "active" : ""}
                    title="Always the minimum monthly payment"
                    onClick={() => setStrategy("minimum")}
                  >
                    Minimum
                  </button>
                </div>
              </div>
              <div className="strategy-toggle">
                <label htmlFor="projection-start">Plan from</label>
                <input
                  id="projection-start"
                  type="date"
                  className="text-input"
                  value={toISODate(start)}
                  title="Starting balances are as of this date; paychecks, bills, and projections run from here"
                  onChange={(e) =>
                    dispatch({
                      type: "set-projection-start",
                      iso: e.target.value || null,
                    })
                  }
                />
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    dispatch({ type: "set-projection-start", iso: null });
                    setMonthRef(currentMonth());
                  }}
                >
                  From Today
                </button>
              </div>
              <div className="strategy-toggle">
                <label htmlFor="projection-range">Show</label>
                <select
                  id="projection-range"
                  className="select-input"
                  value={projectionRange}
                  title="How far ahead the projection, warnings, and assistant look"
                  onChange={(e) =>
                    setProjectionRange(e.target.value as ProjectionRange)
                  }
                >
                  {PROJECTION_RANGES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="strategy-toggle">
                <span id="deposit-mode-label">Deposits</span>
                <div
                  className="seg"
                  role="group"
                  aria-labelledby="deposit-mode-label"
                >
                  <button
                    type="button"
                    className={depositMode === "minimum" ? "active" : ""}
                    title="Each month's smallest deposit that keeps auto-pay and essentials from going negative"
                    onClick={() => setDepositMode("minimum")}
                  >
                    Monthly minimum
                  </button>
                  <button
                    type="button"
                    className={depositMode === "flat" ? "active" : ""}
                    title="One amount every Wednesday, sized so auto-pay and essentials never go negative"
                    onClick={() => setDepositMode("flat")}
                  >
                    Flat weekly
                  </button>
                </div>
              </div>
            </div>

            {isEmpty && (
              <section className="card hero">
                <h2>Welcome!</h2>
                <p>
                  Import your Excel budget workbook to pull in your bills, debt
                  accounts, and paycheck deposits, or restore a backup (.json).{" "}
                  {isAuthenticated
                    ? "Choose Save to store your budget so you can pick it up on another machine."
                    : "Sign in to save your budget so you can pick it up on another machine."}
                </p>
              </section>
            )}

            {tab === "month" && (
              <>
                <section className="month-row">
                  <div className="month-nav">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setMonthRef(addMonths(monthRef, -1))}
                      aria-label="Previous month"
                    >
                      ‹
                    </button>
                    <h2>{monthLabel(monthRef)}</h2>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setMonthRef(addMonths(monthRef, 1))}
                      aria-label="Next month"
                    >
                      ›
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => setMonthRef(startMonth)}
                    >
                      {customStartISO !== null ? "Start" : "Today"}
                    </button>
                  </div>
                  <SummaryCards monthRef={monthRef} summary={summary} />
                </section>

                <div className="columns">
                  <section className="card">
                    <h3>Calendar</h3>
                    <CalendarView monthRef={monthRef} summary={summary} />
                  </section>
                  <aside className="side-col">
                    <section className="card">
                      <h3>This month</h3>
                      <UpcomingList
                        monthRef={monthRef}
                        summary={summary}
                        paydayDepositCents={
                          summary.paydays.length > 0
                            ? Math.round(
                                summary.incomeCents / summary.paydays.length,
                              )
                            : 0
                        }
                      />
                    </section>
                    <section className="card">
                      <h3>By category</h3>
                      <CategoryBreakdown categories={summary.categories} />
                    </section>
                  </aside>
                </div>
              </>
            )}

            {tab === "projections" && (
              <>
                <section className="card">
                  <h3>
                    {rangeLabel} balance projection
                    <InfoTip>
                      Balances at the end of each week; click a week to see each
                      day. Weeks start on payday Wednesdays, and the first row
                      covers the start date (today unless “Plan from” is set)
                      through the day before the next payday. Each paycheck is
                      carved into auto-pay funding, shared essentials, and a
                      personal remainder; every bill and debt drafts from the
                      account it&apos;s flagged “Paid from”. Highlighted rows
                      include a payday in a month with no pay schedule, so its
                      deposits are unknown rather than zero. Hover a “Payments
                      due” cell for the item list.
                    </InfoTip>
                  </h3>
                  <ProjectionView
                    data={state.data}
                    start={start}
                    weekCount={weekCount}
                    strategy={strategy}
                    mode={depositMode}
                    onSetEssentialsBalance={(cents) =>
                      dispatch({ type: "set-essentials-balance", cents })
                    }
                    onSetAutopayBalance={(cents) =>
                      dispatch({ type: "set-autopay-balance", cents })
                    }
                  />
                </section>
                <div className="card-row">
                  <section className="card">
                    <h3>Auto-pay account plan</h3>
                    <AccountPlanCard
                      data={state.data}
                      plan={fundingPlan}
                      account="autopay"
                    />
                  </section>
                  <section className="card">
                    <h3>Essentials account plan</h3>
                    <AccountPlanCard
                      data={state.data}
                      plan={fundingPlan}
                      account="shared"
                    />
                  </section>
                </div>
                <PersonalSplitCard
                  data={state.data}
                  months={fundingPlan.months}
                  allocationFor={allocationFor}
                  mode={depositMode}
                />
              </>
            )}

            {tab === "personal" && (
              <>
                <section className="card">
                  <h3>
                    Combined spending plan
                    <InfoTip>
                      Expenses are split by each person&apos;s monthly paycheck
                      remainder after auto-pay and essentials. Missing income
                      uses an equal split marked with *. Negative remainders
                      contribute no weight; if all remainders are zero or
                      negative, the split is equal. Recurring expenses
                      recalculate shares for each charge month.
                    </InfoTip>
                  </h3>
                  <PersonalExpensesEditor
                    expenses={state.data.personalExpenses ?? []}
                    people={state.data.people}
                    personId={null}
                    start={start}
                    allocationFor={allocationFor}
                    onAdd={(expense) =>
                      dispatch({ type: "add-personal-expense", expense })
                    }
                    onUpdate={(id, patch) =>
                      dispatch({ type: "update-personal-expense", id, patch })
                    }
                    onRemove={(id) =>
                      dispatch({ type: "remove-personal-expense", id })
                    }
                  />
                </section>
                <section className="card">
                  <h3>
                    {rangeLabel} combined personal projection
                    <InfoTip>
                      Personal balances only. In includes paycheck remainders
                      and personal deposits. Combined plan and own expenses both
                      reduce the balance. Expand a week for daily balances;
                      highlighted rows have unknown income or provisional equal
                      splits.
                    </InfoTip>
                  </h3>
                  <ProjectionView
                    data={state.data}
                    start={start}
                    weekCount={weekCount}
                    strategy={strategy}
                    mode={depositMode}
                    personalPersonId={null}
                    onSetPersonalBalance={(id, cents) =>
                      dispatch({
                        type: "update-person",
                        id,
                        patch: { personalBalanceCents: cents },
                      })
                    }
                  />
                </section>
                {state.data.people.map((person) => (
                  <section className="card" key={person.id}>
                    <h3>{person.name} — personal plan</h3>
                    <PersonalExpensesEditor
                      expenses={state.data.personalExpenses ?? []}
                      people={state.data.people}
                      personId={person.id}
                      start={start}
                      allocationFor={allocationFor}
                      onAdd={(expense) =>
                        dispatch({ type: "add-personal-expense", expense })
                      }
                      onUpdate={(id, patch) =>
                        dispatch({ type: "update-personal-expense", id, patch })
                      }
                      onRemove={(id) =>
                        dispatch({ type: "remove-personal-expense", id })
                      }
                    />
                    <ProjectionView
                      data={state.data}
                      start={start}
                      weekCount={weekCount}
                      strategy={strategy}
                      mode={depositMode}
                      personalPersonId={person.id}
                      onSetPersonalBalance={(id, cents) =>
                        dispatch({
                          type: "update-person",
                          id,
                          patch: { personalBalanceCents: cents },
                        })
                      }
                    />
                  </section>
                ))}
              </>
            )}

            {tab === "assistant" && (
              <section className="card">
                <h3>Budget assistant</h3>
                <BudgetAssistant
                  data={state.data}
                  start={start}
                  weekCount={weekCount}
                  strategy={strategy}
                  mode={depositMode}
                  onApplyProposal={(ops) =>
                    dispatch({ type: "apply-proposal", ops })
                  }
                />
              </section>
            )}

            {tab === "data" && (
              <>
                <section className="card">
                  <h3>
                    Income &amp; people
                    <InfoTip>
                      Paychecks land every Wednesday, and the count comes from
                      the calendar. Each paycheck is carved into auto-pay
                      funding, shared essentials, and whatever is left as
                      personal spending. Months with no row stay blank in the
                      projection.
                    </InfoTip>
                  </h3>
                  <PeopleEditor
                    data={state.data}
                    allocationFor={allocationFor}
                    onAdd={() =>
                      dispatch({
                        type: "add-person",
                        person: {
                          id: crypto.randomUUID(),
                          name: "New person",
                          schedule: [],
                          personalBalanceCents: 0,
                        },
                      })
                    }
                    onUpdate={(id, patch) =>
                      dispatch({ type: "update-person", id, patch })
                    }
                    onUpdateMany={(updates) =>
                      dispatch({ type: "update-people", updates })
                    }
                    onRemove={(id) => dispatch({ type: "remove-person", id })}
                  />
                </section>

                <section className="card">
                  <h3>Monthly bills</h3>
                  <BillsEditor
                    bills={state.data.bills.filter(
                      (bill) => !bill.isSubscription,
                    )}
                    onAdd={() =>
                      dispatch({
                        type: "add-bill",
                        bill: {
                          id: crypto.randomUUID(),
                          name: "New bill",
                          amountCents: 0,
                          dueDay: 1,
                          paidFrom: "shared",
                          ...monthlyRecurrence(),
                        },
                      })
                    }
                    onUpdate={(id, patch) =>
                      dispatch({ type: "update-bill", id, patch })
                    }
                    onRemove={(id) => dispatch({ type: "remove-bill", id })}
                  />
                </section>

                <section className="card">
                  <h3>
                    Subscriptions
                    <InfoTip>
                      Subscriptions use the same schedules, funding, and
                      calculations as monthly bills.
                    </InfoTip>
                  </h3>
                  <BillsEditor
                    section="subscriptions"
                    bills={state.data.bills.filter(
                      (bill) => bill.isSubscription,
                    )}
                    onAdd={() =>
                      dispatch({
                        type: "add-bill",
                        bill: {
                          id: crypto.randomUUID(),
                          name: "New subscription",
                          isSubscription: true,
                          amountCents: 0,
                          dueDay: 1,
                          paidFrom: "shared",
                          ...monthlyRecurrence(),
                        },
                      })
                    }
                    onUpdate={(id, patch) =>
                      dispatch({ type: "update-bill", id, patch })
                    }
                    onRemove={(id) => dispatch({ type: "remove-bill", id })}
                  />
                </section>

                <section className="card">
                  <h3>Debt accounts</h3>
                  <DebtsEditor
                    debts={state.data.debts}
                    strategy={strategy}
                    asOf={start}
                    onAdd={() =>
                      dispatch({
                        type: "add-debt",
                        debt: {
                          id: crypto.randomUUID(),
                          name: "New debt",
                          balanceCents: 0,
                          minPaymentCents: 0,
                          suggestedPaymentCents: null,
                          hasPromotion: false,
                          interestRateBps: null,
                          promoEndISO: null,
                          postPromoRateBps: null,
                          dueDay: 1,
                          paidFrom: "autopay",
                          ...monthlyRecurrence(),
                        },
                      })
                    }
                    onUpdate={(id, patch) =>
                      dispatch({ type: "update-debt", id, patch })
                    }
                    onRemove={(id) => dispatch({ type: "remove-debt", id })}
                  />
                </section>

                <div className="card-row">
                  <section className="card">
                    <h3>
                      Temporary changes
                      <InfoTip>
                        Pause or re-price a bill or debt for a stretch of time.
                        The item itself stays as it is and resumes on its own
                        once the range ends.
                      </InfoTip>
                    </h3>
                    <OverridesEditor
                      overrides={state.data.overrides}
                      bills={state.data.bills}
                      debts={state.data.debts}
                      onAdd={(override) =>
                        dispatch({ type: "add-override", override })
                      }
                      onUpdate={(id, patch) =>
                        dispatch({ type: "update-override", id, patch })
                      }
                      onRemove={(id) =>
                        dispatch({ type: "remove-override", id })
                      }
                    />
                  </section>

                  <section className="card">
                    <h3>One-time entries</h3>
                    <OneOffsEditor
                      oneOffs={state.data.oneOffs}
                      people={state.data.people}
                      onAdd={(event) =>
                        dispatch({ type: "add-one-off", event })
                      }
                      onUpdate={(id, patch) =>
                        dispatch({ type: "update-one-off", id, patch })
                      }
                      onRemove={(id) =>
                        dispatch({ type: "remove-one-off", id })
                      }
                    />
                  </section>
                </div>
              </>
            )}
          </main>

          {createPortal(
            <div className="budgetize budgetize-portal">
              <BudgetNotifications messages={notifications} />
            </div>,
            document.body,
          )}

          {/* Portaled out of the app's zIndex:1 content box so it can sit above the sticky nav. */}
          {importOpen &&
            createPortal(
              <div className="budgetize budgetize-portal">
                <Suspense
                  fallback={
                    <div className="overlay">
                      <div className="modal modal-loading">
                        Loading importer…
                      </div>
                    </div>
                  }
                >
                  <ImportWizard
                    dirty={state.dirty}
                    hasData={!isEmpty}
                    onImport={(payload) => {
                      dispatch({ type: "import-data", payload });
                      const parts = [
                        payload.bills && `${payload.bills.length} bills`,
                        payload.debts && `${payload.debts.length} debts`,
                        payload.people && `${payload.people.length} people`,
                      ].filter(Boolean);
                      setNotice({
                        kind: "info",
                        text: `Imported ${parts.join(", ")} from spreadsheet. Choose Save to store it.`,
                      });
                    }}
                    onRestore={(data) => {
                      dispatch({ type: "restore", data });
                      setNotice({
                        kind: "info",
                        text: `Backup loaded: ${data.bills.length} bills, ${data.debts.length} debts, ${data.people.length} people. Choose Save to store it.`,
                      });
                    }}
                    onClose={() => setImportOpen(false)}
                  />
                </Suspense>
              </div>,
              document.body,
            )}

          <UserAuthModal
            open={loginOpen}
            onClose={() => setLoginOpen(false)}
            defaultTab="login"
          />
        </div>
      </Stack>
    </div>
  );
}
