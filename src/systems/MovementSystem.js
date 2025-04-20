import { TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT } from '../constants.js';

/**
 * Handles snake movement, direction changes, and follower positioning
 */
export default class MovementSystem {
    constructor(scene) {
        this.scene = scene;
        
        // Movement properties
        this.direction = 'right';
        this.nextDirection = 'right';
        this.moveTimer = 0;
        this.moveDelay = 150;
        this.effectiveMoveDelay = 150;
        this.lastEffectiveDelay = 150;
        this.collisionCooldown = false;
        this.boundaryCollisionCooldown = false;
        
        // Smooth movement properties
        this.isMoving = false;
        this.moveProgress = 1.0; // Start at 1.0 (completed)
        this.targetPositions = []; // Array to hold target positions for each entity
        this.startPositions = []; // Array to hold starting positions for each entity
        this.moveDuration = 150; // Milliseconds for move animation
    }
    
    /**
     * Update movement and follow behavior
     * @param {number} time - Current game time
     * @param {number} delta - Delta time in ms
     */
    update(time, delta) {
        if (this.scene.gameOver) return;
        
        // Calculate move delay based on player speed
        if (this.scene.player) {
            // Get the player's current terrain slowFactor (1.0 is normal/no slowdown)
            const terrainEffect = this.scene.terrainSystem?.getTerrainAt(this.scene.player.x, this.scene.player.y);
            const slowFactor = terrainEffect?.slowFactor || 1.0;
            
            // Only adjust delay if the player is on slowing terrain
            if (slowFactor < 1.0) {
                this.effectiveMoveDelay = this.moveDelay / slowFactor;
                
                // For debugging
                if (this.lastEffectiveDelay !== this.effectiveMoveDelay) {
                    this.lastEffectiveDelay = this.effectiveMoveDelay;
                    console.log(`Move delay adjusted: ${this.effectiveMoveDelay.toFixed(2)} (slowFactor: ${slowFactor})`);
                }
            } else {
                // Reset to normal speed on normal terrain
                this.effectiveMoveDelay = this.moveDelay;
                
                // For debugging
                if (this.lastEffectiveDelay !== this.effectiveMoveDelay) {
                    this.lastEffectiveDelay = this.effectiveMoveDelay;
                    console.log(`Move delay reset to normal: ${this.moveDelay}`);
                }
            }
        }
        
        // If we're in the middle of a smooth movement, update the lerping
        if (this.isMoving) {
            this.updateSmoothMovement(delta);
        }
        // Only start a new movement when the current one is complete
        else if (time > this.moveTimer) {
            this.moveSnake();
            this.moveTimer = time + (this.effectiveMoveDelay || this.moveDelay);
        }
    }
    
    /**
     * Update smooth movement lerping between grid positions
     * @param {number} delta - Delta time in ms
     */
    updateSmoothMovement(delta) {
        // Update movement progress
        this.moveProgress += delta / this.moveDuration;
        
        // Cap progress at 1.0
        if (this.moveProgress >= 1.0) {
            this.moveProgress = 1.0;
            this.isMoving = false;
            
            // Apply final positions and directions
            const player = this.scene.player;
            if (player) {
                player.x = this.targetPositions[0].x;
                player.y = this.targetPositions[0].y;
                player.direction = this.direction;
            }
            
            for (let i = 0; i < this.scene.followers.length; i++) {
                const follower = this.scene.followers[i];
                if (follower && follower.active && this.targetPositions[i + 1]) {
                    follower.x = this.targetPositions[i + 1].x;
                    follower.y = this.targetPositions[i + 1].y;
                    follower.direction = this.targetPositions[i + 1].dir;
                }
            }
            
            // Apply queued direction change once movement is complete
            this.direction = this.nextDirection;
            return;
        }
        
        // Apply interpolated positions
        const player = this.scene.player;
        if (player) {
            player.x = Phaser.Math.Linear(
                this.startPositions[0].x,
                this.targetPositions[0].x,
                this.moveProgress
            );
            player.y = Phaser.Math.Linear(
                this.startPositions[0].y,
                this.targetPositions[0].y,
                this.moveProgress
            );
        }
        
        // Update follower positions with interpolation
        for (let i = 0; i < this.scene.followers.length; i++) {
            const follower = this.scene.followers[i];
            if (follower && follower.active && 
                this.startPositions[i + 1] && this.targetPositions[i + 1]) {
                
                follower.x = Phaser.Math.Linear(
                    this.startPositions[i + 1].x,
                    this.targetPositions[i + 1].x,
                    this.moveProgress
                );
                follower.y = Phaser.Math.Linear(
                    this.startPositions[i + 1].y,
                    this.targetPositions[i + 1].y,
                    this.moveProgress
                );
            }
        }
    }
    
    /**
     * Handle input for direction changes
     * @param {object} cursorKeys - Input cursors
     */
    handleInput(cursorKeys) {
        let dx = 0;
        let dy = 0;
        
        // Access the wasd keys from the scene if available
        const wasd = this.scene.wasd;
        
        // Determine input direction using both cursor keys and WASD
        if (cursorKeys.left.isDown || (wasd && wasd.left.isDown)) dx = -1;
        else if (cursorKeys.right.isDown || (wasd && wasd.right.isDown)) dx = 1;
        if (cursorKeys.up.isDown || (wasd && wasd.up.isDown)) dy = -1;
        else if (cursorKeys.down.isDown || (wasd && wasd.down.isDown)) dy = 1;
        
        // Update nextDirection based on input, preventing reversal
        if (dx < 0 && this.direction !== 'right') this.nextDirection = 'left';
        else if (dx > 0 && this.direction !== 'left') this.nextDirection = 'right';
        else if (dy < 0 && this.direction !== 'down') this.nextDirection = 'up';
        else if (dy > 0 && this.direction !== 'up') this.nextDirection = 'down';
    }
    
    /**
     * Move the snake (player and followers)
     */
    moveSnake() {
        const player = this.scene.player;
        if (!player) return;
        
        // Don't start new movement if we're already moving
        if (this.isMoving) return;
        
        // Create positions array from current positions
        this.startPositions = [];
        this.startPositions.push({ x: player.x, y: player.y, dir: this.direction });
        
        // Create clean array of active followers
        const validFollowers = [];
        for (let i = 0; i < this.scene.followers.length; i++) {
            const follower = this.scene.followers[i];
            if (follower && follower.active) {
                this.startPositions.push({ 
                    x: follower.x, 
                    y: follower.y, 
                    dir: follower.direction 
                });
                validFollowers.push(follower);
            }
        }
        
        // Update followers array with only active sprites
        this.scene.followers = validFollowers;
        
        // Calculate new player position
        let newX = player.x;
        let newY = player.y;
        
        switch (this.direction) {
            case 'left': newX -= TILE_SIZE; break;
            case 'right': newX += TILE_SIZE; break;
            case 'up': newY -= TILE_SIZE; break;
            case 'down': newY += TILE_SIZE; break;
        }
        
        const halfTile = TILE_SIZE / 2;
        
        // Check if the player would be outside the boundaries
        const wouldBeOutsideBoundary = 
            newX < halfTile || 
            newX > WORLD_WIDTH - halfTile || 
            newY < halfTile || 
            newY > WORLD_HEIGHT - halfTile;
        
        // Apply damage if hitting world boundary
        if (wouldBeOutsideBoundary && !this.boundaryCollisionCooldown) {
            const boundaryCollisionDamage = 5;
            player.damage(boundaryCollisionDamage);
            
            // Visual feedback
            this.scene.cameras.main.shake(100, 0.01);
            this.scene.cameras.main.flash(100, 128, 0, 0);
            
            // Prevent boundary damage spam
            this.boundaryCollisionCooldown = true;
            this.scene.time.delayedCall(1000, () => {
                this.boundaryCollisionCooldown = false;
            });
            
            console.log(`Player hit boundary, taking ${boundaryCollisionDamage} damage`);
        }
        
        // Enforce world boundaries for target position
        newX = Phaser.Math.Clamp(newX, halfTile, WORLD_WIDTH - halfTile);
        newY = Phaser.Math.Clamp(newY, halfTile, WORLD_HEIGHT - halfTile);
        
        // Set up target positions for smooth movement
        this.targetPositions = [];
        this.targetPositions.push({ 
            x: newX, 
            y: newY, 
            dir: this.direction 
        });
        
        // Set target positions for followers (each follows the position ahead of it)
        for (let i = 0; i < this.startPositions.length - 1; i++) {
            this.targetPositions.push(this.startPositions[i]);
        }
        
        // Update player's direction property
        player.direction = this.direction;
        
        // Only set angle for non-sprite player (warrior uses animations)
        if (player.texture.key !== 'warrior' && !player.usesAnimations) {
            player.setAngleFromDirection();
        }
        
        // Set angles and directions for followers
        for (let i = 0; i < this.scene.followers.length; i++) {
            const follower = this.scene.followers[i];
            if (follower && follower.active) {
                follower.direction = this.targetPositions[i + 1].dir;
                
                // Only set angle for non-animated followers
                if (!follower.usesAnimations) {
                    follower.setAngleFromDirection();
                } else {
                    // For animated followers, make sure angle is reset to 0
                    follower.angle = 0;
                }
            }
        }
        
        // Check for collisions with own body
        this.checkSelfCollision();
        
        // Start smooth movement
        this.isMoving = true;
        this.moveProgress = 0.0;
        
        // Set movement duration based on delay
        this.moveDuration = this.effectiveMoveDelay || this.moveDelay;
    }
    
    /**
     * Check if player has collided with any follower
     */
    checkSelfCollision() {
        const player = this.scene.player;
        
        for (let i = 0; i < this.scene.followers.length; i++) {
            const follower = this.scene.followers[i];
            if (player.x === follower.x && player.y === follower.y) {
                // Instead of instant game over, apply damage to the player
                const followerCollisionDamage = 5;
                player.damage(followerCollisionDamage);
                
                // Apply knockback by moving player in opposite direction
                switch (this.direction) {
                    case 'left': player.x += TILE_SIZE; break;
                    case 'right': player.x -= TILE_SIZE; break;
                    case 'up': player.y += TILE_SIZE; break;
                    case 'down': player.y -= TILE_SIZE; break;
                }
                
                // Visual feedback
                this.scene.cameras.main.shake(100, 0.01);
                
                // Prevent further collisions immediately
                this.collisionCooldown = true;
                this.scene.time.delayedCall(500, () => {
                    this.collisionCooldown = false;
                });
                
                console.log(`Player collided with follower, taking ${followerCollisionDamage} damage`);
                return;
            }
        }
    }
    
    /**
     * Increase snake movement speed
     * @param {number} amount - Amount to reduce delay by
     */
    increaseSpeed(amount = 5) {
        this.moveDelay = Math.max(70, this.moveDelay - amount);
    }
    
    /**
     * Reset movement properties
     */
    reset() {
        this.direction = 'right';
        this.nextDirection = 'right';
        this.moveTimer = 0;
        this.moveDelay = 150;
        this.effectiveMoveDelay = 150;
        this.lastEffectiveDelay = 150;
        this.collisionCooldown = false;
        this.boundaryCollisionCooldown = false;
        this.isMoving = false;
        this.moveProgress = 1.0;
        this.targetPositions = [];
        this.startPositions = [];
    }
} 