import { Container, Typography, useTheme } from "@mui/material";
import { FONTS } from "../lib/globals";
import Projects from "./Projects";

const ProjectsPage = () => {
    const theme = useTheme();

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
            <Typography
                fontFamily={FONTS.ANTON}
                variant="h1"
                sx={{
                    textAlign: 'center',
                    mb: { xs: 2, md: 3 },
                    color: theme.palette.primaryGreen.main,
                }}
            >
                My Projects
            </Typography>
            <Typography
                fontFamily={FONTS.NECTO_MONO}
                variant="h6"
                sx={{
                    textAlign: 'center',
                    mb: { xs: 4, md: 6 },
                    color: theme.palette.textSecondary.main,
                    maxWidth: '600px',
                    mx: 'auto',
                }}
            >
                A showcase of my recent work and side projects
            </Typography>
            <Projects />
        </Container>
    );
};

export default ProjectsPage;
