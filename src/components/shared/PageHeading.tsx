import { Box, Typography } from "@mui/material";
import { FONTS } from "../../lib/globals";

interface PageHeadingProps {
  title: string;
  subtitle?: string;
}

/** Gilded page title with a carved divider, shared by the top-level pages. */
const PageHeading = ({ title, subtitle }: PageHeadingProps) => (
  <>
    <Typography
      fontFamily={FONTS.MEDIEVAL_DISPLAY}
      variant="h1"
      sx={{
        textAlign: "center",
        mb: { xs: 2, md: 2.5 },
        fontSize: { xs: "2.6rem", sm: "3rem", md: "3.5rem" },
        fontWeight: 700,
        letterSpacing: "0.08em",
        color: "medievalGold.light",
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
      {title}
    </Typography>

    {/* Gold rule with a central lozenge, echoing a carved chapel divider. */}
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1.5,
        maxWidth: 420,
        mx: "auto",
        mb: subtitle ? { xs: 2.5, md: 3 } : { xs: 4, md: 6 },
      }}
    >
      <Box
        sx={{
          flex: 1,
          height: "1px",
          transformOrigin: "right center",
          background:
            "linear-gradient(90deg, transparent, rgba(200, 162, 74, 0.7))",
          animation: "jz-line 0.8s ease-out 0.25s both",
        }}
      />
      <Box
        sx={{
          width: 9,
          height: 9,
          transform: "rotate(45deg)",
          backgroundColor: "medievalGold.main",
          boxShadow: "0 0 10px rgba(200, 162, 74, 0.55)",
          animation: "jz-lozenge 0.6s ease-out 0.55s both",
        }}
      />
      <Box
        sx={{
          flex: 1,
          height: "1px",
          transformOrigin: "left center",
          background:
            "linear-gradient(90deg, rgba(200, 162, 74, 0.7), transparent)",
          animation: "jz-line 0.8s ease-out 0.25s both",
        }}
      />
    </Box>

    {subtitle && (
      <Typography
        component="p"
        fontFamily={FONTS.MEDIEVAL_SERIF}
        variant="h6"
        sx={{
          textAlign: "center",
          mt: 0,
          mb: { xs: 4, md: 6 },
          color: "parchment.dark",
          fontStyle: "italic",
          maxWidth: "600px",
          mx: "auto",
          animation: "jz-rise 0.6s ease-out 0.35s both",
        }}
      >
        {subtitle}
      </Typography>
    )}
  </>
);

export default PageHeading;
