import { Grid, Stack, styled, Tooltip, tooltipClasses, Typography, Zoom, type TooltipProps, useTheme, Skeleton, useMediaQuery, Button } from "@mui/material";
import { FaCode, FaEnvelope, FaFile, FaGamepad, FaGithub, FaLinkedin, FaPerson, FaRoad } from "react-icons/fa6";
import { useRef, Suspense, lazy } from "react";
import { onClickUrl } from "../utils/openInNewTab";
import React from "react";
import { EFFECTS, FONTS, LAYOUT, LINKS } from "../lib/globals";

const AboutMe = lazy(() => import("./AboutMe"));
const MyJourney = lazy(() => import("./MyJourney"));
const Projects = lazy(() => import("./Projects"));

// Section Loading Component
const SectionSkeleton = () => (
    <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid size={12} sx={{ textAlign: 'center' }}>
            <Skeleton
                variant="text"
                width="30%"
                height={60}
                sx={{
                    mx: 'auto',
                    backgroundColor: '#333'
                }}
            />
        </Grid>
        <Grid size={12}>
            <Skeleton
                variant="rectangular"
                height={200}
                sx={{
                    backgroundColor: '#333'
                }}
            />
        </Grid>
    </Grid>
);

const HomeHeaderTooltip = styled(({ className, ...props }: TooltipProps) => (
    <Tooltip {...props} arrow classes={{ popper: className }} slots={{ transition: Zoom }} />
))(({ theme }) => ({
    [`& .${tooltipClasses.tooltip}`]: {
        backgroundColor: theme.palette.darkBackground.main,
        color: theme.palette.primaryGreen.main,
        boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.5)",
        fontSize: 16,
        fontFamily: FONTS.A_ART,
        textAlign: 'center',
        padding: '8px 16px',
        textWrap: 'nowrap',
        maxWidth: '100%',
    },
    [`& .${tooltipClasses.arrow}`]: {
        color: theme.palette.darkBackground.main,
    },
}));

const HomeHeaderButton = ({
    onClick,
    icon,
    ariaLabel,
    degrees,
    isMobile
}: {
    onClick: React.MouseEventHandler<HTMLButtonElement> | undefined;
    icon: React.ReactNode;
    ariaLabel: string;
    degrees: number;
    isMobile?: boolean;
}) => {
    const theme = useTheme();

    return (
        <HomeHeaderTooltip title={ariaLabel}>
            <Button
                variant="text"
                sx={{
                    color: theme.palette.primaryGreen.main,
                    transform: `translateY(${degrees * 2}%) rotate(${degrees}deg)`,
                    '&:hover': {
                        color: theme.palette.whiteHover.main,
                        filter: EFFECTS.GLOW_FILTER
                    },
                    ":active": {
                        border: 'none',
                        background: 'none'
                    },
                    padding: `${isMobile ? 6 : 0}px`,
                }}
                size="small"

                onClick={onClick}
                aria-label={ariaLabel}
            >
                {icon}
            </Button>
        </HomeHeaderTooltip>
    );
};

const Home = () => {
    const isMobile = useMediaQuery('(max-width:600px)');
    const aboutMeRef = useRef<HTMLDivElement>(null);
    const experienceRef = useRef<HTMLDivElement>(null);
    const projectsRef = useRef<HTMLDivElement>(null);

    return (
        <Grid size={12} sx={{ mt: isMobile ? '20vh' : 0 }}>
            {/* Header Section */}
            <Grid size={12}>
                <Typography
                    fontFamily={FONTS.A_ART}
                    variant={isMobile ? "h3" : "h2"}
                    sx={{
                        textAlign: 'center',
                        letterSpacing: 2,
                        position: 'relative',
                        transform: `${isMobile ? 'translateY(-50%)' : 'translateY(-80%)'}`,
                        mb: isMobile ? 8 : 2,
                        mt: isMobile ? 4 : 0,
                    }}
                >
                    Hi! I'm James Friedenberg.
                </Typography>

                <Typography
                    fontFamily={FONTS.A_ART}
                    sx={{
                        textAlign: 'center',
                        letterSpacing: 2,
                        position: 'relative',
                        transform: `${isMobile ? 'translateY(-50%)' : 'translateY(-80%)'}`,
                    }}
                    variant="h5"
                >
                    I work at Mojang Studios developing cool new stuff for Minecraft! <br />
                </Typography>
            </Grid>

            <Grid size={12}>
                {isMobile ? (
                    <Grid container spacing={2}>
                        <Grid size={6}>
                            <HomeHeaderButton isMobile onClick={() => aboutMeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })} icon={<FaPerson size={LAYOUT.ICON_SIZE} />} ariaLabel="Learn About Me" degrees={-12} />
                            <HomeHeaderButton isMobile onClick={() => experienceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })} icon={<FaRoad size={LAYOUT.ICON_SIZE} />} ariaLabel="My Journey So Far" degrees={8} />
                            <HomeHeaderButton isMobile onClick={() => projectsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })} icon={<FaCode size={LAYOUT.ICON_SIZE} />} ariaLabel="My Projects" degrees={-5} />
                            <HomeHeaderButton isMobile onClick={onClickUrl(LINKS.LINKEDIN)} icon={<FaLinkedin size={LAYOUT.ICON_SIZE} />} ariaLabel="LinkedIn" degrees={15} />
                        </Grid>
                        <Grid size={6}>
                            <HomeHeaderButton isMobile onClick={onClickUrl(LINKS.GITHUB)} icon={<FaGithub size={LAYOUT.ICON_SIZE} />} ariaLabel="GitHub" degrees={-6} />
                            <HomeHeaderButton isMobile onClick={onClickUrl(LINKS.MINECRAFT_CREDITS)} icon={<FaGamepad size={LAYOUT.ICON_SIZE} />} ariaLabel="Find me in the Minecraft Credits!" degrees={3} />
                            <HomeHeaderButton isMobile onClick={onClickUrl(LINKS.EMAIL)} icon={<FaEnvelope size={LAYOUT.ICON_SIZE} />} ariaLabel="Get in touch!" degrees={-8} />
                            <HomeHeaderButton isMobile onClick={onClickUrl(LINKS.RESUME)} icon={<FaFile size={LAYOUT.ICON_SIZE} />} ariaLabel="Download My Resume" degrees={4} />
                        </Grid>
                    </Grid>
                ) : (
                    <Stack
                        direction="row"
                        spacing={12}
                        sx={{
                            justifyContent: 'center', mt: 10, mx: 'auto'
                        }}
                    >
                        <HomeHeaderButton onClick={() => aboutMeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })} icon={<FaPerson size={LAYOUT.ICON_SIZE} />} ariaLabel="Learn About Me" degrees={-12} />
                        <HomeHeaderButton onClick={() => experienceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })} icon={<FaRoad size={LAYOUT.ICON_SIZE} />} ariaLabel="My Journey So Far" degrees={8} />
                        <HomeHeaderButton onClick={() => projectsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })} icon={<FaCode size={LAYOUT.ICON_SIZE} />} ariaLabel="My Projects" degrees={-5} />
                        <HomeHeaderButton onClick={onClickUrl(LINKS.LINKEDIN)} icon={<FaLinkedin size={LAYOUT.ICON_SIZE} />} ariaLabel="LinkedIn" degrees={15} />
                        <HomeHeaderButton onClick={onClickUrl(LINKS.GITHUB)} icon={<FaGithub size={LAYOUT.ICON_SIZE} />} ariaLabel="GitHub" degrees={-6} />
                        <HomeHeaderButton onClick={onClickUrl(LINKS.MINECRAFT_CREDITS)} icon={<FaGamepad size={LAYOUT.ICON_SIZE} />} ariaLabel="Find me in the Minecraft Credits!" degrees={3} />
                        <HomeHeaderButton onClick={onClickUrl(LINKS.EMAIL)} icon={<FaEnvelope size={LAYOUT.ICON_SIZE} />} ariaLabel="Get in touch!" degrees={-8} />
                        <HomeHeaderButton onClick={onClickUrl(LINKS.RESUME)} icon={<FaFile size={LAYOUT.ICON_SIZE} />} ariaLabel="Download My Resume" degrees={4} />
                    </Stack>
                )}

            </Grid>

            {/* About Me Section */}
            <Grid size={12} sx={{ mt: LAYOUT.HEADER_SPACING }}>
                <div ref={aboutMeRef}>
                    <Suspense fallback={<SectionSkeleton />}>
                        <AboutMe />
                    </Suspense>
                </div>
            </Grid>

            {/* My Journey Section */}
            <Grid size={12} sx={{ mt: LAYOUT.SECTION_SPACING }}>
                <div ref={experienceRef}>
                    <Suspense fallback={<SectionSkeleton />}>
                        <MyJourney />
                    </Suspense>
                </div>
            </Grid>

            {/* Projects Section */}
            <Grid size={12} sx={{ mt: LAYOUT.SECTION_SPACING }}>
                <div ref={projectsRef}>
                    <Suspense fallback={<SectionSkeleton />}>
                        <Projects />
                    </Suspense>
                </div>
            </Grid>
        </Grid>
    );
};

export default Home;