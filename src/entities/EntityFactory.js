/**
 * EntityFactory - Centralized factory for creating game entities
 * Single source of truth for entity creation in the game
 */
import Player from './Player.js';
import Follower from './Follower.js';
import { TILE_SIZE } from '../constants.js';
import * as VisualEffects from '../utils/VisualEffects.js';

export default class EntityFactory {
    /**
     * Create a new EntityFactory
     * @param {Phaser.Scene} scene - The scene this factory belongs to
     */
    constructor(scene) {
        this.scene = scene;
    }
    
    /**
     * Create a player character
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {object} heroClass - Hero class data
     * @returns {Player} The created player
     */
    createPlayer(x, y, heroClass) {
        // Ensure the hero class has a proper key property for texture selection
        if (!heroClass.key) {
            console.warn('Hero class missing key property, defaulting to warrior');
            heroClass.key = 'warrior';
        }
        
        console.log(`Creating player with hero class: ${heroClass.name} (${heroClass.key})`);
        
        // Create player using the Player class
        const player = new Player(this.scene, x, y, heroClass);
        
        // Return the player instance
        return player;
    }
    
    /**
     * Create a follower
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {object} engineerClass - Engineer class data (optional)
     * @returns {Follower} The created follower
     */
    createFollower(x, y, engineerClass = null) {
        const follower = new Follower(this.scene, x, y, {
            direction: this.scene.player ? this.scene.player.direction : 'right',
            tint: engineerClass ? engineerClass.color : 0xFFFFFF,
            isEngineer: !!engineerClass,
            engineerClass: engineerClass
        });
        
        return follower;
    }
    
    /**
     * Create an enemy
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} type - Enemy type
     * @returns {Phaser.GameObjects.Sprite} The created enemy
     */
    createEnemy(x, y, type = 'melee') {
        const enemy = this.scene.physics.add.sprite(x, y, 'enemy');
        
        // Set common properties
        enemy.setCollideWorldBounds(true);
        enemy.setDepth(5);
        
        // Set type-specific properties
        switch (type) {
            case 'melee':
                enemy.setTint(0xFF0000);
                enemy.health = 10;
                enemy.maxHealth = 10;
                enemy.speed = 80;
                enemy.damage = 1;
                enemy.enemyType = 'melee';
                break;
                
            case 'dasher':
                enemy.setTint(0xFF8800);
                enemy.health = 8;
                enemy.maxHealth = 8;
                enemy.speed = 100;
                enemy.damage = 2;
                enemy.dashCooldown = 0;
                enemy.dashCooldownMax = 3000;
                enemy.enemyType = 'dasher';
                break;
                
            case 'bomber':
                enemy.setTint(0xFFAA00);
                enemy.health = 12;
                enemy.maxHealth = 12;
                enemy.speed = 70;
                enemy.damage = 4;
                enemy.explosionRadius = TILE_SIZE * 3;
                enemy.enemyType = 'bomber';
                break;
                
            case 'shooter':
                enemy.setTint(0x00AAFF);
                enemy.health = 8;
                enemy.maxHealth = 8;
                enemy.speed = 60;
                enemy.damage = 1;
                enemy.attackRange = TILE_SIZE * 6;
                enemy.attackCooldown = 0;
                enemy.attackCooldownMax = 2000;
                enemy.enemyType = 'shooter';
                break;
                
            case 'mage':
                enemy.setTint(0xAA00FF);
                enemy.health = 15;
                enemy.maxHealth = 15;
                enemy.speed = 50;
                enemy.damage = 3;
                enemy.attackRange = TILE_SIZE * 5;
                enemy.attackCooldown = 0;
                enemy.attackCooldownMax = 3000;
                enemy.teleportCooldown = 0;
                enemy.teleportCooldownMax = 5000;
                enemy.enemyType = 'mage';
                break;
                
            case 'boss':
                enemy.setTint(0xFF00FF);
                enemy.health = 100;
                enemy.maxHealth = 100;
                enemy.speed = 40;
                enemy.damage = 4;
                enemy.setScale(2);
                enemy.enemyType = 'boss';
                enemy.stage = 1; // Used to track boss stages (100%, 50%, 25%)
                break;
        }
        
        // Add damage method
        enemy.damage = function(amount) {
            this.health -= amount;
            
            // Flash red on damage using VisualEffects utility
            VisualEffects.createEntityFlashEffect(this.scene, this, 0.7, 100, 1);
            
            // Create hit effect using VisualEffects utility
            VisualEffects.createDamageParticles(this.scene, this.x, this.y, 0xFFFFFF, 5);
            
            // Die if health is depleted
            if (this.health <= 0) {
                this.die();
            }
        };
        
        // Add die method
        enemy.die = function() {
            // Death animation and particles using VisualEffects utility
            VisualEffects.createDeathEffect(this.scene, this.x, this.y, this.tintTopLeft, 15);
            
            // Play sound
            if (this.scene.audioManager) {
                this.scene.audioManager.playSFX('enemy_death');
            }
            
            // Award experience to player
            if (this.scene.player) {
                const expAmount = this.enemyType === 'boss' ? 50 : 10;
                this.scene.addExperience(expAmount);
            }
            
            // Spawn rewards
            if (Math.random() < 0.2) { // 20% chance
                this.scene.spawnSystem.spawnPickup(this.x, this.y);
            }
            
            // Destroy the enemy
            this.destroy();
        };
        
        // Return the created enemy
        return enemy;
    }
} 