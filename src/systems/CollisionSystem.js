// Collision System for Snake Survivors
// Handles all collision detection and resolution between game entities

import { System } from './ECS.js';

export default class CollisionSystem extends System {
    constructor(entityManager, scene) {
        super(entityManager);
        this.scene = scene;
        this.collisionHandlers = new Map();
        
        // Set up default collision handlers
        this.setupDefaultHandlers();
    }
    
    // Register a collision handler for specific entity types
    registerCollisionHandler(tag1, tag2, handler) {
        const key = this.getCollisionKey(tag1, tag2);
        this.collisionHandlers.set(key, handler);
    }
    
    // Get unique key for collision pair
    getCollisionKey(tag1, tag2) {
        // Sort tags to ensure consistent key regardless of order
        const tags = [tag1, tag2].sort();
        return `${tags[0]}_${tags[1]}`;
    }
    
    // Set up default collision handlers
    setupDefaultHandlers() {
        // Player - Enemy collision
        this.registerCollisionHandler('player', 'enemy', (playerEntity, enemyEntity) => {
            const enemySprite = enemyEntity.getComponent('SpriteComponent').sprite;
            
            // Check if this enemy has already dealt damage recently
            if (!enemySprite.hasDealtDamage) {
                const playerHealth = playerEntity.getComponent('HealthComponent');
                const enemyCombat = enemyEntity.getComponent('CombatComponent');
                
                // Deal damage to player
                playerHealth.health -= enemyCombat ? enemyCombat.damage : 1;
                
                // Set flag to prevent rapid damage
                enemySprite.hasDealtDamage = true;
                
                // Reset the flag after a delay
                this.scene.time.delayedCall(500, () => {
                    if (enemySprite.active) {
                        enemySprite.hasDealtDamage = false;
                    }
                });
                
                // Visual feedback
                playerEntity.getComponent('SpriteComponent').sprite.setTint(0xFF0000);
                this.scene.time.delayedCall(100, () => {
                    if (playerEntity.getComponent('SpriteComponent').sprite.active) {
                        playerEntity.getComponent('SpriteComponent').sprite.clearTint();
                    }
                });
                
                return true; // Collision handled
            }
            
            return false; // No collision action taken
        });
        
        // Player - Pickup collision
        this.registerCollisionHandler('player', 'pickup', (playerEntity, pickupEntity) => {
            const pickupSprite = pickupEntity.getComponent('SpriteComponent').sprite;
            
            // Different effects based on pickup tags
            if (pickupEntity.hasTag('health')) {
                // Heal player
                const playerHealth = playerEntity.getComponent('HealthComponent');
                playerHealth.health = Math.min(playerHealth.health + 10, playerHealth.maxHealth);
            } 
            else if (pickupEntity.hasTag('experience')) {
                // Add experience
                const playerExp = playerEntity.getComponent('ExperienceComponent');
                if (playerExp) {
                    playerExp.experience += 20;
                    
                    // Check for level up
                    if (playerExp.experience >= playerExp.nextLevelExp) {
                        this.handleLevelUp(playerEntity);
                    }
                }
            }
            else if (pickupEntity.hasTag('power')) {
                // Temporary power boost
                const playerCombat = playerEntity.getComponent('CombatComponent');
                if (playerCombat) {
                    const originalDamage = playerCombat.damage;
                    playerCombat.damage *= 2;
                    
                    // Reset after 10 seconds
                    this.scene.time.delayedCall(10000, () => {
                        if (playerCombat.entity) {
                            playerCombat.damage = originalDamage;
                        }
                    });
                }
            }
            
            // Create pickup effect
            this.createPickupEffect(pickupSprite.x, pickupSprite.y);
            
            // Remove the pickup entity
            this.entityManager.removeEntity(pickupEntity.id);
            
            return true; // Collision handled
        });
        
        // Projectile - Enemy collision
        this.registerCollisionHandler('projectile', 'enemy', (projectileEntity, enemyEntity) => {
            // Ensure projectile is from player, not another enemy
            if (!projectileEntity.hasTag('player')) return false;
            
            const enemyHealth = enemyEntity.getComponent('HealthComponent');
            const projectileCombat = projectileEntity.getComponent('CombatComponent');
            
            // Deal damage to enemy
            if (enemyHealth && projectileCombat) {
                enemyHealth.health -= projectileCombat.damage;
                
                // Create hit effect
                const projectileSprite = projectileEntity.getComponent('SpriteComponent').sprite;
                this.createHitEffect(projectileSprite.x, projectileSprite.y);
                
                // Check if enemy died
                if (enemyHealth.health <= 0) {
                    // Find player to give experience
                    const players = this.entityManager.getEntitiesWithTag('player');
                    if (players.length > 0) {
                        const player = players[0];
                        const playerExp = player.getComponent('ExperienceComponent');
                        
                        if (playerExp) {
                            // Add experience based on enemy type
                            let expAmount = 10;
                            if (enemyEntity.hasTag('tank')) expAmount = 20;
                            if (enemyEntity.hasTag('boss')) expAmount = 50;
                            
                            playerExp.experience += expAmount;
                            
                            // Check for level up
                            if (playerExp.experience >= playerExp.nextLevelExp) {
                                this.handleLevelUp(player);
                            }
                        }
                    }
                    
                    // Create death effect
                    const enemySprite = enemyEntity.getComponent('SpriteComponent').sprite;
                    this.createDeathEffect(enemySprite.x, enemySprite.y);
                    
                    // Remove the enemy entity
                    this.entityManager.removeEntity(enemyEntity.id);
                    
                    // Random chance to spawn pickup
                    if (Math.random() < 0.2) {
                        this.scene.events.emit('spawnPickup', enemySprite.x, enemySprite.y);
                    }
                }
            }
            
            // Remove the projectile (unless it's a penetrating type)
            if (!projectileEntity.hasTag('penetrating')) {
                this.entityManager.removeEntity(projectileEntity.id);
            }
            
            return true; // Collision handled
        });
    }
    
    // Handle level up logic
    handleLevelUp(playerEntity) {
        const playerExp = playerEntity.getComponent('ExperienceComponent');
        
        // Increase level
        playerExp.level++;
        
        // Reset experience and increase next level requirement
        playerExp.experience = 0;
        playerExp.nextLevelExp = Math.floor(playerExp.nextLevelExp * 1.2);
        
        // Increase player stats
        const playerHealth = playerEntity.getComponent('HealthComponent');
        if (playerHealth) {
            playerHealth.maxHealth += 5;
            playerHealth.health = playerHealth.maxHealth; // Full heal on level up
        }
        
        const playerCombat = playerEntity.getComponent('CombatComponent');
        if (playerCombat) {
            playerCombat.damage += 0.5;
        }
        
        const playerMovement = playerEntity.getComponent('MovementComponent');
        if (playerMovement) {
            // Cap speed increase to avoid moving too fast
            playerMovement.speed = Math.min(playerMovement.speed + 10, 300);
        }
        
        // Create level up effect
        const playerSprite = playerEntity.getComponent('SpriteComponent').sprite;
        if (playerSprite) {
            // Flash player
            this.scene.tweens.add({
                targets: playerSprite,
                alpha: 0.7,
                duration: 100,
                yoyo: true,
                repeat: 5
            });
            
            // Create particles
            const particles = this.scene.add.particles('particle');
            const emitter = particles.createEmitter({
                x: playerSprite.x,
                y: playerSprite.y,
                speed: { min: 50, max: 100 },
                scale: { start: 1, end: 0 },
                lifespan: 1000,
                blendMode: 'ADD',
                tint: 0xFFFF00
            });
            
            // Follow player briefly, then destroy
            this.scene.time.delayedCall(1000, () => {
                emitter.stop();
                this.scene.time.delayedCall(500, () => {
                    particles.destroy();
                });
            });
        }
        
        // Trigger level up event for other systems
        this.scene.events.emit('playerLevelUp', playerExp.level);
        
        // Log level up
        console.log(`Player leveled up to ${playerExp.level}!`);
    }
    
    // Create a pickup effect at the given position
    createPickupEffect(x, y) {
        // Create particles
        const particles = this.scene.add.particles('particle');
        const emitter = particles.createEmitter({
            x: x,
            y: y,
            speed: { min: 30, max: 60 },
            scale: { start: 0.5, end: 0 },
            lifespan: 500,
            blendMode: 'ADD',
            tint: 0x00FFFF
        });
        
        // Play pickup sound
        this.scene.sound.play('pickup', { volume: 0.5 });
        
        // Stop emitter after a brief period
        this.scene.time.delayedCall(200, () => {
            emitter.stop();
            this.scene.time.delayedCall(500, () => {
                particles.destroy();
            });
        });
    }
    
    // Create a hit effect at the given position
    createHitEffect(x, y) {
        // Create particles
        const particles = this.scene.add.particles('particle');
        const emitter = particles.createEmitter({
            x: x,
            y: y,
            speed: { min: 20, max: 40 },
            scale: { start: 0.3, end: 0 },
            lifespan: 300,
            quantity: 5,
            blendMode: 'ADD',
            tint: 0xFFFFFF
        });
        
        // Stop emitter immediately (one burst)
        emitter.explode();
        
        // Clean up after particles are done
        this.scene.time.delayedCall(300, () => {
            particles.destroy();
        });
    }
    
    // Create a death effect at the given position
    createDeathEffect(x, y) {
        // Create particles
        const particles = this.scene.add.particles('particle');
        const emitter = particles.createEmitter({
            x: x,
            y: y,
            speed: { min: 50, max: 100 },
            scale: { start: 0.5, end: 0 },
            lifespan: 800,
            quantity: 20,
            blendMode: 'ADD',
            tint: 0xFF0000
        });
        
        // Stop emitter immediately (one burst)
        emitter.explode();
        
        // Clean up after particles are done
        this.scene.time.delayedCall(800, () => {
            particles.destroy();
        });
    }
    
    // Update method called by the game scene
    update(delta) {
        // Get all entities with physics bodies
        const entities = Array.from(this.entityManager.entities.values())
            .filter(entity => 
                entity.hasComponent('SpriteComponent') && 
                entity.getComponent('SpriteComponent').sprite
            );
        
        // Group entities by tag for efficient collision checking
        const tagGroups = new Map();
        
        entities.forEach(entity => {
            entity.tags.forEach(tag => {
                if (!tagGroups.has(tag)) {
                    tagGroups.set(tag, []);
                }
                tagGroups.get(tag).push(entity);
            });
        });
        
        // Check registered collision pairs
        this.collisionHandlers.forEach((handler, key) => {
            const [tag1, tag2] = key.split('_');
            
            if (tagGroups.has(tag1) && tagGroups.has(tag2)) {
                const group1 = tagGroups.get(tag1);
                const group2 = tagGroups.get(tag2);
                
                // Check each entity in group1 against each in group2
                group1.forEach(entity1 => {
                    const sprite1 = entity1.getComponent('SpriteComponent').sprite;
                    
                    group2.forEach(entity2 => {
                        // Skip if same entity (could happen if an entity has both tags)
                        if (entity1.id === entity2.id) return;
                        
                        const sprite2 = entity2.getComponent('SpriteComponent').sprite;
                        
                        // Check for collision
                        if (this.checkCollision(sprite1, sprite2)) {
                            // Apply handler (tag1 is always first parameter due to sorting in getCollisionKey)
                            if (tag1 === entity1.tags.values().next().value) {
                                handler(entity1, entity2);
                            } else {
                                handler(entity2, entity1);
                            }
                        }
                    });
                });
            }
        });
    }
    
    // Simple collision check between two sprites
    checkCollision(sprite1, sprite2) {
        // Skip if either sprite is not active
        if (!sprite1.active || !sprite2.active) return false;
        
        // Get sprite bounds
        const bounds1 = sprite1.getBounds();
        const bounds2 = sprite2.getBounds();
        
        // Check for overlap
        return Phaser.Geom.Rectangle.Overlaps(bounds1, bounds2);
    }
} 