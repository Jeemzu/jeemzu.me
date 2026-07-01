import { Modal, Box, Typography, Stack, IconButton, useTheme, TextField, Button, Alert } from "@mui/material";
import { FaXmark, FaPaperPlane } from "react-icons/fa6";
import { Turnstile } from "@marsidev/react-turnstile";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FONTS, EFFECTS } from "../lib/globals";

interface ContactModalProps {
    open: boolean;
    onClose: () => void;
}

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

interface ContactFormData {
    subject: string;
    message: string;
    senderName: string;
    senderEmail: string;
}

const ContactModal = ({ open, onClose }: ContactModalProps) => {
    const theme = useTheme();
    const [verified, setVerified] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState<string>("");

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ContactFormData>();

    const handleClose = () => {
        setVerified(false);
        setSubmitStatus("idle");
        setErrorMessage("");
        reset();
        onClose();
    };

    const onSubmit = async (data: ContactFormData) => {
        setSubmitStatus("sending");
        setErrorMessage("");

        try {
            const response = await fetch("/.netlify/functions/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subject: data.subject,
                    message: data.message,
                    senderName: data.senderName || undefined,
                    senderEmail: data.senderEmail || undefined,
                }),
            });

            if (response.ok) {
                setSubmitStatus("success");
                reset();
            } else {
                const body = (await response.json()) as { error?: string };
                const msg =
                    response.status === 502
                        ? "Service temporarily unavailable. Please try again later."
                        : (body.error ?? "Something went wrong. Please try again.");
                setErrorMessage(msg);
                setSubmitStatus("error");
            }
        } catch {
            setErrorMessage("Network error. Please check your connection and try again.");
            setSubmitStatus("error");
        }
    };

    const inputSx = {
        "& .MuiOutlinedInput-root": {
            fontFamily: FONTS.NECTO_MONO,
            color: theme.palette.text.primary,
            "& fieldset": { borderColor: `${theme.palette.primaryGreen.main}44` },
            "&:hover fieldset": { borderColor: `${theme.palette.primaryGreen.main}88` },
            "&.Mui-focused fieldset": { borderColor: theme.palette.primaryGreen.main },
        },
        "& .MuiInputLabel-root": {
            fontFamily: FONTS.NECTO_MONO,
            color: theme.palette.textSecondary.main,
            "&.Mui-focused": { color: theme.palette.primaryGreen.main },
        },
        "& .MuiFormHelperText-root": { fontFamily: FONTS.NECTO_MONO },
    };

    return (
        <Modal open={open} onClose={handleClose}>
            <Box
                sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    bgcolor: theme.palette.cardBackground.main,
                    border: `1px solid ${theme.palette.primaryGreen.main}`,
                    borderRadius: 2,
                    p: 4,
                    width: "calc(100vw - 32px)",
                    maxWidth: 480,
                    outline: "none",
                }}
            >
                <IconButton
                    onClick={handleClose}
                    sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        color: theme.palette.textSecondary.main,
                        transition: EFFECTS.TRANSITION,
                        "&:hover": { color: theme.palette.primaryGreen.main },
                    }}
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

                {!verified ? (
                    <Stack alignItems="center" spacing={2}>
                        <Typography
                            fontFamily={FONTS.NECTO_MONO}
                            sx={{
                                color: theme.palette.textSecondary.main,
                                textAlign: "center",
                                fontSize: "0.9rem",
                            }}
                        >
                            Complete the challenge to send a message
                        </Typography>
                        <Turnstile
                            siteKey={TURNSTILE_SITE_KEY}
                            onSuccess={() => setVerified(true)}
                            options={{ theme: "dark" }}
                        />
                    </Stack>
                ) : submitStatus === "success" ? (
                    <Stack spacing={2} alignItems="center">
                        <Alert
                            severity="success"
                            sx={{ width: "100%", fontFamily: FONTS.NECTO_MONO, fontSize: "0.85rem" }}
                        >
                            Message sent! I&apos;ll get back to you soon.
                        </Alert>
                        <Button
                            variant="outlined"
                            onClick={handleClose}
                            sx={{
                                fontFamily: FONTS.NECTO_MONO,
                                borderColor: `${theme.palette.primaryGreen.main}66`,
                                color: theme.palette.primaryGreen.main,
                                "&:hover": {
                                    borderColor: theme.palette.primaryGreen.main,
                                    bgcolor: `${theme.palette.primaryGreen.main}11`,
                                },
                            }}
                        >
                            Close
                        </Button>
                    </Stack>
                ) : (
                    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                        <Stack spacing={2.5}>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                                <TextField
                                    label="Name"
                                    fullWidth
                                    size="small"
                                    sx={inputSx}
                                    {...register("senderName")}
                                />
                                <TextField
                                    label="Email"
                                    fullWidth
                                    size="small"
                                    type="email"
                                    sx={inputSx}
                                    {...register("senderEmail", {
                                        pattern: {
                                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                            message: "Invalid email address",
                                        },
                                    })}
                                    error={!!errors.senderEmail}
                                    helperText={errors.senderEmail?.message}
                                />
                            </Stack>

                            <TextField
                                label="Subject"
                                required
                                fullWidth
                                size="small"
                                sx={inputSx}
                                {...register("subject", { required: "Subject is required" })}
                                error={!!errors.subject}
                                helperText={errors.subject?.message}
                            />

                            <TextField
                                label="Message"
                                required
                                fullWidth
                                multiline
                                minRows={4}
                                sx={inputSx}
                                {...register("message", { required: "Message is required" })}
                                error={!!errors.message}
                                helperText={errors.message?.message}
                            />

                            {submitStatus === "error" && (
                                <Alert
                                    severity="error"
                                    sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: "0.85rem" }}
                                >
                                    {errorMessage}
                                </Alert>
                            )}

                            <Button
                                type="submit"
                                variant="contained"
                                disabled={submitStatus === "sending"}
                                startIcon={<FaPaperPlane size={14} />}
                                sx={{
                                    fontFamily: FONTS.NECTO_MONO,
                                    bgcolor: theme.palette.primaryGreen.main,
                                    color: theme.palette.darkBackground.main,
                                    alignSelf: "flex-end",
                                    px: 3,
                                    transition: EFFECTS.TRANSITION,
                                    "&:hover": { bgcolor: theme.palette.softGreen.main },
                                    "&.Mui-disabled": { opacity: 0.6 },
                                }}
                            >
                                {submitStatus === "sending" ? "Sending…" : "Send"}
                            </Button>
                        </Stack>
                    </Box>
                )}
            </Box>
        </Modal>
    );
};

export default ContactModal;

