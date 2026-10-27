import { useState, type FormEvent } from "react";
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
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FaDownload } from "react-icons/fa6";
import {
  bodySx,
  dialogPaperSx,
  fieldSx,
  goldButtonSx,
  headingSx,
  outlineButtonSx,
} from "../../lib/medievalStyles";
import { downloadBlob } from "../budgetize/lib/download";
import {
  createDevSetupPrompt,
  defaultDevSetupOptions,
  DEV_SETUP_CLIENTS,
  type DevSetupOptions,
} from "./devSetup";

interface Props {
  open: boolean;
  onClose: () => void;
  initialEngine: DevSetupOptions["engine"];
}

export default function DevSetupDialog({
  open,
  onClose,
  initialEngine,
}: Props) {
  const [options, setOptions] = useState(() => ({
    ...defaultDevSetupOptions(),
    engine: initialEngine,
  }));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function change(patch: Partial<DevSetupOptions>) {
    setOptions((current) => ({ ...current, ...patch }));
    setError("");
    setNotice("");
  }

  function download(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const prompt = createDevSetupPrompt(options);
      downloadBlob(
        `${options.engine}-game-dev-setup-prompt.md`,
        new Blob([prompt], { type: "text/markdown;charset=utf-8" }),
      );
      setNotice("Prompt downloaded. Give it to your agent on Windows.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The prompt could not be downloaded.",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="dev-setup-title"
      fullWidth
      maxWidth="sm"
      scroll="paper"
      slotProps={{ paper: { sx: dialogPaperSx } }}
    >
      <DialogTitle id="dev-setup-title" sx={headingSx}>
        Dev Setup Prompt
      </DialogTitle>
      <Box component="form" onSubmit={download} sx={{ display: "contents" }}>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Box component="section" aria-labelledby="dev-setup-limitations">
              <Typography
                id="dev-setup-limitations"
                variant="h6"
                sx={headingSx}
              >
                Setup limitations
              </Typography>
              <Box
                component="ul"
                sx={{ ...bodySx, m: 0, pl: 2.5, "& li": { mt: 1 } }}
              >
                {options.engine === "unity" && (
                  <li>
                    Unity sign-in cannot be automated. The agent saves browser
                    sign-in for the end and waits for you; license activation
                    depends on it.
                  </li>
                )}
                <li>
                  Restart your AI client after setup to load the new MCP
                  servers.
                </li>
                <li>
                  Keep Blender and Audacity open while using their MCP tools.
                </li>
                <li>
                  Windows 10/11 only. macOS needs a separate workflow with
                  Homebrew installs, a different Audacity settings path, and
                  Unix pipes instead of Windows named pipes.
                </li>
                <li>
                  The Blender Lab add-on repository address and auto-start
                  setting name are not yet verified. The agent must look them up
                  during setup; if repository installation is unavailable, it
                  falls back to building the add-on from downloaded source.
                </li>
              </Box>
              <TextField
                select
                label="Engine"
                value={options.engine}
                onChange={(event) => {
                  if (
                    event.target.value === "unity" ||
                    event.target.value === "threejs"
                  )
                    change({ engine: event.target.value });
                }}
                fullWidth
                sx={fieldSx}
              >
                <MenuItem value="unity">Unity</MenuItem>
                <MenuItem value="threejs">Three.js</MenuItem>
              </TextField>
            </Box>
            <TextField
              label="Operating system"
              value="Windows 10/11"
              slotProps={{ input: { readOnly: true } }}
              fullWidth
              sx={fieldSx}
            />
            <TextField
              select
              label="Agent client"
              value={options.agentClient}
              onChange={(event) => {
                const client = DEV_SETUP_CLIENTS.find(
                  (entry) => entry.id === event.target.value,
                );
                if (client)
                  change({
                    agentClient: client.id,
                    agentMcpConfig: client.config,
                  });
              }}
              fullWidth
              sx={fieldSx}
            >
              {DEV_SETUP_CLIENTS.map((client) => (
                <MenuItem key={client.id} value={client.id}>
                  {client.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="MCP config path"
              value={options.agentMcpConfig}
              onChange={(event) =>
                change({ agentMcpConfig: event.target.value })
              }
              required
              fullWidth
              sx={fieldSx}
              slotProps={{ htmlInput: { maxLength: 240 } }}
            />
            <TextField
              label="Tools folder"
              value={options.toolsDir}
              onChange={(event) => change({ toolsDir: event.target.value })}
              required
              fullWidth
              sx={fieldSx}
              slotProps={{ htmlInput: { maxLength: 240 } }}
            />
            {options.engine === "unity" && (
              <TextField
                label="Unity 6 version"
                value={options.unityVersion}
                placeholder="lts, latest, or 6000.6.4f1"
                onChange={(event) =>
                  change({ unityVersion: event.target.value })
                }
                required
                fullWidth
                sx={fieldSx}
                slotProps={{ htmlInput: { maxLength: 40 } }}
              />
            )}
            {options.engine === "unity" && (
              <TextField
                label="Unity module IDs (optional)"
                value={options.unityModules}
                placeholder="windows-il2cpp webgl"
                onChange={(event) =>
                  change({ unityModules: event.target.value })
                }
                fullWidth
                sx={fieldSx}
                slotProps={{ htmlInput: { maxLength: 300 } }}
              />
            )}
            <FormControlLabel
              sx={bodySx}
              control={
                <Checkbox
                  checked={options.acceptLicenseAgreements}
                  onChange={(event) =>
                    change({ acceptLicenseAgreements: event.target.checked })
                  }
                />
              }
              label="Allow my agent to accept required software license and source agreements."
            />
            {error && <Alert severity="error">{error}</Alert>}
            {notice && <Alert severity="success">{notice}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
          <Button sx={outlineButtonSx} onClick={onClose}>
            Close
          </Button>
          <Button type="submit" startIcon={<FaDownload />} sx={goldButtonSx}>
            Download prompt
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
