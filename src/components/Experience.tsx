import { Typography, Grid } from "@mui/material";

const Experience = () => {
    return (
        <Grid container spacing={4}>
            <Grid size={12}>
                <Typography
                    fontFamily={'aArt'}
                    variant="h3"
                >
                    My Journey So Far
                </Typography>
            </Grid>

            <Grid size={12}>
                <Grid size={6} sx={{ justifyContent: 'start', textAlign: 'start', p: 4 }}>
                    <Typography fontFamily={'aArt'} variant="h5" gutterBottom>
                        Software Engineer @ Minecraft
                    </Typography>
                    <Typography fontFamily={'aArt'} variant="subtitle1" gutterBottom>
                        2018 - Present
                    </Typography>
                    <Typography fontFamily={'aArt'} variant="body1">
                        Developed core gameplay features and optimized performance for one of the world's most popular games.
                        Collaborated with cross-functional teams to implement new systems and maintain existing codebases.
                    </Typography>
                </Grid>
            </Grid>
        </Grid>
    );
};

export default Experience;