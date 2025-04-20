import { TILE_SIZE } from '../constants.js';
import * as VisualEffects from '../utils/VisualEffects.js';

/**
 * Pickup class for collectible items
 */
export default class Pickup extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        
        // Add to scene and physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Set up physics body
        this.body.setCircle(TILE_SIZE / 3);
        
        // Set depth and add visual effects
        this.setDepth(2);
        
        // Add pulsing animation
        this.scene.tweens.add({ 
            targets: this, 
            scale: 1.2, 
            duration: 500, 
            yoyo: true, 
            repeat: -1 
        });
    }
    
    /**
     * Handle collection by player
     */
    collect() {
        if (!this.active) return;
        
        // Create collection effect
        this.createCollectionEffect();
        
        // Destroy the pickup
        this.destroy();
    }
    
    /**
     * Create visual effect when collected
     */
    createCollectionEffect() {
        VisualEffects.createDeathEffect(this.scene, this.x, this.y, 0xFFFF00, 15);
    }
    
    /**
     * Factory method to create a standard pickup
     */
    static createPickup(scene, x, y) {
        return new Pickup(scene, x, y, 'pickup');
    }
    
    /**
     * Factory method to create an engineer pickup
     */
    static createEngineer(scene, x, y, engineerClass) {
        const engineer = new Pickup(scene, x, y, 'follower');
        
        // Store engineer class data for later use
        engineer.engineerClass = engineerClass;
        engineer.isEngineer = true;
        
        // Apply engineer color
        engineer.setTint(engineerClass.color);
        
        // Set up lifespan for engineer pickups
        const lifespan = 20000;
        engineer.lifespanTimer = scene.time.delayedCall(lifespan, () => {
            if (engineer.active) {
                // Create despawn effect
                const emitter = scene.add.particles(engineer.x, engineer.y, 'particle', {
                    speed: { min: 50, max: 150 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 0.8, end: 0 },
                    lifespan: { min: 300, max: 500 },
                    quantity: 15,
                    tint: 0xAAAAAA,
                    blendMode: 'ADD',
                    emitting: false
                });
                
                if (emitter) {
                    emitter.explode(15);
                    scene.time.delayedCall(500, () => {
                        if (emitter) emitter.destroy();
                    });
                }
                
                engineer.destroy();
            }
        });
        
        // Ensure timer is cleared if engineer is collected or destroyed
        engineer.on('destroy', () => { 
            if (engineer.lifespanTimer) engineer.lifespanTimer.remove(); 
        });
        
        return engineer;
    }
} 