import {
  Container,
  Grid,
  Typography,
  useTheme,
  Box,
  IconButton,
  Stack,
  Modal,
} from "@mui/material";
import React, { useState } from "react";
import { EFFECTS, FONTS, LINKS, MEDIEVAL_EFFECTS } from "../../lib/globals";
import { FaGithub, FaLinkedin, FaEnvelope, FaPaw } from "react-icons/fa6";
import { onClickUrl } from "../../utils/openInNewTab";
import beansImg from "../../assets/images/beans.png";
import ContactModal from "../ContactModal";

const Footer = () => {
  const theme = useTheme();
  const [openImage, setOpenImage] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <React.Fragment>
      <Box
        sx={{
          borderTop: MEDIEVAL_EFFECTS.FRAME_BORDER,
          boxShadow: "inset 0 1px 0 rgba(232, 207, 143, 0.10)",
          backgroundImage:
            "linear-gradient(180deg, rgba(27, 31, 40, 0.55) 0%, rgba(8, 10, 15, 0.85) 100%)",
          mt: 4,
          py: 3,
          px: 2,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={2}>
            {/* Left Section - Quick Links */}
            <Grid size={{ xs: 12, md: 6 }} sx={{ textAlign: { xs: "center", md: "left" } }}>
              <Stack spacing={0.5} sx={{ alignItems: { xs: "center", md: "flex-start" } }}>
                <Typography
                  variant="body2"
                  fontFamily={FONTS.MEDIEVAL_DISPLAY}
                  sx={{
                    color: theme.palette.medievalGold.main,
                    letterSpacing: "0.12em",
                    mb: 0.5,
                  }}
                >
                  Connect
                </Typography>
                <Stack direction="row" spacing={1.5}>
                  <IconButton
                    size="small"
                    onClick={onClickUrl(LINKS.GITHUB)}
                    sx={{
                      color: theme.palette.parchment.dark,
                      transition: EFFECTS.TRANSITION,
                      "&:hover": {
                        color: theme.palette.medievalGold.light,
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    <FaGithub size={20} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={onClickUrl(LINKS.LINKEDIN)}
                    sx={{
                      color: theme.palette.parchment.dark,
                      transition: EFFECTS.TRANSITION,
                      "&:hover": {
                        color: theme.palette.medievalGold.light,
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    <FaLinkedin size={20} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => setContactOpen(true)}
                    sx={{
                      color: theme.palette.parchment.dark,
                      transition: EFFECTS.TRANSITION,
                      "&:hover": {
                        color: theme.palette.medievalGold.light,
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    <FaEnvelope size={20} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => setOpenImage(true)}
                    sx={{
                      color: theme.palette.parchment.dark,
                      transition: EFFECTS.TRANSITION,
                      "&:hover": {
                        color: theme.palette.medievalGold.light,
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    <FaPaw size={20} />
                  </IconButton>
                </Stack>
              </Stack>
            </Grid>

            {/* Right Section - Copyright */}
            <Grid
              size={{ xs: 12, md: 6 }}
              sx={{ textAlign: { xs: "center", md: "right" } }}
            >
              <Typography
                variant="caption"
                fontFamily={FONTS.MEDIEVAL_SERIF}
                sx={{
                  color: theme.palette.parchment.dark,
                  display: "block",
                  mb: 0.25,
                }}
              >
                © 2026 James Friedenberg
              </Typography>
              <Typography
                variant="caption"
                fontFamily={FONTS.MEDIEVAL_SERIF}
                sx={{
                  color: theme.palette.parchment.dark,
                  opacity: 0.7,
                  fontSize: "0.7rem",
                }}
              >
                Built with React + TypeScript
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Cats Image Modal */}
      <Modal
        open={openImage}
        onClose={() => setOpenImage(false)}
        slotProps={{
          backdrop: {
            sx: { backgroundColor: "rgba(0, 0, 0, 0.9)" },
          },
        }}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
        onClick={() => setOpenImage(false)}
      >
        <Box sx={{ outline: "none" }}>
          <img
            src={beansImg}
            alt="Our Cats"
            style={{
              maxWidth: "60vw",
              maxHeight: "60vh",
              objectFit: "contain",
              borderRadius: "8px",
              boxShadow: "0 8px 40px rgba(0, 0, 0, 0.8)",
            }}
          />
        </Box>
      </Modal>
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </React.Fragment>
  );
};

export default Footer;
