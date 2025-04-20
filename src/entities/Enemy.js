import Character from './Character.js';
import { TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT } from '../constants.js';
import * as VisualEffects from '../utils/VisualEffects.js';
import Projectile from './Projectile.js';

/**
 * Enemy class representing monsters that chase the player
 * Handles movement, status effects, and enemy behavior
 */
export default class Enemy extends Character {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, config.texture || 'enemy', {
            health: config.health || 1,
            maxHealth: config.health || 1, // Set max to initial health
            tint: config.tint || 0xFF0000,
            bodySize: { width: TILE_SIZE * 0.8, height: TILE_SIZE * 0.8 }
        });
        
        // Enemy type and behavior
        this.enemyType = config.enemyType || 'melee';
        this.isBoss = config.isBoss || false;
        this.bossType = config.bossType || 'summoner';
        
        // Movement and targeting - 1.5x speed instead of 2x
        this.speed = (config.speed || 50) * 3;
        this.originalSpeed = this.speed;
        
        // Combat properties
        this.scoreValue = config.scoreValue || 5;
        this.experienceValue = config.experienceValue || 10;
        this.attackDamage = config.damage || 1;
        
        // Special ability properties
        this.specialAbilityCooldown = 0;
        this.specialAbilityCooldownMax = config.specialAbilityCooldownMax || 3000;
        this.dashSpeed = (config.dashSpeed || this.speed * 1.5) * 2; // 1.5x dash speed as well
        this.shootRange = config.shootRange || TILE_SIZE * 10;
        this.teleportCooldown = 0;
        this.teleportCooldownMax = config.teleportCooldownMax || 5000;
        this.bossPhase = 1; // Boss phase (1: 100-50% health, 2: 50-25% health, 3: <25% health)
        
        // Status flags
        this.isFrozen = false;
        this.isPoisoned = false;
        this.isDashing = false;
        this.isTeleporting = false;
        this.isBombing = false;
        this.hasDealtDamage = false;
        this.hasDealtDamageToFollower = false;
        
        // Keep track of active effects
        this.activeEffects = new Map();
        
        // Initialize special boss visuals if this is a boss
        if (this.isBoss) {
            // Make boss significantly larger
            this.setScale(config.scale || 2);
            
            // Initialize boss visuals with a slight delay to ensure the entity is fully created
            this.scene.time.delayedCall(100, () => {
                if (!this.active) return;
                
                // Apply boss-specific visuals
                VisualEffects.createBossAura(this.scene, this, this.bossPhase, this.tintTopLeft);
                VisualEffects.createBossCrown(this.scene, this);
                VisualEffects.createBossPhaseParticles(this.scene, this, this.bossPhase, this.bossType);
                VisualEffects.createBossHealthBar(this.scene, this);
                
                // Create dramatic entry effect
                this.scene.cameras.main.shake(300, 0.01);
                this.scene.tweens.add({
                    targets: this,
                    scale: { from: this.scale * 1.5, to: this.scale },
                    alpha: { from: 0.2, to: 1 },
                    duration: 800,
                    ease: 'Bounce.easeOut'
                });
            });
        }
        
        console.log(`Enemy created: type=${this.enemyType}, speed=${this.speed} (1.5x original speed)`);
    }
    
    /**
     * Update method called by physics group
     */
    update(time, delta) {
        super.update(time, delta);
        
        if (!this.active || this.isFrozen) return;
        
        // Update cooldowns
        if (this.specialAbilityCooldown > 0) {
            this.specialAbilityCooldown -= delta;
        }
        
        if (this.teleportCooldown > 0) {
            this.teleportCooldown -= delta;
        }
        
        // Check boss phase transition
        if (this.isBoss) {
            this.checkBossPhaseTransition();
        }
        
        // Enemy behavior based on type
        switch (this.enemyType) {
            case 'melee':
                this.moveTowardPlayer();
                break;
            case 'dasher':
                this.updateDasherBehavior();
                break;
            case 'bomber':
                this.updateBomberBehavior();
                break;
            case 'shooter':
                this.updateShooterBehavior();
                break;
            case 'mage':
                this.updateMageBehavior();
                break;
            case 'boss':
                this.updateBossBehavior();
                break;
            default:
                this.moveTowardPlayer();
        }
    }
    
    /**
     * Move toward the player at current speed
     */
    moveTowardPlayer() {
        const player = this.scene.player;
        if (!player || !player.active) return;
        
        // Check for terrain effects (optional - if terrain system exists)
        this.checkTerrainEffects();
        
        // Move toward player using physics
        this.scene.physics.moveToObject(this, player, this.speed);
        
        // Set rotation to face player
        this.rotation = Phaser.Math.Angle.Between(
            this.x, this.y, 
            player.x, player.y
        );
    }
    
    /**
     * Dasher enemy behavior - occasionally dash toward player
     */
    updateDasherBehavior() {
        if (this.isDashing) return;
        
        this.moveTowardPlayer();
        
        // Try to dash if cooldown is ready
        if (this.specialAbilityCooldown <= 0) {
            this.performDash();
        }
    }
    
    /**
     * Perform a dash toward the player
     */
    performDash() {
        const player = this.scene.player;
        if (!player || !player.active) return;
        
        // Set dashing state
        this.isDashing = true;
        const originalSpeed = this.speed;
        this.speed = this.dashSpeed;
        
        // Visual effect
        this.setTint(0xFFFF00);
        
        // Dash toward player
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        this.body.velocity.x = Math.cos(angle) * this.speed;
        this.body.velocity.y = Math.sin(angle) * this.speed;
        
        // Dash duration
        this.scene.time.delayedCall(500, () => {
            if (this.active) {
                this.isDashing = false;
                this.speed = originalSpeed;
                this.clearTint();
                
                // Reset cooldown
                this.specialAbilityCooldown = this.specialAbilityCooldownMax;
            }
        });
    }
    
    /**
     * Bomber enemy behavior - move toward player and explode when close
     */
    updateBomberBehavior() {
        const player = this.scene.player;
        if (!player || !player.active) return;
        
        this.moveTowardPlayer();
        
        // Check if close enough to explode
        const distanceToPlayer = Phaser.Math.Distance.Between(
            this.x, this.y, player.x, player.y
        );
        
        if (distanceToPlayer < TILE_SIZE * 2 && !this.isBombing) {
            this.startBombSequence();
        }
    }
    
    /**
     * Start the bomb sequence
     */
    startBombSequence() {
        this.isBombing = true;
        this.body.velocity.x = 0;
        this.body.velocity.y = 0;
        
        // Flash red and expand
        const flashTween = this.scene.tweens.add({
            targets: this,
            alpha: 0.2,
            scale: 1.5,
            duration: 200,
            yoyo: true,
            repeat: 5,
            onComplete: () => {
                if (!this.active) return;
                this.explode();
            }
        });
    }
    
    /**
     * Explode the bomber enemy
     */
    explode() {
        if (!this.active) return;
        
        const explosionRadius = TILE_SIZE * 3;
        
        // Create explosion effect
        const explosion = this.scene.add.graphics();
        explosion.fillStyle(0xFF0000, 0.7);
        explosion.fillCircle(this.x, this.y, explosionRadius);
        
        // Add particles using VisualEffects utility
        VisualEffects.createDamageParticles(
            this.scene,
            this.x,
            this.y,
            [0xFF0000, 0xFF5500, 0xFFAA00],
            30,
            false
        );
        
        // Damage player and followers if in range
        const player = this.scene.player;
        if (player && player.active && 
            Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= explosionRadius) {
            player.damage(this.attackDamage * 2);
        }
        
        // Damage followers
        this.scene.followersGroup.getChildren().forEach(follower => {
            if (follower.active && 
                Phaser.Math.Distance.Between(this.x, this.y, follower.x, follower.y) <= explosionRadius) {
                follower.damage(this.attackDamage);
            }
        });
        
        // Fade out and cleanup
        this.scene.tweens.add({
            targets: explosion,
            alpha: 0,
            scale: 1.5,
            duration: 500,
            onComplete: () => {
                explosion.destroy();
            }
        });
        
        // Self-destruct
        this.die();
    }
    
    /**
     * Shooter enemy behavior - keep distance and shoot projectiles
     */
    updateShooterBehavior() {
        const player = this.scene.player;
        if (!player || !player.active) return;
        
        const distanceToPlayer = Phaser.Math.Distance.Between(
            this.x, this.y, player.x, player.y
        );
        
        // Set rotation to face player
        this.rotation = Phaser.Math.Angle.Between(
            this.x, this.y, player.x, player.y
        );
        
        // Move toward player if far away
        if (distanceToPlayer > this.shootRange) {
            this.moveTowardPlayer();
        } 
        // Move away from player if too close
        else if (distanceToPlayer < this.shootRange / 2) {
            const angle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
            this.body.velocity.x = Math.cos(angle) * this.speed;
            this.body.velocity.y = Math.sin(angle) * this.speed;
        }
        // Shoot if within range and cooldown ready
        else {
            this.body.velocity.x = 0;
            this.body.velocity.y = 0;
            
            if (this.specialAbilityCooldown <= 0) {
                this.shootAtPlayer();
            }
        }
    }
    
    /**
     * Shoot a projectile at the player
     */
    shootAtPlayer() {
        const player = this.scene.player;
        if (!player || !player.active) return;
        
        // Get access to the combat system
        const combatSystem = this.scene.combatSystem || this.scene;
        if (!combatSystem.shootProjectile) {
            console.warn('No shootProjectile method found in scene or combatSystem');
            return;
        }
        
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        
        // Instead of manually creating and configuring a projectile
        // Use the factory method to create an enemy projectile
        const projectile = Projectile.createEnemyProjectile(
            this.scene, this.x, this.y, dirX, dirY, this.attackDamage
        );
        
        if (projectile) {
            // Add to bullets group
            this.scene.bullets.add(projectile);
            
            // Add a lifespan to ensure cleanup
            projectile.setLifespan(5000); // 5 seconds max lifetime
            
            // Debug output
            console.log(`Enemy projectile fired: vx=${projectile.body.velocity.x}, vy=${projectile.body.velocity.y}`);
        }
        
        // Reset cooldown
        this.specialAbilityCooldown = this.specialAbilityCooldownMax;
    }
    
    /**
     * Mage enemy behavior - teleport and cast spells
     */
    updateMageBehavior() {
        const player = this.scene.player;
        if (!player || !player.active) return;
        
        // Try to teleport if cooldown is ready
        if (this.teleportCooldown <= 0 && !this.isTeleporting) {
            this.teleport();
            return;
        }
        
        // Shoot if within range and cooldown ready
        const distanceToPlayer = Phaser.Math.Distance.Between(
            this.x, this.y, player.x, player.y
        );
        
        if (distanceToPlayer < this.shootRange && this.specialAbilityCooldown <= 0) {
            this.castSpell();
        }
        // Otherwise move slowly toward player
        else {
            this.moveTowardPlayer();
        }
    }
    
    /**
     * Teleport to a random location near the player
     */
    teleport() {
        const player = this.scene.player;
        if (!player || !player.active) return;
        
        this.isTeleporting = true;
        
        // Visual effect before teleport
        this.setAlpha(0.5);
        this.body.velocity.x = 0;
        this.body.velocity.y = 0;
        
        // Fade out
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                if (!this.active) return;
                
                // Find new position
                const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                const distance = Phaser.Math.Between(TILE_SIZE * 5, TILE_SIZE * 10);
                const newX = Phaser.Math.Clamp(
                    player.x + Math.cos(angle) * distance,
                    TILE_SIZE, WORLD_WIDTH - TILE_SIZE
                );
                const newY = Phaser.Math.Clamp(
                    player.y + Math.sin(angle) * distance,
                    TILE_SIZE, WORLD_HEIGHT - TILE_SIZE
                );
                
                // Move to new position
                this.setPosition(newX, newY);
                
                // Fade in
                this.scene.tweens.add({
                    targets: this,
                    alpha: 1,
                    duration: 300,
                    onComplete: () => {
                        this.isTeleporting = false;
                        this.teleportCooldown = this.teleportCooldownMax;
                    }
                });
            }
        });
    }
    
    /**
     * Cast a spell attack
     */
    castSpell() {
        const player = this.scene.player;
        if (!player || !player.active) return;
        
        // Get access to the combat system
        const combatSystem = this.scene.combatSystem || this.scene;
        if (!combatSystem.shootProjectile) {
            console.warn('No shootProjectile method found in scene or combatSystem');
            return;
        }
        
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        
        // Use the factory method to create an enemy projectile
        const projectile = Projectile.createEnemyProjectile(
            this.scene, this.x, this.y, dirX, dirY, this.attackDamage
        );
        
        if (projectile) {
            // Add to bullets group
            this.scene.bullets.add(projectile);
            
            // Set magic-specific properties
            projectile.setTint(0xA020F0); // Purple for magic
            projectile.setScale(1.5); // Larger projectile
            
            // Add a lifespan to ensure cleanup
            projectile.setLifespan(5000); // 5 seconds max lifetime
            
            // Debug output
            console.log(`Enemy spell fired: vx=${projectile.body.velocity.x}, vy=${projectile.body.velocity.y}`);
        }
        
        // Reset cooldown
        this.specialAbilityCooldown = this.specialAbilityCooldownMax;
    }
    
    /**
     * Update boss behavior based on the current phase
     */
    updateBossBehavior() {
        if (!this.active) return;
        
        // Basic movement
        this.moveTowardPlayer();
        
        // Execute phase-specific behavior
        switch (this.bossType) {
            case 'summoner':
                this.updateSummonerBossBehavior();
                break;
            case 'berserker':
                this.updateBerserkerBossBehavior();
                break;
            case 'alchemist':
                this.updateAlchemistBossBehavior();
                break;
            case 'lichking':
                this.updateLichKingBossBehavior();
                break;
            default:
                this.moveTowardPlayer();
        }
    }
    
    /**
     * Summoner Boss behavior - summons minions and attacks
     */
    updateSummonerBossBehavior() {
        if (!this.active) return;
        
        // Handle summoning cooldown
        if (!this.summonCooldown) {
            this.summonCooldown = 0;
        }
        
        // Update cooldown timer
        if (this.summonCooldown > 0) {
            this.summonCooldown -= this.scene.game.loop.delta;
        }
        
        // Summon minions if cooldown is ready
        if (this.summonCooldown <= 0) {
            this.summonMinions();
            
            // Reset cooldown based on boss phase
            // More frequent summons in later phases
            switch (this.bossPhase) {
                case 3:
                    this.summonCooldown = 5000; // 5 seconds in phase 3
                    break;
                case 2:
                    this.summonCooldown = 8000; // 8 seconds in phase 2
                    break;
                default:
                    this.summonCooldown = 12000; // 12 seconds in phase 1
                    break;
            }
        }
        
        // Slow movement when summoning
        if (this.summonCooldown <= 0) {
            this.speed = this.originalSpeed * 0.5;
        } else {
            // Restore normal speed
            if (this.originalSpeed) {
                this.speed = this.originalSpeed;
            }
        }
    }
    
    /**
     * Berserker Boss behavior - dashes and area attacks
     */
    updateBerserkerBossBehavior() {
        if (!this.active) return;
        
        // Implement berserker boss behavior
        // This can be implemented later if needed
        this.moveTowardPlayer();
    }
    
    /**
     * Alchemist Boss behavior - teleports and casts area spells
     */
    updateAlchemistBossBehavior() {
        if (!this.active) return;
        
        // Implement alchemist boss behavior
        // This can be implemented later if needed
        this.moveTowardPlayer();
    }
    
    /**
     * Lich King Boss behavior - summons minions and casts powerful spells
     */
    updateLichKingBossBehavior() {
        if (!this.active) return;
        
        // Implement lich king boss behavior
        // This can be implemented later if needed
        this.moveTowardPlayer();
    }
    
    /**
     * Summon minion enemies around the boss
     */
    summonMinions() {
        if (!this.active) return;
        
        // Create visual effect for summoning
        VisualEffects.createFlashEffect(
            this.scene, 
            this.x, 
            this.y, 
            this.width * 3, 
            this.height * 3, 
            0x00FF00, 
            0.5, 
            500
        );
        
        // Number of minions to summon based on boss phase
        let minionCount = 3;
        if (this.bossPhase >= 2) minionCount = 5;
        if (this.bossPhase >= 3) minionCount = 7;
        
        // Spawn minions in a circle around the boss
        for (let i = 0; i < minionCount; i++) {
            const angle = (i / minionCount) * Math.PI * 2;
            const distance = this.width * 2;
            const x = this.x + Math.cos(angle) * distance;
            const y = this.y + Math.sin(angle) * distance;
            
            // Create a basic enemy minion
            if (this.scene.spawnSystem) {
                // Use the newly added spawnEnemyAtPosition method
                this.scene.spawnSystem.spawnEnemyAtPosition(x, y, 'melee');
            } else {
                // Fallback if spawn system isn't available
                const minion = Enemy.createEnemy(this.scene, x, y, 1, 'melee');
                if (this.scene.enemies) {
                    this.scene.enemies.add(minion);
                }
            }
            
            // Add spawn particle effect
            VisualEffects.createEntitySpawnEffect(this.scene, x, y, 0x00FF00);
        }
        
        // Play summoning sound if audio manager exists
        if (this.scene.audioManager) {
            this.scene.audioManager.playSFX('summon');
        }
    }
    
    /**
     * Check if boss should transition to the next phase
     */
    checkBossPhaseTransition() {
        const healthPercent = this.health / this.maxHealth * 100;
        
        if (healthPercent <= 25 && this.bossPhase < 3) {
            this.bossPhase = 3;
            this.onBossPhaseChange();
        } 
        else if (healthPercent <= 50 && this.bossPhase < 2) {
            this.bossPhase = 2;
            this.onBossPhaseChange();
        }
    }
    
    /**
     * Handle boss phase transition
     */
    onBossPhaseChange() {
        // Visual feedback for phase change
        this.scene.cameras.main.shake(300, 0.01);
        
        // Create intense flash effect around boss
        VisualEffects.createFlashEffect(
            this.scene, 
            this.x, 
            this.y, 
            this.width * 2, 
            this.height * 2, 
            0xFFFFFF, 
            0.8, 
            400
        );
        
        // Enhanced visual feedback for phase transition
        const flashTween = this.scene.tweens.add({
            targets: this,
            alpha: 0.4,
            scale: this.scale * 1.2,
            duration: 200,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                if (!this.active) return;
                this.setAlpha(1);
                
                // Update visuals for new phase
                if (this.auraContainer) {
                    this.auraContainer.destroy();
                    VisualEffects.createBossAura(this.scene, this, this.bossPhase, this.tintTopLeft);
                }
                
                if (this.phaseEmitter) {
                    this.phaseEmitter.destroy();
                    VisualEffects.createBossPhaseParticles(this.scene, this, this.bossPhase, this.bossType);
                }
                
                // Create explosive particle burst to mark phase change
                VisualEffects.createDeathEffect(this.scene, this.x, this.y, this.tintTopLeft, 30);
                
                // Play phase transition sound if audio manager exists
                if (this.scene.audioManager) {
                    this.scene.audioManager.playSFX('boss_phase_change');
                }
                
                // Scale back to normal size but slightly larger than before
                this.setScale(this.scale * 1.1);
                
                // Reduce cooldowns and increase damage for later phases
                this.specialAbilityCooldownMax *= 0.7;
                this.teleportCooldownMax *= 0.7;
                this.attackDamage = Math.floor(this.attackDamage * 1.5);
                this.speed *= 1.2;
                
                // Add temporary invulnerability
                this.isInvulnerable = true;
                this.scene.time.delayedCall(1000, () => {
                    if (this.active) this.isInvulnerable = false;
                });
                
                // Show phase change text
                const phaseText = this.scene.add.text(
                    this.x,
                    this.y - this.height,
                    `PHASE ${this.bossPhase}!`,
                    {
                        fontSize: '24px',
                        fontFamily: 'Arial',
                        color: '#FF0000',
                        stroke: '#000000',
                        strokeThickness: 4
                    }
                ).setOrigin(0.5).setDepth(1000);
                
                // Animate and remove the text
                this.scene.tweens.add({
                    targets: phaseText,
                    y: phaseText.y - 50,
                    alpha: 0,
                    duration: 1500,
                    ease: 'Power1',
                    onComplete: () => phaseText.destroy()
                });
            }
        });
    }
    
    /**
     * Apply frost status effect
     * @param {number} duration - Duration in ms
     * @param {number} slowFactor - Factor to slow movement (0-1)
     */
    applyFrost(duration, slowFactor = 0.5) {
        if (this.isFrozen) return;
        
        this.setTint(0x00FFFF);
        this.isFrozen = true;
        
        if (!this.originalSpeed) this.originalSpeed = this.speed;
        this.speed = this.originalSpeed * slowFactor;
        
        // Store original velocity to apply slow
        if (this.body.velocity.x !== 0 || this.body.velocity.y !== 0) {
            this.body.velocity.x *= slowFactor;
            this.body.velocity.y *= slowFactor;
        }
        
        // Clear existing frost timer if any
        if (this.activeEffects.has('frost')) {
            this.activeEffects.get('frost').remove();
        }
        
        // Set timer to clear frost
        const frostTimer = this.scene.time.delayedCall(duration, () => {
            if (this.active) {
                this.clearFrost();
            }
            this.activeEffects.delete('frost');
        });
        
        this.activeEffects.set('frost', frostTimer);
    }
    
    /**
     * Clear frost status effect
     */
    clearFrost() {
        this.clearTint();
        this.isFrozen = false;
        if (this.originalSpeed) {
            this.speed = this.originalSpeed;
        }
    }
    
    /**
     * Apply poison status effect
     * @param {number} damagePerTick - Damage per tick
     * @param {number} ticks - Number of damage ticks
     */
    applyPoison(damagePerTick, ticks) {
        if (!this.active || this.isPoisoned) return;
        
        this.isPoisoned = true;
        this.setTint(0x90EE90);
        
        // Clear existing poison timer if any
        if (this.activeEffects.has('poison')) {
            this.activeEffects.get('poison').remove();
        }
        
        let currentTicks = 0;
        const poisonTimer = this.scene.time.addEvent({
            delay: 1000,
            callback: () => {
                if (!this.active) {
                    poisonTimer.remove();
                    return;
                }
                
                this.damage(damagePerTick);
                currentTicks++;
                
                if (currentTicks >= ticks) {
                    this.isPoisoned = false;
                    this.clearTint();
                    poisonTimer.remove();
                    this.activeEffects.delete('poison');
                }
            },
            loop: true
        });
        
        this.activeEffects.set('poison', poisonTimer);
    }
    
    /**
     * Check terrain effects at current position
     */
    checkTerrainEffects() {
        // Optional - if terrain system exists
        const terrainLayer = this.scene.terrainLayer;
        if (!terrainLayer) return;
        
        const tile = terrainLayer.getTileAtWorldXY(this.x, this.y);
        if (tile && tile.properties && tile.properties.slows) {
            // Apply terrain slowdown
            if (this.originalSpeed === undefined) {
                this.originalSpeed = this.speed;
            }
            const terrainSlowFactor = 0.4; // Significantly slower in forest
            this.speed = this.originalSpeed * terrainSlowFactor;
        } 
        else if (this.originalSpeed !== undefined && !this.isFrozen) {
            // Reset speed if not slowed by other effects
            this.speed = this.originalSpeed;
            delete this.originalSpeed;
        }
    }
    
    /**
     * Override die method to add game-specific logic
     */
    die() {
        // Clear all active effect timers
        this.activeEffects.forEach(timer => {
            if (timer && timer.remove) {
                timer.remove();
            }
        });
        this.activeEffects.clear();
        
        // Add score and experience
        if (this.scene.score !== undefined) {
            this.scene.score += this.scoreValue;
            if (this.scene.uiManager) {
                this.scene.uiManager.updateScore(this.scene.score);
            }
        }
        
        if (typeof this.scene.addExperience === 'function') {
            this.scene.addExperience(this.experienceValue);
        }
        
        // Track enemy kill in SpawnSystem ONLY if not already counted in damage()
        // Check for special property that indicates this enemy was already counted
        if (this.scene.spawnSystem && !this._killCounted) {
            // Directly increment the kill counter in SpawnSystem
            if (this.scene.spawnSystem.waveActive) {
                this.scene.spawnSystem.enemiesKilledInWave++;
                
                // Force UI update with accurate killed count
                if (this.scene.uiManager) {
                    // Always update the UI with the latest count
                    this.scene.uiManager.updateWaveInfo(
                        this.scene.spawnSystem.currentWave,
                        this.scene.spawnSystem.totalWaves,
                        this.scene.spawnSystem.enemiesRemainingInWave,
                        this.scene.spawnSystem.totalEnemies,
                        this.scene.spawnSystem.enemiesSpawnedInWave,
                        this.scene.spawnSystem.enemiesKilledInWave
                    );
                }
                
                // Log debug info
                console.log(`[Enemy.die] Enemy kill counted in die(). Type: ${this.enemyType}, Kill count now: ${this.scene.spawnSystem.enemiesKilledInWave}`);
            }
        } else {
            console.log(`[Enemy.die] Enemy kill was already counted in damage(). Type: ${this.enemyType}`);
        }
        
        // Create death effect and destroy
        this.createDeathEffect();
        this.destroy();
    }
    
    /**
     * Factory method to create different enemy types with appropriate difficulty scaling
     */
    static createEnemy(scene, x, y, level = 1, type = null) {
        // Determine type if not specified
        if (!type) {
            // As level increases, introduce more complex enemy types
            if (level <= 3) {
                type = 'melee'; // Early levels only have melee enemies
            } else {
                const enemyTypes = ['melee'];
                if (level > 3) enemyTypes.push('dasher');
                if (level > 6) enemyTypes.push('bomber');
                if (level > 10) enemyTypes.push('shooter');
                if (level > 15) enemyTypes.push('mage');
                
                // Weighted probabilities: more melee enemies, fewer mages
                let weights = [50, 25, 15, 10, 5]; // Default weights
                
                // Adjust based on level
                if (level > 20) {
                    weights = [20, 25, 20, 20, 15]; // More varied distribution in later levels
                }
                
                // Select type based on weights
                const weightSum = weights.slice(0, enemyTypes.length).reduce((a, b) => a + b, 0);
                let random = Phaser.Math.Between(1, weightSum);
                let index = 0;
                
                for (let i = 0; i < enemyTypes.length; i++) {
                    random -= weights[i];
                    if (random <= 0) {
                        index = i;
                        break;
                    }
                }
                
                type = enemyTypes[index];
            }
        }
        
        // Base configuration for level scaling - speed is multiplied by 1.5 in constructor
        const baseSpeed = 40 + (level * 2);
        const baseHealth = 1 + Math.floor(level / 3);
        
        // Configure based on enemy type
        let config = {
            enemyType: type,
            health: baseHealth,
            speed: baseSpeed, // Will be multiplied by 1.5 in constructor
            attackDamage: 1,
            scoreValue: baseHealth * 5,
            experienceValue: baseHealth * 2,
            specialAbilityCooldownMax: 3000
        };
        
        // Customize based on enemy type
        switch (type) {
            case 'melee':
                config.tint = 0xFF0000;
                config.speed = baseSpeed;
                break;
            case 'dasher':
                config.tint = 0xFF6600;
                config.speed = baseSpeed * 0.8;
                config.dashSpeed = baseSpeed * 3;
                config.specialAbilityCooldownMax = 5000 - (level * 100);
                config.scoreValue *= 1.5;
                config.experienceValue *= 1.5;
                break;
            case 'bomber':
                config.tint = 0x00FF00;
                config.speed = baseSpeed * 0.6;
                config.health = Math.max(1, baseHealth - 1);
                config.attackDamage = 2;
                config.scoreValue *= 2;
                config.experienceValue *= 2;
                break;
            case 'shooter':
                config.tint = 0x0000FF;
                config.speed = baseSpeed * 0.7;
                config.shootRange = TILE_SIZE * 12;
                config.specialAbilityCooldownMax = 2000 - (level * 50);
                config.attackDamage = Math.ceil(baseHealth / 2);
                config.scoreValue *= 2;
                config.experienceValue *= 1.5;
                break;
            case 'mage':
                config.tint = 0x9900FF;
                config.speed = baseSpeed * 0.6;
                config.health = Math.max(1, baseHealth - 1);
                config.attackDamage = Math.ceil(baseHealth / 2) + 1;
                config.teleportCooldownMax = 6000 - (level * 100);
                config.specialAbilityCooldownMax = 3000 - (level * 75);
                config.scoreValue *= 3;
                config.experienceValue *= 2;
                break;
        }
        
        return new Enemy(scene, x, y, config);
    }
    
    /**
     * Factory method to create a boss enemy
     */
    static createBoss(scene, x, y, stageNumber) {
        let bossType;
        let config = {
            isBoss: true,
            enemyType: 'boss'
        };
        
        switch (stageNumber) {
            case 1:
                bossType = 'summoner';
                config.tint = 0x00FF00; // Green
                config.health = 50;
                config.speed = 30;
                config.attackDamage = 2;
                break;
            case 2:
                bossType = 'berserker';
                config.tint = 0xFF0000; // Red
                config.health = 75;
                config.speed = 40;
                config.attackDamage = 3;
                break;
            case 3:
                bossType = 'alchemist';
                config.tint = 0x9900FF; // Purple
                config.health = 100;
                config.speed = 35;
                config.attackDamage = 3;
                break;
            case 4:
                bossType = 'lichking';
                config.tint = 0x6600CC; // Dark purple
                config.health = 150;
                config.speed = 30;
                config.attackDamage = 4;
                break;
            default:
                bossType = 'summoner';
                config.health = 50;
                config.speed = 30;
        }
        
        config.bossType = bossType;
        config.scoreValue = config.health * 5;
        config.experienceValue = config.health * 3;
        config.specialAbilityCooldownMax = 5000;
        config.scale = 2.2; // Make bosses even larger and more imposing
        
        const boss = new Enemy(scene, x, y, config);
        
        // Add screen shake and boss warning text
        scene.cameras.main.shake(500, 0.02);
        
        // Create a large warning text
        const bossNames = {
            'summoner': 'Summoner',
            'berserker': 'Berserker',
            'alchemist': 'Mad Alchemist',
            'lichking': 'Lich King'
        };
        const bossName = bossNames[bossType] || 'Boss';
        const warningText = scene.add.text(
            scene.cameras.main.worldView.centerX,
            scene.cameras.main.worldView.centerY,
            `${bossName} HAS APPEARED!`,
            {
                fontSize: '36px',
                fontFamily: 'Arial',
                color: '#FF0000',
                stroke: '#000000',
                strokeThickness: 6,
                align: 'center'
            }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
        
        // Animate and remove the warning text
        scene.tweens.add({
            targets: warningText,
            alpha: { from: 0, to: 1 },
            scale: { from: 2, to: 1 },
            duration: 1000,
            ease: 'Bounce.easeOut',
            yoyo: true,
            hold: 1000,
            onComplete: () => warningText.destroy()
        });
        
        // Play boss spawn sound if audio manager exists
        if (scene.audioManager) {
            scene.audioManager.playSFX('boss_spawn');
        }
        
        return boss;
    }

    /**
     * Override the damage method to handle boss invulnerability and update visuals
     * @param {number} amount - Amount of damage to apply
     */
    damage(amount) {
        // Prevent damage if invulnerable
        if (this.isInvulnerable) return;
        
        // Store previous health to detect boss phase transitions
        const previousHealth = this.health;
        
        // Call parent damage method (or implement directly if no parent method exists)
        if (typeof super.damage === 'function') {
            super.damage(amount);
        } else {
            this.health = Math.max(0, this.health - amount);
            
            // Create visual feedback
            VisualEffects.createEntityFlashEffect(this.scene, this, 0.7, 100, 1);
            VisualEffects.createDamageParticles(this.scene, this.x, this.y, 0xFFFFFF, 5);
            
            // Check if enemy should die
            if (this.health <= 0) {
                this.die();
            }
        }
        
        // Update health bar if this is a boss
        if (this.isBoss && this.enhancedHealthBar) {
            this.enhancedHealthBar.update();
        }
        
        // Check for boss phase transition
        if (this.isBoss) {
            const previousHealthPercent = previousHealth / this.maxHealth * 100;
            const currentHealthPercent = this.health / this.maxHealth * 100;
            
            // Phase 1 -> 2 transition at 50% health
            if (previousHealthPercent > 50 && currentHealthPercent <= 50 && this.bossPhase < 2) {
                this.bossPhase = 2;
                this.onBossPhaseChange();
            } 
            // Phase 2 -> 3 transition at 25% health
            else if (previousHealthPercent > 25 && currentHealthPercent <= 25 && this.bossPhase < 3) {
                this.bossPhase = 3;
                this.onBossPhaseChange();
            }
        }
    }
} 