import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  FaArrowUpRightFromSquare,
  FaDownload,
  FaComments,
  FaFileLines,
  FaFilePdf,
  FaMinus,
  FaRobot,
  FaScrewdriverWrench,
  FaUpload,
  FaXmark,
} from "react-icons/fa6";
import PageHeading from "../../components/shared/PageHeading";
import SidebarTooltip from "../../components/shared/SidebarTooltip";
import {
  bodySx,
  dialogPaperSx,
  goldButtonSx,
  headingSx,
  outlineButtonSx,
} from "../../lib/medievalStyles";
import { downloadBlob } from "../budgetize/lib/download";
import { useAuthStore } from "../../stores/authStore";
import { createTemplate } from "./archive";
import { LIMITS, parseDocument } from "./document";
import { CHECKPOINTS } from "./assistant";
import { prepareImages, type PdfImage } from "./images";
import GddEditorForm from "./GddEditorForm";
import GddAssistant from "./GddAssistant";
import ActionSidebar from "../../components/shared/ActionSidebar";
import GddAccountLibrary from "./GddAccountLibrary";
import GddExampleDialog from "./GddExampleDialog";
import DevSetupDialog from "./DevSetupDialog";
import { createExample, EXAMPLE_MARKDOWN, loadExampleAssets } from "./example";
import {
  defaultDraft,
  draftFromMarkdown,
  draftMarkdown,
  filename,
  projectAssets,
  projectPaths,
  validateAsset,
  type EditorDraft,
  type EditorProject,
  type EditorImage,
} from "./editor";
import {
  DOCUMENT_ACCEPT,
  importDocument,
  markdownArchive,
} from "./importDocument";

export default function GddGeneratorPage() {
  const signedIn = useAuthStore((state) => state.isAuthenticated);
  const [project, setProject] = useState<EditorProject>(() => ({
    draft: defaultDraft(),
    assets: {},
  }));
  const [images, setImages] = useState<Record<string, PdfImage>>({});
  const [accountBusy, setAccountBusy] = useState(false);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [accountResetVersion, setAccountResetVersion] = useState(0);
  const [busy, setBusy] = useState<"import" | "images" | "pdf" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [pendingImport, setPendingImport] = useState<File | "example" | null>(
    null,
  );
  const [importOpen, setImportOpen] = useState(false);
  const [exampleOpen, setExampleOpen] = useState(false);
  const [devSetupOpen, setDevSetupOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [assistantView, setAssistantView] = useState<
    "closed" | "open" | "minimized"
  >("closed");
  const [editorVersion, setEditorVersion] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const status = useRef<HTMLDivElement>(null);
  const operation = useRef(0);
  const workflow = project.draft.assistant;
  const assistantProgress = workflow
    ? `${workflow.current + 1}/${CHECKPOINTS.length} - ${CHECKPOINTS[workflow.current].label}`
    : "AI Assistant";
  const assistantStatus = assistantBusy
    ? "Working"
    : workflow?.stages.every((stage) => stage.approved)
      ? "Complete"
      : workflow?.stages[workflow.current].response
        ? "Ready for review"
        : "";
  const setupEngine =
    project.draft.prototype?.engines.includes("threejs") &&
    !project.draft.prototype.engines.includes("unity")
      ? "threejs"
      : "unity";

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
  useEffect(() => {
    if (error) status.current?.scrollIntoView({ block: "nearest" });
  }, [error]);

  function invalidatePdf() {
    setPdfUrl(null);
    setPdfBlob(null);
  }

  function changeDraft(draft: EditorDraft) {
    const paths = projectPaths(draft);
    setProject({
      draft,
      assets: Object.fromEntries(
        Object.entries(project.assets).filter(([path]) => paths.includes(path)),
      ),
    });
    setImages(
      Object.fromEntries(
        Object.entries(images).filter(([path]) => paths.includes(path)),
      ),
    );
    setDirty(true);
    setError("");
    setNotice("");
    setImportWarnings([]);
    invalidatePdf();
  }

  async function importFile(file: File) {
    const current = ++operation.current;
    setError("");
    setNotice("");
    setBusy("import");
    try {
      const result = await importDocument(file);
      const imported = result.project;
      const prepared = await prepareImages(imported.assets);
      if (operation.current === current) {
        setProject(imported);
        setAccountResetVersion((version) => version + 1);
        setEditorVersion((version) => version + 1);
        setImages(prepared);
        setDirty(result.converted);
        invalidatePdf();
        setImportWarnings(result.warnings);
        setNotice(result.converted ? "Document imported." : "Draft imported.");
      }
    } catch (cause) {
      if (operation.current === current)
        setError(
          cause instanceof Error
            ? cause.message
            : "The draft could not be imported.",
        );
    } finally {
      if (operation.current === current) setBusy(null);
    }
  }

  function downloadSource() {
    setError("");
    try {
      const bytes = markdownArchive(project);
      downloadBlob(
        `${filename(project.draft.title)} - GDD.zip`,
        new Blob([Uint8Array.from(bytes).buffer], { type: "application/zip" }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The source ZIP could not be created.",
      );
    }
  }

  async function uploadImages(
    sectionId: string,
    groupId: string,
    files: File[],
  ) {
    const current = ++operation.current;
    setBusy("images");
    setError("");
    setNotice("");
    try {
      const section = project.draft.sections.find(
        (entry) => entry.id === sectionId,
      );
      const group = section?.items.find((entry) => entry.id === groupId);
      if (!group || group.type !== "images")
        throw new Error("The image category no longer exists.");
      if (projectPaths(project.draft).length + files.length > 97)
        throw new Error("Use no more than 97 image files per document.");
      const assets = { ...project.assets };
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
      const draft: EditorDraft = {
        ...project.draft,
        sections: project.draft.sections.map((entry) =>
          entry.id === sectionId
            ? {
                ...entry,
                items: entry.items.map((item) =>
                  item.id === groupId
                    ? { ...group, images: [...group.images, ...additions] }
                    : item,
                ),
              }
            : entry,
        ),
      };
      const next = { draft, assets };
      projectAssets(next);
      const prepared = await prepareImages(
        Object.fromEntries(
          additions.map((image) => [image.path, assets[image.path]]),
        ),
      );
      if (operation.current === current) {
        setProject(next);
        setImages({ ...images, ...prepared });
        setDirty(true);
        invalidatePdf();
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
      preview = window.open("about:blank", "_blank");
      if (preview) preview.opener = null;
      const { generatePdf } = await import("./generatePdf").catch(() => {
        throw new Error(
          "The site was updated. Reload the page to generate the PDF.",
        );
      });
      const blob = await generatePdf(content, images);
      if (operation.current === current) {
        setPdfBlob(blob);
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

  async function populateExample() {
    const current = ++operation.current;
    setBusy("images");
    setError("");
    setNotice("");
    try {
      const draft = draftFromMarkdown(EXAMPLE_MARKDOWN);
      const assets = await loadExampleAssets();
      const prepared = await prepareImages(assets);
      if (operation.current !== current) return;
      setProject({ draft, assets });
      setImages(prepared);
      setAccountResetVersion((version) => version + 1);
      setEditorVersion((version) => version + 1);
      setDirty(true);
      invalidatePdf();
      setImportWarnings([]);
      setNotice("Dino Rush example loaded.");
    } catch (cause) {
      if (operation.current === current)
        setError(
          cause instanceof Error
            ? cause.message
            : "The example could not be loaded.",
        );
    } finally {
      if (operation.current === current) setBusy(null);
    }
  }

  async function downloadTemplate(example = false) {
    const current = ++operation.current;
    if (example) setBusy("images");
    setError("");
    setNotice("");
    try {
      const bytes = example
        ? createExample(await loadExampleAssets())
        : createTemplate(project.draft.prototype);
      if (operation.current !== current) return;
      downloadBlob(
        example ? "dino-rush-example.zip" : "gdd-template.zip",
        new Blob([Uint8Array.from(bytes).buffer], { type: "application/zip" }),
      );
    } catch (cause) {
      if (operation.current === current)
        setError(
          cause instanceof Error
            ? cause.message
            : "The ZIP could not be downloaded.",
        );
    } finally {
      if (operation.current === current) setBusy(null);
    }
  }

  return (
    <Container maxWidth={false} disableGutters>
      <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
        <ActionSidebar
          title="GDD tools"
          sections={[
            ...(signedIn
              ? [
                  {
                    id: "library",
                    label: "My GDDs",
                    icon: <FaFileLines />,
                    onClick: () => setLibraryOpen(true),
                  },
                ]
              : []),
            {
              id: "assistant",
              label: "AI Assistant",
              icon: <FaRobot />,
              onClick: () => setAssistantView("open"),
            },
            {
              id: "example",
              label: "Example GDD",
              icon: <FaFileLines />,
              content: (
                <SidebarTooltip title="Preview the Dino Rush example GDD, load it into the editor, or download its source ZIP.">
                  <span>
                    <Button
                      variant="text"
                      disabled={busy !== null || accountBusy || assistantBusy}
                      onClick={() => setExampleOpen(true)}
                    >
                      View Example GDD
                    </Button>
                  </span>
                </SidebarTooltip>
              ),
            },
            {
              id: "setup",
              label: "Setup prompt",
              icon: <FaScrewdriverWrench />,
              content: (
                <SidebarTooltip title="Create a personalized Windows setup prompt for Unity or Three.js and supporting tools.">
                  <Button variant="text" onClick={() => setDevSetupOpen(true)}>
                    Dev Setup Prompt
                  </Button>
                </SidebarTooltip>
              ),
            },
            {
              id: "pdf",
              label: "PDF actions",
              icon: <FaFilePdf />,
              content: (
                <>
                  <SidebarTooltip title="Empty sections and subsections are omitted from the PDF.">
                    <Box component="span">
                      <Button
                        fullWidth
                        startIcon={<FaFilePdf />}
                        variant="text"
                        disabled={busy !== null || accountBusy || assistantBusy}
                        onClick={() => void generate()}
                      >
                        Generate PDF
                      </Button>
                    </Box>
                  </SidebarTooltip>
                  <SidebarTooltip
                    title={
                      !pdfBlob
                        ? "Generate a PDF first."
                        : "Download the current GDD as a PDF file."
                    }
                  >
                    <span>
                      <Button
                        fullWidth
                        startIcon={<FaDownload />}
                        variant="text"
                        disabled={!pdfBlob}
                        onClick={() => {
                          if (pdfBlob)
                            downloadBlob(
                              `${filename(project.draft.title)} - Game Design Document.pdf`,
                              pdfBlob,
                            );
                        }}
                      >
                        Download PDF
                      </Button>
                    </span>
                  </SidebarTooltip>
                  <SidebarTooltip
                    title={
                      !pdfUrl
                        ? "Generate a PDF first."
                        : "Open the current GDD PDF in a new browser tab."
                    }
                  >
                    <span>
                      <Button
                        fullWidth
                        startIcon={<FaArrowUpRightFromSquare />}
                        component="a"
                        href={pdfUrl ?? undefined}
                        disabled={!pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="text"
                      >
                        Open PDF
                      </Button>
                    </span>
                  </SidebarTooltip>
                </>
              ),
            },
            {
              id: "local",
              label: "Local editing",
              icon: <FaUpload />,
              content: (
                <>
                  <SidebarTooltip title="Download a blank GDD template ZIP for local editing and later import.">
                    <span>
                      <Button
                        startIcon={<FaDownload />}
                        variant="text"
                        disabled={busy !== null || accountBusy || assistantBusy}
                        onClick={() => void downloadTemplate()}
                      >
                        Download template
                      </Button>
                    </span>
                  </SidebarTooltip>
                  <SidebarTooltip title="Load a GDD from ZIP, PDF, DOCX, Markdown, text, or HTML into the editor.">
                    <span>
                      <Button
                        startIcon={<FaUpload />}
                        variant="text"
                        disabled={busy !== null || accountBusy || assistantBusy}
                        onClick={() => setImportOpen(true)}
                      >
                        Import GDD
                      </Button>
                    </span>
                  </SidebarTooltip>
                  <SidebarTooltip title="Download GDD source and images. Guided drafts also include editor metadata and reference materials to resume checkpoints.">
                    <span>
                      <Button
                        startIcon={<FaDownload />}
                        variant="text"
                        disabled={busy !== null || accountBusy || assistantBusy}
                        onClick={downloadSource}
                      >
                        Download source ZIP
                      </Button>
                    </span>
                  </SidebarTooltip>
                </>
              ),
            },
          ]}
        />
        <Stack
          spacing={3}
          sx={{
            flex: 1,
            minWidth: 0,
            px: { xs: 2, sm: 3, md: 0 },
            pr: { md: 3 },
            py: { xs: 4, md: 6 },
          }}
        >
          <Box>
            <PageHeading title="GDD Generator" />
          </Box>
          <Box
            ref={status}
            hidden={!error && !notice && !importWarnings.length && !busy}
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
            {importWarnings.length > 0 && (
              <Alert severity="warning" onClose={() => setImportWarnings([])}>
                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                  {importWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </Box>
              </Alert>
            )}
            {busy && (
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                role="status"
                aria-live="polite"
              >
                <CircularProgress size={22} />
                <Typography sx={bodySx}>
                  {busy === "import"
                    ? "Reading draft..."
                    : busy === "images"
                      ? "Reading images..."
                      : "Formatting PDF..."}
                </Typography>
              </Stack>
            )}
          </Box>
          <GddEditorForm
            key={editorVersion}
            draft={project.draft}
            images={images}
            disabled={busy !== null || accountBusy || assistantBusy}
            onChange={changeDraft}
            onUpload={(sectionId, groupId, files) =>
              void uploadImages(sectionId, groupId, files)
            }
          />
        </Stack>
      </Stack>
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
            project={project}
            pdf={pdfBlob}
            dirty={dirty}
            disabled={busy !== null || assistantBusy}
            resetVersion={accountResetVersion}
            onBusyChange={setAccountBusy}
            onSavedChange={(saved) => setDirty(!saved)}
            onLoad={(loaded, prepared, pdf) => {
              setProject(loaded);
              setImages(prepared);
              setEditorVersion((version) => version + 1);
              setDirty(false);
              setError("");
              setNotice("");
              setImportWarnings([]);
              setPdfBlob(pdf);
              setPdfUrl(URL.createObjectURL(pdf));
              setLibraryOpen(false);
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
          <GddAssistant
            key={`assistant-${editorVersion}`}
            project={project}
            disabled={busy !== null || accountBusy || assistantBusy}
            onBusyChange={setAssistantBusy}
            onChange={(next, documentChanged) => {
              setProject(next);
              setDirty(true);
              setError("");
              setNotice("");
              if (documentChanged) invalidatePdf();
            }}
          />
        </DialogContent>
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
              bottom: "max(24px, env(safe-area-inset-bottom))",
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
      <input
        ref={input}
        type="file"
        accept={DOCUMENT_ACCEPT}
        aria-label="Import GDD document or ZIP"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setImportOpen(false);
          if (dirty) setPendingImport(file);
          else void importFile(file);
        }}
      />
      <DevSetupDialog
        key={setupEngine}
        initialEngine={setupEngine}
        open={devSetupOpen}
        onClose={() => setDevSetupOpen(false)}
      />
      <GddExampleDialog
        open={exampleOpen}
        disabled={busy !== null || accountBusy || assistantBusy}
        onClose={() => setExampleOpen(false)}
        onDownload={() => void downloadTemplate(true)}
        onPopulate={() => {
          setExampleOpen(false);
          if (dirty) setPendingImport("example");
          else void populateExample();
        }}
      />
      <Dialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        aria-labelledby="gdd-import-title"
        fullWidth
        maxWidth="sm"
        slotProps={{ paper: { sx: dialogPaperSx } }}
      >
        <DialogTitle id="gdd-import-title" sx={headingSx}>
          Import GDD
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ ...bodySx, textAlign: "left" }}>
            Import PDF, DOCX, Markdown, text, HTML, or a GDD ZIP. For ZIP
            imports, keep images/ beside gdd.md.
          </Typography>
          <Box
            component="pre"
            sx={{
              p: 2,
              overflowX: "auto",
              color: "parchment.main",
              backgroundColor: "rgba(0,0,0,0.25)",
              fontSize: "0.85rem",
            }}
          >
            {`Contents ZIP              Parent folder ZIP
game.zip                  game.zip
|-- gdd.md                +-- my-game/
+-- images/                   |-- gdd.md
    +-- reference.png         +-- images/
                                  +-- reference.png`}
          </Box>
          <Typography sx={{ ...bodySx, textAlign: "left" }}>
            Images are optional (PNG/JPEG). Existing editor.json drafts are also
            supported. ZIP limit: 25 MB.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button sx={outlineButtonSx} onClick={() => setImportOpen(false)}>
            Cancel
          </Button>
          <Button sx={goldButtonSx} onClick={() => input.current?.click()}>
            Choose file
          </Button>
        </DialogActions>
      </Dialog>
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
              if (pendingImport === "example") void populateExample();
              else if (pendingImport) void importFile(pendingImport);
              setPendingImport(null);
            }}
          >
            Replace
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
