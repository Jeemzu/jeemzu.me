import { useState } from 'react';
import GameContainer from '../../components/GameContainer';
import ComingSoonModal from '../../components/ComingSoonModal';
import { createSnakeGameConfig } from '../../games/SnakeGame';
import { type GameDataProps } from "../GameTypes";

// Import game assets
import websiteThumbnail from '../../assets/images/website.png';
import snake1Gif from '../../assets/images/1.gif';
import pong2Gif from '../../assets/images/2.gif';
import tetris3Gif from '../../assets/images/3.gif';
import breakout4Gif from '../../assets/images/4.gif';

// Game launcher hook - we'll use this to manage game state
export const useGameLauncher = () => {
    const [currentGame, setCurrentGame] = useState<{
        title: string;
        config: ReturnType<typeof createSnakeGameConfig>;
    } | null>(null);
    const [comingSoonGame, setComingSoonGame] = useState<string | null>(null);

    const launchSnake = () => {
        setCurrentGame({
            title: 'Snake',
            config: createSnakeGameConfig(),
        });
    };

    const showComingSoon = (gameTitle: string) => {
        setComingSoonGame(gameTitle);
    };

    const closeGame = () => {
        setCurrentGame(null);
    };

    const closeComingSoon = () => {
        setComingSoonGame(null);
    };

    const GameModal = currentGame ? (
        <GameContainer
            open={!!currentGame}
            onClose={closeGame}
            gameTitle={currentGame.title}
            gameConfig={currentGame.config}
        />
    ) : null;

    const ComingSoonGameModal = comingSoonGame ? (
        <ComingSoonModal
            open={!!comingSoonGame}
            onClose={closeComingSoon}
            gameTitle={comingSoonGame}
        />
    ) : null;

    return { launchSnake, showComingSoon, GameModal, ComingSoonGameModal };
};

// Create game data with launcher functions
export const createGameData = (launchers: {
    launchSnake: () => void;
    showComingSoon: (gameTitle: string) => void;
}): GameDataProps[] => [
        {
            id: 'snake',
            title: 'Snake',
            description: 'Classic snake game - eat the food and grow longer without hitting yourself!',
            thumbnail: websiteThumbnail,
            gameplayGif: snake1Gif,
            genre: 'Arcade',
            featured: true,
            onPlay: launchers.launchSnake,
        },
        {
            id: 'pong',
            title: 'Pong',
            description: 'Retro arcade classic - bounce the ball and beat the AI opponent!',
            thumbnail: websiteThumbnail,
            gameplayGif: pong2Gif,
            genre: 'Arcade',
            onPlay: () => launchers.showComingSoon('Pong'),
        },
        {
            id: 'tetris',
            title: 'Tetris',
            description: 'Stack falling blocks to clear lines. How high can you score?',
            thumbnail: websiteThumbnail,
            gameplayGif: tetris3Gif,
            genre: 'Puzzle',
            onPlay: () => launchers.showComingSoon('Tetris'),
        },
        {
            id: 'breakout',
            title: 'Breakout',
            description: 'Break all the bricks with your paddle and ball!',
            thumbnail: websiteThumbnail,
            gameplayGif: breakout4Gif,
            genre: 'Arcade',
            onPlay: () => launchers.showComingSoon('Breakout'),
        },
    ];// Default export for backward compatibility - empty onPlay handlers
export const gameData: GameDataProps[] = [
    {
        id: 'snake',
        title: 'Snake',
        description: 'Classic snake game - eat the food and grow longer without hitting yourself!',
        thumbnail: websiteThumbnail,
        gameplayGif: snake1Gif,
        genre: 'Arcade',
        featured: true,
        onPlay: () => console.log('Use GamesPage with launcher'),
    },
    {
        id: 'pong',
        title: 'Pong',
        description: 'Retro arcade classic - bounce the ball and beat the AI opponent!',
        thumbnail: websiteThumbnail,
        gameplayGif: pong2Gif,
        genre: 'Arcade',
        onPlay: () => console.log('Launching Pong game...'),
    },
    {
        id: 'tetris',
        title: 'Tetris',
        description: 'Stack falling blocks to clear lines. How high can you score?',
        thumbnail: websiteThumbnail,
        gameplayGif: tetris3Gif,
        genre: 'Puzzle',
        onPlay: () => console.log('Launching Tetris game...'),
    },
    {
        id: 'breakout',
        title: 'Breakout',
        description: 'Break all the bricks with your paddle and ball!',
        thumbnail: websiteThumbnail,
        gameplayGif: breakout4Gif,
        genre: 'Arcade',
        onPlay: () => console.log('Launching Breakout game...'),
    },
];
