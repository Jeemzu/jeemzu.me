import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  bodySx,
  fieldSx,
  headingSx,
  outlineButtonSx,
  panelSx,
} from "../../lib/medievalStyles";
import {
  defaultPrototype,
  ENGINES,
  engineRequirements,
  PLATFORMS,
  type PrototypeRequirements,
} from "./prototype";
import { LIMITS } from "./document";

interface Props {
  value?: PrototypeRequirements;
  onChange: (value: PrototypeRequirements) => void;
  sectionCount: number;
}

export default function PrototypeFields({
  value,
  onChange,
  sectionCount,
}: Props) {
  if (!value) {
    return (
      <Box>
        <Button
          disabled={sectionCount >= LIMITS.sections}
          sx={outlineButtonSx}
          onClick={() => onChange(defaultPrototype())}
        >
          Add prototype requirements
        </Button>
      </Box>
    );
  }
  return (
    <Box sx={{ ...panelSx, p: { xs: 2, sm: 3 } }}>
      <Stack spacing={2}>
        <Typography variant="h5" sx={headingSx}>
          Prototype requirements
        </Typography>
        <Box role="group" aria-label="Game engines">
          <Typography sx={headingSx}>Engines</Typography>
          {ENGINES.map((engine) => (
            <FormControlLabel
              key={engine.id}
              sx={bodySx}
              label={engine.label}
              control={
                <Checkbox
                  checked={value.engines.includes(engine.id)}
                  onChange={(_, checked) =>
                    onChange({
                      ...value,
                      engines: checked
                        ? [...value.engines, engine.id]
                        : value.engines.filter((id) => id !== engine.id),
                      details:
                        checked && value.details[engine.id] === undefined
                          ? {
                              ...value.details,
                              [engine.id]: engineRequirements(engine.id),
                            }
                          : value.details,
                    })
                  }
                />
              }
            />
          ))}
        </Box>
        <Box role="group" aria-label="Target platforms">
          <Typography sx={headingSx}>Target platforms</Typography>
          {PLATFORMS.map((platform) => (
            <FormControlLabel
              key={platform}
              sx={bodySx}
              label={platform}
              control={
                <Checkbox
                  checked={value.platforms.includes(platform)}
                  onChange={(_, checked) =>
                    onChange({
                      ...value,
                      platforms: checked
                        ? [...value.platforms, platform]
                        : value.platforms.filter((entry) => entry !== platform),
                    })
                  }
                />
              }
            />
          ))}
        </Box>
        <TextField
          label="Custom targets"
          value={value.customPlatform}
          onChange={(event) =>
            onChange({ ...value, customPlatform: event.target.value })
          }
          slotProps={{ htmlInput: { maxLength: 1000 } }}
          fullWidth
          sx={fieldSx}
        />
        {ENGINES.filter((engine) => value.engines.includes(engine.id)).map(
          (engine) => (
            <TextField
              key={engine.id}
              label={`${engine.label} requirements`}
              value={value.details[engine.id] ?? ""}
              onChange={(event) =>
                onChange({
                  ...value,
                  details: {
                    ...value.details,
                    [engine.id]: event.target.value,
                  },
                })
              }
              multiline
              minRows={5}
              maxRows={20}
              fullWidth
              sx={fieldSx}
            />
          ),
        )}
        <TextField
          label="Shared requirements"
          value={value.shared}
          onChange={(event) =>
            onChange({ ...value, shared: event.target.value })
          }
          multiline
          minRows={5}
          maxRows={20}
          fullWidth
          sx={fieldSx}
        />
      </Stack>
    </Box>
  );
}
