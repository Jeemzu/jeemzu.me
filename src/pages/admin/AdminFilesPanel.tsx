import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { FONTS } from "../../lib/globals";
import { goldButtonSx } from "../../lib/medievalStyles";
import {
  deleteFile,
  downloadFile,
  listFiles,
  uploadFile,
  type StoredFile,
} from "../../utils/adminFilesApi";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminFilesPanel() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StoredFile | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const result = await listFiles(signal);
      if (!signal?.aborted) setFiles(result);
    } catch (e) {
      if (!signal?.aborted)
        setError(e instanceof Error ? e.message : "Could not load files.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  async function handleUpload(file: File) {
    setBusy("upload");
    setError(null);
    setNotice(null);
    try {
      const stored = await uploadFile(file);
      setFiles((current) => [stored, ...current]);
      setNotice(`Uploaded ${stored.name}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDownload(file: StoredFile) {
    setBusy(file.id);
    setError(null);
    setNotice(null);
    try {
      await downloadFile(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(file: StoredFile) {
    setBusy(file.id);
    setError(null);
    setNotice(null);
    try {
      await deleteFile(file.id);
      setFiles((current) => current.filter((entry) => entry.id !== file.id));
      setPendingDelete(null);
      setNotice(`Deleted ${file.name}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(null);
    }
  }

  const disabled = loading || busy !== null;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Button component="label" variant="contained" disabled={disabled} sx={goldButtonSx}>
          {busy === "upload" ? "Uploading..." : "Upload file"}
          <input
            type="file"
            hidden
            disabled={disabled}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void handleUpload(file);
            }}
          />
        </Button>
        <Button disabled={disabled} onClick={() => void refresh()}>
          Refresh
        </Button>
        {(loading || busy !== null) && <CircularProgress size={20} aria-label="File operation in progress" />}
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}
      <Typography variant="body2" sx={{ fontFamily: FONTS.MEDIEVAL_SERIF, color: "parchment.dark" }}>
        {files.length} file{files.length === 1 ? "" : "s"} / {formatSize(files.reduce((sum, file) => sum + file.sizeBytes, 0))} stored.
        {" "}Database capacity is shared with the rest of the site.
      </Typography>
      {!loading && files.length === 0 && !error && (
        <Typography sx={{ color: "parchment.main" }}>No files uploaded yet.</Typography>
      )}
      <Box sx={{ maxHeight: 450, overflow: "auto" }}>
        {files.map((file) => (
          <Stack
            key={file.id}
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ py: 1.5, borderBottom: "1px solid rgba(200, 162, 74, 0.12)" }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ color: "parchment.main", overflowWrap: "anywhere" }}>{file.name}</Typography>
              <Typography variant="caption" sx={{ color: "parchment.dark" }}>
                {formatSize(file.sizeBytes)} / {new Date(file.createdAt).toLocaleString()}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button size="small" disabled={disabled} onClick={() => void handleDownload(file)} aria-label={`Download ${file.name}`}>
                Download
              </Button>
              <Button size="small" color="error" disabled={disabled} onClick={() => setPendingDelete(file)} aria-label={`Delete ${file.name}`}>
                Delete
              </Button>
            </Stack>
          </Stack>
        ))}
      </Box>
      <Dialog open={pendingDelete !== null} onClose={() => { if (!busy) setPendingDelete(null); }}>
        <DialogTitle>Delete file?</DialogTitle>
        <DialogContent sx={{ overflowWrap: "anywhere" }}>
          Permanently delete {pendingDelete?.name}? This cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button disabled={busy !== null} onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button
            color="error"
            disabled={busy !== null}
            onClick={() => { if (pendingDelete) void handleDelete(pendingDelete); }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
