import { Typography, Grid, Divider, Card, CardContent, CardMedia, Container, IconButton, useMediaQuery, useTheme, Box, Fade } from "@mui/material";
import { projectData, type ProjectDataProps } from "../lib/data/ProjectData";
import Slider, { type Settings } from "react-slick";
import { onClickUrl } from "../utils/openInNewTab";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { FaCaretLeft, FaCaretRight, FaArrowRight } from "react-icons/fa6";
import React, { useState, useEffect, useRef } from "react";
import { FONTS } from "../lib/globals";

// Animated Arrow Component
const SwipeIndicator = ({ visible }: { visible: boolean }) => {
    return (
        <Fade in={visible} timeout={500}>
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    right: '10%',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                    color: '#bdeb92ff',
                    animation: 'bounce 2s infinite',
                    '@keyframes bounce': {
                        '0%, 20%, 50%, 80%, 100%': {
                            transform: 'translateY(-50%) translateX(0)',
                        },
                        '40%': {
                            transform: 'translateY(-50%) translateX(10px)',
                        },
                        '60%': {
                            transform: 'translateY(-50%) translateX(5px)',
                        },
                    },
                    // Hide after 5 seconds
                    animationDuration: '1.5s',
                }}
            >
                <FaArrowRight size={32} />
            </Box>
        </Fade>
    );
};

const ProjectCard = ({
    onClick,
    title,
    img,
    description,
    degrees,
}: ProjectDataProps) => {
    const theme = useTheme();
    const isMobile = useMediaQuery('(max-width:600px)');

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
                width: { xs: '90%', sm: '50%', md: '60%' },
                height: 'auto',
                mx: 'auto',
                transform: `rotate(${degrees}deg)`,
                position: 'relative', // Add this for the arrow positioning
            }}>
            <CardContent sx={{ color: theme.palette.primaryGreen.main }}>
                <CardMedia
                    component="img"
                    height={isMobile ? 200 : 300} // Responsive height
                    image={img}
                    alt={title}
                    sx={{ borderRadius: 2, mb: 2 }}
                    loading="lazy"
                />
                <Typography fontFamily={FONTS.A_ART} variant={isMobile ? "h5" : "h5"} gutterBottom>
                    {title}
                </Typography>
                <Typography fontFamily={FONTS.TRAP_BLACK} variant={isMobile ? "subtitle1" : "h6"} >
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
    const [showSwipeIndicator, setShowSwipeIndicator] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);
    const slider = React.useRef(null);

    // Intersection Observer to detect when slider comes into view
    useEffect(() => {
        if (!isMobile) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasInteracted) {
                    setShowSwipeIndicator(true);
                    // Hide indicator after 5 seconds
                    setTimeout(() => {
                        setShowSwipeIndicator(false);
                    }, 5000);
                }
            },
            { threshold: 0.5 }
        );

        if (sliderRef.current) {
            observer.observe(sliderRef.current);
        }

        return () => {
            if (sliderRef.current) {
                observer.unobserve(sliderRef.current);
            }
        };
    }, [isMobile, hasInteracted]);

    const sliderSettings: Settings = {
        infinite: true,
        speed: 800,
        slidesToShow: 1,
        slidesToScroll: 1,
        arrows: !isMobile,
        nextArrow: <CustomNextArrow />,
        prevArrow: <CustomPrevArrow />,
        swipe: true,
        touchMove: true,
        // Hide indicator when user starts interacting
        beforeChange: () => {
            if (isMobile && !hasInteracted) {
                setHasInteracted(true);
                setShowSwipeIndicator(false);
            }
        },
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
                    ref={sliderRef}
                    className="slider-container"
                    sx={{
                        position: 'relative',
                        '& .slick-arrow': {
                            display: 'none !important'
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

                    {/* Move SwipeIndicator outside the slider, positioned relative to container */}
                    {isMobile && (
                        <SwipeIndicator visible={showSwipeIndicator} />
                    )}
                </Container>
            </Grid>
        </Grid >
    );
};

export default Projects;