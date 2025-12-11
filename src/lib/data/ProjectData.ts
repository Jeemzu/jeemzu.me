import websiteImg from '../../assets/images/website.png';
import filterkitImg from '../../assets/images/filterkit.png';
import legendsImg from '../../assets/images/legends.webp';
import mobvoteImg from '../../assets/images/mobvote.jpg';

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
        img: filterkitImg,
        title: 'Filter Pipeline',
        description: 'A toolkit for crafting beautiful, professional-grade visual effects with intuitive, node-based editing.',
        link: '#',
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
