// Shared level data types — used by both LevelEditorPage and WasmGameContainer.
// These mirror the C++ LevelObj enum and struct in cpp/platformer/main.cpp.

export interface LevelSpike {
    type: 'spike';
    id: string;
    worldX: number;       // pixels of world scroll when object enters right edge
}

export interface LevelPit {
    type: 'pit';
    id: string;
    worldX: number;
    width: number;        // pit width in pixels (always snapped to 32px grid)
}

export interface LevelPlatform {
    type: 'platform';
    id: string;
    worldX: number;
    worldY: number;       // pixels above GROUND_Y for the platform's TOP surface
    width: number;
    height: number;       // platform thickness in pixels
}

export type LevelObject = LevelSpike | LevelPit | LevelPlatform;

export interface LevelData {
    objects: LevelObject[];
}
