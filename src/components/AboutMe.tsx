import { Grid, Typography } from "@mui/material";

const AboutMe = () => {
    return (
        <Grid container spacing={4}>
            <Grid size={12}>
                <Typography
                    fontFamily={'aArt'}
                    variant="h3"
                    component="h2"
                >
                    WHO IS THIS GUY, ANYWAY?
                </Typography>
            </Grid>

            <Grid size={12}>
                <Grid size={6} sx={{ justifyContent: 'start', textAlign: 'start', p: 4 }}>
                    <Typography fontFamily={'aArt'} variant="h5" gutterBottom>
                        I'll tell ya who! I'm James Friedenberg! Developer, woodworker, gamer, hiker, disc golfer, and most importantly, boyfriend and cat dad.
                    </Typography>
                </Grid>
            </Grid>
        </Grid>
    );
}

export default AboutMe;