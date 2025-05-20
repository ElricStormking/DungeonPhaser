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
        
        // Store the texture name
        this.textureKey = texture;
        
        // For non-engineer sprites or basic follower sprite, add pulsing animation
        const engineerSpriteKeys = [
            'Chronotemporal', 'Voltaic', 'Thunder Mage', 'Sniper', 'Ice Mage',
            'Dark Mage', 'Ninja', 'Shotgunner', 'Goblin Trapper', 'Shaman',
            'Holy Bard', 'Shroom Pixie'
        ];
        
        // Only add pulsing to non-animated sprites
        if (texture === 'pickup' || texture === 'follower' || !engineerSpriteKeys.includes(texture)) {
            // Add pulsing animation
            this.scene.tweens.add({ 
                targets: this, 
                scale: 1.2, 
                duration: 500, 
                yoyo: true, 
                repeat: -1 
            });
        }
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
        // Use the same sprite texture key as the follower would use
        let textureKey = 'follower';
        
        // Map engineer class name to the correct texture key
        if (engineerClass.name === 'Chronotemporal') {
            textureKey = 'Chronotemporal';
        } else if (engineerClass.name === 'Voltaic') {
            textureKey = 'Voltaic';
        } else if (engineerClass.name === 'Thunder Mage') {
            textureKey = 'Thunder Mage';
        } else if (engineerClass.name === 'Sniper') {
            textureKey = 'Sniper';
        } else if (engineerClass.name === 'Ice Mage') {
            textureKey = 'Ice Mage';
        } else if (engineerClass.name === 'Dark Mage') {
            textureKey = 'Dark Mage';
        } else if (engineerClass.name === 'Ninja') {
            textureKey = 'Ninja';
        } else if (engineerClass.name === 'Shotgunner') {
            textureKey = 'Shotgunner';
        } else if (engineerClass.name === 'Goblin Trapper') {
            textureKey = 'Goblin Trapper';
        } else if (engineerClass.name === 'Shaman') {
            textureKey = 'Shaman';
        } else if (engineerClass.name === 'Holy Bard') {
            textureKey = 'Holy Bard';
        } else if (engineerClass.name === 'Shroom Pixie') {
            textureKey = 'Shroom Pixie';
        }
        
        const engineer = new Pickup(scene, x, y, textureKey);
        
        // Store engineer class data for later use
        engineer.engineerClass = engineerClass;
        engineer.isEngineer = true;
        
        // Only apply tint to non-animated (basic) engineer pickups
        if (textureKey === 'follower') {
            engineer.setTint(engineerClass.color);
        } else {
            // Don't tint animated sprites
            engineer.clearTint();
            
            // Setup animations for the pickup
            const animKey = `${textureKey}_walk_down`;
            
            // Check if animation exists before playing
            if (scene.anims.exists(animKey)) {
                engineer.play(animKey);
            } else {
                // Animation doesn't exist yet, set to first frame of down animation
                engineer.setFrame(0);
                
                // Create a delayed call to check for animations later
                scene.time.delayedCall(300, () => {
                    if (engineer.active && scene.anims.exists(animKey)) {
                        engineer.play(animKey);
                    }
                });
            }
            
            // Set to a reasonable scale
            engineer.setScale(0.75);
            
            // Set proper origin
            engineer.setOrigin(0.5, 0.65);
        }
        
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

    update(time, delta) {
        if (!this.active || !this.isEngineer || !this.scene || !this.scene.player || !this.scene.player.active) {
            return;
        }

        // Auto-collect if player is close enough
        const player = this.scene.player;
        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        if (distance <= TILE_SIZE * 2) { // 2 grid units
            this.collect();
        }
    }
} 