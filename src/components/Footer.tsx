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
                    mt: 8,
                    py: 6,
                    px: 2,
                }}
            >
                <Container maxWidth="lg">
                    <Grid container spacing={4}>
                        {/* Left Section - Branding */}
                        <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                            <Typography
                                variant="h5"
                                fontFamily={FONTS.A_ART}
                                sx={{
                                    color: theme.palette.primaryGreen.main,
                                    mb: 1,
                                }}
                            >
                                James Friedenberg
                            </Typography>
                            <Typography
                                variant="body2"
                                fontFamily={FONTS.TRAP_BLACK}
                                sx={{
                                    color: theme.palette.textSecondary.main,
                                    lineHeight: 1.7,
                                }}
                            >
                                Building cool things for Minecraft and beyond
                            </Typography>
                        </Grid>

                        {/* Center Section - Quick Links */}
                        <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: 'center' }}>
                            <Stack spacing={1} sx={{ alignItems: 'center' }}>
                                <Typography
                                    variant="subtitle2"
                                    fontFamily={FONTS.A_ART}
                                    sx={{
                                        color: theme.palette.primaryGreen.main,
                                        mb: 1,
                                    }}
                                >
                                    Connect
                                </Typography>
                                <Stack direction="row" spacing={2}>
                                    <IconButton
                                        onClick={onClickUrl(LINKS.GITHUB)}
                                        sx={{
                                            color: theme.palette.textSecondary.main,
                                            transition: EFFECTS.TRANSITION,
                                            '&:hover': {
                                                color: theme.palette.primaryGreen.main,
                                                transform: 'translateY(-4px)',
                                            }
                                        }}
                                    >
                                        <FaGithub size={24} />
                                    </IconButton>
                                    <IconButton
                                        onClick={onClickUrl(LINKS.LINKEDIN)}
                                        sx={{
                                            color: theme.palette.textSecondary.main,
                                            transition: EFFECTS.TRANSITION,
                                            '&:hover': {
                                                color: theme.palette.primaryGreen.main,
                                                transform: 'translateY(-4px)',
                                            }
                                        }}
                                    >
                                        <FaLinkedin size={24} />
                                    </IconButton>
                                    <IconButton
                                        onClick={onClickUrl(LINKS.EMAIL)}
                                        sx={{
                                            color: theme.palette.textSecondary.main,
                                            transition: EFFECTS.TRANSITION,
                                            '&:hover': {
                                                color: theme.palette.primaryGreen.main,
                                                transform: 'translateY(-4px)',
                                            }
                                        }}
                                    >
                                        <FaEnvelope size={24} />
                                    </IconButton>
                                </Stack>
                            </Stack>
                        </Grid>

                        {/* Right Section - Copyright */}
                        <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: { xs: 'center', md: 'right' } }}>
                            <Typography
                                variant="body2"
                                fontFamily={FONTS.TRAP_BLACK}
                                sx={{
                                    color: theme.palette.textSecondary.main,
                                    mb: 0.5,
                                }}
                            >
                                © 2025 James Friedenberg
                            </Typography>
                            <br />
                            <Typography
                                variant="caption"
                                fontFamily={FONTS.TRAP_BLACK}
                                sx={{
                                    color: theme.palette.textSecondary.main,
                                    opacity: 0.7,
                                }}
                            >
                                Built with React + TypeScript
                            </Typography>
                        </Grid>

                        {/* Bottom Divider */}
                        <Grid size={12}>
                            <Divider sx={{ borderColor: `${theme.palette.primaryGreen.main}22`, mt: 3 }} />
                            <Typography
                                variant="caption"
                                fontFamily={FONTS.TRAP_BLACK}
                                sx={{
                                    color: theme.palette.textSecondary.main,
                                    opacity: 0.6,
                                    textAlign: 'center',
                                    display: 'block',
                                    mt: 2,
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