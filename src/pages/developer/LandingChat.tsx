import { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  CircularProgress,
  Chip,
  useMediaQuery,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { chatRequest, type ConversationMessage } from "../../utils/chatApi";
import { EFFECTS, FONTS, MEDIEVAL_EFFECTS } from "../../lib/globals";

const GOLD = "#c8a24a";
const GOLD_SOFT = "#e8cf8f";
const YELLOW = "#ffd740";
const BG_DEEP = "#0d1017";
const BG_MAIN = "#171b25";

const SUGGESTED_QUESTIONS = [
  "What are James's strongest technical skills?",
  "Tell me about his experience at Microsoft",
  "What games can I play on this site?",
  "Would James be a good fit for a startup?",
];

const LandingChat = () => {
  const isMobile = useMediaQuery("(max-width:600px)");

  const [history, setHistory] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasConversation = history.length > 0;

  useEffect(() => {
    if (messagesEndRef.current && hasConversation) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [history, loading, hasConversation]);

  const handleSend = async (questionOverride?: string) => {
    const question = (questionOverride ?? input).trim();
    if (!question || loading) return;

    setInput("");

    const userMsg: ConversationMessage = { role: "user", content: question };
    const updatedHistory = [...history, userMsg];
    setHistory(updatedHistory);
    setLoading(true);

    const answer = await chatRequest(question, history);

    setHistory([
      ...updatedHistory,
      {
        role: "assistant",
        content:
          answer ?? "Sorry, I couldn't get a response. Try again in a sec.",
      },
    ]);
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleSuggestionClick = (question: string) => {
    setInput(question);
    // Small delay so user sees the text appear before it sends
    setTimeout(() => void handleSend(question), 150);
  };

  return (
    <Box
      sx={{
        width: "100%",
        bgcolor: BG_MAIN,
        backgroundImage: MEDIEVAL_EFFECTS.PANEL_BG,
        borderRadius: "6px",
        border: MEDIEVAL_EFFECTS.FRAME_BORDER,
        boxShadow: MEDIEVAL_EFFECTS.PANEL_SHADOW,
        px: { xs: 2.5, md: 4 },
        py: hasConversation ? { xs: 3, md: 3 } : { xs: 6, md: 10 },
        transition: "padding 0.4s ease",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {/* Messages area — only shows when conversation has started */}
      {hasConversation && (
        <Box
          sx={{
            maxHeight: 400,
            overflowY: "auto",
            mb: 2.5,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            textAlign: "left",
            "&::-webkit-scrollbar": { width: 4 },
            "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "rgba(200, 162, 74, 0.25)",
              borderRadius: 2,
            },
          }}
        >
          {history.map((msg, i) => (
            <Box
              key={i}
              sx={{
                display: "flex",
                width: "100%",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <Box
                sx={{
                  maxWidth: "75%",
                  px: 2,
                  py: 1.25,
                  borderRadius:
                    msg.role === "user"
                      ? "14px 14px 4px 14px"
                      : "14px 14px 14px 4px",
                  bgcolor: msg.role === "user" ? `${GOLD}1f` : "#11151d",
                  border:
                    msg.role === "user"
                      ? `1px solid ${GOLD}45`
                      : "1px solid rgba(200, 162, 74, 0.18)",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: FONTS.MEDIEVAL_SERIF,
                    fontSize: "0.95rem",
                    color: msg.role === "user" ? GOLD_SOFT : "#e6dcc4",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    textAlign: "left",
                  }}
                >
                  {msg.content}
                </Typography>
              </Box>
            </Box>
          ))}

          {loading && (
            <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
              <Box
                sx={{
                  px: 2,
                  py: 1.25,
                  borderRadius: "14px 14px 14px 4px",
                  bgcolor: "#11151d",
                  border: "1px solid rgba(200, 162, 74, 0.18)",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <CircularProgress size={14} sx={{ color: YELLOW }} />
                <Typography
                  sx={{
                    fontFamily: FONTS.MEDIEVAL_SERIF,
                    fontSize: "0.85rem",
                    color: "#a79c85",
                  }}
                >
                  JeemzuAI is thinking...
                </Typography>
              </Box>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>
      )}

      {/* Suggested questions — only show before conversation starts */}
      {!hasConversation && (
        <Box
          sx={{
            mb: 2.5,
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            justifyContent: "center",
          }}
        >
          {SUGGESTED_QUESTIONS.map((q) => (
            <Chip
              key={q}
              label={q}
              onClick={() => handleSuggestionClick(q)}
              sx={{
                fontFamily: FONTS.MEDIEVAL_SERIF,
                fontSize: "0.8rem",
                color: YELLOW,
                bgcolor: "transparent",
                border: `1px solid ${YELLOW}40`,
                cursor: "pointer",
                transition: EFFECTS.TRANSITION,
                "&:hover": {
                  bgcolor: `${YELLOW}12`,
                  borderColor: `${YELLOW}80`,
                  color: YELLOW,
                },
              }}
            />
          ))}
        </Box>
      )}

      {/* Input row — ChatGPT-style wide, low input */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          bgcolor: BG_DEEP,
          borderRadius: "4px",
          border: "1px solid rgba(200, 162, 74, 0.28)",
          px: 2,
          py: 0.75,
          transition: "border-color 0.2s",
          "&:focus-within": {
            borderColor: `${YELLOW}60`,
          },
        }}
      >
        <TextField
          fullWidth
          variant="standard"
          placeholder="Ask JeemzuAI anything about James..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          autoComplete="off"
          inputRef={inputRef}
          slotProps={{
            input: {
              disableUnderline: true,
              sx: {
                fontFamily: FONTS.MEDIEVAL_SERIF,
                fontSize: isMobile ? "0.9rem" : "1rem",
                color: "#e6dcc4",
                py: 1,
                "&::placeholder": {
                  color: "#7a7264",
                  opacity: 1,
                },
              },
            },
          }}
        />
        <IconButton
          onClick={() => void handleSend()}
          disabled={!input.trim() || loading}
          sx={{
            color: YELLOW,
            p: 1,
            transition: "all 0.15s",
            "&:hover": { bgcolor: `${YELLOW}15` },
            "&.Mui-disabled": { opacity: 0.25, color: "#555" },
          }}
        >
          <SendIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      {/* Attribution line */}
      <Typography
        sx={{
          fontFamily: FONTS.MEDIEVAL_SERIF,
          fontSize: "0.72rem",
          color: "#6e6759",
          textAlign: "center",
          mt: 1.5,
        }}
      >
        Powered by JeemzuAI · Multi-agent AI
      </Typography>
    </Box>
  );
};

export default LandingChat;
