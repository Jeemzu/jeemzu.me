import { Box, Button, Stack, Typography } from "@mui/material";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import { FONTS } from "../../lib/globals";
import { headingSx, outlineButtonSx, panelSx } from "../../lib/medievalStyles";
import type { GameHighScore } from "../../lib/GameTypes";
import type { ScoreDisplay } from "../contract";
import { LeaderboardList } from "./LeaderboardList";
import { OverlayScrim } from "./OverlayScrim";

interface LeaderboardOverlayProps {
  title: string;
  scores: GameHighScore[];
  loading: boolean;
  currentUser: string | null;
  format(score: number): ScoreDisplay;
  onBack(): void;
}

export function LeaderboardOverlay({ title, scores, loading, currentUser, format, onBack }: LeaderboardOverlayProps) {
  return (
    <OverlayScrim>
      <Stack direction="row" alignItems="center" spacing={1}>
        <LeaderboardIcon sx={{ color: "medievalGold.main" }} />
        <Typography variant="h4" sx={headingSx}>
          Leaderboard
        </Typography>
      </Stack>
      <Typography sx={{ fontFamily: FONTS.MEDIEVAL_SERIF, color: "parchment.dark", letterSpacing: "0.1em", fontSize: "0.85rem" }}>
        {title.toUpperCase()} · TOP 10
      </Typography>
      <Box sx={{ ...panelSx, width: "100%", maxWidth: 420, p: 1.5, display: "flex", justifyContent: "center" }}>
        <LeaderboardList scores={scores} loading={loading} currentUser={currentUser} format={format} />
      </Box>
      <Button variant="outlined" onClick={onBack} sx={{ ...outlineButtonSx, px: 4 }}>
        Back
      </Button>
    </OverlayScrim>
  );
}
