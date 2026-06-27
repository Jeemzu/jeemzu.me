import { useState, useRef, useEffect } from 'react';
import {
    Box,
    Fab,
    Typography,
    TextField,
    IconButton,
    CircularProgress,
    useMediaQuery,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { chatRequest, type ConversationMessage } from '../utils/chatApi';
import { EFFECTS, FONTS } from '../lib/globals';

const GREEN = '#a8d67e';
const SOFT_GREEN = '#c5e8a4';

const ChatBot = () => {
    const isMobile = useMediaQuery('(max-width:600px)');

    const [open, setOpen] = useState(false);
    const [history, setHistory] = useState<ConversationMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [history, loading]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const question = input.trim();
        setInput('');

        const userMsg: ConversationMessage = { role: 'user', content: question };
        const updatedHistory = [...history, userMsg];
        setHistory(updatedHistory);
        setLoading(true);

        const answer = await chatRequest(question, history);

        setHistory([
            ...updatedHistory,
            {
                role: 'assistant',
                content: answer ?? "Sorry, I couldn't get a response. Please try again.",
            },
        ]);
        setLoading(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSend();
        }
    };

    return (
        <>
            {/* ── Chat window ─────────────────────────────────────── */}
            {open && (
                <Box
                    sx={{
                        position: 'fixed',
                        bottom: isMobile ? 0 : 96,
                        right: isMobile ? 0 : 24,
                        width: isMobile ? '100vw' : 400,
                        height: isMobile ? '75vh' : 540,
                        display: 'flex',
                        flexDirection: 'column',
                        bgcolor: '#0e0e1e',
                        borderRadius: isMobile ? '12px 12px 0 0' : 2,
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
                        zIndex: 1400,
                        overflow: 'hidden',
                    }}
                >
                    {/* ── Header ──────────────────────────────────── */}
                    <Box
                        sx={{
                            px: 2.5,
                            py: 1.75,
                            bgcolor: '#0a0a18',
                            borderBottom: '1px solid rgba(255,255,255,0.07)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexShrink: 0,
                        }}
                    >
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.4 }}>
                            <Typography
                                component="span"
                                sx={{
                                    fontFamily: FONTS.NECTO_MONO,
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    color: GREEN,
                                    lineHeight: 1.3,
                                    display: 'block',
                                }}
                            >
                                Ask about James
                            </Typography>
                            <Typography
                                component="span"
                                sx={{
                                    fontFamily: FONTS.NECTO_MONO,
                                    fontSize: '0.75rem',
                                    color: '#555',
                                    display: 'block',
                                }}
                            >
                                RAG · GPT-4o mini
                            </Typography>
                        </Box>
                        <IconButton
                            size="small"
                            onClick={() => setOpen(false)}
                            sx={{
                                ml: 1.5,
                                flexShrink: 0,
                                color: '#555',
                                '&:hover': { color: '#e8e8e8', bgcolor: 'rgba(255,255,255,0.06)' },
                                transition: 'all 0.15s',
                            }}
                        >
                            <CloseIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Box>

                    {/* ── Messages ────────────────────────────────── */}
                    <Box
                        sx={{
                            flex: 1,
                            overflowY: 'auto',
                            p: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1.5,
                            // Subtle scrollbar
                            '&::-webkit-scrollbar': { width: 4 },
                            '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                            '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 2 },
                        }}
                    >
                        {history.length === 0 && (
                            <Typography
                                sx={{
                                    fontFamily: FONTS.NECTO_MONO,
                                    fontSize: '0.85rem',
                                    color: '#555',
                                    lineHeight: 1.7,
                                    mt: 1,
                                }}
                            >
                                Ask me anything about James — experience, skills, projects, or background.
                            </Typography>
                        )}

                        {history.map((msg, i) => (
                            <Box
                                key={i}
                                sx={{
                                    display: 'flex',
                                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                }}
                            >
                                <Box
                                    sx={{
                                        maxWidth: '82%',
                                        px: 1.5,
                                        py: 1,
                                        borderRadius:
                                            msg.role === 'user'
                                                ? '10px 10px 2px 10px'
                                                : '10px 10px 10px 2px',
                                        bgcolor:
                                            msg.role === 'user'
                                                ? `${GREEN}18`
                                                : '#161628',
                                        border:
                                            msg.role === 'user'
                                                ? `1px solid ${GREEN}40`
                                                : '1px solid rgba(255,255,255,0.06)',
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontFamily: FONTS.NECTO_MONO,
                                            fontSize: '0.85rem',
                                            color: msg.role === 'user' ? SOFT_GREEN : '#e8e8e8',
                                            lineHeight: 1.65,
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            textAlign: 'left',
                                        }}
                                    >
                                        {msg.content}
                                    </Typography>
                                </Box>
                            </Box>
                        ))}

                        {loading && (
                            <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <Box
                                    sx={{
                                        px: 1.5,
                                        py: 1,
                                        borderRadius: '10px 10px 10px 2px',
                                        bgcolor: '#161628',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                    }}
                                >
                                    <CircularProgress size={12} sx={{ color: GREEN }} />
                                    <Typography
                                        sx={{
                                            fontFamily: FONTS.NECTO_MONO,
                                            fontSize: '0.78rem',
                                            color: '#555',
                                        }}
                                    >
                                        Thinking...
                                    </Typography>
                                </Box>
                            </Box>
                        )}

                        <div ref={messagesEndRef} />
                    </Box>

                    {/* ── Input row ───────────────────────────────── */}
                    <Box
                        sx={{
                            px: 1.5,
                            py: 1.5,
                            borderTop: '1px solid rgba(255,255,255,0.07)',
                            display: 'flex',
                            alignItems: 'flex-end',
                            gap: 1,
                            flexShrink: 0,
                            bgcolor: '#0a0a18',
                        }}
                    >
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Ask a question..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                            autoComplete="off"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    fontFamily: FONTS.NECTO_MONO,
                                    fontSize: '0.85rem',
                                    color: '#e8e8e8',
                                    bgcolor: '#111124',
                                    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                                    '&.Mui-focused fieldset': { borderColor: `${GREEN}80` },
                                },
                                '& .MuiOutlinedInput-input::placeholder': {
                                    color: '#444',
                                    opacity: 1,
                                },
                            }}
                        />
                        <IconButton
                            onClick={() => void handleSend()}
                            disabled={!input.trim() || loading}
                            sx={{
                                mb: 0.25,
                                color: GREEN,
                                border: `1px solid ${GREEN}40`,
                                borderRadius: 1,
                                p: '6px',
                                transition: 'all 0.15s',
                                '&:hover': { bgcolor: `${GREEN}12`, borderColor: `${GREEN}80` },
                                '&.Mui-disabled': { opacity: 0.25, borderColor: 'rgba(255,255,255,0.1)', color: '#555' },
                            }}
                        >
                            <SendIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Box>
                </Box>
            )}

            {/* ── Floating trigger button ──────────────────────────── */}
            <Fab
                onClick={() => setOpen((o) => !o)}
                aria-label="open chat"
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    bgcolor: GREEN,
                    color: '#0a0a0a',
                    zIndex: 1400,
                    transition: EFFECTS.TRANSITION,
                    '&:hover': {
                        bgcolor: SOFT_GREEN,
                        transform: EFFECTS.HOVER_SCALE,
                    },
                }}
            >
                {open ? <CloseIcon /> : <ChatIcon />}
            </Fab>
        </>
    );
};

export default ChatBot;
