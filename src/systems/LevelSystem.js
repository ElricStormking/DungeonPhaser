import { GAME_WIDTH, GAME_HEIGHT, UI_PADDING } from '../constants.js';

/**
 * Handles player progression, experience, and level-ups
 */
export default class LevelSystem {
    constructor(scene) {
        this.scene = scene;
        
        // Level properties
        this.currentLevel = 1;
        this.experience = 0;
        this.experienceToNextLevel = 100;
        
        // UI elements
        this.levelText = null;
        this.experienceBar = null;
    }
    
    /**
     * Initialize the level UI
     */
    createUI() {
        const style = { 
            fontSize: '20px', 
            fontFamily: 'Arial', 
            fill: '#fff',
            stroke: '#000000',
            strokeThickness: 3
        };
        const depth = 101; // Slightly higher than UI background
        
        // Level Text - center of UI bar
        this.levelText = this.scene.add.text(
            GAME_WIDTH / 2 + 200, // Move 200 pixels to the right
            UI_PADDING + 10, 
            'Level: 1', 
            style
        )
            .setOrigin(0.5, 0)
            .setDepth(depth)
            .setScrollFactor(0); // Fixed to camera
        
        // Experience Bar Background - below the UI panel
        this.scene.add.rectangle(
            GAME_WIDTH / 2 + 200, // Move to match level text
            80, 
            GAME_WIDTH - 40, 
            12, 
            0x333333
        )
            .setDepth(depth)
            .setScrollFactor(0);
        
        // Experience Bar Fill
        this.experienceBar = this.scene.add.rectangle(
            20 + 200, // Adjust starting position
            80, 
            0, 
            8, 
            0x00ff00
        )
            .setOrigin(0, 0.5) 
            .setDepth(depth + 1)
            .setScrollFactor(0);
    }
    
    /**
     * Add experience points
     * @param {number} amount - Amount of experience to add
     */
    addExperience(amount) {
        if (this.scene.gameOver) return;
        
        this.experience += amount;
        this.updateExperienceBar();
        
        if (this.experience >= this.experienceToNextLevel) {
            this.levelUp();
        }
    }
    
    /**
     * Update the experience bar UI
     */
    updateExperienceBar() {
        const expRatio = Math.min(1, this.experience / this.experienceToNextLevel);
        
        // Animate bar fill
        this.scene.tweens.add({
            targets: this.experienceBar,
            width: (GAME_WIDTH - 40) * expRatio,
            duration: 200,
            ease: 'Linear'
        });
    }
    
    /**
     * Handle level up
     */
    levelUp() {
        this.currentLevel++;
        this.levelText.setText('Level: ' + this.currentLevel);
        
        // Carry over excess XP
        this.experience = this.experience - this.experienceToNextLevel;
        
        // Increase XP needed for next level
        this.experienceToNextLevel = Math.floor(this.experienceToNextLevel * 1.2);
        
        // Update bar with new ratio
        this.updateExperienceBar();
        
        // Apply level-up rewards
        this.applyLevelUpRewards();
        
        // Play level up sound
        if (this.scene.audioManager) {
            this.scene.audioManager.playLevelUpSound();
        }
        
        // Level Up text effect
        const levelUpText = this.scene.add.text(
            GAME_WIDTH / 2, 
            GAME_HEIGHT / 2, 
            'LEVEL UP!', 
            { 
                fontSize: '48px', 
                fontFamily: 'Arial', 
                fill: '#FFFF00', 
                stroke: '#000000', 
                strokeThickness: 6 
            }
        ).setOrigin(0.5).setDepth(15).setScrollFactor(0);
        
        this.scene.tweens.add({
            targets: levelUpText,
            alpha: 0,
            y: levelUpText.y - 50,
            duration: 1500,
            onComplete: () => levelUpText.destroy()
        });
    }
    
    /**
     * Apply rewards for leveling up
     */
    applyLevelUpRewards() {
        // Increase snake movement speed
        if (this.scene.movementSystem) {
            this.scene.movementSystem.increaseSpeed(5);
        }
        
        // Reduce special attack cooldown
        if (this.scene.player) {
            this.scene.player.specialAttackCooldownMax = Math.max(
                1000, 
                this.scene.player.specialAttackCooldownMax - 100
            );
        }
        
        // Increase enemy spawn rate
        if (this.scene.spawnSystem) {
            this.scene.spawnSystem.adjustEnemySpawnRate(this.currentLevel);
        }
        
        // Heal player slightly
        if (this.scene.player) {
            const healAmount = Math.ceil(this.scene.player.maxHealth * 0.1); // 10% heal
            this.scene.player.health = Math.min(
                this.scene.player.maxHealth, 
                this.scene.player.health + healAmount
            );
        }
    }
    
    /**
     * Reset the level system
     */
    reset() {
        this.currentLevel = 1;
        this.experience = 0;
        this.experienceToNextLevel = 100;
        
        if (this.levelText) {
            this.levelText.setText('Level: 1');
        }
        
        if (this.experienceBar) {
            this.experienceBar.width = 0;
        }
    }
} 