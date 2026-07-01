import { Modal, Box, Typography, Stack, IconButton, useTheme, Tooltip } from "@mui/material";
import { FaXmark, FaEnvelope, FaPhone, FaCopy } from "react-icons/fa6";
import { Turnstile } from "@marsidev/react-turnstile";
import { useState } from "react";
import { FONTS, EFFECTS } from "../lib/globals";

interface ContactModalProps {
    open: boolean;
    onClose: () => void;
}

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

const ContactRow = ({ icon, value }: { icon: React.ReactNode; value: string }) => {
    const theme = useTheme();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ color: theme.palette.primaryGreen.main, display: 'flex' }}>{icon}</Box>
            <Typography
                fontFamily={FONTS.NECTO_MONO}
                sx={{ color: theme.palette.text.primary, flex: 1, userSelect: 'text' }}
            >
                {value}
            </Typography>
            <Tooltip title={copied ? "Copied!" : "Copy"} placement="top">
                <IconButton size="small" onClick={handleCopy} sx={{ color: theme.palette.textSecondary.main, transition: EFFECTS.TRANSITION, '&:hover': { color: theme.palette.primaryGreen.main } }}>
                    <FaCopy size={14} />
                </IconButton>
            </Tooltip>
        </Stack>
    );
};

const ContactModal = ({ open, onClose }: ContactModalProps) => {
    const theme = useTheme();
    const [verified, setVerified] = useState(false);

    const handleClose = () => {
        setVerified(false);
        onClose();
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
                    Contact Info
                </Typography>

                {!verified ? (
                    <Stack alignItems="center" spacing={2}>
                        <Typography
                            fontFamily={FONTS.NECTO_MONO}
                            sx={{ color: theme.palette.textSecondary.main, textAlign: 'center', fontSize: '0.9rem' }}
                        >
                            Complete the challenge to view contact details
                        </Typography>
                        <Turnstile
                            siteKey={TURNSTILE_SITE_KEY}
                            onSuccess={() => setVerified(true)}
                            options={{ theme: 'dark' }}
                        />
                    </Stack>
                ) : (
                    <Stack spacing={2.5}>
                        <ContactRow icon={<FaEnvelope size={18} />} value="jamesfriedenberg@gmail.com" />
                        <ContactRow icon={<FaPhone size={18} />} value="(425) 299-3262" />
                    </Stack>
                )}
            </Box>
        </Modal>
    );
};

export default ContactModal;
