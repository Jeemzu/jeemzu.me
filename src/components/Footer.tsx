import { Container, Grid, Typography, useTheme, Box, IconButton, Divider, Stack } from "@mui/material"
import React from "react"
import { EFFECTS, FONTS, LINKS } from "../lib/globals"
import { FaGithub, FaLinkedin, FaEnvelope } from "react-icons/fa6"
import { onClickUrl } from "../utils/openInNewTab"

const Footer = () => {
    const theme = useTheme();

    return (
        <React.Fragment>
            <Box
                sx={{
                    borderTop: `1px solid ${theme.palette.primaryGreen.main}33`,
                    mt: 4,
                    py: 3,
                    px: 2,
                }}
            >
                <Container maxWidth="lg">
                    <Grid container spacing={2}>
                        {/* Left Section - Branding */}
                        <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                            <Typography
                                variant="h5"
                                fontFamily={FONTS.ANTON}
                                sx={{
                                    color: theme.palette.primaryGreen.main,
                                    mb: 0.5,
                                }}
                            >
                                James Friedenberg
                            </Typography>
                            <Typography
                                variant="caption"
                                fontFamily={FONTS.NECTO_MONO}
                                sx={{
                                    color: theme.palette.textSecondary.main,
                                    lineHeight: 1.5,
                                }}
                            >
                                Building cool things for Minecraft and beyond
                            </Typography>
                        </Grid>

                        {/* Center Section - Quick Links */}
                        <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: 'center' }}>
                            <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
                                <Typography
                                    variant="body2"
                                    fontFamily={FONTS.ANTON}
                                    sx={{
                                        color: theme.palette.primaryGreen.main,
                                        mb: 0.5,
                                    }}
                                >
                                    Connect
                                </Typography>
                                <Stack direction="row" spacing={1.5}>
                                    <IconButton
                                        size="small"
                                        onClick={onClickUrl(LINKS.GITHUB)}
                                        sx={{
                                            color: theme.palette.textSecondary.main,
                                            transition: EFFECTS.TRANSITION,
                                            '&:hover': {
                                                color: theme.palette.primaryGreen.main,
                                                transform: 'translateY(-2px)',
                                            }
                                        }}
                                    >
                                        <FaGithub size={20} />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={onClickUrl(LINKS.LINKEDIN)}
                                        sx={{
                                            color: theme.palette.textSecondary.main,
                                            transition: EFFECTS.TRANSITION,
                                            '&:hover': {
                                                color: theme.palette.primaryGreen.main,
                                                transform: 'translateY(-2px)',
                                            }
                                        }}
                                    >
                                        <FaLinkedin size={20} />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={onClickUrl(LINKS.EMAIL)}
                                        sx={{
                                            color: theme.palette.textSecondary.main,
                                            transition: EFFECTS.TRANSITION,
                                            '&:hover': {
                                                color: theme.palette.primaryGreen.main,
                                                transform: 'translateY(-2px)',
                                            }
                                        }}
                                    >
                                        <FaEnvelope size={20} />
                                    </IconButton>
                                </Stack>
                            </Stack>
                        </Grid>

                        {/* Right Section - Copyright */}
                        <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: { xs: 'center', md: 'right' } }}>
                            <Typography
                                variant="caption"
                                fontFamily={FONTS.NECTO_MONO}
                                sx={{
                                    color: theme.palette.textSecondary.main,
                                    display: 'block',
                                    mb: 0.25,
                                }}
                            >
                                © 2025 James Friedenberg
                            </Typography>
                            <Typography
                                variant="caption"
                                fontFamily={FONTS.NECTO_MONO}
                                sx={{
                                    color: theme.palette.textSecondary.main,
                                    opacity: 0.7,
                                    fontSize: '0.7rem',
                                }}
                            >
                                Built with React + TypeScript
                            </Typography>
                        </Grid>

                        {/* Bottom Divider */}
                        <Grid size={12}>
                            <Divider sx={{ borderColor: `${theme.palette.primaryGreen.main}22`, mt: 1.5 }} />
                            <Typography
                                variant="caption"
                                fontFamily={FONTS.NECTO_MONO}
                                sx={{
                                    color: theme.palette.textSecondary.main,
                                    opacity: 0.6,
                                    textAlign: 'center',
                                    display: 'block',
                                    mt: 1,
                                    fontSize: '0.7rem',
                                }}
                            >
                                Made with ☕ and 💚
                            </Typography>
                        </Grid>
                    </Grid>
                </Container>
            </Box>
        </React.Fragment>
    )
}

export default Footer;
