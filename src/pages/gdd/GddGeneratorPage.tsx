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
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  FaArrowUpRightFromSquare,
  FaDownload,
  FaFilePdf,
  FaUpload,
} from "react-icons/fa6";
import PageHeading from "../../components/shared/PageHeading";
import {
  bodySx,
  dialogPaperSx,
  goldButtonSx,
  headingSx,
  outlineButtonSx,
  panelSx,
} from "../../lib/medievalStyles";
import { downloadBlob } from "../budgetize/lib/download";
import { createTemplate } from "./archive";
import { LIMITS, parseDocument } from "./document";
import { prepareImages, type PdfImage } from "./images";
import GddEditorForm from "./GddEditorForm";
import GddAccountLibrary from "./GddAccountLibrary";
import GddExampleDialog from "./GddExampleDialog";
import { createExample, EXAMPLE_MARKDOWN, loadExampleAssets } from "./example";
import {
  defaultDraft,
  draftFromMarkdown,
  draftMarkdown,
  filename,
  openProject,
  projectAssets,
  projectPaths,
  validateAsset,
  type EditorDraft,
  type EditorProject,
  type EditorImage,
} from "./editor";

export default function GddGeneratorPage() {
  const [project, setProject] = useState<EditorProject>(() => ({
    draft: defaultDraft(),
    assets: {},
  }));
  const [images, setImages] = useState<Record<string, PdfImage>>({});
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountResetVersion, setAccountResetVersion] = useState(0);
  const [busy, setBusy] = useState<"import" | "images" | "pdf" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const [pendingImport, setPendingImport] = useState<File | "example" | null>(
    null,
  );
  const [importOpen, setImportOpen] = useState(false);
  const [exampleOpen, setExampleOpen] = useState(false);
  const [editorVersion, setEditorVersion] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const status = useRef<HTMLDivElement>(null);
  const operation = useRef(0);

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
    invalidatePdf();
  }

  async function importFile(file: File) {
    const current = ++operation.current;
    setError("");
    setNotice("");
    setBusy("import");
    try {
      if (!/\.zip$/i.test(file.name))
        throw new Error("Select a .zip draft or template archive.");
      if (file.size > LIMITS.archive)
        throw new Error("The ZIP exceeds the 25 MB limit.");
      const imported = openProject(new Uint8Array(await file.arrayBuffer()));
      const prepared = await prepareImages(imported.assets);
      if (operation.current === current) {
        setProject(imported);
        setAccountResetVersion((version) => version + 1);
        setEditorVersion((version) => version + 1);
        setImages(prepared);
        setDirty(false);
        invalidatePdf();
        setNotice("Draft imported.");
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
        : createTemplate();
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
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <PageHeading title="GDD Generator" />
      <Stack spacing={3}>
        <Box sx={{ textAlign: "center" }}>
          <Button
            sx={outlineButtonSx}
            variant="outlined"
            disabled={busy !== null || accountBusy}
            onClick={() => setExampleOpen(true)}
          >
            View Example GDD
          </Button>
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 3,
          }}
        >
          <Box
            sx={{
              ...panelSx,
              p: { xs: 2, sm: 3 },
              minWidth: 0,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                },
                gap: 1.5,
                width: "100%",
                "& .MuiButton-root": { minHeight: 44, height: "100%" },
              }}
            >
              <Tooltip title="Empty sections and subsections are omitted from the PDF.">
                <Box component="span" sx={{ gridColumn: "1 / -1" }}>
                  <Button
                    fullWidth
                    startIcon={<FaFilePdf />}
                    sx={goldButtonSx}
                    variant="contained"
                    disabled={busy !== null || accountBusy}
                    onClick={() => void generate()}
                  >
                    Generate PDF
                  </Button>
                </Box>
              </Tooltip>
              <Tooltip title={!pdfBlob ? "Generate a PDF first." : ""}>
                <span>
                  <Button
                    fullWidth
                    startIcon={<FaDownload />}
                    sx={outlineButtonSx}
                    variant="outlined"
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
              </Tooltip>
              <Tooltip title={!pdfUrl ? "Generate a PDF first." : ""}>
                <span>
                  <Button
                    fullWidth
                    startIcon={<FaArrowUpRightFromSquare />}
                    component="a"
                    href={pdfUrl ?? undefined}
                    disabled={!pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={outlineButtonSx}
                    variant="outlined"
                  >
                    Open PDF
                  </Button>
                </span>
              </Tooltip>
            </Box>
          </Box>
          <Box sx={{ ...panelSx, p: { xs: 2, sm: 3 }, minWidth: 0 }}>
            <Stack spacing={2}>
              <Typography variant="h5" sx={headingSx}>
                Local editing
              </Typography>
              <Typography sx={{ ...bodySx, textAlign: "left" }}>
                Download the template only if you want to edit your GDD locally,
                then upload the completed ZIP here later. Otherwise, use the
                form below.
              </Typography>
              <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
                <Button
                  startIcon={<FaDownload />}
                  sx={outlineButtonSx}
                  variant="outlined"
                  disabled={busy !== null || accountBusy}
                  onClick={() => void downloadTemplate()}
                >
                  Download template
                </Button>
                <Button
                  startIcon={<FaUpload />}
                  sx={outlineButtonSx}
                  variant="outlined"
                  disabled={busy !== null || accountBusy}
                  onClick={() => setImportOpen(true)}
                >
                  Import GDD
                </Button>
              </Stack>
            </Stack>
            <input
              ref={input}
              type="file"
              accept=".zip,application/zip"
              aria-label="Import GDD draft or template ZIP"
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
          </Box>
        </Box>
        <Box ref={status}>
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
        <GddAccountLibrary
          project={project}
          pdf={pdfBlob}
          dirty={dirty}
          disabled={busy !== null}
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
            setPdfBlob(pdf);
            setPdfUrl(URL.createObjectURL(pdf));
          }}
        />
        <GddEditorForm
          key={editorVersion}
          draft={project.draft}
          images={images}
          disabled={busy !== null || accountBusy}
          onChange={changeDraft}
          onUpload={(sectionId, groupId, files) =>
            void uploadImages(sectionId, groupId, files)
          }
        />
      </Stack>
      <GddExampleDialog
        open={exampleOpen}
        disabled={busy !== null || accountBusy}
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
            ZIP the folder contents or their single parent folder. Keep images/
            beside gdd.md.
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
            Choose ZIP
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
            disabled={busy !== null || accountBusy}
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
