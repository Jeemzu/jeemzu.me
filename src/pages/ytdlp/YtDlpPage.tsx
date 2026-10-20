import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  FormControl,
  FormControlLabel,
  FormLabel,
  Link,
  Radio,
  RadioGroup,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { FaCopy } from "react-icons/fa6";
import PageHeading from "../../components/shared/PageHeading";
import {
  fieldSx,
  goldButtonSx,
  headingSx,
  outlineButtonSx,
  panelSx,
} from "../../lib/medievalStyles";
import { buildCommand, DEFAULT_OPTIONS, type DownloadOptions } from "./command";

function RadioChoices<T extends string>({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: T;
  choices: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const id = `ytdlp-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <FormControl>
      <FormLabel id={id} sx={{ color: "medievalGold.light" }}>
        {label}
      </FormLabel>
      <RadioGroup
        row
        aria-labelledby={id}
        name={id}
        value={value}
        onChange={(_, next) => {
          const choice = choices.find((item) => item.value === next);
          if (choice) onChange(choice.value);
        }}
      >
        {choices.map((choice) => (
          <FormControlLabel
            key={choice.value}
            value={choice.value}
            control={<Radio size="small" />}
            label={choice.label}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
}

const YES_NO = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes" },
] as const;

export default function YtDlpPage() {
  const [options, setOptions] = useState<DownloadOptions>(DEFAULT_OPTIONS);
  const [copyStatus, setCopyStatus] = useState<{
    command: string;
    error: string | null;
  } | null>(null);
  const [copying, setCopying] = useState(false);
  const result = buildCommand(options);
  const status = copyStatus?.command === result.command ? copyStatus : null;
  const showUrlError =
    options.url.length > 0 && result.error && result.field === "url";

  function update<K extends keyof DownloadOptions>(
    key: K,
    value: DownloadOptions[K],
  ) {
    setOptions((current) => ({ ...current, [key]: value }));
    setCopyStatus(null);
  }

  async function copyCommand() {
    if (!result.command) return;
    const command = result.command;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(command);
      setCopyStatus({ command, error: null });
    } catch (cause) {
      setCopyStatus({
        command,
        error: `Could not copy the command. Select it and copy manually.${cause instanceof Error ? ` ${cause.message}` : ""}`,
      });
    } finally {
      setCopying(false);
    }
  }

  return (
    <Container
      maxWidth="md"
      sx={{ py: { xs: 4, md: 6 }, textAlign: "left" }}
    >
      <PageHeading title="yt-dlp Builder" />
      <Tabs
        value={options.shell}
        onChange={(_, value: string) => {
          if (value === "powershell" || value === "posix")
            update("shell", value);
        }}
        aria-label="Operating system"
        variant="fullWidth"
        sx={{ mb: 3 }}
      >
        <Tab
          label="Windows"
          value="powershell"
          id="ytdlp-tab-powershell"
          aria-controls="ytdlp-panel-powershell"
        />
        <Tab
          label="Linux/macOS"
          value="posix"
          id="ytdlp-tab-posix"
          aria-controls="ytdlp-panel-posix"
        />
      </Tabs>
      <Box
        role="tabpanel"
        id={`ytdlp-panel-${options.shell}`}
        aria-labelledby={`ytdlp-tab-${options.shell}`}
      >
        <Stack spacing={3}>
          <Box
            component="form"
            onSubmit={(event) => event.preventDefault()}
            sx={{ ...panelSx, p: { xs: 2, sm: 3 } }}
          >
            <Stack spacing={2.5}>
              <TextField
                label="YouTube URL"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={options.url}
                onChange={(event) => update("url", event.target.value)}
                error={!!showUrlError}
                helperText={showUrlError ? result.error : undefined}
                autoComplete="off"
                fullWidth
                sx={fieldSx}
              />
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={{ xs: 2, sm: 5 }}
              >
                <RadioChoices
                  label="Download"
                  value={options.isPlaylist ? "playlist" : "single"}
                  choices={[
                    { value: "single", label: "Single video" },
                    { value: "playlist", label: "Playlist" },
                  ]}
                  onChange={(value) =>
                    update("isPlaylist", value === "playlist")
                  }
                />
                <RadioChoices
                  label="Media"
                  value={options.mp3Only ? "mp3" : "video"}
                  choices={[
                    { value: "video", label: "Video + audio" },
                    { value: "mp3", label: "MP3 only" },
                  ]}
                  onChange={(value) => update("mp3Only", value === "mp3")}
                />
              </Stack>
              {options.mp3Only ? (
                <RadioChoices
                  label="Audio quality"
                  value={options.audioQuality}
                  choices={[
                    { value: "best", label: "Best VBR" },
                    { value: "320", label: "320 kbps" },
                    { value: "192", label: "192 kbps" },
                  ]}
                  onChange={(value) => update("audioQuality", value)}
                />
              ) : (
                <RadioChoices
                  label="Video quality"
                  value={options.videoQuality}
                  choices={[
                    { value: "best", label: "Best" },
                    { value: "1080", label: "Up to 1080p" },
                    { value: "720", label: "Up to 720p" },
                  ]}
                  onChange={(value) => update("videoQuality", value)}
                />
              )}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={{ xs: 2, sm: 5 }}
              >
                <RadioChoices
                  label="English subtitles (.srt)"
                  value={options.subtitles ? "yes" : "no"}
                  choices={YES_NO}
                  onChange={(value) => update("subtitles", value === "yes")}
                />
                <RadioChoices
                  label="Save thumbnail"
                  value={options.thumbnail ? "yes" : "no"}
                  choices={YES_NO}
                  onChange={(value) => update("thumbnail", value === "yes")}
                />
              </Stack>
              <TextField
                label="Output folder (optional)"
                value={options.outputFolder}
                onChange={(event) => update("outputFolder", event.target.value)}
                error={!!result.error && result.field === "outputFolder"}
                helperText={
                  result.error && result.field === "outputFolder"
                    ? result.error
                    : undefined
                }
                fullWidth
                sx={fieldSx}
              />
            </Stack>
          </Box>
          <Box sx={{ ...panelSx, p: { xs: 2, sm: 3 } }}>
            <Stack spacing={2}>
              <Typography component="h2" variant="h6" sx={headingSx}>
                Command
              </Typography>
              <TextField
                label="Generated command"
                value={result.command ?? ""}
                multiline
                minRows={3}
                fullWidth
                slotProps={{
                  input: { readOnly: true },
                  htmlInput: { spellCheck: false },
                }}
                sx={{
                  ...fieldSx,
                  "& .MuiInputBase-input": {
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                    overflowWrap: "anywhere",
                  },
                }}
              />
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Tooltip title="Copy, then paste into the selected shell on your PC. This website cannot run local programs.">
                  <span>
                    <Button
                      variant="contained"
                      sx={goldButtonSx}
                      startIcon={<FaCopy />}
                      disabled={!result.command || copying}
                      onClick={() => void copyCommand()}
                    >
                      {status && !status.error ? "Copied" : "Copy command"}
                    </Button>
                  </span>
                </Tooltip>
                <Button
                  component="a"
                  href="#ytdlp-setup"
                  variant="outlined"
                  sx={outlineButtonSx}
                >
                  Setup
                </Button>
              </Stack>
              {status && (
                <Alert
                  severity={status.error ? "error" : "success"}
                  role="status"
                >
                  {status.error ?? "Command copied."}
                </Alert>
              )}
            </Stack>
          </Box>
          <Box
            component="section"
            id="ytdlp-setup"
            aria-labelledby="ytdlp-setup-heading"
            sx={{
              ...panelSx,
              p: { xs: 2, sm: 3 },
              scrollMarginTop: "6rem",
              lineHeight: 1.7,
            }}
          >
            <Typography
              id="ytdlp-setup-heading"
              component="h2"
              variant="h6"
              sx={headingSx}
            >
              Quick setup (
              {options.shell === "powershell" ? "Windows" : "Linux/macOS"})
            </Typography>
            <Box
              component="ol"
              sx={{
                pl: 3,
                mt: 2,
                mb: 0,
                "& > li": { mb: 2.5, pl: 0.5 },
                "& > li:last-child": { mb: 0 },
                "& code": { overflowWrap: "anywhere" },
              }}
            >
              {options.shell === "powershell" ? (
                <>
                  <li>
                    <Link href="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe">
                      Download yt-dlp.exe
                    </Link>{" "}
                    and save it in a dedicated folder, such as{" "}
                    <code>{"C:\\Tools\\yt-dlp"}</code>.
                  </li>
                  <li>
                    <Link
                      href="https://www.ffmpeg.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Install FFmpeg
                    </Link>
                    : follow Download to a Windows build, extract it, and copy{" "}
                    <code>ffmpeg.exe</code> and <code>ffprobe.exe</code> from
                    its <code>bin</code> folder beside <code>yt-dlp.exe</code>.
                    Alternatively, add that <code>bin</code> folder to your
                    Windows PATH.
                  </li>
                  <li>
                    <Link
                      href="https://nodejs.org/en/download"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Install Node.js
                    </Link>{" "}
                    (LTS, version 22 or newer), keeping its PATH option enabled.
                    Generated commands include <code>--js-runtimes node</code>{" "}
                    to enable it.
                  </li>
                  <li>
                    <Link
                      href="https://github.com/yt-dlp/ejs"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      yt-dlp-ejs
                    </Link>{" "}
                    provides YouTube challenge-solving scripts and is already
                    bundled in the official <code>yt-dlp.exe</code>; no separate
                    install is needed. If you use the Python package instead,{" "}
                    <Link
                      href="https://www.python.org/downloads/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      install Python
                    </Link>{" "}
                    with pip and the Python launcher, then run{" "}
                    <code>{'py -m pip install -U "yt-dlp[default]"'}</code>.
                    This installs yt-dlp and its matching EJS dependency in the
                    same Python environment; replace{" "}
                    <code>{".\\yt-dlp.exe"}</code> with{" "}
                    <code>py -m yt_dlp</code> in the generated command for that
                    installation. Python is optional for the standalone
                    executable.
                  </li>
                  <li>
                    Open a new PowerShell terminal and navigate to your yt-dlp
                    folder, replacing this example with your actual path:
                    <Box component="pre" sx={{ whiteSpace: "pre-wrap", my: 1.5 }}>
                      <code>{"cd 'C:\\Tools\\yt-dlp'"}</code>
                    </Box>
                    You should see <code>yt-dlp.exe</code> there. New terminals
                    pick up PATH changes made during installation.
                  </li>
                  <li>
                    Paste your YouTube URL above, and choose your options. Click{" "}
                    <strong>Copy command</strong>, paste it into that terminal,
                    and press Enter. Commands start with{" "}
                    <code>{".\\yt-dlp.exe"}</code> to run the executable in the
                    current folder. Downloads go there unless you specify an
                    output folder.
                  </li>
                </>
              ) : (
                <>
                  <li>
                    Install{" "}
                    <Link
                      href="https://github.com/yt-dlp/yt-dlp#installation"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      yt-dlp
                    </Link>{" "}
                    using the instructions for your platform. Make the{" "}
                    <code>yt-dlp</code> command available on PATH.
                  </li>
                  <li>
                    Install{" "}
                    <Link
                      href="https://www.ffmpeg.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      FFmpeg
                    </Link>{" "}
                    for your platform, including <code>ffprobe</code>, and{" "}
                    <Link
                      href="https://nodejs.org/en/download"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Node.js
                    </Link>{" "}
                    (LTS, version 22 or newer). Make both available on PATH.
                    Commands enable Node.js with <code>--js-runtimes node</code>
                    .
                  </li>
                  <li>
                    The official yt-dlp release binaries include{" "}
                    <Link
                      href="https://github.com/yt-dlp/ejs"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      yt-dlp-ejs
                    </Link>
                    . For a Python installation, install{" "}
                    <Link
                      href="https://www.python.org/downloads/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Python
                    </Link>{" "}
                    with pip and venv support, then create an isolated
                    environment and install yt-dlp with its matching EJS
                    dependency:
                    <Box component="pre" sx={{ whiteSpace: "pre-wrap", my: 1.5 }}>
                      <code>
                        {
                          'python3 -m venv ~/.venvs/yt-dlp\nsource ~/.venvs/yt-dlp/bin/activate\npython -m pip install -U "yt-dlp[default]"'
                        }
                      </code>
                    </Box>
                    Activate that environment again in each new terminal.
                    Third-party packages may need{" "}
                    <Link
                      href="https://github.com/yt-dlp/yt-dlp/wiki/EJS"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      additional EJS setup
                    </Link>
                    .
                  </li>
                  <li>
                    Open Bash or Zsh and navigate to the folder where you want
                    to save downloads, for example:
                    <Box component="pre" sx={{ whiteSpace: "pre-wrap", my: 1.5 }}>
                      <code>{"cd ~/Downloads"}</code>
                    </Box>
                    If using a downloaded standalone binary rather than a PATH
                    installation, navigate to its folder and replace{" "}
                    <code>yt-dlp</code> in the generated command with{" "}
                    <code>./yt-dlp</code> (or its actual filename). Ensure the
                    binary has execute permission.
                  </li>
                  <li>
                    Paste your YouTube URL above and choose your options. Click{" "}
                    <strong>Copy command</strong>, paste it into that terminal,
                    and press Enter. Downloads go to the current folder unless
                    you specify an output folder.
                  </li>
                </>
              )}
            </Box>
          </Box>
        </Stack>
      </Box>
    </Container>
  );
}
