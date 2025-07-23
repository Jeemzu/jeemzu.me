import { Typography, Grid, Card, Modal, Box, type SxProps, List, ListItem, ListItemText, ListItemIcon, ListSubheader, Divider } from "@mui/material";
import { useState } from "react";
import { FaCaretRight } from "react-icons/fa6";

type JourneyCardProps = {
    onClick?: React.MouseEventHandler<HTMLDivElement>;
    milestoneLocation: string;
    milestoneTitle: string;
    milestoneTimeline: string;
    milestoneDescription: string;
};

type JourneyCardModal = JourneyCardProps & { milestoneBullets: { [key: string]: string[] }; open?: boolean; handleClose?: (value: React.SetStateAction<boolean>) => void };

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

const cardData: JourneyCardModal[] = [
    {
        milestoneLocation: "Mojang Studios",
        milestoneTitle: "Software Engineer",
        milestoneTimeline: "March 2022 - Present",
        milestoneDescription: "At Mojang Studios, I get to collaborate with some of the world's best gameplay designers on the amazing Minecraft: Bedrock Edition!",
        milestoneBullets: {
            "Minecraft Live Events": [
                "I helped launch Minecraft's Live Events platform for the 2022 Mob Vote by pioneering the game's first automated multiplayer performance testing.",
                "I designed and engineered the prototypes for several gameplay systems in the 2023 Minecraft Legends Live Event. We had over 3 million players enjoy the experience I helped design!",
                "I provide ongoing Live Event support to third-party studios by advising on the use of Minecraft Scripting APIs and dev tools."
            ],
            "Developer Tooling": [
                "I engineered a React application that improves workflow efficiency and reduces manual setup errors for both internal Mojang teams and external partners.",
                "I now develop new features for Minecraft Creator Tools, which is used by beginners and experienced Creators alike to create and manage their own Minecraft content."
            ],
            "Teamwork and Collaboration": [
                "I've only been part of 2 teams during my time at Mojang, but my work has spanned multiple disciplines such as gameplay design, UI/UX, and performance testing.",
                "I've been able to work closely with some of the world's best designers, artists, testers, PM's, and other engineers in an Agile environment where communication and efficiency are key.",
            ],
        }
    },
    {
        milestoneLocation: "DIGARC",
        milestoneTitle: "QA Automation Engineer",
        milestoneTimeline: "March 2021 - March 2022",
        milestoneDescription: "Grew up in a small town, developing a love for technology and gaming.",
        milestoneBullets: {
            "": [
                "Engineered a React-based web application used by Mojang and external partners to manage live event configurations, improving workflow efficiency and reducing manual setup errors.",
                "Designed and engineered the prototypes for several gameplay systems in the 2023 Minecraft Legends Live Event which led to a seamless release for over 3 million players.",
                "Assisted in the successful launch of Minecraft's Live Events platform by pioneering the game's first automated multiplayer performance testing.",
                "Supported studio teams with React UI improvements, performance testing, and development tools, ensuring seamless live event rollouts."
            ]
        }
    },
    {
        milestoneLocation: "Andromeda Systems Inc.",
        milestoneTitle: "Software Design Engineer in Test",
        milestoneTimeline: "August 2019 - March 2021",
        milestoneDescription: "Grew up in a small town, developing a love for technology and gaming.",
        milestoneBullets: {
            "": [
                "Engineered a React-based web application used by Mojang and external partners to manage live event configurations, improving workflow efficiency and reducing manual setup errors.",
                "Designed and engineered the prototypes for several gameplay systems in the 2023 Minecraft Legends Live Event which led to a seamless release for over 3 million players.",
                "Assisted in the successful launch of Minecraft's Live Events platform by pioneering the game's first automated multiplayer performance testing.",
                "Supported studio teams with React UI improvements, performance testing, and development tools, ensuring seamless live event rollouts."
            ],
            "": []
        }
    },
    {
        milestoneLocation: "Lenel Systems International",
        milestoneTitle: "QA Automation Engineer Co-op",
        milestoneTimeline: "January 2018 - August 2018",
        milestoneDescription: "Grew up in a small town, developing a love for technology and gaming.",
        milestoneBullets: {
            "": [
                "Engineered a React-based web application used by Mojang and external partners to manage live event configurations, improving workflow efficiency and reducing manual setup errors.",
                "Designed and engineered the prototypes for several gameplay systems in the 2023 Minecraft Legends Live Event which led to a seamless release for over 3 million players.",
                "Assisted in the successful launch of Minecraft's Live Events platform by pioneering the game's first automated multiplayer performance testing.",
                "Supported studio teams with React UI improvements, performance testing, and development tools, ensuring seamless live event rollouts."
            ],
            "": []
        }
    },
];

const JourneyCard = ({
    onClick,
    milestoneLocation,
    milestoneTitle,
    milestoneTimeline,
    milestoneDescription,
}: JourneyCardProps) => {
    return (
        <Grid color='#bdeb92ff' component={Card} size={4} sx={{ justifyContent: 'start', textAlign: 'start', p: 4, backgroundColor: '#222222ff', ":hover": { cursor: 'pointer', opacity: 0.8, transform: 'scale(1.01)' } }} onClick={onClick}>
            <Typography fontFamily={'aArt'} variant="h4" gutterBottom>
                {milestoneLocation}
            </Typography>
            <Typography fontFamily={'aArt'} variant="h6" gutterBottom >
                {milestoneTitle}
            </Typography>
            <Typography fontFamily={'aArt'} variant="h6" gutterBottom>
                {milestoneTimeline}
            </Typography>
            <br />
            <Typography fontFamily={'Trap-Black'} variant="subtitle1" gutterBottom>
                {milestoneDescription}
            </Typography>
        </Grid>
    );
};

const JourneyModal = (props: JourneyCardModal) => {
    const { open, handleClose, milestoneLocation, milestoneTitle, milestoneTimeline, milestoneBullets } = props;
    return (
        <Modal open={open || false} onClose={handleClose}>
            <Box sx={modalStyle}>
                <Typography fontFamily={'aArt'} variant="h4" gutterBottom>
                    {milestoneLocation}
                </Typography>
                <Typography fontFamily={'aArt'} variant="h5" gutterBottom >
                    {milestoneTitle}
                </Typography>
                <Typography fontFamily={'aArt'} variant="h5" gutterBottom>
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
        <Grid container spacing={4} sx={{ justifyContent: 'center', textAlign: 'center', p: 4 }}>
            <Grid size={12}>
                <Typography
                    fontFamily={'aArt'}
                    variant="h2"
                >
                    My Journey So Far
                </Typography>
            </Grid>

            <Divider sx={{ width: '50%', height: '.001rem', backgroundColor: '#bdeb92ff', justifyContent: 'center', mx: 'auto' }} />

            <Grid container size={10} gap={4}>
                {cardData.map((milestone, idx) => (
                    <JourneyCard
                        key={idx}
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
                    />
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
                onClick={undefined}
            />
        </Grid>
    );
};

export default MyJourney;