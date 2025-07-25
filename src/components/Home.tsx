import { Grid, IconButton, Stack, styled, Tooltip, tooltipClasses, Typography, Zoom, type TooltipProps } from "@mui/material";
import { FaCode, FaEnvelope, FaGamepad, FaGithub, FaLinkedin, FaPerson, FaRoad } from "react-icons/fa6";
import { useRef } from "react";
import { onClickUrl } from "../utils/openInNewTab";
import AboutMe from "./AboutMe";
import MyJourney from "./MyJourney";
import React from "react";
import Projects from "./Projects";

const tooltipStyles = {
    [`& .${tooltipClasses.tooltip}`]: {
        backgroundColor: '#222222ff',
        color: '#bdeb92ff',
        boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.5)",
        fontSize: 16,
        fontFamily: 'aArt',
        textAlign: 'center',
        padding: '8px 16px',
        textWrap: 'nowrap',
        maxWidth: '100%',
    },
    [`& .${tooltipClasses.arrow}`]: {
        color: '#222222ff',
    },
}

const HomeHeaderTooltip = styled(({ className, ...props }: TooltipProps) => (
    <Tooltip {...props} arrow classes={{ popper: className }} slots={{ transition: Zoom }} />
))(() => (tooltipStyles));

const HomeHeaderButton = ({
    onClick,
    icon,
    ariaLabel,
    degrees
}: {
    onClick: React.MouseEventHandler<HTMLButtonElement> | undefined;
    icon: React.ReactNode;
    ariaLabel: string;
    degrees: number;
}) => {
    return (
        <HomeHeaderTooltip title={ariaLabel}>
            <IconButton
                sx={{ color: '#bdeb92ff', transform: `translateY(${degrees * 2}%) rotate(${degrees}deg)`, '&:hover': { color: '#ffffffff', filter: 'drop-shadow(0 0 10px #bdeb92ff) drop-shadow(0 0 20px #bdeb92ff)' }, ":active": { border: 'none', background: 'none' } }}
                size="small"
                onClick={onClick}
                aria-label={ariaLabel}
            >
                {icon}
            </IconButton>
        </HomeHeaderTooltip>
    );
};

const Home = () => {
    const aboutMeRef = useRef<HTMLDivElement>(null);
    const experienceRef = useRef<HTMLDivElement>(null);
    const projectsRef = useRef<HTMLDivElement>(null);

    return (
        <Grid size={12}>
            {/* Header Section */}
            <Grid size={12}>
                <Typography
                    fontFamily={'aArt'}
                    variant="h2"
                    sx={{
                        textAlign: 'center',
                        letterSpacing: 2,
                        position: 'relative',
                        transform: 'translateY(-80%) ',
                        mb: 2,
                    }}
                >
                    Hi! I'm James Friedenberg.
                </Typography>

                <Typography
                    fontFamily={'aArt'}
                    sx={{
                        textAlign: 'center',
                        letterSpacing: 2,
                        position: 'relative',
                        transform: 'translateY(-80%)',
                        mb: 1,
                    }}
                    variant="h5"
                >
                    I work at Mojang Studios developing cool new stuff for Minecraft! <br />
                </Typography>
                <Stack
                    direction="row"
                    spacing={12}
                    sx={{
                        justifyContent: {
                            xs: 'center', sm: 'center',
                            mb: 2,
                        }, mt: 10, mx: 'auto'
                    }}
                >
                    <HomeHeaderButton onClick={() => aboutMeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })} icon={<FaPerson size={80} />} ariaLabel="Learn About Me" degrees={-12} />
                    <HomeHeaderButton onClick={() => experienceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })} icon={<FaRoad size={80} />} ariaLabel="My Journey So Far" degrees={8} />
                    <HomeHeaderButton onClick={() => projectsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })} icon={<FaCode size={80} />} ariaLabel="My Projects" degrees={-5} />
                    <HomeHeaderButton onClick={onClickUrl("https://www.linkedin.com/in/james-friedenberg-664643255/")} icon={<FaLinkedin size={80} />} ariaLabel="LinkedIn" degrees={15} />
                    <HomeHeaderButton onClick={onClickUrl("https://github.com/Jeemzu")} icon={<FaGithub size={80} />} ariaLabel="GitHub" degrees={-6} />
                    <HomeHeaderButton onClick={onClickUrl("mailto:jamesfriedenberg@gmail.com?subject=Hello from your website!")} icon={<FaEnvelope size={80} />} ariaLabel="Get in touch!" degrees={4} />
                    <HomeHeaderButton onClick={onClickUrl("https://www.minecraft.net/en-us/credits")} icon={<FaGamepad size={80} />} ariaLabel="Find me in the Minecraft Credits!" degrees={-12} />
                </Stack>
            </Grid>

            {/* About Me Section */}
            <Grid size={12} sx={{ mt: "50vh" }}>
                <div ref={aboutMeRef}>
                    <AboutMe />
                </div>
            </Grid>

            {/* My Journey Section */}
            <Grid size={12} sx={{ mt: "20vh" }}>
                <div ref={experienceRef}>
                    <MyJourney />
                </div>
            </Grid>

            {/* Projects Section */}
            <Grid size={12} sx={{ mt: "20vh" }}>
                <div ref={projectsRef}>
                    <Projects />
                </div>
            </Grid>
        </Grid>
    );
};

export default Home;