import { useState } from 'react';
import GameContainer from '../../components/GameContainer';
import ComingSoonModal from '../../components/ComingSoonModal';
import { createSnakeGameConfig } from '../../games/SnakeGame';
import { createZAimGameConfig } from '../../games/ZAimGame';
import { type GameDataProps } from "../GameTypes";

// Import game assets
import comingsoonpng from '../../assets/images/comingsoon.png';
import comingsoongif from '../../assets/images/comingsoon.gif';
import snakepng from '../../assets/images/snake.png';
import snakegif from '../../assets/images/snake.gif';
import zaimpng from '../../assets/images/zaim.png';
import zaimgif from '../../assets/images/zaim.gif';

// Game launcher hook - we'll use this to manage game state
export const useGameLauncher = () => {
    const [currentGame, setCurrentGame] = useState<{
        title: string;
        config: ReturnType<typeof createSnakeGameConfig> | ReturnType<typeof createZAimGameConfig>;
    } | null>(null);
    const [comingSoonGame, setComingSoonGame] = useState<string | null>(null);

    const launchSnake = () => {
        setCurrentGame({
            title: 'Snake',
            config: createSnakeGameConfig(),
        });
    };

    const launchZAim = () => {
        setCurrentGame({
            title: 'zAim',
            config: createZAimGameConfig(),
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

    return { launchSnake, launchZAim, showComingSoon, GameModal, ComingSoonGameModal };
};

// Create game data with launcher functions
export const createGameData = (launchers: {
    launchSnake: () => void;
    launchZAim: () => void;
    showComingSoon: (gameTitle: string) => void;
}): GameDataProps[] => [
        {
            id: 'zaim',
            title: 'zAim',
            description: 'Test your reflexes! Click targets before they disappear in this FPS aim trainer.',
            thumbnail: zaimpng,
            gameplayGif: zaimgif,
            genre: 'Arcade',
            featured: true,
            onPlay: launchers.launchZAim,
        },
        {
            id: 'snake',
            title: 'Snake',
            description: 'Classic Snake - eat the food and grow longer without hitting yourself!',
            thumbnail: snakepng,
            gameplayGif: snakegif,
            genre: 'Arcade',
            onPlay: launchers.launchSnake,
        },
        {
            id: 'pong',
            title: 'Pong',
            description: 'Retro arcade classic - bounce the ball and beat the AI opponent!',
            thumbnail: comingsoonpng,
            gameplayGif: comingsoongif,
            genre: 'Arcade',
            onPlay: () => launchers.showComingSoon('Pong'),
        },
        {
            id: 'tetris',
            title: 'Tetris',
            description: 'Stack falling blocks to clear lines. How high can you score?',
            thumbnail: comingsoonpng,
            gameplayGif: comingsoongif,
            genre: 'Puzzle',
            onPlay: () => launchers.showComingSoon('Tetris'),
        },
        {
            id: 'breakout',
            title: 'Breakout',
            description: 'Break all the bricks with your paddle and ball!',
            thumbnail: comingsoonpng,
            gameplayGif: comingsoongif,
            genre: 'Arcade',
            onPlay: () => launchers.showComingSoon('Breakout'),
        },
    ];// Default export for backward compatibility - empty onPlay handlers
export const gameData: GameDataProps[] = [
    {
        id: 'snake',
        title: 'Snake',
        description: 'Classic Snake - eat the food and grow longer without hitting yourself!',
        thumbnail: snakepng,
        gameplayGif: snakegif,
        genre: 'Arcade',
        featured: true,
        onPlay: () => console.log('Use GamesPage with launcher'),
    },
    {
        id: 'pong',
        title: 'Pong',
        description: 'Retro arcade classic - bounce the ball and beat the AI opponent!',
        thumbnail: comingsoonpng,
        gameplayGif: comingsoongif,
        genre: 'Arcade',
        onPlay: () => console.log('Launching Pong game...'),
    },
    {
        id: 'tetris',
        title: 'Tetris',
        description: 'Stack falling blocks to clear lines. How high can you score?',
        thumbnail: comingsoonpng,
        gameplayGif: comingsoongif,
        genre: 'Puzzle',
        onPlay: () => console.log('Launching Tetris game...'),
    },
    {
        id: 'breakout',
        title: 'Breakout',
        description: 'Break all the bricks with your paddle and ball!',
        thumbnail: comingsoonpng,
        gameplayGif: comingsoongif,
        genre: 'Arcade',
        onPlay: () => console.log('Launching Breakout game...'),
    },
];
