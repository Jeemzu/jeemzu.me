import {
  Typography,
  Stack,
  Button,
  useTheme,
  useMediaQuery,
  Container,
  Box,
} from "@mui/material";
import { FaEnvelope } from "react-icons/fa6";
import { useState } from "react";
import { EFFECTS, FONTS } from "../../lib/globals";
import LandingChat from "./LandingChat";
import ContactModal from "../../components/ContactModal";

const AboutPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery("(max-width:900px)");
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <Container
      maxWidth="xl"
      sx={{ position: "relative", py: { xs: 3, md: 4 } }}
    >
      <Typography
        fontFamily={FONTS.POIRET_ONE}
        variant={isMobile ? "h3" : "h1"}
        sx={{
          textAlign: "center",
          mb: { xs: 2, md: 3 },
          color: theme.palette.primaryGreen.main,
        }}
      >
        James Friedenberg
      </Typography>

      <Box
        sx={{
          backgroundColor: theme.palette.cardBackground.main,
          borderRadius: 2,
          p: { xs: 2, md: 3 },
          boxShadow: EFFECTS.CARD_SHADOW,
          width: "100%",
        }}
      >
        <Typography
          fontFamily={FONTS.NECTO_MONO}
          variant={isMobile ? "h6" : "h4"}
          sx={{
            mb: { xs: 1.5, md: 2 },
            color: theme.palette.text.primary,
            fontWeight: 500,
            textAlign: "left",
          }}
        >
          Software Engineer at Mojang Studios
        </Typography>

        <Typography
          fontFamily={FONTS.NECTO_MONO}
          variant={isMobile ? "body1" : "h6"}
          sx={{
            mb: { xs: 1.5, md: 2 },
            color: theme.palette.textSecondary.main,
            fontSize: { xs: "1rem", md: "1.125rem" },
            textAlign: "left",
          }}
        >
          Developing cool new features for Minecraft. Passionate about clean
          code, collaboration, gaming, and woodworking.
        </Typography>

        <Stack
          direction={isMobile ? "column" : "row"}
          sx={{
            justifyContent: "flex-start",
            alignItems: isMobile ? "stretch" : "center",
            gap: 1.5,
          }}
          paddingTop={0.5}
        >
          <Button
            variant="contained"
            size="medium"
            fullWidth={isMobile}
            startIcon={<FaEnvelope />}
            onClick={() => setContactOpen(true)}
            sx={{
              backgroundColor: theme.palette.primaryGreen.main,
              color: theme.palette.background.default,
              fontFamily: FONTS.NECTO_MONO,
              px: 3,
              py: 1,
              fontSize: "1rem",
              whiteSpace: "nowrap",
              transition: EFFECTS.TRANSITION,
              "&:hover": {
                backgroundColor: theme.palette.softGreen.main,
                transform: EFFECTS.HOVER_SCALE,
                boxShadow: EFFECTS.CARD_SHADOW_HOVER,
              },
            }}
          >
            Contact
          </Button>
        </Stack>
      </Box>

      <Box sx={{ mt: { xs: 3, md: 4 } }}>
        <LandingChat />
      </Box>

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </Container>
  );
};

export default AboutPage;
