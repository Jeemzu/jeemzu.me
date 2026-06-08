import { useState } from 'react';
import GameContainer from '../../components/GameContainer';
import WasmGameContainer from '../../components/WasmGameContainer';
import PlatformerLevelSelect from '../../components/PlatformerLevelSelect';
import ComingSoonModal from '../../components/ComingSoonModal';
import { createSnakeGameConfig } from '../../games/SnakeGame';
import { createZAimGameConfig } from '../../games/ZAimGame';
import { createBreakoutGameConfig } from '../../games/BreakoutGame';
import { createTetrisGameConfig } from '../../games/TetrisGame';
import { type GameDataProps } from "../GameTypes";
import { type LevelFile } from '../LevelSchema';
import { markLevelCompleted } from '../../components/PlatformerLevelSelect';

// Import game assets
import snakepng from '../../assets/images/snake.png';
import snakegif from '../../assets/images/snake.gif';
import zaimpng from '../../assets/images/zaim.png';
import zaimgif from '../../assets/images/zaim.gif';
import breakoutpng from '../../assets/images/breakout.png';
import breakoutgif from '../../assets/images/breakout.gif';
import tetrispng from '../../assets/images/tetris.png';
import tetrisgif from '../../assets/images/tetris.gif';
import progenitorsThumbnail from '../../assets/images/progenitors-thumbnail.svg';

// Game launcher hook - we'll use this to manage game state
export const useGameLauncher = () => {
    const [currentGame, setCurrentGame] = useState<{
        title: string;
        config: ReturnType<typeof createSnakeGameConfig> | ReturnType<typeof createZAimGameConfig>;
        showColorOption?: boolean;
    } | null>(null);
    const [comingSoonGame, setComingSoonGame] = useState<string | null>(null);
    const [platformerOpen, setPlatformerOpen] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState<LevelFile | null>(null);

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

    const launchBreakout = () => {
        setCurrentGame({
            title: 'Brick Break',
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

    const launchPlatformer = () => {
        setSelectedLevel(null);
        setPlatformerOpen(true);
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
            gameTitle="Platform Rush"
            wasmName="platformer"
            levelFile={selectedLevel}
            levelLabel={selectedLevel.number > 0 ? `Level ${selectedLevel.number} — ${selectedLevel.name}` : selectedLevel.name}
            onLevelComplete={selectedLevel.number > 0 ? () => markLevelCompleted(selectedLevel.number) : undefined}
        />
    ) : null;

    return { launchSnake, launchZAim, launchBreakout, launchTetris, launchPlatformer, showComingSoon, GameModal, ComingSoonGameModal, RPGModal, WasmModal, LevelSelectModal };
};

// Create game data with launcher functions
export const createGameData = (launchers: {
    launchSnake: () => void;
    launchZAim: () => void;
    launchBreakout: () => void;
    launchTetris: () => void;
    launchPlatformer: () => void;
    showComingSoon: (gameTitle: string) => void;
}): GameDataProps[] => [
        {
            id: 'progenitors',
            title: 'The Progenitors',
            description: 'A turn-based RPG. Choose your class, master Spirit Aura, and descend into the Undercroft. Progress saved locally.',
            thumbnail: progenitorsThumbnail,
            gameplayGif: progenitorsThumbnail,
            genre: 'RPG',
            featured: true,
            onPlay: () => launchers.showComingSoon('The Progenitors'),
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
            id: 'breakout',
            title: 'Brick Break',
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
        {
            id: 'platformer',
            title: 'Platform Rush',
            description: 'A side-scrolling platformer written in C++ and compiled to WebAssembly. Dodge the spikes — every gap is always jumpable.',
            thumbnail: progenitorsThumbnail,
            gameplayGif: progenitorsThumbnail,
            genre: 'Native',
            onPlay: launchers.launchPlatformer,
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
        id: 'breakout',
        title: 'Brick Break',
        description: 'Break all the bricks with your paddle and ball!',
        thumbnail: breakoutpng,
        gameplayGif: breakoutgif,
        genre: 'Classics',
        onPlay: () => console.log('Use GamesPage with launcher'),
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
