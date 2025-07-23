import { Divider, Grid, Typography } from "@mui/material";

const AboutMe = () => {
    return (
        <Grid container spacing={4}>
            <Grid size={12} sx={{ justifyContent: 'center', textAlign: 'center' }}>
                <Typography
                    fontFamily={'aArt'}
                    variant="h2"
                >
                    "Who are you again?"
                </Typography>
            </Grid>

            <Divider sx={{ width: '50%', height: '.001rem', backgroundColor: '#bdeb92ff', justifyContent: 'center', mx: 'auto' }} />

            <Grid container size={12} sx={{ justifyContent: 'center' }} gap={4}>
                <Grid size={4}>
                    <img alt="James Friedenberg" src="/src/assets/images/meandcourtney.png" style={{
                        width: '100%', height: 'auto'
                    }} />
                </Grid>

                <Grid size={4} sx={{ justifyContent: 'center', textAlign: 'start', p: 4 }}>
                    <Typography fontFamily={'Trap-Black'} variant="h6" gutterBottom>
                        Thanks for asking! I'm James Friedenberg - developer, gamer, woodworker, home cook, disc golfer, and most importantly, boyfriend and cat dad.
                        <br />
                        <br />
                        I've found communication and collaboration to be my greatest strengths, so I love working on teams where people feel free to share their ideas and contribute openly.
                        <br />
                        <br />
                        That said, I didn`t always love software development. As a hands-on, interactive learner, I struggled for a while to connect with programming and stay focused for long stretches at a desk.
                        <br />
                        <br />
                        Two things changed that: I picked up woodworking and disc golf, which gave me much-needed balance outside of work, and I worked with my doctor to get diagnosed and treated for ADHD.
                        That diagnosis made a world of difference in my focus, motivation, and enjoyment of programming.
                        <br />
                        <br />
                        Today, I look forward to solving problems and being a reliable teammate. I show up every day with focus, curiosity, and the drive to keep growing.
                    </Typography>
                </Grid>

                <Grid size={4}>
                    <img alt="James Friedenberg" src="/src/assets/images/beans.png" style={{
                        width: '100%', height: 'auto',
                    }} />
                </Grid>
            </Grid>
        </Grid>
    );
}

export default AboutMe;