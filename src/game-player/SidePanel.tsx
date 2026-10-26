import { Box, Divider, Stack, Typography } from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import type { ReactNode } from "react";
import { FONTS, MEDIEVAL_EFFECTS } from "../lib/globals";
import type { ScoreDisplay } from "./contract";
import type { GameSessionState } from "./useGameSession";
import { LeaderboardList } from "./overlays/LeaderboardList";
import { HudValue } from "./HudValue";

const captionSx = {
  display: "block",
  fontFamily: FONTS.MEDIEVAL_SERIF,
  color: "parchment.dark",
  fontSize: "0.72rem",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
} as const;

const valueSx = { display: "block", fontFamily: FONTS.MEDIEVAL_DISPLAY, color: "parchment.main", fontSize: "1.25rem" } as const;

function Stat({ label, children, icon }: { label: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <Box>
      <Stack direction="row" spacing={0.5} alignItems="center">
        {icon}
        <Typography sx={captionSx}>{label}</Typography>
      </Stack>
      {children}
    </Box>
  );
}

const fmt = (d: ScoreDisplay) => `${d.value.toLocaleString()}${d.suffix ?? ""}`;

interface SidePanelProps {
  session: GameSessionState;
  showLeaderboard: boolean;
  currentUser: string | null;
  format(score: number): ScoreDisplay;
}

export function SidePanel({ session, showLeaderboard, currentUser, format }: SidePanelProps) {
  const divider = <Divider sx={{ borderColor: "rgba(200, 162, 74, 0.14)" }} />;
  return (
    <Box
      sx={{
        width: 260,
        flexShrink: 0,
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        gap: 2,
        p: 2.5,
        overflowY: "auto",
        borderLeft: MEDIEVAL_EFFECTS.FRAME_BORDER,
        backgroundImage: MEDIEVAL_EFFECTS.PANEL_BG,
      }}
    >
      <Stat label="Score">
        <Typography sx={{ ...valueSx, color: "medievalGold.light", fontSize: "2rem" }}>{fmt(format(session.score))}</Typography>
      </Stat>

      {session.hud.length > 0 && (
        <>
          {divider}
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
            {session.hud.map((h) => (
              <Box key={h.label} sx={{ gridColumn: typeof h.value === "object" ? "1 / -1" : undefined }}>
                <Stat label={h.label}>
                  <HudValue label={h.label} value={h.value} />
                </Stat>
              </Box>
            ))}
          </Box>
        </>
      )}

      {showLeaderboard && (
        <>
          {divider}
          <Stat label="Personal Best">
            <Typography sx={valueSx}>{session.personalBest > 0 ? fmt(format(session.personalBest)) : "—"}</Typography>
          </Stat>
          {session.allTimeHigh && (
            <Stat label="All-Time Record" icon={<EmojiEventsIcon sx={{ fontSize: 14, color: "#ffd700" }} />}>
              <Typography sx={{ ...valueSx, color: "#ffd700" }}>{fmt(format(session.allTimeHigh.score))}</Typography>
              <Typography sx={{ ...captionSx, textTransform: "none", letterSpacing: 0 }}>by {session.allTimeHigh.username}</Typography>
            </Stat>
          )}
          {divider}
          <Stat label="Top 10" icon={<LeaderboardIcon sx={{ fontSize: 14, color: "medievalGold.main" }} />}>
            <Box sx={{ mt: 1 }}>
              <LeaderboardList
                dense
                scores={session.leaderboard}
                loading={session.leaderboardLoading}
                currentUser={currentUser}
                format={format}
              />
            </Box>
          </Stat>
        </>
      )}
    </Box>
  );
}
