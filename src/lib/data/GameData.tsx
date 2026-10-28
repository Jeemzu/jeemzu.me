import { useState } from 'react';
import { useLocation } from 'wouter';
import ComingSoonModal from '../../components/ComingSoonModal';
import { type GameDataProps } from "../GameTypes";
import { playPath } from '../../game-player/registry';

import snakepng from '../../assets/images/snake.png';
import snakegif from '../../assets/images/snake.gif';
import zaimpng from '../../assets/images/zaim.png';
import zaimgif from '../../assets/images/zaim.gif';
import brickbreakpng from '../../assets/images/brickbreak.png';
import brickbreakgif from '../../assets/images/brickbreak.gif';
import tetrispng from '../../assets/images/tetris.png';
import tetrisgif from '../../assets/images/tetris.gif';
import platformerpng from '../../assets/images/platformer.png';
import puttpartysvg from '../../assets/images/puttparty.svg';

export const useGameLauncher = () => {
    const [, navigate] = useLocation();
    const [comingSoonGame, setComingSoonGame] = useState<string | null>(null);

    const launchSnake = () => navigate(playPath('snake'));
    const launchZAim = () => navigate(playPath('zaim'));
    const launchBrickBreak = () => navigate(playPath('brickbreak'));
    const launchTetris = () => navigate(playPath('tetris'));

    const launchPlatformer = () => navigate(playPath('impossible'));
    const launchPuttParty = () => navigate(playPath('puttparty'));

    const showComingSoon = (gameTitle: string) => {
        setComingSoonGame(gameTitle);
    };

    const closeComingSoon = () => {
        setComingSoonGame(null);
    };

    const GameModal = null;

    const ComingSoonGameModal = comingSoonGame ? (
        <ComingSoonModal
            open={!!comingSoonGame}
            onClose={closeComingSoon}
            gameTitle={comingSoonGame}
        />
    ) : null;

    return { launchSnake, launchZAim, launchBrickBreak, launchTetris, launchPlatformer, launchPuttParty, showComingSoon, GameModal, ComingSoonGameModal };
};

// Create game data with launcher functions
export const createGameData = (launchers: {
    launchSnake: () => void;
    launchZAim: () => void;
    launchBrickBreak: () => void;
    launchTetris: () => void;
    launchPlatformer: () => void;
    launchPuttParty: () => void;
    showComingSoon: (gameTitle: string) => void;
}): GameDataProps[] => [
        {
            id: 'puttparty',
            title: 'Better Putt Party',
            description: 'Online mini-golf for 1-6 players. Everyone putts at once across six holes; lowest score wins.',
            thumbnail: puttpartysvg,
            gameplayGif: puttpartysvg,
            genre: 'Native',
            onPlay: launchers.launchPuttParty,
        },
        {
            id: 'platformer',
            title: 'The (Im)Possible Game',
            description: 'A side-scrolling platformer with a level editor you can use to create your own challenges.',
            thumbnail: platformerpng,
            gameplayGif: platformerpng,
            genre: 'Native',
            onPlay: launchers.launchPlatformer,
        },
        {
            id: 'zaim',
            title: 'zAim',
            description: 'Test your reflexes! Click targets before they disappear in this FPS aim trainer.',
            thumbnail: zaimpng,
            gameplayGif: zaimgif,
            genre: 'Arcade',
            featured: false,
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
            id: 'brickbreak',
            title: 'Brick Break',
            description: 'Break all the bricks with your paddle and ball!',
            thumbnail: brickbreakpng,
            gameplayGif: brickbreakgif,
            genre: 'Classics',
            onPlay: launchers.launchBrickBreak,
        },
        {
            id: 'tetris',
            title: 'Tetris',
            description: 'Stack falling blocks to clear lines. How high can you score?',
            thumbnail: tetrispng,
            gameplayGif: tetrisgif,
            genre: 'Classics',
            onPlay: launchers.launchTetris,
        }
    ];
