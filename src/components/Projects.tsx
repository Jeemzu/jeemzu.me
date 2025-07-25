import { Typography, Grid, Divider, Card, CardContent } from "@mui/material";
import { projectData } from "../lib/data/ProjectData";

const Projects = () => {
    return (
        <Grid container spacing={4}>
            <Grid size={12} sx={{ justifyContent: 'center', textAlign: 'center' }}>
                <Typography
                    fontFamily={'aArt'}
                    variant="h2"
                >
                    Projects
                </Typography>
            </Grid>

            <Divider sx={{ width: '50%', height: '.001rem', backgroundColor: '#bdeb92ff', justifyContent: 'center', mx: 'auto' }} />

            <Grid container rowGap={6} sx={{ justifyContent: 'center' }}>
                {projectData.map((project) => (
                    <Grid size={12}>
                        <Card color='#bdeb92ff'
                            sx={{
                                textAlign: 'center',
                                p: 3,
                                backgroundColor: '#222222ff',
                                ":hover": {
                                    cursor: 'pointer',
                                    opacity: 0.8,
                                    transform: 'scale(1.01)'
                                },
                                width: '25%',
                                height: 'auto',
                                mx: 'auto',
                            }}>
                            <CardContent sx={{ color: '#bdeb92ff' }}>
                                <img
                                    srcSet={`${project.img}?w=248&fit=crop&auto=format&dpr=2 2x`}
                                    src={`${project.img}?w=248&fit=crop&auto=format`}
                                    alt={project.title}
                                    loading="lazy"
                                />
                                <Typography fontFamily={'aArt'} variant="h4" gutterBottom>
                                    {project.title}
                                </Typography>
                                <Typography fontFamily={'aArt'} variant="h6" gutterBottom >
                                    {project.description}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Grid >
    );
};

export default Projects;