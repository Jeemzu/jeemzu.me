import { Box, type SxProps, type Theme } from "@mui/material";
import type { ReactNode } from "react";

/** Full-viewport layer used by every Player overlay so spacing and backdrop stay identical. */
export function OverlayScrim({
  children,
  dim = 0.92,
  sx,
}: {
  children: ReactNode;
  dim?: number;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box
      sx={[
        {
          position: "absolute",
          inset: 0,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "safe center",
          gap: 2.5,
          p: 3,
          overflowY: "auto",
          bgcolor: `rgba(11, 14, 20, ${dim})`,
          backdropFilter: "blur(3px)",
          "& > *": { flexShrink: 0 },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}
