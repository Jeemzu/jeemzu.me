import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { FaUpload } from "react-icons/fa6";
import { useAuthStore } from "../../stores/authStore";
import { completeGddCheckpoint } from "../../utils/gddAssistantApi";
import {
  bodySx,
  dialogPaperSx,
  fieldSx,
  goldButtonSx,
  headingSx,
  outlineButtonSx,
} from "../../lib/medievalStyles";
import {
  CHECKPOINTS,
  approveCheckpoint,
  draftFingerprint,
  imageBase64,
  newWorkflow,
  readWorkflow,
  recentHistory,
  validateImageProposals,
  type AssistantMode,
  type AssistantReference,
  type AssistantWorkflow,
} from "./assistant";
import { importAssistantReference } from "./assistantReferences";
import AssistantMarkdown from "./AssistantMarkdown";
import { reviewResponse, splitUnresolved } from "./assistantReview";
import { prepareImages, type PdfImage } from "./images";
import {
  defaultDraft,
  draftMarkdown,
  projectAssets,
  readDraft,
  type EditorProject,
} from "./editor";

interface Props {
  project: EditorProject;
  disabled: boolean;
  onChange: (
    project: EditorProject,
    documentChanged: boolean,
    replaceDocument?: boolean,
  ) => void;
  onBusyChange: (busy: boolean) => void;
  onComplete: () => void;
  onImagesPrepared: (images: Record<string, PdfImage>) => void;
}

export default function GddAssistant({
  project,
  disabled,
  onChange,
  onBusyChange,
  onComplete,
  onImagesPrepared,
}: Props) {
  const username = useAuthStore((state) =>
    state.isAuthenticated ? state.username : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [link, setLink] = useState("");
  const [pendingMode, setPendingMode] = useState<AssistantMode | null>(null);
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

  function start(mode: AssistantMode) {
    if (locked) return;
    if (mode === "scratch") {
      onChange(
        {
          draft: { ...defaultDraft(), assistant: newWorkflow(mode) },
          assets: {},
        },
        true,
        true,
      );
    } else if (!update(newWorkflow(mode))) return;
    setNotes("");
    setLink("");
    setWarnings([]);
    setError("");
    setPendingMode(null);
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
        missingDetails: project.draft.sections.flatMap((section) => {
          const headings = section.items
            .filter((item) => item.type === "text" && !item.body.trim())
            .map((item) => item.heading);
          return headings.length || !section.items.length
            ? [{ section: section.title, headings }]
            : [];
        }),
        pendingProposal: stage.response?.proposal ?? null,
        previousUnresolved: stage.history.flatMap(
          (message) => message.unresolved ?? [],
        ),
      });
      if (document.length > 100000)
        throw new Error(
          "The GDD and pending proposal exceed 100,000 characters. Reduce the document before requesting assistance.",
        );
      const fingerprint = await draftFingerprint(project.draft);
      const prompt =
        stage.prompt.trim() ||
        "Identify missing details in this checkpoint and propose additions grounded in my existing GDD. Ask focused questions where decisions are needed.";
      const response = await completeGddCheckpoint(
        {
          mode: workflow.mode,
          checkpoint: checkpoint.id,
          prompt,
          document,
          history: stage.history,
          references: workflow.references.map((reference) => ({
            id: reference.id,
            imagePath: reference.imagePath,
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
      validateImageProposals(response.proposal, workflow.references);
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
                  { role: "user", content: prompt },
                  {
                    role: "assistant",
                    content: response.message,
                    unresolved: response.unresolved,
                  },
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
      const assets = projectAssets({
        draft: validated,
        assets: project.assets,
      });
      const prepared = await prepareImages(assets);
      if (active()) {
        onChange(
          {
            draft: validated,
            assets,
          },
          true,
        );
        onImagesPrepared(prepared);
        if (validated.assistant?.stages.every((entry) => entry.approved))
          onComplete();
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
  const review = stage?.response ? reviewResponse(stage.response) : null;
  return (
    <Box>
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
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Tooltip
            title={
              username
                ? "Replace the open draft and build a new GDD through six approval checkpoints. Selected context is sent to OpenAI only when you request a proposal."
                : "Sign in to use the AI design assistant."
            }
          >
            <span>
              <Button
                disabled={locked}
                sx={goldButtonSx}
                onClick={() => setPendingMode("scratch")}
              >
                Start from scratch
              </Button>
            </span>
          </Tooltip>
          <Tooltip
            title={
              username
                ? "Use the open draft as context. Choose any checkpoint to review additions or revisions before applying them."
                : "Sign in to use the AI design assistant."
            }
          >
            <span>
              <Button
                disabled={locked || workflow?.mode === "fill"}
                sx={outlineButtonSx}
                onClick={() =>
                  workflow ? setPendingMode("fill") : start("fill")
                }
              >
                Fill in the blanks
              </Button>
            </span>
          </Tooltip>
          {workflow && (
            <Chip
              label={
                workflow.mode === "fill" ? "Fill in the blanks" : "From scratch"
              }
            />
          )}
        </Stack>
        {workflow && (
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
                    locked ||
                    (workflow.mode === "scratch" &&
                      firstPending >= 0 &&
                      current > firstPending)
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
                {stage.history.map((message, current) => {
                  const parsed = splitUnresolved(message.content);
                  const notes = [
                    ...new Set([
                      ...(message.unresolved ?? []),
                      ...parsed.unresolved,
                    ]),
                  ];
                  const showUnresolved = !(
                    review && current === stage.history.length - 1
                  );
                  return (
                    <Box
                      key={current}
                      sx={{
                        mb: 2,
                        p: 2,
                        borderLeft: "2px solid",
                        borderColor:
                          message.role === "user"
                            ? "rgba(200,162,74,0.3)"
                            : "medievalGold.main",
                        bgcolor: "rgba(0,0,0,0.12)",
                      }}
                    >
                      <Typography
                        component="h3"
                        variant="caption"
                        sx={{ ...headingSx, mb: 1 }}
                      >
                        {message.role === "user" ? "You" : "Assistant"}
                      </Typography>
                      {message.role === "assistant" ? (
                        <>
                          <AssistantMarkdown>{parsed.text}</AssistantMarkdown>
                          {showUnresolved && !!notes.length && (
                            <Box sx={{ mt: 2 }}>
                              <Typography
                                component="h4"
                                sx={{ ...headingSx, mb: 1 }}
                              >
                                Unresolved
                              </Typography>
                              <Box
                                component="ul"
                                sx={{ ...bodySx, pl: 3, m: 0 }}
                              >
                                {notes.map((note, i) => (
                                  <li key={i}>
                                    <AssistantMarkdown>
                                      {note}
                                    </AssistantMarkdown>
                                  </li>
                                ))}
                              </Box>
                            </Box>
                          )}
                        </>
                      ) : (
                        <Typography
                          component="p"
                          sx={{
                            ...bodySx,
                            m: 0,
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                            textAlign: "left",
                          }}
                        >
                          {message.content}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            ) : null}
            {review && (
              <Box aria-label="Checkpoint review">
                {review.questions.length > 0 && (
                  <Box>
                    <Typography component="h3" sx={{ ...headingSx, mb: 1 }}>
                      Decisions
                    </Typography>
                    <Box
                      component="ul"
                      sx={{ ...bodySx, textAlign: "left", pl: 3 }}
                    >
                      {review.questions.map((question) => (
                        <li key={question}>
                          <AssistantMarkdown>{question}</AssistantMarkdown>
                        </li>
                      ))}
                    </Box>
                  </Box>
                )}
                {review.referenceRequests.length > 0 && (
                  <Box>
                    <Typography component="h3" sx={{ ...headingSx, mb: 1 }}>
                      Requested references
                    </Typography>
                    <Box
                      component="ul"
                      sx={{ ...bodySx, textAlign: "left", pl: 3 }}
                    >
                      {review.referenceRequests.map((reference) => (
                        <li key={reference}>
                          <AssistantMarkdown>{reference}</AssistantMarkdown>
                        </li>
                      ))}
                    </Box>
                  </Box>
                )}
                <Typography component="h3" sx={{ ...headingSx, mb: 2 }}>
                  Proposed changes
                </Typography>
                <Box
                  sx={{
                    maxHeight: 480,
                    overflow: "auto",
                    textAlign: "left",
                    pr: 1,
                    mb: 2,
                  }}
                >
                  {review.proposal.title && (
                    <Typography component="h4" sx={{ ...headingSx, mb: 1.5 }}>
                      {review.proposal.title}
                    </Typography>
                  )}
                  {review.proposal.introduction && (
                    <AssistantMarkdown>
                      {review.proposal.introduction}
                    </AssistantMarkdown>
                  )}
                  {review.proposal.sections.map((section) => (
                    <Box key={section.title} sx={{ mt: 3 }}>
                      <Typography component="h4" sx={{ ...headingSx, mb: 2 }}>
                        {section.title}
                      </Typography>
                      {section.items.map((item, current) => (
                        <Box key={current} sx={{ mt: 2.5 }}>
                          <Typography
                            component="h5"
                            sx={{
                              ...bodySx,
                              fontSize: "1rem",
                              fontWeight: 700,
                              mb: 1,
                            }}
                          >
                            {item.heading}
                          </Typography>
                          <AssistantMarkdown>{item.body}</AssistantMarkdown>
                        </Box>
                      ))}
                    </Box>
                  ))}
                  {!!review.proposal.images?.length && (
                    <Box sx={{ mt: 3 }}>
                      <Typography component="h4" sx={{ ...headingSx, mb: 1 }}>
                        Proposed images
                      </Typography>
                      {review.proposal.images.map((image) => {
                        const reference = workflow.references.find(
                          (entry) => entry.id === image.referenceId,
                        );
                        return (
                          <Box key={image.referenceId} sx={{ mb: 2 }}>
                            {reference?.imagePath && (
                              <Box
                                component="img"
                                src={`data:image/jpeg;base64,${imageBase64(project.assets[reference.imagePath])}`}
                                alt={image.caption}
                                sx={{
                                  maxWidth: "100%",
                                  maxHeight: 180,
                                  display: "block",
                                  mb: 1,
                                }}
                              />
                            )}
                            <Typography component="p" sx={bodySx}>
                              {image.section} / {image.heading}: {image.caption}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                  {!!review.unresolved.length && (
                    <Box sx={{ mt: 3 }}>
                      <Typography component="h4" sx={{ ...headingSx, mb: 1 }}>
                        Unresolved
                      </Typography>
                      <Box component="ul" sx={{ ...bodySx, pl: 3, m: 0 }}>
                        {review.unresolved.map((note, current) => (
                          <li key={current}>
                            <AssistantMarkdown>{note}</AssistantMarkdown>
                          </li>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
                <Tooltip
                  title={
                    workflow.mode === "fill"
                      ? "Applies only the proposed subsections, adding new ones or replacing matching headings. Other text, images and prototype controls are preserved. Submit or clear any unsent prompt first."
                      : "Applies the proposed text, replacing text in the listed sections. Existing image categories and other sections are preserved. Submit or clear any unsent prompt first. Revising an earlier checkpoint requires reapproval of later checkpoints."
                  }
                >
                  <span>
                    <Button
                      sx={goldButtonSx}
                      disabled={locked || Boolean(stage?.prompt.trim())}
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
                workflow.mode === "scratch" &&
                index === 0 &&
                !stage?.history.length
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
                      title={reference.text || reference.url || reference.name}
                    >
                      <Typography sx={{ ...bodySx, overflowWrap: "anywhere" }}>
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
                    disabled={
                      locked ||
                      (workflow.mode === "scratch" && !stage?.prompt.trim())
                    }
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
      <Dialog
        open={pendingMode !== null}
        onClose={() => setPendingMode(null)}
        aria-labelledby="gdd-assistant-mode-title"
        slotProps={{ paper: { sx: dialogPaperSx } }}
      >
        <DialogTitle id="gdd-assistant-mode-title" sx={headingSx}>
          {pendingMode === "scratch"
            ? "Replace the current GDD?"
            : "Switch assistant mode?"}
        </DialogTitle>
        <DialogContent sx={bodySx}>
          {pendingMode === "scratch"
            ? "The current draft, images, prototype settings and assistant progress will be replaced. Saved account copies are unchanged."
            : "Assistant progress and references will be reset. Your GDD will be preserved."}
        </DialogContent>
        <DialogActions>
          <Button sx={outlineButtonSx} onClick={() => setPendingMode(null)}>
            Cancel
          </Button>
          <Button
            sx={goldButtonSx}
            disabled={locked}
            onClick={() => pendingMode && start(pendingMode)}
          >
            {pendingMode === "scratch" ? "Replace GDD" : "Switch mode"}
          </Button>
        </DialogActions>
      </Dialog>
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
    </Box>
  );
}
