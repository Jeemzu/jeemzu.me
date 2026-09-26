import {
  Typography,
  Button,
  useTheme,
  Container,
  Box,
  Card,
  CardContent,
  Chip,
} from "@mui/material";
import {
  FaGamepad,
  FaChartSimple,
  FaDiceD20,
  FaSackDollar,
  FaPenRuler,
  FaCode,
} from "react-icons/fa6";
import { Link } from "wouter";
import { EFFECTS, FONTS } from "../../lib/globals";

interface AppCardDef {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  note?: string;
}

const APPS: AppCardDef[] = [
  {
    title: "Games",
    description:
      "Snake, Tetris, Brick Break, Pong, and more — all playable in the browser.",
    icon: <FaGamepad size={42} />,
    path: "/games",
  },
  {
    title: "Algorithm Visualizer",
    description:
      "Watch sorting, pathfinding, and tree algorithms step through their work.",
    icon: <FaChartSimple size={42} />,
    path: "/algoviz",
  },
  {
    title: "AI RPG",
    description:
      "A text adventure narrated by an AI game master. Fight, explore, and talk your way through.",
    icon: <FaDiceD20 size={42} />,
    path: "/rpg",
  },
  {
    title: "Budgetize Me",
    description:
      "Plan your bills, debts, and paychecks with calendars and projections.",
    icon: <FaSackDollar size={42} />,
    path: "/budgetize",
    note: "Sign in to save",
  },
  {
    title: "Level Editor",
    description: "Build your own platformer levels and play them.",
    icon: <FaPenRuler size={42} />,
    path: "/editor",
    note: "Sign-in required",
  },
];

const AppCard = ({ title, description, icon, path, note }: AppCardDef) => {
  const theme = useTheme();

  return (
    <Link href={path} style={{ textDecoration: "none" }}>
      <Card
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: theme.palette.cardBackground.main,
          boxShadow: EFFECTS.CARD_SHADOW,
          transition: EFFECTS.TRANSITION,
          cursor: "pointer",
          ":hover": {
            transform: EFFECTS.HOVER_SCALE,
            boxShadow: EFFECTS.CARD_SHADOW_HOVER,
          },
        }}
      >
        <CardContent sx={{ flexGrow: 1, p: 3 }}>
          <Box sx={{ color: theme.palette.primaryGreen.main, mb: 1.5 }}>
            {icon}
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexWrap: "wrap",
              mb: 1,
            }}
          >
            <Typography
              fontFamily={FONTS.NECTO_MONO}
              variant="h5"
              sx={{ color: theme.palette.primaryGreen.main }}
            >
              {title}
            </Typography>
            {note && (
              <Chip
                label={note}
                size="small"
                sx={{
                  bgcolor: "rgba(168, 214, 126, 0.12)",
                  color: theme.palette.primaryGreen.main,
                  fontFamily: FONTS.NECTO_MONO,
                  fontSize: "0.7rem",
                  border: "1px solid rgba(168, 214, 126, 0.25)",
                }}
              />
            )}
          </Box>
          <Typography
            fontFamily={FONTS.NECTO_MONO}
            variant="body1"
            sx={{ color: theme.palette.textSecondary.main, lineHeight: 1.7 }}
          >
            {description}
          </Typography>
        </CardContent>
      </Card>
    </Link>
  );
};

const LandingPage = () => {
  const theme = useTheme();

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
      <Typography
        fontFamily={FONTS.POIRET_ONE}
        variant="h1"
        sx={{
          textAlign: "center",
          mb: { xs: 2, md: 3 },
          color: theme.palette.primaryGreen.main,
        }}
      >
        jeemzu.me
      </Typography>
      <Typography
        fontFamily={FONTS.NECTO_MONO}
        variant="h6"
        sx={{
          textAlign: "center",
          mb: { xs: 4, md: 6 },
          color: theme.palette.textSecondary.main,
          maxWidth: "600px",
          mx: "auto",
        }}
      >
        Interactive apps, games, and tools — pick one and dive in.
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
          },
          gap: 4,
          mb: { xs: 5, md: 7 },
        }}
      >
        {APPS.map((app) => (
          <AppCard key={app.path} {...app} />
        ))}
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Link href="/developer">
          <Button
            variant="outlined"
            startIcon={<FaCode />}
            sx={{
              color: theme.palette.textSecondary.main,
              borderColor: "rgba(255,255,255,0.2)",
              fontFamily: FONTS.NECTO_MONO,
              px: 3,
              py: 1,
              transition: EFFECTS.TRANSITION,
              "&:hover": {
                borderColor: theme.palette.primaryGreen.main,
                color: theme.palette.primaryGreen.main,
                bgcolor: "rgba(168, 214, 126, 0.06)",
              },
            }}
          >
            Learn About the Developer
          </Button>
        </Link>
      </Box>
    </Container>
  );
};

export default LandingPage;
