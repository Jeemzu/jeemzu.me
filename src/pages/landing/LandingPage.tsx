import { Typography, Stack, Button, useTheme, useMediaQuery, Container, Box, Modal } from "@mui/material";
import { FaDice, FaEnvelope, FaFile, FaCode, FaRoad } from "react-icons/fa6";
import { onClickUrl } from "../../utils/openInNewTab";
import { EFFECTS, FONTS, LINKS } from "../../lib/globals";
import { Link } from "wouter";
import AboutMe from "./AboutMe";
import { useState, useRef } from "react";

const LandingPage = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery('(max-width:900px)');
    const isWideScreen = useMediaQuery('(min-width:1400px)');
    const [openImage, setOpenImage] = useState<string | null>(null);
    const heroRef = useRef<HTMLDivElement>(null);

    return (
        <Container maxWidth="xl" sx={{ position: 'relative', py: { xs: 3, md: 4 } }}>
            {/* Name - Centered above everything */}
            <Typography
                fontFamily={FONTS.POIRET_ONE}
                variant={isMobile ? "h3" : "h1"}
                sx={{
                    textAlign: 'center',
                    mb: { xs: 2, md: 3 },
                    color: theme.palette.primaryGreen.main,
                }}
            >
                James Friedenberg
            </Typography>

            {/* Hero Section - Two-column layout */}
            <Box ref={heroRef} sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: { xs: 1, md: 3 } }}>
                <Box sx={{ flex: isMobile ? 'none' : '3 1 0', minWidth: 0, display: 'flex', justifyContent: isMobile ? 'center' : 'flex-start', order: isMobile ? 1 : 2, width: isMobile ? '100%' : 'auto' }}>
                    <Box sx={{
                        backgroundColor: theme.palette.cardBackground.main,
                        borderRadius: 2,
                        p: { xs: 3, md: 3 },
                        pb: { xs: 1.5, md: 1.5 },
                        boxShadow: EFFECTS.CARD_SHADOW,
                        height: "200px",
                        width: '100%',
                    }}>
                        <Typography
                            fontFamily={FONTS.NECTO_MONO}
                            variant={isMobile ? "h6" : "h4"}
                            sx={{
                                mb: { xs: 1.5, md: 2 },
                                color: theme.palette.text.primary,
                                fontWeight: 500,
                                textAlign: 'left',
                            }}
                        >
                            Software Engineer at Mojang Studios
                        </Typography>

                        <Typography
                            fontFamily={FONTS.NECTO_MONO}
                            variant={isMobile ? "body1" : "h6"}
                            sx={{
                                mb: { xs: 1.5, md: 2 },
                                color: theme.palette.textSecondary.main,
                                fontSize: { xs: '1rem', md: '1.125rem' },
                                textAlign: 'left',
                            }}
                        >
                            Developing cool new features for Minecraft.
                            Passionate about clean code, collaboration, gaming, and woodworking.
                        </Typography>

                        {/* CTA Buttons */}
                        <Stack
                            direction="row"
                            sx={{
                                justifyContent: 'flex-start',
                                alignItems: 'center',
                                flexWrap: 'nowrap',
                                gap: 1.5,
                            }}
                            paddingTop={1.5}
                        >
                            <Link href="/projects">
                                <Button
                                    variant="contained"
                                    size="medium"
                                    startIcon={<FaCode />}
                                    sx={{
                                        backgroundColor: theme.palette.primaryGreen.main,
                                        color: theme.palette.background.default,
                                        fontFamily: FONTS.NECTO_MONO,
                                        px: 3,
                                        py: 1,
                                        fontSize: '1rem',
                                        whiteSpace: 'nowrap',
                                        transition: EFFECTS.TRANSITION,
                                        '&:hover': {
                                            backgroundColor: theme.palette.softGreen.main,
                                            transform: EFFECTS.HOVER_SCALE,
                                            boxShadow: EFFECTS.CARD_SHADOW_HOVER,
                                        }
                                    }}
                                >
                                    Projects
                                </Button>
                            </Link>

                            <Link href="/experience">
                                <Button
                                    variant="contained"
                                    size="medium"
                                    startIcon={<FaRoad />}
                                    sx={{
                                        backgroundColor: theme.palette.primaryGreen.main,
                                        color: theme.palette.background.default,
                                        fontFamily: FONTS.NECTO_MONO,
                                        px: 3,
                                        py: 1,
                                        fontSize: '1rem',
                                        whiteSpace: 'nowrap',
                                        transition: EFFECTS.TRANSITION,
                                        '&:hover': {
                                            backgroundColor: theme.palette.softGreen.main,
                                            transform: EFFECTS.HOVER_SCALE,
                                            boxShadow: EFFECTS.CARD_SHADOW_HOVER,
                                        }
                                    }}
                                >
                                    Experience
                                </Button>
                            </Link>

                            <Link href="/games">
                                <Button
                                    variant="contained"
                                    size="medium"
                                    startIcon={<FaDice />}
                                    sx={{
                                        backgroundColor: theme.palette.primaryGreen.main,
                                        color: theme.palette.background.default,
                                        fontFamily: FONTS.NECTO_MONO,
                                        px: 3,
                                        py: 1,
                                        fontSize: '1rem',
                                        whiteSpace: 'nowrap',
                                        transition: EFFECTS.TRANSITION,
                                        '&:hover': {
                                            backgroundColor: theme.palette.softGreen.main,
                                            transform: EFFECTS.HOVER_SCALE,
                                            boxShadow: EFFECTS.CARD_SHADOW_HOVER,
                                        }
                                    }}
                                >
                                    Games
                                </Button>
                            </Link>

                            <Button
                                variant="contained"
                                size="medium"
                                startIcon={<FaEnvelope />}
                                onClick={onClickUrl(LINKS.EMAIL)}
                                sx={{
                                    backgroundColor: theme.palette.primaryGreen.main,
                                    color: theme.palette.background.default,
                                    fontFamily: FONTS.NECTO_MONO,
                                    px: 3,
                                    py: 1,
                                    fontSize: '1rem',
                                    whiteSpace: 'nowrap',
                                    transition: EFFECTS.TRANSITION,
                                    '&:hover': {
                                        backgroundColor: theme.palette.softGreen.main,
                                        transform: EFFECTS.HOVER_SCALE,
                                        boxShadow: EFFECTS.CARD_SHADOW_HOVER,
                                    }
                                }}
                            >
                                Email
                            </Button>

                            <Button
                                variant="contained"
                                size="medium"
                                startIcon={<FaFile />}
                                onClick={onClickUrl(LINKS.RESUME)}
                                sx={{
                                    backgroundColor: theme.palette.primaryGreen.main,
                                    color: theme.palette.background.default,
                                    fontFamily: FONTS.NECTO_MONO,
                                    px: 3,
                                    py: 1,
                                    fontSize: '1rem',
                                    whiteSpace: 'nowrap',
                                    transition: EFFECTS.TRANSITION,
                                    '&:hover': {
                                        backgroundColor: theme.palette.softGreen.main,
                                        transform: EFFECTS.HOVER_SCALE,
                                        boxShadow: EFFECTS.CARD_SHADOW_HOVER,
                                    }
                                }}
                            >
                                Resume
                            </Button>


                        </Stack>
                    </Box>
                </Box>
            </Box>

            {/* About Me Section - Pass hideImages prop on wide screens */}
            <Box sx={{ mt: { xs: 3, md: 4 } }}>
                <AboutMe hideImages={isWideScreen} />
            </Box>

            {/* Image Modal */}
            <Modal
                open={openImage !== null}
                onClose={() => setOpenImage(null)}
                slotProps={{
                    backdrop: {
                        sx: {
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        }
                    }
                }}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                }}
                onClick={() => setOpenImage(null)}
            >
                <Box
                    sx={{
                        outline: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '60vw',
                        height: '60vh',
                    }}
                >
                    {openImage && (
                        <img
                            src={openImage}
                            alt="Enlarged view"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                width: 'auto',
                                height: 'auto',
                                objectFit: 'contain',
                                borderRadius: '8px',
                                boxShadow: '0 8px 40px rgba(0, 0, 0, 0.8)',
                            }}
                        />
                    )}
                </Box>
            </Modal>
        </Container>
    );
};

export default LandingPage;
