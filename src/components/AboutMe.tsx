import { Button, Divider, Grid, Modal, Typography, useMediaQuery, type SxProps } from "@mui/material";
import { useState } from "react";

const modalStyle: SxProps = {
    position: 'absolute',
    width: 'auto',
    height: 'auto',
    p: 4,
    color: '#bdeb92ff',
    background: '#222222ff',
    overflow: 'scroll',
};

const MobileAboutMe = ({ open, handleClose }: { open: boolean; handleClose: () => void; }) => {
    return (
        <Modal open={open || false} onClose={handleClose}>
            <Grid container sx={modalStyle}>
                <Grid size={12} sx={{ justifyContent: 'center' }}>
                    <Typography fontFamily={'Trap-Black'} variant="h6" gutterBottom>
                        Thanks for asking!
                        <br />
                        I'm James Friedenberg - developer, gamer, woodworker, home cook, disc golfer, and most importantly, boyfriend and cat dad.
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
                    <Grid size={12} >
                        <Grid size={6} sx={{ justifyContent: 'center', textAlign: 'start', p: 4, mx: 'auto' }}>
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
                    <Grid container>
                        <Grid size={6}>
                            <img alt="James and Courtney" src="/src/assets/images/meandcourtney.png" style={{
                                width: '100%', height: 'auto', maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 90%)', transform: 'rotate(-8deg) translateY(-10%)',
                            }} />
                        </Grid>

                        <Grid size={6}>
                            <img alt="Our Cats" src="/src/assets/images/beans.png" style={{
                                width: '100%', height: 'auto',
                            }} />
                        </Grid>
                    </Grid>

                </Grid> ||
                <Grid container>
                    <Grid container>
                        <Grid size={12}>
                            <img alt="James and Courtney" src="/src/assets/images/meandcourtney.png" style={{
                                width: '100%', height: 'auto', maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 90%)', transform: 'rotate(-8deg) translateY(-10%)',
                            }} />
                        </Grid>

                        <Grid size={12}>
                            <img alt="Our Cats" src="/src/assets/images/beans.png" style={{
                                width: '100%', height: 'auto',
                            }} />
                        </Grid>
                    </Grid>
                    <Grid size={12}>
                        <Button onClick={() => setOpen(true)} sx={{ mt: 2, p: 2, color: "#bdeb92ff", backgroundColor: "#222222ff", fontFamily: "aArt", width: 'auto' }}>
                            <Typography fontFamily={'aArt'} variant="h6">
                                Who are you again?
                            </Typography>
                        </Button>
                    </Grid>
                    <MobileAboutMe open={open} handleClose={handleClose} />
                </Grid>}
        </Grid>
    );
}

export default AboutMe;