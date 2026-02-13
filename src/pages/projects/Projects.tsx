import { Typography, Card, CardContent, CardMedia, useTheme, Box } from "@mui/material";
import { projectData, type ProjectDataProps } from "../../lib/data/ProjectData";
import { onClickUrl } from "../../utils/openInNewTab";
import { ANIMATIONS, EFFECTS, FONTS } from "../../lib/globals";
import { useScrollAnimation } from "../../utils/useScrollAnimation";

const ProjectCard = ({
    onClick,
    title,
    img,
    description,
    index = 0,
}: ProjectDataProps & { index?: number }) => {
    const theme = useTheme();
    const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

    return (
        <Box
            ref={ref}
            sx={{
                ...ANIMATIONS.FADE_IN,
                ...(isVisible && ANIMATIONS.FADE_IN_VISIBLE),
                transitionDelay: `${index * ANIMATIONS.STAGGER_DELAY}s`,
            }}
        >
            <Card onClick={onClick}
                sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: theme.palette.cardBackground.main,
                    boxShadow: EFFECTS.CARD_SHADOW,
                    transition: EFFECTS.TRANSITION,
                    overflow: 'hidden',
                    ":hover": {
                        cursor: onClick ? 'pointer' : 'default',
                        transform: onClick ? EFFECTS.HOVER_SCALE : 'none',
                        boxShadow: onClick ? EFFECTS.CARD_SHADOW_HOVER : EFFECTS.CARD_SHADOW,
                    },
                }}>
                <Box
                    sx={{
                        width: '100%',
                        height: '200px',
                        overflow: 'hidden',
                        backgroundColor: theme.palette.darkBackground.main,
                    }}
                >
                    <CardMedia
                        component="img"
                        image={img}
                        alt={title}
                        sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }}
                        loading="lazy"
                    />
                </Box>
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    <Typography
                        fontFamily={FONTS.ANTON}
                        variant="h4"
                        gutterBottom
                        sx={{ color: theme.palette.primaryGreen.main }}
                    >
                        {title}
                    </Typography>
                    <Typography
                        fontFamily={FONTS.NECTO_MONO}
                        variant="body1"
                        sx={{
                            color: theme.palette.textSecondary.main,
                            lineHeight: 1.7,
                        }}
                    >
                        {description}
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
};

const Projects = () => {
    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                },
                gap: 4,
                maxWidth: '900px',
                mx: 'auto',
            }}
        >
            {projectData.map((project, idx) => (
                <ProjectCard
                    key={idx}
                    onClick={project.link && project.link !== '#' ? onClickUrl(project.link) : undefined}
                    title={project.title}
                    img={project.img}
                    description={project.description}
                    link={project.link}
                    index={idx}
                />
            ))}
        </Box>
    );
};

export default Projects;
