import { Box, Typography, useTheme, IconButton } from "@mui/material";
import { type GameDataProps } from "../../lib/GameTypes";
import { FONTS } from "../../lib/globals";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useRef, useState } from "react";
import GameCard from "./GameCard.tsx";

interface GameRowProps {
    title: string;
    games: GameDataProps[];
}

const GameRow = ({ title, games }: GameRowProps) => {
    const theme = useTheme();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);

    // Don't show scroll arrows if there are 4 or fewer games
    const showScrollArrows = games.length > 4;

    const checkScrollPosition = () => {
        if (!scrollContainerRef.current || !showScrollArrows) return;

        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        setShowLeftArrow(scrollLeft > 0);
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    };

    const scroll = (direction: 'left' | 'right') => {
        if (!scrollContainerRef.current) return;

        const scrollAmount = 400;
        const newScrollLeft = direction === 'left'
            ? scrollContainerRef.current.scrollLeft - scrollAmount
            : scrollContainerRef.current.scrollLeft + scrollAmount;

        scrollContainerRef.current.scrollTo({
            left: newScrollLeft,
            behavior: 'smooth'
        });

        setTimeout(checkScrollPosition, 300);
    };

    return (
        <Box sx={{ mb: 5 }}>
            {/* Row Title */}
            <Typography
                fontFamily={FONTS.ANTON}
                variant="h3"
                sx={{
                    color: theme.palette.text.primary,
                    mb: 2,
                    ml: 2,
                }}
            >
                {title}
            </Typography>

            {/* Scrollable Container */}
            <Box sx={{ position: 'relative', mx: 2 }}>
                {/* Left Arrow */}
                {showScrollArrows && showLeftArrow && (
                    <IconButton
                        onClick={() => scroll('left')}
                        sx={{
                            position: 'absolute',
                            left: -20,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 2,
                            backgroundColor: 'rgba(18, 18, 18, 0.9)',
                            color: theme.palette.primaryGreen.main,
                            '&:hover': {
                                backgroundColor: 'rgba(18, 18, 18, 0.95)',
                                color: theme.palette.softGreen.main,
                            },
                            width: 50,
                            height: 50,
                        }}
                    >
                        <FaChevronLeft size={20} />
                    </IconButton>
                )}

                {/* Right Arrow */}
                {showScrollArrows && showRightArrow && (
                    <IconButton
                        onClick={() => scroll('right')}
                        sx={{
                            position: 'absolute',
                            right: -20,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 2,
                            backgroundColor: 'rgba(18, 18, 18, 0.9)',
                            color: theme.palette.primaryGreen.main,
                            '&:hover': {
                                backgroundColor: 'rgba(18, 18, 18, 0.95)',
                                color: theme.palette.softGreen.main,
                            },
                            width: 50,
                            height: 50,
                        }}
                    >
                        <FaChevronRight size={20} />
                    </IconButton>
                )}

                {/* Games Container */}
                <Box
                    ref={scrollContainerRef}
                    onScroll={checkScrollPosition}
                    sx={{
                        display: 'flex',
                        gap: 2,
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        scrollBehavior: 'smooth',
                        pb: 2,
                        '&::-webkit-scrollbar': {
                            height: 8,
                        },
                        '&::-webkit-scrollbar-track': {
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: 4,
                        },
                        '&::-webkit-scrollbar-thumb': {
                            backgroundColor: theme.palette.primaryGreen.main,
                            borderRadius: 4,
                            '&:hover': {
                                backgroundColor: theme.palette.softGreen.main,
                            },
                        },
                    }}
                >
                    {games.map((game) => (
                        <Box
                            key={game.id}
                            sx={{
                                minWidth: { xs: '250px', sm: '280px', md: '300px' },
                                maxWidth: { xs: '250px', sm: '280px', md: '300px' },
                                p: 1,
                            }}
                        >
                            <GameCard {...game} />
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );
};

export default GameRow;
