import { Box, Typography, Chip, Stack, Paper } from "@mui/material";
import type { ArenaEffect, DamageType } from "../../lib/RpgTypes";
import { useTheme } from "@mui/material/styles";
import {
  Whatshot,
  AcUnit,
  FlashOn,
  Brightness7,
  Opacity,
} from "@mui/icons-material";

interface ArenaEffectBarProps {
  effects: ArenaEffect[];
}

const EFFECT_ICONS: Record<string, React.ReactNode> = {
  burning_ground: <Whatshot fontSize="small" />,
  icy_terrain: <AcUnit fontSize="small" />,
  electrified: <FlashOn fontSize="small" />,
  blessed_ground: <Brightness7 fontSize="small" />,
  poisoned_air: <Opacity fontSize="small" />,
};

const DAMAGE_TYPE_COLORS: Record<DamageType, string> = {
  physical: "#9e9e9e",
  fire: "#ff6b6b",
  ice: "#4fc3f7",
  lightning: "#fff59d",
  poison: "#66bb6a",
  holy: "#ffd700",
  dark: "#7e57c2",
};

export default function ArenaEffectBar({ effects }: ArenaEffectBarProps) {
  const theme = useTheme();

  if (!effects || effects.length === 0) {
    return null;
  }

  return (
    <Paper
      sx={{
        position: "absolute",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        bgcolor: "rgba(26, 26, 26, 0.95)",
        border: "2px solid",
        borderColor: theme.palette.primaryGreen.main,
        borderRadius: 2,
        p: 2,
        minWidth: 400,
        maxWidth: 600,
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{ mb: 1, color: theme.palette.primaryGreen.main }}
      >
        Arena Effects
      </Typography>

      <Stack direction="row" spacing={1} flexWrap="wrap">
        {effects.map((effect, index) => {
          const effectName = effect.effect_type.replace(/_/g, " ");
          const icon = EFFECT_ICONS[effect.effect_type] || (
            <Whatshot fontSize="small" />
          );
          const bgColor = effect.damage_type
            ? DAMAGE_TYPE_COLORS[effect.damage_type]
            : theme.palette.primaryGreen.main;

          return (
            <Chip
              key={`${effect.effect_type}-${index}`}
              icon={
                <Box
                  sx={{ display: "flex", alignItems: "center", color: "#000" }}
                >
                  {icon}
                </Box>
              }
              label={
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      color: "#000",
                      textTransform: "capitalize",
                    }}
                  >
                    {effectName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#000", ml: 1 }}>
                    ({effect.duration_turns} turns)
                  </Typography>
                  {effect.magnitude !== 1.0 && (
                    <Typography
                      variant="caption"
                      sx={{ color: "#000", ml: 0.5, fontWeight: 700 }}
                    >
                      {effect.magnitude > 1.0 ? "+" : ""}
                      {Math.round((effect.magnitude - 1.0) * 100)}%
                    </Typography>
                  )}
                </Box>
              }
              sx={{
                bgcolor: bgColor,
                color: "#000",
                "& .MuiChip-icon": {
                  color: "#000",
                },
              }}
            />
          );
        })}
      </Stack>

      {effects.length > 0 && (
        <Typography
          variant="caption"
          sx={{
            mt: 1,
            display: "block",
            color: theme.palette.textSecondary.main,
            fontStyle: "italic",
          }}
        >
          {effects[0].description ||
            "The battlefield is altered by magical forces..."}
        </Typography>
      )}
    </Paper>
  );
}
