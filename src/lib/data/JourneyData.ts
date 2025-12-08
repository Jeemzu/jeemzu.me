import type { SxProps } from "@mui/material";
import type { JourneyCardModal } from "../MyJourneyTypes";

export const modalStyle: SxProps = {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#1f1f1f',
    border: '1px solid rgba(168, 214, 126, 0.3)',
    position: 'fixed',
    width: 'calc(100vw - 32px)',
    maxWidth: '700px',
    maxHeight: '85vh',
    p: { xs: 3, md: 4 },
    overflow: 'auto',
    borderRadius: 3,
    boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5)',
};

export const cardData: JourneyCardModal[] = [
    {
        milestoneLocation: "Mojang Studios",
        milestoneTitle: "Software Engineer",
        milestoneTimeline: "March 2022 - Present",
        milestoneDescription: "At Mojang Studios, I collaborate with some of the world's best gameplay designers on Minecraft: Bedrock Edition!",
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
        },
        degrees: 2,
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
        },
        degrees: -2
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
        },
        degrees: 2
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
        },
        degrees: -1
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
        },
        degrees: 2
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
                "Game.",
                "Sleep."
            ]
        },
        degrees: -2
    },
];
