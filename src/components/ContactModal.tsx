import {
  Modal,
  Box,
  Typography,
  Stack,
  IconButton,
  useTheme,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";
import { FaXmark, FaPaperPlane } from "react-icons/fa6";
import { useState } from "react";
import { FONTS } from "../lib/globals";
import {
  dialogPaperSx,
  fieldSx,
  headingSx,
  outlineButtonSx,
} from "../lib/medievalStyles";
import { sendContactEmail } from "../utils/contactApi";

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
}

const ContactModal = ({ open, onClose }: ContactModalProps) => {
  const theme = useTheme();
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const handleClose = () => {
    setSubject("");
    setContent("");
    setSending(false);
    setSent(false);
    setSendError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !content.trim()) return;
    setSending(true);
    setSendError(null);
    const result = await sendContactEmail({
      subject: subject.trim(),
      content: content.trim(),
    });
    setSending(false);
    if (result.success) {
      setSent(true);
      setSubject("");
      setContent("");
    } else {
      setSendError(result.error ?? "Something went wrong.");
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          ...dialogPaperSx,
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          p: 4,
          width: "calc(100% - 32px)",
          maxWidth: 440,
          maxHeight: "90vh",
          overflowY: "auto",
          outline: "none",
        }}
      >
        <IconButton
          onClick={handleClose}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            color: theme.palette.parchment.dark,
          }}
        >
          <FaXmark />
        </IconButton>

        <Typography variant="h5" sx={{ ...headingSx, mb: 3 }}>
          Contact Me
        </Typography>

        {sent ? (
          <Typography
            fontFamily={FONTS.MEDIEVAL_SERIF}
            sx={{
              color: theme.palette.medievalGold.light,
              fontSize: "0.95rem",
              textAlign: "center",
            }}
          >
            Message sent!
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            <TextField
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              inputProps={{ maxLength: 200 }}
              size="small"
              fullWidth
              disabled={sending}
              sx={fieldSx}
            />
            <TextField
              label="Message"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              inputProps={{ maxLength: 5000 }}
              multiline
              minRows={3}
              maxRows={8}
              size="small"
              fullWidth
              disabled={sending}
              sx={fieldSx}
            />
            {sendError && (
              <Typography
                fontFamily={FONTS.MEDIEVAL_SERIF}
                sx={{ color: theme.palette.error.main, fontSize: "0.8rem" }}
              >
                {sendError}
              </Typography>
            )}
            <Button
              variant="outlined"
              onClick={handleSubmit}
              disabled={sending || !subject.trim() || !content.trim()}
              startIcon={
                sending ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <FaPaperPlane size={14} />
                )
              }
              sx={{
                ...outlineButtonSx,
                "&:disabled": { opacity: 0.5 },
                alignSelf: "flex-end",
              }}
            >
              {sending ? "Sending..." : "Send"}
            </Button>
          </Stack>
        )}
      </Box>
    </Modal>
  );
};

export default ContactModal;
