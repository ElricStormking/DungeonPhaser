import Follower from './Follower.js';
import { TILE_SIZE } from '../constants.js';

/**
 * Factory class for creating follower entities
 */
export default class FollowerFactory {
    constructor(scene) {
        this.scene = scene;
    }
    
    /**
     * Create a standard follower
     * @param {Phaser.Scene} scene - The current scene
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} direction - Direction the follower is facing
     * @returns {Follower} The created follower
     */
    createFollower(scene, x, y, direction) {
        const follower = new Follower(scene, x, y, {
            direction: direction,
            tint: scene.player.tintTopLeft,
            isEngineer: false
        });
        
        return follower;
    }
    
    /**
     * Create an engineer follower with special abilities
     * @param {Phaser.Scene} scene - The current scene
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} direction - Direction the follower is facing
     * @param {object} engineerClass - Engineer class data
     * @returns {Follower} The created engineer follower
     */
    createEngineerFollower(scene, x, y, direction, engineerClass) {
        const follower = new Follower(scene, x, y, {
            direction: direction,
            tint: engineerClass.color,
            isEngineer: true,
            engineerClass: engineerClass
        });
        
        return follower;
    }
    
    /**
     * Calculate position for a new follower based on the last segment
     * @param {Phaser.GameObjects.Sprite} lastSegment - The last segment of the snake
     * @param {string} direction - The direction the last segment is facing
     * @returns {object} The position {x, y} for the new follower
     */
    calculateFollowerPosition(lastSegment, direction) {
        let x, y;
        
        switch (direction) {
            case 'left': 
                x = lastSegment.x + TILE_SIZE; 
                y = lastSegment.y; 
                break;
            case 'right': 
                x = lastSegment.x - TILE_SIZE; 
                y = lastSegment.y; 
                break;
            case 'up': 
                x = lastSegment.x; 
                y = lastSegment.y + TILE_SIZE; 
                break;
            case 'down': 
                x = lastSegment.x; 
                y = lastSegment.y - TILE_SIZE; 
                break;
            default: 
                x = lastSegment.x - TILE_SIZE; 
                y = lastSegment.y;
        }
        
        return { x, y };
    }
} 