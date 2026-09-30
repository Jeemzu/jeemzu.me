import { useEffect, useMemo, useRef, useState } from 'react';
import type { BudgetData, DebtPaymentStrategy } from '../types';
import type {
  AssistantMessage,
  BudgetOp,
  BudgetProposal,
  CapabilityGap,
} from '../../../utils/budgetAgentApi';
import { budgetChat, reportCapabilityGap } from '../../../utils/budgetAgentApi';
import { computeProjection } from '../lib/projection';
import { toISODate } from '../lib/paydays';
import { ProposalPreview } from './ProposalPreview';

interface Props {
  data: BudgetData;
  start: Date;
  weekCount: number;
  strategy: DebtPaymentStrategy;
  onApplyProposal: (ops: BudgetOp[]) => void;
}

const SUGGESTIONS = [
  'My rent is already covered for October and November — it starts again in December.',
  'Which week is my essentials account tightest?',
  'I get a $500 bonus on the 15th. Add it to the shared account.',
  'Cut my streaming bill in half for the next three months.',
];

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  proposal?: BudgetProposal | null;
  gap?: CapabilityGap | null;
}

export function BudgetAssistant({ data, start, weekCount, strategy, onApplyProposal }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Recomputed from the live working copy, so unsaved edits go to the assistant too.
  const projection = useMemo(
    () => computeProjection(data, start, weekCount, strategy),
    [data, start, weekCount, strategy],
  );

  useEffect(() => {
    if (turns.length > 0) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, loading]);

  const send = async (override?: string) => {
    const question = (override ?? input).trim();
    if (!question || loading) return;

    setInput('');
    const history: AssistantMessage[] = turns.map((t) => ({ role: t.role, content: t.content }));
    setTurns([...turns, { role: 'user', content: question }]);
    setLoading(true);

    const result = await budgetChat(question, history, data, projection, strategy, toISODate(start));
    setLoading(false);

    if (result.status !== 'ok') {
      const message =
        result.status === 'unauthorized'
          ? 'Your session expired. Sign in again to keep chatting.'
          : result.status === 'unavailable'
            ? "The assistant isn't running right now. Try again in a moment."
            : 'Something went wrong reaching the assistant.';
      setTurns((prev) => [...prev, { role: 'assistant', content: message }]);
      return;
    }

    if (result.capabilityGap) void reportCapabilityGap(result.capabilityGap);

    setTurns((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: result.answer,
        proposal: result.proposal,
        gap: result.capabilityGap,
      },
    ]);
  };

  const applyAndClear = (index: number, ops: BudgetOp[]) => {
    onApplyProposal(ops);
    clearProposal(index, 'Applied. Review the projection, then save when you\u2019re happy with it.');
  };

  const clearProposal = (index: number, note?: string) => {
    setTurns((prev) =>
      prev.map((turn, i) =>
        i === index
          ? { ...turn, proposal: null, content: note ? `${turn.content}\n\n${note}` : turn.content }
          : turn,
      ),
    );
  };

  return (
    <div className="assistant">
      {turns.length === 0 && (
        <div className="assistant-intro">
          <p>
            Ask about your budget, or describe a change and I&apos;ll propose it for you to review.
            I never edit anything on my own.
          </p>
          <div className="assistant-suggestions">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" className="btn chip" onClick={() => void send(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <ol className="assistant-thread">
        {turns.map((turn, i) => (
          <li key={i} className={`assistant-turn ${turn.role}`}>
            <p className="assistant-text">{turn.content}</p>
            {turn.gap && (
              <p className="assistant-gap">
                Logged as a feature request: <strong>{turn.gap.suggestedFeature}</strong>
              </p>
            )}
            {turn.proposal && turn.proposal.ops.length > 0 && (
              <ProposalPreview
                data={data}
                start={start}
                weekCount={weekCount}
                strategy={strategy}
                proposal={turn.proposal}
                onApply={(ops) => applyAndClear(i, ops)}
                onDiscard={() => clearProposal(i, 'Discarded.')}
              />
            )}
          </li>
        ))}
        {loading && (
          <li className="assistant-turn assistant">
            <p className="muted">Thinking…</p>
          </li>
        )}
      </ol>
      <div ref={endRef} />

      <div className="assistant-input">
        <input
          type="text"
          className="text-input"
          value={input}
          placeholder="Ask about your budget, or describe a change…"
          aria-label="Message the budget assistant"
          disabled={loading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button
          type="button"
          className="btn primary"
          disabled={loading || !input.trim()}
          onClick={() => void send()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
