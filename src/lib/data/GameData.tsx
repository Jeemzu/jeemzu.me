import { useState } from 'react';
import { useLocation } from 'wouter';
import WasmGameContainer from '../../components/WasmGameContainer';
import PlatformerLevelSelect from '../../components/PlatformerLevelSelect';
import ComingSoonModal from '../../components/ComingSoonModal';
import { type GameDataProps } from "../GameTypes";
import { type LevelFile } from '../LevelSchema';
import { markLevelCompleted } from '../../components/PlatformerLevelSelect';

import snakepng from '../../assets/images/snake.png';
import snakegif from '../../assets/images/snake.gif';
import zaimpng from '../../assets/images/zaim.png';
import zaimgif from '../../assets/images/zaim.gif';
import brickbreakpng from '../../assets/images/brickbreak.png';
import brickbreakgif from '../../assets/images/brickbreak.gif';
import tetrispng from '../../assets/images/tetris.png';
import tetrisgif from '../../assets/images/tetris.gif';
import platformerpng from '../../assets/images/platformer.png';
import comingSoonpng from "../../assets/images/comingsoon.png";

export const useGameLauncher = () => {
    const [, navigate] = useLocation();
    const [comingSoonGame, setComingSoonGame] = useState<string | null>(null);
    const [platformerOpen, setPlatformerOpen] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState<LevelFile | null>(null);

    const launchSnake = () => navigate('/games/snake');
    const launchZAim = () => navigate('/games/zaim');
    const launchBrickBreak = () => navigate('/games/brickbreak');
    const launchTetris = () => navigate('/games/tetris');

    const launchPlatformer = () => {
        setSelectedLevel(null);
        setPlatformerOpen(true);
    };

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

    const RPGModal = null;

    const LevelSelectModal = (
        <PlatformerLevelSelect
            open={platformerOpen && !selectedLevel}
            onClose={() => setPlatformerOpen(false)}
            onSelectLevel={(level) => setSelectedLevel(level)}
        />
    );

    const WasmModal = selectedLevel ? (
        <WasmGameContainer
            open={platformerOpen && !!selectedLevel}
            onClose={() => setSelectedLevel(null)}
            gameTitle="The (Im)Possible Game"
            wasmName="platformer"
            levelFile={selectedLevel}
            levelLabel={selectedLevel.number > 0 ? `Level ${selectedLevel.number} — ${selectedLevel.name}` : selectedLevel.name}
            onLevelComplete={selectedLevel.number > 0 ? () => markLevelCompleted(selectedLevel.number) : undefined}
        />
    ) : null;

    return { launchSnake, launchZAim, launchBrickBreak, launchTetris, launchPlatformer, showComingSoon, GameModal, ComingSoonGameModal, RPGModal, WasmModal, LevelSelectModal };
};

// Create game data with launcher functions
export const createGameData = (launchers: {
    launchSnake: () => void;
    launchZAim: () => void;
    launchBrickBreak: () => void;
    launchTetris: () => void;
    launchPlatformer: () => void;
    showComingSoon: (gameTitle: string) => void;
}): GameDataProps[] => [
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
        },
        {
            id: 'progenitors',
            title: 'The Progenitors',
            description: 'A turn-based RPG. Progress saved locally.',
            thumbnail: comingSoonpng,
            gameplayGif: comingSoonpng,
            genre: 'RPG',
            featured: true,
            onPlay: () => launchers.showComingSoon('The Progenitors'),
        }
    ];
