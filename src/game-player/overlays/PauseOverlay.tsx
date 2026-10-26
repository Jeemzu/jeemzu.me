import { Button, Stack, Typography } from "@mui/material";
import { goldButtonSx, headingSx, outlineButtonSx } from "../../lib/medievalStyles";
import { OverlayScrim } from "./OverlayScrim";

interface PauseOverlayProps {
  onResume(): void;
  onRestart(): void;
  onQuit(): void;
}

export function PauseOverlay({ onResume, onRestart, onQuit }: PauseOverlayProps) {
  return (
    <OverlayScrim dim={0.7}>
      <Typography variant="h4" sx={{ ...headingSx, letterSpacing: "0.3em" }}>
        Paused
      </Typography>
      <Stack spacing={1.5} sx={{ width: "100%", maxWidth: 260 }}>
        <Button variant="contained" onClick={onResume} sx={{ ...goldButtonSx, py: 1.2 }}>
          Resume
        </Button>
        <Button variant="outlined" onClick={onRestart} sx={outlineButtonSx}>
          Restart
        </Button>
        <Button variant="outlined" onClick={onQuit} sx={outlineButtonSx}>
          Quit to Menu
        </Button>
      </Stack>
    </OverlayScrim>
  );
}
