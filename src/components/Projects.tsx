import { Typography, Grid, Divider, Card, CardContent, CardMedia, Container, IconButton, useMediaQuery, useTheme } from "@mui/material";
import { projectData, type ProjectDataProps } from "../lib/data/ProjectData";
import Slider, { type Settings } from "react-slick";
import { onClickUrl } from "../utils/openInNewTab";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { FaCaretLeft, FaCaretRight } from "react-icons/fa6";
import React from "react";
import { FONTS } from "../lib/globals";

const ProjectCard = ({
    onClick,
    title,
    img,
    description,
    degrees,
}: ProjectDataProps) => {
    const theme = useTheme();

    return (
        <Card onClick={onClick}
            color={theme.palette.primaryGreen.main}
            sx={{
                textAlign: 'center',
                p: 3,
                backgroundColor: theme.palette.darkBackground.main,
                ":hover": {
                    cursor: 'pointer',
                    opacity: 0.8,
                    transform: 'scale(1.01)'
                },
                width: { xs: '80%', sm: '50%', md: '60%' },
                height: 'auto',
                mx: 'auto',
                transform: `rotate(${degrees}deg)`,
            }}>
            <CardContent sx={{ color: theme.palette.primaryGreen.main }}>
                <CardMedia
                    component="img"
                    height={300}
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
    const theme = useTheme();

    return (
        <IconButton
            style={{
                ...style,
                display: 'block',
                left: '-50px',
                zIndex: 2,
                color: theme.palette.primaryGreen.main,
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
            }}
            onClick={onClick}
            sx={{
                '&:hover': {
                    backgroundColor: theme.palette.darkBackground.light,
                },
            }}
        >
            <FaCaretLeft size={32} />
        </IconButton>
    );
};

const CustomNextArrow = ({ style, onClick }: any) => {
    const theme = useTheme();

    return (
        <IconButton
            style={{
                ...style,
                display: 'block',
                right: '-50px',
                zIndex: 2,
                color: theme.palette.primaryGreen.main,
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
            }}
            onClick={onClick}
            sx={{
                '&:hover': {
                    backgroundColor: theme.palette.darkBackground.light,
                },
            }}
        >
            <FaCaretRight size={32} />
        </IconButton>
    );
};

const Projects = () => {
    const isMobile = useMediaQuery('(max-width:600px)');
    const slider = React.useRef(null);

    const sliderSettings: Settings = {
        infinite: true,
        speed: 800,
        slidesToShow: 1,
        slidesToScroll: 1,
        arrows: !isMobile,
        nextArrow: <CustomNextArrow />,
        prevArrow: <CustomPrevArrow />,
    };

    const theme = useTheme();

    return (
        <Grid container spacing={4}>
            <Grid size={12} sx={{ justifyContent: 'center', textAlign: 'center' }}>
                <Typography
                    fontFamily={FONTS.A_ART}
                    variant={isMobile ? "h3" : "h2"}
                >
                    Projects
                </Typography>
            </Grid>

            <Divider sx={{ width: '50%', height: '.001rem', backgroundColor: theme.palette.primaryGreen.main, justifyContent: 'center', mx: 'auto' }} />

            <Grid size={12} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
                <Container
                    className="slider-container"
                    sx={{
                        '& .slick-arrow': {
                            display: 'none !important' // Hide default arrows
                        }
                    }}
                >
                    <Slider ref={slider} {...sliderSettings}>
                        {projectData.map((project, idx) => (
                            <ProjectCard
                                key={idx}
                                onClick={project.link && project.link !== '#' ? onClickUrl(project.link) : undefined}
                                title={project.title}
                                img={project.img}
                                description={project.description}
                                degrees={project.degrees}
                                link={project.link}
                            />
                        ))}
                    </Slider>
                </Container>
            </Grid>
        </Grid >
    );
};

export default Projects;