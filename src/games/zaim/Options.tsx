import { Box, Button, Stack, Tooltip, Typography } from "@mui/material";
import type { GameOptionsProps } from "../../game-player/contract";
import { FONTS } from "../../lib/globals";
import { goldButtonSx, outlineButtonSx } from "../../lib/medievalStyles";
import { COLORS, MODES, type AimOptions } from "./config";

export function AimOptionsMenu({ value, onChange }: GameOptionsProps<AimOptions>) {
  return <Stack spacing={2} alignItems="center">
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="center">
      {MODES.map(mode => <Button key={mode} aria-pressed={value.mode === mode} variant={value.mode === mode ? "contained" : "outlined"}
        sx={value.mode === mode ? goldButtonSx : outlineButtonSx} onClick={() => onChange({ ...value, mode })}>{mode}</Button>)}
    </Stack>
    <Typography sx={{ fontFamily: FONTS.MEDIEVAL_SERIF, color: "parchment.dark" }}>Color</Typography>
    <Stack direction="row" spacing={1}>
      {COLORS.map(color => <Tooltip key={color.value} title={color.name}>
        <Box component="button" type="button" aria-label={color.name} aria-pressed={value.color === color.value}
          onClick={() => onChange({ ...value, color: color.value })}
          sx={{ width: 28, height: 28, borderRadius: "50%", cursor: "pointer", bgcolor: color.value, outlineOffset: 3,
            border: value.color === color.value ? "3px solid white" : "3px solid transparent", "&:focus-visible": { outline: "2px solid white" } }} />
      </Tooltip>)}
    </Stack>
  </Stack>;
}
