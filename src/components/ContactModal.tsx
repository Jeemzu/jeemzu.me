import { Modal, Box, Typography, Stack, IconButton, useTheme, TextField, Button, CircularProgress } from "@mui/material";
import { FaXmark, FaPaperPlane } from "react-icons/fa6";
import { useState } from "react";
import { FONTS, EFFECTS } from "../lib/globals";
import { sendContactEmail } from "../utils/contactApi";

interface ContactModalProps {
    open: boolean;
    onClose: () => void;
}

const ContactModal = ({ open, onClose }: ContactModalProps) => {
    const theme = useTheme();
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);

    const handleClose = () => {
        setSubject('');
        setContent('');
        setSending(false);
        setSent(false);
        setSendError(null);
        onClose();
    };

    const handleSubmit = async () => {
        if (!subject.trim() || !content.trim()) return;
        setSending(true);
        setSendError(null);
        const result = await sendContactEmail({ subject: subject.trim(), content: content.trim() });
        setSending(false);
        if (result.success) {
            setSent(true);
            setSubject('');
            setContent('');
        } else {
            setSendError(result.error ?? 'Something went wrong.');
        }
    };

    return (
        <Modal open={open} onClose={handleClose}>
            <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                bgcolor: theme.palette.cardBackground.main,
                border: `1px solid ${theme.palette.primaryGreen.main}`,
                borderRadius: 2,
                p: 4,
                minWidth: 320,
                maxWidth: 440,
                outline: 'none',
            }}>
                <IconButton
                    onClick={handleClose}
                    sx={{ position: 'absolute', top: 8, right: 8, color: theme.palette.textSecondary.main }}
                >
                    <FaXmark />
                </IconButton>

                <Typography
                    variant="h5"
                    fontFamily={FONTS.NECTO_MONO}
                    sx={{ color: theme.palette.primaryGreen.main, mb: 3 }}
                >
                    Contact Me
                </Typography>

                {sent ? (
                    <Typography
                        fontFamily={FONTS.NECTO_MONO}
                        sx={{ color: theme.palette.primaryGreen.main, fontSize: '0.9rem', textAlign: 'center' }}
                    >
                        Message sent!
                    </Typography>
                ) : (
                    <Stack spacing={1.5}>
                        <TextField
                            label="Subject"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            inputProps={{ maxLength: 200 }}
                            size="small"
                            fullWidth
                            disabled={sending}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    fontFamily: FONTS.NECTO_MONO,
                                    '& fieldset': { borderColor: theme.palette.divider },
                                    '&:hover fieldset': { borderColor: theme.palette.primaryGreen.main },
                                    '&.Mui-focused fieldset': { borderColor: theme.palette.primaryGreen.main },
                                },
                                '& .MuiInputLabel-root': { fontFamily: FONTS.NECTO_MONO },
                                '& .MuiInputLabel-root.Mui-focused': { color: theme.palette.primaryGreen.main },
                            }}
                        />
                        <TextField
                            label="Message"
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            inputProps={{ maxLength: 5000 }}
                            multiline
                            minRows={3}
                            maxRows={8}
                            size="small"
                            fullWidth
                            disabled={sending}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    fontFamily: FONTS.NECTO_MONO,
                                    '& fieldset': { borderColor: theme.palette.divider },
                                    '&:hover fieldset': { borderColor: theme.palette.primaryGreen.main },
                                    '&.Mui-focused fieldset': { borderColor: theme.palette.primaryGreen.main },
                                },
                                '& .MuiInputLabel-root': { fontFamily: FONTS.NECTO_MONO },
                                '& .MuiInputLabel-root.Mui-focused': { color: theme.palette.primaryGreen.main },
                            }}
                        />
                        {sendError && (
                            <Typography
                                fontFamily={FONTS.NECTO_MONO}
                                sx={{ color: theme.palette.error.main, fontSize: '0.8rem' }}
                            >
                                {sendError}
                            </Typography>
                        )}
                        <Button
                            variant="outlined"
                            onClick={handleSubmit}
                            disabled={sending || !subject.trim() || !content.trim()}
                            startIcon={sending ? <CircularProgress size={14} color="inherit" /> : <FaPaperPlane size={14} />}
                            sx={{
                                fontFamily: FONTS.NECTO_MONO,
                                borderColor: theme.palette.primaryGreen.main,
                                color: theme.palette.primaryGreen.main,
                                transition: EFFECTS.TRANSITION,
                                '&:hover': { borderColor: theme.palette.softGreen.main, color: theme.palette.softGreen.main },
                                '&:disabled': { opacity: 0.5 },
                                alignSelf: 'flex-end',
                            }}
                        >
                            {sending ? 'Sending...' : 'Send'}
                        </Button>
                    </Stack>
                )}
            </Box>
        </Modal>
    );
};

export default ContactModal;
