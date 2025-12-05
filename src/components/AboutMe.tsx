import { Button, Card, CardContent, Grid, Modal, Typography, useMediaQuery, type SxProps, useTheme, Box } from "@mui/material";
import { useState } from "react";
import { ANIMATIONS, EFFECTS, FONTS } from "../lib/globals";
import { FaHeart, FaUsers, FaBrain } from "react-icons/fa6";
import meAndCourtneyImg from '../assets/images/meandcourtney.png';
import beansImg from '../assets/images/beans.png';
import { useScrollAnimation } from "../utils/useScrollAnimation";

const modalStyle: SxProps = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'calc(100vw - 32px)',
    maxWidth: '400px',
    maxHeight: '80vh',
    p: 2,
    color: '#bdeb92ff',
    background: '#222222ff',
    overflow: 'auto',
    borderRadius: 2,
    boxShadow: 24,
};

const MobileAboutMe = ({ open, handleClose }: { open: boolean; handleClose: () => void; }) => {
    return (
        <Modal open={open || false} onClose={handleClose}>
            <Grid container sx={modalStyle}>
                <Grid size={12}>
                    <Typography fontFamily={FONTS.TRAP_BLACK} variant="body1" gutterBottom>
                        Thanks for asking!
                        <br />
                        I'm James Friedenberg - developer, gamer, woodworker, home cook, disc golfer, and most importantly, boyfriend and cat dad.
                        <br />
                        <br />
                        I've found communication and collaboration to be my greatest strengths, so I love working on teams where people feel free to share their ideas and contribute openly.
                        <br />
                        <br />
                        That said, I didn`t always love software development. As a hands-on, interactive learner, I struggled for a while to connect with programming and stay focused for long stretches at a desk.
                        <br />
                        <br />
                        Two things changed that: I picked up woodworking and disc golf, which gave me much-needed balance outside of work, and I worked with my doctor to get diagnosed and treated for ADHD.
                        That diagnosis made a world of difference in my focus, motivation, and enjoyment of programming.
                        <br />
                        <br />
                        Today, I look forward to solving problems and being a reliable teammate. I show up every day with focus, curiosity, and the drive to keep growing.
                    </Typography>
                </Grid>
            </Grid>
        </Modal>
    );
}

const HighlightCard = ({
    icon,
    title,
    content,
    index = 0,
}: {
    icon: React.ReactNode;
    title: string;
    content: string;
    index?: number;
}) => {
    const theme = useTheme();
    const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

    return (
        <Box
            ref={ref}
            sx={{
                ...ANIMATIONS.FADE_IN,
                ...(isVisible && ANIMATIONS.FADE_IN_VISIBLE),
                transitionDelay: `${index * ANIMATIONS.STAGGER_DELAY}s`,
                height: '100%',
            }}
        >
            <Card
                sx={{
                    height: '100%',
                    backgroundColor: theme.palette.cardBackground.main,
                    boxShadow: EFFECTS.CARD_SHADOW,
                    transition: EFFECTS.TRANSITION,
                    '&:hover': {
                        boxShadow: EFFECTS.CARD_SHADOW_HOVER,
                    },
                }}
            >
                <CardContent sx={{ p: { xs: 3, md: 4 }, textAlign: 'left' }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            mb: 2,
                        }}
                    >
                        <Box
                            sx={{
                                color: theme.palette.primaryGreen.main,
                                mr: 2,
                                fontSize: '2rem',
                            }}
                        >
                            {icon}
                        </Box>
                        <Typography
                            fontFamily={FONTS.A_ART}
                            variant="h5"
                            sx={{ color: theme.palette.primaryGreen.main }}
                        >
                            {title}
                        </Typography>
                    </Box>
                    <Typography
                        fontFamily={FONTS.TRAP_BLACK}
                        variant="body1"
                        sx={{
                            color: theme.palette.textSecondary.main,
                            lineHeight: 1.8,
                            textAlign: 'left',
                        }}
                    >
                        {content}
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
};

const AboutMe = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery('(max-width:600px)');

    const [open, setOpen] = useState(false);
    const handleClose = () => setOpen(false);

    return (
        <Grid container spacing={4}>
            {!isMobile &&
                <>
                    <Grid size={12} sx={{ justifyContent: 'center', textAlign: 'center', mb: 2 }}>
                        <Typography
                            fontFamily={FONTS.A_ART}
                            variant="h3"
                            sx={{ color: theme.palette.primaryGreen.main }}
                        >
                            "Who are you again?"
                        </Typography>
                    </Grid>
                </>
            }

            {!isMobile ? (
                <>
                    {/* Intro text */}
                    <Grid size={12}>
                        <Typography
                            fontFamily={FONTS.TRAP_BLACK}
                            variant="h6"
                            sx={{
                                color: theme.palette.text.secondary,
                                textAlign: 'left',
                                maxWidth: '700px',
                                mx: 'auto',
                                mb: 2,
                            }}
                        >
                            I'm James Friedenberg - developer, gamer, woodworker, home cook, disc golfer, and most importantly, boyfriend and cat dad.
                        </Typography>
                    </Grid>

                    {/* Highlight Cards */}
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <HighlightCard
                                icon={<FaUsers />}
                                title="Team Player"
                                content="I've found communication and collaboration to be my greatest strengths. I love working on teams where people feel free to share their ideas and contribute openly."
                                index={0}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <HighlightCard
                                icon={<FaBrain />}
                                title="My Journey"
                                content="I didn't always love software development. As a hands-on learner, I struggled to stay focused. Then I picked up woodworking and disc golf for balance, and got diagnosed and treated for ADHD. That made all the difference."
                                index={1}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <HighlightCard
                                icon={<FaHeart />}
                                title="Today"
                                content="I look forward to solving problems and being a reliable teammate. I show up every day with focus, curiosity, and the drive to keep growing."
                                index={2}
                            />
                        </Grid>
                    </Grid>

                    {/* Images */}
                    <Grid container spacing={2} sx={{ mt: 2 }}>
                        <Grid size={6}>
                            <Box
                                sx={{
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    boxShadow: EFFECTS.CARD_SHADOW,
                                }}
                            >
                                <img
                                    alt="James and Courtney"
                                    src={meAndCourtneyImg}
                                    style={{
                                        width: '100%',
                                        height: 'auto',
                                        display: 'block',
                                    }}
                                />
                            </Box>
                        </Grid>
                        <Grid size={6}>
                            <Box
                                sx={{
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    boxShadow: EFFECTS.CARD_SHADOW,
                                }}
                            >
                                <img
                                    alt="Our Cats"
                                    src={beansImg}
                                    style={{
                                        width: '100%',
                                        height: 'auto',
                                        display: 'block',
                                    }}
                                />
                            </Box>
                        </Grid>
                    </Grid>
                </>
            ) : (
                <Grid container>
                    <Grid container>
                        <Grid size={12}>
                            <img alt="James and Courtney" src={meAndCourtneyImg} style={{
                                width: '100%', height: 'auto', maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 90%)', transform: 'rotate(-8deg) translateY(-10%) scale(1.2)',
                            }} />
                        </Grid>

                        <Grid size={12}>
                            <img alt="Our Cats" src={beansImg} style={{
                                width: '100%', height: 'auto',
                            }} />
                        </Grid>
                    </Grid>
                    <Grid size={12}>
                        <Button onClick={() => setOpen(true)} sx={{ mt: 2, p: 2, color: theme.palette.primaryGreen.main, backgroundColor: theme.palette.darkBackground.main, fontFamily: FONTS.A_ART, width: 'auto' }}>
                            <Typography fontFamily={FONTS.A_ART} variant="h6">
                                Who are you again?
                            </Typography>
                        </Button>
                    </Grid>
                    <MobileAboutMe open={open} handleClose={handleClose} />
                </Grid>
            )}
        </Grid>
    );
}

export default AboutMe;