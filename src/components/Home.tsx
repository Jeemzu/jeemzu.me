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
    ariaLabel
}: {
    onClick: React.MouseEventHandler<HTMLButtonElement> | undefined;
    icon: React.ReactNode;
    ariaLabel: string;
}) => {
    return (
        <HomeHeaderTooltip title={ariaLabel}>
            <IconButton
                sx={{ color: '#bdeb92ff', '&:hover': { color: '#ffffffff', filter: 'drop-shadow(0 0 10px #bdeb92ff) drop-shadow(0 0 20px #bdeb92ff)' }, ":active": { border: 'none', background: 'none' } }}
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
                <Grid size={12} sx={{
                    textAlign: 'left', mb: 2
                }}>
                    <Typography
                        fontFamily={'aArt'}
                        variant="h1"
                        sx={{
                            ml: '10%',
                            textAlign: 'left',
                            letterSpacing: 2,
                            position: 'relative'
                        }}
                    >
                        Hi! I'm James Friedenberg.
                    </Typography>
                </Grid>

                <Grid size={12} sx={{
                    textAlign: 'left', mb: 4
                }}>
                    <Typography
                        fontFamily={'aArt'}
                        sx={{
                            mb: 1,
                            ml: '10%',
                            letterSpacing: 2,
                            position: 'relative'
                        }}
                        variant="h5"
                    >
                        I work at Mojang Studios developing cool new stuff for <b style={{ fontSize: 30 }}>Minecraft</b>! <br />
                    </Typography>
                </Grid>

                <Grid size={12}>
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{ justifyContent: { xs: 'start', sm: 'start' }, mt: 4, ml: '10%' }}
                    >
                        <HomeHeaderButton onClick={() => aboutMeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })} icon={<FaPerson size={40} />} ariaLabel="Learn About Me" />
                        <HomeHeaderButton onClick={() => experienceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })} icon={<FaRoad size={40} />} ariaLabel="My Journey So Far" />
                        <HomeHeaderButton onClick={() => projectsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })} icon={<FaCode size={40} />} ariaLabel="My Projects" />
                        <HomeHeaderButton onClick={onClickUrl("https://www.linkedin.com/in/james-friedenberg-664643105/")} icon={<FaLinkedin size={40} />} ariaLabel="LinkedIn" />
                        <HomeHeaderButton onClick={onClickUrl("https://github.com/Jeemzu")} icon={<FaGithub size={40} />} ariaLabel="GitHub" />
                        <HomeHeaderButton onClick={onClickUrl("mailto:jamesfriedenberg@gmail.com?subject=Hello from your website!")} icon={<FaEnvelope size={40} />} ariaLabel="Get in touch!" />
                        <HomeHeaderButton onClick={onClickUrl("https://www.minecraft.net/en-us/credits")} icon={<FaGamepad size={40} />} ariaLabel="Find me in the Minecraft Credits!" />
                    </Stack>
                </Grid>


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