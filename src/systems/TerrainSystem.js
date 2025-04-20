import { TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT, GRID_COLS, GRID_ROWS } from '../constants.js';
import { createGameTextures } from '../utils/textureGenerator.js';

// Define terrain types and their IDs
export const TERRAIN = {
    MEADOW: 0,
    BUSH: 1,
    FOREST: 2,
    SWAMP: 3,
    FLOOR: 4,
    BORDER: 5
};

/**
 * Manages terrain-related functionality and effects
 */
export default class TerrainSystem {
    constructor(scene) {
        this.scene = scene;
        
        // Store terrain data
        this.terrainLayer = null;
        this.terrainMap = null;
        this.terrainTileset = null;
        
        // Terrain effects settings
        this.effects = {
            [TERRAIN.MEADOW]: { name: 'Meadow', slowFactor: 1.0, damage: 0 },
            [TERRAIN.BUSH]: { name: 'Bush', slowFactor: 0.75, damage: 0 },
            [TERRAIN.FOREST]: { name: 'Forest', slowFactor: 0.5, damage: 0 },
            [TERRAIN.SWAMP]: { name: 'Swamp', slowFactor: 0.9, damage: 1 },
            [TERRAIN.FLOOR]: { name: 'Floor', slowFactor: 1.0, damage: 0 },
            [TERRAIN.BORDER]: { name: 'Border', slowFactor: 0.5, damage: 2 }
        };
    }
    
    /**
     * Create and initialize the terrain
     */
    createTerrain() {
        // Create a new tilemap with the correct dimensions
        this.terrainMap = this.scene.make.tilemap({
            tileWidth: TILE_SIZE,
            tileHeight: TILE_SIZE,
            width: GRID_COLS,
            height: GRID_ROWS
        });

        // Create terrain textures if they don't exist
        if (!this.scene.textures.exists('terrain')) {
            createGameTextures(this.scene);
        }

        // Add tileset using the generated texture
        this.terrainTileset = this.terrainMap.addTilesetImage('terrain', 'terrain', TILE_SIZE, TILE_SIZE, 0, 0);
        
        // Create the base terrain layer with alpha support
        this.terrainLayer = this.terrainMap.createBlankLayer('terrain', this.terrainTileset, 0, 0);
        this.terrainLayer.setDepth(-1); // Make sure terrain is behind everything
        this.terrainLayer.setAlpha(1); // Enable alpha for the layer
        
        // Set the layer size to match the world size
        this.terrainLayer.width = WORLD_WIDTH;
        this.terrainLayer.height = WORLD_HEIGHT;
        
        // First, generate the main terrain
        this.generateTerrain();
        
        // Then add border walls on top of the terrain
        this.createBorderWalls();
        
        // Set collision properties for swamp and border tiles
        this.terrainLayer.setCollisionByProperty({ index: [TERRAIN.SWAMP, TERRAIN.BORDER] });
        
        // Add collision for player
        if (this.scene.player) {
            this.setupTerrainCollisions();
        }
        
        console.log('Terrain created with tileset:', this.terrainTileset);
    }
    
    /**
     * Create border walls around the map edges
     */
    createBorderWalls() {
        // Add border on the outer edge of the map
        const borderWidth = 2; // Width of the border in tiles
        
        // Top border
        for (let x = 0; x < GRID_COLS; x++) {
            for (let y = 0; y < borderWidth; y++) {
                this.terrainLayer.putTileAt(TERRAIN.BORDER, x, y);
            }
        }
        
        // Bottom border
        for (let x = 0; x < GRID_COLS; x++) {
            for (let y = GRID_ROWS - borderWidth; y < GRID_ROWS; y++) {
                this.terrainLayer.putTileAt(TERRAIN.BORDER, x, y);
            }
        }
        
        // Left border
        for (let y = 0; y < GRID_ROWS; y++) {
            for (let x = 0; x < borderWidth; x++) {
                this.terrainLayer.putTileAt(TERRAIN.BORDER, x, y);
            }
        }
        
        // Right border
        for (let y = 0; y < GRID_ROWS; y++) {
            for (let x = GRID_COLS - borderWidth; x < GRID_COLS; x++) {
                this.terrainLayer.putTileAt(TERRAIN.BORDER, x, y);
            }
        }
        
        console.log('Border walls created around the map');
    }
    
    /**
     * Setup collisions between player and terrain
     */
    setupTerrainCollisions() {
        if (this.terrainCollider) {
            this.terrainCollider.destroy();
        }
        
        this.terrainCollider = this.scene.physics.add.collider(
            this.scene.player,
            this.terrainLayer,
            this.handleTerrainCollision,
            null,
            this
        );
        
        console.log('Terrain collisions set up for player');
    }
    
    /**
     * Handle collision with terrain
     * @param {Phaser.GameObjects.GameObject} player - The player object
     * @param {Phaser.Tilemaps.Tile} tile - The tile that was collided with
     */
    handleTerrainCollision(player, tile) {
        if (!tile || !player) return;
        
        if (tile.index === TERRAIN.SWAMP || tile.index === TERRAIN.BORDER) {
            // Apply damage to player when in swamp water or hitting border
            const terrainType = tile.index === TERRAIN.SWAMP ? TERRAIN.SWAMP : TERRAIN.BORDER;
            const damage = this.effects[terrainType].damage;
            
            if (damage > 0 && player.damage) {
                // Apply damage with a cooldown
                const currentTime = Date.now();
                if (!player.lastTerrainDamageTime || currentTime - player.lastTerrainDamageTime > 500) {
                    player.damage(damage);
                    player.lastTerrainDamageTime = currentTime;
                    
                    // Visual feedback for damage - different color based on terrain type
                    const flashColor = tile.index === TERRAIN.BORDER ? 0xFF0000 : 0x2F4F4F;
                    
                    this.scene.tweens.add({
                        targets: player,
                        alpha: 0.5,
                        duration: 100,
                        yoyo: true
                    });
                    
                    // Camera flash for border collision
                    if (tile.index === TERRAIN.BORDER) {
                        this.scene.cameras.main.flash(100, 255, 0, 0, 0.3);
                    }
                    
                    console.log(`Applied ${damage} damage from ${this.effects[terrainType].name} terrain`);
                }
            }
        }
    }
    
    /**
     * Generate terrain data based on current level
     */
    generateTerrain() {
        const noise = new Perlin();
        const scale = 0.05; // Adjust this to change the size of terrain features
        
        // First fill the entire map with floor tiles
        for (let y = 0; y < GRID_ROWS; y++) {
            for (let x = 0; x < GRID_COLS; x++) {
                const tile = this.terrainLayer.putTileAt(TERRAIN.FLOOR, x, y);
                if (tile) {
                    const effect = this.effects[TERRAIN.FLOOR];
                    tile.properties = {
                        name: effect.name,
                        slowFactor: effect.slowFactor,
                        damage: effect.damage
                    };
                }
            }
        }
        
        console.log('Initial floor tiles created for the entire map');
        
        // Now create clusters of other terrain types (total covering ~5% of the map)
        // Create an array to track which cells we've already processed
        const processed = Array(GRID_ROWS).fill().map(() => Array(GRID_COLS).fill(false));
        
        // Create clusters for each terrain type
        this.createTerrainClusters(TERRAIN.FOREST, 3, 8, 15, processed, noise);
        this.createTerrainClusters(TERRAIN.BUSH, 4, 6, 12, processed, noise);
        this.createTerrainClusters(TERRAIN.SWAMP, 2, 5, 10, processed, noise);
        this.createTerrainClusters(TERRAIN.MEADOW, 3, 7, 12, processed, noise);
        
        console.log('Terrain generated with ~95% floor tiles and clustered terrain types');
    }
    
    /**
     * Create clusters of a specific terrain type
     * @param {number} terrainType - The terrain type to create
     * @param {number} numClusters - Number of clusters to create
     * @param {number} minSize - Minimum cluster size
     * @param {number} maxSize - Maximum cluster size
     * @param {Array} processed - 2D array tracking processed cells
     * @param {Perlin} noise - Perlin noise generator for randomization
     */
    createTerrainClusters(terrainType, numClusters, minSize, maxSize, processed, noise) {
        const terrainName = this.effects[terrainType].name;
        
        for (let i = 0; i < numClusters; i++) {
            // Find a random unprocessed location for the cluster
            let startX, startY;
            let attempts = 0;
            const maxAttempts = 50;
            
            do {
                startX = Phaser.Math.Between(5, GRID_COLS - 5);
                startY = Phaser.Math.Between(5, GRID_ROWS - 5);
                attempts++;
                
                // Break if we can't find a valid spot after many attempts
                if (attempts > maxAttempts) break;
            } while (processed[startY][startX]);
            
            if (attempts > maxAttempts) continue;
            
            // Mark this position as processed
            processed[startY][startX] = true;
            
            // Determine cluster size
            const clusterSize = Phaser.Math.Between(minSize, maxSize);
            
            // Create the cluster using a flood fill approach with randomization
            this.createCluster(startX, startY, terrainType, clusterSize, processed, noise);
        }
        
        console.log(`Created ${numClusters} clusters of ${terrainName}`);
    }
    
    /**
     * Create a single cluster using a modified flood fill algorithm
     * @param {number} startX - Starting X position
     * @param {number} startY - Starting Y position 
     * @param {number} terrainType - Type of terrain to place
     * @param {number} size - Size of the cluster
     * @param {Array} processed - Tracking array for processed cells
     * @param {Perlin} noise - Noise generator for randomization
     */
    createCluster(startX, startY, terrainType, size, processed, noise) {
        // Place the first tile
        this.placeTerrain(startX, startY, terrainType);
        processed[startY][startX] = true;
        
        // Use a queue for flood fill
        const queue = [{x: startX, y: startY}];
        let cellsPlaced = 1;
        
        // Directions for neighbor cells (including diagonals)
        const directions = [
            {x: 0, y: -1}, {x: 1, y: -1}, {x: 1, y: 0}, {x: 1, y: 1},
            {x: 0, y: 1}, {x: -1, y: 1}, {x: -1, y: 0}, {x: -1, y: -1}
        ];
        
        while (queue.length > 0 && cellsPlaced < size) {
            // Get random element from queue instead of FIFO for more natural shapes
            const randomIndex = Math.floor(Math.random() * queue.length);
            const current = queue[randomIndex];
            queue.splice(randomIndex, 1);
            
            // Shuffle directions for more organic growth
            Phaser.Utils.Array.Shuffle(directions);
            
            // Try each direction
            for (const dir of directions) {
                const nx = current.x + dir.x;
                const ny = current.y + dir.y;
                
                // Check bounds and if already processed
                if (nx <= 3 || nx >= GRID_COLS - 3 || ny <= 3 || ny >= GRID_ROWS - 3 ||
                    processed[ny][nx]) {
                    continue;
                }
                
                // Use noise to determine if we should place a tile (more natural clusters)
                const noiseValue = noise.noise(nx * 0.2, ny * 0.2);
                const probability = 0.7 + noiseValue * 0.3; // 40% to 100% chance based on noise
                
                if (Math.random() < probability) {
                    this.placeTerrain(nx, ny, terrainType);
                    processed[ny][nx] = true;
                    queue.push({x: nx, y: ny});
                    cellsPlaced++;
                    
                    if (cellsPlaced >= size) break;
                }
            }
        }
    }
    
    /**
     * Place a specific terrain type at the given coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} terrainType - Type of terrain to place
     */
    placeTerrain(x, y, terrainType) {
        const tile = this.terrainLayer.putTileAt(terrainType, x, y);
        if (tile) {
            const effect = this.effects[terrainType];
            tile.properties = {
                name: effect.name,
                slowFactor: effect.slowFactor,
                damage: effect.damage
            };
        }
    }
    
    /**
     * Generate meadow clusters covering approximately 20% of the map
     */
    generateMeadowClusters(mapData, width, height, stage) {
        // Meadow clusters based on stage
        const meadowClusterCount = 3 + stage;
        
        // Meadow cluster size based on stage
        const minClusterSize = 15 + stage * 3;
        const maxClusterSize = 25 + stage * 5;
        
        // Track cluster centers to ensure spacing
        const clusterCenters = [];
        const minClusterDistance = Math.min(width, height) * 0.2; // Minimum distance between clusters
        
        let attempts = 0;
        let clustersCreated = 0;
        
        while (clustersCreated < meadowClusterCount && attempts < meadowClusterCount * 3) {
            attempts++;
            
            // Random cluster center, avoiding edges
            const centerX = Math.floor(width * 0.1) + Math.floor(Math.random() * (width * 0.8));
            const centerY = Math.floor(height * 0.1) + Math.floor(Math.random() * (height * 0.8));
            
            // Check if this is too close to another cluster
            let tooClose = false;
            for (const center of clusterCenters) {
                const distSquared = Math.pow(centerX - center.x, 2) + Math.pow(centerY - center.y, 2);
                if (distSquared < Math.pow(minClusterDistance, 2)) {
                    tooClose = true;
                    break;
                }
            }
            
            // Check if area already has many meadows
            if (!tooClose && this.checkTerrainDensity(mapData, centerX, centerY, maxClusterSize, TERRAIN.MEADOW, width, height)) {
                tooClose = true;
            }
            
            if (tooClose) continue;
            
            // Add this cluster center to the list
            clusterCenters.push({ x: centerX, y: centerY });
            clustersCreated++;
            
            // Random cluster size
            const clusterSize = minClusterSize + Math.floor(Math.random() * (maxClusterSize - minClusterSize));
            
            // Generate the meadow cluster
            for (let y = centerY - clusterSize/2; y < centerY + clusterSize/2; y++) {
                for (let x = centerX - clusterSize/2; x < centerX + clusterSize/2; x++) {
                    if (y >= 0 && y < height && x >= 0 && x < width) {
                        // Calculate distance from center
                        const distSquared = (x - centerX) * (x - centerX) + (y - centerY) * (y - centerY);
                        const normalizedDist = distSquared / (clusterSize * clusterSize / 4);
                        
                        // Higher probability near the center, decreasing outward
                        const meadowProb = Math.max(0, 1 - normalizedDist * 1.1);
                        
                        // Add noise for more natural edges
                        const noise = Math.random() * 0.2;
                        
                        if (Math.random() < meadowProb - noise) {
                            mapData[Math.floor(y)][Math.floor(x)] = TERRAIN.MEADOW;
                        }
                    }
                }
            }
            
            // Occasionally create connecting paths between meadow clusters
            if (clustersCreated > 1 && Math.random() < 0.7) {
                const previousCenterIndex = Math.floor(Math.random() * (clusterCenters.length - 1));
                const prevCenter = clusterCenters[previousCenterIndex];
                this.createMeadowPath(mapData, prevCenter.x, prevCenter.y, centerX, centerY, width, height);
            }
        }
        
        // Ensure we have enough meadow - check total coverage
        let meadowCount = 0;
        let totalTiles = width * height;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (mapData[y][x] === TERRAIN.MEADOW) {
                    meadowCount++;
                }
            }
        }
        
        const currentPercentage = meadowCount / totalTiles;
        const targetPercentage = 0.2; // 20% coverage
        
        // If we're significantly under target, add more meadow
        if (currentPercentage < targetPercentage - 0.05) {
            // Add some additional smaller meadow patches
            const additionalPatches = Math.ceil((targetPercentage - currentPercentage) * totalTiles / 100);
            
            for (let p = 0; p < additionalPatches; p++) {
                const patchX = Math.floor(Math.random() * width);
                const patchY = Math.floor(Math.random() * height);
                const patchSize = 3 + Math.floor(Math.random() * 5);
                
                for (let y = patchY - patchSize/2; y < patchY + patchSize/2; y++) {
                    for (let x = patchX - patchSize/2; x < patchX + patchSize/2; x++) {
                        if (y >= 0 && y < height && x >= 0 && x < width) {
                            const dist = Math.sqrt(Math.pow(x - patchX, 2) + Math.pow(y - patchY, 2));
                            if (dist < patchSize/2 && Math.random() < 0.7) {
                                mapData[Math.floor(y)][Math.floor(x)] = TERRAIN.MEADOW;
                            }
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Generate forest clusters in the map
     */
    generateForestClusters(mapData, width, height, stage) {
        // Determine how many forest clusters to create based on stage
        const forestClusterCount = 3 + stage;
        
        // Forest cluster size increases with stage
        const minClusterSize = 10 + stage * 5;
        const maxClusterSize = 20 + stage * 10;
        
        for (let c = 0; c < forestClusterCount; c++) {
            // Random cluster center, avoiding map edges
            const centerX = Math.floor(width * 0.2) + Math.floor(Math.random() * (width * 0.6));
            const centerY = Math.floor(height * 0.2) + Math.floor(Math.random() * (height * 0.6));
            
            // Random cluster size
            const clusterSize = minClusterSize + Math.floor(Math.random() * (maxClusterSize - minClusterSize));
            
            // Generate the forest cluster using a noise-based approach
            for (let y = centerY - clusterSize/2; y < centerY + clusterSize/2; y++) {
                for (let x = centerX - clusterSize/2; x < centerX + clusterSize/2; x++) {
                    if (y >= 0 && y < height && x >= 0 && x < width) {
                        // Calculate distance from cluster center
                        const distSquared = (x - centerX) * (x - centerX) + (y - centerY) * (y - centerY);
                        const normalizedDist = distSquared / (clusterSize * clusterSize / 4);
                        
                        // Higher probability of forest near the center, decreasing outward
                        const forestProb = Math.max(0, 1 - normalizedDist);
                        
                        // Add noise for more natural look
                        const noise = Math.random() * 0.2;
                        
                        if (Math.random() < forestProb - noise) {
                            mapData[Math.floor(y)][Math.floor(x)] = TERRAIN.FOREST;
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Check if a region already has a lot of specific terrain type
     * @param {Array} mapData - Map terrain data
     * @param {number} centerX - Center X of region to check
     * @param {number} centerY - Center Y of region to check
     * @param {number} radius - Radius to check around center
     * @param {number} terrainType - The terrain type to check for
     * @param {number} width - Map width
     * @param {number} height - Map height
     * @returns {boolean} true if the area already has many of the terrain type
     */
    checkTerrainDensity(mapData, centerX, centerY, radius, terrainType, width, height) {
        let terrainCount = 0;
        let totalTiles = 0;
        
        for (let y = centerY - radius; y <= centerY + radius; y++) {
            for (let x = centerX - radius; x <= centerX + radius; x++) {
                if (y >= 0 && y < height && x >= 0 && x < width) {
                    totalTiles++;
                    if (mapData[y][x] === terrainType) {
                        terrainCount++;
                    }
                }
            }
        }
        
        // If the area already has more than 25% of the terrain type, consider it dense
        return terrainCount / totalTiles > 0.25;
    }
    
    /**
     * Check if a region already has a lot of bushes
     * @param {Array} mapData - Map terrain data
     * @param {number} centerX - Center X of region to check
     * @param {number} centerY - Center Y of region to check
     * @param {number} radius - Radius to check around center
     * @param {number} width - Map width
     * @param {number} height - Map height
     * @returns {boolean} true if the area already has many bushes
     */
    checkBushDensity(mapData, centerX, centerY, radius, width, height) {
        return this.checkTerrainDensity(mapData, centerX, centerY, radius, TERRAIN.BUSH, width, height);
    }
    
    /**
     * Generate bushes - some near forests and some clustered in different areas
     */
    generateBushes(mapData, width, height, stage) {
        // First pass: place bushes near forests
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Skip if this tile is not meadow
                if (mapData[y][x] !== TERRAIN.MEADOW) continue;
                
                // Check if there's a forest nearby
                let hasForestNeighbor = false;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height && 
                            mapData[ny][nx] === TERRAIN.FOREST) {
                            hasForestNeighbor = true;
                            break;
                        }
                    }
                    if (hasForestNeighbor) break;
                }
                
                // Higher probability of bush if near forest
                if (hasForestNeighbor && Math.random() < 0.4) {
                    mapData[y][x] = TERRAIN.BUSH;
                }
            }
        }
        
        // Second pass: create bush clusters in different areas
        // Number of clusters increases with stage
        const bushClusterCount = 4 + stage;
        
        // Bush cluster size based on stage
        const minClusterSize = 4 + stage * 2;
        const maxClusterSize = 8 + stage * 3;
        
        // Track cluster centers to ensure spacing
        const clusterCenters = [];
        const minClusterDistance = Math.min(width, height) * 0.15; // Minimum distance between clusters
        
        let attempts = 0;
        let clustersCreated = 0;
        
        while (clustersCreated < bushClusterCount && attempts < bushClusterCount * 3) {
            attempts++;
            
            // Random cluster center, avoiding edges
            const centerX = Math.floor(width * 0.1) + Math.floor(Math.random() * (width * 0.8));
            const centerY = Math.floor(height * 0.1) + Math.floor(Math.random() * (height * 0.8));
            
            // Check if this is too close to another cluster
            let tooClose = false;
            for (const center of clusterCenters) {
                const distSquared = Math.pow(centerX - center.x, 2) + Math.pow(centerY - center.y, 2);
                if (distSquared < Math.pow(minClusterDistance, 2)) {
                    tooClose = true;
                    break;
                }
            }
            
            // Check if area already has many bushes
            if (!tooClose && this.checkBushDensity(mapData, centerX, centerY, maxClusterSize, width, height)) {
                tooClose = true;
            }
            
            if (tooClose) continue;
            
            // Add this cluster center to the list
            clusterCenters.push({ x: centerX, y: centerY });
            clustersCreated++;
            
            // Random cluster size
            const clusterSize = minClusterSize + Math.floor(Math.random() * (maxClusterSize - minClusterSize));
            
            // Generate the bush cluster using noise-based approach
            for (let y = centerY - clusterSize/2; y < centerY + clusterSize/2; y++) {
                for (let x = centerX - clusterSize/2; x < centerX + clusterSize/2; x++) {
                    if (y >= 0 && y < height && x >= 0 && x < width) {
                        // Only replace meadow tiles
                        if (mapData[Math.floor(y)][Math.floor(x)] !== TERRAIN.MEADOW) continue;
                        
                        // Calculate distance from cluster center
                        const distSquared = (x - centerX) * (x - centerX) + (y - centerY) * (y - centerY);
                        const normalizedDist = distSquared / (clusterSize * clusterSize / 4);
                        
                        // Higher probability of bush near the center, decreasing outward
                        const bushProb = Math.max(0, 1 - normalizedDist * 1.2);
                        
                        // Add noise for more natural look
                        const noise = Math.random() * 0.3;
                        
                        if (Math.random() < bushProb - noise) {
                            mapData[Math.floor(y)][Math.floor(x)] = TERRAIN.BUSH;
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Generate swamps in the map
     */
    generateSwamps(mapData, width, height, stage) {
        // Swamp clusters based on stage
        const swampClusterCount = 2 + stage;
        
        // Swamp cluster size based on stage
        const minClusterSize = 7 + stage * 2;
        const maxClusterSize = 12 + stage * 3;
        
        // Track cluster centers to ensure spacing
        const clusterCenters = [];
        const minClusterDistance = Math.min(width, height) * 0.2; // Minimum distance between clusters
        
        let attempts = 0;
        let clustersCreated = 0;
        
        while (clustersCreated < swampClusterCount && attempts < swampClusterCount * 3) {
            attempts++;
            
            // Random cluster center, avoiding edges
            const centerX = Math.floor(width * 0.1) + Math.floor(Math.random() * (width * 0.8));
            const centerY = Math.floor(height * 0.1) + Math.floor(Math.random() * (height * 0.8));
            
            // Check if this is too close to another cluster
            let tooClose = false;
            for (const center of clusterCenters) {
                const distSquared = Math.pow(centerX - center.x, 2) + Math.pow(centerY - center.y, 2);
                if (distSquared < Math.pow(minClusterDistance, 2)) {
                    tooClose = true;
                    break;
                }
            }
            
            // Check if area already has many swamps
            if (!tooClose && this.checkTerrainDensity(mapData, centerX, centerY, maxClusterSize, TERRAIN.SWAMP, width, height)) {
                tooClose = true;
            }
            
            if (tooClose) continue;
            
            // Add this cluster center to the list
            clusterCenters.push({ x: centerX, y: centerY });
            clustersCreated++;
            
            // Random cluster size
            const clusterSize = minClusterSize + Math.floor(Math.random() * (maxClusterSize - minClusterSize));
            
            // Generate the swamp cluster
            for (let y = centerY - clusterSize/2; y < centerY + clusterSize/2; y++) {
                for (let x = centerX - clusterSize/2; x < centerX + clusterSize/2; x++) {
                    if (y >= 0 && y < height && x >= 0 && x < width) {
                        // Only replace meadow tiles
                        if (mapData[Math.floor(y)][Math.floor(x)] !== TERRAIN.MEADOW) continue;
                        
                        // Calculate distance from center
                        const distSquared = (x - centerX) * (x - centerX) + (y - centerY) * (y - centerY);
                        const normalizedDist = distSquared / (clusterSize * clusterSize / 4);
                        
                        // Higher probability near the center, decreasing outward
                        const swampProb = Math.max(0, 1 - normalizedDist * 1.1);
                        
                        // Add noise for more natural edges and make more contiguous
                        const noise = Math.random() * 0.25; // Less noise for more solid swamp patches
                        
                        if (Math.random() < swampProb - noise) {
                            mapData[Math.floor(y)][Math.floor(x)] = TERRAIN.SWAMP;
                        }
                    }
                }
            }
            
            // Add connecting streams between swamps if there's more than one
            if (clustersCreated > 1 && clustersCreated < swampClusterCount && Math.random() < 0.6) {
                const prevCenter = clusterCenters[clustersCreated - 2];
                this.createSwampStream(mapData, prevCenter.x, prevCenter.y, centerX, centerY, width, height);
            }
        }
    }
    
    /**
     * Create a swamp stream connecting two points
     */
    createSwampStream(mapData, x1, y1, x2, y2, width, height) {
        // Create a winding path between two points
        const points = [];
        const steps = Math.floor(Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 5);
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            // Add some noise to make the stream winding
            const noise = (Math.random() - 0.5) * 8;
            const px = Math.floor(x1 + (x2 - x1) * t + noise);
            const py = Math.floor(y1 + (y2 - y1) * t + noise);
            points.push({x: px, y: py});
        }
        
        // Draw swamp along the path
        for (const point of points) {
            const streamWidth = 2 + Math.floor(Math.random() * 3);
            for (let dy = -streamWidth; dy <= streamWidth; dy++) {
                for (let dx = -streamWidth; dx <= streamWidth; dx++) {
                    const nx = point.x + dx;
                    const ny = point.y + dy;
                    
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        // Only replace meadow with 70% chance to make it look natural
                        if (mapData[ny][nx] === TERRAIN.MEADOW && Math.random() < 0.7) {
                            mapData[ny][nx] = TERRAIN.SWAMP;
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Create tilemap from the terrain data
     */
    createTilemap() {
        // Create the tilemap from our terrain data
        const map = this.scene.make.tilemap({
            data: this.terrainData, 
            tileWidth: TILE_SIZE, 
            tileHeight: TILE_SIZE
        });
        
        // Create terrain textures if they don't exist
        this.createTerrainTextures();
        
        // Add the tileset to the map
        const tileset = map.addTilesetImage('terrain_tiles');
        
        // Create terrain layer
        this.terrainLayer = map.createLayer(0, tileset, 0, 0);
        this.terrainLayer.setDepth(-1); // Draw behind everything else
        
        // Set collision properties for terrain types that need it
        this.terrainLayer.setCollisionByProperty({ index: TERRAIN.SWAMP });
        
        // Set custom properties for all tiles
        this.terrainLayer.forEachTile(tile => {
            // Add properties based on tile index
            const terrainEffect = this.effects[tile.index];
            if (terrainEffect) {
                tile.properties = {
                    name: terrainEffect.name,
                    slowFactor: terrainEffect.slowFactor,
                    damage: terrainEffect.damage
                };
                
                // For debugging
                if (terrainEffect.slowFactor < 1.0) {
                    console.log(`Set up ${terrainEffect.name} tile with slowFactor ${terrainEffect.slowFactor}`);
                }
            }
        });
        
        // Add collision for swamps
        if (this.scene.player) {
            this.scene.physics.add.collider(
                this.scene.player,
                this.terrainLayer,
                this.handleTerrainCollision,
                null,
                this
            );
        }
        
        this.terrainMap = map;
    }
    
    /**
     * Create the terrain textures if they don't exist yet
     */
    createTerrainTextures() {
        const scene = this.scene;
        
        // Skip if textures already exist
        if (scene.textures.exists('meadow_tile') && 
            scene.textures.exists('bush_tile') && 
            scene.textures.exists('forest_tile') &&
            scene.textures.exists('swamp_tile') &&
            scene.textures.exists('floor_tile')) {
            return;
        }
        
        // Use the centralized texture generator instead of duplicating the code
        createGameTextures(scene);
    }
    
    /**
     * Check terrain at a specific world position and return terrain effect
     * @param {number} x - World x position
     * @param {number} y - World y position
     * @returns {object|null} Terrain effect at position or null
     */
    getTerrainAt(x, y) {
        if (!this.terrainLayer) return null;
        
        const tile = this.terrainLayer.getTileAtWorldXY(x, y);
        if (!tile) return null;
        
        return this.effects[tile.index] || null;
    }
    
    /**
     * Apply terrain effects to an entity based on its position
     * @param {object} entity - The entity to apply effects to
     */
    applyTerrainEffects(entity) {
        if (!entity || !entity.active) return;
        
        const terrainEffect = this.getTerrainAt(entity.x, entity.y);
        if (!terrainEffect) return;
        
        // Store original speed if not already stored
        if (entity.originalSpeed === undefined) {
            entity.originalSpeed = entity.speed;
            console.log(`Original speed set: ${entity.originalSpeed} for entity type: ${entity.constructor.name}`);
        }
            
        // Apply slowdown effect - but only if we have a valid slowFactor
        if (terrainEffect.slowFactor < 1.0) {
            // Apply slowdown using the original stored speed to prevent compounding slowdowns
            const newSpeed = entity.originalSpeed * terrainEffect.slowFactor;
            
            // Log the speed change for debugging
            if (entity.constructor.name === 'Player') {
                console.log(`Terrain: ${terrainEffect.name}, SlowFactor: ${terrainEffect.slowFactor}`);
                console.log(`Speed changed: ${entity.speed} → ${newSpeed}`);
            }
            
            entity.speed = newSpeed;
        } else {
            // Reset speed if not on slowing terrain and original speed exists
            if (entity.originalSpeed !== undefined) {
                entity.speed = entity.originalSpeed;
            }
        }
        
        // Apply damage from terrain (like swamp or border) - only to player
        if (terrainEffect.damage > 0 && entity.constructor.name === 'Player' && entity.damage) {
            // Use a damage timer to avoid applying damage every frame
            const currentTime = Date.now();
            if (!entity.lastTerrainDamageTime || currentTime - entity.lastTerrainDamageTime > 1000) {
                entity.damage(terrainEffect.damage);
                entity.lastTerrainDamageTime = currentTime;
                
                // Different visual effects based on terrain type
                if (terrainEffect.name === 'Border') {
                    // Border effect - red flash
                    this.scene.cameras.main.flash(100, 255, 0, 0, 0.3);
                    this.scene.tweens.add({
                        targets: entity,
                        alpha: 0.4,
                        duration: 100,
                        yoyo: true,
                        repeat: 1
                    });
                } else {
                    // Swamp effect - greenish flash
                    this.scene.tweens.add({
                        targets: entity,
                        alpha: 0.6,
                        duration: 100,
                        yoyo: true
                    });
                }
                
                console.log(`Applied ${terrainEffect.damage} damage from ${terrainEffect.name} terrain`);
            }
        }
        
        // For debugging: track terrain changes for player entity
        if (entity.constructor.name === 'Player' && entity.lastTerrainName !== terrainEffect.name) {
            entity.lastTerrainName = terrainEffect.name;
            console.log(`Player entered: ${terrainEffect.name} terrain (slowFactor: ${terrainEffect.slowFactor})`);
        }
    }
    
    /**
     * Update terrain effects on all entities
     */
    update() {
        // Apply terrain effects to player and followers
        if (this.scene.player) {
            this.applyTerrainEffects(this.scene.player);
        }
        
        // Apply to followers
        if (this.scene.followers) {
            this.scene.followers.forEach(follower => {
                this.applyTerrainEffects(follower);
            });
        }
        
        // Apply to enemies
        if (this.scene.enemies) {
            this.scene.enemies.getChildren().forEach(enemy => {
                this.applyTerrainEffects(enemy);
            });
        }
    }
    
    /**
     * Create a natural meadow path connecting two points
     */
    createMeadowPath(mapData, x1, y1, x2, y2, width, height) {
        // Create a winding path between two meadow clusters
        const points = [];
        const steps = Math.floor(Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 4);
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            // Add some noise to make the path winding
            const noise = (Math.random() - 0.5) * 10;
            const px = Math.floor(x1 + (x2 - x1) * t + noise);
            const py = Math.floor(y1 + (y2 - y1) * t + noise);
            points.push({x: px, y: py});
        }
        
        // Draw meadow along the path
        for (const point of points) {
            const pathWidth = 3 + Math.floor(Math.random() * 4);
            for (let dy = -pathWidth; dy <= pathWidth; dy++) {
                for (let dx = -pathWidth; dx <= pathWidth; dx++) {
                    const nx = point.x + dx;
                    const ny = point.y + dy;
                    
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        // Decrease probability with distance from path center
                        const prob = 0.9 - (dist / pathWidth);
                        if (Math.random() < prob) {
                            mapData[ny][nx] = TERRAIN.MEADOW;
                        }
                    }
                }
            }
        }
    }

    addClearings() {
        const numClearings = Math.floor((GRID_COLS * GRID_ROWS) / 1000); // Scale with map size
        
        for (let i = 0; i < numClearings; i++) {
            const centerX = Math.floor(Math.random() * GRID_COLS);
            const centerY = Math.floor(Math.random() * GRID_ROWS);
            const radius = Math.floor(Math.random() * 5) + 3;
            
            // Create circular clearing
            for (let y = -radius; y <= radius; y++) {
                for (let x = -radius; x <= radius; x++) {
                    if (x * x + y * y <= radius * radius) {
                        const tileX = centerX + x;
                        const tileY = centerY + y;
                        
                        if (tileX >= 0 && tileX < GRID_COLS && tileY >= 0 && tileY < GRID_ROWS) {
                            this.terrainLayer.putTileAt(0, tileX, tileY);
                        }
                    }
                }
            }
        }
    }

    addObstacles() {
        const numObstacles = Math.floor((GRID_COLS * GRID_ROWS) / 800); // Scale with map size
        
        for (let i = 0; i < numObstacles; i++) {
            const x = Math.floor(Math.random() * GRID_COLS);
            const y = Math.floor(Math.random() * GRID_ROWS);
            const size = Math.floor(Math.random() * 3) + 2;
            
            // Create rectangular obstacle
            for (let dy = 0; dy < size; dy++) {
                for (let dx = 0; dx < size; dx++) {
                    const tileX = x + dx;
                    const tileY = y + dy;
                    
                    if (tileX >= 0 && tileX < GRID_COLS && tileY >= 0 && tileY < GRID_ROWS) {
                        this.terrainLayer.putTileAt(4, tileX, tileY); // Obstacle tile
                    }
                }
            }
        }
    }
}

// Simple Perlin noise implementation
class Perlin {
    constructor() {
        this.permutation = new Array(256).fill(0).map((_, i) => i);
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
        }
        this.permutation = [...this.permutation, ...this.permutation];
    }

    noise(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        const u = this.fade(x);
        const v = this.fade(y);
        const A = this.permutation[X] + Y;
        const B = this.permutation[X + 1] + Y;
        return this.lerp(v,
            this.lerp(u,
                this.grad(this.permutation[A], x, y),
                this.grad(this.permutation[B], x - 1, y)
            ),
            this.lerp(u,
                this.grad(this.permutation[A + 1], x, y - 1),
                this.grad(this.permutation[B + 1], x - 1, y - 1)
            )
        );
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(t, a, b) {
        return a + t * (b - a);
    }

    grad(hash, x, y) {
        const h = hash & 15;
        const grad = 1 + (h & 7);
        return ((h & 8) ? -grad : grad) * x + ((h & 4) ? -grad : grad) * y;
    }
} 