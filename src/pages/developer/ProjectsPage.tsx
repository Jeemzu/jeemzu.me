import { Container } from "@mui/material";
import PageHeading from "../../components/shared/PageHeading";
import ProjectGrid from "./ProjectGrid";

const ProjectsPage = () => {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
      <PageHeading
        title="Projects"
        subtitle="Selected projects and products I've built"
      />
      <ProjectGrid />
    </Container>
  );
};

export default ProjectsPage;
