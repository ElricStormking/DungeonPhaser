export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;
export const PIXEL_SIZE = 4; // Base pixel size for art
export const TILE_SIZE = 48; // Size of each tile in the game grid

// Define world dimensions (2800x2800)
export const WORLD_WIDTH = 2800;
export const WORLD_HEIGHT = 2800;

// Define tile indices
export const MEADOW_TILE = 0;
export const BUSH_TILE = 1;
export const FOREST_TILE = 2;
export const SWAMP_TILE = 3;
export const FLOOR_TILE = 4;
export const BORDER_TILE = 5;

// Game settings
export const FILE_SIZE = 16; // Size of follower entity

// Terrain movement modifiers
export const FOREST_SPEED_MODIFIER = 0.5; // 50% speed in forests
export const BUSH_SPEED_MODIFIER = 0.75; // 75% speed in bushes
export const SWAMP_DAMAGE = 1; // Damage per second in swamps

// Calculate grid dimensions based on world size and tile size
export const GRID_COLS = Math.ceil(WORLD_WIDTH / TILE_SIZE);
export const GRID_ROWS = Math.ceil(WORLD_HEIGHT / TILE_SIZE);

// Enemy wave settings
export const WAVE_COUNT = 5; // 5 waves per level
export const BOSS_LEVEL_INTERVAL = 8; // Boss appears every 8 levels

// Game mechanics constants
export const MAX_FOLLOWERS = 10; // Maximum number of followers the player can have
export const BASE_PLAYER_SPEED = 200; // Increased base movement speed for larger world
export const BASE_ENEMY_SPEED = 160; // Increased base enemy speed

// Audio settings
export const MUSIC_VOLUME = 0.5;
export const SFX_VOLUME = 0.7;

// UI constants
export const UI_PADDING = 20;
export const UI_FONT_FAMILY = 'Arial';
export const UI_BAR_HEIGHT = 80;
export const UI_DEPTH = 100;
export const UI_FONT_SIZES = {
    TITLE: '32px',
    LARGE: '24px',
    MEDIUM: '20px',
    SMALL: '16px'
};
export const UI_COLORS = {
    TEXT: '#FFFFFF',
    HEALTH: '#00FF00',
    COOLDOWN: '#FF0000',
    EXPERIENCE: '#00FFFF',
    BACKGROUND: '#000000',
    BORDER: '#333333'
};