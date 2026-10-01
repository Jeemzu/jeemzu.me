import { Container } from "@mui/material";
import PageHeading from "../../components/shared/PageHeading";
import ExperienceTimeline from "./ExperienceTimeline";

const ExperiencePage = () => {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
      <PageHeading
        title="Experience"
        subtitle="My professional path and experiences in software engineering"
      />
      <ExperienceTimeline />
    </Container>
  );
};

export default ExperiencePage;
