// Entity Component System for Snake Survivors
// This system allows for more modular game object management

import { TILE_SIZE } from '../constants.js';

// Entity - just an ID with associated components
class Entity {
    constructor(id) {
        this.id = id;
        this.components = new Map();
        this.tags = new Set();
        this.manager = null; // Reference to the entity manager
    }

    // Add a component to this entity
    addComponent(component) {
        this.components.set(component.constructor.name, component);
        component.entity = this;
        return this;
    }

    // Remove a component by type
    removeComponent(componentType) {
        const name = typeof componentType === 'string' ? componentType : componentType.name;
        if (this.components.has(name)) {
            const component = this.components.get(name);
            component.entity = null;
            this.components.delete(name);
        }
        return this;
    }

    // Get a component by type
    getComponent(componentType) {
        const name = typeof componentType === 'string' ? componentType : componentType.name;
        return this.components.get(name);
    }

    // Check if entity has a component
    hasComponent(componentType) {
        const name = typeof componentType === 'string' ? componentType : componentType.name;
        return this.components.has(name);
    }

    // Add a tag to this entity
    addTag(tag) {
        this.tags.add(tag);
        // Update the entity manager's tag tracker if available
        if (this.manager) {
            this.manager.addEntityToTag(this, tag);
        }
        return this;
    }

    // Remove a tag
    removeTag(tag) {
        this.tags.delete(tag);
        // Update the entity manager's tag tracker if available
        if (this.manager) {
            this.manager.removeEntityFromTag(this, tag);
        }
        return this;
    }

    // Check if entity has a tag
    hasTag(tag) {
        return this.tags.has(tag);
    }
}

// Component - just data, no behavior
class Component {
    constructor() {
        this.entity = null;
    }
}

// Position Component
class PositionComponent extends Component {
    constructor(x, y) {
        super();
        this.x = x;
        this.y = y;
    }
}

// Sprite Component
class SpriteComponent extends Component {
    constructor(sprite) {
        super();
        this.sprite = sprite;
    }
}

// Health Component
class HealthComponent extends Component {
    constructor(health, maxHealth) {
        super();
        this.health = health;
        this.maxHealth = maxHealth;
        this.healthBar = null;
    }
}

// Movement Component
class MovementComponent extends Component {
    constructor(speed, direction) {
        super();
        this.speed = speed;
        this.direction = direction;
        this.nextDirection = direction;
    }
}

// Combat Component
class CombatComponent extends Component {
    constructor(damage, attackSpeed) {
        super();
        this.damage = damage;
        this.attackSpeed = attackSpeed;
        this.attackCooldown = 0;
    }
}

// AI Component
class AIComponent extends Component {
    constructor(type) {
        super();
        this.type = type; // 'follow', 'wander', etc.
        this.target = null;
    }
}

// Special Ability Component
class SpecialAbilityComponent extends Component {
    constructor(abilityFunction, cooldownMax) {
        super();
        this.abilityFunction = abilityFunction;
        this.cooldownMax = cooldownMax;
        this.cooldown = 0;
    }
}

// Experience Component
class ExperienceComponent extends Component {
    constructor(level = 1, experience = 0, nextLevelExp = 100) {
        super();
        this.level = level;
        this.experience = experience;
        this.nextLevelExp = nextLevelExp;
    }
}

// Entity Manager - handles creation and tracking of entities
class EntityManager {
    constructor() {
        this.entities = new Map();
        this.nextEntityId = 0;
        this.entityTags = new Map(); // Map of tag -> Set of entities
    }

    // Create a new entity
    createEntity() {
        const id = `entity_${this.nextEntityId++}`;
        const entity = new Entity(id);
        entity.manager = this; // Set reference to this manager
        this.entities.set(id, entity);
        return entity;
    }

    // Remove an entity by id
    removeEntity(entityId) {
        const entity = this.getEntity(entityId);
        if (entity) {
            // Remove from tag groups
            entity.tags.forEach(tag => {
                this.removeEntityFromTag(entity, tag);
            });
            
            // Clean up components
            entity.components.forEach(component => {
                component.entity = null;
            });
            
            // Remove the entity
            entity.manager = null;
            this.entities.delete(entityId);
        }
    }

    // Get an entity by id
    getEntity(entityId) {
        return this.entities.get(entityId);
    }

    // Get all entities with a specific tag
    getEntitiesWithTag(tag) {
        if (!this.entityTags.has(tag)) {
            this.entityTags.set(tag, new Set());
        }
        return Array.from(this.entityTags.get(tag));
    }

    // Get all entities with a specific component
    getEntitiesWithComponent(componentType) {
        const name = typeof componentType === 'string' ? componentType : componentType.name;
        return Array.from(this.entities.values()).filter(entity => entity.hasComponent(name));
    }

    // Add entity to tag group
    addEntityToTag(entity, tag) {
        if (!this.entityTags.has(tag)) {
            this.entityTags.set(tag, new Set());
        }
        this.entityTags.get(tag).add(entity);
    }

    // Remove entity from tag group
    removeEntityFromTag(entity, tag) {
        if (this.entityTags.has(tag)) {
            this.entityTags.get(tag).delete(entity);
        }
    }

    // Update all systems
    update(delta) {
        // Typically, systems are updated here, but in our case each system manages its own update
    }
}

// Base System class
class System {
    constructor(entityManager) {
        this.entityManager = entityManager;
    }

    update(delta) {} // Override in child classes
}

// Movement System
class MovementSystem extends System {
    update(delta) {
        // Get all entities with position and movement components
        const entities = this.entityManager.getEntitiesWithComponent('PositionComponent')
            .filter(entity => entity.hasComponent('MovementComponent') && entity.hasComponent('SpriteComponent'));
        
        // Update position of each entity
        entities.forEach(entity => {
            const position = entity.getComponent('PositionComponent');
            const movement = entity.getComponent('MovementComponent');
            const sprite = entity.getComponent('SpriteComponent').sprite;
            
            if (!sprite || !sprite.active) return;
            
            // Apply movement based on direction
            let dx = 0;
            let dy = 0;
            
            switch (movement.direction) {
                case 'up':
                    dy = -movement.speed;
                    break;
                case 'down':
                    dy = movement.speed;
                    break;
                case 'left':
                    dx = -movement.speed;
                    break;
                case 'right':
                    dx = movement.speed;
                    break;
            }
            
            // Update position
            position.x += dx * (delta / 1000);
            position.y += dy * (delta / 1000);
            
            // Update sprite position
            sprite.setPosition(position.x, position.y);
        });
    }
}

// Health System
class HealthSystem extends System {
    update(delta) {
        // Get all entities with health components
        const entities = this.entityManager.getEntitiesWithComponent('HealthComponent')
            .filter(entity => entity.hasComponent('SpriteComponent'));
        
        // Update each entity
        entities.forEach(entity => {
            const health = entity.getComponent('HealthComponent');
            const sprite = entity.getComponent('SpriteComponent').sprite;
            
            if (!sprite || !sprite.active) return;
            
            // Check for death
            if (health.health <= 0) {
                // Handle death
                if (entity.hasTag('player')) {
                    // Player death logic
                    // This would be handled elsewhere, likely in the Game Scene
                } else {
                    // Remove the entity if it's not the player
                    this.entityManager.removeEntity(entity.id);
                }
            }
            
            // Update health bar if it exists
            if (health.healthBar) {
                this.updateHealthBar(health, sprite);
            }
        });
    }
    
    // Helper to update health bar graphics
    updateHealthBar(health, sprite) {
        const bar = health.healthBar;
        bar.clear();
        
        // Background
        bar.fillStyle(0x000000, 0.7);
        bar.fillRect(sprite.x - 15, sprite.y - 20, 30, 5);
        
        // Health percentage
        const percentage = Math.max(0, health.health) / health.maxHealth;
        bar.fillStyle(0x00FF00, 1);
        bar.fillRect(sprite.x - 15, sprite.y - 20, 30 * percentage, 5);
    }
}

// AI System
class AISystem extends System {
    update(delta) {
        // Get all entities with AI components
        const entities = this.entityManager.getEntitiesWithComponent('AIComponent')
            .filter(entity => 
                entity.hasComponent('PositionComponent') && 
                entity.hasComponent('MovementComponent') &&
                entity.hasComponent('SpriteComponent'));
        
        // Find player entity
        const players = this.entityManager.getEntitiesWithTag('player');
        if (players.length === 0) return; // No player to target
        
        const player = players[0];
        const playerPos = player.getComponent('PositionComponent');
        
        // Update each AI entity
        entities.forEach(entity => {
            const ai = entity.getComponent('AIComponent');
            const position = entity.getComponent('PositionComponent');
            const movement = entity.getComponent('MovementComponent');
            
            // Set player as target
            ai.target = player;
            
            // Basic follow AI
            if (ai.type === 'follow' && playerPos) {
                // Calculate direction to player
                const dx = playerPos.x - position.x;
                const dy = playerPos.y - position.y;
                
                // Move in the primary direction
                if (Math.abs(dx) > Math.abs(dy)) {
                    movement.direction = dx > 0 ? 'right' : 'left';
                } else {
                    movement.direction = dy > 0 ? 'down' : 'up';
                }
            }
            // Other AI types could be implemented here
        });
    }
}

// Combat System
class CombatSystem extends System {
    update(delta) {
        // Get all entities with combat components
        const entities = this.entityManager.getEntitiesWithComponent('CombatComponent');
        
        // Update cooldowns
        entities.forEach(entity => {
            const combat = entity.getComponent('CombatComponent');
            
            if (combat.attackCooldown > 0) {
                combat.attackCooldown -= delta;
            }
        });
    }
    
    // Handle attacking another entity
    performAttack(attacker, target) {
        const attackerCombat = attacker.getComponent('CombatComponent');
        const targetHealth = target.getComponent('HealthComponent');
        
        if (!attackerCombat || !targetHealth) return false;
        
        // Check cooldown
        if (attackerCombat.attackCooldown <= 0) {
            // Apply damage
            targetHealth.health -= attackerCombat.damage;
            
            // Reset cooldown
            attackerCombat.attackCooldown = attackerCombat.attackSpeed;
            
            return true;
        }
        
        return false;
    }
}

// Export all classes
export {
    Entity,
    Component,
    PositionComponent,
    SpriteComponent,
    HealthComponent,
    MovementComponent,
    CombatComponent,
    AIComponent,
    SpecialAbilityComponent,
    ExperienceComponent,
    EntityManager,
    System,
    MovementSystem,
    HealthSystem,
    AISystem,
    CombatSystem
}; 