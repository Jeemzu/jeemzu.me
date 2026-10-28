import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";
import {
  bodySx,
  dialogPaperSx,
  headingSx,
  outlineButtonSx,
  panelSx,
} from "../../lib/medievalStyles";
import {
  defaultPrototype,
  hasEngineDetails,
  PLATFORMS,
  removeEngine,
  SUPPORTED_ENGINES,
  type EngineId,
  type PrototypeRequirements,
} from "./prototype";
import { LIMITS } from "./document";

interface Props {
  value?: PrototypeRequirements;
  onChange: (value: PrototypeRequirements) => void;
  sectionCount: number;
  disabled: boolean;
}

export default function PrototypeFields({
  value,
  onChange,
  sectionCount,
  disabled,
}: Props) {
  const [pendingEngine, setPendingEngine] = useState<EngineId | null>(null);
  if (!value) {
    return (
      <Box>
        <Button
          disabled={disabled || sectionCount >= LIMITS.sections}
          sx={outlineButtonSx}
          onClick={() => onChange(defaultPrototype())}
        >
          Add prototype requirements
        </Button>
      </Box>
    );
  }
  function deselect(id: EngineId) {
    if (!value) return;
    if (hasEngineDetails(value, id)) setPendingEngine(id);
    else onChange(removeEngine(value, id));
  }
  return (
    <Box sx={{ ...panelSx, p: { xs: 2, sm: 3 } }}>
      <Stack spacing={3}>
        <Typography variant="h5" sx={headingSx}>
          Prototype requirements
        </Typography>
        <Box role="group" aria-labelledby="gdd-engines-label">
          <Typography
            component="h3"
            id="gdd-engines-label"
            sx={{
              ...headingSx,
              display: "block",
              m: 0,
              mb: 1.5,
              textAlign: "left",
            }}
          >
            Engines
          </Typography>
          <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1}>
            {SUPPORTED_ENGINES.map((engine) => (
              <FormControlLabel
                key={engine.id}
                sx={{ ...bodySx, m: 0, mr: 1 }}
                label={engine.label}
                control={
                  <Checkbox
                    disabled={disabled}
                    checked={value.engines.includes(engine.id)}
                    onChange={(_, checked) => {
                      if (!checked) deselect(engine.id);
                      else
                        onChange({
                          ...value,
                          engines: [...value.engines, engine.id],
                          details: {
                            ...value.details,
                            [engine.id]: value.details[engine.id] ?? "",
                          },
                        });
                    }}
                  />
                }
              />
            ))}
          </Stack>
        </Box>
        <Box role="group" aria-labelledby="gdd-platforms-label">
          <Typography
            component="h3"
            id="gdd-platforms-label"
            sx={{
              ...headingSx,
              display: "block",
              m: 0,
              mb: 1.5,
              textAlign: "left",
            }}
          >
            Target platforms
          </Typography>
          <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1}>
            {PLATFORMS.map((platform) => (
              <FormControlLabel
                key={platform}
                sx={{ ...bodySx, m: 0, mr: 1 }}
                label={platform}
                control={
                  <Checkbox
                    disabled={disabled}
                    checked={value.platforms.includes(platform)}
                    onChange={(_, checked) =>
                      onChange({
                        ...value,
                        platforms: checked
                          ? [...value.platforms, platform]
                          : value.platforms.filter(
                              (entry) => entry !== platform,
                            ),
                      })
                    }
                  />
                }
              />
            ))}
          </Stack>
        </Box>
        {value.engines.includes("custom") && (
          <Alert
            severity="warning"
            action={
              <Button
                disabled={disabled}
                color="inherit"
                onClick={() => deselect("custom")}
              >
                Remove
              </Button>
            }
          >
            Imported custom engine requirements retained.
          </Alert>
        )}
        {value.customPlatform && (
          <Alert
            severity="warning"
            action={
              <Button
                disabled={disabled}
                color="inherit"
                onClick={() => onChange({ ...value, customPlatform: "" })}
              >
                Remove
              </Button>
            }
          >
            Imported custom targets: {value.customPlatform}
          </Alert>
        )}
      </Stack>
      <Dialog
        open={pendingEngine !== null}
        onClose={() => setPendingEngine(null)}
        aria-labelledby="gdd-remove-engine-title"
        slotProps={{ paper: { sx: dialogPaperSx } }}
      >
        <DialogTitle id="gdd-remove-engine-title" sx={headingSx}>
          Remove{" "}
          {pendingEngine === "custom"
            ? "custom engine"
            : SUPPORTED_ENGINES.find((engine) => engine.id === pendingEngine)
                ?.label}
          ?
        </DialogTitle>
        <DialogContent>
          <Typography sx={bodySx}>
            The technical details supplied for this engine will be deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button sx={outlineButtonSx} onClick={() => setPendingEngine(null)}>
            Cancel
          </Button>
          <Button
            color="error"
            disabled={disabled}
            onClick={() => {
              if (pendingEngine) onChange(removeEngine(value, pendingEngine));
              setPendingEngine(null);
            }}
          >
            Remove engine
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
