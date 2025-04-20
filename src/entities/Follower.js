import Character from './Character.js';
import { TILE_SIZE } from '../constants.js';

/**
 * Follower class representing snake body segments
 * Regular followers are just body parts, engineer followers have special abilities
 */
export default class Follower extends Character {
    constructor(scene, x, y, config = {}) {
        // Special case for animated followers using sprite sheets
        let textureKey = 'follower';
        if (config.isEngineer && config.engineerClass) {
            if (config.engineerClass.name === 'Chronotemporal') {
                textureKey = 'Chronotemporal';
            } else if (config.engineerClass.name === 'Voltaic') {
                textureKey = 'Voltaic';
            } else if (config.engineerClass.name === 'Thunder Mage') {
                textureKey = 'Thunder Mage';
            } else if (config.engineerClass.name === 'Sniper') {
                textureKey = 'Sniper';
            } else if (config.engineerClass.name === 'Ice Mage') {
                textureKey = 'Ice Mage';
            } else if (config.engineerClass.name === 'Dark Mage') {
                textureKey = 'Dark Mage';
            } else if (config.engineerClass.name === 'Ninja') {
                textureKey = 'Ninja';
            } else if (config.engineerClass.name === 'Shotgunner') {
                textureKey = 'Shotgunner';
            } else if (config.engineerClass.name === 'Goblin Trapper') {
                textureKey = 'Goblin Trapper';
            } else if (config.engineerClass.name === 'Shaman') {
                textureKey = 'Shaman';
            } else if (config.engineerClass.name === 'Holy Bard') {
                textureKey = 'Holy Bard';
            } else if (config.engineerClass.name === 'Shroom Pixie') {
                textureKey = 'Shroom Pixie';
            }
        }
        
        super(scene, x, y, textureKey, {
            health: config.isEngineer ? 2 : 1,
            maxHealth: config.isEngineer ? 2 : 1,
            direction: config.direction || 'right',
            tint: config.tint || 0x00FFFF,
            bodySize: { width: TILE_SIZE * 0.8, height: TILE_SIZE * 0.8 }
        });
        
        // Generate a unique name for tracking
        this.name = config.isEngineer ? 
            `engineer_${scene.followers.length}` : 
            `follower_${scene.followers.length}`;
        
        // Engineer properties
        this.isEngineerFollower = config.isEngineer || false;
        this.usesAnimations = false;
        
        if (this.isEngineerFollower && config.engineerClass) {
            this.engineerClass = config.engineerClass;
            // Initialize cooldown values
            this.specialAttackCooldown = 0; // Start at 0 to allow first attack quickly
            this.specialAttackCooldownMax = 0; // Will be set in initEngineerCooldown
            this.initEngineerCooldown();
            
            // Set up animations for sprite-based followers
            const animatedClasses = ['Chronotemporal', 'Voltaic', 'Thunder Mage', 'Sniper', 'Ice Mage', 'Dark Mage', 'Ninja', 'Shotgunner', 'Goblin Trapper', 'Shaman', 'Holy Bard', 'Shroom Pixie'];
            if (animatedClasses.includes(this.engineerClass.name)) {
                console.log(`Creating ${this.engineerClass.name} follower with special animations`);
                this.usesAnimations = true;
                
                // Force angle to 0 from the start
                this.angle = 0;
                
                // Create animations after a short delay to ensure texture is loaded
                scene.time.delayedCall(100, () => {
                    this.createAnimations();
                    // Play default animation
                    this.playAnimation(this.direction || 'down');
                });
                
                // Don't apply tint to sprite sheet characters
                this.clearTint();
            }
        }
        
        // Set angle based on direction (for non-animated followers)
        if (!this.usesAnimations) {
            this.setAngleFromDirection();
        }
    }
    
    /**
     * Create animations for sprite sheet based followers
     */
    createAnimations() {
        if (!this.usesAnimations) return;
        
        const scene = this.scene;
        const anims = scene.anims;
        const textureKey = this.texture.key;
        
        try {
            console.log(`Creating ${textureKey} follower animations`);
            
            // Define the animation frame mappings based on the sprite sheet layout
            const animationFrames = {
                'down': { start: 0, end: 3 },
                'left': { start: 4, end: 7 },
                'right': { start: 8, end: 11 },
                'up': { start: 12, end: 15 }
            };
            
            // Fix for Voltaic right animation which has a wrong frame in the JSON
            // The JSON specifies frame 7 as the last frame instead of 11
            if (textureKey === 'Voltaic') {
                console.log('Using corrected frame mappings for Voltaic');
                // Create a custom frames array for the right animation
                // to fix the issue in the JSON where it uses frame 7 instead of 11
                animationFrames.right.frames = [8, 9, 10, 11]; // Use explicit frames instead of start/end
                delete animationFrames.right.start;
                delete animationFrames.right.end;
            }
            
            // Create prefixed animation keys
            const directions = ['down', 'up', 'left', 'right'];
            const animKeys = directions.map(dir => `${textureKey}_walk_${dir}`);
            
            // Remove existing animations if they exist
            animKeys.forEach(key => {
                if (anims.exists(key)) {
                    anims.remove(key);
                    console.log(`Removed existing animation: ${key}`);
                }
            });
            
            // Create animations one by one with detailed logging
            directions.forEach(direction => {
                const frames = animationFrames[direction];
                const key = `${textureKey}_walk_${direction}`;
                
                console.log(`Creating animation ${key}`);
                
                // Remove any existing animation with this key
                if (anims.exists(key)) {
                    anims.remove(key);
                }
                
                // Create the animation
                if (frames.frames) {
                    // Use custom frames array if provided (for Voltaic right animation fix)
                    console.log(`Using custom frames: ${frames.frames.join(', ')}`);
                    anims.create({
                        key: key,
                        frames: frames.frames.map(frame => ({ 
                            key: textureKey, 
                            frame: frame 
                        })),
                        frameRate: 6,
                        repeat: -1
                    });
                } else {
                    // Use start/end range
                    console.log(`Using frame range: ${frames.start}-${frames.end}`);
                    anims.create({
                        key: key,
                        frames: anims.generateFrameNumbers(textureKey, { 
                            start: frames.start, 
                            end: frames.end 
                        }),
                        frameRate: 6,
                        repeat: -1
                    });
                }
                
                // Verify the animation was created
                if (anims.exists(key)) {
                    const animObj = anims.get(key);
                    console.log(`Successfully created animation: ${key}, frames: ${animObj.frames.length}`);
                } else {
                    console.error(`Failed to create animation: ${key}`);
                }
            });
        } catch (error) {
            console.error(`Error creating ${textureKey} follower animations:`, error);
        }
    }
    
    /**
     * Play animation based on direction
     */
    playAnimation(direction) {
        if (!this.usesAnimations) return;
        
        const textureKey = this.texture.key;
        const animKey = `${textureKey}_walk_${direction}`;
        
        // Reset any flipping or transformations
        this.setFlipX(false);
        this.setFlipY(false);
        this.setScale(0.75); // Same scale as player
        this.setOrigin(0.5, 0.65); // Center origin
        
        // Important: Reset angle to 0 to prevent upside-down sprites
        this.angle = 0;
        
        try {
            // Check if animation exists
            if (this.scene.anims.exists(animKey)) {
                // Play the animation if it's not already playing
                if (!this.anims.isPlaying || this.anims.currentAnim.key !== animKey) {
                    console.log(`Playing animation: ${animKey}`);
                    this.play(animKey, true);
                }
            } else {
                console.warn(`Animation ${animKey} not found for follower`);
                
                // Try to recreate animations before falling back to static frame
                if (!this._retriedAnimations) {
                    console.log(`Attempting to recreate animations for ${textureKey}`);
                    this.createAnimations();
                    this._retriedAnimations = true;
                    
                    // Try again to play the animation
                    if (this.scene.anims.exists(animKey)) {
                        this.play(animKey, true);
                        return;
                    }
                }
                
                // Fallback to static frame if animation still doesn't exist
                const frameIndex = 
                    direction === 'down' ? 0 : 
                    direction === 'left' ? 4 : 
                    direction === 'right' ? 8 : 
                    direction === 'up' ? 12 : 0;
                    
                console.log(`Using static frame ${frameIndex} for ${direction}`);
                this.setFrame(frameIndex);
            }
        } catch (error) {
            console.error(`Error playing follower animation ${animKey}:`, error);
            
            // Fallback to static frame
            const frameIndex = 
                direction === 'down' ? 0 : 
                direction === 'left' ? 4 : 
                direction === 'right' ? 8 : 
                direction === 'up' ? 12 : 0;
                
            console.log(`Error fallback: Using static frame ${frameIndex}`);
            this.setFrame(frameIndex);
        }
    }
    
    /**
     * Initialize engineer ability cooldown based on class
     */
    initEngineerCooldown() {
        if (!this.engineerClass) return;
        
        let baseAttackCooldown = 3000;
        
        // Set base cooldown by class type
        switch (this.engineerClass.name) {
            case 'Shotgunner': case 'Holy Bard': case 'Shaman': 
                baseAttackCooldown = 4000; 
                break;
            case 'Sniper': case 'Dark Mage': case 'Thunder Mage': 
                baseAttackCooldown = 5000; 
                break;
            case 'Ninja': case 'Voltaic': 
                baseAttackCooldown = 3500; 
                break;
            case 'Chronotemporal': case 'Ice Mage': 
                baseAttackCooldown = 4500; 
                break;
            case 'Goblin Trapper': 
                baseAttackCooldown = 15000; // 15 seconds for Mega Bomb
                break;
            case 'Shroom Pixie': 
                baseAttackCooldown = 4000; 
                break;
            default:
                baseAttackCooldown = 3000;
                console.log(`Unknown engineer class: ${this.engineerClass.name}, using default cooldown`);
        }
        
        // Apply level-based cooldown reduction
        const cooldownReduction = Math.min(0.4, this.scene.levelSystem?.currentLevel * 0.03 || 0);
        baseAttackCooldown = Math.max(1500, baseAttackCooldown * (1 - cooldownReduction));
        
        // Add some randomness to prevent all engineers attacking at once
        this.specialAttackCooldownMax = baseAttackCooldown + Phaser.Math.Between(-300, 300);
        
        // Debug log
        console.log(`Engineer ${this.name} (${this.engineerClass.name}) initialized with cooldown: ${this.specialAttackCooldownMax}ms`);
    }
    
    /**
     * Update engineer's special ability cooldown and try to use it
     */
    updateEngineerAttack(delta, enemies) {
        if (!this.isEngineerFollower || !this.engineerClass) return;
        
        // Update cooldown
        if (this.specialAttackCooldown > 0) {
            this.specialAttackCooldown -= delta;
        }
        
        // Try to use special attack if off cooldown and enemies exist
        if (this.specialAttackCooldown <= 0 && enemies.countActive(true) > 0) {
            // Set initial cooldown if not set yet
            if (this.specialAttackCooldownMax === undefined) {
                this.initEngineerCooldown();
            }
            
            const attackSuccess = this.engineerClass.specialAttack(
                this.scene, 
                this, 
                enemies, 
                this.scene.helpers
            );
            
            if (attackSuccess) {
                // Add random variance to prevent synchronized attacks
                const randomVariance = Phaser.Math.Between(-300, 300);
                this.specialAttackCooldown = this.specialAttackCooldownMax + randomVariance;
                
                // Visual feedback
                this.scene.tweens.add({ 
                    targets: this, 
                    scaleX: 1.2, 
                    scaleY: 1.2, 
                    duration: 100, 
                    yoyo: true 
                });
                
                console.log(`Engineer ${this.name} attack success, next attack in ${this.specialAttackCooldown/1000}s`);
            }
        }
    }
    
    /**
     * Update method called by physics group
     */
    update(time, delta) {
        super.update(time, delta);
        
        // Update animations for sprite-based followers
        if (this.usesAnimations && this.direction) {
            this.playAnimation(this.direction);
            // Ensure angle is always 0 for animated followers
            this.angle = 0;
        }
        // Update angle for non-sprite followers (handled by Character.update now)
        
        // Update engineer abilities
        if (this.isEngineerFollower && this.active) {
            this.updateEngineerAttack(delta, this.scene.enemies);
        }
    }
    
    /**
     * Factory method to create a standard follower
     */
    static createFollower(scene, x, y, direction) {
        const follower = new Follower(scene, x, y, {
            direction: direction,
            tint: scene.player.tintTopLeft,
            isEngineer: false
        });
        
        return follower;
    }
    
    /**
     * Factory method to create an engineer follower
     */
    static createEngineerFollower(scene, x, y, direction, engineerClass) {
        const follower = new Follower(scene, x, y, {
            direction: direction,
            tint: engineerClass.color,
            isEngineer: true,
            engineerClass: engineerClass
        });
        
        return follower;
    }
} 