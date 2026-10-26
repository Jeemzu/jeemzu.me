import { useCallback, useEffect, useRef, useState } from "react";
import { getGameSummary, getHighScores, saveHighScore } from "../utils/gameApi";
import { useAuthStore } from "../stores/authStore";
import type { GameHighScore, GameStat } from "../lib/GameTypes";
import type { GameEvent, HudItem } from "./contract";
import { toast } from "sonner";

export interface GameSessionState {
  score: number;
  hud: HudItem[];
  personalBest: number;
  allTimeHigh: { score: number; username: string } | null;
  isNewAllTimeHigh: boolean;
  gameOver: { score: number; stats: GameStat[] } | null;
  leaderboard: GameHighScore[];
  leaderboardLoading: boolean;
}

/**
 * Score, leaderboard and game-over state for one game/leaderboard id.
 * New personal bests are submitted automatically for signed-in players.
 */
export function useGameSession(leaderboardId: string | null) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const username = useAuthStore((s) => s.username);
  const identity = JSON.stringify([leaderboardId, isAuthenticated, username]);

  const [score, setScore] = useState(0);
  const [hud, setHud] = useState<HudItem[]>([]);
  const [personalBest, setPersonalBest] = useState(0);
  const [allTimeHigh, setAllTimeHigh] = useState<GameSessionState["allTimeHigh"]>(null);
  const [isNewAllTimeHigh, setIsNewAllTimeHigh] = useState(false);
  const [gameOver, setGameOver] = useState<GameSessionState["gameOver"]>(null);
  const [leaderboard, setLeaderboard] = useState<GameHighScore[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Game events arrive from outside React; refs keep comparisons current without re-subscribing.
  const latest = useRef({ personalBest, allTimeHigh, isAuthenticated, username, leaderboardId, identity });
  latest.current = { personalBest, allTimeHigh, isAuthenticated, username, leaderboardId, identity };
  const leaderboardRequest = useRef(0);
  const cancelLeaderboard = useCallback(() => { leaderboardRequest.current++; }, []);

  const refreshLeaderboard = useCallback(async () => {
    if (!leaderboardId) return;
    const request = ++leaderboardRequest.current;
    setLeaderboardLoading(true);
    try {
      const scores = await getHighScores(leaderboardId, 10);
      if (latest.current.identity === identity && leaderboardRequest.current === request) setLeaderboard(scores);
    } finally {
      if (latest.current.identity === identity && leaderboardRequest.current === request) setLeaderboardLoading(false);
    }
  }, [leaderboardId, identity]);

  useEffect(() => {
    setPersonalBest(0);
    setAllTimeHigh(null);
    setLeaderboard([]);
    setLeaderboardLoading(false);
    latest.current.personalBest = 0;
    latest.current.allTimeHigh = null;
    if (!leaderboardId) return;
    let cancelled = false;
    void getGameSummary(leaderboardId).then((s) => {
      if (cancelled) return;
      setPersonalBest((best) => Math.max(best, s.personalBest));
      setAllTimeHigh((best) => (best?.score ?? 0) > (s.allTimeHigh?.score ?? 0) ? best : s.allTimeHigh);
    });
    void refreshLeaderboard();
    return () => {
      cancelled = true;
      cancelLeaderboard();
    };
  }, [leaderboardId, identity, refreshLeaderboard, cancelLeaderboard]);

  const handleEvent = useCallback(
    (e: GameEvent) => {
      switch (e.type) {
        case "score":
          setScore(e.score);
          break;
        case "hud":
          setHud(e.items);
          break;
        case "gameOver": {
          const cur = latest.current;
          setScore(e.score);
          setGameOver({ score: e.score, stats: e.stats ?? [] });
          if (!cur.leaderboardId) break;
          if (e.score > cur.personalBest) {
            cur.personalBest = e.score;
            setPersonalBest(e.score);
            if (cur.isAuthenticated) {
              void saveHighScore(cur.leaderboardId, e.score).then((r) => {
                if (latest.current.identity !== cur.identity) return;
                if (r.success) void refreshLeaderboard();
                else toast.error("Could not save your high score.");
              });
            }
          }
          if (e.score > (cur.allTimeHigh?.score ?? 0)) {
            setIsNewAllTimeHigh(true);
            cur.allTimeHigh = { score: e.score, username: cur.username ?? "you" };
            setAllTimeHigh(cur.allTimeHigh);
          }
          break;
        }
        case "levelComplete":
          break;
      }
    },
    [refreshLeaderboard],
  );

  /** Clears per-run state before a new run starts. */
  const resetRun = useCallback(() => {
    setScore(0);
    setHud([]);
    setGameOver(null);
    setIsNewAllTimeHigh(false);
  }, []);

  const state: GameSessionState = {
    score,
    hud,
    personalBest,
    allTimeHigh,
    isNewAllTimeHigh,
    gameOver,
    leaderboard,
    leaderboardLoading,
  };

  return { state, handleEvent, resetRun, refreshLeaderboard };
}
