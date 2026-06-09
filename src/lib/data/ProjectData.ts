import websiteImg from '../../assets/images/website.png';
import legendsImg from '../../assets/images/legends.webp';
import mobvoteImg from '../../assets/images/mobvote.jpg';
import nimzeyImg from '../../assets/images/nimzey.png';
import mctoolsImg from '../../assets/images/mctools.png';

export type ProjectDataProps = {
    onClick?: () => void;
    title: string;
    img: string;
    description: string;
    link: string;
    degrees?: number;
}

export const projectData: ProjectDataProps[] = [
    {
        title: 'This Website!',
        img: websiteImg,
        description: 'My personal portfolio website built with React and TypeScript',
        link: 'https://github.com/Jeemzu/jeemzu.com',
        degrees: 0
    },
    {
        img: nimzeyImg,
        title: 'Nimzey',
        description: 'Nimzey runs in the background while you create, capturing timelapses, screenshots, GIFs, recordings, and tracking your creative journey.',
        link: 'https://nimzey.com/',
        degrees: -1,
    },
    {
        img: mctoolsImg,
        title: 'MCTools',
        description: 'MCTools is a multi-platform content management system for Minecraft content creators.',
        link: 'https://mctools.dev/',
        degrees: -1,
    },
    {
        img: legendsImg,
        title: 'Minecraft Legends Live Event',
        description: 'A Minecraft: Bedrock Edition Live Event hosted by Mojang Studios to celebrate the release of Minecraft Legends.',
        link: 'https://minecraft.fandom.com/wiki/Minecraft_Legends_Live_Event',
        degrees: 0,
    },
    {
        img: mobvoteImg,
        title: 'Minecraft Mob Vote 2022 Live Event',
        description: 'The first-ever Minecraft Live Event, hosted by Mojang Studios to celebrate the annual Mob Vote.',
        link: 'https://minecraft.fandom.com/wiki/Minecraft_Live_2022',
        degrees: -2
    },
];
