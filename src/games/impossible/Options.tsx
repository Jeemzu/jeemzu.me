import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Box, Button, CircularProgress, IconButton, Tooltip, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import type { GameOptionsProps } from "../../game-player/contract";
import type { ManifestEntry } from "../../lib/LevelSchema";
import { FONTS } from "../../lib/globals";
import { goldButtonSx, outlineButtonSx } from "../../lib/medievalStyles";
import { deleteCustomLevel, loadCustomLevels, type CustomLevel } from "../../utils/customLevels";
import { fetchManifest } from "../../utils/levelLoader";
import { highestCompleted, isUnlocked, sortedEntries, type ImpossibleOptions } from "./levels";

export const EDITOR_PATH = "/play/impossible/editor";

const captionSx = { fontFamily: FONTS.MEDIEVAL_SERIF, color: "parchment.dark", mb: 1 } as const;

export function ImpossibleOptionsMenu({ value, onChange }: GameOptionsProps<ImpossibleOptions>) {
  const [, navigate] = useLocation();
  const [highest] = useState(highestCompleted);
  const [entries, setEntries] = useState<ManifestEntry[] | null>(null);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [custom, setCustom] = useState<CustomLevel[]>([]);
  const [customError, setCustomError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchManifest()
      .then((m) => { if (!cancelled) setEntries(sortedEntries(m.levels)); })
      .catch((err: unknown) => {
        console.error("[impossible] manifest failed", err);
        if (!cancelled) setManifestError("Could not load levels.");
      });
    try {
      setCustom(loadCustomLevels().reverse());
    } catch (err) {
      console.error("[impossible] saved levels failed", err);
      setCustomError("Could not load saved levels.");
    }
    return () => { cancelled = true; };
  }, []);

  const selected = value.level;
  const removeCustom = (id: string) => {
    try {
      deleteCustomLevel(id);
      setCustom((prev) => prev.filter((l) => l.id !== id));
      if (selected.kind === "custom" && selected.id === id) onChange({ level: { kind: "official", number: 1 } });
    } catch (err) {
      console.error("[impossible] delete failed", err);
      setCustomError("Could not delete the saved level.");
    }
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <Typography sx={captionSx}>Level</Typography>
        {manifestError && <Typography color="error">{manifestError}</Typography>}
        {!entries && !manifestError && <CircularProgress size={22} sx={{ color: "medievalGold.main" }} />}
        {entries && (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: 0.75 }}>
            {entries.map((entry) => {
              const active = selected.kind === "official" && selected.number === entry.number;
              const unlocked = isUnlocked(entry.number, highest);
              return (
                <Tooltip key={entry.number} title={unlocked ? entry.name : "Locked"}>
                  <span>
                    <Button fullWidth disabled={!unlocked} variant={active ? "contained" : "outlined"}
                      aria-label={`Level ${entry.number}: ${entry.name}${entry.number <= highest ? ", completed" : ""}`} aria-pressed={active}
                      sx={{ ...(active ? goldButtonSx : outlineButtonSx), minWidth: 0, p: 0.5 }}
                      onClick={() => onChange({ level: { kind: "official", number: entry.number } })}>
                      {entry.number}
                    </Button>
                  </span>
                </Tooltip>
              );
            })}
          </Box>
        )}
      </Box>

      <Box>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Typography sx={{ ...captionSx, mb: 0 }}>My Levels</Typography>
          <Button size="small" variant="outlined" startIcon={<EditIcon />} sx={outlineButtonSx} onClick={() => navigate(EDITOR_PATH)}>
            Level Editor
          </Button>
        </Box>
        {customError && <Typography color="error">{customError}</Typography>}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, maxHeight: 168, overflowY: "auto" }}>
          {custom.map((level) => {
            const active = selected.kind === "custom" && selected.id === level.id;
            return (
              <Box key={level.id} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Button fullWidth variant={active ? "contained" : "outlined"} aria-pressed={active}
                  sx={{ ...(active ? goldButtonSx : outlineButtonSx), justifyContent: "flex-start", textTransform: "none", minWidth: 0 }}
                  onClick={() => onChange({ level: { kind: "custom", id: level.id } })}>
                  <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{level.name || "Untitled"}</Box>
                </Button>
                <Tooltip title="Delete">
                  <IconButton size="small" aria-label={`Delete ${level.name || "untitled level"}`} onClick={() => removeCustom(level.id)} sx={{ color: "parchment.dark" }}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
