import { Box, Typography, Fade, ButtonBase } from "@mui/material";
import { FONTS } from "../../lib/globals";
import { useRpgStore } from "../../stores/rpgStore";

const chanceColor = (chance: number) =>
  chance >= 70 ? "#a8d67e" : chance >= 40 ? "#ffb74d" : "#f44336";

/** Overlaid on the game canvas while the party is in conversation with an NPC. */
const DialogueBox = () => {
  const dialogue = useRpgStore((s) => s.dialogue);
  const busy = useRpgStore((s) => s.busy);
  const sendAction = useRpgStore((s) => s.sendAction);

  return (
    <Fade in={!!dialogue}>
      <Box
        sx={{
          position: "absolute",
          bottom: 12,
          left: 12,
          right: 12,
          backgroundColor: "rgba(18, 18, 18, 0.92)",
          border: "1px solid #a8d67e",
          borderRadius: 0.5,
          boxShadow: "0 4px 18px rgba(0, 0, 0, 0.7)",
          p: 1.5,
        }}
      >
        <Typography
          fontFamily={FONTS.NECTO_MONO}
          sx={{
            color: "#c5e8a4",
            fontWeight: "bold",
            letterSpacing: 1,
            fontSize: "0.9rem",
          }}
        >
          {dialogue ? `◆ ${dialogue.npcName}` : ""}
        </Typography>

        {/* Stat-gated response options — clicking speaks the option aloud */}
        {(dialogue?.options?.length ?? 0) > 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mt: 1 }}>
            {dialogue?.options.map((option) => (
              <ButtonBase
                key={option.id}
                disabled={busy}
                onClick={() => void sendAction(option.prompt)}
                sx={{
                  justifyContent: "flex-start",
                  textAlign: "left",
                  px: 1,
                  py: 0.5,
                  borderRadius: 0.5,
                  border: "1px solid rgba(168, 214, 126, 0.25)",
                  backgroundColor: "rgba(0, 0, 0, 0.4)",
                  gap: 0.75,
                  "&:hover": {
                    backgroundColor: "rgba(168, 214, 126, 0.12)",
                    borderColor: "#a8d67e",
                  },
                  "&.Mui-disabled": { opacity: 0.4 },
                }}
              >
                <Typography
                  fontFamily={FONTS.NECTO_MONO}
                  sx={{
                    fontSize: "0.7rem",
                    color: chanceColor(option.chance),
                    flexShrink: 0,
                  }}
                >
                  {option.chance}%
                </Typography>
                <Typography
                  fontFamily={FONTS.NECTO_MONO}
                  sx={{ fontSize: "0.75rem", color: "#e0e0e0", lineHeight: 1.4 }}
                >
                  {option.prompt}
                </Typography>
              </ButtonBase>
            ))}
          </Box>
        )}

        <Typography
          variant="caption"
          fontFamily={FONTS.NECTO_MONO}
          sx={{ color: "#8a8a8a", display: "block", mt: 0.5 }}
        >
          Type to speak freely · say goodbye to end the conversation
        </Typography>
      </Box>
    </Fade>
  );
};

export default DialogueBox;
