import { useEffect, useState, type RefObject } from "react";
import { Box, IconButton, Popover, Slider, Stack, Switch, Tooltip, Typography } from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import { FONTS } from "../../lib/globals";
import { dialogPaperSx } from "../../lib/medievalStyles";
import { audioEngine } from "./AudioEngine";
import { useAudioSettings } from "./useAudioSettings";

const CHANNELS: { key: "master" | "sfx" | "music"; label: string }[] = [
  { key: "master", label: "Master" },
  { key: "sfx", label: "Effects" },
  { key: "music", label: "Music" },
];

const labelSx = {
  fontFamily: FONTS.MEDIEVAL_SERIF,
  color: "parchment.dark",
  fontSize: "0.8rem",
  letterSpacing: "0.06em",
  width: 56,
};

export function AudioSettingsButton({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
  const settings = useAudioSettings();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const silent = settings.muted || settings.master === 0;

  useEffect(() => {
    const close = () => setAnchor(null);
    document.addEventListener("fullscreenchange", close);
    return () => document.removeEventListener("fullscreenchange", close);
  }, []);

  return (
    <>
      <Tooltip title="Audio">
        <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)} sx={{ color: "parchment.main" }}>
          {silent ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        container={() => containerRef.current}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { ...dialogPaperSx, p: 2, width: 260 } } }}
      >
        <Stack spacing={1}>
          {CHANNELS.map(({ key, label }) => (
            <Stack key={key} direction="row" alignItems="center" spacing={1.5}>
              <Typography sx={labelSx}>{label}</Typography>
              <Slider
                aria-label={label}
                size="small"
                min={0}
                max={1}
                step={0.05}
                value={settings[key]}
                disabled={settings.muted}
                onChange={(_, v) => audioEngine.updateSettings({ [key]: v as number })}
                sx={{ color: "medievalGold.main" }}
              />
            </Stack>
          ))}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: 0.5 }}>
            <Typography sx={labelSx}>Mute</Typography>
            <Switch
              slotProps={{ input: { "aria-label": "Mute" } }}
              size="small"
              checked={settings.muted}
              onChange={(_, muted) => audioEngine.updateSettings({ muted })}
            />
          </Box>
        </Stack>
      </Popover>
    </>
  );
}
