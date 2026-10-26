import { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import type { GameOptionsProps } from "../../game-player/contract";
import { FONTS } from "../../lib/globals";
import { goldButtonSx, outlineButtonSx } from "../../lib/medievalStyles";
import { TOTAL_LEVELS } from "./levels";
import { highestCompleted } from "./progress";

export interface BrickOptions { level: number }
export function BrickOptionsMenu({ value, onChange }: GameOptionsProps<BrickOptions>) {
  const [highest] = useState(highestCompleted);
  return <Box sx={{ width: "100%", maxWidth: 360 }}>
    <Typography sx={{ fontFamily: FONTS.MEDIEVAL_SERIF, color: "parchment.dark", mb: 1 }}>Level</Typography>
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0.75 }}>
      {Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1).map(level => (
        <Button key={level} aria-label={`Level ${level}${level <= highest ? ", completed" : ""}`} aria-pressed={value.level === level}
          disabled={level > highest + 1} variant={value.level === level ? "contained" : "outlined"}
          sx={{ ...(value.level === level ? goldButtonSx : outlineButtonSx), minWidth: 0, p: 0.5 }}
          onClick={() => onChange({ level })}>{level}</Button>
      ))}
    </Box>
  </Box>;
}
