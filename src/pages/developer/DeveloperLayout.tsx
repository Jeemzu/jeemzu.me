import { Box, Button, Stack, useTheme } from "@mui/material";
import { Link, useLocation } from "wouter";
import { FaFile } from "react-icons/fa6";
import type { ReactNode } from "react";
import { FONTS, LINKS } from "../../lib/globals";
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
      ? theme.palette.text.primary
      : theme.palette.textSecondary.main,
    fontFamily: FONTS.NECTO_MONO,
    fontWeight: 700,
    fontSize: "1rem",
    px: 2,
    borderBottom: isActive
      ? `2px solid ${theme.palette.primaryGreen.main}`
      : "2px solid transparent",
    borderRadius: 0,
    transition: "all 0.2s ease-in-out",
    "&:hover": {
      color: theme.palette.primaryGreen.main,
      backgroundColor: "rgba(168, 214, 126, 0.08)",
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
