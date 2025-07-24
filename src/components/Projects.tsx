import { Typography, Grid, Divider, Card, CardContent } from "@mui/material";

type ProjectData = {
    title: string;
    img: string;
    description: string;
    link: string;
}

const projectData: ProjectData[] = [
    {
        img: 'https://images.unsplash.com/photo-1551963831-b3b1ca40c98e',
        title: 'Breakfast',
        description: 'A delicious breakfast spread.',
        link: 'https://example.com/breakfast',
    },
    {
        img: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d',
        title: 'Burger',
        description: 'A juicy burger with all the fixings.',
        link: 'https://example.com/burger',
    },
    {
        img: 'https://images.unsplash.com/photo-1522770179533-24471fcdba45',
        title: 'Camera',
        description: 'A high-quality camera for photography enthusiasts.',
        link: 'https://example.com/camera',
    },
    {
        img: 'https://images.unsplash.com/photo-1444418776041-9c7e33cc5a9c',
        title: 'Coffee',
        description: 'A steaming cup of coffee to kickstart your day.',
        link: 'https://example.com/coffee',
    },
];

const Projects = () => {
    return (
        <Grid container spacing={4} sx={{ justifyContent: 'center', textAlign: 'center', p: 4 }}>
            <Grid size={12}>
                <Typography
                    fontFamily={'aArt'}
                    variant="h2"
                >
                    Projects
                </Typography>
            </Grid>

            <Divider sx={{ width: '50%', height: '.001rem', backgroundColor: '#bdeb92ff', justifyContent: 'center', mx: 'auto' }} />

            <Grid size={6} sx={{ justifyContent: 'center', mx: 'auto' }}>
                {projectData.map((item) => (
                    <Card sx={{ width: '50%', mb: 2, mx: 'auto', background: "none", color: "#bdeb92ff", boxShadow: "0 0 20px #bdeb92ff" }} key={item.title}>
                        <CardContent>
                            <img
                                srcSet={`${item.img}?w=248&fit=crop&auto=format&dpr=2 2x`}
                                src={`${item.img}?w=248&fit=crop&auto=format`}
                                alt={item.title}
                                loading="lazy"
                            />
                            <Typography variant="h5" component="div">
                                {item.title}
                            </Typography>
                            <Typography sx={{ color: '#bdeb92ff' }} variant="body2" color="text.secondary">
                                {item.description}
                            </Typography>
                        </CardContent>
                    </Card>
                ))}
            </Grid>
        </Grid >
    );
};

export default Projects;