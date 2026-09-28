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
import { FONTS, MEDIEVAL_EFFECTS } from "../../lib/globals";
import PageHeading from "../../components/shared/PageHeading";

type GlassAccent =
  | "glassRuby"
  | "glassSapphire"
  | "glassEmerald"
  | "glassAmber"
  | "glassAmethyst";

interface AppCardDef {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  accent: GlassAccent;
  note?: string;
  /** CSS animation shorthand played on the icon while its card is hovered. */
  iconAnimation: string;
  iconOrigin?: string;
}

const APPS: AppCardDef[] = [
  {
    title: "Games",
    description:
      "Snake, Tetris, Brick Break, Pong, and more — all playable in the browser.",
    icon: <FaGamepad size={34} />,
    path: "/games",
    accent: "glassEmerald",
    iconAnimation: "jz-rumble 0.6s linear both",
  },
  {
    title: "Algorithm Visualizer",
    description:
      "Watch sorting, pathfinding, and tree algorithms step through their work.",
    icon: <FaChartSimple size={34} />,
    path: "/algoviz",
    accent: "glassSapphire",
    iconAnimation: "jz-sort 0.85s ease-in-out both",
    iconOrigin: "50% 85%",
  },
  {
    title: "AI RPG",
    description:
      "A text adventure narrated by an AI game master. Fight, explore, and talk your way through.",
    icon: <FaDiceD20 size={34} />,
    path: "/rpg",
    accent: "glassAmethyst",
    iconAnimation: "jz-dice-roll 0.95s ease-in-out both",
  },
  {
    title: "Budgetize Me",
    description:
      "Plan your bills, debts, and paychecks with calendars and projections.",
    icon: <FaSackDollar size={34} />,
    path: "/budgetize",
    accent: "glassAmber",
    note: "Sign in to save",
    iconAnimation: "jz-jingle 1.1s ease-in-out both",
    iconOrigin: "50% 6%",
  },
  {
    title: "Level Editor",
    description: "Build your own platformer levels and play them.",
    icon: <FaPenRuler size={34} />,
    path: "/editor",
    accent: "glassRuby",
    note: "Sign-in required",
    iconAnimation: "jz-scribe 0.85s ease-in-out both",
  },
];

const AppCard = ({
  title,
  description,
  icon,
  path,
  accent,
  note,
  iconAnimation,
  iconOrigin,
  index,
}: AppCardDef & { index: number }) => {
  const theme = useTheme();
  const glass = theme.palette[accent];

  return (
    <Link
      href={path}
      style={{ textDecoration: "none", display: "block", height: "100%" }}
    >
      <Card
        sx={{
          position: "relative",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          borderRadius: "6px",
          border: MEDIEVAL_EFFECTS.FRAME_BORDER,
          backgroundColor: theme.palette.medievalStone.dark,
          backgroundImage: MEDIEVAL_EFFECTS.PANEL_BG,
          boxShadow: MEDIEVAL_EFFECTS.PANEL_SHADOW,
          transition: MEDIEVAL_EFFECTS.TRANSITION,
          cursor: "pointer",
          animation: `jz-rise 0.55s ease-out ${0.35 + index * 0.09}s both`,
          // Stained-glass light spilling from the top of the panel.
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0.75,
            transition: MEDIEVAL_EFFECTS.TRANSITION,
            background: `radial-gradient(120% 68% at 50% 0%, ${glass.main}2e, transparent 62%)`,
          },
          // Inner leaded-glass rule inset from the carved outer frame.
          "&::after": {
            content: '""',
            position: "absolute",
            inset: "6px",
            borderRadius: "3px",
            border: "1px solid rgba(200, 162, 74, 0.16)",
            pointerEvents: "none",
          },
          ":hover": {
            transform: "translateY(-4px)",
            borderColor: "rgba(232, 207, 143, 0.62)",
            boxShadow: `${MEDIEVAL_EFFECTS.PANEL_SHADOW_HOVER}, 0 0 24px ${glass.main}59`,
          },
          "&:hover::before": {
            opacity: 1,
          },
          "&:hover .landing-medallion": {
            transform: "scale(1.07)",
            borderColor: "rgba(232, 207, 143, 0.72)",
            boxShadow: `inset 0 0 20px ${glass.main}66, 0 0 18px ${glass.main}4d`,
          },
          "&:hover .landing-medallion::after": {
            animation: "jz-halo-pulse 1.9s ease-in-out 0.2s infinite",
          },
          "&:hover .landing-icon": {
            animation: iconAnimation,
          },
        }}
      >
        <CardContent
          sx={{
            position: "relative",
            zIndex: 1,
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            p: 3,
          }}
        >
          <Box
            className="landing-medallion"
            sx={{
              position: "relative",
              width: 68,
              height: 68,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              color: glass.light,
              background: `radial-gradient(circle at 50% 35%, ${glass.main}59, rgba(9, 11, 17, 0.92) 72%)`,
              border: "1px solid rgba(200, 162, 74, 0.45)",
              boxShadow: `inset 0 0 14px ${glass.main}40, 0 4px 12px rgba(0, 0, 0, 0.55)`,
              transition: MEDIEVAL_EFFECTS.TRANSITION,
              mb: 2,
              // Halo ring revealed by the card's hover state.
              "&::after": {
                content: '""',
                position: "absolute",
                inset: -5,
                borderRadius: "50%",
                border: `1px solid ${glass.main}8c`,
                boxShadow: `0 0 16px ${glass.main}59, inset 0 0 10px ${glass.main}33`,
                opacity: 0,
                pointerEvents: "none",
              },
            }}
          >
            <Box
              className="landing-icon"
              sx={{
                display: "flex",
                transformOrigin: iconOrigin ?? "50% 50%",
              }}
            >
              {icon}
            </Box>
          </Box>

          {/* Fixed two-line slot keeps descriptions on a shared baseline across cards. */}
          <Typography
            fontFamily={FONTS.MEDIEVAL_DISPLAY}
            variant="h5"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "2.5em",
              fontWeight: 600,
              letterSpacing: "0.05em",
              lineHeight: 1.25,
              color: theme.palette.medievalGold.light,
              textShadow: MEDIEVAL_EFFECTS.GOLD_TEXT_SHADOW,
            }}
          >
            {title}
          </Typography>

          {/* Reserved row so noted and un-noted cards stay aligned. */}
          <Box
            sx={{
              minHeight: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mt: 0.5,
              mb: 1.5,
            }}
          >
            {note && (
              <Chip
                label={note}
                size="small"
                sx={{
                  height: 22,
                  bgcolor: `${glass.main}24`,
                  color: theme.palette.parchment.main,
                  fontFamily: FONTS.MEDIEVAL_SERIF,
                  fontSize: "0.68rem",
                  letterSpacing: "0.04em",
                  border: `1px solid ${glass.main}66`,
                }}
              />
            )}
          </Box>

          <Typography
            component="p"
            fontFamily={FONTS.MEDIEVAL_SERIF}
            variant="body1"
            sx={{
              flexGrow: 1,
              m: 0,
              fontSize: "0.95rem",
              color: theme.palette.parchment.dark,
              lineHeight: 1.7,
            }}
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
      <PageHeading title="Welcome" />

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
        {APPS.map((app, i) => (
          <AppCard key={app.path} {...app} index={i} />
        ))}
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          animation: "jz-rise 0.55s ease-out 0.9s both",
        }}
      >
        <Link href="/developer">
          <Button
            variant="outlined"
            startIcon={<FaCode />}
            sx={{
              color: theme.palette.parchment.main,
              borderColor: "rgba(200, 162, 74, 0.45)",
              borderRadius: "4px",
              backgroundImage: MEDIEVAL_EFFECTS.PANEL_BG,
              fontFamily: FONTS.MEDIEVAL_DISPLAY,
              letterSpacing: "0.08em",
              px: 3.5,
              py: 1.2,
              transition: MEDIEVAL_EFFECTS.TRANSITION,
              "&:hover": {
                borderColor: theme.palette.medievalGold.light,
                color: theme.palette.medievalGold.light,
                boxShadow: "0 0 18px rgba(200, 162, 74, 0.28)",
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
