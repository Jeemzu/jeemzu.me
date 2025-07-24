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
    width: '40%',
    p: 4,
    color: '#bdeb92ff',
    background: '#222222ff',
    border: '2px solid #bdeb92ff',
};

const cardData: JourneyCardModal[] = [
    {
        milestoneLocation: "Mojang Studios",
        milestoneTitle: "Software Engineer",
        milestoneTimeline: "March 2022 - Present",
        milestoneDescription: "At Mojang Studios, I collaborate with some of the world's best gameplay designers on the amazing Minecraft: Bedrock Edition!",
        milestoneBullets: {
            "Minecraft Live Events": [
                "Helped launch Minecraft's Live Events platform for the 2022 Mob Vote by pioneering the game's first automated multiplayer performance testing.",
                "Designed and engineered the prototypes for several gameplay systems in the 2023 Minecraft Legends Live Event. We had over 3 million players enjoying the experience I helped design!",
                "Provide ongoing Live Event support to third-party studios by advising on the use of Minecraft Scripting APIs and dev tools."
            ],
            "Developer Tooling": [
                "Engineered a React application that improves workflow efficiency and reduces manual setup errors for both internal Mojang teams and external partners.",
                "Develop new features for Minecraft Creator Tools, which is used by beginners and experienced Creators alike to create and manage their own Minecraft content."
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
        milestoneDescription: "At DIGARC, I helped to create and support a scheduling tool that is used by over 100 colleges and universities across the US.",
        milestoneBullets: {
            "Automated Testing": [
                "As my team's sole QA Automation Engineer, I updated and maintained over 3000 Protractor automated tests, ensuring reliable frontend regression coverage.",
            ],
            "Teamwork and Collaboration": [
                "Often led team meetings that addressed product quality for production deployments.",
                "Crafted test plans and coordinated development progress tracking across development and QA teams."
            ]
        }
    },
    {
        milestoneLocation: "Andromeda Systems Inc.",
        milestoneTitle: "Software Design Engineer in Test",
        milestoneTimeline: "August 2019 - March 2021",
        milestoneDescription: "At ASI, I developed tests and frontend features for a web application that is used by the US Navy to manage aircraft maintenance.",
        milestoneBullets: {
            "Automated Testing": [
                "Developed over 200 automated C# Selenium WebDriver tests for frontend systems, boosting test coverage and deployment confidence."
            ],
            "Frontend Development": [
                "Engineered Angular components for administrative tools, combining database queries with UX enhancements to improve client operations."
            ],
        }
    },
    {
        milestoneLocation: "Lenel Systems International",
        milestoneTitle: "QA Automation Engineer Co-op",
        milestoneTimeline: "January 2018 - August 2018",
        milestoneDescription: "As a co-op at Lenel, I learned the ins and outs of professional software development and contributed to new product features.",
        milestoneBullets: {
            "Development Contributions": [
                "Contributed to new product development by writing Selenium automated tests for a cloud-based web application.",
            ],
            "Learning as a Co-op": [
                "Participated in product design meetings and collaborated on frontend feature testing and improvements.",
                "Pair programmed with senior Automation Engineers and learned about developing reliable software through thorough testing and quality assurance."
            ]
        }
    },
    {
        milestoneLocation: "Rochester Institute of Technology",
        milestoneTitle: "Bachelor of Science - Game Design and Development",
        milestoneTimeline: "August 2015 - May 2019",
        milestoneDescription: "I graduated from RIT with a degree in Game Design and Development, where I learned the fundamentals of software engineering and game design.",
        milestoneBullets: {
            "Education": [
                "My courses covered the fundamentals of software engineering with a focus on game design and computer mathematics.",
                "I was introduced to several programming languages including C++, C#, and JavaScript, as well as game engines like Unity and Unreal Engine.",
                "I also took several courses on Japanese language and culture, which has helped me appreciate cultural phenomena outside of the US."
            ],
            "Extracurriculars": [
                "I was a member of the RIT Dodgeball Club where I often won matches and once led my team to 1st place in a city-wide tournament.",
                "I was also a member of the Electronic Gaming Society where I got to meet other gamers and developers."
            ]
        }
    },
    {
        milestoneLocation: "Beacon, NY",
        milestoneTitle: "Born",
        milestoneTimeline: "August 11, 1997",
        milestoneDescription: "I came into existence.",
        milestoneBullets: {
            "Life back then...": [
                "Ate.",
                "Cried.",
                "Pooped.",
                "Slept."
            ],
            "Life now...": [
                "Eat.",
                "Cry (maybe).",
                "Code.",
                "Poop.",
                "Sleep (hopefully)."
            ]
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
        <Grid color='#bdeb92ff'
            component={Card}
            onClick={onClick}
            sx={{
                textAlign: 'start',
                p: 4,
                backgroundColor: '#222222ff',
                ":hover": {
                    cursor: 'pointer',
                    opacity: 0.8,
                    transform: 'scale(1.01)'
                },
                width: '30%',
                height: '50%',
                mx: 'auto'
            }}>
            <Typography fontFamily={'aArt'} variant="h4" gutterBottom>
                {milestoneLocation}
            </Typography>
            <Typography fontFamily={'aArt'} variant="h6" gutterBottom >
                {milestoneTitle}
            </Typography>
            <Typography fontFamily={'aArt'} variant="h6" >
                {milestoneTimeline}
            </Typography>
            <br />
            <Typography fontFamily={'Trap-Black'} variant="subtitle1" >
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

            <Grid container size={12}>
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