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
        milestoneLocation: "Microsoft (Mojang Studios)",
        milestoneTitle: "Software Engineer",
        milestoneTimeline: "March 2022 - June 2026",
        milestoneDescription: "At Mojang Studios (Microsoft), I worked alongside world-class gameplay designers and engineers on Minecraft: Bedrock Edition — building live event platforms, developer tooling, and cloud infrastructure at scale.",
        milestoneBullets: {
            "Minecraft Live Events": [
                "Engineered Minecraft's first automated multiplayer performance testing framework, achieving an 8x server capacity increase (10 → 80 players) and cutting Azure infrastructure costs by 88% (~$20k+ saved per event).",
                "Developed the foundational prototype and gameplay systems for the Minecraft Legends promotional live event, reaching 3M+ players and driving an estimated $6M in franchise marketing value.",
            ],
            "Developer Tooling": [
                "Modernized the MCTools TypeScript codebase and expanded creator content validation suites, replacing manual workflows with automated pipelines that cut hundreds of engineering labor hours per release cycle.",
                "Designed a telemetry and observability framework for MCTools using Azure Application Insights, enabling custom event instrumentation, real-time monitoring, and issue detection across the platform.",
                "Developed a localization framework bringing MCTools into compliance with the minecraft.net domain and making it available in 20+ languages.",
            ],
            "Leadership": [
                "Mentored and onboarded new engineers to the Minecraft web and platform stack, providing guidance on React, TypeScript, deployment workflows, and telemetry tooling.",
            ],
        },
        degrees: 2,
    },
    {
        milestoneLocation: "DIGARC",
        milestoneTitle: "Software Design Engineer in Test",
        milestoneTimeline: "March 2021 - March 2022",
        milestoneDescription: "At DIGARC, I helped create and support a scheduling tool used by over 100 colleges and universities across the US.",
        milestoneBullets: {
            "Automated Testing": [
                "Engineered and maintained several hundred automated E2E tests using Cypress and Vitest, ensuring reliable frontend regression coverage.",
                "Spearheaded the adoption of modern testing frameworks (Vitest, Cypress) to replace legacy test infrastructure.",
            ],
            "Teamwork and Collaboration": [
                "Authored detailed test plans and tracked quality initiatives via Jira across an Agile team of developers, testers, and a PM.",
                "Led team meetings to address product quality and coordinate deployment readiness.",
            ]
        },
        degrees: -2
    },
    {
        milestoneLocation: "Andromeda Systems Inc.",
        milestoneTitle: "Software Design Engineer in Test",
        milestoneTimeline: "August 2019 - March 2021",
        milestoneDescription: "At ASI, I developed tests and frontend features for a web application used by the US Navy to manage aircraft maintenance.",
        milestoneBullets: {
            "Automated Testing": [
                "Developed 500+ frontend automated tests for an inventory management application used by the U.S. Navy for aircraft maintenance tracking.",
            ],
            "Frontend Development": [
                "Designed and built dozens of Angular components using TypeScript in an Agile environment, enhancing administrative tooling for client operations.",
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
