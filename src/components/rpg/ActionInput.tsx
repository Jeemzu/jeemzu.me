import { useState } from "react";
import {
  Box,
  Button,
  IconButton,
  InputBase,
  Stack,
  Typography,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { keyframes } from "@mui/material/styles";
import { FONTS } from "../../lib/globals";
import { useRpgStore } from "../../stores/rpgStore";

const QUICK_ACTIONS = ["Look around", "Rest"];

const pulse = keyframes`
    0%, 100% { opacity: 0.35; }
    50% { opacity: 1; }
`;

/** Command bar docked to the bottom of the game frame. */
const ActionInput = () => {
  const [text, setText] = useState("");
  const busy = useRpgStore((s) => s.busy);
  const sendAction = useRpgStore((s) => s.sendAction);

  const submit = (action: string) => {
    const trimmed = action.trim();
    if (!trimmed || busy) return;
    void sendAction(trimmed);
    setText("");
  };

  return (
    <Box
      sx={{
        borderTop: "1px solid rgba(168, 214, 126, 0.25)",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        px: 1.5,
        pt: 0.5,
        pb: 1.25,
      }}
    >
      {/* Fixed-height status slot so the bar doesn't jump when the DM starts/stops thinking */}
      <Typography
        fontFamily={FONTS.NECTO_MONO}
        sx={{
          height: 20,
          fontSize: "0.7rem",
          letterSpacing: 1,
          color: "#a8d67e",
          visibility: busy ? "visible" : "hidden",
          animation: busy ? `${pulse} 1.4s ease-in-out infinite` : "none",
        }}
      >
        ✦ The Dungeon Master weaves your fate...
      </Typography>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        flexWrap="wrap"
        alignItems="stretch"
      >
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action}
            disabled={busy}
            onClick={() => submit(action)}
            sx={{
              fontFamily: FONTS.NECTO_MONO,
              textTransform: "none",
              fontSize: "0.8rem",
              whiteSpace: "nowrap",
              color: "#c5e8a4",
              px: 1.5,
              border: "1px solid rgba(168, 214, 126, 0.4)",
              borderRadius: 0.5,
              backgroundColor: "rgba(168, 214, 126, 0.08)",
              "&:hover": {
                backgroundColor: "rgba(168, 214, 126, 0.18)",
                borderColor: "#a8d67e",
                boxShadow: "0 0 10px rgba(168, 214, 126, 0.3)",
              },
              "&.Mui-disabled": {
                color: "rgba(197, 232, 164, 0.3)",
                borderColor: "rgba(168, 214, 126, 0.15)",
              },
            }}
          >
            {action}
          </Button>
        ))}
        <Box
          sx={{
            flex: 1,
            minWidth: 220,
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.25,
            backgroundColor: "rgba(0, 0, 0, 0.55)",
            border: "1px solid rgba(168, 214, 126, 0.3)",
            borderRadius: 0.5,
            "&:focus-within": {
              borderColor: "#a8d67e",
              boxShadow: "0 0 10px rgba(168, 214, 126, 0.25)",
            },
          }}
        >
          <Typography
            fontFamily={FONTS.NECTO_MONO}
            sx={{ color: "#a8d67e", fontSize: "0.9rem", userSelect: "none" }}
          >
            ❯
          </Typography>
          <InputBase
            fullWidth
            placeholder="What do you do?"
            value={text}
            disabled={busy}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(text);
              }
            }}
            sx={{
              fontFamily: FONTS.NECTO_MONO,
              fontSize: "0.85rem",
              color: "#e0e0e0",
              py: 0.6,
              "& .MuiInputBase-input::placeholder": {
                color: "#707070",
                opacity: 1,
              },
            }}
          />
        </Box>
        <IconButton
          disabled={busy || !text.trim()}
          onClick={() => submit(text)}
          sx={{
            border: "1px solid rgba(168, 214, 126, 0.4)",
            borderRadius: 0.5,
            color: "#a8d67e",
            "&:hover": {
              backgroundColor: "rgba(168, 214, 126, 0.15)",
              boxShadow: "0 0 10px rgba(168, 214, 126, 0.3)",
            },
            "&.Mui-disabled": {
              color: "rgba(168, 214, 126, 0.25)",
              borderColor: "rgba(168, 214, 126, 0.15)",
            },
          }}
        >
          <SendIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );
};

export default ActionInput;
