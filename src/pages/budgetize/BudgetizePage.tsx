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
import { createPortal } from "react-dom";
import type { DebtPaymentStrategy, MonthRef } from "./types";
import { emptyBudget, monthlyRecurrence } from "./types";
import { budgetReducer, initialState } from "./state/budget";
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
import { PersonalSplitCard } from "./components/PersonalSplitCard";
import { InfoTip } from "./components/InfoTip";
import { FundingWarnings } from "./components/FundingWarnings";
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
  { id: "month", label: "This month" },
  { id: "projections", label: "Projections" },
  { id: "data", label: "Edit data" },
  { id: "assistant", label: "Assistant" },
] as const;

type ViewTab = (typeof VIEW_TABS)[number]["id"];

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
  const [state, dispatch] = useReducer(budgetReducer, initialState);
  const [monthRef, setMonthRef] = useState<MonthRef>(currentMonth);
  const [importOpen, setImportOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [tab, setTab] = useState<ViewTab>("month");
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  // Raw server payload that failed validation; enables backup + reset on the error screen.
  const [unreadable, setUnreadable] = useState<unknown>(null);
  const [resetting, setResetting] = useState(false);
  const [revision, setRevision] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const strategy = state.data.debtStrategy;
  const setStrategy = (next: DebtPaymentStrategy) =>
    dispatch({ type: "set-debt-strategy", strategy: next });
  const customStartISO = state.data.projectionStartISO;
  const start = useMemo(
    () => resolveProjectionStart(customStartISO),
    [customStartISO],
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
  }, [state.data, start, weekCount, strategy, depositMode, fundingPlan, allocationFor]);

  const load = useCallback(async () => {
    setLoadState("loading");
    setConflict(false);
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
  }, [load]);

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
    setConflict(false);
    setNotice(null);
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
    setSaving(true);
    const result = await saveBudget(snapshot, revision);
    setSaving(false);

    if (result.status === "ok") {
      setRevision(result.revision);
      setConflict(false);
      dispatch({ type: "mark-saved", data: snapshot });
      setNotice({ kind: "info", text: "Budget saved." });
      return;
    }
    if (result.status === "conflict") {
      setConflict(true);
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
    setNotice(null);
    void load();
  }

  function handleBackupDownload() {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadBlob(
      `budgetize-me-backup-${stamp}.json`,
      new Blob([serializeBackup(state.data)], { type: "application/json" }),
    );
    setNotice({
      kind: "info",
      text: "Backup downloaded. This is a local copy — it does not save to the server.",
    });
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
      `budgetize-me-unreadable-${stamp}.json`,
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

  return (
    <div className="budgetize">
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <h1>💵 Budgetize Me</h1>
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
              onClick={() => setImportOpen(true)}
            >
              Import…
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleBackupDownload}
            >
              Export backup
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

        {conflict && (
          <div className="banner error" role="alert">
            <span>
              This budget was saved on another device, so nothing was saved
              here. Download a backup of your edits, then reload the newer
              version.
            </span>
            <button type="button" className="btn ghost" onClick={handleReload}>
              Reload
            </button>
          </div>
        )}

        {notice && (
          <div className={`banner ${notice.kind}`} role="status">
            <span>{notice.text}</span>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setNotice(null)}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        <main>
          {!isEmpty && <FundingWarnings warnings={fundingWarnings} />}
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
              <button
                type="button"
                className="btn primary"
                onClick={() => setImportOpen(true)}
              >
                Import workbook or backup
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => void handleTemplateDownload()}
              >
                Download spreadsheet template
              </button>
            </section>
          )}

          <div className="view-bar">
            <div className="view-tabs" role="tablist" aria-label="Sections">
              {VIEW_TABS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === entry.id}
                  // The assistant needs a signed-in session to reach the API.
                  disabled={entry.id === "assistant" && !isAuthenticated}
                  title={
                    entry.id === "assistant" && !isAuthenticated
                      ? "Sign in to use the assistant"
                      : undefined
                  }
                  className={`view-tab${tab === entry.id ? " active" : ""}`}
                  onClick={() => setTab(entry.id)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
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
              {customStartISO !== null && (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() =>
                    dispatch({ type: "set-projection-start", iso: null })
                  }
                >
                  Use today
                </button>
              )}
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
                    deposits are unknown rather than zero. Hover a “Payments due” cell for
                    the item list.
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
                  onRemove={(id) => dispatch({ type: "remove-person", id })}
                />
              </section>

              <section className="card">
                <h3>Monthly bills</h3>
                <BillsEditor
                  bills={state.data.bills}
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
                <h3>Debt accounts</h3>
                <DebtsEditor
                  debts={state.data.debts}
                  strategy={strategy}
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
                    onAdd={(event) => dispatch({ type: "add-one-off", event })}
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

        {/* Portaled out of the app's zIndex:1 content box so it can sit above the sticky nav. */}
        {importOpen &&
          createPortal(
            <div className="budgetize budgetize-portal">
              <Suspense
                fallback={
                  <div className="overlay">
                    <div className="modal modal-loading">Loading importer…</div>
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
    </div>
  );
}
