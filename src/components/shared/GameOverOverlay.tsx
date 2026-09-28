import { Box, Typography, Button, Stack } from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import { FONTS } from "../../lib/globals";
import {
  goldButtonSx,
  headingSx,
  outlineButtonSx,
} from "../../lib/medievalStyles";
import type { GameStat } from "../../lib/GameTypes";

interface GameOverOverlayProps {
  score: number;
  stats?: GameStat[];
  personalBest: number;
  allTimeHigh: { score: number; username: string } | null;
  isNewAllTimeHigh?: boolean;
  /** Appended after score/personalBest/allTimeHigh values, e.g. 'ms' for time-based scoring. */
  scoreSuffix?: string;
  onRetry: () => void;
  onBackToMenu: () => void;
}

export function GameOverOverlay({
  score,
  stats = [],
  personalBest,
  allTimeHigh,
  isNewAllTimeHigh = false,
  scoreSuffix = "",
  onRetry,
  onBackToMenu,
}: GameOverOverlayProps) {
  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
        bgcolor: "rgba(8,8,12,0.97)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        overflowY: "auto",
        py: 6,
      }}
    >
      {isNewAllTimeHigh ? (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            px: 3,
            py: 1,
            borderRadius: 2,
            background:
              "linear-gradient(135deg, rgba(255,215,0,0.18) 0%, rgba(255,165,0,0.10) 100%)",
            border: "1px solid rgba(255,215,0,0.45)",
            boxShadow: "0 0 24px rgba(255,215,0,0.15)",
          }}
        >
          <WorkspacePremiumIcon sx={{ color: "#ffd700", fontSize: "1.4rem" }} />
          <Typography
            variant="h6"
            sx={{
              color: "#ffd700",
              fontFamily: FONTS.MEDIEVAL_DISPLAY,
              letterSpacing: 2,
              fontWeight: 700,
            }}
          >
            NEW ALL-TIME RECORD
          </Typography>
          <WorkspacePremiumIcon sx={{ color: "#ffd700", fontSize: "1.4rem" }} />
        </Stack>
      ) : (
        <Typography
          variant="h2"
          sx={{ ...headingSx, color: "parchment.main", textAlign: "center" }}
        >
          Game Over!
        </Typography>
      )}

      <Typography variant="h4" sx={{ ...headingSx, textAlign: "center" }}>
        Score: {score.toLocaleString()}
        {scoreSuffix}
      </Typography>

      {stats.length > 0 && (
        <Stack
          direction="row"
          spacing={3}
          sx={{ flexWrap: "wrap", justifyContent: "center", gap: 2 }}
        >
          {stats.map(({ label, value }) => (
            <Box key={label} sx={{ textAlign: "center" }}>
              <Typography
                variant="caption"
                sx={{
                  color: "parchment.dark",
                  fontFamily: FONTS.MEDIEVAL_SERIF,
                  display: "block",
                  letterSpacing: 1,
                }}
              >
                {label.toUpperCase()}
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: "parchment.main",
                  fontFamily: FONTS.MEDIEVAL_SERIF,
                }}
              >
                {typeof value === "number" ? value.toLocaleString() : value}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}

      {(personalBest > 0 || allTimeHigh) && (
        <Stack
          direction="row"
          spacing={3}
          sx={{ flexWrap: "wrap", justifyContent: "center", gap: 2 }}
        >
          {personalBest > 0 && (
            <Box sx={{ textAlign: "center" }}>
              <Typography
                variant="caption"
                sx={{
                  color: "parchment.dark",
                  fontFamily: FONTS.MEDIEVAL_SERIF,
                  display: "block",
                  letterSpacing: 1,
                }}
              >
                YOUR BEST
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: "parchment.main",
                  fontFamily: FONTS.MEDIEVAL_SERIF,
                }}
              >
                {personalBest.toLocaleString()}
                {scoreSuffix}
              </Typography>
            </Box>
          )}
          {allTimeHigh && (
            <Box sx={{ textAlign: "center" }}>
              <Stack
                direction="row"
                spacing={0.5}
                alignItems="center"
                justifyContent="center"
              >
                <EmojiEventsIcon
                  sx={{ color: "#ffd700", fontSize: "0.9rem" }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    color: isNewAllTimeHigh ? "#ffd700" : "parchment.dark",
                    fontFamily: FONTS.MEDIEVAL_SERIF,
                    letterSpacing: 1,
                    fontWeight: isNewAllTimeHigh ? 700 : 400,
                  }}
                >
                  ALL-TIME HIGH
                </Typography>
              </Stack>
              <Typography
                variant="h6"
                sx={{
                  color: "#ffd700",
                  fontFamily: FONTS.MEDIEVAL_SERIF,
                  textShadow: isNewAllTimeHigh
                    ? "0 0 16px rgba(255,215,0,0.6)"
                    : "none",
                }}
              >
                {allTimeHigh.score.toLocaleString()}
                {scoreSuffix}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "parchment.dark",
                  fontFamily: FONTS.MEDIEVAL_SERIF,
                }}
              >
                {allTimeHigh.username}
              </Typography>
            </Box>
          )}
        </Stack>
      )}

      <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
        <Button
          variant="contained"
          onClick={onRetry}
          sx={{ ...goldButtonSx, fontSize: "1.1rem", px: 4, py: 1.5 }}
        >
          Retry
        </Button>
        <Button
          variant="outlined"
          onClick={onBackToMenu}
          sx={{ ...outlineButtonSx, fontSize: "1.1rem", px: 4, py: 1.5 }}
        >
          Back to Menu
        </Button>
      </Stack>
    </Box>
  );
}
