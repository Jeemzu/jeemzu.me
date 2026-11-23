import { useEffect, useMemo, useRef, useState } from "react";
import { ThemeProvider, useTheme } from "@mui/material/styles";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { FaComments, FaMinus, FaXmark } from "react-icons/fa6";
import {
  bodySx,
  dialogPaperSx,
  goldButtonSx,
  headingSx,
  outlineButtonSx,
} from "../../lib/medievalStyles";
import { downloadBlob } from "../budgetize/lib/download";
import { useAuthStore } from "../../stores/authStore";
import type { SavedGdd } from "../../utils/gddApi";
import { LIMITS, parseDocument } from "./document";
import { CHECKPOINTS } from "./assistant";
import { prepareImages, type PdfImage } from "./images";
import GddAssistant from "./GddAssistant";
import GddGuidedAssistant from "./GddGuidedAssistant";
import GddAccountLibrary from "./GddAccountLibrary";
import {
  draftMarkdown,
  filename,
  projectAssets,
  projectPaths,
  validateAsset,
  type EditorProject,
  type EditorImage,
} from "./editor";
import GddCanvasEditor from "./GddCanvasEditor";
import {
  createGddTheme,
  readGddAppearance,
  saveGddAppearance,
} from "./appearance";
import {
  assetsForCanvasProject,
  canvasFromJson,
  canvasToEditorProject,
  canvasToJson,
  gddProjectTitle,
  mergeEditorProjectIntoCanvas,
} from "./canvasConversion";
import {
  GDD_SUBJECTS,
  newGddCanvasProject,
  unmappedEditorSections,
  type GddCanvasProject,
  type GddSubjectId,
  type GddSubjectMapping,
} from "./projectModel";

interface PendingMapping {
  project: EditorProject;
  documentChanged: boolean;
  replaceDocument: boolean;
  pdf?: Blob | null;
  savedDocument?: SavedGdd;
}

const PROJECT_JSON_LIMIT = 60 * 1024 * 1024;

export default function GddGeneratorPage() {
  const outerTheme = useTheme();
  const [appearance, setAppearance] = useState(readGddAppearance);
  const gddTheme = useMemo(
    () => createGddTheme(outerTheme, appearance),
    [outerTheme, appearance],
  );
  const signedIn = useAuthStore((state) => state.isAuthenticated);
  const [canvas, setCanvas] = useState<GddCanvasProject>(() =>
    newGddCanvasProject(),
  );
  const [project, setProject] = useState<EditorProject>(() => ({
    draft: { title: "", introduction: "", sections: [] },
    assets: {},
  }));
  const [images, setImages] = useState<Record<string, PdfImage>>({});
  const [accountBusy, setAccountBusy] = useState(false);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [accountResetVersion, setAccountResetVersion] = useState(0);
  const [busy, setBusy] = useState<"load" | "images" | "pdf" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [canvasFeedback, setCanvasFeedback] = useState("");
  const [dirty, setDirty] = useState(false);
  const [pendingImport, setPendingImport] = useState<File | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [completionPrompt, setCompletionPrompt] = useState(false);
  const [assistantView, setAssistantView] = useState<
    "closed" | "open" | "minimized"
  >("closed");
  const [legacyAssistantOpen, setLegacyAssistantOpen] = useState(false);
  const [editorVersion, setEditorVersion] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [mapping, setMapping] = useState<PendingMapping | null>(null);
  const [mappingValues, setMappingValues] = useState<GddSubjectMapping>({});
  function changeAppearance(next: typeof appearance) {
    setAppearance(next);
    try {
      saveGddAppearance(next);
    } catch (cause) {
      console.warn("Could not save GDD appearance preferences.", cause);
      setError("Appearance changed, but could not be saved on this device.");
    }
  }
  const libraryActions = useRef<{
    select: (document: SavedGdd) => void;
  }>(null);
  const input = useRef<HTMLInputElement>(null);
  const operation = useRef(0);
  const workflow = project.draft.assistant;
  const guidedAssistant = project.draft.guidedAssistant;
  const assistantProgress = guidedAssistant
    ? "Guided GDD"
    : workflow
      ? `${workflow.current + 1}/${CHECKPOINTS.length} - ${CHECKPOINTS[workflow.current].label}`
      : "AI Assistant";
  const assistantStatus = assistantBusy
    ? "Working"
    : guidedAssistant?.approved ||
        workflow?.stages.every((stage) => stage.approved)
      ? "Complete"
      : guidedAssistant?.response?.proposal ||
          workflow?.stages[workflow.current].response
        ? "Ready for review"
        : guidedAssistant?.readyForDraft
          ? "Ready to generate"
          : guidedAssistant?.response?.questions.length
            ? "Needs your input"
            : "";

  useEffect(
    () => () => {
      operation.current++;
    },
    [],
  );
  useEffect(
    () => () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    },
    [pdfUrl],
  );
  useEffect(() => {
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    if (dirty) window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirty]);
  function invalidatePdf() {
    setPdfUrl(null);
    setPdfBlob(null);
  }

  function commitCanvas(
    next: GddCanvasProject,
    changed = true,
    editorOverride?: EditorProject,
    invalidateDocument = changed,
  ) {
    const updatedProject = editorOverride ?? canvasToEditorProject(next);
    const paths = projectPaths(updatedProject.draft);
    const usedPaths = new Set(paths);
    const normalizedCanvas = {
      ...next,
      assets: Object.fromEntries(
        Object.entries(next.assets).filter(([path]) => usedPaths.has(path)),
      ),
    };
    const normalizedProject = editorOverride
      ? {
          ...editorOverride,
          assets: Object.fromEntries(
            Object.entries(editorOverride.assets).filter(([path]) =>
              usedPaths.has(path),
            ),
          ),
        }
      : canvasToEditorProject(normalizedCanvas);
    setCanvas(normalizedCanvas);
    setProject(normalizedProject);
    setImages(
      Object.fromEntries(
        Object.entries(images).filter(([path]) => usedPaths.has(path)),
      ),
    );
    if (changed) setDirty(true);
    setError("");
    setNotice("");
    if (invalidateDocument) invalidatePdf();
  }

  function applyEditorUpdate(
    next: EditorProject,
    documentChanged: boolean,
    replaceDocument = false,
    mappings: GddSubjectMapping = {},
  ) {
    try {
      const merged = mergeEditorProjectIntoCanvas(canvas, next, mappings);
      commitCanvas(merged, true, next, documentChanged);
      if (replaceDocument) {
        setAccountResetVersion((version) => version + 1);
        setEditorVersion((version) => version + 1);
      }
      return true;
    } catch (cause) {
      const unmatched = unmappedEditorSections(next.draft);
      if (unmatched.length) {
        setMapping({
          project: next,
          documentChanged,
          replaceDocument,
        });
        setMappingValues({});
        return false;
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "The GDD changes could not be applied to the canvas.",
      );
      return false;
    }
  }

  async function finishMapping() {
    if (!mapping) return;
    const missing = unmappedEditorSections(mapping.project.draft).filter(
      (section) => !mappingValues[section.id],
    );
    if (missing.length) {
      setError("Choose a subject for every unmatched section.");
      return;
    }
    const current = ++operation.current;
    setBusy("load");
    setError("");
    try {
      const merged = mergeEditorProjectIntoCanvas(
        canvas,
        mapping.project,
        mappingValues,
      );
      const prepared = await prepareImages(mapping.project.assets);
      if (operation.current !== current) return;
      commitCanvas(merged, true, mapping.project, mapping.documentChanged);
      setImages(prepared);
      if (mapping.pdf !== undefined) {
        setPdfBlob(mapping.pdf);
        setPdfUrl(mapping.pdf ? URL.createObjectURL(mapping.pdf) : null);
      }
      if (mapping.replaceDocument)
        setAccountResetVersion((version) => version + 1);
      setEditorVersion((version) => version + 1);
      setMapping(null);
      setMappingValues({});
      setError("");
      setLibraryOpen(false);
      if (mapping.savedDocument)
        libraryActions.current?.select(mapping.savedDocument);
    } catch (cause) {
      if (operation.current === current)
        setError(
          cause instanceof Error
            ? cause.message
            : "The selected sections could not be mapped.",
        );
    } finally {
      if (operation.current === current) setBusy(null);
    }
  }

  async function importFile(file: File) {
    const current = ++operation.current;
    setError("");
    setNotice("");
    setBusy("load");
    try {
      if (file.size > PROJECT_JSON_LIMIT)
        throw new Error("GDD project JSON must be no larger than 60 MB.");
      const imported = canvasFromJson(await file.text());
      const converted = canvasToEditorProject(imported);
      const prepared = await prepareImages(converted.assets);
      if (operation.current === current) {
        commitCanvas(imported, true, converted);
        setAccountResetVersion((version) => version + 1);
        setEditorVersion((version) => version + 1);
        setImages(prepared);
        setNotice("Project opened.");
      }
    } catch (cause) {
      if (operation.current === current)
        setError(
          cause instanceof Error
            ? cause.message
            : "The project could not be opened.",
        );
    } finally {
      if (operation.current === current) setBusy(null);
    }
  }

  function saveLocally() {
    setError("");
    try {
      const json = canvasToJson(canvas);
      if (new Blob([json]).size > PROJECT_JSON_LIMIT)
        throw new Error("GDD project JSON must be no larger than 60 MB.");
      downloadBlob(
        `${filename(gddProjectTitle(canvas))} - GDD project.json`,
        new Blob([json], { type: "application/json" }),
      );
      setDirty(false);
      setNotice("Project JSON downloaded.");
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "The project JSON could not be downloaded.";
      setError(message);
    }
  }

  function downloadBlankTemplate() {
    downloadBlob(
      "GDD project template.json",
      new Blob([canvasToJson(newGddCanvasProject())], {
        type: "application/json",
      }),
    );
    setNotice("Blank project template downloaded.");
  }

  async function uploadImages(
    parentId: string,
    subsectionId: string,
    files: File[],
  ) {
    const current = ++operation.current;
    setBusy("images");
    setError("");
    setNotice("");
    try {
      if (projectPaths(project.draft).length + files.length > 97)
        throw new Error("Use no more than 97 image files per document.");
      const parent = canvas.blocks.blocks.find(
        (block) => block.id === parentId,
      );
      const group = parent?.subsections.blocks.find(
        (block) => block.id === subsectionId,
      );
      const imageContent = group?.content;
      if (
        !parent ||
        !group ||
        !imageContent ||
        typeof imageContent === "string"
      )
        throw new Error("The image subsection no longer exists.");
      const assets: Record<string, Uint8Array> = {};
      const additions: EditorImage[] = [];
      for (const file of files) {
        if (!/\.(png|jpe?g)$/i.test(file.name))
          throw new Error(`${file.name}: select a PNG or JPEG image.`);
        if (file.size > LIMITS.image)
          throw new Error(`${file.name} exceeds the 10 MB image limit.`);
        const extension = file.name.match(/\.(png|jpe?g)$/i)?.[1].toLowerCase();
        const id = crypto.randomUUID();
        const path = `images/${id}.${extension}`;
        const bytes = new Uint8Array(await file.arrayBuffer());
        validateAsset(bytes, file.name);
        assets[path] = bytes;
        additions.push({
          id,
          path,
          caption: file.name.replace(/\.[^.]+$/, "").slice(0, 400),
        });
      }
      const updatedCanvas = {
        ...canvas,
        assets: {
          ...canvas.assets,
          ...assetsForCanvasProject(assets),
        },
        blocks: {
          ...canvas.blocks,
          blocks: canvas.blocks.blocks.map((block) =>
            block.id === parentId
              ? {
                  ...block,
                  subsections: {
                    ...block.subsections,
                    blocks: block.subsections.blocks.map((entry) =>
                      entry.id === subsectionId
                        ? {
                            ...entry,
                            content: {
                              type: "images" as const,
                              images: [...imageContent.images, ...additions],
                            },
                          }
                        : entry,
                    ),
                  },
                }
              : block,
          ),
        },
      };
      const prepared = await prepareImages(assets);
      if (operation.current === current) {
        commitCanvas(updatedCanvas);
        setImages((currentImages) => ({ ...currentImages, ...prepared }));
      }
    } catch (cause) {
      if (operation.current === current)
        setError(
          cause instanceof Error
            ? cause.message
            : "The images could not be added.",
        );
    } finally {
      if (operation.current === current) setBusy(null);
    }
  }

  async function generate() {
    const current = ++operation.current;
    let preview: Window | null = null;
    let opened = false;
    setBusy("pdf");
    setError("");
    setNotice("");
    invalidatePdf();
    try {
      const content = parseDocument(draftMarkdown(project.draft));
      projectAssets(project);
      const preparedImages = await prepareImages(project.assets);
      preview = window.open("about:blank", "_blank");
      if (preview) preview.opener = null;
      const { generatePdf } = await import("./generatePdf").catch(() => {
        throw new Error(
          "The site was updated. Reload the page to generate the PDF.",
        );
      });
      const blob = await generatePdf(content, preparedImages);
      if (operation.current === current) {
        setPdfBlob(blob);
        downloadBlob(
          `${filename(project.draft.title)} - Game Design Document.pdf`,
          blob,
        );
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        if (preview && !preview.closed) {
          preview.location.replace(url);
          opened = true;
        } else {
          setNotice("PDF ready. Use Open PDF to view it in a new tab.");
        }
      }
    } catch (cause) {
      if (operation.current === current)
        setError(
          cause instanceof Error
            ? cause.message
            : "PDF generation failed. Try a smaller document.",
        );
    } finally {
      if (!opened && preview && !preview.closed) preview.close();
      if (operation.current === current) setBusy(null);
    }
  }

  function openLibrary() {
    setAssistantView((current) => (current === "open" ? "minimized" : current));
    setLibraryOpen(true);
  }

  return (
    <ThemeProvider theme={gddTheme}>
      <Box
        sx={{
          height: "calc(100dvh - var(--jz-nav-h, 64px))",
          width: "100%",
          minHeight: 0,
          position: "relative",
          overflow: "hidden",
          bgcolor: "background.default",
          color: "text.primary",
        }}
      >
        <GddCanvasEditor
          appearance={appearance}
          onAppearanceChange={changeAppearance}
          project={canvas}
          images={images}
          busy={
            busy !== null || accountBusy || assistantBusy || mapping !== null
          }
          disabled={
            busy !== null || accountBusy || assistantBusy || mapping !== null
          }
          signedIn={signedIn}
          onChange={commitCanvas}
          onUpload={(parentId, subsectionId, files) =>
            void uploadImages(parentId, subsectionId, files)
          }
          onExportPdf={() => void generate()}
          onDownloadPdf={() => {
            if (pdfBlob)
              downloadBlob(
                `${filename(project.draft.title)} - Game Design Document.pdf`,
                pdfBlob,
              );
          }}
          onExportJson={saveLocally}
          onExportTemplate={downloadBlankTemplate}
          pdfUrl={pdfUrl}
          onImportJson={() => input.current?.click()}
          onCloudSave={openLibrary}
          onOpenLibrary={openLibrary}
          onOpenAssistant={() => setAssistantView("open")}
          onFeedback={setCanvasFeedback}
        />
        <Snackbar
          open={Boolean(error || notice || canvasFeedback || busy)}
          anchorOrigin={{ vertical: "top", horizontal: "left" }}
          onClose={(_, reason) => {
            if (reason === "clickaway") return;
            setError("");
            setNotice("");
            setCanvasFeedback("");
          }}
          sx={{
            top: "calc(var(--jz-nav-h, 64px) + 8px + env(safe-area-inset-top)) !important",
            left: "max(12px, env(safe-area-inset-left)) !important",
            right: "auto",
            bottom: "auto",
            width: "min(380px, calc(100vw - 24px))",
          }}
        >
          <Stack
            spacing={1}
            sx={{
              width: "100%",
              maxHeight: "calc(100dvh - var(--jz-nav-h, 64px) - 32px)",
              overflow: "auto",
              "& .MuiAlert-root": { boxShadow: 3 },
              "& .MuiAlert-message": {
                minWidth: 0,
                maxHeight: "25dvh",
                overflow: "auto",
                overflowWrap: "anywhere",
              },
            }}
          >
            {error && (
              <Alert severity="error" onClose={() => setError("")}>
                {error}
              </Alert>
            )}
            {notice && (
              <Alert severity="success" onClose={() => setNotice("")}>
                {notice}
              </Alert>
            )}
            {canvasFeedback && (
              <Alert severity="warning" onClose={() => setCanvasFeedback("")}>
                {canvasFeedback}
              </Alert>
            )}
            {busy && (
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                role="status"
                aria-live="polite"
                sx={{
                  bgcolor: "background.paper",
                  p: 1.5,
                  borderRadius: 1,
                  boxShadow: 3,
                }}
              >
                <CircularProgress size={22} />
                <Typography sx={bodySx}>
                  {busy === "load"
                    ? "Opening project..."
                    : busy === "images"
                      ? "Reading images..."
                      : "Formatting PDF..."}
                </Typography>
              </Stack>
            )}
          </Stack>
        </Snackbar>
        <Dialog
          open={libraryOpen}
          onClose={() => setLibraryOpen(false)}
          keepMounted
          fullWidth
          maxWidth="lg"
          aria-labelledby="gdd-library-title"
          slotProps={{ paper: { sx: dialogPaperSx } }}
        >
          <DialogTitle id="gdd-library-title" sx={headingSx}>
            My GDDs
          </DialogTitle>
          <DialogContent>
            <GddAccountLibrary
              ref={libraryActions}
              project={canvas}
              pdf={pdfBlob}
              dirty={dirty}
              disabled={busy !== null || assistantBusy}
              resetVersion={accountResetVersion}
              onBusyChange={setAccountBusy}
              onSavedChange={(saved) => setDirty(!saved)}
              onLoad={(loaded, prepared, pdf) => {
                commitCanvas(loaded, false);
                setImages(prepared);
                setDirty(false);
                setError("");
                setNotice("");
                setPdfBlob(pdf);
                setPdfUrl(pdf ? URL.createObjectURL(pdf) : null);
                setLibraryOpen(false);
              }}
              onLegacyLoad={(loaded, pdf, savedDocument) => {
                if (unmappedEditorSections(loaded.draft).length) {
                  setMapping({
                    project: loaded,
                    documentChanged: true,
                    replaceDocument: false,
                    pdf,
                    savedDocument,
                  });
                  setMappingValues({});
                  return false;
                } else {
                  const merged = mergeEditorProjectIntoCanvas(canvas, loaded);
                  commitCanvas(merged, false, loaded, false);
                  setDirty(false);
                  setEditorVersion((version) => version + 1);
                  setPdfBlob(pdf);
                  setPdfUrl(pdf ? URL.createObjectURL(pdf) : null);
                  setLibraryOpen(false);
                  return true;
                }
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button sx={outlineButtonSx} onClick={() => setLibraryOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={assistantView === "open"}
          onClose={() => setAssistantView("minimized")}
          keepMounted
          fullWidth
          maxWidth="md"
          aria-labelledby="gdd-assistant-title"
          slotProps={{ paper: { sx: dialogPaperSx } }}
        >
          <DialogTitle
            id="gdd-assistant-toolbar"
            component="div"
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <Typography
              component="h2"
              id="gdd-assistant-title"
              sx={{ ...headingSx, flex: 1 }}
            >
              AI Assistant
            </Typography>
            <Tooltip title="Minimize">
              <IconButton
                aria-label="Minimize AI Assistant"
                onClick={() => setAssistantView("minimized")}
                sx={{ color: "medievalGold.light" }}
              >
                <FaMinus size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Close">
              <IconButton
                aria-label="Close AI Assistant"
                onClick={() => setAssistantView("closed")}
                sx={{ color: "medievalGold.light" }}
              >
                <FaXmark size={18} />
              </IconButton>
            </Tooltip>
          </DialogTitle>
          <DialogContent dividers>
            {canvas.assistant && (
              <Button
                sx={outlineButtonSx}
                onClick={() => setLegacyAssistantOpen((current) => !current)}
              >
                {legacyAssistantOpen
                  ? "Use full-document assistant"
                  : "Resume checkpoint assistant"}
              </Button>
            )}
            {legacyAssistantOpen ? (
              <GddAssistant
                key={`assistant-${editorVersion}`}
                project={project}
                disabled={busy !== null || accountBusy || assistantBusy}
                onBusyChange={setAssistantBusy}
                onImagesPrepared={setImages}
                onComplete={() => setCompletionPrompt(true)}
                onChange={applyEditorUpdate}
              />
            ) : (
              <GddGuidedAssistant
                key={`guided-assistant-${editorVersion}`}
                project={project}
                disabled={busy !== null || accountBusy || assistantBusy}
                onBusyChange={setAssistantBusy}
                onImagesPrepared={setImages}
                onComplete={() => setCompletionPrompt(true)}
                onChange={applyEditorUpdate}
              />
            )}
          </DialogContent>
          {!libraryOpen && !completionPrompt && (
            <DialogActions>
              <Button sx={outlineButtonSx} onClick={saveLocally}>
                Export JSON
              </Button>
              {signedIn && (
                <Button sx={outlineButtonSx} onClick={openLibrary}>
                  Save to account
                </Button>
              )}
            </DialogActions>
          )}
        </Dialog>
        {assistantView === "minimized" && (
          <Tooltip title="Restore AI Assistant">
            <Button
              variant="contained"
              aria-label="Restore AI Assistant"
              aria-haspopup="dialog"
              onClick={() => setAssistantView("open")}
              startIcon={
                assistantBusy ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <FaComments />
                )
              }
              sx={{
                ...goldButtonSx,
                position: "fixed",
                right: { xs: 16, sm: 24 },
                bottom: "calc(88px + env(safe-area-inset-bottom))",
                zIndex: (theme) => theme.zIndex.fab,
                borderRadius: 8,
                maxWidth: "calc(100vw - 32px)",
                boxShadow: 6,
                textTransform: "none",
              }}
            >
              <Box component="span" role="status" aria-live="polite">
                {assistantStatus ? `${assistantStatus} - ` : ""}
                {assistantProgress}
              </Box>
            </Button>
          </Tooltip>
        )}
        <Dialog
          open={completionPrompt}
          onClose={() => setCompletionPrompt(false)}
          aria-labelledby="gdd-completion-title"
          slotProps={{ paper: { sx: { ...dialogPaperSx, mb: 12 } } }}
        >
          <DialogTitle id="gdd-completion-title" sx={headingSx}>
            Generate a new PDF?
          </DialogTitle>
          <DialogActions>
            <Button
              sx={outlineButtonSx}
              onClick={() => setCompletionPrompt(false)}
            >
              Not now
            </Button>
            <Button
              sx={goldButtonSx}
              disabled={busy !== null || accountBusy || assistantBusy}
              onClick={() => {
                setCompletionPrompt(false);
                setAssistantView("minimized");
                void generate();
              }}
            >
              Generate PDF
            </Button>
          </DialogActions>
        </Dialog>
        {mapping && (
          <Dialog
            open
            onClose={() => {
              if (busy !== null) return;
              setMapping(null);
              setLibraryOpen(false);
            }}
            fullWidth
            maxWidth="sm"
            aria-labelledby="gdd-mapping-title"
            slotProps={{ paper: { sx: dialogPaperSx } }}
          >
            <DialogTitle id="gdd-mapping-title" sx={headingSx}>
              Map imported sections
            </DialogTitle>
            <DialogContent>
              <Typography sx={{ ...bodySx, textAlign: "left", mb: 2 }}>
                Choose a canvas subject for each section that does not match an
                existing subject.
              </Typography>
              <Stack spacing={2}>
                {unmappedEditorSections(mapping.project.draft).map(
                  (section) => (
                    <FormControl key={section.id} fullWidth>
                      <InputLabel id={`mapping-${section.id}`}>
                        {section.title}
                      </InputLabel>
                      <Select<GddSubjectId>
                        labelId={`mapping-${section.id}`}
                        label={section.title}
                        value={mappingValues[section.id] ?? ""}
                        onChange={(event) =>
                          setMappingValues((current) => ({
                            ...current,
                            [section.id]: event.target.value,
                          }))
                        }
                      >
                        {GDD_SUBJECTS.map((subject) => (
                          <MenuItem key={subject.id} value={subject.id}>
                            {subject.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ),
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button
                sx={outlineButtonSx}
                disabled={busy !== null}
                onClick={() => {
                  setMapping(null);
                  setLibraryOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                sx={goldButtonSx}
                disabled={
                  busy !== null ||
                  unmappedEditorSections(mapping.project.draft).some(
                    (section) => !mappingValues[section.id],
                  )
                }
                onClick={() => void finishMapping()}
              >
                Continue
              </Button>
            </DialogActions>
          </Dialog>
        )}
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          aria-label="Import GDD project JSON"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (dirty) setPendingImport(file);
            else void importFile(file);
          }}
        />
        <Dialog
          open={pendingImport !== null}
          onClose={() => setPendingImport(null)}
          slotProps={{ paper: { sx: dialogPaperSx } }}
        >
          <DialogTitle sx={headingSx}>Replace unsaved draft?</DialogTitle>
          <DialogActions>
            <Button sx={outlineButtonSx} onClick={() => setPendingImport(null)}>
              Cancel
            </Button>
            <Button
              color="error"
              disabled={busy !== null || accountBusy || assistantBusy}
              onClick={() => {
                if (pendingImport) void importFile(pendingImport);
                setPendingImport(null);
              }}
            >
              Replace
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}
