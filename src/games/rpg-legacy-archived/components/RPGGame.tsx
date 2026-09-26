import { Suspense, lazy } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useRPGState } from '../hooks/useRPGState';

// Lazy-load heavy components
const CharacterCreation = lazy(() => import('./CharacterCreation'));
const OverworldMap = lazy(() => import('./OverworldMap'));
const TownView = lazy(() => import('./TownView'));
const ShopMenu = lazy(() => import('./ShopMenu'));
const DungeonView = lazy(() => import('./DungeonView'));
const BattleScreen = lazy(() => import('./BattleScreen'));
const LevelUpScreen = lazy(() => import('./LevelUpScreen'));
const GameOver = lazy(() => import('./GameOver'));

function Loading() {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <CircularProgress size={28} sx={{ color: '#a8d67e' }} />
        </Box>
    );
}

interface RPGGameProps {
    onExit?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function RPGGame(_props: RPGGameProps) {
    // useRPGState returns state + action callbacks at the same level
    const rpg = useRPGState();
    const { state } = rpg;
    // The full return object acts as our "actions" bundle for child components
    const actions = rpg;

    const screen = state.screen;

    return (
        <Suspense fallback={<Loading />}>
            {screen === 'characterCreation' && (
                <CharacterCreation
                    onConfirm={(name, classId, traitId) => actions.startNewGame(name, classId, traitId)}
                />
            )}

            {screen === 'overworld' && (
                <OverworldMap
                    progress={state.progress}
                    onSelectLocation={(locationId) => {
                        if (locationId === 'ascent_of_thrae') {
                            actions.navigateTo('town');
                        } else {
                            actions.enterDungeon(locationId);
                        }
                    }}
                />
            )}

            {screen === 'town' && (
                <TownView
                    character={state.character}
                    gold={state.gold}
                    onRest={() => actions.rest()}
                    onOpenShop={() => actions.navigateTo('shop')}
                    onBack={() => actions.navigateTo('overworld')}
                />
            )}

            {screen === 'shop' && (
                <ShopMenu
                    gold={state.gold}
                    inventory={state.inventory}
                    classId={state.character.classId}
                    equippedWeapon={state.equipment.weapon}
                    equippedArmor={state.equipment.armor}
                    onBuy={(itemId) => actions.buyItem(itemId)}
                    onSell={(itemId) => actions.sellItem(itemId)}
                    onEquip={(itemId) => actions.equipItem(itemId)}
                    onClose={() => actions.navigateTo('town')}
                />
            )}

            {screen === 'dungeon' && state.currentLocation && (
                <DungeonView
                    locationId={state.currentLocation}
                    progress={state.progress}
                    character={state.character}
                    onStartEncounter={(enemyId) => actions.startEncounter(enemyId)}
                    onRetreat={() => actions.navigateTo('overworld')}
                />
            )}

            {screen === 'battle' && (
                <BattleScreen
                    state={state}
                    actions={actions}
                />
            )}

            {screen === 'levelUp' && (
                <LevelUpScreen
                    state={state}
                    actions={actions}
                />
            )}

            {screen === 'gameOver' && (
                <GameOver
                    state={state}
                    actions={actions}
                />
            )}
        </Suspense>
    );
}
