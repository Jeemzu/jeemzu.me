import { Box, Typography, Button, useTheme } from "@mui/material";
import { type GameDataProps } from "../../lib/GameTypes";
import { FONTS } from "../../lib/globals";
import { FaPlay } from "react-icons/fa";

interface GameHeroBannerProps {
    game: GameDataProps;
}

const GameHeroBanner = ({ game }: GameHeroBannerProps) => {
    const theme = useTheme();

    return (
        <Box
            sx={{
                position: 'relative',
                width: '100vw',
                height: { xs: '300px', sm: '400px', md: '500px' },
                overflow: 'hidden',
                backgroundColor: '#000',
            }}
        >
            {/* Centered gameplay image */}
            <Box
                component="img"
                src={game.gameplayGif}
                alt={`${game.title} gameplay`}
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    height: '100%',
                    maxWidth: { xs: '100%', md: '70%', lg: '60%' },
                    width: 'auto',
                    objectFit: 'cover',
                    objectPosition: 'center',
                }}
            />

            {/* Left black gradient fade */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '40%',
                    height: '100%',
                    background: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0) 100%)',
                    pointerEvents: 'none',
                    zIndex: 1,
                }}
            />

            {/* Right black gradient fade */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '40%',
                    height: '100%',
                    background: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0) 100%)',
                    pointerEvents: 'none',
                    zIndex: 1,
                }}
            />

            {/* Bottom gradient for text readability */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '60%',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0) 100%)',
                    pointerEvents: 'none',
                    zIndex: 1,
                }}
            />

            {/* Content overlay - centered */}
            <Box
                sx={{
                    position: 'relative',
                    zIndex: 2,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    textAlign: 'center',
                    pb: { xs: 3, sm: 4, md: 6 },
                    px: { xs: 3, sm: 4 },
                }}
            >
                <Typography
                    fontFamily={FONTS.ANTON}
                    sx={{
                        fontSize: { xs: '1rem', sm: '1.15rem' },
                        color: theme.palette.primaryGreen.main,
                        mb: 1,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                    }}
                >
                    Featured Game
                </Typography>
                <Typography
                    fontFamily={FONTS.ANTON}
                    sx={{
                        fontSize: { xs: '3rem', sm: '4rem', md: '5rem' },
                        color: theme.palette.text.primary,
                        mb: 2,
                        textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
                    }}
                >
                    {game.title}
                </Typography>
                <Typography
                    fontFamily={FONTS.NECTO_MONO}
                    sx={{
                        fontSize: { xs: '1rem', sm: '1.1rem', md: '1.2rem' },
                        color: theme.palette.textSecondary.main,
                        mb: 3,
                        maxWidth: '600px',
                        lineHeight: 1.6,
                    }}
                >
                    {game.description}
                </Typography>
                <Box>
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<FaPlay />}
                        onClick={game.onPlay}
                        sx={{
                            backgroundColor: theme.palette.primaryGreen.main,
                            color: theme.palette.darkBackground.main,
                            fontFamily: FONTS.ANTON,
                            fontSize: { xs: '1.15rem', sm: '1.35rem' },
                            fontWeight: 600,
                            px: { xs: 3, sm: 4 },
                            py: { xs: 1.5, sm: 2 },
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                                backgroundColor: theme.palette.softGreen.main,
                                transform: 'translateY(-2px)',
                                boxShadow: `0 6px 20px ${theme.palette.primaryGreen.main}60`,
                            }
                        }}
                    >
                        Play Now
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

export default GameHeroBanner;
