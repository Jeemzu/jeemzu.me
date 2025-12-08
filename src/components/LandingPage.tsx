import { Grid, Typography, Stack, Button, useTheme, useMediaQuery, Container, Box, Modal } from "@mui/material";
import { FaEnvelope, FaFile, FaGamepad } from "react-icons/fa6";
import { onClickUrl } from "../utils/openInNewTab";
import { EFFECTS, FONTS, LINKS } from "../lib/globals";
import { Link } from "wouter";
import AboutMe from "./AboutMe";
import meAndCourtneyImg from '../assets/images/meandcourtney.png';
import beansImg from '../assets/images/beans.png';
import { useState, useRef, useEffect } from "react";

const LandingPage = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery('(max-width:900px)');
    const isWideScreen = useMediaQuery('(min-width:1400px)');
    const [openImage, setOpenImage] = useState<string | null>(null);
    const heroRef = useRef<HTMLDivElement>(null);
    const [heroHeight, setHeroHeight] = useState(0);

    useEffect(() => {
        if (heroRef.current && isWideScreen) {
            setHeroHeight(heroRef.current.offsetHeight);

            const resizeObserver = new ResizeObserver(() => {
                if (heroRef.current) {
                    setHeroHeight(heroRef.current.offsetHeight);
                }
            });

            resizeObserver.observe(heroRef.current);

            return () => resizeObserver.disconnect();
        }
    }, [isWideScreen]);

    return (
        <Container maxWidth="xl" sx={{ position: 'relative' }}>
            {/* Side Images - Only on wide screens */}
            {isWideScreen && heroHeight > 0 && (
                <>
                    {/* Left Image - Me and Courtney */}
                    <Box
                        onClick={() => setOpenImage(meAndCourtneyImg)}
                        sx={{
                            position: 'absolute',
                            left: { xl: -180, lg: -80 },
                            top: { xs: '4rem', md: '3rem' },
                            height: `${heroHeight}px`,
                            display: 'flex',
                            alignItems: 'stretch',
                            width: '500px',
                            zIndex: 10,
                            cursor: 'pointer',
                        }}
                    >
                        <Box
                            sx={{
                                borderRadius: 2,
                                overflow: 'hidden',
                                boxShadow: EFFECTS.CARD_SHADOW,
                                transition: EFFECTS.TRANSITION,
                                flex: 1,
                                display: 'flex',
                                '&:hover': {
                                    transform: 'scale(1.05)',
                                    boxShadow: EFFECTS.CARD_SHADOW_HOVER,
                                }
                            }}
                        >
                            <img
                                alt="James and Courtney"
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

                    {/* Right Image - Bean Squad */}
                    <Box
                        onClick={() => setOpenImage(beansImg)}
                        sx={{
                            position: 'absolute',
                            right: { xl: -180, lg: -80 },
                            top: { xs: '4rem', md: '3rem' },
                            height: `${heroHeight}px`,
                            display: 'flex',
                            alignItems: 'stretch',
                            width: '500px',
                            zIndex: 10,
                            cursor: 'pointer',
                        }}
                    >
                        <Box
                            sx={{
                                borderRadius: 2,
                                overflow: 'hidden',
                                boxShadow: EFFECTS.CARD_SHADOW,
                                transition: EFFECTS.TRANSITION,
                                flex: 1,
                                display: 'flex',
                                '&:hover': {
                                    transform: 'scale(1.05)',
                                    boxShadow: EFFECTS.CARD_SHADOW_HOVER,
                                }
                            }}
                        >
                            <img
                                alt="Our Cats"
                                src={beansImg}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    display: 'block',
                                }}
                            />
                        </Box>
                    </Box>
                </>
            )}

            <Grid container spacing={3} sx={{ minHeight: '75vh', alignItems: 'center', py: { xs: 4, md: 3 }, position: 'relative' }}>
                {/* Hero Section */}
                <Grid size={12}>
                    <Box ref={heroRef} sx={{ textAlign: 'center', mb: { xs: 2, md: 3 } }}>
                        <Typography
                            fontFamily={FONTS.A_ART}
                            variant={isMobile ? "h3" : "h1"}
                            sx={{
                                mb: { xs: 2, md: 3 },
                                color: theme.palette.primaryGreen.main,
                            }}
                        >
                            James Friedenberg
                        </Typography>

                        <Typography
                            fontFamily={FONTS.TRAP_BLACK}
                            variant={isMobile ? "h6" : "h4"}
                            sx={{
                                mb: { xs: 2.5, md: 4 },
                                color: theme.palette.text.primary,
                                fontWeight: 500,
                            }}
                        >
                            Software Engineer at Mojang Studios
                        </Typography>

                        <Typography
                            fontFamily={FONTS.TRAP_BLACK}
                            variant={isMobile ? "body1" : "h6"}
                            sx={{
                                mb: { xs: 3.5, md: 4.5 },
                                color: theme.palette.textSecondary.main,
                                maxWidth: '700px',
                                mx: 'auto',
                                fontSize: { xs: '1rem', md: '1.125rem' },
                            }}
                        >
                            Developing cool new features for Minecraft.
                            Passionate about clean code, collaboration, gaming, and woodworking.
                        </Typography>

                        {/* CTA Buttons */}
                        <Stack
                            direction={isMobile ? "column" : "row"}
                            spacing={2}
                            sx={{
                                justifyContent: 'center',
                                alignItems: 'center',
                                mb: { xs: 3, md: 4.5 },
                            }}
                        >
                            <Link href="/projects">
                                <Button
                                    variant="contained"
                                    size="large"
                                    sx={{
                                        backgroundColor: theme.palette.primaryGreen.main,
                                        color: theme.palette.background.default,
                                        fontFamily: FONTS.A_ART,
                                        px: 4,
                                        py: 1.5,
                                        fontSize: '1.1rem',
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
                                    size="large"
                                    sx={{
                                        borderColor: theme.palette.primaryGreen.main,
                                        color: theme.palette.primaryGreen.main,
                                        fontFamily: FONTS.A_ART,
                                        px: 4,
                                        py: 1.5,
                                        fontSize: '1.1rem',
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
                        </Stack>

                        {/* Quick Links */}
                        <Stack
                            direction={isMobile ? "column" : "row"}
                            spacing={isMobile ? 0.5 : 1.5}
                            sx={{
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <Button
                                startIcon={<FaEnvelope />}
                                onClick={onClickUrl(LINKS.EMAIL)}
                                size="small"
                                sx={{
                                    color: theme.palette.textSecondary.main,
                                    fontFamily: FONTS.TRAP_BLACK,
                                    fontSize: '0.875rem',
                                    transition: EFFECTS.TRANSITION,
                                    '&:hover': {
                                        color: theme.palette.primaryGreen.main,
                                        backgroundColor: 'rgba(168, 214, 126, 0.08)',
                                        transform: 'translateY(-2px)',
                                    }
                                }}
                            >
                                Email Me
                            </Button>

                            <Button
                                startIcon={<FaFile />}
                                onClick={onClickUrl(LINKS.RESUME)}
                                size="small"
                                sx={{
                                    color: theme.palette.textSecondary.main,
                                    fontFamily: FONTS.TRAP_BLACK,
                                    fontSize: '0.875rem',
                                    transition: EFFECTS.TRANSITION,
                                    '&:hover': {
                                        color: theme.palette.primaryGreen.main,
                                        backgroundColor: 'rgba(168, 214, 126, 0.08)',
                                        transform: 'translateY(-2px)',
                                    }
                                }}
                            >
                                Resume
                            </Button>

                            <Button
                                startIcon={<FaGamepad />}
                                onClick={onClickUrl(LINKS.MINECRAFT_CREDITS)}
                                size="small"
                                sx={{
                                    color: theme.palette.textSecondary.main,
                                    fontFamily: FONTS.TRAP_BLACK,
                                    fontSize: '0.875rem',
                                    transition: EFFECTS.TRANSITION,
                                    '&:hover': {
                                        color: theme.palette.primaryGreen.main,
                                        backgroundColor: 'rgba(168, 214, 126, 0.08)',
                                        transform: 'translateY(-2px)',
                                    }
                                }}
                            >
                                Minecraft Credits
                            </Button>
                        </Stack>
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
