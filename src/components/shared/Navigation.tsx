import {
  AppBar,
  Toolbar,
  Button,
  Stack,
  useTheme,
  useMediaQuery,
  IconButton,
  Drawer,
  Box,
  Chip,
  Tooltip,
} from "@mui/material";
import { Link, useLocation } from "wouter";
import { FONTS, LINKS, MEDIEVAL_EFFECTS } from "../../lib/globals";
import {
  FaGithub,
  FaLinkedin,
  FaBars,
  FaTimes,
  FaUnlock,
} from "react-icons/fa";
import { useState } from "react";
import { onClickUrl } from "../../utils/openInNewTab";
import { useAuthStore } from "../../stores/authStore";
import UserAuthModal from "./UserAuthModal";

const Navigation = () => {
  const theme = useTheme();
  const [location] = useLocation();
  const isMobile = useMediaQuery("(max-width:900px)");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { isAuthenticated, username, role, logout } = useAuthStore();

  const navItems = [
    { label: "Home", path: "/" },
    { label: "Games", path: "/games" },
    { label: "Visualizer", path: "/algoviz" },
    { label: "Budgetize", path: "/budgetize" },
    { label: "Developer", path: "/developer" },
    ...(role === "Admin" ? [{ label: "Admin", path: "/admin" }] : []),
  ];

  const NavButton = ({
    label,
    path,
    mobile = false,
  }: {
    label: string;
    path: string;
    mobile?: boolean;
  }) => {
    // Prefix match keeps a section's tab lit on its nested pages (e.g. /developer/projects).
    const isActive =
      location === path || (path !== "/" && location.startsWith(`${path}/`));

    return (
      <Link href={path}>
        <Button
          sx={{
            color: isActive
              ? theme.palette.medievalGold.light
              : theme.palette.parchment.dark,
            fontFamily: FONTS.MEDIEVAL_DISPLAY,
            fontWeight: 600,
            letterSpacing: "0.08em",
            fontSize: mobile ? "1.5rem" : "1rem",
            px: 2,
            borderBottom: isActive
              ? `2px solid ${theme.palette.medievalGold.main}`
              : "2px solid transparent",
            borderRadius: 0,
            textShadow: isActive ? MEDIEVAL_EFFECTS.GOLD_TEXT_SHADOW : "none",
            transition: MEDIEVAL_EFFECTS.TRANSITION,
            "&:hover": {
              color: theme.palette.medievalGold.light,
              backgroundColor: "rgba(200, 162, 74, 0.10)",
              borderBottomColor: "rgba(200, 162, 74, 0.45)",
            },
            ...(mobile && {
              width: "100%",
              justifyContent: "flex-start",
              py: 2,
            }),
          }}
          onClick={() => mobile && setDrawerOpen(false)}
        >
          {label}
        </Button>
      </Link>
    );
  };

  const MobileDrawer = () => (
    <Drawer
      anchor="right"
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      sx={{
        "& .MuiDrawer-paper": {
          backgroundColor: theme.palette.medievalStone.dark,
          backgroundImage: MEDIEVAL_EFFECTS.PANEL_BG,
          borderLeft: MEDIEVAL_EFFECTS.FRAME_BORDER,
          width: "70%",
          maxWidth: "300px",
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <IconButton
          onClick={() => setDrawerOpen(false)}
          sx={{
            color: theme.palette.medievalGold.main,
            mb: 2,
          }}
        >
          <FaTimes size={24} />
        </IconButton>

        <Stack spacing={1}>
          {navItems.map((item) => (
            <NavButton key={item.path} {...item} mobile />
          ))}
        </Stack>

        <Stack
          direction="row"
          spacing={2}
          sx={{ mt: 4, justifyContent: "center" }}
        >
          <IconButton
            onClick={onClickUrl(LINKS.GITHUB)}
            sx={{
              color: theme.palette.parchment.dark,
              transition: MEDIEVAL_EFFECTS.TRANSITION,
              "&:hover": {
                color: theme.palette.medievalGold.light,
              },
            }}
          >
            <FaGithub size={24} />
          </IconButton>
          <IconButton
            onClick={onClickUrl(LINKS.LINKEDIN)}
            sx={{
              color: theme.palette.parchment.dark,
              transition: MEDIEVAL_EFFECTS.TRANSITION,
              "&:hover": {
                color: theme.palette.medievalGold.light,
              },
            }}
          >
            <FaLinkedin size={24} />
          </IconButton>
        </Stack>
      </Box>
    </Drawer>
  );

  return (
    <>
      <AppBar
        position="sticky"
        sx={{
          backgroundColor: "rgba(13, 16, 23, 0.94)",
          backgroundImage:
            "linear-gradient(180deg, rgba(38, 44, 56, 0.9) 0%, rgba(13, 16, 23, 0.94) 100%)",
          backdropFilter: "blur(10px)",
          borderBottom: MEDIEVAL_EFFECTS.FRAME_BORDER,
          boxShadow:
            "inset 0 1px 0 rgba(232, 207, 143, 0.12), 0 4px 18px rgba(0, 0, 0, 0.6)",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          {/* Logo/Name */}
          <Link href="/">
            <Button
              sx={{
                color: theme.palette.medievalGold.main,
                fontFamily: FONTS.MEDIEVAL_DISPLAY,
                fontSize: "1.6rem",
                fontWeight: 700,
                letterSpacing: "0.16em",
                textShadow: MEDIEVAL_EFFECTS.GOLD_TEXT_SHADOW,
                transition: MEDIEVAL_EFFECTS.TRANSITION,
                "&:hover": {
                  color: theme.palette.medievalGold.light,
                  backgroundColor: "transparent",
                },
              }}
            >
              JF
            </Button>
          </Link>

          {/* Desktop Navigation */}
          {!isMobile ? (
            <Stack direction="row" spacing={1} alignItems="center">
              {navItems.map((item) => (
                <NavButton key={item.path} {...item} />
              ))}

              <Stack direction="row" spacing={1} sx={{ ml: 2 }}>
                <IconButton
                  onClick={onClickUrl(LINKS.GITHUB)}
                  sx={{
                    color: theme.palette.parchment.dark,
                    transition: MEDIEVAL_EFFECTS.TRANSITION,
                    "&:hover": {
                      color: theme.palette.medievalGold.light,
                    },
                  }}
                >
                  <FaGithub size={20} />
                </IconButton>
                <IconButton
                  onClick={onClickUrl(LINKS.LINKEDIN)}
                  sx={{
                    color: theme.palette.parchment.dark,
                    transition: MEDIEVAL_EFFECTS.TRANSITION,
                    "&:hover": {
                      color: theme.palette.medievalGold.light,
                    },
                  }}
                >
                  <FaLinkedin size={20} />
                </IconButton>
              </Stack>

              {/* Auth — visible only to the site owner */}
              {isAuthenticated ? (
                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                  sx={{ ml: 1 }}
                >
                  <Chip
                    label={
                      role === "Admin" ? `${username} · Admin` : `${username}`
                    }
                    size="small"
                    sx={{
                      bgcolor: "rgba(200, 162, 74, 0.14)",
                      color: "medievalGold.light",
                      fontFamily: FONTS.MEDIEVAL_SERIF,
                      fontSize: "0.7rem",
                      border: MEDIEVAL_EFFECTS.FRAME_BORDER,
                    }}
                  />
                  <Tooltip title="Sign out">
                    <IconButton
                      onClick={() => void logout()}
                      sx={{
                        color: "rgba(255,255,255,0.35)",
                        "&:hover": { color: "#f44336" },
                      }}
                    >
                      <FaUnlock size={14} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ) : (
                <Button
                  onClick={() => setLoginOpen(true)}
                  variant="outlined"
                  size="small"
                  sx={{
                    ml: 1,
                    color: theme.palette.parchment.dark,
                    borderColor: "rgba(200, 162, 74, 0.34)",
                    fontFamily: FONTS.MEDIEVAL_SERIF,
                    fontSize: "0.75rem",
                    px: 1.5,
                    py: 0.5,
                    minWidth: "auto",
                    "&:hover": {
                      borderColor: theme.palette.medievalGold.main,
                      color: theme.palette.medievalGold.light,
                      bgcolor: "rgba(200, 162, 74, 0.10)",
                    },
                  }}
                >
                  Login
                </Button>
              )}
            </Stack>
          ) : (
            /* Mobile Menu Button */
            <IconButton
              onClick={() => setDrawerOpen(true)}
              sx={{
                color: theme.palette.medievalGold.main,
              }}
            >
              <FaBars size={24} />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      {isMobile && <MobileDrawer />}

      <UserAuthModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        defaultTab="login"
      />
    </>
  );
};

export default Navigation;
