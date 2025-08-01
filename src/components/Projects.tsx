import { Typography, Grid, Divider, Card, CardContent, CardMedia, Container, IconButton, Skeleton } from "@mui/material";
import { FaCaretLeft, FaCaretRight } from "react-icons/fa6";
import { projectData, type ProjectDataProps } from "../lib/data/ProjectData";
import { onClickUrl } from "../utils/openInNewTab";
import { FONTS } from "../lib/globals";
import React, { useState } from "react";
import Slider, { type Settings } from "react-slick";

const ProjectCard = ({
    onClick,
    title,
    img,
    description,
    degrees,
}: ProjectDataProps) => {
    return (
        <Card onClick={onClick}
            color='#bdeb92ff'
            sx={{
                textAlign: 'center',
                p: 3,
                backgroundColor: '#222222ff',
                ":hover": {
                    cursor: 'pointer',
                    opacity: 0.8,
                    transform: 'scale(1.01)'
                },
                width: '50%',
                height: 'auto',
                mx: 'auto',
                transform: `rotate(${degrees}deg)`,
            }}>
            <CardContent sx={{ color: '#bdeb92ff' }}>
                <CardMedia
                    component="img"
                    height={200}
                    image={img}
                    alt={title}
                    sx={{ borderRadius: 2, mb: 2 }}
                    loading="lazy"
                />
                <Typography fontFamily={FONTS.A_ART} variant="h4" gutterBottom>
                    {title}
                </Typography>
                <Typography fontFamily={FONTS.TRAP_BLACK} variant="h6" gutterBottom >
                    {description}
                </Typography>
            </CardContent>
        </Card>
    );
};

// Custom Arrow Components
const CustomPrevArrow = ({ style, onClick }: any) => {
    return (
        <IconButton
            style={{
                ...style,
                display: 'block',
                left: '-50px',
                zIndex: 2,
                color: '#bdeb92ff',
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
            }}
            onClick={onClick}
            sx={{
                '&:hover': {
                    backgroundColor: 'rgba(189, 235, 146, 0.1)',
                },
            }}
        >
            <FaCaretLeft size={32} />
        </IconButton>
    );
};

const CustomNextArrow = ({ style, onClick }: any) => {
    return (
        <IconButton
            style={{
                ...style,
                display: 'block',
                right: '-50px',
                zIndex: 2,
                color: '#bdeb92ff',
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
            }}
            onClick={onClick}
            sx={{
                '&:hover': {
                    backgroundColor: 'rgba(189, 235, 146, 0.1)',
                },
            }}
        >
            <FaCaretRight size={32} />
        </IconButton>
    );
};

// Slider Loading Component
const SliderSkeleton = () => (
    <Container sx={{ textAlign: 'center' }}>
        <Skeleton
            variant="rectangular"
            height={400}
            sx={{
                backgroundColor: '#333',
                borderRadius: 2
            }}
        />
    </Container>
);

const Projects = () => {
    const [isLoading, setIsLoading] = useState(true);
    const slider = React.useRef(null);

    const sliderSettings: Settings = {
        infinite: true,
        speed: 800,
        slidesToShow: 1,
        slidesToScroll: 1,
        arrows: true,
        nextArrow: <CustomNextArrow />,
        prevArrow: <CustomPrevArrow />,
        onInit: () => setIsLoading(false),
    };

    return (
        <Grid container spacing={4}>
            <Grid size={12} sx={{ justifyContent: 'center', textAlign: 'center' }}>
                <Typography
                    fontFamily={FONTS.A_ART}
                    variant="h2"
                >
                    Projects
                </Typography>
            </Grid>

            <Divider sx={{ width: '50%', height: '.001rem', backgroundColor: '#bdeb92ff', justifyContent: 'center', mx: 'auto' }} />

            <Grid size={12} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
                {isLoading ? (
                    <SliderSkeleton />
                ) : (
                    <Container className="slider-container">
                        <Slider ref={slider} {...sliderSettings}>
                            {projectData.map((project, idx) => (
                                <ProjectCard
                                    key={idx}
                                    onClick={project.link !== '#' ? onClickUrl(project.link) : undefined}
                                    title={project.title}
                                    img={project.img}
                                    description={project.description}
                                    degrees={project.degrees || 0}
                                    link={project.link}
                                />
                            ))}
                        </Slider>
                    </Container>
                )}
            </Grid>
        </Grid >
    );
};

export default Projects;