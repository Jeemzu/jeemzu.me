import type { BudgetData } from '../types';
import { budgetReducer, initialState, type Action, type AppState } from './budget';

export interface BudgetHistoryState extends AppState {
  past: BudgetData[];
  future: BudgetData[];
  savedData: BudgetData;
  editing: boolean;
  editRecorded: boolean;
}

export type HistoryAction = Action
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'begin-edit' }
  | { type: 'end-edit' };

export const initialHistoryState: BudgetHistoryState = {
  ...initialState,
  past: [],
  future: [],
  savedData: initialState.data,
  editing: false,
  editRecorded: false,
};

const sameData = (a: BudgetData, b: BudgetData) => a === b || JSON.stringify(a) === JSON.stringify(b);
const remember = (past: BudgetData[], data: BudgetData) => [...past, data].slice(-100);

export function budgetHistoryReducer(state: BudgetHistoryState, action: HistoryAction): BudgetHistoryState {
  if (action.type === 'begin-edit' || action.type === 'end-edit') {
    return { ...state, editing: action.type === 'begin-edit', editRecorded: false };
  }
  if (action.type === 'hydrate') {
    return { ...initialHistoryState, data: action.data, savedData: action.data };
  }
  if (action.type === 'mark-saved') {
    return { ...state, savedData: action.data, dirty: !sameData(state.data, action.data) };
  }
  if (action.type === 'undo' || action.type === 'redo') {
    const source = action.type === 'undo' ? state.past : state.future;
    const data = source[source.length - 1];
    if (!data) return state;
    return {
      ...state,
      data,
      dirty: !sameData(data, state.savedData),
      past: action.type === 'undo' ? state.past.slice(0, -1) : remember(state.past, state.data),
      future: action.type === 'undo' ? remember(state.future, state.data) : state.future.slice(0, -1),
      editing: false,
      editRecorded: false,
    };
  }
  const next = budgetReducer(state, action);
  if (sameData(state.data, next.data)) return state;
  return {
    ...state,
    ...next,
    dirty: !sameData(next.data, state.savedData),
    past: state.editing && state.editRecorded ? state.past : remember(state.past, state.data),
    future: [],
    editRecorded: state.editing,
  };
}
