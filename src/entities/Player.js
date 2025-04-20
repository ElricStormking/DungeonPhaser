import Character from './Character.js';
import { TILE_SIZE } from '../constants.js';
import Projectile from './Projectile.js';
import * as VisualEffects from '../utils/VisualEffects.js';

/**
 * Player class representing the snake's head
 * Handles player movement, attacks, and hero class abilities
 */
export default class Player extends Character {
    constructor(scene, x, y, heroClass) {
        // Use the hero class texture instead of hardcoding 'warrior'
        const textureKey = heroClass.key || 'warrior';
        
        console.log(`Creating Player with texture key: ${textureKey}`);
        
        // Check if texture exists
        if (!scene.textures.exists(textureKey)) {
            console.error(`Texture ${textureKey} not found in scene! Available textures:`, 
                scene.textures.list.map(t => t.key).join(', '));
        }
        
        super(scene, x, y, textureKey, {
            health: 50,
            maxHealth: 50,
            direction: 'right',
            tint: 0xFFFFFF, // No tint needed for sprite sheet
            bodySize: { width: 32, height: 32 } // Smaller hitbox for better collision
        });
        
        // Hero class and abilities
        this.heroClass = heroClass;
        this.specialAttackCooldown = 0;
        this.specialAttackCooldownMax = 3000;
        this.basicAttackCooldownTimer = 0;
        
        // Invulnerability flag
        this.isInvulnerable = false;
        
        // Set depth and other properties
        this.setDepth(10);
        
        // Scale the sprite to match the game's TILE_SIZE
        // With TILE_SIZE=48 and sprite size=96, we use 0.75 scale (1.5x bigger than before)
        this.setScale(0.75);
        
        // Adjust physics body size and offset for the larger scale (0.75 instead of 0.5)
        this.body.setSize(48, 48);
        this.body.setOffset(24, 36); // Offset to match visual appearance
        
        // Set the sprite's origin to center for better positioning
        this.setOrigin(0.5, 0.65);
        
        // Animation tracking
        this._animationRetryAttempted = false;
        
        // Create animations if they don't exist yet
        this.createAnimations();
        
        // Start with default animation - with error handling
        try {
            // Use texture-specific animation key
            const defaultAnim = `${textureKey}_walk_down`;
            if (scene.anims.exists(defaultAnim)) {
                this.play(defaultAnim);
                console.log(`Playing initial ${defaultAnim} animation`);
            } else {
                console.warn(`Initial ${defaultAnim} animation not available, using static frame`);
                console.warn(`Available animations:`, 
                    Object.keys(scene.anims.anims.entries).join(', '));
                this.setFrame(0); // Set to first frame as fallback
            }
        } catch (error) {
            console.error('Error playing initial animation:', error);
            this.setFrame(0); // Set to first frame as fallback
        }
    }
    
    /**
     * Create player animations from the sprite sheet
     */
    createAnimations() {
        const scene = this.scene;
        const anims = scene.anims;
        const textureKey = this.heroClass.key || 'warrior';
        
        try {
            console.log(`Creating ${textureKey} animations`);
            
            // Check if texture exists first
            if (!scene.textures.exists(textureKey)) {
                console.error(`Cannot create animations: Texture ${textureKey} not found!`);
                console.log('Available textures:', Object.keys(scene.textures.list)
                    .filter(key => key !== '__DEFAULT' && key !== '__MISSING')
                    .join(', '));
                return;
            }
            
            // Define the animation frame mappings - standard for all character spritesheets
            // Based on actual sprite sheet layouts from the JSON files
            const animationFrames = {
                'down': { start: 0, end: 3 },    // First row (frames 0-3)
                'left': { start: 4, end: 7 },    // Second row (frames 4-7)
                'right': { start: 8, end: 11 },  // Third row (frames 8-11)
                'up': { start: 12, end: 15 }     // Fourth row (frames 12-15)
            };
            
            // Create prefixed animation keys - NOTE: JSON files use 'up' not 'back'
            const animKeys = Object.keys(animationFrames).map(dir => `${textureKey}_walk_${dir}`);
            
            // Remove existing animations if they exist
            animKeys.forEach(key => {
                if (anims.exists(key)) {
                    anims.remove(key);
                    console.log(`Removed existing animation: ${key}`);
                }
            });
            
            // Also check for and remove any 'back' animations that might exist from previous versions
            const backKey = `${textureKey}_walk_back`;
            if (anims.exists(backKey)) {
                anims.remove(backKey);
                console.log(`Removed obsolete animation: ${backKey}`);
            }
            
            // Create all animations directly from the spritesheet
            Object.entries(animationFrames).forEach(([direction, frames]) => {
                const key = `${textureKey}_walk_${direction}`;
                
                anims.create({
                    key: key,
                    frames: anims.generateFrameNumbers(textureKey, { 
                        start: frames.start, 
                        end: frames.end 
                    }),
                    frameRate: 6,
                    repeat: -1
                });
                
                console.log(`Created animation: ${key} with frames ${frames.start}-${frames.end}`);
            });
            
            // Verify all animations were created
            let allCreated = true;
            animKeys.forEach(key => {
                if (anims.exists(key)) {
                    console.log(`Animation verified: ${key}`);
                } else {
                    console.error(`Failed to create animation: ${key}`);
                    allCreated = false;
                }
            });
            
            if (allCreated) {
                console.log(`All ${textureKey} animations created successfully`);
            } else {
                console.error(`Some ${textureKey} animations failed to create`);
            }
            
        } catch (error) {
            console.error(`Error creating ${textureKey} animations:`, error);
        }
    }
    
    /**
     * Set player invulnerable for a short time after taking damage
     * @param {number} duration - Duration of invulnerability in ms
     */
    setInvulnerable(duration = 1000) {
        if (this.isInvulnerable) return;
        
        this.isInvulnerable = true;
        
        // Use the centralized effect function
        VisualEffects.createInvulnerabilityEffect(this.scene, this, duration);
        
        // Reset invulnerability after duration
        this.scene.time.delayedCall(duration, () => {
            if (this.active) this.isInvulnerable = false;
        });
    }
    
    /**
     * Use the player's special attack
     */
    useSpecialAttack(enemies, helpers) {
        if (this.specialAttackCooldown > 0) return false;
        
        const success = this.heroClass.specialAttack(this.scene, this, enemies, helpers);
        
        if (success) {
            // Play special attack sound
            if (this.scene.audioManager) {
                this.scene.audioManager.playAttackSound('special');
            }
            
            this.specialAttackCooldown = this.specialAttackCooldownMax;
            return true;
        }
        
        return false;
    }
    
    /**
     * Perform a basic attack in a direction
     * @param {Phaser.Math.Vector2|null} targetPosition - Position to attack toward (null for current direction)
     */
    performBasicAttack(targetPosition) {
        if (this.basicAttackCooldownTimer > 0) return false;
        
        let dx, dy, angle;
        
        if (targetPosition) {
            // Mouse-based targeting
            dx = targetPosition.x - this.x;
            dy = targetPosition.y - this.y;
            angle = Math.atan2(dy, dx);
        } else {
            // Direction-based targeting
            switch(this.direction) {
                case 'right': dx = 1; dy = 0; break;
                case 'left':  dx = -1; dy = 0; break;
                case 'up':    dx = 0; dy = -1; break;
                case 'down':  dx = 0; dy = 1; break;
                default:      dx = 1; dy = 0;
            }
            angle = Math.atan2(dy, dx);
        }
        
        // Normalize direction
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        const normalizedDx = dx / magnitude;
        const normalizedDy = dy / magnitude;
        
        // Dispatch to hero-specific attack
        let success = false;
        let attackType = '';
        
        switch (this.heroClass.key) {
            case 'warrior': 
                attackType = 'melee';
                success = this.performWarriorAttack(angle, this.scene.enemies); 
                break;
            case 'archer': 
                attackType = 'ranged';
                success = this.performArcherAttack(normalizedDx, normalizedDy); 
                break;
            case 'mage': 
                attackType = 'magic';
                success = this.performMageAttack(normalizedDx, normalizedDy); 
                break;
            default:
                console.warn('Unknown hero class for basic attack:', this.heroClass.key);
        }
        
        if (success) {
            // Play attack sound
            if (this.scene.audioManager) {
                this.scene.audioManager.playAttackSound(attackType);
            }
            
            // Set cooldown
            const baseCooldown = 500;
            const cooldownReduction = Math.min(0.5, this.scene.currentLevel * 0.03);
            this.basicAttackCooldownTimer = baseCooldown * (1 - cooldownReduction);
        }
        
        return success;
    }
    
    /**
     * Warrior-specific basic attack (sword sweep)
     */
    performWarriorAttack(angle, enemies) {
        const distance = TILE_SIZE * 3; // Range
        const visualDistance = TILE_SIZE * 3.5; // Visual range (longer than collision range)
        const arc = 1.2; // Radians (about 70 degrees)
        
        // Create sword sprite instead of basic graphics
        const sword = this.scene.add.sprite(this.x, this.y, 'bullet');
        sword.setTint(0xFFFFFF);
        sword.setAlpha(0.8);
        sword.setScale(4.5, 0.5); // Increased length from 3 to 4.5 for longer sword
        sword.setOrigin(-0.5, 0.5); // Set origin to left-center for rotation
        sword.setDepth(this.depth + 1);
        
        // Set initial angle
        sword.rotation = angle - arc/2;
        
        // Add swing animation
        this.scene.tweens.add({
            targets: sword,
            rotation: angle + arc/2,
            duration: 150,
            ease: 'Sine.easeInOut',
            onUpdate: () => {
                // Add particles along the sword edge for trail effect
                const tipX = sword.x + Math.cos(sword.rotation) * visualDistance;
                const tipY = sword.y + Math.sin(sword.rotation) * visualDistance;
                
                // Add particles at mid-point too for a fuller effect
                const midX = sword.x + Math.cos(sword.rotation) * (visualDistance * 0.6);
                const midY = sword.y + Math.sin(sword.rotation) * (visualDistance * 0.6);
                
                try {
                    // Add particle at tip of sword
                    const tipParticles = this.scene.add.particles(tipX, tipY, 'particle', {
                        lifespan: 200,
                        scale: { start: 0.4, end: 0 },
                        quantity: 1,
                        alpha: { start: 0.5, end: 0 },
                        tint: 0xFFFFFF
                    });
                    
                    // Add particle at mid-point of sword
                    const midParticles = this.scene.add.particles(midX, midY, 'particle', {
                        lifespan: 180,
                        scale: { start: 0.3, end: 0 },
                        quantity: 1,
                        alpha: { start: 0.4, end: 0 },
                        tint: 0xFFFFFF
                    });
                    
                    // Clean up particles
                    this.scene.time.delayedCall(200, () => {
                        if (tipParticles) tipParticles.destroy();
                        if (midParticles) midParticles.destroy();
                    });
                } catch (e) {
                    // Continue even if particles can't be created
                }
            },
            onComplete: () => sword.destroy()
        });
        
        // Create attack polygon points
        const pointA = { x: this.x, y: this.y };
        const pointB = { 
            x: this.x + Math.cos(angle - arc/2) * distance, 
            y: this.y + Math.sin(angle - arc/2) * distance 
        };
        const pointC = { 
            x: this.x + Math.cos(angle + arc/2) * distance, 
            y: this.y + Math.sin(angle + arc/2) * distance 
        };
        
        let hitCount = 0;
        
        enemies.children.each(enemy => {
            if (!enemy.active) return;
            
            // Get enemy bounds
            const enemyBounds = enemy.getBounds();
            
            // Create a simpler collision check - check if the enemy's center is within our attack triangle
            const enemyCenter = { x: enemyBounds.centerX, y: enemyBounds.centerY };
            
            // Check if enemy center is in attack triangle using point-in-triangle test
            if (this.pointInTriangle(enemyCenter, pointA, pointB, pointC) || 
                // Alternatively, check if any corner of the enemy is in the triangle
                this.pointInTriangle({x: enemyBounds.left, y: enemyBounds.top}, pointA, pointB, pointC) ||
                this.pointInTriangle({x: enemyBounds.right, y: enemyBounds.top}, pointA, pointB, pointC) ||
                this.pointInTriangle({x: enemyBounds.left, y: enemyBounds.bottom}, pointA, pointB, pointC) ||
                this.pointInTriangle({x: enemyBounds.right, y: enemyBounds.bottom}, pointA, pointB, pointC)) {
                
                enemy.damage(2);
                
                // Knockback
                const knockbackAngle = Phaser.Math.Angle.Between(this.x, this.y, enemy.x, enemy.y);
                if (enemy.body) {
                    enemy.body.velocity.x += Math.cos(knockbackAngle) * 100;
                    enemy.body.velocity.y += Math.sin(knockbackAngle) * 100;
                    this.scene.tweens.add({ 
                        targets: enemy.body.velocity, 
                        x: '*=0.5', 
                        y: '*=0.5', 
                        duration: 200
                    });
                }
                
                // Add hit effect
                const hitEffect = this.scene.add.sprite(enemy.x, enemy.y, 'bullet');
                hitEffect.setTint(0xFFFF00);
                hitEffect.setAlpha(0.7);
                hitEffect.setScale(1);
                this.scene.tweens.add({
                    targets: hitEffect,
                    alpha: 0,
                    scale: 1.5,
                    duration: 150,
                    onComplete: () => hitEffect.destroy()
                });
                
                hitCount++;
            }
        });
        
        return hitCount > 0;
    }
    
    // Helper function to check if a point is inside a triangle
    pointInTriangle(point, v1, v2, v3) {
        // Calculate barycentric coordinates
        const d1 = this.sign(point, v1, v2);
        const d2 = this.sign(point, v2, v3);
        const d3 = this.sign(point, v3, v1);

        const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
        const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);

        // If all same sign, point is in triangle
        return !(hasNeg && hasPos);
    }
    
    // Helper function for pointInTriangle
    sign(p1, p2, p3) {
        return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    }
    
    /**
     * Archer-specific basic attack (arrow)
     */
    performArcherAttack(dx, dy) {
        // Get reference to scene
        const scene = this.scene;
        
        // Check if we can shoot
        if (!scene.bullets) return false;
        
        // Create arrow sprite directly using the image API first
        // This ensures the sprite exists even if texture isn't fully ready
        const arrow = scene.add.sprite(this.x, this.y, 'arrow');
        arrow.setScale(1.2);
        
        // AFTER creating the sprite, add physics
        scene.physics.world.enable(arrow);
        scene.bullets.add(arrow);
        
        // Critical properties for collision detection
        arrow.damage = 3;
        arrow.isEnemyProjectile = false; // Ensure it's recognized as a player projectile
        arrow.setData('type', 'arrow'); // Add a type for potential filtering
        
        // Set size for better collision detection
        arrow.body.setSize(16, 4);  // Adjust size to match arrow shape
        
        // Set rotation first before velocity
        arrow.rotation = Math.atan2(dy, dx);
        
        // Set velocity directly with higher speed to ensure movement
        const speed = 500;
        arrow.body.velocity.x = dx * speed;
        arrow.body.velocity.y = dy * speed;
        
        // Use a simpler visual effect first to ensure it works
        arrow.setTint(0x00FF00);
        
        // Add a simple delayed cleanup instead of relying on bounds checking
        scene.time.delayedCall(2000, () => {
            if (arrow && arrow.active) {
                arrow.destroy();
            }
        });
        
        // Only add particle effects if the arrow is successfully moving
        scene.time.delayedCall(100, () => {
            if (arrow && arrow.active && (arrow.body.velocity.x !== 0 || arrow.body.velocity.y !== 0)) {
                try {
                    // Use simpler particle configuration
                    const emitter = scene.add.particles('particle').createEmitter({
                        follow: arrow,
                        scale: { start: 0.2, end: 0 },
                        alpha: { start: 0.6, end: 0 },
                        speed: 10,
                        lifespan: 200,
                        quantity: 1,
                        frequency: 30,
                        tint: 0x00FF00
                    });
                    
                    arrow.emitter = emitter;
                    
                    // Clean up emitter when arrow is destroyed
                    arrow.on('destroy', () => {
                        if (emitter) {
                            emitter.stop();
                            scene.time.delayedCall(200, () => {
                                if (emitter && emitter.manager) {
                                    emitter.manager.destroy();
                                }
                            });
                        }
                    });
                } catch (e) {
                    console.warn("Particle effect could not be created", e);
                    // Arrow will still work without particles
                }
            }
        });
        
        console.log("Archer arrow created and added to bullets group:", 
                   arrow, "Bullets group size:", scene.bullets.getLength());
        
        return true;
    }
    
    /**
     * Mage-specific basic attack (frost bolt)
     */
    performMageAttack(dx, dy) {
        // Get reference to scene
        const scene = this.scene;
        
        // Create a frost wave effect that freezes all enemies
        const wave = scene.add.sprite(this.x, this.y, 'bullet');
        wave.setScale(0.5);
        wave.setTint(0xADD8E6); // Light blue color
        wave.setAlpha(0.8);
        
        // Create expanding frost wave effect
        scene.tweens.add({
            targets: wave,
            scale: 10,
            alpha: 0,
            duration: 600,
            ease: 'Power2',
            onComplete: () => wave.destroy()
        });
        
        // Freeze all active enemies for a short period
        const freezeDuration = 1500; // 1.5 seconds of freeze
        
        if (scene.enemies && scene.enemies.getChildren) {
            scene.enemies.getChildren().forEach(enemy => {
                if (enemy && enemy.active) {
                    // Use the enemy's built-in frost mechanism if it exists
                    if (enemy.applyFrost && typeof enemy.applyFrost === 'function') {
                        // Completely freeze the enemy (slowFactor = 0)
                        enemy.applyFrost(freezeDuration, 0);
                        
                        // Force velocity to zero to ensure they're completely frozen
                        if (enemy.body) {
                            enemy.body.velocity.x = 0;
                            enemy.body.velocity.y = 0;
                        }
                    } else {
                        // Fallback for enemies without the applyFrost method
                        // Store the enemy's original speed
                        if (!enemy.originalSpeed) {
                            enemy.originalSpeed = enemy.speed || 100;
                        }
                        
                        // Apply freeze effect
                        enemy.isFrozen = true;
                        enemy.speed = 0;
                        enemy.setTint(0xADD8E6); // Light blue color
                        
                        // Force velocity to zero
                        if (enemy.body) {
                            enemy.body.velocity.x = 0;
                            enemy.body.velocity.y = 0;
                        }
                        
                        // Add frost particles to the enemy
                        try {
                            const frostParticles = scene.add.particles(enemy.x, enemy.y, 'particle', {
                                follow: enemy,
                                scale: { start: 0.2, end: 0 },
                                speed: 5,
                                lifespan: 300,
                                quantity: 1,
                                frequency: 50,
                                tint: 0xADD8E6 // Light blue color
                            });
                            
                            // Store particles reference for cleanup
                            enemy.frostParticles = frostParticles;
                            
                            // Remove frost effect after duration
                            scene.time.delayedCall(freezeDuration, () => {
                                if (enemy && enemy.active) {
                                    enemy.isFrozen = false;
                                    enemy.speed = enemy.originalSpeed;
                                    enemy.clearTint();
                                    
                                    if (enemy.frostParticles && enemy.frostParticles.active) {
                                        enemy.frostParticles.destroy();
                                        enemy.frostParticles = null;
                                    }
                                }
                            });
                        } catch (error) {
                            console.error('Error applying frost effect:', error);
                            // Ensure enemy unfreezes even if particles fail
                            scene.time.delayedCall(freezeDuration, () => {
                                if (enemy && enemy.active) {
                                    enemy.isFrozen = false;
                                    enemy.speed = enemy.originalSpeed;
                                    enemy.clearTint();
                                }
                            });
                        }
                    }
                }
            });
        }
        
        return true;
    }
    
    /**
     * Override die method to handle game over
     */
    die() {
        if (this.scene.gameOver) return;
        
        this.createDeathEffect();
        this.scene.handleGameOver();
    }
    
    /**
     * Update method called every frame
     * @param {number} time - Current time
     * @param {number} delta - Time since last update
     */
    update(time, delta) {
        // Update cooldown timers
        if (this.specialAttackCooldown > 0) {
            this.specialAttackCooldown = Math.max(0, this.specialAttackCooldown - delta);
        }
        
        if (this.basicAttackCooldownTimer > 0) {
            this.basicAttackCooldownTimer = Math.max(0, this.basicAttackCooldownTimer - delta);
        }
        
        // Update animation based on movement direction
        if (this.direction) {
            // Define animation based on direction
            const textureKey = this.heroClass.key || 'warrior';
            let animKey;
            
            // Determine animation key based on direction - no flipping needed
            switch (this.direction) {
                case 'up':
                    animKey = `${textureKey}_walk_up`;
                    break;
                case 'down':
                    animKey = `${textureKey}_walk_down`;
                    break;
                case 'left':
                    animKey = `${textureKey}_walk_left`;
                    break;
                case 'right':
                    animKey = `${textureKey}_walk_right`;
                    break;
                default:
                    animKey = `${textureKey}_walk_down`;
            }
            
            // Ensure no flipping is applied to any character
            this.setFlipX(false);
            this.setFlipY(false);
            
            // Try to play the animation with error handling
            try {
                // Check if animation exists before playing
                if (this.scene.anims.exists(animKey)) {
                    // Only change animation if it's different or not playing
                    if (!this.anims.isPlaying || this.anims.currentAnim.key !== animKey) {
                        this.play(animKey, true);
                    }
                } else {
                    // If animation doesn't exist, try to recreate animations
                    if (!this._animationRetryAttempted) {
                        console.warn(`Animation ${animKey} not found, recreating animations`);
                        this.createAnimations();
                        this._animationRetryAttempted = true;
                        
                        // Try one more time after recreation
                        if (this.scene.anims.exists(animKey)) {
                            this.play(animKey, true);
                        } else {
                            // Set a static frame as fallback if animation still doesn't exist
                            console.error(`Animation ${animKey} still not available after recreation`);
                            this.setFrame(this.direction === 'left' ? 4 : 
                                         this.direction === 'right' ? 8 : 
                                         this.direction === 'up' ? 12 : 0);
                        }
                    } else {
                        // Use static frame as fallback if already attempted recreation
                        this.setFrame(this.direction === 'left' ? 4 : 
                                     this.direction === 'right' ? 8 : 
                                     this.direction === 'up' ? 12 : 0);
                    }
                }
            } catch (error) {
                console.error(`Error playing animation ${animKey}:`, error);
                // Fallback to static frame on error
                this.setFrame(this.direction === 'left' ? 4 : 
                             this.direction === 'right' ? 8 : 
                             this.direction === 'up' ? 12 : 0);
            }
        }
        
        // Call parent update method to handle common functionality
        super.update(time, delta);
    }
} 