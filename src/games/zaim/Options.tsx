import { Button, Stack } from "@mui/material";
import type { GameOptionsProps } from "../../game-player/contract";
import { goldButtonSx, outlineButtonSx } from "../../lib/medievalStyles";
import { MODES, type AimOptions } from "./config";

export function AimOptionsMenu({ value, onChange }: GameOptionsProps<AimOptions>) {
  return <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="center">
    {MODES.map(mode => <Button key={mode} aria-pressed={value.mode === mode} variant={value.mode === mode ? "contained" : "outlined"}
      sx={value.mode === mode ? goldButtonSx : outlineButtonSx} onClick={() => onChange({ ...value, mode })}>{mode}</Button>)}
  </Stack>;
}
