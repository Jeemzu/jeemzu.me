import { Typography, Grid } from "@mui/material";

const Projects = () => {
    return (
        <Grid container spacing={4}>
            <Grid size={12}>
                <Typography
                    variant="h3"
                    component="h2"
                    gutterBottom
                    sx={{
                        textAlign: 'center',
                        mb: 4,
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                        position: 'relative',
                    }}
                >
                    PROJECTS
                </Typography>
            </Grid>

            {/* Project 1 */}
            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                <Grid sx={{
                    p: 3,
                    border: '1px solid',
                    borderColor: '#34677a',
                    borderRadius: 2,
                    height: '100%',
                    position: 'relative',
                    background: 'linear-gradient(135deg, #b1c2be 0%, #5c96a9 100%)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'linear-gradient(90deg, #34677a, #5c96a9, #b1c2be)',
                        transform: 'scaleX(0)',
                        transformOrigin: 'left',
                        transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    },
                    '&:hover': {
                        boxShadow: '0 12px 24px rgba(52, 103, 122, 0.12)',
                        transform: 'translateY(-8px)',
                        borderColor: '#081b21',
                        '&::before': {
                            transform: 'scaleX(1)',
                        }
                    }
                }}>
                    <Typography variant="h5" gutterBottom>
                        Minecraft Feature Development
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                        Technologies: Java, C++, OpenGL
                    </Typography>
                    <Typography variant="body1">
                        Designed and implemented key features for Minecraft, enhancing gameplay and optimizing performance for millions of players worldwide.
                    </Typography>
                </Grid>
            </Grid>

            {/* Project 2 */}
            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                <Grid sx={{
                    p: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    height: '100%',
                    position: 'relative',
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(250,250,250,0.95) 100%)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'linear-gradient(135deg, #4a6f28 0%, #5b8731 50%, #5b8b32 100%)',
                        transform: 'scaleX(0)',
                        transformOrigin: 'left',
                        transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    },
                    '&:hover': {
                        boxShadow: '0 12px 24px rgba(74, 111, 40, 0.12)',
                        transform: 'translateY(-8px)',
                        borderColor: 'rgba(74, 111, 40, 0.3)',
                        '&::before': {
                            transform: 'scaleX(1)',
                        }
                    }
                }}>
                    <Typography variant="h5" gutterBottom>
                        Personal Portfolio
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                        Technologies: React, TypeScript, MUI
                    </Typography>
                    <Typography variant="body1">
                        Developed this responsive portfolio website showcasing my professional experience, projects, and skills using modern web technologies.
                    </Typography>
                </Grid>
            </Grid>

            {/* Project 3 */}
            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                <Grid sx={{
                    p: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    height: '100%',
                    position: 'relative',
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(250,250,250,0.95) 100%)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'linear-gradient(135deg, #4a6f28 0%, #5b8731 50%, #5b8b32 100%)',
                        transform: 'scaleX(0)',
                        transformOrigin: 'left',
                        transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    },
                    '&:hover': {
                        boxShadow: '0 12px 24px rgba(74, 111, 40, 0.12)',
                        transform: 'translateY(-8px)',
                        borderColor: 'rgba(74, 111, 40, 0.3)',
                        '&::before': {
                            transform: 'scaleX(1)',
                        }
                    }
                }}>
                    <Typography variant="h5" gutterBottom>
                        Game Mod Library
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                        Technologies: Java, Forge API, Gradle
                    </Typography>
                    <Typography variant="body1">
                        Created a popular open-source library of modding utilities used by over 50 Minecraft mods, simplifying development and improving compatibility.
                    </Typography>
                </Grid>
            </Grid>
        </Grid>
    );
};

export default Projects;