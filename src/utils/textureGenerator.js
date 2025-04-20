import { TILE_SIZE } from '../constants.js';

/**
 * Creates all game textures in one centralized place
 * This is the single source of truth for texture generation in the game
 * 
 * @param {Phaser.Scene} scene - The scene context for texture generation
 */
export function createGameTextures(scene) {
    console.log('Creating game textures...');

    // --- Basic Utility Textures ---
    createWhitePixelTexture(scene);
    createParticleTexture(scene);
    
    // --- Character Textures ---
    createPlayerTexture(scene);
    createFollowerTexture(scene);
    
    // --- Enemy Textures ---
    createEnemyTexture(scene);
    
    // --- Projectile Textures ---
    createBulletTexture(scene);
    createArrowTexture(scene);
    
    // --- Item Textures ---
    createPickupTexture(scene);
    
    // --- Terrain Textures ---
    createTerrainTextures(scene);
    
    console.log('Game textures created successfully!');
}

/**
 * Creates a single white pixel texture for various effects
 * @param {Phaser.Scene} scene - The scene context
 */
function createWhitePixelTexture(scene) {
    const pixelCanvas = document.createElement('canvas');
    pixelCanvas.width = 1;
    pixelCanvas.height = 1;
    const pixelCtx = pixelCanvas.getContext('2d');
    pixelCtx.fillStyle = '#FFFFFF';
    pixelCtx.fillRect(0, 0, 1, 1);
    scene.textures.addCanvas('pixel', pixelCanvas);
}

/**
 * Creates a particle texture for various particle effects
 * @param {Phaser.Scene} scene - The scene context
 */
function createParticleTexture(scene) {
    const particleCanvas = document.createElement('canvas');
    particleCanvas.width = 4;
    particleCanvas.height = 4;
    const particleCtx = particleCanvas.getContext('2d');
    particleCtx.fillStyle = '#FFFFFF';
    particleCtx.fillRect(0, 0, 4, 4);
    scene.textures.addCanvas('particle', particleCanvas);
}

/**
 * Creates the player character texture
 * @param {Phaser.Scene} scene - The scene context
 */
function createPlayerTexture(scene) {
    const playerCanvas = document.createElement('canvas');
    playerCanvas.width = TILE_SIZE;
    playerCanvas.height = TILE_SIZE;
    const playerCtx = playerCanvas.getContext('2d');
    
    // Main body (square with eyes)
    playerCtx.fillStyle = '#00FFFF'; // Default color (will be tinted later)
    playerCtx.fillRect(2, 2, TILE_SIZE-4, TILE_SIZE-4);
    
    // Add eyes
    playerCtx.fillStyle = '#000000';
    playerCtx.fillRect(TILE_SIZE*0.6, TILE_SIZE*0.3, 3, 3);
    playerCtx.fillRect(TILE_SIZE*0.6, TILE_SIZE*0.7, 3, 3);
    
    scene.textures.addCanvas('player', playerCanvas);
}

/**
 * Creates the follower texture (snake body segments)
 * @param {Phaser.Scene} scene - The scene context
 */
function createFollowerTexture(scene) {
    const followerCanvas = document.createElement('canvas');
    followerCanvas.width = TILE_SIZE;
    followerCanvas.height = TILE_SIZE;
    const followerCtx = followerCanvas.getContext('2d');
    
    // Draw circle
    followerCtx.fillStyle = '#00FFFF'; // Default color (will be tinted later)
    followerCtx.beginPath();
    followerCtx.arc(TILE_SIZE/2, TILE_SIZE/2, TILE_SIZE/2-2, 0, Math.PI*2);
    followerCtx.fill();
    
    scene.textures.addCanvas('follower', followerCanvas);
}

/**
 * Creates the enemy texture with spiky appearance
 * @param {Phaser.Scene} scene - The scene context
 */
function createEnemyTexture(scene) {
    const enemyCanvas = document.createElement('canvas');
    enemyCanvas.width = TILE_SIZE;
    enemyCanvas.height = TILE_SIZE;
    const enemyCtx = enemyCanvas.getContext('2d');
    
    // Draw spiky enemy
    enemyCtx.fillStyle = '#FF0000'; // Default color (will be tinted later)
    enemyCtx.beginPath();
    const spikes = 8;
    const centerX = TILE_SIZE/2;
    const centerY = TILE_SIZE/2;
    const outerRadius = TILE_SIZE/2-2;
    const innerRadius = TILE_SIZE/4;
    
    for(let i = 0; i < spikes*2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI * 2 * i) / (spikes * 2);
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        if (i === 0) {
            enemyCtx.moveTo(x, y);
        } else {
            enemyCtx.lineTo(x, y);
        }
    }
    
    enemyCtx.closePath();
    enemyCtx.fill();
    
    scene.textures.addCanvas('enemy', enemyCanvas);
    
    // Also create variations for different enemy types
    createEnemyVariations(scene);
}

/**
 * Creates variations of enemy textures for different enemy types
 * @param {Phaser.Scene} scene - The scene context
 */
function createEnemyVariations(scene) {
    // Dasher Enemy (faster, more streamlined)
    const dasherCanvas = document.createElement('canvas');
    dasherCanvas.width = TILE_SIZE;
    dasherCanvas.height = TILE_SIZE;
    const dasherCtx = dasherCanvas.getContext('2d');
    
    // Streamlined shape for dasher
    dasherCtx.fillStyle = '#FF8800';
    dasherCtx.beginPath();
    dasherCtx.moveTo(TILE_SIZE*0.8, TILE_SIZE/2);
    dasherCtx.lineTo(TILE_SIZE/2, TILE_SIZE*0.3);
    dasherCtx.lineTo(TILE_SIZE*0.2, TILE_SIZE/2);
    dasherCtx.lineTo(TILE_SIZE/2, TILE_SIZE*0.7);
    dasherCtx.closePath();
    dasherCtx.fill();
    
    scene.textures.addCanvas('enemy_dasher', dasherCanvas);
    
    // Bomber Enemy (round with fuse)
    const bomberCanvas = document.createElement('canvas');
    bomberCanvas.width = TILE_SIZE;
    bomberCanvas.height = TILE_SIZE;
    const bomberCtx = bomberCanvas.getContext('2d');
    
    // Round bomb shape
    bomberCtx.fillStyle = '#FFAA00';
    bomberCtx.beginPath();
    bomberCtx.arc(TILE_SIZE/2, TILE_SIZE/2 + 2, TILE_SIZE/2 - 4, 0, Math.PI*2);
    bomberCtx.fill();
    
    // Fuse
    bomberCtx.strokeStyle = '#FFDD00';
    bomberCtx.lineWidth = 2;
    bomberCtx.beginPath();
    bomberCtx.moveTo(TILE_SIZE/2, TILE_SIZE/2 - 2);
    bomberCtx.lineTo(TILE_SIZE/2, TILE_SIZE/2 - 6);
    bomberCtx.stroke();
    
    scene.textures.addCanvas('enemy_bomber', bomberCanvas);
    
    // Shooter Enemy (with targeting reticle)
    const shooterCanvas = document.createElement('canvas');
    shooterCanvas.width = TILE_SIZE;
    shooterCanvas.height = TILE_SIZE;
    const shooterCtx = shooterCanvas.getContext('2d');
    
    // Base shape
    shooterCtx.fillStyle = '#00AAFF';
    shooterCtx.beginPath();
    shooterCtx.arc(TILE_SIZE/2, TILE_SIZE/2, TILE_SIZE/2 - 3, 0, Math.PI*2);
    shooterCtx.fill();
    
    // Targeting reticle
    shooterCtx.strokeStyle = '#FFFFFF';
    shooterCtx.lineWidth = 1;
    shooterCtx.beginPath();
    
    // Horizontal and vertical lines
    shooterCtx.moveTo(TILE_SIZE/2 - 5, TILE_SIZE/2);
    shooterCtx.lineTo(TILE_SIZE/2 + 5, TILE_SIZE/2);
    shooterCtx.moveTo(TILE_SIZE/2, TILE_SIZE/2 - 5);
    shooterCtx.lineTo(TILE_SIZE/2, TILE_SIZE/2 + 5);
    
    shooterCtx.stroke();
    
    scene.textures.addCanvas('enemy_shooter', shooterCanvas);
    
    // Mage Enemy (with magical glow)
    const mageCanvas = document.createElement('canvas');
    mageCanvas.width = TILE_SIZE;
    mageCanvas.height = TILE_SIZE;
    const mageCtx = mageCanvas.getContext('2d');
    
    // Base shape
    mageCtx.fillStyle = '#AA00FF';
    mageCtx.beginPath();
    mageCtx.arc(TILE_SIZE/2, TILE_SIZE/2, TILE_SIZE/2 - 4, 0, Math.PI*2);
    mageCtx.fill();
    
    // Magical glow (outer ring)
    mageCtx.strokeStyle = '#DD77FF';
    mageCtx.lineWidth = 1;
    mageCtx.beginPath();
    mageCtx.arc(TILE_SIZE/2, TILE_SIZE/2, TILE_SIZE/2 - 2, 0, Math.PI*2);
    mageCtx.stroke();
    
    scene.textures.addCanvas('enemy_mage', mageCanvas);
}

/**
 * Creates the pickup texture (collectible items)
 * @param {Phaser.Scene} scene - The scene context
 */
function createPickupTexture(scene) {
    const pickupCanvas = document.createElement('canvas');
    pickupCanvas.width = TILE_SIZE;
    pickupCanvas.height = TILE_SIZE;
    const pickupCtx = pickupCanvas.getContext('2d');
    
    // Draw shiny circle
    pickupCtx.fillStyle = '#FFFF00';
    pickupCtx.beginPath();
    pickupCtx.arc(TILE_SIZE/2, TILE_SIZE/2, TILE_SIZE/3, 0, Math.PI*2);
    pickupCtx.fill();
    
    // Add shine
    pickupCtx.fillStyle = '#FFFFFF';
    pickupCtx.beginPath();
    pickupCtx.arc(TILE_SIZE/3, TILE_SIZE/3, TILE_SIZE/8, 0, Math.PI*2);
    pickupCtx.fill();
    
    scene.textures.addCanvas('pickup', pickupCanvas);
}

/**
 * Creates the bullet texture for projectiles
 * @param {Phaser.Scene} scene - The scene context
 */
function createBulletTexture(scene) {
    const bulletCanvas = document.createElement('canvas');
    bulletCanvas.width = TILE_SIZE/2;
    bulletCanvas.height = TILE_SIZE/2;
    const bulletCtx = bulletCanvas.getContext('2d');
    
    bulletCtx.fillStyle = '#FFFF00';
    bulletCtx.beginPath();
    bulletCtx.arc(TILE_SIZE/4, TILE_SIZE/4, TILE_SIZE/4-1, 0, Math.PI*2);
    bulletCtx.fill();
    
    scene.textures.addCanvas('bullet', bulletCanvas);
}

/**
 * Creates the arrow texture for archer projectiles
 * @param {Phaser.Scene} scene - The scene context
 */
function createArrowTexture(scene) {
    const arrowCanvas = document.createElement('canvas');
    arrowCanvas.width = TILE_SIZE;
    arrowCanvas.height = TILE_SIZE/2;
    const arrowCtx = arrowCanvas.getContext('2d');
    
    arrowCtx.strokeStyle = '#00FF00';
    arrowCtx.lineWidth = 2;
    arrowCtx.beginPath();
    arrowCtx.moveTo(0, TILE_SIZE/4);
    arrowCtx.lineTo(TILE_SIZE*0.7, TILE_SIZE/4);
    arrowCtx.moveTo(TILE_SIZE*0.7, 0);
    arrowCtx.lineTo(TILE_SIZE, TILE_SIZE/4);
    arrowCtx.lineTo(TILE_SIZE*0.7, TILE_SIZE/2);
    arrowCtx.stroke();
    
    scene.textures.addCanvas('arrow', arrowCanvas);
}

/**
 * Create textures for terrain tiles
 * @param {Phaser.Scene} scene - The scene to add textures to
 */
function createTerrainTextures(scene) {
    // Create terrain tileset with proper hex colors
    const terrainConfig = [
        { key: 'meadow', color: 0x90EE90 },  // Light green
        { key: 'bush', color: 0x228B22 },    // Forest green
        { key: 'forest', color: 0x006400 },  // Dark green
        { key: 'swamp', color: 0x2F4F4F },   // Dark slate gray
        { key: 'floor', color: 0x000000, alpha: 0 },    // Transparent
        { key: 'border', color: 0xFF0000 }   // Red
    ];

    // Create a single graphics object
    const graphics = scene.add.graphics();
    
    // Create a render texture for the entire tileset
    const renderTexture = scene.add.renderTexture(0, 0, TILE_SIZE * terrainConfig.length, TILE_SIZE);
    
    // Draw each terrain type
    terrainConfig.forEach((config, index) => {
        graphics.clear();
        
        // Base tile color
        if (config.key === 'floor') {
            graphics.fillStyle(config.color, 0); // Transparent for floor
        } else {
            graphics.fillStyle(config.color);
        }
        graphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        
        // Add texture pattern based on terrain type
        graphics.lineStyle(1, 0x000000, 0.2);
        
        switch (config.key) {
            case 'meadow':
                // Grass-like pattern
                for (let i = 0; i < TILE_SIZE; i += 8) {
                    graphics.lineBetween(i, TILE_SIZE - 4, i + 4, TILE_SIZE);
                }
                break;
                
            case 'bush':
                // Bushy pattern
                for (let i = 0; i < TILE_SIZE; i += 8) {
                    for (let j = 0; j < TILE_SIZE; j += 8) {
                        graphics.fillCircle(i + 4, j + 4, 2);
                    }
                }
                break;
                
            case 'forest':
                // Tree-like pattern
                for (let i = 0; i < TILE_SIZE; i += 12) {
                    for (let j = 0; j < TILE_SIZE; j += 12) {
                        graphics.fillTriangle(
                            i + 6, j + 2,
                            i + 2, j + 10,
                            i + 10, j + 10
                        );
                    }
                }
                break;
                
            case 'swamp':
                // Swampy pattern
                for (let i = 0; i < TILE_SIZE; i += 8) {
                    for (let j = 0; j < TILE_SIZE; j += 8) {
                        graphics.lineStyle(1, 0x000000, 0.3);
                        graphics.strokeCircle(i + 4, j + 4, 3);
                    }
                }
                break;
                
            case 'floor':
                // No pattern for floor - keep it transparent
                break;
                
            case 'border':
                // Hazard pattern
                graphics.lineStyle(3, 0xFFFFFF, 0.8);
                for (let i = 0; i < TILE_SIZE; i += 12) {
                    graphics.lineBetween(i, 0, i + 12, TILE_SIZE);
                    graphics.lineBetween(0, i, TILE_SIZE, i + 12);
                }
                break;
        }
        
        // Draw this terrain type to the tileset texture
        renderTexture.draw(graphics, index * TILE_SIZE, 0);
    });
    
    // Save the complete tileset texture
    renderTexture.saveTexture('terrain');
    
    // Clean up
    graphics.destroy();
    renderTexture.destroy();
    
    // Add frame data to make it a proper tileset
    scene.textures.get('terrain').add('__BASE', 0, 0, 0, TILE_SIZE * terrainConfig.length, TILE_SIZE);
    for (let i = 0; i < terrainConfig.length; i++) {
        scene.textures.get('terrain').add(i, 0, i * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
    }
    
    console.log('Terrain textures generated successfully');
} 