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
import { FONTS } from "../../lib/globals";
import { goldButtonSx, panelSx } from "../../lib/medievalStyles";
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
        fontFamily={FONTS.MEDIEVAL_DISPLAY}
        variant={isMobile ? "h3" : "h1"}
        sx={{
          textAlign: "center",
          mb: { xs: 2, md: 3 },
          fontWeight: 700,
          letterSpacing: "0.06em",
          color: theme.palette.medievalGold.light,
          backgroundImage:
            "linear-gradient(110deg, #8a6a24 0%, #c8a24a 26%, #f8ecc4 46%, #c8a24a 66%, #8a6a24 100%)",
          backgroundSize: "260% 100%",
          backgroundPosition: "-70% 0",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 2px 3px rgba(0, 0, 0, 0.75))",
          animation:
            "jz-rise 0.7s ease-out both, jz-gleam 7s ease-in-out 1.2s infinite",
        }}
      >
        James Friedenberg
      </Typography>

      <Box
        sx={{
          ...panelSx,
          p: { xs: 2, md: 3 },
          width: "100%",
        }}
      >
        <Typography
          fontFamily={FONTS.MEDIEVAL_DISPLAY}
          variant={isMobile ? "h6" : "h4"}
          sx={{
            mb: { xs: 1.5, md: 2 },
            color: theme.palette.medievalGold.light,
            letterSpacing: "0.04em",
            fontWeight: 600,
            textAlign: "left",
          }}
        >
          Software Engineer at Mojang Studios
        </Typography>

        <Typography
          component="p"
          fontFamily={FONTS.MEDIEVAL_SERIF}
          variant={isMobile ? "body1" : "h6"}
          sx={{
            mt: 0,
            mb: { xs: 1.5, md: 2 },
            color: theme.palette.parchment.dark,
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
              ...goldButtonSx,
              px: 3,
              py: 1,
              fontSize: "1rem",
              whiteSpace: "nowrap",
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
