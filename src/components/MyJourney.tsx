import { Typography, Grid, Card, Modal, Box, List, ListItem, ListItemText, ListItemIcon, ListSubheader, Divider, CardContent } from "@mui/material";
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
    return (
        <Card color='#bdeb92ff'
            onClick={onClick}
            sx={{
                textAlign: 'start',
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
                transform: `rotate(${degrees}deg)`,
            }}>
            <CardContent sx={{ color: '#bdeb92ff' }}>
                <Typography fontFamily={FONTS.A_ART} variant="h4" gutterBottom>
                    {milestoneLocation}
                </Typography>
                <Typography fontFamily={FONTS.A_ART} variant="h6" gutterBottom >
                    {milestoneTitle}
                </Typography>
                <Typography fontFamily={FONTS.A_ART} variant="h6" >
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
    return (
        <Grid size={12}>
            {Object.entries(bullets).map(([key, values], groupIdx) => (
                <List
                    key={key || `group-${groupIdx}`}
                    sx={{ paddingLeft: 2 }}
                >
                    <ListSubheader sx={{ fontFamily: 'Trap-Black', fontSize: 24, color: '#bdeb92ff', paddingLeft: 2, background: 'none' }}>{key}</ListSubheader>
                    {values.map((value, valueIdx) => (
                        <ListItem key={`${key}-${valueIdx}`}>
                            <ListItemIcon>
                                <FaCaretRight size={16} color="#bdeb92ff" />
                            </ListItemIcon>
                            <ListItemText primary={value} slotProps={{ primary: { sx: { fontFamily: 'Trap-Black', color: '#bdeb92ff' } } }} />
                        </ListItem>
                    ))}
                </List>
            ))}
        </Grid>
    );
}

const MyJourney = () => {
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
                    variant="h2"
                >
                    My Journey So Far
                </Typography>
            </Grid>

            <Divider sx={{ width: '50%', height: '.001rem', backgroundColor: '#bdeb92ff', justifyContent: 'center', mx: 'auto', mb: 1 }} />

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