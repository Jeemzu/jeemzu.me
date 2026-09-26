import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  Stack,
  Chip,
} from "@mui/material";
import type { DialogueOption, StatCheckResult } from "../../lib/RpgTypes";
import { useTheme } from "@mui/material/styles";
import { Casino, CheckCircle, Cancel } from "@mui/icons-material";

interface StatCheckDialogProps {
  open: boolean;
  npcName: string;
  options: DialogueOption[];
  playerStats: Record<string, number>;
  onSelectOption: (optionId: string) => void;
  onClose: () => void;
  lastResult?: StatCheckResult | null;
}

export default function StatCheckDialog({
  open,
  npcName,
  options,
  playerStats,
  onSelectOption,
  onClose,
  lastResult,
}: StatCheckDialogProps) {
  const theme = useTheme();

  const calculateChance = (statValue: number, threshold: number): number => {
    const baseChance = 50;
    const statDiff = statValue - threshold;
    const chance = baseChance + statDiff * 5;
    return Math.max(10, Math.min(95, chance));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: theme.palette.cardBackground.main,
          border: "2px solid",
          borderColor: theme.palette.primaryGreen.main,
        },
      }}
    >
      <DialogTitle sx={{ color: theme.palette.primaryGreen.main }}>
        Conversation with {npcName}
      </DialogTitle>

      <DialogContent>
        {/* Show last result if available */}
        {lastResult && (
          <Box
            sx={{
              mb: 3,
              p: 2,
              bgcolor: lastResult.success
                ? "rgba(76, 175, 80, 0.2)"
                : "rgba(244, 67, 54, 0.2)",
              border: "1px solid",
              borderColor: lastResult.success ? "#4caf50" : "#f44336",
              borderRadius: 1,
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              {lastResult.success ? (
                <CheckCircle sx={{ color: "#4caf50" }} />
              ) : (
                <Cancel sx={{ color: "#f44336" }} />
              )}
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {lastResult.stat.toUpperCase()} CHECK:{" "}
                  {lastResult.success ? "SUCCESS" : "FAILED"}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: theme.palette.textSecondary.main }}
                >
                  Rolled {lastResult.roll}, needed ≤{lastResult.chance}% (Your{" "}
                  {lastResult.stat}: {lastResult.player_value}/
                  {lastResult.threshold})
                </Typography>
              </Box>
            </Stack>
          </Box>
        )}

        <Typography
          variant="body2"
          sx={{ mb: 3, color: theme.palette.textSecondary.main }}
        >
          Choose a dialogue option. Stat checks show your success chance based
          on your stats.
        </Typography>

        <Stack spacing={2}>
          {options.map((option) => {
            const { stat, threshold } = option.stat_requirement;
            const playerStatValue = playerStats[stat] || 0;
            const chance = calculateChance(playerStatValue, threshold);
            const canAttempt = playerStatValue > 0;

            // Extract the stat check label (e.g., "[Persuade]" from the prompt)
            const promptParts = option.prompt.split("]");
            const label = promptParts[0].replace("[", "");
            const description = promptParts[1]?.trim() || option.prompt;

            return (
              <Box
                key={option.id}
                onClick={() => canAttempt && onSelectOption(option.id)}
                sx={{
                  p: 2,
                  border: "1px solid",
                  borderColor: canAttempt
                    ? theme.palette.primaryGreen.main
                    : "rgba(255, 255, 255, 0.2)",
                  borderRadius: 1,
                  cursor: canAttempt ? "pointer" : "not-allowed",
                  opacity: canAttempt ? 1 : 0.5,
                  transition: "all 0.2s",
                  "&:hover": canAttempt
                    ? {
                        bgcolor: "rgba(168, 214, 126, 0.1)",
                        borderColor: theme.palette.softGreen.main,
                      }
                    : {},
                }}
              >
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Chip
                    label={label}
                    size="small"
                    icon={<Casino fontSize="small" />}
                    sx={{
                      bgcolor: theme.palette.primaryGreen.main,
                      color: "#000",
                      fontWeight: 600,
                    }}
                  />
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {description}
                  </Typography>
                </Stack>

                {/* Stat requirement display */}
                <Box sx={{ mt: 1 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ mb: 0.5 }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: theme.palette.textSecondary.main }}
                    >
                      {stat.toUpperCase()} {playerStatValue}/{threshold}{" "}
                      required
                    </Typography>
                    <Chip
                      label={`${chance}% success`}
                      size="small"
                      sx={{
                        bgcolor:
                          chance >= 70
                            ? "#4caf50"
                            : chance >= 40
                              ? "#ff9800"
                              : "#f44336",
                        color: "#fff",
                        height: 20,
                        fontSize: "0.7rem",
                      }}
                    />
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={chance}
                    sx={{
                      height: 6,
                      borderRadius: 1,
                      bgcolor: "rgba(255, 255, 255, 0.1)",
                      "& .MuiLinearProgress-bar": {
                        bgcolor:
                          chance >= 70
                            ? "#4caf50"
                            : chance >= 40
                              ? "#ff9800"
                              : "#f44336",
                      },
                    }}
                  />
                </Box>
              </Box>
            );
          })}
        </Stack>

        {/* Regular dialogue option */}
        <Box
          onClick={onClose}
          sx={{
            mt: 2,
            p: 2,
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: 1,
            cursor: "pointer",
            transition: "all 0.2s",
            "&:hover": {
              bgcolor: "rgba(255, 255, 255, 0.1)",
            },
          }}
        >
          <Typography variant="body2">
            Continue conversation normally
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={onClose}
          sx={{ color: theme.palette.textSecondary.main }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
