import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { FaUpload } from "react-icons/fa6";
import { useAuthStore } from "../../stores/authStore";
import { completeGuidedGdd } from "../../utils/gddAssistantApi";
import {
  bodySx,
  fieldSx,
  goldButtonSx,
  headingSx,
  outlineButtonSx,
} from "../../lib/medievalStyles";
import { draftFingerprint, imageBase64 } from "./assistant";
import {
  assistantMessages,
  guidedHistoryContent,
  guidedProposalDraft,
  newGuidedAssistant,
  readGuidedAssistant,
  type GuidedAssistantState,
} from "./assistantGuided";
import {
  importAssistantReference,
  importAssistantSourceDocument,
} from "./assistantReferences";
import AssistantMarkdown from "./AssistantMarkdown";
import {
  draftMarkdown,
  projectAssets,
  readDraft,
  type EditorProject,
} from "./editor";
import { prepareImages, type PdfImage } from "./images";
import { defaultPrototype } from "./prototype";

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

export default function GddGuidedAssistant({
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
  const [answer, setAnswer] = useState("");
  const upload = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const session = project.draft.guidedAssistant ?? newGuidedAssistant();
  const response = session.response;
  const question = response?.questions[0];
  const locked = disabled || busy || !username;
  const hasDocumentContent = Boolean(
    project.draft.title.trim() ||
    project.draft.introduction.trim() ||
    project.draft.sections.some((section) =>
      section.items.some((item) => item.type === "text" && item.body.trim()),
    ),
  );

  useEffect(() => {
    setBusy(false);
    onBusyChange(false);
    setError("");
    return () => {
      request.current?.abort();
      onBusyChange(false);
    };
  }, [username, onBusyChange]);

  function updateSession(next: GuidedAssistantState, assets = project.assets) {
    try {
      const validated = readGuidedAssistant(next);
      const changed = {
        draft: { ...project.draft, guidedAssistant: validated },
        assets,
      };
      onChange({ ...changed, assets: projectAssets(changed) }, false);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not update assistant progress.",
      );
    }
  }

  function editSession(update: Partial<GuidedAssistantState>) {
    updateSession({
      ...session,
      ...update,
      response:
        "prompt" in update || "references" in update
          ? null
          : (update.response ?? session.response),
      baseFingerprint:
        "prompt" in update || "references" in update
          ? null
          : (update.baseFingerprint ?? session.baseFingerprint),
      readyForDraft:
        "prompt" in update || "references" in update
          ? false
          : (update.readyForDraft ?? session.readyForDraft),
      approved: false,
    });
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

  async function requestAssistant(
    action: "clarify" | "draft",
    userAnswer?: string,
  ) {
    if (
      !session.prompt.trim() &&
      !session.references.length &&
      !hasDocumentContent
    )
      throw new Error("Describe your game or add a reference first.");
    await perform(async (active, signal) => {
      const prototype = project.draft.prototype;
      const hasExplicitPrototype =
        prototype &&
        JSON.stringify(prototype) !== JSON.stringify(defaultPrototype());
      const document = draftMarkdown(
        hasExplicitPrototype
          ? project.draft
          : { ...project.draft, prototype: undefined },
        false,
      );
      if (document.length > 100000)
        throw new Error(
          "The GDD exceeds 100,000 characters. Reduce it before requesting assistance.",
        );
      const history = userAnswer
        ? assistantMessages(session.history, [
            { role: "user", content: userAnswer },
          ])
        : session.history;
      const currentFingerprint = await draftFingerprint(project.draft);
      const references = session.references.map((reference) => {
        const bytes = reference.imagePath
          ? project.assets[reference.imagePath]
          : undefined;
        if (reference.imagePath && !bytes)
          throw new Error(`Missing reference image: ${reference.name}`);
        return {
          ...reference,
          imageBase64: bytes ? imageBase64(bytes) : "",
        };
      });
      const result = await completeGuidedGdd(
        {
          action,
          prompt:
            session.prompt.trim() ||
            "Use my uploaded references and current GDD to help define the game.",
          document,
          history,
          references,
        },
        signal,
      );
      if (!active()) return;
      const nextHistory = assistantMessages(history, [
        {
          role: "assistant",
          content: guidedHistoryContent(result.message, result.questions[0]),
        },
      ]);
      const next = readGuidedAssistant({
        ...session,
        history: nextHistory,
        response: result,
        baseFingerprint: currentFingerprint,
        readyForDraft: result.readyForDraft,
        approved: false,
      });
      updateSession(next);
      setAnswer("");
    });
  }

  function addNote() {
    if (!notes.trim() && !link.trim()) return;
    if (link.trim()) {
      try {
        if (!["http:", "https:"].includes(new URL(link.trim()).protocol))
          throw new Error();
      } catch {
        setError("Reference links must be HTTP or HTTPS URLs.");
        return;
      }
    }
    const reference = {
      id: crypto.randomUUID(),
      checkpoint: 0,
      name: link.trim() ? "Reference link" : "Reference notes",
      text: notes.trim(),
      url: link.trim(),
    };
    editSession({
      references: [...session.references, reference],
    });
    setNotes("");
    setLink("");
  }

  function filesSelected(files: File[]) {
    void perform(async (active) => {
      const additions = [];
      const assets = { ...project.assets };
      const notices: string[] = [];
      for (const file of files) {
        let imported: Awaited<ReturnType<typeof importAssistantSourceDocument>>;
        if (/\.(pdf|docx)$/i.test(file.name)) {
          imported = await importAssistantSourceDocument(file);
        } else {
          const result = await importAssistantReference(file, 0);
          imported = {
            references: [result.reference],
            assets: result.assets,
            warnings: result.warnings,
          };
        }
        if (!active()) return;
        additions.push(
          ...imported.references.map((reference) => ({
            ...reference,
            checkpoint: 0 as const,
          })),
        );
        Object.assign(assets, imported.assets);
        notices.push(...imported.warnings);
      }
      if (session.references.length + additions.length > 12)
        throw new Error("Use up to 12 references.");
      const imageCount = [...session.references, ...additions].filter(
        (reference) => reference.imagePath,
      ).length;
      if (imageCount > 4) throw new Error("Use up to four reference images.");
      updateSession(
        { ...session, references: [...session.references, ...additions] },
        assets,
      );
      setWarnings([...new Set(notices)]);
    });
  }

  async function approve() {
    const proposal = response?.proposal;
    if (!proposal) return;
    await perform(async (active) => {
      if ((await draftFingerprint(project.draft)) !== session.baseFingerprint)
        throw new Error(
          "The GDD changed after this proposal. Ask the assistant to revise it before applying.",
        );
      const changed = guidedProposalDraft(
        project.draft,
        proposal,
        session.references,
      );
      if (
        project.draft.prototype &&
        JSON.stringify(project.draft.prototype) ===
          JSON.stringify(defaultPrototype())
      )
        changed.prototype = undefined;
      changed.guidedAssistant = {
        ...session,
        response: null,
        baseFingerprint: null,
        readyForDraft: false,
        approved: true,
      };
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
      if (!active()) return;
      onChange({ draft: validated, assets }, true);
      onImagesPrepared(prepared);
      onComplete();
    });
  }

  return (
    <Stack spacing={2}>
      {!username && (
        <Alert severity="info">Sign in to use the AI Assistant.</Alert>
      )}
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
      <TextField
        label="Describe your game"
        value={session.prompt}
        disabled={locked}
        multiline
        minRows={4}
        maxRows={12}
        slotProps={{ htmlInput: { maxLength: 4000 } }}
        sx={fieldSx}
        onChange={(event) => editSession({ prompt: event.target.value })}
      />
      {session.references.map((reference) => (
        <Box
          key={reference.id}
          sx={{ display: "flex", gap: 1, alignItems: "center", minWidth: 0 }}
        >
          {reference.imagePath && (
            <Box
              component="img"
              src={`data:image/jpeg;base64,${imageBase64(project.assets[reference.imagePath])}`}
              alt={reference.name}
              sx={{ width: 56, height: 56, objectFit: "contain" }}
            />
          )}
          <Typography sx={{ ...bodySx, flex: 1, overflowWrap: "anywhere" }}>
            {reference.name}
          </Typography>
          <Button
            disabled={locked}
            size="small"
            aria-label={`Remove ${reference.name}`}
            onClick={() =>
              editSession({
                references: session.references.filter(
                  (entry) => entry.id !== reference.id,
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
        value={notes}
        disabled={locked}
        multiline
        minRows={2}
        slotProps={{ htmlInput: { maxLength: 20000 } }}
        sx={fieldSx}
        onChange={(event) => setNotes(event.target.value)}
      />
      <Tooltip title="Links are context only; the assistant does not open web pages.">
        <TextField
          label="Reference link"
          type="url"
          value={link}
          disabled={locked}
          slotProps={{ htmlInput: { maxLength: 2000 } }}
          sx={fieldSx}
          onChange={(event) => setLink(event.target.value)}
        />
      </Tooltip>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <Button
          sx={outlineButtonSx}
          disabled={
            locked ||
            session.references.length >= 12 ||
            (!notes.trim() && !link.trim())
          }
          onClick={addNote}
        >
          Add reference
        </Button>
        <Tooltip title="PDF, DOCX, Markdown, plain text, PNG, or JPEG.">
          <span>
            <Button
              startIcon={<FaUpload />}
              sx={outlineButtonSx}
              disabled={locked || session.references.length >= 12}
              onClick={() => upload.current?.click()}
            >
              Upload references
            </Button>
          </span>
        </Tooltip>
        <Button
          sx={outlineButtonSx}
          disabled={locked || (!session.prompt && !session.history.length)}
          onClick={() => {
            updateSession(newGuidedAssistant());
            setAnswer("");
          }}
        >
          New conversation
        </Button>
      </Stack>
      <input
        ref={upload}
        type="file"
        multiple
        hidden
        accept=".pdf,.docx,.md,.markdown,.txt,.png,.jpg,.jpeg"
        aria-label="Upload GDD reference material"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length) filesSelected(files);
        }}
      />
      {session.history.map((message, index) => (
        <Box
          key={index}
          sx={{
            p: 2,
            borderLeft: "2px solid",
            borderColor:
              message.role === "user"
                ? "rgba(200,162,74,0.3)"
                : "medievalGold.main",
            bgcolor: "rgba(0,0,0,0.12)",
          }}
        >
          <Typography component="h3" variant="caption" sx={headingSx}>
            {message.role === "user" ? "You" : "Assistant"}
          </Typography>
          <Typography
            sx={{
              ...bodySx,
              mt: 1,
              m: 0,
              whiteSpace: "pre-wrap",
              textAlign: "left",
            }}
          >
            {message.content}
          </Typography>
        </Box>
      ))}
      {response && (
        <Box aria-live="polite">
          <Typography sx={{ ...bodySx, textAlign: "left", mb: 2 }}>
            {response.message}
          </Typography>
          {question && (
            <Stack spacing={1.5}>
              <Typography component="h3" sx={headingSx}>
                {question.question}
              </Typography>
              {question.suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outlined"
                  sx={{ ...outlineButtonSx, justifyContent: "flex-start" }}
                  disabled={locked}
                  onClick={() => void requestAssistant("clarify", suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
              <TextField
                label="Your answer"
                value={answer}
                disabled={locked}
                multiline
                minRows={2}
                slotProps={{ htmlInput: { maxLength: 4000 } }}
                sx={fieldSx}
                onChange={(event) => setAnswer(event.target.value)}
              />
              <Button
                sx={goldButtonSx}
                disabled={locked || !answer.trim()}
                onClick={() => void requestAssistant("clarify", answer.trim())}
              >
                Send answer
              </Button>
            </Stack>
          )}
          {response.readyForDraft && !response.proposal && (
            <Button
              sx={goldButtonSx}
              disabled={locked}
              onClick={() => void requestAssistant("draft")}
            >
              Generate complete GDD
            </Button>
          )}
          {response.proposal && (
            <Box aria-label="Complete GDD proposal" sx={{ mt: 2 }}>
              <Typography component="h3" sx={{ ...headingSx, mb: 1 }}>
                {response.proposal.title}
              </Typography>
              {response.proposal.introduction && (
                <Box sx={{ mb: 2 }}>
                  <AssistantMarkdown>
                    {response.proposal.introduction}
                  </AssistantMarkdown>
                </Box>
              )}
              {response.proposal.sections.map((section) => (
                <Box key={section.title} sx={{ mt: 2 }}>
                  <Typography component="h4" sx={headingSx}>
                    {section.title}
                  </Typography>
                  {section.items.map((item) => (
                    <Box key={item.heading} sx={{ mt: 1.5 }}>
                      <Typography
                        component="h5"
                        sx={{ ...bodySx, fontWeight: 700 }}
                      >
                        {item.heading}
                      </Typography>
                      <AssistantMarkdown>{item.body}</AssistantMarkdown>
                    </Box>
                  ))}
                </Box>
              ))}
              {response.proposal.images?.map((image) => {
                const reference = session.references.find(
                  (entry) => entry.id === image.referenceId,
                );
                const bytes = reference?.imagePath
                  ? project.assets[reference.imagePath]
                  : undefined;
                return (
                  <Box key={image.referenceId} sx={{ mt: 2 }}>
                    {bytes && (
                      <Box
                        component="img"
                        src={`data:image/jpeg;base64,${imageBase64(bytes)}`}
                        alt={image.caption}
                        sx={{
                          display: "block",
                          maxWidth: "100%",
                          maxHeight: 180,
                          mb: 1,
                        }}
                      />
                    )}
                    <Typography sx={bodySx}>
                      {image.section} / {image.heading}: {image.caption}
                    </Typography>
                  </Box>
                );
              })}
              <Button
                sx={{ ...goldButtonSx, mt: 2 }}
                disabled={locked}
                onClick={() => void approve()}
              >
                Apply complete GDD
              </Button>
            </Box>
          )}
        </Box>
      )}
      {!response && !session.approved && (
        <Button
          sx={goldButtonSx}
          disabled={
            locked ||
            (!session.prompt.trim() &&
              !session.references.length &&
              !hasDocumentContent)
          }
          onClick={() => void requestAssistant("clarify")}
        >
          Start with my idea
        </Button>
      )}
      {busy && <CircularProgress size={22} aria-label="Working on the GDD" />}
      {session.approved && (
        <Alert severity="success">Complete GDD applied to the editor.</Alert>
      )}
    </Stack>
  );
}
