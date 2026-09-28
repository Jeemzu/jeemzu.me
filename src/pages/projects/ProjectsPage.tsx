import { Container } from "@mui/material";
import PageHeading from "../../components/shared/PageHeading";
import Projects from "./Projects";

const ProjectsPage = () => {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
      <PageHeading
        title="Projects"
        subtitle="A showcase of my recent work and side projects"
      />
      <Projects />
    </Container>
  );
};

export default ProjectsPage;
