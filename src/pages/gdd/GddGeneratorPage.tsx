import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogTitle,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { FaDownload, FaFilePdf, FaUpload } from "react-icons/fa6";
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
import {
  defaultDraft,
  draftMarkdown,
  filename,
  openProject,
  projectAssets,
  projectPaths,
  saveProject,
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
  const [busy, setBusy] = useState<"import" | "images" | "pdf" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const [pendingImport, setPendingImport] = useState<File | null>(null);
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
    setBusy("pdf");
    setError("");
    setNotice("");
    invalidatePdf();
    try {
      const content = parseDocument(draftMarkdown(project.draft));
      projectAssets(project);
      const { generatePdf } = await import("./generatePdf");
      const blob = await generatePdf(content, images);
      if (operation.current === current) {
        setPdfBlob(blob);
        setPdfUrl(URL.createObjectURL(blob));
      }
    } catch (cause) {
      if (operation.current === current)
        setError(
          cause instanceof Error
            ? cause.message
            : "PDF generation failed. Try a smaller document.",
        );
    } finally {
      if (operation.current === current) setBusy(null);
    }
  }

  function downloadZip(template: boolean) {
    setError("");
    setNotice("");
    try {
      const bytes = template ? createTemplate() : saveProject(project);
      downloadBlob(
        template
          ? "gdd-template.zip"
          : `${filename(project.draft.title)} - GDD Draft.zip`,
        new Blob([Uint8Array.from(bytes).buffer], { type: "application/zip" }),
      );
      if (!template) {
        setDirty(false);
        setNotice("Draft ZIP downloaded.");
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The ZIP could not be downloaded.",
      );
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <PageHeading title="GDD Generator" />
      <Stack spacing={3}>
        <Box sx={{ ...panelSx, p: { xs: 2, sm: 3 } }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            useFlexGap
            flexWrap="wrap"
          >
            <Button
              startIcon={<FaDownload />}
              sx={outlineButtonSx}
              variant="outlined"
              disabled={busy !== null}
              onClick={() => downloadZip(false)}
            >
              Save draft ZIP
            </Button>
            <Button
              startIcon={<FaUpload />}
              sx={outlineButtonSx}
              variant="outlined"
              disabled={busy !== null}
              onClick={() => input.current?.click()}
            >
              Import ZIP
            </Button>
            <Button
              startIcon={<FaDownload />}
              sx={outlineButtonSx}
              variant="outlined"
              disabled={busy !== null}
              onClick={() => downloadZip(true)}
            >
              Download template
            </Button>
            <Tooltip title="Empty sections and subsections are omitted from the PDF. Save draft ZIP keeps all form fields.">
              <span>
                <Button
                  startIcon={<FaFilePdf />}
                  sx={goldButtonSx}
                  variant="contained"
                  disabled={busy !== null}
                  onClick={() => void generate()}
                >
                  Generate PDF
                </Button>
              </span>
            </Tooltip>
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
              if (dirty) setPendingImport(file);
              else void importFile(file);
            }}
          />
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
        {pdfUrl && pdfBlob && (
          <Box sx={{ ...panelSx, p: { xs: 2, sm: 3 } }}>
            <Stack
              direction="row"
              spacing={2}
              sx={{ mb: 2 }}
              useFlexGap
              flexWrap="wrap"
            >
              <Button
                startIcon={<FaDownload />}
                sx={goldButtonSx}
                variant="contained"
                onClick={() =>
                  downloadBlob(
                    `${filename(project.draft.title)} - Game Design Document.pdf`,
                    pdfBlob,
                  )
                }
              >
                Download PDF
              </Button>
              <Button
                component="a"
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={outlineButtonSx}
                variant="outlined"
              >
                Open PDF
              </Button>
            </Stack>
            <Box
              component="iframe"
              title="Generated game design document"
              src={pdfUrl}
              sx={{
                width: "100%",
                height: { xs: "65vh", md: "80vh" },
                border: 0,
                backgroundColor: "white",
                borderRadius: 1,
              }}
            />
          </Box>
        )}
        <GddEditorForm
          key={editorVersion}
          draft={project.draft}
          images={images}
          disabled={busy !== null}
          onChange={changeDraft}
          onUpload={(sectionId, groupId, files) =>
            void uploadImages(sectionId, groupId, files)
          }
        />
      </Stack>
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
            onClick={() => {
              if (pendingImport) void importFile(pendingImport);
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
