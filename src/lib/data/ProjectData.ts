
type ProjectData = {
    title: string;
    img: string;
    description: string;
    link: string;
    degrees?: number;
}

export const projectData: ProjectData[] = [
    {
        img: 'https://images.unsplash.com/photo-1551963831-b3b1ca40c98e',
        title: 'Breakfast',
        description: 'A delicious breakfast spread.',
        link: 'https://example.com/breakfast',
        degrees: 1,
    },
    {
        img: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d',
        title: 'Burger',
        description: 'A juicy burger with all the fixings.',
        link: 'https://example.com/burger',
        degrees: -1,
    },
    {
        img: 'https://images.unsplash.com/photo-1522770179533-24471fcdba45',
        title: 'Camera',
        description: 'A high-quality camera for photography enthusiasts.',
        link: 'https://example.com/camera',
        degrees: 0,
    },
    {
        img: 'https://images.unsplash.com/photo-1444418776041-9c7e33cc5a9c',
        title: 'Coffee',
        description: 'A steaming cup of coffee to kickstart your day.',
        link: 'https://example.com/coffee',
        degrees: -2
    },
];