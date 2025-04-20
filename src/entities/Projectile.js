import { TILE_SIZE } from '../constants.js';

/**
 * Projectile class for bullets, arrows, and other attacks
 */
export default class Projectile extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        
        // Add to scene and physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Default properties
        this.damage = 1;
        this.speed = 300;
        this.lifespan = null; // Infinite by default
        this.type = texture;
        this.isEnemyProjectile = false; // Default to player projectile
        
        // Special properties
        this.isPiercing = false;
        this.isSniper = false;
        this.freezeEffect = false;
        this.hitEnemies = null; // For tracking enemies hit by piercing projectiles
        this.target = null; // For targeted projectiles
        
        // Set depth
        this.setDepth(5);
        
        // Debug: Log creation of this projectile
        console.log(`Projectile created: ${texture} at ${x},${y}`);
    }
    
    /**
     * Set the projectile as an enemy projectile (for proper collision detection)
     */
    setAsEnemyProjectile() {
        this.isEnemyProjectile = true;
        
        // Make enemy projectiles visually distinct
        this.setTint(0xFF0000); // Red tint
        this.setScale(1.2); // Slightly larger
        
        // Create a glow effect in the scene instead of trying to add it to the sprite
        const glow = this.scene.add.graphics();
        glow.fillStyle(0xFF0000, 0.3);
        glow.fillCircle(this.x, this.y, this.width * 0.7);
        
        // Make the glow follow the projectile
        this.scene.tweens.add({
            targets: glow,
            duration: 5000, // Match the typical lifespan
            onUpdate: () => {
                if (this.active) {
                    glow.clear();
                    glow.fillStyle(0xFF0000, 0.3);
                    glow.fillCircle(this.x, this.y, this.width * 0.7);
                }
            },
            onComplete: () => {
                glow.destroy();
            }
        });
        
        // Destroy glow when projectile is destroyed
        this.on('destroy', () => {
            if (glow && !glow.destroyed) {
                glow.destroy();
            }
        });
        
        // Debug: Log when a projectile is set as enemy
        console.log(`Projectile set as ENEMY projectile: ${this.type}`);
        
        return this;
    }
    
    /**
     * Set damage value
     * @param {number} amount - Amount of damage
     */
    setDamage(amount) {
        this.damage = amount;
        return this;
    }
    
    /**
     * Set the velocity directly
     */
    setSpeed(speed) {
        this.speed = speed;
        return this;
    }
    
    /**
     * Fire the projectile in a direction
     * @param {number} dirX - X direction
     * @param {number} dirY - Y direction
     */
    fire(dirX, dirY) {
        // Avoid division by zero and ensure we have a direction
        const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);
        let normalizedDirX = 0;
        let normalizedDirY = 0;
        
        if (magnitude > 0.001) {  // Avoid extremely small values
            normalizedDirX = dirX / magnitude;
            normalizedDirY = dirY / magnitude;
        } else {
            // Default direction if none provided
            normalizedDirX = 1;
            normalizedDirY = 0;
            console.warn("Projectile fired with near-zero direction vector, using default direction");
        }
        
        // Ensure the body exists before setting velocity
        if (this.body) {
            // Set velocity - use a minimum velocity to ensure movement
            this.body.velocity.x = normalizedDirX * this.speed;
            this.body.velocity.y = normalizedDirY * this.speed;
            
            // Verify velocity was set (debug info)
            if (Math.abs(this.body.velocity.x) < 0.1 && Math.abs(this.body.velocity.y) < 0.1) {
                console.error("Failed to set projectile velocity! Values too small.", {
                    dirX, dirY, normalizedDirX, normalizedDirY, speed: this.speed
                });
                
                // Fallback: force a minimum velocity in the original direction
                if (Math.abs(dirX) > Math.abs(dirY)) {
                    this.body.velocity.x = dirX > 0 ? 100 : -100;
                } else {
                    this.body.velocity.y = dirY > 0 ? 100 : -100;
                }
            }
            
            // Extra protection - if still no movement, use a default velocity
            if (this.body.velocity.x === 0 && this.body.velocity.y === 0) {
                console.warn("Zero velocity detected after setting, using fallback velocity");
                this.body.velocity.x = 100;
            }
        } else {
            console.error("Projectile body not initialized when firing!");
        }
        
        // Set rotation
        this.rotation = Math.atan2(normalizedDirY, normalizedDirX);
        
        // Debug logs for velocity
        console.log(`Projectile fired: type=${this.type}, isEnemy=${this.isEnemyProjectile}, velocity=(${this.body?.velocity.x}, ${this.body?.velocity.y}), position=(${this.x}, ${this.y})`);
        
        return this;
    }
    
    /**
     * Set a lifespan for automatic cleanup
     * @param {number} duration - Time in ms before auto-destroy
     */
    setLifespan(duration) {
        this.lifespan = duration;
        this.scene.time.delayedCall(duration, () => {
            if (this.active) {
                this.destroy();
            }
        });
        return this;
    }
    
    /**
     * Configure the projectile as piercing (passes through multiple enemies)
     * @param {number} maxPierces - Maximum enemies to pierce
     */
    setPiercing(maxPierces = 3) {
        this.isPiercing = true;
        this.maxPierces = maxPierces;
        this.pierceCount = 0;
        this.hitEnemies = new Set();
        return this;
    }
    
    /**
     * Update method called each frame
     * @param {number} time - The current time
     * @param {number} delta - The delta time in ms since the last frame
     */
    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        
        // Check for out-of-bounds and clean up
        const padding = TILE_SIZE * 2;
        const bounds = this.scene.physics.world.bounds;
        
        if (this.x < bounds.x - padding || this.x > bounds.width + padding ||
            this.y < bounds.y - padding || this.y > bounds.height + padding) {
            this.destroy();
        }
    }
    
    /**
     * Factory method to create a standard bullet
     */
    static createBullet(scene, x, y, dirX, dirY) {
        const bullet = new Projectile(scene, x, y, 'bullet');
        return bullet.fire(dirX, dirY);
    }
    
    /**
     * Factory method to create an arrow
     */
    static createArrow(scene, x, y, dirX, dirY) {
        const arrow = new Projectile(scene, x, y, 'arrow');
        arrow.setDamage(2);
        arrow.setSpeed(400);
        
        return arrow.fire(dirX, dirY);
    }
    
    /**
     * Factory method to create a frost bolt projectile with enhanced visuals
     */
    static createFrostBolt(scene, x, y, dirX, dirY) {
        const frost = new Projectile(scene, x, y, 'bullet');
        frost.setTint(0x00FFFF);  // Cyan/bright blue color
        frost.setDamage(1);
        frost.freezeEffect = true;
        frost.setSpeed(350);
        
        // Make the frost bolt larger and more noticeable
        frost.setScale(2.0);
        
        // Add a bright inner glow
        const glow = scene.add.graphics();
        glow.fillStyle(0x00FFFF, 0.6);  // Bright cyan glow
        glow.fillCircle(frost.x, frost.y, frost.width * 0.8);
        
        // Make the glow follow the projectile with a pulse effect
        scene.tweens.add({
            targets: glow,
            alpha: { from: 0.7, to: 0.3 },
            scale: { from: 0.8, to: 1.2 },
            duration: 400,
            yoyo: true,
            repeat: -1,
            onUpdate: () => {
                if (frost.active) {
                    glow.clear();
                    glow.fillStyle(0x00FFFF, 0.6);
                    glow.fillCircle(frost.x, frost.y, frost.width * 0.8);
                }
            },
            onComplete: () => {
                glow.destroy();
            }
        });
        
        // Create enhanced particle effects with updated Phaser 3.60 syntax
        const particles = scene.add.particles(x, y, 'particle', {
            speed: 30, 
            scale: { start: 0.6, end: 0 },
            blendMode: 'ADD',
            lifespan: 400, 
            tint: [0x00FFFF, 0xAAFFFF],  // Mix of cyan and light blue
            follow: frost,
            quantity: 4,  // More particles
            frequency: 10,  // Emit more frequently
            angle: { min: 0, max: 360 },  // Emit in all directions
            alpha: { start: 0.8, end: 0 },
            scale: { start: 0.6, end: 0.1 }
        });
        
        // Add a trail of icy particles behind the projectile
        const trail = scene.add.particles(x, y, 'particle', {
            speed: 10,
            scale: { start: 0.3, end: 0 },
            blendMode: 'ADD',
            lifespan: 500,
            tint: 0xAAFFFF,  // Light blue
            follow: frost,
            followOffset: { x: -frost.width, y: 0 },
            quantity: 1,
            frequency: 15,
            alpha: { start: 0.6, end: 0 }
        });
        
        // Add snowflake-like particles that float down
        const snowflakes = scene.add.particles(x, y, 'particle', {
            speed: { min: 5, max: 15 },
            scale: { start: 0.2, end: 0 },
            blendMode: 'ADD',
            lifespan: 300,
            tint: 0xFFFFFF,  // White
            follow: frost,
            quantity: 1,
            frequency: 30,
            angle: { min: 80, max: 100 },  // Mostly downward
            gravityY: 20  // Slight gravity effect
        });
        
        // Clean up all particle effects when projectile is destroyed
        frost.on('destroy', () => {
            if (glow && !glow.destroyed) {
                glow.destroy();
            }
            
            if (particles) {
                particles.stop();
                scene.time.delayedCall(500, () => {
                    if (particles) particles.destroy();
                });
            }
            
            if (trail) {
                trail.stop();
                scene.time.delayedCall(500, () => {
                    if (trail) trail.destroy();
                });
            }
            
            if (snowflakes) {
                snowflakes.stop();
                scene.time.delayedCall(300, () => {
                    if (snowflakes) snowflakes.destroy();
                });
            }
            
            // Create a frost explosion effect on impact
            const impactExplosion = scene.add.particles(frost.x, frost.y, 'particle', {
                speed: { min: 30, max: 60 },
                scale: { start: 0.8, end: 0 },
                blendMode: 'ADD',
                lifespan: 400,
                tint: [0x00FFFF, 0xAAFFFF, 0xFFFFFF],
                quantity: 15,
                angle: { min: 0, max: 360 }
            });
            
            // Auto-destroy the impact explosion after animation completes
            scene.time.delayedCall(400, () => {
                if (impactExplosion) impactExplosion.destroy();
            });
        });
        
        return frost.fire(dirX, dirY);
    }
    
    /**
     * Factory method to create a piercing projectile
     */
    static createPiercingProjectile(scene, x, y, dirX, dirY, tint = 0xFFFF00) {
        const projectile = new Projectile(scene, x, y, 'bullet');
        projectile.setTint(tint);
        projectile.setPiercing(3);
        projectile.setDamage(2);
        
        // Create particle trail with updated Phaser 3.60 syntax
        const particles = scene.add.particles(x, y, 'particle', {
            speed: 15,
            scale: { start: 0.3, end: 0 },
            blendMode: 'ADD',
            lifespan: 250,
            tint: tint,
            follow: projectile,
            quantity: 1,
            frequency: 10
        });
        
        projectile.on('destroy', () => {
            if (particles) {
                particles.stop();
                scene.time.delayedCall(250, () => {
                    if (particles) particles.destroy();
                });
            }
        });
        
        return projectile.fire(dirX, dirY);
    }
    
    /**
     * Factory method to create an enemy projectile
     */
    static createEnemyProjectile(scene, x, y, dirX, dirY, damage = 1) {
        const projectile = new Projectile(scene, x, y, 'bullet');
        projectile.setDamage(damage);
        
        // Set the speed before firing to ensure proper velocity
        projectile.setSpeed(150); // Slightly faster so enemy bullets are more challenging
        
        // Set as enemy projectile
        projectile.setAsEnemyProjectile();
        
        // Add a particle trail for better visibility
        const particles = scene.add.particles(x, y, 'particle', {
            speed: 10,
            scale: { start: 0.2, end: 0 },
            blendMode: 'ADD',
            lifespan: 200,
            tint: 0xFF0000,
            follow: projectile,
            quantity: 1,
            frequency: 30
        });
        
        projectile.on('destroy', () => {
            if (particles) {
                particles.stop();
                scene.time.delayedCall(200, () => {
                    if (particles) particles.destroy();
                });
            }
        });
        
        // Fire the projectile and return it
        return projectile.fire(dirX, dirY);
    }
} 