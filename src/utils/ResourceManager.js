import { safeDestroy } from './helpers.js';

/**
 * Manages game resources like particles, graphics, and other frequently created/destroyed objects
 * Implements object pooling to reduce garbage collection and improve performance
 */
export default class ResourceManager {
    constructor(scene) {
        this.scene = scene;
        
        // Initialize pools
        this.pools = {
            particles: [],
            graphics: [],
            sprites: []
        };
        
        // Pool configuration
        this.config = {
            particles: {
                maxSize: 50,
                autoGrow: true
            },
            graphics: {
                maxSize: 30,
                autoGrow: true
            },
            sprites: {
                maxSize: 50,
                autoGrow: true
            }
        };
        
        // Track active objects for cleanup
        this.activeObjects = new Set();
        
        // Setup cleanup timer for inactive objects
        this.setupCleanupTimer();
    }
    
    /**
     * Get a particle emitter from the pool or create a new one
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} texture - Particle texture key
     * @param {object} config - Particle configuration
     * @returns {Phaser.GameObjects.Particles.ParticleEmitter} The particle emitter
     */
    getParticles(x, y, texture, config) {
        // Check if we have any available in the pool
        const pooled = this.pools.particles.find(p => !p.active);
        
        if (pooled) {
            // Reset and reuse the pooled emitter
            pooled.setPosition(x, y);
            pooled.setTexture(texture);
            pooled.setConfig(config);
            pooled.setActive(true);
            pooled.setVisible(true);
            
            this.activeObjects.add(pooled);
            return pooled;
        }
        
        // Create a new emitter if none available
        if (this.pools.particles.length < this.config.particles.maxSize || this.config.particles.autoGrow) {
            const newEmitter = this.scene.add.particles(x, y, texture, config);
            
            // Add metadata for pool management
            newEmitter.poolType = 'particles';
            newEmitter.lastUsed = Date.now();
            
            // Add to pool and active set
            this.pools.particles.push(newEmitter);
            this.activeObjects.add(newEmitter);
            
            return newEmitter;
        }
        
        // If we can't create more and none are available, return null
        console.warn('Particle emitter pool exhausted, consider increasing pool size');
        return null;
    }
    
    /**
     * Get a graphics object from the pool or create a new one
     * @returns {Phaser.GameObjects.Graphics} The graphics object
     */
    getGraphics() {
        // Check if we have any available in the pool
        const pooled = this.pools.graphics.find(g => !g.active);
        
        if (pooled) {
            // Reset and reuse the pooled graphics
            pooled.clear();
            pooled.setActive(true);
            pooled.setVisible(true);
            pooled.setAlpha(1);
            
            this.activeObjects.add(pooled);
            return pooled;
        }
        
        // Create a new graphics object if none available
        if (this.pools.graphics.length < this.config.graphics.maxSize || this.config.graphics.autoGrow) {
            const newGraphics = this.scene.add.graphics();
            
            // Add metadata for pool management
            newGraphics.poolType = 'graphics';
            newGraphics.lastUsed = Date.now();
            
            // Add to pool and active set
            this.pools.graphics.push(newGraphics);
            this.activeObjects.add(newGraphics);
            
            return newGraphics;
        }
        
        // If we can't create more and none are available, return null
        console.warn('Graphics pool exhausted, consider increasing pool size');
        return null;
    }
    
    /**
     * Get a sprite from the pool or create a new one
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} texture - Sprite texture key
     * @returns {Phaser.GameObjects.Sprite} The sprite
     */
    getSprite(x, y, texture) {
        // Check if we have any available sprites in the pool
        const pooled = this.pools.sprites.find(s => !s.active);
        
        if (pooled) {
            // Reset and reuse the pooled sprite
            pooled.setPosition(x, y);
            pooled.setTexture(texture);
            pooled.setActive(true);
            pooled.setVisible(true);
            pooled.setAlpha(1);
            pooled.setScale(1);
            pooled.setAngle(0);
            pooled.clearTint();
            
            this.activeObjects.add(pooled);
            return pooled;
        }
        
        // Create a new sprite if none available
        if (this.pools.sprites.length < this.config.sprites.maxSize || this.config.sprites.autoGrow) {
            const newSprite = this.scene.add.sprite(x, y, texture);
            
            // Add metadata for pool management
            newSprite.poolType = 'sprites';
            newSprite.lastUsed = Date.now();
            
            // Add to pool and active set
            this.pools.sprites.push(newSprite);
            this.activeObjects.add(newSprite);
            
            return newSprite;
        }
        
        // If we can't create more and none are available, return null
        console.warn('Sprite pool exhausted, consider increasing pool size');
        return null;
    }
    
    /**
     * Return an object to the pool
     * @param {object} object - The object to release back to the pool
     */
    release(object) {
        if (!object) return;
        
        // Update last used time
        object.lastUsed = Date.now();
        
        // Set inactive
        object.setActive(false);
        object.setVisible(false);
        
        // Remove from active objects
        this.activeObjects.delete(object);
        
        // Special handling for specific object types
        if (object.poolType === 'particles' && object.emitting) {
            object.stop();
        }
    }
    
    /**
     * Setup a timer to clean up inactive objects
     */
    setupCleanupTimer() {
        // Check for inactive objects every 10 seconds
        this.scene.time.addEvent({
            delay: 10000,
            callback: this.cleanupInactiveObjects,
            callbackScope: this,
            loop: true
        });
    }
    
    /**
     * Clean up objects that have been inactive for a while
     */
    cleanupInactiveObjects() {
        const now = Date.now();
        const timeout = 30000; // 30 seconds
        
        // Check all pools
        Object.keys(this.pools).forEach(poolType => {
            // Only cleanup down to half capacity to avoid thrashing
            const minSize = Math.floor(this.config[poolType].maxSize / 2);
            let removed = 0;
            
            this.pools[poolType] = this.pools[poolType].filter(obj => {
                // Keep if object is active or pool is at minimum size
                if (obj.active || this.pools[poolType].length - removed <= minSize) {
                    return true;
                }
                
                // Keep if object was used recently
                if (now - obj.lastUsed < timeout) {
                    return true;
                }
                
                // Otherwise destroy and remove from pool
                safeDestroy(obj);
                removed++;
                return false;
            });
        });
    }
    
    /**
     * Clean up all resources managed by this manager
     * Call this when changing scenes
     */
    cleanup() {
        // Destroy all objects in pools
        Object.values(this.pools).forEach(pool => {
            pool.forEach(obj => {
                safeDestroy(obj);
            });
        });
        
        // Clear pools
        this.pools = {
            particles: [],
            graphics: [],
            sprites: []
        };
        
        // Clear active objects
        this.activeObjects.clear();
    }
} 