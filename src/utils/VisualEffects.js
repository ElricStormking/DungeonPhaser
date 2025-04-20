import { TILE_SIZE } from '../constants.js';

/**
 * Visual effects utility functions for game entities
 */

/**
 * Create a simple flash effect at a given position
 * @param {Phaser.Scene} scene - The game scene
 * @param {number} x - X position
 * @param {number} y - Y position 
 * @param {number} width - Width of the flash
 * @param {number} height - Height of the flash
 * @param {number} color - Color of the flash (hex)
 * @param {number} alpha - Alpha transparency
 * @param {number} duration - Duration of flash in ms
 * @param {number} depth - Display depth
 */
export function createFlashEffect(scene, x, y, width, height, color = 0xff0000, alpha = 0.7, duration = 200, depth = 100) {
    const flash = scene.add.rectangle(
        x, y, width, height, color, alpha
    ).setDepth(depth);
    
    scene.tweens.add({
        targets: flash,
        alpha: 0,
        scale: 1.5,
        duration: duration,
        onComplete: () => flash.destroy()
    });
    
    return flash;
}

/**
 * Create damage particles at a point
 * @param {Phaser.Scene} scene - The game scene
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} color - Color of particles (hex)
 * @param {number} quantity - Number of particles
 * @param {boolean} isSelfDestroying - Whether to destroy after animation
 * @returns {Phaser.GameObjects.Particles.ParticleEmitter} The particle emitter
 */
export function createDamageParticles(scene, x, y, color = 0xff0000, quantity = 10, isSelfDestroying = true) {
    const emitter = scene.add.particles(x, y, 'particle', {
        speed: { min: 30, max: 80 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.5, end: 0 },
        lifespan: { min: 300, max: 500 },
        quantity: quantity,
        tint: color,
        emitting: false
    });
    
    emitter.explode(quantity);
    
    if (isSelfDestroying) {
        scene.time.delayedCall(500, () => {
            if (emitter && emitter.active) emitter.destroy();
        });
    }
    
    return emitter;
}

/**
 * Make an entity flash (for damage or invulnerability)
 * @param {Phaser.Scene} scene - The game scene
 * @param {Phaser.GameObjects.Sprite} entity - The entity to flash
 * @param {number} alpha - Alpha to flash to
 * @param {number} duration - Duration of each flash
 * @param {number} repeat - Number of flashes
 */
export function createEntityFlashEffect(scene, entity, alpha = 0.3, duration = 100, repeat = 1) {
    scene.tweens.add({
        targets: entity,
        alpha: alpha,
        duration: duration,
        yoyo: true,
        repeat: repeat,
        onComplete: () => {
            if (entity.active) entity.setAlpha(1);
        }
    });
}

/**
 * Create an impact scale effect (entity grows then shrinks)
 * @param {Phaser.Scene} scene - The game scene
 * @param {Phaser.GameObjects.Sprite} entity - The entity to scale
 * @param {number} scale - Scale multiplier
 * @param {number} duration - Duration of effect
 */
export function createImpactScaleEffect(scene, entity, scale = 1.2, duration = 50) {
    const originalScaleX = entity.scaleX;
    const originalScaleY = entity.scaleY;
    
    scene.tweens.add({
        targets: entity,
        scaleX: originalScaleX * scale,
        scaleY: originalScaleY * scale,
        duration: duration,
        yoyo: true,
        ease: 'Sine.easeOut'
    });
}

/**
 * Create a floating damage text that rises and fades
 * @param {Phaser.Scene} scene - The game scene
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string|number} text - Text to display (usually damage amount)
 * @param {boolean} isSignificant - Whether this is significant damage
 * @param {boolean} isPlayer - Whether this is for the player
 * @param {number} maxHealth - Max health of entity (for comparison)
 */
export function createDamageText(scene, x, y, text, isSignificant = false, isPlayer = false, maxHealth = 100) {
    // Adjust text size and color based on damage significance and character type
    const fontSize = isSignificant ? '18px' : (isPlayer ? '16px' : '14px');
    const textColor = isSignificant ? '#FF0000' : (isPlayer ? '#FFFF00' : '#FFFFFF');
    
    // Create the damage text
    const damageText = scene.add.text(x, y - 15, text.toString(), {
        fontSize: fontSize, 
        fontFamily: 'Arial', 
        fill: textColor,
        stroke: '#000000', 
        strokeThickness: 3,
        fontStyle: isSignificant ? 'bold' : 'normal'
    }).setOrigin(0.5).setDepth(1000); // High depth to ensure visibility
    
    // Add visual effects to the text
    const targetY = isSignificant ? damageText.y - 30 : damageText.y - 20;
    const duration = isSignificant ? 800 : 600;
    
    // Apply scale effect for significant damage
    if (isSignificant) {
        damageText.setScale(0.5);
        scene.tweens.add({
            targets: damageText,
            scale: 1.5,
            duration: 150,
            yoyo: true,
            onComplete: () => damageText.setScale(1)
        });
    }
    
    // Float and fade animation
    scene.tweens.add({
        targets: damageText,
        y: targetY,
        alpha: 0,
        duration: duration,
        ease: 'Power1',
        onComplete: () => damageText.destroy()
    });
    
    return damageText;
}

/**
 * Create death effect with particles
 * @param {Phaser.Scene} scene - The game scene
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} color - Color of particles 
 * @param {number} quantity - Number of particles
 */
export function createDeathEffect(scene, x, y, color = 0xFFFFFF, quantity = 15) {
    const emitter = scene.add.particles(x, y, 'particle', {
        speed: { min: 50, max: 150 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.8, end: 0 },
        lifespan: { min: 300, max: 500 },
        quantity: quantity,
        tint: color,
        blendMode: 'ADD',
        emitting: false
    });
    
    if (emitter) {
        emitter.explode(quantity);
        scene.time.delayedCall(500, () => {
            if (emitter && emitter.active) emitter.destroy();
        });
    }
    
    return emitter;
}

/**
 * Create player invulnerability effect with multiple visual cues
 * @param {Phaser.Scene} scene - The game scene
 * @param {Phaser.GameObjects.Sprite} player - The player entity
 * @param {number} duration - Duration of invulnerability in ms
 */
export function createInvulnerabilityEffect(scene, player, duration = 1000) {
    // 1. Create a red flash overlay
    createFlashEffect(
        scene, 
        player.x, 
        player.y, 
        player.width * 1.5, 
        player.height * 1.5, 
        0xff0000, 
        0.7, 
        200, 
        player.depth + 1
    );
    
    // 2. Create damage particles
    createDamageParticles(scene, player.x, player.y, 0xff0000, 10);
    
    // 3. Player flashing effect - more intense and longer lasting
    scene.tweens.add({
        targets: player,
        alpha: 0.3,
        duration: 100,
        yoyo: true,
        repeat: 9, // Increased repeat count for longer flashing
        onComplete: () => {
            if (player.active) player.setAlpha(1);
        }
    });
    
    // 4. Camera shake effect
    scene.cameras.main.shake(200, 0.005);
    
    return duration;
}

/**
 * Update a health bar for an entity
 * @param {Phaser.Scene} scene - The game scene
 * @param {Phaser.GameObjects.Sprite} entity - The entity with health
 * @param {number} yOffset - Y offset from entity center for bar
 */
export function updateHealthBar(scene, entity, yOffset = TILE_SIZE * 0.5) {
    if (!entity.active || entity.health === undefined || entity.maxHealth === undefined) return;
    
    // Create health bar if it doesn't exist
    if (!entity.healthBar) {
        entity.healthBar = scene.add.graphics();
        entity.healthBar.setDepth(9999); // Ensure health bar is always on top
        
        // Ensure healthBar is destroyed with the entity
        entity.on('destroy', () => { 
            if (entity.healthBar) entity.healthBar.destroy(); 
        });
    }
    
    const healthBar = entity.healthBar;
    healthBar.clear();
    
    const barWidth = TILE_SIZE * 0.8;
    const barHeight = 3;
    
    // Position the health bar above the entity
    const barX = entity.x - barWidth / 2;
    const barY = entity.y - yOffset - barHeight - 1;
    const healthRatio = Math.max(0, entity.health / entity.maxHealth);
    
    // Background
    healthBar.fillStyle(0x8B0000, 0.7);
    healthBar.fillRect(barX, barY, barWidth, barHeight);
    // Foreground
    if (healthRatio > 0) {
        healthBar.fillStyle(0x00FF00, 0.9);
        healthBar.fillRect(barX, barY, barWidth * healthRatio, barHeight);
    }
    
    // Ensure the health bar always has a very high depth to stay visible
    healthBar.setDepth(9999);
}

/**
 * Create a pulsing aura effect for bosses
 * @param {Phaser.Scene} scene - The game scene
 * @param {Phaser.GameObjects.Sprite} boss - The boss entity
 * @param {number} phase - Boss phase (1-3)
 * @param {number} color - Base color of the aura
 * @returns {Phaser.GameObjects.Container} Container with aura elements
 */
export function createBossAura(scene, boss, phase = 1, color = 0xFF0000) {
    // Remove existing aura if any
    if (boss.auraContainer) {
        boss.auraContainer.destroy();
    }
    
    // Create container to hold all aura elements
    const container = scene.add.container(boss.x, boss.y);
    container.setDepth(boss.depth - 1); // Place behind boss
    boss.auraContainer = container;
    
    // Phase-specific colors
    const phaseColors = [0xFFD700, 0xFF4500, 0xFF0000]; // Gold, Orange-Red, Red
    const auraColor = color || phaseColors[phase - 1];
    
    // Create the main aura circle
    const auraSize = boss.width * (1.2 + phase * 0.1);
    const mainAura = scene.add.circle(0, 0, auraSize / 2, auraColor, 0.3);
    container.add(mainAura);
    
    // Add radial particles based on phase
    const particleCount = 8 + phase * 4; // More particles for higher phases
    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const distance = auraSize / 2 * 0.8;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        
        const particle = scene.add.circle(x, y, 3 + phase, auraColor, 0.7);
        container.add(particle);
        
        // Add pulsing animation to particles
        scene.tweens.add({
            targets: particle,
            scaleX: { from: 0.5, to: 1.5 },
            scaleY: { from: 0.5, to: 1.5 },
            alpha: { from: 0.7, to: 0.2 },
            duration: 1000 + Math.random() * 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: Math.random() * 1000 // Stagger the animations
        });
    }
    
    // Add glow animation to main aura
    scene.tweens.add({
        targets: mainAura,
        alpha: { from: 0.3, to: 0.5 },
        scale: { from: 0.9, to: 1.1 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    
    // Update function to keep aura with boss
    const updateAura = () => {
        if (boss.active && container.active) {
            container.setPosition(boss.x, boss.y);
            container.setVisible(boss.visible);
            container.setAlpha(boss.alpha);
        } else {
            container.destroy();
        }
    };
    
    // Add update function to boss's scene update event
    const updateListener = scene.events.on('update', updateAura);
    
    // Clean up when boss is destroyed
    boss.once('destroy', () => {
        scene.events.off('update', updateListener);
        container.destroy();
    });
    
    return container;
}

/**
 * Create a crown emblem above a boss
 * @param {Phaser.Scene} scene - The game scene
 * @param {Phaser.GameObjects.Sprite} boss - The boss entity
 * @returns {Phaser.GameObjects.Container} Container with crown elements
 */
export function createBossCrown(scene, boss) {
    // Remove existing crown if any
    if (boss.crownContainer) {
        boss.crownContainer.destroy();
    }
    
    // Create container for crown elements
    const container = scene.add.container(boss.x, boss.y - boss.height * 0.75);
    container.setDepth(boss.depth + 1); // Place in front of boss
    boss.crownContainer = container;
    
    // Crown base color
    const crownColor = 0xFFD700; // Gold
    
    // Draw crown base
    const crownBase = scene.add.rectangle(0, 0, boss.width * 0.6, 5, crownColor);
    container.add(crownBase);
    
    // Draw crown spikes
    const spikes = 3;
    const spikeWidth = 5;
    const spikeHeight = 10;
    const crownWidth = boss.width * 0.6;
    
    for (let i = 0; i < spikes; i++) {
        const spikeX = (i - 1) * (crownWidth / 2);
        const spike = scene.add.rectangle(spikeX, -spikeHeight / 2, spikeWidth, spikeHeight, crownColor);
        container.add(spike);
    }
    
    // Add gemstone in the center spike
    const gem = scene.add.circle(0, -spikeHeight * 0.8, 3, 0xFF0000, 1);
    container.add(gem);
    
    // Add subtle shine animation to the crown
    scene.tweens.add({
        targets: [crownBase, gem],
        alpha: { from: 1, to: 0.7 },
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    
    // Update function to keep crown with boss
    const updateCrown = () => {
        if (boss.active && container.active) {
            container.setPosition(boss.x, boss.y - boss.height * 0.75);
            container.setVisible(boss.visible);
            container.setAlpha(boss.alpha);
        } else {
            container.destroy();
        }
    };
    
    // Add update function to boss's scene update event
    const updateListener = scene.events.on('update', updateCrown);
    
    // Clean up when boss is destroyed
    boss.once('destroy', () => {
        scene.events.off('update', updateListener);
        container.destroy();
    });
    
    return container;
}

/**
 * Create phase-specific particle effects for bosses
 * @param {Phaser.Scene} scene - The game scene
 * @param {Phaser.GameObjects.Sprite} boss - The boss entity
 * @param {number} phase - Boss phase (1-3)
 * @param {string} bossType - Type of boss for specialized effects
 * @returns {Phaser.GameObjects.Particles.ParticleEmitter} The particle emitter
 */
export function createBossPhaseParticles(scene, boss, phase = 1, bossType = 'summoner') {
    // Destroy existing emitters if any
    if (boss.phaseEmitter && boss.phaseEmitter.active) {
        boss.phaseEmitter.destroy();
    }
    
    // Phase-specific base colors
    const phaseColors = [0xFFD700, 0xFF4500, 0xFF0000]; // Gold, Orange-Red, Red
    let emitterConfig = {};
    
    // Configure emitter based on boss type and phase
    switch (bossType) {
        case 'summoner': // Energy orb particles
            emitterConfig = {
                follow: boss,
                lifespan: 800,
                speed: { min: 20, max: 50 },
                scale: { start: 0.5, end: 0 },
                quantity: 1,
                frequency: 200 / phase, // More frequent at higher phases
                tint: phaseColors[phase - 1],
                emitting: true,
                rotate: { min: 0, max: 360 }
            };
            break;
            
        case 'berserker': // Flame particles
            emitterConfig = {
                follow: boss,
                lifespan: 600,
                speed: { min: 50, max: 80 },
                scale: { start: 0.8, end: 0 },
                quantity: 1,
                frequency: 150 / phase,
                tint: 0xFF3300,
                emitting: true,
                angle: { min: 0, max: 360 },
                alpha: { start: 0.8, end: 0 }
            };
            break;
            
        case 'alchemist': // Potion bubble particles
            emitterConfig = {
                follow: boss,
                lifespan: 1000,
                speed: { min: 10, max: 30 },
                scale: { start: 0.3, end: 0.7, ease: 'Sine.easeOut' },
                quantity: 1,
                frequency: 300 / phase,
                tint: [0x00FF00, 0x9900FF, 0x00FFFF], // Multiple colors
                emitting: true,
                alpha: { start: 0.7, end: 0 }
            };
            break;
            
        case 'lichking': // Dark energy particles
            emitterConfig = {
                follow: boss,
                lifespan: 1200,
                speed: { min: 30, max: 60 },
                scale: { start: 0.6, end: 0 },
                quantity: 1,
                frequency: 200 / phase,
                tint: 0x6600CC,
                emitting: true,
                blendMode: 'ADD'
            };
            break;
            
        default: // Generic particles
            emitterConfig = {
                follow: boss,
                lifespan: 800,
                speed: { min: 20, max: 50 },
                scale: { start: 0.5, end: 0 },
                quantity: 1,
                frequency: 200 / phase,
                tint: phaseColors[phase - 1],
                emitting: true
            };
    }
    
    // Create the emitter
    const emitter = scene.add.particles(boss.x, boss.y, 'particle', emitterConfig);
    boss.phaseEmitter = emitter;
    
    // Clean up when boss is destroyed
    boss.once('destroy', () => {
        if (emitter && emitter.active) {
            emitter.destroy();
        }
    });
    
    return emitter;
}

/**
 * Create a large, enhanced boss health bar
 * @param {Phaser.Scene} scene - The game scene
 * @param {Phaser.GameObjects.Sprite} boss - The boss entity
 * @returns {Object} Object with health bar elements
 */
export function createBossHealthBar(scene, boss) {
    // Remove existing health bar if any
    if (boss.enhancedHealthBar) {
        boss.enhancedHealthBar.container.destroy();
    }
    
    // Create container for all health bar elements
    const container = scene.add.container(boss.x, boss.y - boss.height / 2 - 20);
    container.setDepth(boss.depth + 2); // Place above boss
    
    // Size based on boss scale
    const barWidth = boss.width * 1.5;
    const barHeight = 10;
    
    // Background (border)
    const background = scene.add.rectangle(0, 0, barWidth + 4, barHeight + 4, 0x000000, 1);
    container.add(background);
    
    // Health bar background
    const barBg = scene.add.rectangle(0, 0, barWidth, barHeight, 0x333333, 1);
    container.add(barBg);
    
    // Health bar fill
    const barFill = scene.add.rectangle(0, 0, barWidth, barHeight, 0xFF0000, 1);
    barFill.setOrigin(0.5, 0.5);
    container.add(barFill);
    
    // Add boss name/phase text
    const bossNames = {
        'summoner': 'Summoner',
        'berserker': 'Berserker',
        'alchemist': 'Alchemist',
        'lichking': 'Lich King'
    };
    const bossName = bossNames[boss.bossType] || 'Boss';
    const healthText = scene.add.text(0, -barHeight - 5, `${bossName} (Phase ${boss.bossPhase})`, {
        fontSize: '14px',
        fontFamily: 'Arial',
        fill: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(0.5, 1);
    container.add(healthText);
    
    // Store the elements on the boss for updating
    boss.enhancedHealthBar = {
        container,
        background,
        barBg,
        barFill,
        healthText,
        update: () => {
            // Update position
            container.setPosition(boss.x, boss.y - boss.height / 2 - 20);
            
            // Update fill based on health percentage
            const healthPercent = boss.health / boss.maxHealth;
            barFill.width = barWidth * healthPercent;
            
            // Update color based on health
            if (healthPercent < 0.25) {
                barFill.setFillStyle(0xFF0000); // Red for low health
            } else if (healthPercent < 0.5) {
                barFill.setFillStyle(0xFF7700); // Orange for medium health
            } else {
                barFill.setFillStyle(0x00FF00); // Green for high health
            }
            
            // Update phase text
            healthText.setText(`${bossName} (Phase ${boss.bossPhase})`);
            
            // Match visibility with boss
            container.setVisible(boss.visible);
            container.setAlpha(boss.alpha);
        }
    };
    
    // Add update function to scene update event
    const updateListener = scene.events.on('update', boss.enhancedHealthBar.update);
    
    // Clean up when boss is destroyed
    boss.once('destroy', () => {
        scene.events.off('update', updateListener);
        container.destroy();
    });
    
    return boss.enhancedHealthBar;
}

/**
 * Create an entity spawn effect with particles
 * @param {Phaser.Scene} scene - The game scene
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} color - Color of particles (hex)
 * @param {number} quantity - Number of particles
 * @returns {Phaser.GameObjects.Particles.ParticleEmitter} The particle emitter
 */
export function createEntitySpawnEffect(scene, x, y, color = 0x00FF00, quantity = 15) {
    // Create a flash circle
    const flash = scene.add.circle(x, y, TILE_SIZE, color, 0.6);
    
    // Animate the flash
    scene.tweens.add({
        targets: flash,
        alpha: 0,
        scale: 2,
        duration: 500,
        onComplete: () => flash.destroy()
    });
    
    // Create particles that expand outward
    const emitter = scene.add.particles(x, y, 'particle', {
        speed: { min: 30, max: 80 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.6, end: 0 },
        lifespan: { min: 300, max: 500 },
        quantity: quantity,
        tint: color,
        emitting: false
    });
    
    if (emitter) {
        emitter.explode(quantity);
        scene.time.delayedCall(500, () => {
            if (emitter && emitter.active) emitter.destroy();
        });
    }
    
    return emitter;
} 