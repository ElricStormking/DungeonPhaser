import { TILE_SIZE, GAME_WIDTH, GAME_HEIGHT } from '../constants.js';

// --- Damage & Effects ---

// Consolidated damage function (assumes scene has necessary properties like player, enemies, followers, score etc.)
export function damageCharacter(scene, character, amount) {
    if (!character || !character.active) return;

    character.health = (character.health || 0) - amount;

    // Damage Text
    const damageText = scene.add.text(character.x, character.y - 15, amount.toString(), {
        fontSize: '14px', fontFamily: 'Arial', fill: '#FFFFFF',
        stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(character.depth + 2); // Ensure text is on top
    scene.tweens.add({
        targets: damageText,
        y: damageText.y - 20,
        alpha: 0,
        duration: 600,
        ease: 'Power1',
        onComplete: () => damageText.destroy()
    });

    updateHealthBar(scene, character);

    if (character.health <= 0) {
        handleCharacterDeath(scene, character); // Separate death logic
    } else {
        // Damage Flash
        scene.tweens.add({
            targets: character,
            alpha: 0.5,
            duration: 80,
            yoyo: true,
            onComplete: () => { if(character.active) character.setAlpha(1); } // Ensure alpha reset
        });
    }
}

// Handles death logic for any character (player, enemy, follower)
function handleCharacterDeath(scene, character) {
     if (character === scene.player) {
        scene.handleGameOver(); // Call scene method for game over
    } else {
        createExplosion(scene, character.x, character.y, character.tintTopLeft || 0xFFFFFF); 

        // Check if it's an enemy
        if (scene.enemies && scene.enemies.contains(character)) { 
            scene.score = (scene.score || 0) + (character.scoreValue || 5);
            if(scene.uiManager) scene.uiManager.updateScore(scene.score);
            scene.addExperience(character.experienceValue || 10); // Call scene method for EXP
            scene.enemies.remove(character, true, true); 
        } 
        // Check if it's a follower
        else if (scene.followersGroup && scene.followersGroup.contains(character)) {
            // No need to manually splice from the followers array
            // The moveSnake method will automatically filter out inactive followers
            scene.followersGroup.remove(character, true, true); 
         }
         // Default destroy if not found in expected groups (e.g., temporary sprites)
         else {
            if (character.healthBar) character.healthBar.destroy();
            character.destroy();
         }
    }
}

// Simplified damageEnemy calls damageCharacter
export function damageEnemy(scene, enemy, amount) {
     damageCharacter(scene, enemy, amount);
}

// --- Visual Effects ---

export function createExplosion(scene, x, y, color = 0xFFFFFF) {
    // Correct Phaser 3.60+ syntax for particles
    const emitter = scene.add.particles(x, y, 'particle', {
        speed: { min: 50, max: 150 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.8, end: 0 },
        lifespan: { min: 300, max: 500 }, // Add some variance
        quantity: 15,
        tint: color,
        blendMode: 'ADD',
        emitting: false // Create emitter but don't start emission automatically
    });

    if (!emitter) return; 

    // Store a reference to scene for safety check
    emitter.sceneRef = scene;

    emitter.explode(15); // Explode particles once

    // Automatically clean up the emitter after its lifespan with safety check
    scene.time.delayedCall(500, () => {
        // Check if the scene and emitter still exist
        if (emitter && emitter.sceneRef && emitter.sceneRef.scene.isActive && !emitter.destroyed) {
            safeDestroy(emitter);
        }
    });
}

export function createLightningEffect(scene, x1, y1, x2, y2, graphicsArray = []) {
    const segments = Phaser.Math.Between(5, 10);
    const jitter = 10;
    const line = scene.add.graphics();
    line.lineStyle(Phaser.Math.Between(1, 3), 0x00FFFF, 0.8);
    line.setDepth(10); // Ensure visibility
    line.beginPath();
    line.moveTo(x1, y1);

    for (let i = 1; i < segments; i++) {
        const nx = Phaser.Math.Linear(x1, x2, i / segments);
        const ny = Phaser.Math.Linear(y1, y2, i / segments);
        line.lineTo(nx + Phaser.Math.FloatBetween(-jitter, jitter), ny + Phaser.Math.FloatBetween(-jitter, jitter));
    }
    line.lineTo(x2, y2);
    line.strokePath();
    
    // Add to graphics array if provided (for batch cleanup)
    if (graphicsArray && Array.isArray(graphicsArray)) {
        graphicsArray.push(line);
    }
    
    // Add particle effects at the impact point
    const impactParticles = scene.add.particles(x2, y2, 'particle', {
        speed: { min: 30, max: 80 },
        scale: { start: 0.4, end: 0 },
        lifespan: 200,
        quantity: 5,
        emitting: false,
        tint: 0x00FFFF
    });
    
    // Emit once
    impactParticles.explode(5);
    
    // Fade out the lightning line
    scene.tweens.add({
        targets: line, 
        alpha: 0, 
        duration: 250, 
        delay: 50, 
        onComplete: () => {
            line.destroy();
            // Clean up particles after they fade
            scene.time.delayedCall(200, () => {
                if (impactParticles) impactParticles.destroy();
            });
        }
    });
    
    return line;
}

// Helper for jagged lines (used by Thunder Mage)
export function createJaggedLine(graphics, x1, y1, x2, y2, segments, jitter) {
    if (!graphics || !graphics.active) return;
    
    graphics.beginPath();
    graphics.moveTo(x1, y1);
    for (let i = 1; i < segments; i++) {
        const progress = i / segments;
        const nx = Phaser.Math.Linear(x1, x2, progress);
        const ny = Phaser.Math.Linear(y1, y2, progress);
        graphics.lineTo(
            nx + Phaser.Math.Between(-jitter, jitter) * (1 - progress), 
            ny + Phaser.Math.Between(-jitter, jitter) * (1 - progress)
        );
    }
    graphics.lineTo(x2, y2);
    graphics.strokePath();
}

export function updateHealthBar(scene, character) {
    if (!character.active || character.health === undefined || character.maxHealth === undefined) return;
    
    // Create health bar if it doesn't exist
    if (!character.healthBar) {
        character.healthBar = scene.add.graphics();
        // Ensure it's destroyed when character is
        character.on('destroy', () => { if (character.healthBar) character.healthBar.destroy(); });
    }

    const healthBar = character.healthBar;
    healthBar.clear();

    const barWidth = TILE_SIZE * 0.8;
    const barHeight = 3;
    const barX = character.x - barWidth / 2;
    const barY = character.y - TILE_SIZE / 2 - barHeight - 1;
    const healthRatio = Math.max(0, character.health / character.maxHealth);

    // Background
    healthBar.fillStyle(0x8B0000, 0.7);
    healthBar.fillRect(barX, barY, barWidth, barHeight);
    // Foreground
    if (healthRatio > 0) {
        healthBar.fillStyle(0x00FF00, 0.9);
        healthBar.fillRect(barX, barY, barWidth * healthRatio, barHeight);
    }
    healthBar.setDepth(character.depth + 1); 
}

// --- Utility ---

export function setAngleFromDirection(sprite, direction) {
     switch (direction) {
        case 'left': sprite.angle = 180; break;
        case 'right': sprite.angle = 0; break;
        case 'up': sprite.angle = -90; break;
        case 'down': sprite.angle = 90; break;
    }
}

/**
 * Creates a poison cloud effect that damages enemies over time
 * @param {Phaser.Scene} scene - The game scene
 * @param {number} x - X position of cloud center
 * @param {number} y - Y position of cloud center
 * @param {number} radius - Radius of the cloud effect
 */
export function createPoisonCloud(scene, x, y, radius) {
    // Create the visual cloud
    const cloud = scene.add.graphics();
    cloud.fillStyle(0x00FF00, 0.3);
    cloud.fillCircle(x, y, radius);
    
    // Add particles inside the cloud with Phaser 3.60 syntax
    const particles = scene.add.particles(x, y, 'particle', {
        speed: { min: 10, max: 30 },
        scale: { start: 0.5, end: 0 },
        lifespan: 1000,
        quantity: 1,
        frequency: 50,
        tint: 0x00FF00,
        blendMode: 'ADD',
        emitting: true,
        gravityY: -10,
        bounds: { radius: radius * 0.8 }
    });
    
    // Damage interval (damage enemies every 500ms)
    let damageTimer = scene.time.addEvent({
        delay: 500,
        callback: () => {
            scene.enemies.getChildren().forEach(enemy => {
                if (!enemy.active) return;
                
                const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
                if (distance <= radius) {
                    // Apply poison damage
                    damageEnemy(scene, enemy, 1);
                    
                    // Slow the enemy
                    if (!enemy.isPoisoned) {
                        enemy.isPoisoned = true;
                        enemy.setTint(0x00FF00);
                        
                        if (!enemy.originalSpeed) {
                            enemy.originalSpeed = enemy.speed;
                        }
                        enemy.speed = enemy.originalSpeed * 0.6;
                    }
                }
            });
        },
        repeat: 5 // Total 6 damage ticks (3 seconds)
    });
    
    // Fade out and cleanup
    scene.tweens.add({
        targets: cloud,
        alpha: 0,
        duration: 3000,
        onComplete: () => {
            cloud.destroy();
            if (particles && particles.active) particles.destroy();
            if (damageTimer && damageTimer.active) damageTimer.remove();
            
            // Restore enemy speeds
            scene.enemies.getChildren().forEach(enemy => {
                if (enemy.active && enemy.isPoisoned) {
                    enemy.isPoisoned = false;
                    enemy.clearTint();
                    if (enemy.originalSpeed) {
                        enemy.speed = enemy.originalSpeed;
                    }
                }
            });
        }
    });
}

/**
 * Creates a timed explosion effect that damages enemies after a delay
 * @param {Phaser.Scene} scene - The game scene
 * @param {number} x - X position of explosion center
 * @param {number} y - Y position of explosion center
 * @param {number} radius - Radius of the explosion effect
 * @param {number} delay - Delay in ms before explosion occurs
 * @param {number} damage - Amount of damage to deal to enemies
 */
export function createTimedExplosion(scene, x, y, radius = 80, delay = 1500, damage = 3) {
    // Create visual indicator for the timed bomb
    const indicator = scene.add.graphics();
    indicator.fillStyle(0xFF0000, 0.3);
    indicator.fillCircle(x, y, radius);
    
    // Add countdown effect
    const countdownText = scene.add.text(x, y, (delay / 1000).toFixed(1), {
        fontSize: '24px',
        fontFamily: 'Arial',
        fill: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(0.5);
    
    // Pulsing effect for the indicator
    scene.tweens.add({
        targets: indicator,
        alpha: 0.6,
        scale: 1.1,
        duration: 500,
        yoyo: true,
        repeat: -1
    });
    
    // Update countdown text
    let remainingTime = delay;
    const updateInterval = 100; // Update every 100ms
    const countdownTimer = scene.time.addEvent({
        delay: updateInterval,
        callback: () => {
            remainingTime -= updateInterval;
            countdownText.setText((remainingTime / 1000).toFixed(1));
        },
        repeat: Math.floor(delay / updateInterval) - 1
    });
    
    // Trigger explosion after delay
    scene.time.delayedCall(delay, () => {
        // Stop and clean up countdown elements
        if (countdownTimer && countdownTimer.active) countdownTimer.remove();
        indicator.destroy();
        countdownText.destroy();
        
        // Create explosion effect
        const explosion = scene.add.graphics();
        explosion.fillStyle(0xFF0000, 0.7);
        explosion.fillCircle(x, y, radius);
        
        // Add particle effect with updated Phaser 3.60 syntax
        const particles = scene.add.particles(x, y, 'particle', {
            speed: { min: 50, max: 200 },
            scale: { start: 1, end: 0 },
            lifespan: 800,
            quantity: 30,
            tint: [0xFF0000, 0xFF5500, 0xFFAA00],
            blendMode: 'ADD',
            emitting: false
        });
        
        particles.explode(30);
        
        // Camera shake effect
        scene.cameras.main.shake(300, 0.01);
        
        // Damage enemies within radius
        scene.enemies.getChildren().forEach(enemy => {
            if (!enemy.active) return;
            
            const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
            if (distance <= radius) {
                // Apply damage
                damageEnemy(scene, enemy, damage);
                
                // Add knockback effect
                const angle = Phaser.Math.Angle.Between(x, y, enemy.x, enemy.y);
                const knockbackForce = 200 * (1 - distance / radius); // More force closer to center
                
                if (enemy.body) {
                    enemy.body.velocity.x += Math.cos(angle) * knockbackForce;
                    enemy.body.velocity.y += Math.sin(angle) * knockbackForce;
                }
            }
        });
        
        // Fade out and cleanup
        scene.tweens.add({
            targets: explosion,
            alpha: 0,
            scale: 1.5,
            duration: 500,
            onComplete: () => {
                explosion.destroy();
                scene.time.delayedCall(800, () => {
                    if (particles && particles.active) particles.destroy();
                });
            }
        });
    });
}

// --- Placeholder/Complex Ability Helpers (Require specific logic not suitable for generic helper) ---

// These functions (explodeMushroom, explodeMine, applyPoison, createPoisonCloud, createTimedExplosion)
// involve specific game logic (poison timers, knockback, unique particle effects) 
// tightly coupled to the engineer classes. They are better implemented either:
// 1. Directly within the engineerClasses specialAttack functions.
// 2. As private methods within the GameScene if they need to interact with multiple scene systems.
// Keeping them separate requires passing too much context (enemies group, specific particle configs etc.)

// Example: Removing explodeMushroom - its logic should be called from Shroom Pixie's attack 

// --- Callback helper to safely update text ---
export function updateText(textObject, newText) {
    if (!textObject || !textObject.active || !textObject.scene) return;
    try {
        textObject.setText(newText);
    } catch (e) {
        console.warn('Error updating text:', e);
    }
}

// --- Safe cleanup for particles and graphics ---
export function safeDestroy(object) {
    if (!object) return;
    
    try {
        if (typeof object.destroy === 'function') {
            object.destroy();
        }
    } catch (e) {
        console.warn('Error safely destroying object:', e);
    }
}

/**
 * Creates a poison cloud effect using object pooling for better performance
 * @param {Phaser.Scene} scene - The current scene
 * @param {number} x - X position of cloud center
 * @param {number} y - Y position of cloud center
 * @param {number} radius - Radius of the cloud
 * @param {ResourceManager} resourceManager - Resource manager for pooled objects
 */
export function createPoisonCloudPooled(scene, x, y, radius, resourceManager) {
    // Get graphics object from pool instead of creating new one
    const cloud = resourceManager ? resourceManager.getGraphics() : scene.add.graphics();
    if (!cloud) return; // Fallback if pool is exhausted
    
    // Set up the cloud
    cloud.fillStyle(0x00FF00, 0.3);
    cloud.fillCircle(x, y, radius);
    cloud.setDepth(5);
    
    // Use pooled particles if available
    const emitter = resourceManager ? 
        resourceManager.getParticles(x, y, 'particle', {
            speed: { min: 10, max: 30 },
            scale: { start: 0.5, end: 0 },
            quantity: 1,
            lifespan: 1000,
            frequency: 100,
            tint: [0x55FF55, 0x00AA00, 0x00FF00]
        }) :
        scene.add.particles(x, y, 'particle', {
            speed: { min: 10, max: 30 },
            scale: { start: 0.5, end: 0 },
            quantity: 1,
            lifespan: 1000,
            frequency: 100,
            tint: [0x55FF55, 0x00AA00, 0x00FF00]
        });
        
    if (!emitter) return; // Fallback if emitter creation fails
    
    // Set emitter zone
    emitter.setEmitZone({
        type: 'random',
        source: new Phaser.Geom.Circle(0, 0, radius * 0.9),
        quantity: 10
    });
    
    // Damage logic
    let damageTimer = scene.time.addEvent({
        delay: 500,
        callback: () => {
            scene.enemies.getChildren().forEach(enemy => {
                if (!enemy.active) return;
                
                const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
                if (distance <= radius) {
                    damageEnemy(scene, enemy, 1);
                }
            });
        },
        repeat: 5 // Total duration 3 seconds (6 ticks)
    });
    
    // Clean up graphics with fade out
    scene.tweens.add({
        targets: cloud,
        alpha: 0,
        duration: 3000,
        onComplete: () => {
            // Return to pool instead of destroying
            if (resourceManager) {
                resourceManager.release(cloud);
            } else {
                safeDestroy(cloud);
            }
        }
    });
    
    // Clean up emitter after use
    scene.time.delayedCall(3000, () => {
        if (emitter) {
            emitter.stop();
            // Return to pool instead of destroying
            if (resourceManager) {
                scene.time.delayedCall(1000, () => resourceManager.release(emitter));
            } else {
                scene.time.delayedCall(1000, () => safeDestroy(emitter));
            }
        }
        
        if (damageTimer && damageTimer.active) {
            damageTimer.remove();
        }
    });
    
    return { cloud, emitter };
}

/**
 * Creates a timed explosion effect using object pooling for better performance
 * @param {Phaser.Scene} scene - The current scene
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} radius - Explosion radius
 * @param {number} delay - Delay before explosion (ms)
 * @param {number} damage - Damage amount
 * @param {ResourceManager} resourceManager - Resource manager for pooled objects
 */
export function createTimedExplosionPooled(scene, x, y, radius = 80, delay = 1500, damage = 3, resourceManager) {
    // Use pooled graphics if available
    const indicator = resourceManager ? resourceManager.getGraphics() : scene.add.graphics();
    if (!indicator) return; // Fallback if pool is exhausted
    
    // Draw explosion area indicator
    indicator.lineStyle(2, 0xFF0000, 0.5);
    indicator.strokeCircle(x, y, radius);
    
    // Add a fill with lower alpha
    indicator.fillStyle(0xFF0000, 0.2);
    indicator.fillCircle(x, y, radius);
    
    // Pulsing effect using tweens
    scene.tweens.add({
        targets: indicator,
        alpha: 0.1,
        duration: 500,
        yoyo: true,
        repeat: Math.floor(delay / 1000) // Repeat based on delay duration
    });
    
    // Create a countdown text
    const countdownText = scene.add.text(x, y, (delay / 1000).toFixed(1), {
        fontSize: '24px',
        fontFamily: 'Arial',
        fill: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(0.5);
    
    // Update countdown
    const updateInterval = 100; // Update every 100ms for smoother countdown
    let timeLeft = delay;
    
    const countdownTimer = scene.time.addEvent({
        delay: updateInterval,
        callback: () => {
            timeLeft -= updateInterval;
            if (timeLeft <= 0) {
                countdownText.setText('0');
                return;
            }
            countdownText.setText((timeLeft / 1000).toFixed(1));
        },
        repeat: delay / updateInterval
    });
    
    // Trigger the explosion after delay
    scene.time.delayedCall(delay, () => {
        // Cleanup countdown
        countdownText.destroy();
        if (countdownTimer && countdownTimer.active) {
            countdownTimer.remove();
        }
        
        // Return indicator to pool instead of destroying
        if (resourceManager) {
            resourceManager.release(indicator);
        } else {
            safeDestroy(indicator);
        }
        
        // Use pooled particles for explosion
        const explosionParticles = resourceManager ?
            resourceManager.getParticles(x, y, 'particle', {
                speed: { min: 50, max: 200 },
                scale: { start: 0.8, end: 0 },
                lifespan: 800,
                quantity: 30,
                tint: [0xFF0000, 0xFF5500, 0xFFAA00],
                blendMode: 'ADD',
                emitting: false
            }) :
            scene.add.particles(x, y, 'particle', {
                speed: { min: 50, max: 200 },
                scale: { start: 0.8, end: 0 },
                lifespan: 800,
                quantity: 30,
                tint: [0xFF0000, 0xFF5500, 0xFFAA00],
                blendMode: 'ADD',
                emitting: false
            });
            
        if (!explosionParticles) return; // Fallback if creation fails
        
        // Create a one-time explosion
        explosionParticles.explode(30);
        
        // Clean up the explosion particles
        scene.time.delayedCall(1000, () => {
            if (resourceManager) {
                resourceManager.release(explosionParticles);
            } else {
                safeDestroy(explosionParticles);
            }
        });
        
        // Damage enemies within the radius
        scene.enemies.getChildren().forEach(enemy => {
            if (!enemy.active) return;
            
            const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
            if (distance <= radius) {
                damageEnemy(scene, enemy, damage);
                
                // Add knockback effect
                const angle = Phaser.Math.Angle.Between(x, y, enemy.x, enemy.y);
                const knockbackForce = 150 * (1 - distance / radius); // Stronger closer to center
                
                enemy.body.velocity.x += Math.cos(angle) * knockbackForce;
                enemy.body.velocity.y += Math.sin(angle) * knockbackForce;
            }
        });
    });
    
    return indicator;
} 