import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { marked, Renderer } from "marked";
import {
  bodySx,
  dialogPaperSx,
  goldButtonSx,
  headingSx,
  outlineButtonSx,
} from "../../lib/medievalStyles";
import { EXAMPLE_IMAGE_URLS, EXAMPLE_MARKDOWN } from "./example";

// Only the bundled, authored example is rendered as HTML, never editor input.
const renderer = new Renderer();
renderer.image = (token) => {
  const url = EXAMPLE_IMAGE_URLS[token.href];
  if (!url) throw new Error(`Missing bundled example image: ${token.href}.`);
  const image = Renderer.prototype.image.call(renderer, {
    ...token,
    href: url,
  });
  const caption = token.text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<span class="gdd-example-figure">${image}<span class="gdd-example-caption">${caption}</span></span>`;
};
const exampleHtml = marked.parse(EXAMPLE_MARKDOWN, { async: false, renderer });

interface Props {
  open: boolean;
  disabled: boolean;
  onClose: () => void;
  onPopulate: () => void;
  onDownload: () => void;
}

export default function GddExampleDialog({
  open,
  disabled,
  onClose,
  onPopulate,
  onDownload,
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="gdd-example-title"
      fullWidth
      maxWidth="md"
      scroll="paper"
      slotProps={{ paper: { sx: dialogPaperSx } }}
    >
      <DialogTitle id="gdd-example-title" sx={headingSx}>
        Example GDD: Dino Rush
      </DialogTitle>
      <DialogContent dividers>
        <Box
          component="article"
          sx={{
            ...bodySx,
            textAlign: "left",
            overflowWrap: "anywhere",
            "& h1, & h2, & h3": headingSx,
            "& h1": { fontSize: "2rem" },
            "& h2": { mt: 4, fontSize: "1.5rem" },
            "& h3": { mt: 3, fontSize: "1.15rem" },
            "& table": { width: "100%", borderCollapse: "collapse" },
            "& th, & td": {
              border: "1px solid rgba(200,162,74,0.3)",
              p: { xs: 0.75, sm: 1.5 },
              verticalAlign: "top",
            },
            "& th": { backgroundColor: "rgba(200,162,74,0.1)" },
            "& li": { mb: 1 },
            "& img": {
              display: "block",
              maxWidth: "100%",
              maxHeight: 420,
              height: "auto",
              mx: "auto",
              my: 2,
              objectFit: "contain",
            },
            "& .gdd-example-caption": {
              display: "block",
              fontSize: "0.85rem",
              mb: 3,
            },
          }}
          dangerouslySetInnerHTML={{ __html: exampleHtml }}
        />
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button sx={outlineButtonSx} onClick={onClose}>
          Close
        </Button>
        <Button sx={outlineButtonSx} onClick={onDownload} disabled={disabled}>
          Download example ZIP
        </Button>
        <Button sx={goldButtonSx} onClick={onPopulate} disabled={disabled}>
          Populate form
        </Button>
      </DialogActions>
    </Dialog>
  );
}
