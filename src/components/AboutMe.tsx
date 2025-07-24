import { Button, Divider, Grid, Modal, Typography, useMediaQuery, type SxProps } from "@mui/material";
import { useState } from "react";

const modalStyle: SxProps = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '50%',
    p: 4,
    color: '#bdeb92ff',
    background: '#222222ff',
};

const MobileAboutMe = ({ open, handleClose }: { open: boolean; handleClose: () => void; }) => {
    return (
        <Modal open={open || false} onClose={handleClose}>
            <Grid container spacing={4} sx={modalStyle}>
                <Grid size={12} sx={{ justifyContent: 'center', textAlign: 'center' }}>
                    <Typography
                        fontFamily={'aArt'}
                        variant="h2"
                    >
                        "Who are you again?"
                    </Typography>
                </Grid>

                <Grid size={12} sx={{ justifyContent: 'center' }}>
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
            </Grid>
        </Modal>
    );
}

const AboutMe = () => {
    const isMobile = useMediaQuery('(max-width:600px)');

    const [open, setOpen] = useState(false);
    const handleClose = () => setOpen(false);

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

            {!isMobile &&
                <Grid container sx={{ justifyContent: 'center' }}>
                    <Grid size={4}>
                        <img alt="James Friedenberg" src="/src/assets/images/meandcourtney.png" style={{
                            width: '100%', height: 'auto', maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 90%)',
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
                </Grid> ||
                <Grid container sx={{ justifyContent: 'center' }}>
                    <Grid size={4}>
                        <img alt="James Friedenberg" src="/src/assets/images/meandcourtney.png" style={{
                            width: '100%', height: 'auto'
                        }} />
                    </Grid>
                    <Grid size={4}>
                        <img alt="James Friedenberg" src="/src/assets/images/beans.png" style={{
                            width: '100%', height: 'auto',
                        }} />
                    </Grid>
                    <Grid size={4}>
                        <Button onClick={() => setOpen(true)} sx={{ mt: 2, color: "#bdeb92ff", backgroundColor: "#222222ff", fontFamily: "aArt", width: '100%' }}>
                            Read More About Me!
                        </Button>
                    </Grid>
                    <MobileAboutMe open={open} handleClose={handleClose} />
                </Grid>}
        </Grid>
    );
}

export default AboutMe;