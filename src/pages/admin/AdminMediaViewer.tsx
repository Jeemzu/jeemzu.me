import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { fetchFileBlob, type StoredFile } from "../../utils/adminFilesApi";
import { getMediaType, type MediaType } from "../../utils/adminMedia";

type PreviewState =
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error"; message: string };

function MediaPreview({ file, media }: { file: StoredFile; media: MediaType }) {
  const [preview, setPreview] = useState<PreviewState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    let url: string | undefined;

    async function load() {
      try {
        const blob = await fetchFileBlob(file.id, controller.signal);
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(new Blob([blob], { type: media.mime }));
        setPreview({ status: "ready", url });
      } catch (e) {
        if (!controller.signal.aborted)
          setPreview({
            status: "error",
            message: e instanceof Error ? e.message : "Could not load preview.",
          });
      }
    }

    void load();
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [file.id, media.mime]);

  if (preview.status === "loading")
    return <CircularProgress size={24} aria-label="Loading media preview" />;
  if (preview.status === "error")
    return <Alert severity="error">{preview.message}</Alert>;

  const onError = () => setPreview({
    status: "error",
    message: "This file could not be displayed. It may be damaged or use a format or codec this browser does not support.",
  });

  return (
    <Box sx={{ textAlign: "center", bgcolor: "rgba(0, 0, 0, 0.3)", p: 1, borderRadius: 1 }}>
      {media.kind === "image" ? (
        <Box
          component="img"
          src={preview.url}
          alt={file.name}
          onError={onError}
          sx={{ display: "block", maxWidth: "100%", maxHeight: "60vh", mx: "auto", objectFit: "contain" }}
        />
      ) : (
        <Box
          component="video"
          src={preview.url}
          controls
          playsInline
          preload="metadata"
          aria-label={file.name}
          onError={onError}
          sx={{ display: "block", width: "100%", maxHeight: "60vh" }}
        />
      )}
    </Box>
  );
}

export default function AdminMediaViewer({ files, loading }: { files: StoredFile[]; loading: boolean }) {
  const [selectedId, setSelectedId] = useState("");
  const viewableFiles = files.filter((file) => getMediaType(file.name) !== null);
  const selectedFile = viewableFiles.find((file) => file.id === selectedId);
  const media = selectedFile ? getMediaType(selectedFile.name) : null;

  return (
    <Stack spacing={2}>
      <TextField
        select
        fullWidth
        label="View image or video"
        value={selectedFile?.id ?? ""}
        disabled={loading || viewableFiles.length === 0}
        onChange={(event) => setSelectedId(event.target.value)}
      >
        <MenuItem value="">
          {viewableFiles.length === 0 ? "No viewable files" : "Select a file"}
        </MenuItem>
        {viewableFiles.map((file) => (
          <MenuItem key={file.id} value={file.id} sx={{ whiteSpace: "normal", overflowWrap: "anywhere" }}>
            {file.name}
          </MenuItem>
        ))}
      </TextField>
      {selectedFile && media && (
        <MediaPreview key={selectedFile.id} file={selectedFile} media={media} />
      )}
    </Stack>
  );
}
