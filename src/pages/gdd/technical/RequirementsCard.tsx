import { Autocomplete, Box, Stack, TextField, Typography } from "@mui/material";
import {
  bodySx,
  fieldSx,
  headingSx,
  panelSx,
} from "../../../lib/medievalStyles";
import {
  editableRequirements,
  type RequirementContent,
  type RequirementDefinitions,
} from "../prototype";

export interface TechnicalFormProps {
  content: RequirementContent;
  disabled: boolean;
  onChange: (content: RequirementContent) => void;
}

export default function RequirementsCard({
  title,
  definitions,
  options,
  content,
  disabled,
  onChange,
}: TechnicalFormProps & {
  title: string;
  definitions: RequirementDefinitions;
  options: Readonly<Record<string, readonly string[]>>;
}) {
  const value = editableRequirements(content, definitions);
  return (
    <Box
      component="section"
      aria-label={title}
      sx={{ ...panelSx, p: { xs: 2, sm: 3 } }}
    >
      <Stack spacing={2.5}>
        <Typography variant="h5" sx={headingSx}>
          {title}
        </Typography>
        {definitions.map(([label, guidance]) =>
          value.fields[label]?.includes("\n") ? (
            <TextField
              key={label}
              label={label}
              value={value.fields[label]}
              disabled={disabled}
              multiline
              minRows={2}
              maxRows={8}
              fullWidth
              sx={fieldSx}
              onChange={(event) =>
                onChange({
                  ...value,
                  fields: { ...value.fields, [label]: event.target.value },
                })
              }
            />
          ) : (
            <Autocomplete<string, false, false, true>
              key={label}
              freeSolo
              selectOnFocus
              clearOnBlur={false}
              disabled={disabled}
              options={options[label] ?? []}
              value={value.fields[label] ?? ""}
              inputValue={value.fields[label] ?? ""}
              onInputChange={(_, text, reason) => {
                if (reason === "input" || reason === "clear")
                  onChange({
                    ...value,
                    fields: { ...value.fields, [label]: text },
                  });
              }}
              onChange={(_, text) =>
                onChange({
                  ...value,
                  fields: { ...value.fields, [label]: text ?? "" },
                })
              }
              renderInput={(params) => (
                <TextField {...params} label={label} sx={fieldSx} />
              )}
              slotProps={{
                paper: { sx: { ...panelSx, ...bodySx } },
                popper: {
                  sx: {
                    "& .MuiAutocomplete-option": {
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                    },
                  },
                },
              }}
              title={guidance}
            />
          ),
        )}
        <TextField
          label="Additional requirements"
          value={value.additional}
          disabled={disabled}
          multiline
          minRows={2}
          maxRows={8}
          fullWidth
          sx={fieldSx}
          onChange={(event) =>
            onChange({ ...value, additional: event.target.value })
          }
        />
      </Stack>
    </Box>
  );
}
