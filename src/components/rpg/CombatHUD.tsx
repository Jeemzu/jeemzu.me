import {
  Box,
  Typography,
  LinearProgress,
  Chip,
  Stack,
  Paper,
  Tooltip,
} from "@mui/material";
import type { CombatEntity } from "../../lib/RpgTypes";
import { useTheme } from "@mui/material/styles";

interface CombatHUDProps {
  enemies: CombatEntity[];
  currentTurn: string | null;
  initiativeOrder: string[];
  players: Record<
    string,
    { name: string; hp: number; max_hp: number; class: string }
  >;
}

export default function CombatHUD({
  enemies,
  currentTurn,
  initiativeOrder,
  players,
}: CombatHUDProps) {
  const theme = useTheme();

  const getResistanceColor = (value: number): string => {
    if (value <= 0.0) return "#4caf50"; // Immune (green)
    if (value <= 0.5) return "#8bc34a"; // Resistant (light green)
    if (value >= 1.5) return "#f44336"; // Weak (red)
    return "#9e9e9e"; // Normal (gray)
  };

  return (
    <Box
      sx={{
        position: "absolute",
        top: 80,
        right: 16,
        width: 320,
        maxHeight: "calc(100vh - 200px)",
        overflowY: "auto",
        bgcolor: "rgba(26, 26, 26, 0.95)",
        border: "2px solid",
        borderColor: theme.palette.primaryGreen.main,
        borderRadius: 2,
        p: 2,
      }}
    >
      <Typography
        variant="h6"
        sx={{ mb: 2, color: theme.palette.primaryGreen.main }}
      >
        Combat Status
      </Typography>

      {/* Turn Order */}
      <Paper sx={{ bgcolor: "rgba(0, 0, 0, 0.5)", p: 1.5, mb: 2 }}>
        <Typography
          variant="subtitle2"
          sx={{ mb: 1, color: theme.palette.textSecondary.main }}
        >
          Turn Order
        </Typography>
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          {initiativeOrder.map((entityId) => {
            const isPlayer = entityId in players;
            const name = isPlayer
              ? players[entityId].name
              : enemies.find((e) => e.id === entityId)?.name || entityId;
            const isCurrentTurn = entityId === currentTurn;

            return (
              <Chip
                key={entityId}
                label={name}
                size="small"
                sx={{
                  bgcolor: isCurrentTurn
                    ? theme.palette.primaryGreen.main
                    : "rgba(255, 255, 255, 0.1)",
                  color: isCurrentTurn ? "#000" : "#fff",
                  border: isPlayer ? "1px solid #4fc3f7" : "1px solid #f44336",
                }}
              />
            );
          })}
        </Stack>
      </Paper>

      {/* Enemies */}
      <Stack spacing={2}>
        {enemies.map((enemy) => {
          const hpPercent = (enemy.hp / enemy.max_hp) * 100;
          const isCurrentTurn = enemy.id === currentTurn;

          return (
            <Paper
              key={enemy.id}
              sx={{
                bgcolor: isCurrentTurn
                  ? "rgba(168, 214, 126, 0.2)"
                  : "rgba(0, 0, 0, 0.5)",
                border: isCurrentTurn
                  ? `2px solid ${theme.palette.primaryGreen.main}`
                  : "1px solid rgba(255, 255, 255, 0.2)",
                p: 1.5,
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                {enemy.name}
              </Typography>

              {/* HP Bar */}
              <Box sx={{ mb: 1 }}>
                <Typography
                  variant="caption"
                  sx={{ color: theme.palette.textSecondary.main }}
                >
                  HP: {enemy.hp}/{enemy.max_hp}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={hpPercent}
                  sx={{
                    height: 8,
                    borderRadius: 1,
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                    "& .MuiLinearProgress-bar": {
                      bgcolor:
                        hpPercent > 50
                          ? "#66bb6a"
                          : hpPercent > 25
                            ? "#ffb74d"
                            : "#f44336",
                    },
                  }}
                />
              </Box>

              {/* Resistances & Weaknesses */}
              <Stack direction="row" spacing={0.5} flexWrap="wrap">
                {Object.entries(enemy.resistances).map(
                  ([damageType, multiplier]) => (
                    <Tooltip
                      key={`res-${damageType}`}
                      title={`${damageType}: ${Math.round((1 - multiplier) * 100)}% resistant`}
                    >
                      <Chip
                        label={damageType.substring(0, 3).toUpperCase()}
                        size="small"
                        sx={{
                          bgcolor: getResistanceColor(multiplier),
                          color: "#000",
                          fontSize: "0.65rem",
                          height: 20,
                        }}
                      />
                    </Tooltip>
                  ),
                )}
                {Object.entries(enemy.weaknesses).map(
                  ([damageType, multiplier]) => (
                    <Tooltip
                      key={`weak-${damageType}`}
                      title={`${damageType}: ${Math.round((multiplier - 1) * 100)}% weakness`}
                    >
                      <Chip
                        label={`⚠ ${damageType.substring(0, 3).toUpperCase()}`}
                        size="small"
                        sx={{
                          bgcolor: getResistanceColor(multiplier),
                          color: "#fff",
                          fontSize: "0.65rem",
                          height: 20,
                        }}
                      />
                    </Tooltip>
                  ),
                )}
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}
