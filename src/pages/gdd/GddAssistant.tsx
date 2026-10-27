import { useEffect, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { FaChevronDown, FaUpload } from "react-icons/fa6";
import { useAuthStore } from "../../stores/authStore";
import { completeGddCheckpoint } from "../../utils/gddAssistantApi";
import {
  bodySx,
  fieldSx,
  goldButtonSx,
  headingSx,
  outlineButtonSx,
  panelSx,
} from "../../lib/medievalStyles";
import {
  CHECKPOINTS,
  approveCheckpoint,
  draftFingerprint,
  imageBase64,
  newWorkflow,
  readWorkflow,
  recentHistory,
  type AssistantReference,
  type AssistantWorkflow,
} from "./assistant";
import { importAssistantReference } from "./assistantReferences";
import {
  draftMarkdown,
  projectAssets,
  readDraft,
  type EditorProject,
} from "./editor";

interface Props {
  project: EditorProject;
  disabled: boolean;
  onChange: (project: EditorProject, documentChanged: boolean) => void;
  onBusyChange: (busy: boolean) => void;
}

export default function GddAssistant({
  project,
  disabled,
  onChange,
  onBusyChange,
}: Props) {
  const username = useAuthStore((state) =>
    state.isAuthenticated ? state.username : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [link, setLink] = useState("");
  const [expanded, setExpanded] = useState(Boolean(project.draft.assistant));
  const upload = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const latest = useRef(project);
  latest.current = project;
  const workflow = project.draft.assistant;
  const index = workflow?.current ?? 0;
  const stage = workflow?.stages[index];
  const checkpoint = CHECKPOINTS[index];
  const locked = disabled || busy || !username;

  useEffect(() => {
    setBusy(false);
    onBusyChange(false);
    setError("");
    return () => {
      request.current?.abort();
      onBusyChange(false);
    };
  }, [username, onBusyChange]);

  function update(next: AssistantWorkflow, assets = project.assets) {
    try {
      const validated = readWorkflow(next);
      const changed = {
        draft: { ...project.draft, assistant: validated },
        assets,
      };
      onChange({ ...changed, assets: projectAssets(changed) }, false);
      setError("");
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not update assistant progress.",
      );
      return false;
    }
  }

  async function perform(
    action: (active: () => boolean, signal: AbortSignal) => Promise<void>,
  ) {
    if (locked) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const active = () =>
      !controller.signal.aborted &&
      useAuthStore.getState().isAuthenticated &&
      useAuthStore.getState().username === username;
    setBusy(true);
    onBusyChange(true);
    setError("");
    setWarnings([]);
    try {
      await action(active, controller.signal);
    } catch (cause) {
      if (active())
        setError(
          cause instanceof Error
            ? cause.message
            : "The assistant is unavailable.",
        );
    } finally {
      if (active()) {
        setBusy(false);
        onBusyChange(false);
      }
    }
  }

  function generate() {
    if (!workflow || !stage) return;
    void perform(async (active, signal) => {
      const document = JSON.stringify({
        currentGdd: draftMarkdown(project.draft, false),
        pendingProposal: stage.response?.proposal ?? null,
      });
      if (document.length > 100000)
        throw new Error(
          "The GDD and pending proposal exceed 100,000 characters. Reduce the document before requesting assistance.",
        );
      const fingerprint = await draftFingerprint(project.draft);
      const response = await completeGddCheckpoint(
        {
          checkpoint: checkpoint.id,
          prompt: stage.prompt.trim(),
          document,
          history: stage.history,
          references: workflow.references.map((reference) => ({
            name: reference.name,
            text: reference.text,
            url: reference.url,
            imageBase64:
              reference.imagePath && reference.checkpoint === index
                ? imageBase64(project.assets[reference.imagePath])
                : "",
          })),
        },
        index,
        signal,
      );
      if (!active()) return;
      if ((await draftFingerprint(latest.current.draft)) !== fingerprint)
        throw new Error(
          "The document changed during generation. Request a new proposal.",
        );
      if (!active()) return;
      update({
        ...workflow,
        stages: workflow.stages.map((entry, current) =>
          current === index
            ? {
                ...entry,
                prompt: "",
                response,
                baseFingerprint: fingerprint,
                history: recentHistory([
                  ...entry.history,
                  { role: "user", content: stage.prompt.trim() },
                  { role: "assistant", content: response.message },
                ]),
              }
            : entry,
        ),
      });
    });
  }

  function approve() {
    if (!workflow || !stage?.response) return;
    void perform(async (active) => {
      if ((await draftFingerprint(project.draft)) !== stage.baseFingerprint)
        throw new Error(
          "The GDD changed after this proposal. Request a revised proposal before approval.",
        );
      const changed = approveCheckpoint(project.draft);
      const validated = readDraft({
        format: "jeemzu-gdd-editor",
        version: 1,
        draft: changed,
      });
      draftMarkdown(validated, false);
      if (active()) {
        onChange(
          {
            draft: validated,
            assets: projectAssets({ draft: validated, assets: project.assets }),
          },
          true,
        );
        setNotes("");
        setLink("");
      }
    });
  }

  function addReferences(
    references: AssistantReference[],
    assets = project.assets,
  ) {
    if (!workflow || !stage) return;
    return update(
      {
        ...workflow,
        references: [...workflow.references, ...references],
        stages: workflow.stages.map((entry, current) =>
          current === index
            ? { ...entry, response: null, baseFingerprint: null }
            : entry,
        ),
      },
      assets,
    );
  }

  function addNote() {
    if (!notes.trim() && !link.trim()) return;
    const added = addReferences([
      {
        id: crypto.randomUUID(),
        checkpoint: index,
        name: link.trim() ? "Reference link" : "Reference notes",
        text: notes.trim(),
        url: link.trim(),
      },
    ]);
    if (added) {
      setNotes("");
      setLink("");
    }
  }

  function filesSelected(files: File[]) {
    void perform(async (active) => {
      const additions: AssistantReference[] = [];
      const assets = { ...project.assets };
      const notices: string[] = [];
      for (const file of files) {
        const imported = await importAssistantReference(file, index);
        if (!active()) return;
        additions.push(imported.reference);
        Object.assign(assets, imported.assets);
        notices.push(...imported.warnings);
      }
      if (active()) {
        addReferences(additions, assets);
        setWarnings([...new Set(notices)]);
      }
    });
  }

  const firstPending =
    workflow?.stages.findIndex((entry) => !entry.approved) ?? 0;
  return (
    <Accordion
      expanded={expanded}
      onChange={(_, open) => setExpanded(open)}
      sx={panelSx}
    >
      <AccordionSummary
        expandIcon={<FaChevronDown />}
        aria-controls="gdd-assistant-content"
        id="gdd-assistant-heading"
      >
        <Typography sx={headingSx}>AI design assistant</Typography>
      </AccordionSummary>
      <AccordionDetails id="gdd-assistant-content">
        <Stack spacing={2}>
          {error && (
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          )}
          {warnings.map((warning) => (
            <Alert key={warning} severity="warning">
              {warning}
            </Alert>
          ))}
          {!workflow ? (
            <Tooltip
              title={
                username
                  ? "Build a GDD through six approval checkpoints. Selected prompts and references are sent to OpenAI only when you request a proposal."
                  : "Sign in to use the AI design assistant."
              }
            >
              <span>
                <Button
                  disabled={locked}
                  sx={goldButtonSx}
                  onClick={() => update(newWorkflow())}
                >
                  Start guided GDD
                </Button>
              </span>
            </Tooltip>
          ) : (
            <>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                flexWrap="wrap"
                aria-label="GDD checkpoints"
              >
                {CHECKPOINTS.map((entry, current) => (
                  <Chip
                    key={entry.id}
                    label={`${current + 1}. ${entry.label}${workflow.stages[current].approved ? " (approved)" : ""}`}
                    color={current === index ? "primary" : "default"}
                    variant={current === index ? "filled" : "outlined"}
                    disabled={
                      locked || (firstPending >= 0 && current > firstPending)
                    }
                    onClick={() => {
                      update({ ...workflow, current });
                      setNotes("");
                      setLink("");
                    }}
                  />
                ))}
              </Stack>
              {firstPending === -1 && (
                <Alert severity="success">All checkpoints approved.</Alert>
              )}
              <Typography component="h2" sx={headingSx}>
                {checkpoint.label}
              </Typography>
              {stage?.history.length ? (
                <Box
                  role="log"
                  aria-label="Checkpoint conversation"
                  sx={{ maxHeight: 280, overflow: "auto" }}
                >
                  {stage.history.map((message, current) => (
                    <Box key={current} sx={{ mb: 2 }}>
                      <Typography variant="caption" sx={headingSx}>
                        {message.role === "user" ? "You" : "Assistant"}
                      </Typography>
                      <Typography
                        sx={{
                          ...bodySx,
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                          textAlign: "left",
                        }}
                      >
                        {message.content}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : null}
              {stage?.response && (
                <Box aria-label="Checkpoint review">
                  {stage.response.questions.length > 0 && (
                    <Box>
                      <Typography sx={headingSx}>Decisions</Typography>
                      <Box
                        component="ul"
                        sx={{ ...bodySx, textAlign: "left", pl: 3 }}
                      >
                        {stage.response.questions.map((question) => (
                          <li key={question}>{question}</li>
                        ))}
                      </Box>
                    </Box>
                  )}
                  {stage.response.referenceRequests.length > 0 && (
                    <Box>
                      <Typography sx={headingSx}>
                        Requested references
                      </Typography>
                      <Box
                        component="ul"
                        sx={{ ...bodySx, textAlign: "left", pl: 3 }}
                      >
                        {stage.response.referenceRequests.map((reference) => (
                          <li key={reference}>{reference}</li>
                        ))}
                      </Box>
                    </Box>
                  )}
                  <Typography sx={headingSx}>Proposed changes</Typography>
                  <Box
                    sx={{ maxHeight: 480, overflow: "auto", textAlign: "left" }}
                  >
                    {stage.response.proposal.title && (
                      <Typography sx={headingSx}>
                        {stage.response.proposal.title}
                      </Typography>
                    )}
                    {stage.response.proposal.introduction && (
                      <Typography sx={{ ...bodySx, whiteSpace: "pre-wrap" }}>
                        {stage.response.proposal.introduction}
                      </Typography>
                    )}
                    {stage.response.proposal.sections.map((section) => (
                      <Box key={section.title} sx={{ mt: 2 }}>
                        <Typography sx={headingSx}>{section.title}</Typography>
                        {section.items.map((item, current) => (
                          <Box key={current} sx={{ mt: 1 }}>
                            <Typography sx={{ ...bodySx, fontWeight: 700 }}>
                              {item.heading}
                            </Typography>
                            <Typography
                              sx={{
                                ...bodySx,
                                whiteSpace: "pre-wrap",
                                overflowWrap: "anywhere",
                              }}
                            >
                              {item.body}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    ))}
                  </Box>
                  <Tooltip title="Applies the proposed text, replacing text in the listed sections. Existing image categories and other sections are preserved. Submit or clear any unsent prompt first. Revising an earlier checkpoint requires reapproval of later checkpoints.">
                    <span>
                      <Button
                        sx={goldButtonSx}
                        disabled={locked || Boolean(stage.prompt.trim())}
                        onClick={approve}
                      >
                        Approve checkpoint
                      </Button>
                    </span>
                  </Tooltip>
                </Box>
              )}
              <TextField
                label={
                  index === 0 && !stage?.history.length
                    ? "Describe your game"
                    : "Prompt"
                }
                multiline
                minRows={3}
                value={stage?.prompt ?? ""}
                disabled={locked}
                slotProps={{ htmlInput: { maxLength: 4000 } }}
                sx={fieldSx}
                onChange={(event) => {
                  update({
                    ...workflow,
                    stages: workflow.stages.map((entry, current) =>
                      current === index
                        ? { ...entry, prompt: event.target.value }
                        : entry,
                    ),
                  });
                }}
              />
              <Stack spacing={1}>
                <Tooltip
                  title={`${checkpoint.reference}. Optional; up to 12 references total, 60,000 text characters, and four images per checkpoint. Reference images remain separate from PDF illustrations.`}
                >
                  <Typography component="h3" sx={headingSx}>
                    References
                  </Typography>
                </Tooltip>
                {workflow.references
                  .filter((reference) => reference.checkpoint === index)
                  .map((reference) => (
                    <Box
                      key={reference.id}
                      sx={{ display: "flex", gap: 1, alignItems: "center" }}
                    >
                      {reference.imagePath && (
                        <Box
                          component="img"
                          src={`data:image/jpeg;base64,${imageBase64(project.assets[reference.imagePath])}`}
                          alt={reference.name}
                          sx={{ width: 56, height: 56, objectFit: "contain" }}
                        />
                      )}
                      <Tooltip
                        title={
                          reference.text || reference.url || reference.name
                        }
                      >
                        <Typography
                          sx={{ ...bodySx, overflowWrap: "anywhere" }}
                        >
                          {reference.name}
                        </Typography>
                      </Tooltip>
                      <Button
                        disabled={locked}
                        size="small"
                        aria-label={`Remove ${reference.name}`}
                        onClick={() =>
                          update({
                            ...workflow,
                            references: workflow.references.filter(
                              (entry) => entry.id !== reference.id,
                            ),
                            stages: workflow.stages.map((entry, current) =>
                              current === index
                                ? {
                                    ...entry,
                                    response: null,
                                    baseFingerprint: null,
                                  }
                                : entry,
                            ),
                          })
                        }
                      >
                        Remove
                      </Button>
                    </Box>
                  ))}
                <TextField
                  label="Reference notes"
                  multiline
                  minRows={2}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  disabled={locked}
                  slotProps={{ htmlInput: { maxLength: 20000 } }}
                  sx={fieldSx}
                />
                <Tooltip title="Links are provided as context only. The assistant does not fetch web pages; paste relevant excerpts in reference notes.">
                  <TextField
                    label="Reference URL"
                    type="url"
                    value={link}
                    onChange={(event) => setLink(event.target.value)}
                    disabled={locked}
                    slotProps={{ htmlInput: { maxLength: 2000 } }}
                    sx={fieldSx}
                  />
                </Tooltip>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Button
                    sx={outlineButtonSx}
                    disabled={locked || (!notes.trim() && !link.trim())}
                    onClick={addNote}
                  >
                    Add reference
                  </Button>
                  <Tooltip title="PDF, DOCX, Markdown, text, PNG, or JPEG. Documents contribute extracted text only; upload image references separately.">
                    <span>
                      <Button
                        startIcon={<FaUpload />}
                        sx={outlineButtonSx}
                        disabled={locked}
                        onClick={() => upload.current?.click()}
                      >
                        Upload references
                      </Button>
                    </span>
                  </Tooltip>
                </Stack>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Tooltip
                  title={
                    username
                      ? "Send the current GDD, recent checkpoint conversation, all reference notes, and this checkpoint's images to OpenAI. Nothing changes in the editor until approval."
                      : "Sign in to use the AI design assistant."
                  }
                >
                  <span>
                    <Button
                      sx={goldButtonSx}
                      disabled={locked || !stage?.prompt.trim()}
                      onClick={generate}
                    >
                      {stage?.response ? "Revise proposal" : "Request proposal"}
                    </Button>
                  </span>
                </Tooltip>
                {busy && (
                  <CircularProgress
                    size={22}
                    aria-label="Working on GDD checkpoint"
                  />
                )}
              </Stack>
            </>
          )}
        </Stack>
        <input
          ref={upload}
          type="file"
          multiple
          hidden
          accept=".pdf,.docx,.md,.markdown,.txt,.png,.jpg,.jpeg"
          aria-label="Upload checkpoint references"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (files.length) filesSelected(files);
          }}
        />
      </AccordionDetails>
    </Accordion>
  );
}
