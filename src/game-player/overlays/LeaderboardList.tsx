import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { FONTS } from "../../lib/globals";
import type { GameHighScore } from "../../lib/GameTypes";
import type { ScoreDisplay } from "../contract";

const MEDALS = ["#ffd700", "#c0c0c0", "#cd7f32"];

interface LeaderboardListProps {
  scores: GameHighScore[];
  loading: boolean;
  currentUser: string | null;
  format(score: number): ScoreDisplay;
  dense?: boolean;
}

export function LeaderboardList({ scores, loading, currentUser, format, dense = false }: LeaderboardListProps) {
  const font = dense ? "0.8rem" : "0.95rem";

  if (loading) return <CircularProgress size={dense ? 20 : 32} sx={{ color: "medievalGold.main", my: 2, mx: "auto" }} />;
  if (scores.length === 0)
    return (
      <Typography sx={{ fontFamily: FONTS.MEDIEVAL_SERIF, color: "parchment.dark", fontSize: font, textAlign: "center", py: 1 }}>
        No scores yet
      </Typography>
    );

  return (
    <Box sx={{ width: "100%" }}>
      {scores.map((entry, i) => {
        const mine = entry.username === currentUser;
        const shown = format(entry.score);
        return (
          <Stack
            key={`${entry.username}-${i}`}
            direction="row"
            alignItems="center"
            sx={{
              px: 1,
              py: dense ? 0.4 : 0.75,
              borderRadius: 1,
              bgcolor: mine ? "rgba(200, 162, 74, 0.12)" : "transparent",
            }}
          >
            <Typography
              sx={{
                fontFamily: FONTS.MEDIEVAL_SERIF,
                fontSize: font,
                width: dense ? 24 : 32,
                fontWeight: i < 3 ? 700 : 400,
                color: MEDALS[i] ?? "parchment.dark",
              }}
            >
              {i + 1}
            </Typography>
            <Typography
              noWrap
              sx={{
                fontFamily: FONTS.MEDIEVAL_SERIF,
                fontSize: font,
                flex: 1,
                color: mine ? "medievalGold.light" : "parchment.main",
              }}
            >
              {entry.username}
            </Typography>
            <Typography sx={{ fontFamily: FONTS.MEDIEVAL_SERIF, fontSize: font, color: "medievalGold.light", fontWeight: 600 }}>
              {shown.value.toLocaleString()}
              {shown.suffix ?? ""}
            </Typography>
          </Stack>
        );
      })}
    </Box>
  );
}
