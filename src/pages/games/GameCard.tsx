import { Typography, Card, CardContent, CardMedia, useTheme, Box, Button } from "@mui/material";
import { type GameDataProps } from "../../lib/GameTypes";
import { EFFECTS, FONTS } from "../../lib/globals";
import { useState, useEffect, useRef } from "react";
import { FaPlay } from "react-icons/fa";

const GameCard = ({
    title,
    description,
    thumbnail,
    gameplayGif,
    onPlay,
}: GameDataProps) => {
    const theme = useTheme();
    const [isHovering, setIsHovering] = useState(false);
    const [showGif, setShowGif] = useState(false);
    const timeoutRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        if (isHovering) {
            timeoutRef.current = window.setTimeout(() => {
                setShowGif(true);
            }, 500);
        } else {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            setShowGif(false);
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [isHovering]);

    return (
        <Card
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: theme.palette.cardBackground.main,
                boxShadow: EFFECTS.CARD_SHADOW,
                transition: EFFECTS.TRANSITION,
                overflow: 'hidden',
                ":hover": {
                    transform: EFFECTS.HOVER_SCALE,
                },
            }}
        >
            <Box
                sx={{
                    width: '100%',
                    height: '200px',
                    overflow: 'hidden',
                    backgroundColor: theme.palette.darkBackground.main,
                    position: 'relative',
                }}
            >
                {/* Thumbnail image */}
                <CardMedia
                    component="img"
                    image={thumbnail}
                    alt={title}
                    sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        opacity: showGif ? 0 : 1,
                        transition: 'opacity 0.2s ease-out',
                    }}
                    loading="lazy"
                />
                {/* Gameplay GIF */}
                <CardMedia
                    component="img"
                    image={gameplayGif}
                    alt={`${title} gameplay`}
                    sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        opacity: showGif ? 1 : 0,
                        transition: 'opacity 0.2s ease-in',
                    }}
                    loading="lazy"
                />
            </Box>
            <CardContent sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography
                    fontFamily={FONTS.ANTON}
                    variant="h4"
                    sx={{ color: theme.palette.primaryGreen.main }}
                >
                    {title}
                </Typography>
                <Typography
                    fontFamily={FONTS.NECTO_MONO}
                    variant="body1"
                    sx={{
                        color: theme.palette.textSecondary.main,
                        lineHeight: 1.7,
                        flexGrow: 1,
                    }}
                >
                    {description}
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<FaPlay />}
                    onClick={onPlay}
                    sx={{
                        backgroundColor: theme.palette.primaryGreen.main,
                        color: theme.palette.darkBackground.main,
                        fontFamily: FONTS.ANTON,
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        py: 1.5,
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                            backgroundColor: theme.palette.softGreen.main,
                            transform: 'translateY(-2px)',
                            boxShadow: `0 4px 12px ${theme.palette.primaryGreen.main}40`,
                        }
                    }}
                >
                    Play Game
                </Button>
            </CardContent>
        </Card>
    );
};

export default GameCard;
