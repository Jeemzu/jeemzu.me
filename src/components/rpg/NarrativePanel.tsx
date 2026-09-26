import { useEffect, useRef } from "react";
import { Box, Typography } from "@mui/material";
import { keyframes } from "@mui/material/styles";
import { FONTS } from "../../lib/globals";
import { useRpgStore } from "../../stores/rpgStore";

const entryFadeIn = keyframes`
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: none; }
`;

/** Fixed-height adventure log — scrolls internally so new entries never resize the game frame. */
const NarrativePanel = () => {
  const narrativeLog = useRpgStore((s) => s.narrativeLog);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll only the log container (scrollIntoView would also yank the page).
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [narrativeLog.length]);

  return (
    <Box
      sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
    >
      <Typography
        fontFamily={FONTS.NECTO_MONO}
        sx={{
          px: 1.5,
          pt: 1.25,
          pb: 0.75,
          fontSize: "0.65rem",
          letterSpacing: 2,
          color: "rgba(168, 214, 126, 0.7)",
        }}
      >
        ADVENTURE LOG
      </Typography>
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 1.5,
          pb: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(168, 214, 126, 0.35) rgba(0, 0, 0, 0.3)",
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "rgba(0, 0, 0, 0.3)",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(168, 214, 126, 0.35)",
            borderRadius: 3,
          },
        }}
      >
        {narrativeLog.length === 0 && (
          <Typography
            fontFamily={FONTS.NECTO_MONO}
            sx={{ color: "#707070", fontStyle: "italic", fontSize: "0.85rem" }}
          >
            Your adventure is about to begin...
          </Typography>
        )}
        {narrativeLog.map((entry) => (
          <Typography
            key={entry.id}
            fontFamily={FONTS.NECTO_MONO}
            sx={{
              textAlign: "left",
              fontSize: entry.kind === "system" ? "0.75rem" : "0.85rem",
              lineHeight: 1.6,
              animation: `${entryFadeIn} 0.35s ease`,
              ...(entry.kind === "system"
                ? { color: "#8a8a8a", fontStyle: "italic" }
                : {
                    color: "#d8d8d8",
                    borderLeft: "2px solid rgba(168, 214, 126, 0.35)",
                    pl: 1.25,
                  }),
            }}
          >
            {entry.text}
          </Typography>
        ))}
      </Box>
    </Box>
  );
};

export default NarrativePanel;
