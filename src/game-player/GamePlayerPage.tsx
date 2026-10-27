import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { Box, Button, IconButton, Tooltip, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import { FONTS, MEDIEVAL_EFFECTS } from "../lib/globals";
import { goldButtonSx, headingSx, outlineButtonSx } from "../lib/medievalStyles";
import { useAuthStore } from "../stores/authStore";
import { GameOverOverlay } from "../components/shared/GameOverOverlay";
import AuthPromptToast from "../components/shared/AuthPromptToast";
import type { GameEntry, GameInstance, GamePanel, ScoreDisplay, ViewportSize } from "./contract";
import { getGameEntry } from "./registry";
import { audioEngine } from "./audio/AudioEngine";
import { AudioSettingsButton } from "./audio/AudioSettingsButton";
import { useGameSession } from "./useGameSession";
import { Viewport } from "./Viewport";
import { SidePanel } from "./SidePanel";
import { StartMenu } from "./overlays/StartMenu";
import { LeaderboardOverlay } from "./overlays/LeaderboardOverlay";
import { PauseOverlay } from "./overlays/PauseOverlay";
import { HudValue } from "./HudValue";
import { OverlayScrim } from "./overlays/OverlayScrim";

type Phase = "menu" | "leaderboard" | "loading" | "playing";

export default function GamePlayerPage() {
  const { gameId = "" } = useParams<{ gameId: string }>();
  const [, navigate] = useLocation();
  const entry = getGameEntry(gameId);

  if (!entry) {
    return (
      <Box sx={{ minHeight: "50vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
        <Typography sx={{ ...headingSx, fontSize: "1.5rem" }}>Game not found</Typography>
        <Button variant="outlined" onClick={() => navigate("/games")} sx={outlineButtonSx}>
          Back to Games
        </Button>
      </Box>
    );
  }
  return <GamePlayer key={entry.id} entry={entry} />;
}

export interface GamePlayerProps {
  entry: GameEntry<unknown>;
  initialOptions?: unknown;
  /** Skips the start menu; quitting to the menu then calls `onExit` instead. */
  autoStart?: boolean;
  /** Replaces the default "back to /games" navigation. */
  onExit?: () => void;
  exitLabel?: string;
}

export function GamePlayer({ entry, initialOptions, autoStart = false, onExit, exitLabel = "Back to Games" }: GamePlayerProps) {
  const [, navigate] = useLocation();
  const username = useAuthStore((s) => s.username) ?? null;
  const exit = onExit ?? (() => navigate("/games"));

  const [phase, setPhase] = useState<Phase>(autoStart ? "loading" : "menu");
  const [options, setOptions] = useState(initialOptions ?? entry.defaultOptions);
  const [paused, setPaused] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [panel, setPanel] = useState<GamePanel | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<GameInstance | null>(null);
  const sizeRef = useRef<ViewportSize | null>(null);
  // Bumped on every teardown so a slow async mount can't attach to a stale session.
  const generation = useRef(0);

  const showLeaderboard = !entry.noLeaderboard;
  const session = useGameSession(showLeaderboard ? entry.leaderboardId(options) : null);
  const { state, handleEvent, resetRun, refreshLeaderboard } = session;
  const handleEventRef = useRef(handleEvent);
  handleEventRef.current = (event) => {
    if (event.type === "panel") setPanel(event.panel);
    else {
      if (event.type === "gameOver") setPanel(null);
      handleEvent(event);
    }
  };

  const format = useCallback(
    (score: number): ScoreDisplay => entry.displayScore?.(score, options) ?? { value: score },
    [entry, options],
  );

  const teardown = useCallback(() => {
    generation.current++;
    instanceRef.current?.destroy();
    instanceRef.current = null;
    audioEngine.stopAll(150);
    audioEngine.resume();
    setPaused(false);
    setPanel(null);
  }, []);

  useEffect(() => teardown, [teardown]);

  const handleStart = async () => {
    const host = hostRef.current;
    if (!host) return;
    const gen = ++generation.current;
    setPhase("loading");
    resetRun();
    try {
      const mod = (await entry.load()).default;
      if (gen !== generation.current) return;
      const instance = await mod.mount(host, {
        audio: audioEngine,
        options,
        emit: (event) => {
          if (gen === generation.current) handleEventRef.current(event);
        },
      });
      if (gen !== generation.current) {
        instance.destroy();
        return;
      }
      instanceRef.current = instance;
      if (sizeRef.current) instance.resize(sizeRef.current);
      instance.start();
      setPhase("playing");
      if (document.visibilityState === "hidden") {
        instance.pause();
        audioEngine.suspend();
        setPaused(true);
      }
    } catch (err) {
      console.error(`[player] failed to start ${entry.id}`, err);
      if (gen === generation.current) {
        teardown();
        toast.error(`Could not start ${entry.title}.`);
        setPhase("menu");
      }
    }
  };
  const handleStartRef = useRef(handleStart);
  handleStartRef.current = handleStart;

  useEffect(() => {
    if (autoStart) void handleStartRef.current();
  }, [autoStart]);

  const setPausedState = useCallback((next: boolean) => {
    const inst = instanceRef.current;
    if (!inst) return;
    if (next) {
      inst.pause();
      audioEngine.suspend();
    } else {
      inst.resume();
      audioEngine.resume();
    }
    setPaused(next);
  }, []);

  const canPause = phase === "playing" && !state.gameOver && !panel?.actions.length;

  const handleRestart = () => {
    resetRun();
    setPanel(null);
    setPausedState(false);
    audioEngine.stopAll(100);
    instanceRef.current?.start();
  };

  const handleQuitToMenu = () => {
    teardown();
    resetRun();
    if (autoStart && onExit) return onExit();
    setPhase("menu");
  };

  const handleAction = (action: string) => {
    if (action === "menu") return handleQuitToMenu();
    try {
      const instance = instanceRef.current;
      if (!instance?.act) throw new Error("The game has no action handler.");
      instance.act(action);
    } catch (error) {
      console.error(`[player] action failed: ${entry.id}/${action}`, error);
      toast.error("Could not continue the game.");
    }
  };

  const handleResize = useCallback((size: ViewportSize) => {
    sizeRef.current = size;
    instanceRef.current?.resize(size);
  }, []);

  // Esc / P toggle pause; leaving the tab pauses automatically.
  useEffect(() => {
    if (!canPause) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat) return;
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable='true']")) return;
      if (e.code === "Escape" || e.code === "KeyP") {
        e.preventDefault();
        setPausedState(!paused);
      }
    };
    const onHidden = () => {
      if (document.visibilityState === "hidden" && !paused) setPausedState(true);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [canPause, paused, setPausedState]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await rootRef.current?.requestFullscreen();
    } catch (err) {
      console.error("[player] fullscreen failed", err);
      toast.error("Could not change fullscreen mode.");
    }
  };

  const scoreText = (() => {
    const d = format(state.score);
    return `${d.value.toLocaleString()}${d.suffix ?? ""}`;
  })();
  const pbText = state.personalBest > 0 ? (() => {
    const d = format(state.personalBest);
    return `${d.value.toLocaleString()}${d.suffix ?? ""}`;
  })() : null;

  const Options = entry.Options;
  const go = state.gameOver;
  const goScore = go ? format(go.score) : null;
  const showChrome = phase === "playing" && (!entry.immersive || !!go);

  return (
    <Box
      ref={rootRef}
      sx={{
        height: "calc(100dvh - var(--jz-nav-h, 64px))",
        display: "flex",
        flexDirection: "column",
        bgcolor: "rgba(6, 8, 12, 0.55)",
        "&:fullscreen": { height: "100dvh", bgcolor: "#080a0f" },
      }}
    >
      <Box
        sx={{
          height: 48,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          borderBottom: MEDIEVAL_EFFECTS.FRAME_BORDER,
          backgroundImage: MEDIEVAL_EFFECTS.PANEL_BG,
        }}
      >
        <Tooltip title={exitLabel}>
          <IconButton size="small" aria-label={exitLabel} onClick={exit} sx={{ color: "medievalGold.main" }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography sx={{ ...headingSx, flex: 1, fontSize: "1.05rem" }} noWrap>
          {entry.title}
        </Typography>
        {showChrome && (
          <Typography
            sx={{
              fontFamily: FONTS.MEDIEVAL_DISPLAY,
              color: "medievalGold.light",
              minWidth: 72,
              textAlign: "right",
              display: { md: "none" },
            }}
          >
            {scoreText}
          </Typography>
        )}
        {canPause && (
          <Tooltip title={paused ? "Resume (Esc)" : "Pause (Esc)"}>
            <IconButton size="small" onClick={() => setPausedState(!paused)} sx={{ color: "parchment.main" }}>
              {paused ? <PlayArrowIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}
        <AudioSettingsButton containerRef={rootRef} />
        <Tooltip title={fullscreen ? "Exit fullscreen" : "Fullscreen"}>
          <IconButton size="small" onClick={toggleFullscreen} sx={{ color: "parchment.main" }}>
            {fullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      {showChrome && state.hud.length > 0 && (
        <Box sx={{ display: { xs: "flex", md: "none" }, flexShrink: 0, flexWrap: "wrap", alignItems: "center", gap: 2, px: 2, py: 0.75, borderBottom: MEDIEVAL_EFFECTS.FRAME_BORDER }}>
          {state.hud.map((item) => (
            <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontFamily: FONTS.MEDIEVAL_SERIF, color: "parchment.dark", fontSize: "0.7rem", textTransform: "uppercase" }}>{item.label}</Typography>
              <HudValue compact label={item.label} value={item.value} />
            </Box>
          ))}
        </Box>
      )}
      <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
        <Viewport logicalSize={entry.logicalSize} hostRef={hostRef} onResize={handleResize} frameless={entry.immersive}>
          {(phase === "menu" || phase === "loading") && (
            <StartMenu
              title={entry.title}
              personalBest={showLeaderboard ? pbText : null}
              options={Options ? <Options value={options} onChange={setOptions} /> : undefined}
              showLeaderboard={showLeaderboard}
              loading={phase === "loading"}
              onStart={() => void handleStart()}
              onLeaderboard={() => {
                setPhase("leaderboard");
                void refreshLeaderboard();
              }}
              onExit={exit}
            />
          )}
          {phase === "leaderboard" && (
            <LeaderboardOverlay
              title={entry.title}
              scores={state.leaderboard}
              loading={state.leaderboardLoading}
              currentUser={username}
              format={format}
              onBack={() => setPhase("menu")}
            />
          )}
          {paused && canPause && (
            <PauseOverlay onResume={() => setPausedState(false)} onRestart={handleRestart} onQuit={handleQuitToMenu} />
          )}
          {panel && !paused && !go && (
            <OverlayScrim dim={panel.actions.length ? 0.92 : 0} sx={panel.actions.length ? undefined : { pointerEvents: "none", backdropFilter: "none" }}>
              <Typography sx={{ ...headingSx, fontSize: "clamp(1.5rem, 4vw, 3rem)", textAlign: "center" }}>{panel.title}</Typography>
              {panel.actions.map((action, index) => (
                <Button key={action.id} autoFocus={index === 0} variant={index === 0 ? "contained" : "outlined"} sx={index === 0 ? goldButtonSx : outlineButtonSx}
                  onClick={() => handleAction(action.id)}>
                  {action.label}
                </Button>
              ))}
            </OverlayScrim>
          )}
          {go && goScore && (
            <GameOverOverlay
              score={goScore.value}
              scoreSuffix={goScore.suffix}
              stats={go.stats}
              personalBest={format(state.personalBest).value}
              allTimeHigh={state.allTimeHigh ? { ...state.allTimeHigh, score: format(state.allTimeHigh.score).value } : null}
              isNewAllTimeHigh={state.isNewAllTimeHigh}
              onRetry={handleRestart}
              onBackToMenu={handleQuitToMenu}
            />
          )}
        </Viewport>
        {showChrome && (
          <SidePanel session={state} showLeaderboard={showLeaderboard} currentUser={username} format={format} />
        )}
      </Box>
      <AuthPromptToast />
    </Box>
  );
}
