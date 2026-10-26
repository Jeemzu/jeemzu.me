import { Button, Stack, Typography } from "@mui/material";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import type { ReactNode } from "react";
import { FONTS } from "../../lib/globals";
import { goldButtonSx, headingSx, outlineButtonSx } from "../../lib/medievalStyles";
import { OverlayScrim } from "./OverlayScrim";

interface StartMenuProps {
  title: string;
  personalBest: string | null;
  options?: ReactNode;
  showLeaderboard: boolean;
  loading: boolean;
  onStart(): void;
  onLeaderboard(): void;
  onExit(): void;
}

export function StartMenu({ title, personalBest, options, showLeaderboard, loading, onStart, onLeaderboard, onExit }: StartMenuProps) {
  return (
    <OverlayScrim>
      <Typography variant="h3" sx={{ ...headingSx, letterSpacing: "0.12em", textAlign: "center" }}>
        {title}
      </Typography>
      {personalBest && (
        <Typography sx={{ fontFamily: FONTS.MEDIEVAL_SERIF, color: "parchment.dark" }}>Personal Best: {personalBest}</Typography>
      )}
      {options}
      <Stack spacing={1.5} sx={{ width: "100%", maxWidth: 320, mt: 1 }}>
        <Button variant="contained" onClick={onStart} disabled={loading} sx={{ ...goldButtonSx, fontSize: "1.2rem", py: 1.5 }}>
          {loading ? "Loading…" : "Start"}
        </Button>
        {showLeaderboard && (
          <Button variant="outlined" startIcon={<LeaderboardIcon />} onClick={onLeaderboard} sx={{ ...outlineButtonSx, py: 1.1 }}>
            Leaderboard
          </Button>
        )}
        <Button variant="outlined" onClick={onExit} sx={{ ...outlineButtonSx, py: 1.1 }}>
          Exit
        </Button>
      </Stack>
    </OverlayScrim>
  );
}
