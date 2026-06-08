import { Typography, Card, CardContent, CardMedia, useTheme, Box } from "@mui/material";
import { type GameDataProps } from "../../lib/GameTypes";
import { ANIMATIONS, EFFECTS, FONTS } from "../../lib/globals";
import { useState, useEffect, useRef } from "react";
import { useScrollAnimation } from "../../utils/useScrollAnimation";

const GameCard = ({
    title,
    description,
    thumbnail,
    gameplayGif,
    onPlay,
    index = 0,
}: GameDataProps & { index?: number }) => {
    const theme = useTheme();
    const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });
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

        return () => clearTimeout(timeoutRef.current);
    }, [isHovering]);

    return (
        <Box
            ref={ref}
            sx={{
                ...ANIMATIONS.FADE_IN,
                ...(isVisible && ANIMATIONS.FADE_IN_VISIBLE),
                transitionDelay: `${index * ANIMATIONS.STAGGER_DELAY}s`,
            }}
        >
            <Card
                onClick={onPlay}
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
                    cursor: 'pointer',
                    ':hover': {
                        transform: EFFECTS.HOVER_SCALE,
                        boxShadow: EFFECTS.CARD_SHADOW_HOVER,
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
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    <Typography
                        fontFamily={FONTS.NECTO_MONO}
                        variant="h4"
                        gutterBottom
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
                        }}
                    >
                        {description}
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
};

export default GameCard;
