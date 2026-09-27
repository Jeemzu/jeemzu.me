import { Container } from "@mui/material";
import PageHeading from "../../components/shared/PageHeading";
import MyJourney from "./MyJourney";

const ExperiencePage = () => {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
      <PageHeading
        title="Experience"
        subtitle="My professional path and experiences in software engineering"
      />
      <MyJourney />
    </Container>
  );
};

export default ExperiencePage;
