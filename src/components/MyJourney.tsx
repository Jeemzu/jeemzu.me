import { Typography, Grid, Card, Modal, Box, List, ListItem, ListItemText, ListItemIcon, ListSubheader, Divider, CardContent, useMediaQuery, useTheme } from "@mui/material";
import { useState } from "react";
import { FaCaretRight } from "react-icons/fa6";
import type { JourneyCardModal, JourneyCardProps } from "../lib/MyJourneyTypes";
import { cardData, modalStyle } from "../lib/data/JourneyData";
import { FONTS } from "../lib/globals";

const JourneyCard = ({
    onClick,
    milestoneLocation,
    milestoneTitle,
    milestoneTimeline,
    milestoneDescription,
    degrees,
}: JourneyCardProps) => {
    const theme = useTheme();
    const isMobile = useMediaQuery('(max-width:600px)');

    return (
        <Card color='#bdeb92ff'
            onClick={onClick}
            sx={{
                textAlign: 'start',
                p: { xs: 2, sm: 3, md: 4 },
                backgroundColor: '#222222ff',
                ":hover": {
                    cursor: 'pointer',
                    opacity: 0.8,
                    transform: 'scale(1.01)'
                },
                width: { xs: '90%', sm: '50%', md: '25%' },
                height: 'auto',
                mx: 'auto',
                transform: `rotate(${degrees}deg)`,
            }}>
            <CardContent sx={{ color: theme.palette.primaryGreen.main }}>
                <Typography fontFamily={FONTS.A_ART} variant={isMobile ? "h5" : "h4"} gutterBottom>
                    {milestoneLocation}
                </Typography>
                <Typography fontFamily={FONTS.A_ART} variant={isMobile ? "subtitle1" : "h5"} gutterBottom >
                    {milestoneTitle}
                </Typography>
                <Typography fontFamily={FONTS.A_ART} variant={isMobile ? "subtitle1" : "h5"} >
                    {milestoneTimeline}
                </Typography>
                <br />
                <Typography fontFamily={FONTS.TRAP_BLACK} variant="subtitle1" >
                    {milestoneDescription}
                </Typography>
            </CardContent>
        </Card>
    );
};

const JourneyModal = (props: JourneyCardModal) => {
    const { open, handleClose, milestoneLocation, milestoneTitle, milestoneTimeline, milestoneBullets } = props;
    return (
        <Modal open={open || false} onClose={handleClose}>
            <Box sx={modalStyle}>
                <Typography fontFamily={FONTS.A_ART} variant="h4" gutterBottom>
                    {milestoneLocation}
                </Typography>
                <Typography fontFamily={FONTS.A_ART} variant="h5" gutterBottom >
                    {milestoneTitle}
                </Typography>
                <Typography fontFamily={FONTS.A_ART} variant="h5" gutterBottom>
                    {milestoneTimeline}
                </Typography>
                <JourneyDescriptionList bullets={milestoneBullets} />
            </Box>
        </Modal>
    );
};

const JourneyDescriptionList = ({
    bullets
}: {
    bullets: Record<string, string[]>;
}) => {
    const theme = useTheme();

    return (
        <Grid size={12}>
            {Object.entries(bullets).map(([key, values], groupIdx) => (
                <List
                    key={key || `group-${groupIdx}`}
                    sx={{ paddingLeft: 2 }}
                >
                    <ListSubheader disableSticky sx={{ fontFamily: FONTS.TRAP_BLACK, fontSize: 24, color: theme.palette.primaryGreen.main, paddingLeft: 2, background: 'none' }}>{key}</ListSubheader>
                    {values.map((value, valueIdx) => (
                        <ListItem key={`${key}-${valueIdx}`}>
                            <ListItemIcon>
                                <FaCaretRight size={16} color={theme.palette.primaryGreen.main} />
                            </ListItemIcon>
                            <ListItemText primary={value} slotProps={{ primary: { sx: { fontFamily: FONTS.TRAP_BLACK, color: theme.palette.primaryGreen.main } } }} />
                        </ListItem>
                    ))}
                </List>
            ))}
        </Grid>
    );
}

const MyJourney = () => {
    const isMobile = useMediaQuery('(max-width:600px)');
    const theme = useTheme();

    const [open, setOpen] = useState(false);
    const [currentModalProps, setCurrentModalProps] = useState<JourneyCardModal | null>(null);
    const handleOpen = (props: JourneyCardModal) => {
        setCurrentModalProps(props);
        setOpen(true);
    }
    const handleClose = () => {
        setOpen(false);
    }

    return (
        <Grid container spacing={4}>
            <Grid size={12} sx={{ justifyContent: 'center', textAlign: 'center' }}>
                <Typography
                    fontFamily={FONTS.A_ART}
                    variant={isMobile ? 'h3' : 'h2'}
                >
                    My Journey So Far
                </Typography>
            </Grid>

            <Divider sx={{ width: '50%', height: '.001rem', backgroundColor: theme.palette.primaryGreen.main, justifyContent: 'center', mx: 'auto', mb: 1 }} />

            <Grid container rowGap={6} sx={{ justifyContent: 'center' }}>
                {cardData.map((milestone, idx) => (
                    <Grid size={12} key={idx}>
                        <JourneyCard
                            key={milestone.milestoneTitle}
                            onClick={() =>
                                handleOpen({
                                    ...milestone,
                                    open: open,
                                    handleClose: handleClose,
                                    milestoneBullets: milestone.milestoneBullets
                                })
                            }
                            milestoneLocation={milestone.milestoneLocation}
                            milestoneTitle={milestone.milestoneTitle}
                            milestoneTimeline={milestone.milestoneTimeline}
                            milestoneDescription={milestone.milestoneDescription}
                            degrees={milestone.degrees || 0}
                        />
                    </Grid>
                ))}
            </Grid>
            <JourneyModal
                open={open}
                handleClose={handleClose}
                milestoneLocation={currentModalProps?.milestoneLocation ?? ""}
                milestoneTitle={currentModalProps?.milestoneTitle ?? ""}
                milestoneTimeline={currentModalProps?.milestoneTimeline ?? ""}
                milestoneDescription={currentModalProps?.milestoneDescription ?? ""}
                milestoneBullets={currentModalProps?.milestoneBullets ?? { "": [] }}
                degrees={0}
                onClick={undefined}
            />
        </Grid>
    );
};

export default MyJourney;