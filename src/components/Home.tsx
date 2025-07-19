import { Grid, IconButton, Stack, Tooltip, Typography, Zoom } from "@mui/material";
import { Fa4, FaCodeCommit, FaCodiepie, FaEbay, FaGamepad, FaGithub, FaGlasses, FaLinkedin, FaMicrosoft, FaPerson, FaRoad, FaRoadLock, FaSwatchbook, FaUpwork } from "react-icons/fa6";
import { useRef } from "react";
import Experience from "./Experience";
import { onClickUrl } from "../utils/openInNewTab";
import AboutMe from "./AboutMe";


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
        <Tooltip title={ariaLabel} arrow slots={{
            transition: Zoom,
        }}>
            <IconButton
                sx={{ color: '#bdeb92ff', '&:hover': { color: '#ffffffff' } }}
                size="small"
                onClick={onClick}
                aria-label={ariaLabel}
            >
                {icon}
            </IconButton>
        </Tooltip>
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
                    Hi! I'm James.
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
                    sx={{ justifyContent: { xs: 'center', sm: 'center' }, }}
                >
                    <HomeHeaderButton onClick={() => aboutMeRef.current?.scrollIntoView({ behavior: 'smooth' })} icon={<FaPerson size={40} />} ariaLabel="Learn About Me" />
                    <HomeHeaderButton onClick={onClickUrl("https://www.minecraft.net/en-us/credits")} icon={<FaGamepad size={40} />} ariaLabel="Find me in the Minecraft Credits!" />
                    <HomeHeaderButton onClick={() => experienceRef.current?.scrollIntoView({ behavior: 'smooth' })} icon={<FaRoad size={40} />} ariaLabel="My Journey So Far" />
                    <HomeHeaderButton onClick={onClickUrl("https://www.linkedin.com/in/james-friedenberg-664643105/")} icon={<FaLinkedin size={40} />} ariaLabel="LinkedIn" />
                    <HomeHeaderButton onClick={onClickUrl("https://github.com/Jeemzu")} icon={<FaGithub size={40} />} ariaLabel="GitHub" />
                </Stack>
            </Grid>

            <Grid size={12} sx={{ mt: 120 }}>
                <div ref={aboutMeRef}>
                    <AboutMe />
                </div>
                <div ref={experienceRef}>
                    <Experience />
                </div>
            </Grid>


        </Grid>
    );
};

export default Home;