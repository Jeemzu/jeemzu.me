import { Grid, IconButton, Stack, styled, Tooltip, tooltipClasses, Typography, Zoom, type TooltipProps } from "@mui/material";
import { FaGamepad, FaGithub, FaLinkedin, FaPerson, FaRoad } from "react-icons/fa6";
import { useRef } from "react";
import { onClickUrl } from "../utils/openInNewTab";
import AboutMe from "./AboutMe";
import MyJourney from "./MyJourney";
import React from "react";

const tooltipStyles = {
    [`& .${tooltipClasses.tooltip}`]: {
        backgroundColor: '#222222ff',
        color: '#bdeb92ff',
        boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.5)",
        fontSize: 16,
        fontFamily: 'aArt',
        textAlign: 'center',
        padding: '8px 12px',
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
                sx={{ color: '#bdeb92ff', '&:hover': { color: '#ffffffff' } }}
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

    return (
        <Grid container spacing={4}>
            {/* Header Section */}
            <Grid size={12}>
                <Typography
                    fontFamily={'aArt'}
                    variant="h1"
                    sx={{
                        textAlign: 'center',
                        mb: 4,
                        letterSpacing: 2,
                        position: 'relative'
                    }}
                >
                    Hi! I'm James Friedenberg.
                </Typography>
                <Typography
                    fontFamily={'aArt'}
                    sx={{
                        textAlign: 'center',
                        mb: 4,
                        letterSpacing: 2,
                        position: 'relative'
                    }}
                >
                    I'm a software engineer at <b style={{ fontSize: 24 }}>Minecraft</b>. Welcome to my little haven!
                </Typography>

                <Stack
                    direction="row"
                    spacing={1}
                    useFlexGap
                    sx={{ justifyContent: { xs: 'center', sm: 'center' }, mt: 4 }}
                >
                    <HomeHeaderButton onClick={() => aboutMeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })} icon={<FaPerson size={40} />} ariaLabel="Learn About Me" />
                    <HomeHeaderButton onClick={onClickUrl("https://www.minecraft.net/en-us/credits")} icon={<FaGamepad size={40} />} ariaLabel="Find me in the Minecraft Credits!" />
                    <HomeHeaderButton onClick={() => experienceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })} icon={<FaRoad size={40} />} ariaLabel="My Journey So Far" />
                    <HomeHeaderButton onClick={onClickUrl("https://www.linkedin.com/in/james-friedenberg-664643105/")} icon={<FaLinkedin size={40} />} ariaLabel="LinkedIn" />
                    <HomeHeaderButton onClick={onClickUrl("https://github.com/Jeemzu")} icon={<FaGithub size={40} />} ariaLabel="GitHub" />
                </Stack>
            </Grid>

            {/* About Me Section */}
            <Grid size={12} sx={{ mt: 60 }}>
                <div ref={aboutMeRef}>
                    <AboutMe />
                </div>
            </Grid>

            {/* My Journey Section */}
            <Grid size={12} sx={{ mt: 20 }}>
                <div ref={experienceRef}>
                    <MyJourney />
                </div>
            </Grid>


        </Grid>
    );
};

export default Home;