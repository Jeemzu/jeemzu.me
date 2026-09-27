import { Box, Button, Stack, useTheme } from "@mui/material";
import { Link, useLocation } from "wouter";
import { FaFile } from "react-icons/fa6";
import type { ReactNode } from "react";
import { FONTS, LINKS, MEDIEVAL_EFFECTS } from "../../lib/globals";
import { onClickUrl } from "../../utils/openInNewTab";

const SUB_NAV = [
  { label: "About", path: "/developer" },
  { label: "Experience", path: "/developer/experience" },
  { label: "Projects", path: "/developer/projects" },
] as const;

/** Wraps the developer pages with a shared sub-nav (About / Experience / Projects / Resume). */
const DeveloperLayout = ({ children }: { children: ReactNode }) => {
  const theme = useTheme();
  const [location] = useLocation();

  const tabSx = (isActive: boolean) => ({
    color: isActive
      ? theme.palette.medievalGold.light
      : theme.palette.parchment.dark,
    fontFamily: FONTS.MEDIEVAL_DISPLAY,
    fontWeight: 600,
    letterSpacing: "0.08em",
    fontSize: "1rem",
    px: 2,
    borderBottom: isActive
      ? `2px solid ${theme.palette.medievalGold.main}`
      : "2px solid transparent",
    borderRadius: 0,
    transition: MEDIEVAL_EFFECTS.TRANSITION,
    "&:hover": {
      color: theme.palette.medievalGold.light,
      backgroundColor: "rgba(200, 162, 74, 0.10)",
      borderBottomColor: "rgba(200, 162, 74, 0.45)",
    },
  });

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          justifyContent: "center",
          flexWrap: "wrap",
          pt: 2,
          px: 2,
        }}
      >
        {SUB_NAV.map(({ label, path }) => (
          <Link key={path} href={path}>
            <Button sx={tabSx(location === path)}>{label}</Button>
          </Link>
        ))}
        <Button
          startIcon={<FaFile />}
          onClick={onClickUrl(LINKS.RESUME)}
          sx={tabSx(false)}
        >
          Resume
        </Button>
      </Stack>
      {children}
    </Box>
  );
};

export default DeveloperLayout;
