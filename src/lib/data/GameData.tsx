import { useState } from 'react';
import GameContainer from '../../components/GameContainer';
import ComingSoonModal from '../../components/ComingSoonModal';
import { createSnakeGameConfig } from '../../games/SnakeGame';
import { createZAimGameConfig } from '../../games/ZAimGame';
import { createPongGameConfig } from '../../games/PongGame';
import { createBreakoutGameConfig } from '../../games/BreakoutGame';
import { createTetrisGameConfig } from '../../games/TetrisGame';
import { type GameDataProps } from "../GameTypes";

// Import game assets
import snakepng from '../../assets/images/snake.png';
import snakegif from '../../assets/images/snake.gif';
import zaimpng from '../../assets/images/zaim.png';
import zaimgif from '../../assets/images/zaim.gif';
import pongpng from '../../assets/images/pong.png';
import ponggif from '../../assets/images/pong.gif';
import breakoutpng from '../../assets/images/breakout.png';
import breakoutgif from '../../assets/images/breakout.gif';
import tetrispng from '../../assets/images/tetris.png';
import tetrisgif from '../../assets/images/tetris.gif';

// Game launcher hook - we'll use this to manage game state
export const useGameLauncher = () => {
    const [currentGame, setCurrentGame] = useState<{
        title: string;
        config: ReturnType<typeof createSnakeGameConfig> | ReturnType<typeof createZAimGameConfig>;
        showColorOption?: boolean;
    } | null>(null);
    const [comingSoonGame, setComingSoonGame] = useState<string | null>(null);

    const launchSnake = () => {
        setCurrentGame({
            title: 'Snake',
            config: createSnakeGameConfig(),
            showColorOption: true,
        });
    };

    const launchZAim = () => {
        setCurrentGame({
            title: 'zAim',
            config: createZAimGameConfig(),
            showColorOption: true,
        });
    };

    const launchPong = () => {
        setCurrentGame({
            title: 'Pong',
            config: createPongGameConfig(),
            showColorOption: true,
        });
    };

    const launchBreakout = () => {
        setCurrentGame({
            title: 'Breakout',
            config: createBreakoutGameConfig(),
            showColorOption: true,
        });
    };

    const launchTetris = () => {
        setCurrentGame({
            title: 'Tetris',
            config: createTetrisGameConfig(),
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
            showColorOption={currentGame.showColorOption}
        />
    ) : null;

    const ComingSoonGameModal = comingSoonGame ? (
        <ComingSoonModal
            open={!!comingSoonGame}
            onClose={closeComingSoon}
            gameTitle={comingSoonGame}
        />
    ) : null;

    return { launchSnake, launchZAim, launchPong, launchBreakout, launchTetris, showComingSoon, GameModal, ComingSoonGameModal };
};

// Create game data with launcher functions
export const createGameData = (launchers: {
    launchSnake: () => void;
    launchZAim: () => void;
    launchPong: () => void;
    launchBreakout: () => void;
    launchTetris: () => void;
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
            genre: 'Classics',
            onPlay: launchers.launchSnake,
        },
        {
            id: 'pong',
            title: 'Pong',
            description: 'Retro arcade classic - bounce the ball and beat the AI opponent!',
            thumbnail: pongpng,
            gameplayGif: ponggif,
            genre: 'Classics',
            onPlay: launchers.launchPong,
        },
        {
            id: 'breakout',
            title: 'Breakout',
            description: 'Break all the bricks with your paddle and ball!',
            thumbnail: breakoutpng,
            gameplayGif: breakoutgif,
            genre: 'Classics',
            onPlay: launchers.launchBreakout,
        },
        {
            id: 'tetris',
            title: 'Tetris',
            description: 'Stack falling blocks to clear lines. How high can you score?',
            thumbnail: tetrispng,
            gameplayGif: tetrisgif,
            genre: 'Classics',
            onPlay: launchers.launchTetris,
        },
    ];// Default export for backward compatibility - empty onPlay handlers
export const gameData: GameDataProps[] = [
    {
        id: 'snake',
        title: 'Snake',
        description: 'Classic Snake - eat the food and grow longer without hitting yourself!',
        thumbnail: snakepng,
        gameplayGif: snakegif,
        genre: 'Classics',
        featured: true,
        onPlay: () => console.log('Use GamesPage with launcher'),
    },
    {
        id: 'pong',
        title: 'Pong',
        description: 'Retro arcade classic - bounce the ball and beat the AI opponent!',
        thumbnail: pongpng,
        gameplayGif: ponggif,
        genre: 'Classics',
        onPlay: () => console.log('Launching Pong game...'),
    },
    {
        id: 'breakout',
        title: 'Breakout',
        description: 'Break all the bricks with your paddle and ball!',
        thumbnail: breakoutpng,
        gameplayGif: breakoutgif,
        genre: 'Classics',
        onPlay: () => console.log('Launching Breakout game...'),
    },
    {
        id: 'tetris',
        title: 'Tetris',
        description: 'Stack falling blocks to clear lines. How high can you score?',
        thumbnail: tetrispng,
        gameplayGif: tetrisgif,
        genre: 'Classics',
        onPlay: () => console.log('Launching Tetris game...'),
    },
];
