import { useCallback, useEffect, useRef } from "react";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import Phaser from "phaser";
import { FONTS } from "../../lib/globals";
import { useRpgStore } from "../../stores/rpgStore";
import { useAuthStore } from "../../stores/authStore";
import type { ExplorationScene } from "../../games/rpg/scenes/ExplorationScene";
import PartyLobby from "./PartyLobby";
import NarrativePanel from "./NarrativePanel";
import ActionInput from "./ActionInput";
import DialogueBox from "./DialogueBox";
import PartyPanel from "./PartyPanel";
import { createRpgGameConfig } from "../../games/rpg/RPGGame";

/** Total game-frame width: 640px viewport + 340px side rail + 2px border. */
const FRAME_WIDTH = 982;
/** Below this viewport width the side rail stacks under the game viewport. */
const STACK_BP = "@media (max-width: 1060px)";

const PHASE_STYLES: Record<string, { label: string; color: string }> = {
  exploration: { label: "EXPLORATION", color: "#a8d67e" },
  dialogue: { label: "DIALOGUE", color: "#4fc3f7" },
  combat: { label: "COMBAT", color: "#f44336" },
};

const RPGContainer = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const connectionStatus = useRpgStore((s) => s.connectionStatus);
  const party = useRpgStore((s) => s.party);
  const sessionStarted = useRpgStore((s) => s.sessionStarted);
  const isPaused = useRpgStore((s) => s.isPaused);
  const visualCommandBatchId = useRpgStore((s) => s.visualCommandBatchId);
  const uiState = useRpgStore((s) => s.uiState);
  const connect = useRpgStore((s) => s.connect);
  const disconnect = useRpgStore((s) => s.disconnect);

  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<ExplorationScene | null>(null);
  const lastAppliedBatchRef = useRef(0);

  // Only attempt the hub connection once the user is signed in — the hub requires
  // a JWT, so connecting while logged out just produces repeated 401s.
  useEffect(() => {
    if (!isAuthenticated) return;
    void connect();
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const applyPendingCommands = useCallback(() => {
    const state = useRpgStore.getState();
    if (!sceneRef.current) return;
    if (state.visualCommandBatchId === lastAppliedBatchRef.current) return;
    lastAppliedBatchRef.current = state.visualCommandBatchId;
    void sceneRef.current.runVisualCommands(state.visualCommands);
  }, []);

  // Mount the Phaser canvas once the session starts; tear it down on unmount.
  useEffect(() => {
    if (!sessionStarted || !containerRef.current || gameRef.current) return;

    const game = new Phaser.Game({
      ...createRpgGameConfig(),
      parent: containerRef.current,
    });
    gameRef.current = game;

    // Scene construction/creation isn't synchronous with `new Phaser.Game(...)` —
    // wait for the game to finish booting, then handle both possible orderings:
    // create() may have already run (check isReady) or may still be pending
    // (in which case the scene's own 'scene-ready' event will fire once it has).
    game.events.once(Phaser.Core.Events.READY, () => {
      const scene = game.scene.getScene(
        "Exploration",
      ) as ExplorationScene | null;
      if (!scene) return;

      if (scene.isReady) {
        sceneRef.current = scene;
        applyPendingCommands();
      } else {
        scene.events.once("scene-ready", () => {
          sceneRef.current = scene;
          applyPendingCommands();
        });
      }
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, [sessionStarted, applyPendingCommands]);

  useEffect(() => {
    applyPendingCommands();
  }, [visualCommandBatchId, applyPendingCommands]);

  if (!isAuthenticated) {
    return (
      <>
        {isInitialized && (
          <Alert
            severity="info"
            sx={{
              mb: 2,
              fontFamily: FONTS.NECTO_MONO,
              "& .MuiAlert-message": { fontFamily: FONTS.NECTO_MONO },
            }}
          >
            Sign in to save your campaigns to the cloud.
          </Alert>
        )}
        <PartyLobby />
      </>
    );
  }

  if (connectionStatus !== "connected") {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 8,
        }}
      >
        <CircularProgress sx={{ color: "#a8d67e", mb: 2 }} />
        <Typography fontFamily={FONTS.NECTO_MONO} color="textSecondary">
          Connecting to the realm...
        </Typography>
      </Box>
    );
  }

  if (!party || !sessionStarted) {
    return (
      <>
        <Alert
          severity="success"
          sx={{
            mb: 2,
            fontFamily: FONTS.NECTO_MONO,
            "& .MuiAlert-message": { fontFamily: FONTS.NECTO_MONO },
          }}
        >
          Cloud saves enabled — your campaigns are saved to Azure.
        </Alert>
        <PartyLobby />
      </>
    );
  }

  const phase =
    PHASE_STYLES[uiState?.game_phase ?? "exploration"] ??
    PHASE_STYLES.exploration;
  const location =
    uiState?.current_location_name ??
    (uiState?.current_location ?? "unknown").replace(/_/g, " ");

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        py: 3,
      }}
    >
      {isPaused && (
        <Alert
          severity="warning"
          sx={{
            width: "100%",
            maxWidth: FRAME_WIDTH,
            fontFamily: FONTS.NECTO_MONO,
            "& .MuiAlert-message": { fontFamily: FONTS.NECTO_MONO },
          }}
        >
          Session paused — a player disconnected. The host can take over their
          character to continue.
        </Alert>
      )}

      {/* Fixed-size game window — incoming narrative scrolls inside it and never reflows the page */}
      <Box
        sx={{
          width: FRAME_WIDTH,
          maxWidth: "100%",
          border: "1px solid rgba(168, 214, 126, 0.35)",
          borderRadius: 1.5,
          overflow: "hidden",
          backgroundColor: "#141414",
          boxShadow:
            "0 0 32px rgba(0, 0, 0, 0.55), 0 0 12px rgba(168, 214, 126, 0.07)",
        }}
      >
        {/* Status bar: current location + game phase */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 0.75,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            borderBottom: "1px solid rgba(168, 214, 126, 0.25)",
          }}
        >
          <Typography
            fontFamily={FONTS.NECTO_MONO}
            sx={{
              color: "#c5e8a4",
              fontSize: "0.8rem",
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            ◆ {location}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: phase.color,
                boxShadow: `0 0 6px ${phase.color}`,
              }}
            />
            <Typography
              fontFamily={FONTS.NECTO_MONO}
              sx={{
                color: phase.color,
                fontSize: "0.7rem",
                letterSpacing: 1.5,
              }}
            >
              {phase.label}
            </Typography>
          </Box>
        </Box>

        {/* Game viewport + side rail */}
        <Box sx={{ display: "flex", flexWrap: "wrap" }}>
          <Box
            sx={{
              position: "relative",
              flex: "0 0 640px",
              aspectRatio: "4 / 3",
              backgroundColor: "#1a1a1a",
              [STACK_BP]: { flex: "1 1 100%" },
            }}
          >
            <Box
              ref={containerRef}
              sx={{
                width: "100%",
                height: "100%",
                "& canvas": { display: "block" },
              }}
            />
            <DialogueBox />
          </Box>

          <Box
            sx={{
              flex: 1,
              minWidth: 280,
              height: 480,
              display: "flex",
              flexDirection: "column",
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              borderLeft: "1px solid rgba(168, 214, 126, 0.25)",
              [STACK_BP]: {
                height: 400,
                borderLeft: "none",
                borderTop: "1px solid rgba(168, 214, 126, 0.25)",
              },
            }}
          >
            <PartyPanel />
            <NarrativePanel />
          </Box>
        </Box>

        {/* Command bar */}
        <ActionInput />
      </Box>
    </Box>
  );
};

export default RPGContainer;
