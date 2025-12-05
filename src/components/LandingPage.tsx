import { Grid, Typography, Stack, Button, useTheme, useMediaQuery, Container, Box } from "@mui/material";
import { FaEnvelope, FaFile, FaGamepad } from "react-icons/fa6";
import { onClickUrl } from "../utils/openInNewTab";
import { EFFECTS, FONTS, LINKS } from "../lib/globals";
import { Link } from "wouter";
import AboutMe from "./AboutMe";

const LandingPage = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery('(max-width:900px)');

    return (
        <Container maxWidth="lg">
            <Grid container spacing={6} sx={{ minHeight: '80vh', alignItems: 'center', py: { xs: 4, md: 8 } }}>
                {/* Hero Section */}
                <Grid size={12}>
                    <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 8 } }}>
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
                                mb: { xs: 3, md: 4 },
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
                                mb: { xs: 4, md: 6 },
                                color: theme.palette.textSecondary.main,
                                maxWidth: '700px',
                                mx: 'auto',
                                fontSize: { xs: '1rem', md: '1.125rem' },
                            }}
                        >
                            Developing cool new features for Minecraft.
                            Passionate about clean code, collaboration, and creating delightful user experiences.
                        </Typography>

                        {/* CTA Buttons */}
                        <Stack
                            direction={isMobile ? "column" : "row"}
                            spacing={2}
                            sx={{
                                justifyContent: 'center',
                                alignItems: 'center',
                                mb: { xs: 4, md: 6 },
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
                            spacing={isMobile ? 1 : 2}
                            sx={{
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <Button
                                startIcon={<FaEnvelope />}
                                onClick={onClickUrl(LINKS.EMAIL)}
                                sx={{
                                    color: theme.palette.textSecondary.main,
                                    fontFamily: FONTS.TRAP_BLACK,
                                    fontSize: '0.95rem',
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
                                sx={{
                                    color: theme.palette.textSecondary.main,
                                    fontFamily: FONTS.TRAP_BLACK,
                                    fontSize: '0.95rem',
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
                                sx={{
                                    color: theme.palette.textSecondary.main,
                                    fontFamily: FONTS.TRAP_BLACK,
                                    fontSize: '0.95rem',
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

                {/* About Me Section */}
                <Grid size={12}>
                    <AboutMe />
                </Grid>
            </Grid>
        </Container>
    );
};

export default LandingPage;
