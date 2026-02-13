import { Grid, Typography, Stack, Button, useTheme, useMediaQuery, Container, Box, Modal, IconButton } from "@mui/material";
import { FaEnvelope, FaFile, FaGamepad, FaPaw } from "react-icons/fa6";
import { onClickUrl } from "../../utils/openInNewTab";
import { EFFECTS, FONTS, LINKS } from "../../lib/globals";
import { Link } from "wouter";
import AboutMe from "./AboutMe";
import meAndCourtneyImg from '../../assets/images/meandcourtney.png';
import beansImg from '../../assets/images/beans.png';
import { useState, useRef } from "react";

const LandingPage = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery('(max-width:900px)');
    const isWideScreen = useMediaQuery('(min-width:1400px)');
    const [openImage, setOpenImage] = useState<string | null>(null);
    const heroRef = useRef<HTMLDivElement>(null);

    return (
        <Container maxWidth="xl" sx={{ position: 'relative' }}>
            <Grid container spacing={3} sx={{ minHeight: '75vh', alignItems: 'center', py: { xs: 4, md: 6 }, position: 'relative' }}>
                {/* Hero Section */}
                <Grid size={12}>
                    {/* Name - Centered above everything */}
                    <Typography
                        fontFamily={FONTS.ANTON}
                        variant={isMobile ? "h3" : "h1"}
                        sx={{
                            textAlign: 'center',
                            mb: { xs: 3, md: 5 },
                            color: theme.palette.primaryGreen.main,
                        }}
                    >
                        James Friedenberg
                    </Typography>

                    {/* Two-column layout */}
                    <Box ref={heroRef} sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: { xs: 1, md: 2 } }}>
                        {/* Left side - Image */}
                        <Box
                            sx={{
                                flex: isMobile ? 'none' : '0 0 40%',
                                display: 'flex',
                                justifyContent: isMobile ? 'center' : 'flex-start',
                                order: isMobile ? 2 : 1,
                            }}
                        >
                            <Box
                                onClick={() => setOpenImage(meAndCourtneyImg)}
                                sx={{
                                    width: "100%",
                                    height: "280px",
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    boxShadow: EFFECTS.CARD_SHADOW,
                                    transition: EFFECTS.TRANSITION,
                                    cursor: 'pointer',
                                    '&:hover': {
                                        transform: 'scale(1.01)',
                                        boxShadow: EFFECTS.CARD_SHADOW_HOVER,
                                    }
                                }}
                            >
                                <img
                                    alt="Me and Courtney"
                                    src={meAndCourtneyImg}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        display: 'block',
                                    }}
                                />
                            </Box>
                        </Box>

                        {/* Right side - Content */}
                        <Box sx={{ flex: isMobile ? 'none' : '0 0 60%', display: 'flex', justifyContent: isMobile ? 'center' : 'flex-start', order: isMobile ? 1 : 2, width: isMobile ? '100%' : 'auto' }}>
                            <Box sx={{
                                backgroundColor: theme.palette.cardBackground.main,
                                borderRadius: 2,
                                p: { xs: 3, md: 3 },
                                boxShadow: EFFECTS.CARD_SHADOW,
                                height: "280px",
                            }}>
                                <Typography
                                    fontFamily={FONTS.NECTO_MONO}
                                    variant={isMobile ? "h6" : "h4"}
                                    sx={{
                                        mb: { xs: 2, md: 2.5 },
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
                                        mb: { xs: 2.5, md: 3 },
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
                                    direction={isMobile ? "column" : "row"}
                                    spacing={1.5}
                                    sx={{
                                        justifyContent: 'flex-start',
                                        alignItems: isMobile ? 'stretch' : 'center',
                                    }}
                                    paddingTop={3}
                                >
                                    <Link href="/projects">
                                        <Button
                                            variant="contained"
                                            size="medium"
                                            sx={{
                                                backgroundColor: theme.palette.primaryGreen.main,
                                                color: theme.palette.background.default,
                                                fontFamily: FONTS.ANTON,
                                                px: 3,
                                                py: 1,
                                                fontSize: '1rem',
                                                transition: EFFECTS.TRANSITION,
                                                '&:hover': {
                                                    backgroundColor: theme.palette.softGreen.main,
                                                    transform: EFFECTS.HOVER_SCALE,
                                                    boxShadow: EFFECTS.CARD_SHADOW_HOVER,
                                                }
                                            }}
                                        >
                                            View My Projects
                                        </Button>
                                    </Link>

                                    <Link href="/experience">
                                        <Button
                                            variant="outlined"
                                            size="medium"
                                            sx={{
                                                borderColor: theme.palette.primaryGreen.main,
                                                color: theme.palette.primaryGreen.main,
                                                fontFamily: FONTS.ANTON,
                                                px: 3,
                                                py: 1,
                                                fontSize: '1rem',
                                                transition: EFFECTS.TRANSITION,
                                                '&:hover': {
                                                    borderColor: theme.palette.softGreen.main,
                                                    color: theme.palette.softGreen.main,
                                                    backgroundColor: 'rgba(168, 214, 126, 0.1)',
                                                    transform: EFFECTS.HOVER_SCALE,
                                                }
                                            }}
                                        >
                                            My Experience
                                        </Button>
                                    </Link>

                                    <Button
                                        startIcon={<FaEnvelope />}
                                        onClick={onClickUrl(LINKS.EMAIL)}
                                        size="small"
                                        variant="text"
                                        sx={{
                                            color: theme.palette.textSecondary.main,
                                            fontFamily: FONTS.NECTO_MONO,
                                            px: 2,
                                            py: 0.75,
                                            fontSize: '0.875rem',
                                            minWidth: '110px',
                                            whiteSpace: 'nowrap',
                                            transition: EFFECTS.TRANSITION,
                                            '&:hover': {
                                                color: theme.palette.primaryGreen.main,
                                                backgroundColor: 'rgba(168, 214, 126, 0.08)',
                                            }
                                        }}
                                    >
                                        Email Me
                                    </Button>

                                    <Button
                                        startIcon={<FaFile />}
                                        onClick={onClickUrl(LINKS.RESUME)}
                                        size="small"
                                        variant="text"
                                        sx={{
                                            color: theme.palette.textSecondary.main,
                                            fontFamily: FONTS.NECTO_MONO,
                                            px: 2,
                                            py: 0.75,
                                            fontSize: '0.875rem',
                                            minWidth: '110px',
                                            whiteSpace: 'nowrap',
                                            transition: EFFECTS.TRANSITION,
                                            '&:hover': {
                                                color: theme.palette.primaryGreen.main,
                                                backgroundColor: 'rgba(168, 214, 126, 0.08)',
                                            }
                                        }}
                                    >
                                        Resume
                                    </Button>

                                    <Button
                                        startIcon={<FaGamepad />}
                                        onClick={onClickUrl(LINKS.MINECRAFT_CREDITS)}
                                        size="small"
                                        variant="text"
                                        sx={{
                                            color: theme.palette.textSecondary.main,
                                            fontFamily: FONTS.NECTO_MONO,
                                            px: 2,
                                            py: 0.75,
                                            fontSize: '0.875rem',
                                            minWidth: '160px',
                                            whiteSpace: 'nowrap',
                                            transition: EFFECTS.TRANSITION,
                                            '&:hover': {
                                                color: theme.palette.primaryGreen.main,
                                                backgroundColor: 'rgba(168, 214, 126, 0.08)',
                                            }
                                        }}
                                    >
                                        Minecraft Credits
                                    </Button>

                                    <IconButton
                                        onClick={() => setOpenImage(beansImg)}
                                        size="small"
                                        sx={{
                                            color: theme.palette.textSecondary.main,
                                            ml: 1,
                                            transition: EFFECTS.TRANSITION,
                                            '&:hover': {
                                                color: theme.palette.primaryGreen.main,
                                                backgroundColor: 'rgba(168, 214, 126, 0.08)',
                                            }
                                        }}
                                    >
                                        <FaPaw size={16} />
                                    </IconButton>
                                </Stack>
                            </Box>
                        </Box>
                    </Box>
                </Grid>

                {/* About Me Section - Pass hideImages prop on wide screens */}
                <Grid size={12}>
                    <AboutMe hideImages={isWideScreen} />
                </Grid>
            </Grid>

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
