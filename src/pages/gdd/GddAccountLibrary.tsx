import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogTitle,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useAuthStore } from "../../stores/authStore";
import {
  deleteGdd,
  GDD_ACCOUNT_LIMIT,
  GDD_PDF_LIMIT,
  listGdds,
  loadGddFile,
  saveGdd,
  type GddLibrary,
  type SavedGdd,
} from "../../utils/gddApi";
import {
  bodySx,
  dialogPaperSx,
  headingSx,
  outlineButtonSx,
  panelSx,
} from "../../lib/medievalStyles";
import { downloadBlob } from "../budgetize/lib/download";
import {
  filename,
  openProject,
  saveProject,
  type EditorProject,
} from "./editor";
import { prepareImages, type PdfImage } from "./images";

interface Props {
  project: EditorProject;
  pdf: Blob | null;
  dirty: boolean;
  disabled: boolean;
  resetVersion: number;
  onBusyChange: (busy: boolean) => void;
  onSavedChange: (saved: boolean) => void;
  onLoad: (
    project: EditorProject,
    images: Record<string, PdfImage>,
    pdf: Blob,
  ) => void;
}

function megabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export default function GddAccountLibrary({
  project,
  pdf,
  dirty,
  disabled,
  resetVersion,
  onBusyChange,
  onSavedChange,
  onLoad,
}: Props) {
  const username = useAuthStore((state) =>
    state.isAuthenticated ? state.username : null,
  );
  const [library, setLibrary] = useState<GddLibrary | null>(null);
  const [selected, setSelected] = useState<SavedGdd | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState<{
    document: SavedGdd;
    action: "load" | "delete";
  } | null>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    setSelected(null);
  }, [resetVersion, username]);
  useEffect(() => {
    setLibrary(null);
    setError("");
    setNotice("");
    setConfirmation(null);
    setBusy(false);
    onBusyChange(false);
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    if (username) {
      setBusy(true);
      onBusyChange(true);
      void listGdds(controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) setLibrary(result);
        })
        .catch((cause: unknown) => {
          if (!controller.signal.aborted)
            setError(
              cause instanceof Error
                ? cause.message
                : "Could not load saved GDDs.",
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setBusy(false);
            onBusyChange(false);
          }
        });
    }
    return () => {
      controller.abort();
      request.current?.abort();
    };
  }, [username, onBusyChange]);

  async function perform(
    action: (signal: AbortSignal, active: () => boolean) => Promise<void>,
  ) {
    if (!username) return;
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
    setNotice("");
    try {
      await action(controller.signal, active);
    } catch (cause) {
      if (active())
        setError(
          cause instanceof Error
            ? cause.message
            : "Account storage is unavailable.",
        );
    } finally {
      if (active()) {
        setBusy(false);
        onBusyChange(false);
      }
    }
  }

  function refresh() {
    void perform(async (signal, active) => {
      const result = await listGdds(signal);
      if (active()) setLibrary(result);
    });
  }

  function save(asNew: boolean) {
    if (!pdf) return;
    void perform(async (signal, active) => {
      if (pdf.size > GDD_PDF_LIMIT)
        throw new Error("Account saves support PDFs up to 20 MB.");
      const draft = saveProject(project);
      const existing = asNew ? null : selected;
      const replaced = existing
        ? library?.documents.find((entry) => entry.id === existing.id)
        : null;
      const usage =
        (library?.usedBytes ?? 0) -
        (replaced ? replaced.pdfBytes + replaced.draftBytes : 0) +
        pdf.size +
        draft.length;
      if (usage > GDD_ACCOUNT_LIMIT)
        throw new Error(
          "This save exceeds your 100 MB storage limit. Delete a saved document or reduce its images.",
        );
      const result = await saveGdd(
        project.draft.title,
        pdf,
        draft,
        existing,
        signal,
      );
      if (!active()) return;
      setSelected(result);
      onSavedChange(true);
      setNotice("PDF and editable draft saved to your account.");
      // A committed save stays successful even if the subsequent library refresh fails.
      try {
        const updated = await listGdds(signal);
        if (active()) setLibrary(updated);
      } catch (cause) {
        if (active())
          setError(
            cause instanceof Error
              ? cause.message
              : "Saved, but the library could not be refreshed.",
          );
      }
    });
  }

  function load(document: SavedGdd) {
    void perform(async (signal, active) => {
      const [pdfBlob, draftBlob] = await Promise.all([
        loadGddFile(document, "pdf", signal),
        loadGddFile(document, "draft", signal),
      ]);
      const imported = openProject(
        new Uint8Array(await draftBlob.arrayBuffer()),
      );
      const prepared = await prepareImages(imported.assets);
      if (active()) {
        onLoad(imported, prepared, pdfBlob);
        setSelected(document);
        setNotice("PDF and editable draft loaded.");
      }
    });
  }

  function remove(document: SavedGdd) {
    void perform(async (signal, active) => {
      await deleteGdd(document, signal);
      if (!active()) return;
      if (selected?.id === document.id) {
        setSelected(null);
        onSavedChange(false);
      }
      setNotice("Saved document deleted.");
      const updated = await listGdds(signal);
      if (active()) setLibrary(updated);
    });
  }

  if (!username) return null;
  const locked = disabled || busy;
  return (
    <Box sx={{ ...panelSx, p: { xs: 2, sm: 3 } }}>
      <Stack spacing={2}>
        <Typography variant="h5" sx={headingSx}>
          My GDDs
        </Typography>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Button
            variant="outlined"
            sx={outlineButtonSx}
            disabled={locked || !pdf || !library}
            onClick={() => save(false)}
          >
            {selected ? "Update saved GDD" : "Save to account"}
          </Button>
          {selected && (
            <Button
              variant="outlined"
              sx={outlineButtonSx}
              disabled={locked || !pdf || !library}
              onClick={() => save(true)}
            >
              Save as new
            </Button>
          )}
          <Button
            variant="outlined"
            sx={outlineButtonSx}
            disabled={locked}
            onClick={refresh}
          >
            Refresh library
          </Button>
        </Stack>
        {library && (
          <>
            <Typography sx={bodySx}>
              {megabytes(library.usedBytes)} / 100 MB
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(
                100,
                (library.usedBytes / library.limitBytes) * 100,
              )}
              aria-label="Account GDD storage usage"
            />
            {!library.documents.length && (
              <Typography sx={bodySx}>No saved GDDs</Typography>
            )}
          </>
        )}
        {busy && (
          <LinearProgress aria-label="Account storage request in progress" />
        )}
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
        {!!library?.documents.length && (
          <TableContainer
            tabIndex={0}
            role="region"
            aria-label="Saved GDD documents"
            sx={{
              border: "1px solid rgba(200,162,74,0.25)",
              borderRadius: 1,
              backgroundColor: "rgba(0,0,0,0.22)",
              "& .MuiTableCell-root": {
                color: "parchment.main",
                borderColor: "rgba(200,162,74,0.15)",
                textAlign: "left",
                fontFamily: "inherit",
              },
              "& .MuiTableCell-head": {
                color: "gold.main",
                backgroundColor: "rgba(200,162,74,0.09)",
                fontWeight: 700,
              },
            }}
          >
            <Table size="small" aria-label="Saved GDDs" sx={{ minWidth: 680 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Document</TableCell>
                  <TableCell>Saved</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {library.documents.map((document) => (
                  <TableRow
                    key={document.id}
                    selected={selected?.id === document.id}
                    sx={{
                      "&:nth-of-type(even)": {
                        backgroundColor: "rgba(255,255,255,0.025)",
                      },
                      "&.Mui-selected, &.Mui-selected:hover": {
                        backgroundColor: "rgba(200,162,74,0.08)",
                      },
                    }}
                  >
                    <TableCell
                      component="th"
                      scope="row"
                      sx={{
                        minWidth: 160,
                        maxWidth: 260,
                        overflowWrap: "anywhere",
                      }}
                    >
                      <Stack spacing={0.5} alignItems="flex-start">
                        <Box component="span" sx={{ fontWeight: 600 }}>
                          {document.title}
                        </Box>
                        {selected?.id === document.id && (
                          <Chip
                            label="Current"
                            size="small"
                            variant="outlined"
                            sx={{
                              color: "gold.main",
                              borderColor: "rgba(200,162,74,0.35)",
                              height: 22,
                            }}
                          />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell
                      sx={{
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {new Date(document.updatedAt).toLocaleString()}
                    </TableCell>
                    <TableCell
                      sx={{
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {megabytes(document.pdfBytes + document.draftBytes)} MB
                    </TableCell>
                    <TableCell>
                      <Stack
                        direction="row"
                        spacing={0.5}
                        useFlexGap
                        sx={{
                          "& .MuiButton-root": {
                            whiteSpace: "nowrap",
                            minWidth: "auto",
                            px: 1,
                            fontSize: "0.75rem",
                          },
                        }}
                      >
                        <Button
                          size="small"
                          disabled={locked}
                          onClick={() => {
                            if (dirty)
                              setConfirmation({ document, action: "load" });
                            else load(document);
                          }}
                        >
                          Load
                        </Button>
                        <Button
                          size="small"
                          disabled={locked}
                          onClick={() =>
                            void perform(async (signal, active) => {
                              const blob = await loadGddFile(
                                document,
                                "pdf",
                                signal,
                              );
                              if (active())
                                downloadBlob(
                                  `${filename(document.title)} - Game Design Document.pdf`,
                                  blob,
                                );
                            })
                          }
                        >
                          Download PDF
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          disabled={locked}
                          onClick={() =>
                            setConfirmation({ document, action: "delete" })
                          }
                        >
                          Delete
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
      <Dialog
        open={confirmation !== null}
        onClose={() => setConfirmation(null)}
        slotProps={{ paper: { sx: dialogPaperSx } }}
      >
        <DialogTitle sx={headingSx}>
          {confirmation?.action === "delete"
            ? `Delete ${confirmation.document.title}?`
            : "Replace unsaved draft?"}
        </DialogTitle>
        <DialogActions>
          <Button sx={outlineButtonSx} onClick={() => setConfirmation(null)}>
            Cancel
          </Button>
          <Button
            color="error"
            onClick={() => {
              if (confirmation?.action === "delete")
                remove(confirmation.document);
              else if (confirmation) load(confirmation.document);
              setConfirmation(null);
            }}
          >
            {confirmation?.action === "delete" ? "Delete" : "Load"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
