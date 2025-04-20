import Projectile from '../entities/Projectile.js';
import { TILE_SIZE } from '../constants.js';

/**
 * Handles combat interactions, projectiles, and collision detection
 */
export default class CombatSystem {
    constructor(scene) {
        this.scene = scene;
    }
    
    /**
     * Setup collision detection between different entity types
     */
    setupCollisions() {
        const scene = this.scene;
        
        // Player vs Pickups
        scene.physics.add.overlap(
            scene.player, 
            scene.pickups, 
            this.handlePickupCollection, 
            null, 
            this
        );
        
        // Player vs Engineers (Collectible)
        scene.physics.add.overlap(
            scene.player, 
            scene.engineers, 
            this.handleEngineerCollection, 
            null, 
            this
        );
        
        // Player vs Enemies
        scene.physics.add.overlap(
            scene.player, 
            scene.enemies, 
            this.handlePlayerEnemyCollision, 
            null, 
            this
        );
        
        // Bullets vs Enemies
        scene.physics.add.overlap(
            scene.bullets, 
            scene.enemies, 
            this.handleBulletEnemyCollision, 
            null, 
            this
        );
        
        // Followers vs Enemies
        scene.physics.add.overlap(
            scene.followersGroup, 
            scene.enemies, 
            this.handleFollowerEnemyCollision, 
            null, 
            this
        );
        
        // Enemy Projectiles vs Followers
        scene.physics.add.overlap(
            scene.bullets, 
            scene.followersGroup, 
            this.handleEnemyProjectileFollowerCollision, 
            null, 
            this
        );
        
        // Enemy Projectiles vs Player
        scene.physics.add.overlap(
            scene.bullets,
            scene.player,
            this.handleEnemyProjectilePlayerCollision,
            null,
            this
        );
    }
    
    /**
     * Create a new projectile
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} dirX - X direction
     * @param {number} dirY - Y direction
     * @param {string} texture - Projectile texture key
     * @returns {Projectile} The created projectile
     */
    shootProjectile(x, y, dirX, dirY, texture = 'bullet') {
        // Create projectile based on type
        let projectile;
        
        switch (texture) {
            case 'arrow':
                projectile = Projectile.createArrow(this.scene, x, y, dirX, dirY);
                break;
            case 'frost':
                projectile = Projectile.createFrostBolt(this.scene, x, y, dirX, dirY);
                break;
            case 'piercing':
                projectile = Projectile.createPiercingProjectile(this.scene, x, y, dirX, dirY);
                break;
            default:
                projectile = Projectile.createBullet(this.scene, x, y, dirX, dirY);
        }
        
        // Add to bullets group
        this.scene.bullets.add(projectile);
        
        return projectile;
    }
    
    /**
     * Handle collision between player and pickup
     * @param {Player} player - The player
     * @param {Pickup} pickup - The pickup
     */
    handlePickupCollection(player, pickup) {
        if (!pickup.active) return;
        
        // Create a new follower
        this.createFollower();
        
        // Play pickup sound with special reliable method
        if (this.scene.audioManager) {
            this.scene.audioManager.playPickupSound();
        }
        
        // Update score
        this.scene.score += 10;
        if (this.scene.uiManager) {
            this.scene.uiManager.updateScore(this.scene.score);
        }
        
        // Add experience
        const expValue = pickup.getData('expValue') || 25;
        this.scene.addExperience(expValue);
        
        // Create a floating text to show exp value
        this.createFloatingText(pickup.x, pickup.y, `+${expValue} EXP`, 0x00ff00);
        
        // Disable and destroy the pickup
        pickup.disableBody(true, true);
        pickup.destroy();
        
        // Spawn a new pickup
        this.scene.spawnSystem.spawnPickup();
    }
    
    /**
     * Handle collision between player and engineer pickup
     * @param {Player} player - The player
     * @param {Pickup} engineer - The engineer pickup
     */
    handleEngineerCollection(player, engineer) {
        if (!engineer.active || !engineer.engineerClass) return;
        
        const engineerClass = engineer.engineerClass;
        
        // Create a class follower
        this.createClassFollower(engineerClass);
        
        // Play pickup sound (use a different sound if you want to differentiate)
        if (this.scene.audioManager) {
            this.scene.audioManager.playSFX('pickup', 1.0); // Higher volume for engineer pickups
        }
        
        // Show notification text
        const notificationText = this.scene.add.text(
            engineer.x, 
            engineer.y - 20, 
            `${engineerClass.name} joined!`, 
            { 
                fontSize: '16px', 
                fontFamily: 'Arial', 
                fill: '#FFFFFF', 
                stroke: '#000000', 
                strokeThickness: 3 
            }
        ).setOrigin(0.5);
        
        this.scene.tweens.add({
            targets: notificationText,
            y: notificationText.y - 30,
            alpha: 0,
            duration: 1500,
            onComplete: () => notificationText.destroy()
        });
        
        // Disable and destroy the engineer pickup
        engineer.disableBody(true, true);
        engineer.destroy();
    }
    
    /**
     * Handle collision between player and enemy
     * @param {Player} player - The player
     * @param {Enemy} enemy - The enemy
     */
    handlePlayerEnemyCollision(player, enemy) {
        if (player.active && enemy.active && !player.isInvulnerable) {
            player.damage(enemy.attackDamage);
            
            player.setInvulnerable();
        }
    }
    
    /**
     * Handle collision between follower and enemy
     * @param {Follower} follower - The follower
     * @param {Enemy} enemy - The enemy
     */
    handleFollowerEnemyCollision(follower, enemy) {
        // Implement damage cooldown on the enemy for followers
        if (!enemy.hasDealtDamageToFollower) {
            follower.damage(1);
            enemy.hasDealtDamageToFollower = true;
            
            // Reset damage flag after delay
            this.scene.time.delayedCall(500, () => { 
                if (enemy.active) enemy.hasDealtDamageToFollower = false; 
            });
        }
    }
    
    /**
     * Handle collision between bullet and enemy
     * @param {Projectile} bullet - The bullet
     * @param {Enemy} enemy - The enemy
     */
    handleBulletEnemyCollision(bullet, enemy) {
        if (!bullet.active || !enemy.active) return;
        
        // Skip enemy projectiles hitting enemies
        if (bullet.isEnemyProjectile) return;
        
        console.log("Bullet-enemy collision detected:", bullet, enemy);
        
        const damage = bullet.damage || 1;
        let destroyBullet = true;
        
        // Handle piercing bullets
        if (bullet.isPiercing) {
            if (!bullet.hitEnemies) bullet.hitEnemies = new Set();
            
            if (!bullet.hitEnemies.has(enemy)) {
                // Check if damage is a function
                if (typeof enemy.damage === 'function') {
                    enemy.damage(damage);
                } else {
                    // Fallback if damage is not a function
                    enemy.health -= damage;
                    enemy.updateHealthBar();
                }
                bullet.hitEnemies.add(enemy);
                bullet.pierceCount = (bullet.pierceCount || 0) + 1;
                
                if (bullet.pierceCount >= bullet.maxPierces) {
                    destroyBullet = true;
                } else {
                    destroyBullet = false; // Don't destroy yet
                }
            } else {
                // Already hit this enemy, don't interact further
                return;
            }
        }
        // Handle Sniper shot
        else if (bullet.isSniper) {
            if (enemy === bullet.target || bullet.target === undefined) {
                // Check if damage is a function
                if (typeof enemy.damage === 'function') {
                    enemy.damage(damage);
                } else {
                    // Fallback if damage is not a function
                    enemy.health -= damage;
                    enemy.updateHealthBar();
                }
                
                // Knockback effect
                const angle = Phaser.Math.Angle.Between(bullet.x, bullet.y, enemy.x, enemy.y);
                if (enemy.body) {
                    enemy.body.velocity.x += Math.cos(angle) * 150;
                    enemy.body.velocity.y += Math.sin(angle) * 150;
                    this.scene.tweens.add({
                        targets: enemy.body.velocity,
                        x: '*=0.5',
                        y: '*=0.5',
                        duration: 200
                    });
                }
                
                destroyBullet = true;
            } else {
                destroyBullet = false; // Sniper shot missed intended target
            }
        }
        // Default bullet behavior
        else {
            console.log("Applying damage to enemy:", damage);
            // Check if damage is a function
            if (typeof enemy.damage === 'function') {
                enemy.damage(damage);
            } else {
                // Fallback if damage is not a function
                enemy.health -= damage;
                enemy.updateHealthBar();
            }
        }
        
        // Apply frost effect
        if (bullet.freezeEffect && !enemy.isFrozen) {
            enemy.applyFrost(1500, 0.5);
        }
        
        if (destroyBullet) {
            bullet.destroy();
        }
    }
    
    /**
     * Handle collision between enemy projectiles and followers
     * @param {Projectile} bullet - The enemy projectile
     * @param {Follower} follower - The follower
     */
    handleEnemyProjectileFollowerCollision(bullet, follower) {
        // Only process if it's an enemy projectile
        if (!bullet.active || !follower.active || !bullet.isEnemyProjectile) return;
        
        // Apply damage to follower
        follower.damage(bullet.damage || 1);
        
        // Destroy the bullet on impact
        bullet.destroy();
    }
    
    /**
     * Handle collision between enemy projectiles and player
     * @param {Projectile} bullet - The enemy projectile
     * @param {Player} player - The player
     */
    handleEnemyProjectilePlayerCollision(bullet, player) {
        // Only process if it's an enemy projectile and player is not invulnerable
        if (!bullet.active || !player.active || !bullet.isEnemyProjectile || player.isInvulnerable) return;
        
        console.log("Enemy projectile hit player:", bullet);
        
        // Apply damage to player
        player.damage(bullet.damage || 1);
        
        // Make player briefly invulnerable
        player.setInvulnerable();
        
        // Destroy the bullet on impact
        bullet.destroy();
    }
    
    /**
     * Create a standard follower
     */
    createFollower() {
        const scene = this.scene;
        const lastSegment = scene.followers.length > 0 ? 
            scene.followers[scene.followers.length - 1] : scene.player;
        
        const dir = lastSegment.direction || scene.movementSystem.direction;
        let x, y;
        
        // Position based on direction
        switch (dir) {
            case 'left': x = lastSegment.x + TILE_SIZE; y = lastSegment.y; break;
            case 'right': x = lastSegment.x - TILE_SIZE; y = lastSegment.y; break;
            case 'up': x = lastSegment.x; y = lastSegment.y + TILE_SIZE; break;
            case 'down': x = lastSegment.x; y = lastSegment.y - TILE_SIZE; break;
            default: x = lastSegment.x - TILE_SIZE; y = lastSegment.y;
        }
        
        // Create follower via the factory method
        const follower = scene.followerFactory.createFollower(scene, x, y, dir);
        
        // Add to group and array
        scene.followersGroup.add(follower);
        scene.followers.push(follower);
        
        return follower;
    }
    
    /**
     * Create an engineer follower
     * @param {object} engineerClass - Engineer class data
     */
    createClassFollower(engineerClass) {
        const scene = this.scene;
        const lastSegment = scene.followers.length > 0 ? 
            scene.followers[scene.followers.length - 1] : scene.player;
        
        const dir = lastSegment.direction || scene.movementSystem.direction;
        let x, y;
        
        // Position based on direction
        switch (dir) {
            case 'left': x = lastSegment.x + TILE_SIZE; y = lastSegment.y; break;
            case 'right': x = lastSegment.x - TILE_SIZE; y = lastSegment.y; break;
            case 'up': x = lastSegment.x; y = lastSegment.y + TILE_SIZE; break;
            case 'down': x = lastSegment.x; y = lastSegment.y - TILE_SIZE; break;
            default: x = lastSegment.x - TILE_SIZE; y = lastSegment.y;
        }
        
        // Create engineer follower via the factory method
        const follower = scene.followerFactory.createEngineerFollower(
            scene, x, y, dir, engineerClass
        );
        
        // Add to group and array
        scene.followersGroup.add(follower);
        scene.followers.push(follower);
        
        return follower;
    }
    
    /**
     * Create a floating text element that animates upward
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} text - Text to display
     * @param {number} color - Color in hex format
     */
    createFloatingText(x, y, text, color = 0xffffff) {
        // Create text object
        const floatingText = this.scene.add.text(x, y, text, {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: `#${color.toString(16).padStart(6, '0')}`,
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        // Animate text floating upward
        this.scene.tweens.add({
            targets: floatingText,
            y: y - 50,
            alpha: 0,
            duration: 1500,
            ease: 'Power1',
            onComplete: () => {
                floatingText.destroy();
            }
        });
        
        return floatingText;
    }
} 