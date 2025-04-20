import { TILE_SIZE } from '../constants.js';
import * as VisualEffects from '../utils/VisualEffects.js';

/**
 * Base Character class that all game characters will extend
 * Handles common functionality like health, damage, and health bars
 */
export default class Character extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, config = {}) {
        super(scene, x, y, texture);
        
        // Add to scene and physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Set up health properties
        this.health = config.health || 1;
        this.maxHealth = config.maxHealth || this.health;
        this.healthBar = null;
        
        // Movement properties
        this.direction = config.direction || 'right';
        this.speed = config.speed || 50;
        
        // Physics body setup
        if (config.bodySize) {
            this.body.setSize(
                config.bodySize.width || TILE_SIZE * 0.8, 
                config.bodySize.height || TILE_SIZE * 0.8
            );
        }
        
        // Visual setup
        if (config.tint) {
            this.setTint(config.tint);
        }
        
        // Special setup for player character (warrior)
        if (texture === 'warrior') {
            // Use special player health bar setup that updates every frame
            this.scene.time.delayedCall(100, () => {
                this.setupPlayerHealthBar();
            });
        } else {
            // Create standard health bar for non-player characters
            this.updateHealthBar();
        }
        
        // Event for cleanup
        this.on('destroy', this.onDestroy, this);
    }
    
    /**
     * Apply damage to the character
     * @param {number} amount - Amount of damage to apply
     * @returns {boolean} - Whether the character died from this damage
     */
    damage(amount) {
        if (!this.active) return false;
        
        this.health = Math.max(0, this.health - amount);
        this.updateHealthBar();
        
        // Enhanced damage text with scaling
        this.createDamageText(amount);
        
        // Determine if this is the player
        const isPlayer = this.constructor.name === 'Player';
        
        // Play appropriate damage sound
        if (this.scene.audioManager) {
            if (isPlayer) {
                this.scene.audioManager.playPlayerDamageSound();
            } else if (this.constructor.name === 'Enemy' && this.health <= 0) {
                this.scene.audioManager.playSFX('enemy_death');
            }
        }
        
        // Damage flash effect - more dramatic for player
        VisualEffects.createEntityFlashEffect(
            this.scene,
            this,
            isPlayer ? 0.3 : 0.5,
            100,
            isPlayer ? 1 : 0
        );
        
        // Create impact effect
        const impactScale = isPlayer ? 1.5 : 1.2;
        VisualEffects.createImpactScaleEffect(
            this.scene,
            this, 
            impactScale,
            50
        );
        
        // For significant damage (> 20% of max health), add extra effects
        if (amount > this.maxHealth * 0.2) {
            // Create a flash circle at impact point
            VisualEffects.createFlashEffect(
                this.scene,
                this.x,
                this.y,
                this.width,
                this.width,
                0xFF0000,
                0.5,
                150,
                this.depth + 1
            );
        }
        
        // Check if died
        if (this.health <= 0) {
            // CRITICAL FIX: For Enemy deaths from any damage source,
            // ensure kill is registered before calling die()
            if (this.constructor.name === 'Enemy' && this.scene.spawnSystem) {
                // Mark this enemy as killed and update counter
                if (this.scene.spawnSystem.waveActive) {
                    this.scene.spawnSystem.enemiesKilledInWave++;
                    
                    // Set a flag to prevent double-counting in die()
                    this._killCounted = true;
                    
                    // Force UI update immediately
                    if (this.scene.uiManager) {
                        this.scene.uiManager.updateWaveInfo(
                            this.scene.spawnSystem.currentWave, 
                            this.scene.spawnSystem.totalWaves,
                            this.scene.spawnSystem.enemiesRemainingInWave,
                            this.scene.spawnSystem.totalEnemies,
                            this.scene.spawnSystem.enemiesSpawnedInWave,
                            this.scene.spawnSystem.enemiesKilledInWave
                        );
                    }
                    
                    console.log(`[Character.damage] Enemy killed by damage! Kill count now: ${this.scene.spawnSystem.enemiesKilledInWave}`);
                }
            }
            
            this.die();
            return true;
        }
        
        return false;
    }
    
    /**
     * Handle character death
     */
    die() {
        // Override in subclasses
        this.createDeathEffect();
        this.destroy();
    }
    
    /**
     * Create explosion effect at character position
     */
    createDeathEffect() {
        // Using the utility function from VisualEffects.js
        VisualEffects.createDeathEffect(
            this.scene,
            this.x,
            this.y,
            this.tintTopLeft || 0xFFFFFF
        );
    }
    
    /**
     * Create floating damage text
     */
    createDamageText(amount) {
        // Determine if this damage is significant (> 20% of max health)
        const isSignificant = amount > this.maxHealth * 0.2;
        const isPlayer = this.constructor.name === 'Player';
        
        VisualEffects.createDamageText(
            this.scene,
            this.x,
            this.y,
            amount,
            isSignificant,
            isPlayer,
            this.maxHealth
        );
    }
    
    /**
     * Update the health bar position and fill
     */
    updateHealthBar() {
        if (!this.active || this.health === undefined || this.maxHealth === undefined) return;
        
        // Use the utility function from VisualEffects.js
        const yOffset = this.texture.key === 'warrior' ? TILE_SIZE * 0.6 : TILE_SIZE * 0.5;
        VisualEffects.updateHealthBar(this.scene, this, yOffset);
    }
    
    /**
     * Set angle based on direction string
     */
    setAngleFromDirection() {
        // Don't set angle for sprite-based characters (warrior, mage, and archer)
        // or characters with usesAnimations flag
        if (this.texture.key === 'warrior' || 
            this.texture.key === 'mage' || 
            this.texture.key === 'archer' ||
            this.usesAnimations) {
            return;
        }
        
        // Only set angle for non-sprite characters (like basic followers)
        switch (this.direction) {
            case 'left': this.angle = 180; break;
            case 'right': this.angle = 0; break;
            case 'up': this.angle = -90; break;
            case 'down': this.angle = 90; break;
        }
    }
    
    /**
     * Clean up resources when destroyed
     */
    onDestroy() {
        if (this.healthBar) {
            this.healthBar.destroy();
            this.healthBar = null;
        }
    }
    
    /**
     * Special function for the player's health bar to ensure it stays attached
     */
    setupPlayerHealthBar() {
        if (this.texture.key !== 'warrior') return; // Only for player
        
        // If player health bar already exists, destroy it
        if (this.healthBar) {
            this.healthBar.destroy();
        }
        
        // Create a new health bar that will update with the player
        this.healthBar = this.scene.add.graphics();
        this.healthBar.setDepth(9999); // Ensure it's above everything
        
        // Force update the health bar on every frame
        this.scene.events.on('update', this.updateHealthBar, this);
        
        // Clean up when player is destroyed
        this.once('destroy', () => {
            this.scene.events.off('update', this.updateHealthBar, this);
            if (this.healthBar) {
                this.healthBar.destroy();
                this.healthBar = null;
            }
        });
        
        // Initial update
        this.updateHealthBar();
    }
    
    /**
     * Update method called every frame
     * @param {number} time - Current time
     * @param {number} delta - Time since last update
     */
    update(time, delta) {
        // Setup player health bar if not already setup
        if (this.texture.key === 'warrior' && (!this.healthBar || !this.healthBar.active)) {
            this.setupPlayerHealthBar();
        }
        // Update health bar for other characters if active and health exists
        else if (this.active && this.health !== undefined && this.maxHealth !== undefined) {
            this.updateHealthBar();
        }
        
        // Don't automatically update angle for sprite sheet animations (warrior, mage, archer)
        // or characters with usesAnimations flag
        if (this.texture.key !== 'warrior' && 
            this.texture.key !== 'mage' && 
            this.texture.key !== 'archer' && 
            !this.usesAnimations) {
            this.setAngleFromDirection();
        }
    }
} 