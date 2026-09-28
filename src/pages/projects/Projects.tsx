import {
  Typography,
  Card,
  CardContent,
  CardMedia,
  useTheme,
  Box,
} from "@mui/material";
import { projectData, type ProjectDataProps } from "../../lib/data/ProjectData";
import { onClickUrl } from "../../utils/openInNewTab";
import { useLocation } from "wouter";
import { ANIMATIONS } from "../../lib/globals";
import {
  bodySx,
  headingSx,
  panelInteractiveSx,
} from "../../lib/medievalStyles";
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
      <Card
        onClick={onClick}
        sx={{
          ...panelInteractiveSx,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          ...(!onClick && {
            cursor: "default",
            ":hover": { transform: "none" },
          }),
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: "200px",
            overflow: "hidden",
            backgroundColor: theme.palette.medievalStone.dark,
            borderBottom: "1px solid rgba(200, 162, 74, 0.25)",
          }}
        >
          <CardMedia
            component="img"
            image={img}
            alt={title}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            loading="lazy"
          />
        </Box>
        <CardContent sx={{ flexGrow: 1, p: 3 }}>
          <Typography variant="h4" gutterBottom sx={headingSx}>
            {title}
          </Typography>
          <Typography component="p" variant="body1" sx={{ ...bodySx, m: 0 }}>
            {description}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

const Projects = () => {
  const [, navigate] = useLocation();
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(3, 1fr)",
        },
        gap: 4,
        maxWidth: "1500px",
        mx: "auto",
      }}
    >
      {projectData.map((project, idx) => (
        <ProjectCard
          key={idx}
          onClick={
            project.link && project.link !== "#"
              ? project.isInternal
                ? () => navigate(project.link)
                : onClickUrl(project.link)
              : undefined
          }
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
