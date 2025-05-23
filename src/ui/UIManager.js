import { GAME_WIDTH, GAME_HEIGHT, UI_PADDING, UI_FONT_FAMILY, UI_BAR_HEIGHT, UI_DEPTH, UI_FONT_SIZES, UI_COLORS } from '../constants.js';

/**
 * Manages all UI elements in the game
 */
export default class UIManager {
    constructor(scene) {
        this.scene = scene;
        
        // UI elements
        this.scoreText = null;
        this.heroText = null;
        this.specialCooldownBar = null;
        this.cooldownText = null;
        this.uiBackground = null;
        this.stageLevelText = null;
        
        // Wave info elements
        this.waveInfoText = null;
        this.waveEnemiesText = null;
        this.waveEnemiesSpawnedText = null;
        this.waveContainer = null;
        this.bossWarning = null;
        
        // Wave info state
        this.currentWave = 0;
        this.totalWaves = 0;
        this.enemiesRemaining = 0;
        this.totalEnemies = 0;
        this.bossWarningActive = false;
        this._lastKilledCount = 0;
        
        // Pause menu elements
        this.pauseMenuContainer = null;
        this.isPaused = false;
        
        // Initialize UI
        this.createUI();
    }
    
    /**
     * Create all UI elements
     */
    createUI() {
        const style = { 
            fontSize: UI_FONT_SIZES.LARGE, 
            fontFamily: UI_FONT_FAMILY, 
            fill: UI_COLORS.TEXT,
            stroke: UI_COLORS.BACKGROUND,
            strokeThickness: 4
        };
        
        // Create semi-transparent UI panel background at the top
        this.uiBackground = this.scene.add.rectangle(
            GAME_WIDTH / 2,
            UI_BAR_HEIGHT / 2,
            GAME_WIDTH,
            UI_BAR_HEIGHT,
            0x000000,
            0.7
        )
            .setScrollFactor(0)
            .setDepth(UI_DEPTH - 1);
            
        // Add a border to the UI background
        this.scene.add.rectangle(
            GAME_WIDTH / 2,
            UI_BAR_HEIGHT / 2,
            GAME_WIDTH,
            UI_BAR_HEIGHT,
            0x333333,
            1
        )
            .setScrollFactor(0)
            .setDepth(UI_DEPTH - 1)
            .setStrokeStyle(2, 0x666666);
        
        // Score Text - positioned at top-right
        this.scoreText = this.scene.add.text(
            GAME_WIDTH - UI_PADDING, 
            UI_PADDING, 
            'Score: 0', 
            style
        )
            .setDepth(UI_DEPTH)
            .setScrollFactor(0)
            .setOrigin(1, 0);
        
        // Hero Text - positioned at top-left
        this.heroText = this.scene.add.text(
            UI_PADDING, 
            UI_PADDING, 
            `${this.scene.player.heroClass.name}`, 
            style
        )
            .setDepth(UI_DEPTH)
            .setScrollFactor(0)
            .setOrigin(0, 0);
        
        // Stage & Level Text - positioned at top-left middle
        this.stageLevelText = this.scene.add.text(
            UI_PADDING + 200, 
            UI_PADDING, 
            `Stage 1 - Level 1`, 
            style
        )
            .setDepth(UI_DEPTH)
            .setScrollFactor(0)
            .setOrigin(0, 0);
        
        // Special Cooldown Bar & Text
        const cdX = GAME_WIDTH - UI_PADDING - 200; // Right side of screen
        const cdY = UI_BAR_HEIGHT - UI_PADDING;
        const cdWidth = 200;
        const cdHeight = 20;
        
        // Background
        this.scene.add.rectangle(
            cdX + cdWidth / 2, 
            cdY, 
            cdWidth, 
            cdHeight, 
            0x550000
        )
            .setDepth(UI_DEPTH)
            .setScrollFactor(0);
        
        // Fill bar
        this.specialCooldownBar = this.scene.add.rectangle(
            cdX, 
            cdY, 
            0, 
            cdHeight, 
            0xff0000
        )
            .setOrigin(0, 0.5)
            .setDepth(UI_DEPTH + 1)
            .setScrollFactor(0);
        
        // Cooldown text
        this.cooldownText = this.scene.add.text(
            cdX - UI_PADDING, 
            cdY, 
            'READY', 
            { 
                fontSize: UI_FONT_SIZES.SMALL, 
                fontFamily: UI_FONT_FAMILY, 
                fill: UI_COLORS.HEALTH, 
                stroke: UI_COLORS.BACKGROUND, 
                strokeThickness: 2 
            }
        )
            .setOrigin(1, 0.5) // Right-aligned
            .setDepth(UI_DEPTH + 1)
            .setScrollFactor(0);
        
        // Create wave info container - positioned at the center-top
        // Adjust vertical positioning to prevent overlap
        this.waveContainer = this.scene.add.container(
            GAME_WIDTH / 2 + 50, // Move to the right side of center to avoid overlap with level info
            UI_BAR_HEIGHT / 2 - 5  // Move it slightly higher
        )
            .setDepth(UI_DEPTH + 1)
            .setScrollFactor(0);
            
        // Wave info text
        this.waveInfoText = this.scene.add.text(
            0,
            -20, // Move up more to avoid overlap
            'Wave 0/0',
            { 
                fontSize: UI_FONT_SIZES.MEDIUM, 
                fontFamily: UI_FONT_FAMILY, 
                fill: '#FFFFFF', 
                stroke: '#000000', 
                strokeThickness: 3 
            }
        )
            .setOrigin(0.5, 0.5)
            .setAlpha(0.9);
            
        // Wave enemies remaining text - clarify it shows killed enemies
        this.waveEnemiesText = this.scene.add.text(
            0,
            5, // Position closer to wave info
            'Killed: 0/0',
            { 
                fontSize: UI_FONT_SIZES.SMALL, 
                fontFamily: UI_FONT_FAMILY, 
                fill: '#FF8888', // Redder color for killed count
                stroke: '#000000', 
                strokeThickness: 2 
            }
        )
            .setOrigin(0.5, 0.5)
            .setAlpha(0.9);
            
        // Total enemies in this wave text
        this.waveEnemiesSpawnedText = this.scene.add.text(
            0,
            25, // Better spacing between elements
            'Spawned: 0/0',
            { 
                fontSize: UI_FONT_SIZES.SMALL, 
                fontFamily: UI_FONT_FAMILY, 
                fill: '#AAFFAA', 
                stroke: '#000000', 
                strokeThickness: 2 
            }
        )
            .setOrigin(0.5, 0.5)
            .setAlpha(0.9);
            
        this.waveContainer.add([this.waveInfoText, this.waveEnemiesText, this.waveEnemiesSpawnedText]);
        
        // Boss warning - initially hidden
        this.bossWarning = this.scene.add.text(
            GAME_WIDTH / 2,
            GAME_HEIGHT / 3,
            'BOSS INCOMING!',
            { 
                fontSize: UI_FONT_SIZES.TITLE, 
                fontFamily: UI_FONT_FAMILY, 
                fill: '#FF0000', 
                stroke: '#000000', 
                strokeThickness: 6 
            }
        )
            .setOrigin(0.5)
            .setDepth(UI_DEPTH + 10)
            .setScrollFactor(0)
            .setAlpha(0) // Start invisible
            .setScale(0.5); // Start small
            
        // Initialize cooldown display
        this.updateCooldownDisplay();
    }
    
    /**
     * Update the special attack cooldown display
     */
    updateCooldownDisplay() {
        if (!this.specialCooldownBar || !this.cooldownText || !this.scene.player) return;
        
        const cooldownRatio = this.scene.player.specialAttackCooldown / 
                             this.scene.player.specialAttackCooldownMax;
        
        const barWidth = 200 * Math.max(0, 1 - cooldownRatio);
        this.specialCooldownBar.width = barWidth;
        
        if (this.scene.player.specialAttackCooldown <= 0) {
            this.cooldownText.setText('READY').setFill(UI_COLORS.HEALTH);
        } else {
            const seconds = Math.ceil(this.scene.player.specialAttackCooldown / 1000);
            this.cooldownText.setText(seconds + 's').setFill('#AAAAAA');
        }
    }
    
    /**
     * Update the score display
     */
    updateScore(score) {
        if (this.scoreText) {
            this.scoreText.setText('Score: ' + score);
        }
    }
    
    /**
     * Update the wave info display
     * @param {number} currentWave - Current wave number
     * @param {number} totalWaves - Total waves in level
     * @param {number} enemiesRemaining - Enemies remaining in wave
     * @param {number} totalEnemies - Total enemies in wave
     * @param {number} enemiesSpawned - Enemies spawned so far in this wave
     * @param {number} enemiesKilled - Enemies killed so far in this wave (if provided)
     */
    updateWaveInfo(currentWave, totalWaves, enemiesRemaining, totalEnemies, enemiesSpawned, enemiesKilled) {
        // Store values for reference
        this.currentWave = currentWave;
        this.totalWaves = totalWaves;
        this.enemiesRemaining = enemiesRemaining;
        this.totalEnemies = totalEnemies;
        
        // Debug log
        console.log(`[UIManager] Updating wave info - Wave: ${currentWave}/${totalWaves}, Killed: ${enemiesKilled}, Spawned: ${enemiesSpawned}, Remaining: ${enemiesRemaining}`);
        
        // Update wave number text
        if (this.waveInfoText) {
            this.waveInfoText.setText(`Wave ${currentWave}/${totalWaves}`);
        }
        
        // Update enemies killed counter
        if (this.waveEnemiesText) {
            // Always use the explicit killed count if provided
            const killed = enemiesKilled !== undefined ? enemiesKilled : 0;
            
            // Update text with new kill count
            this.waveEnemiesText.setText(`Killed: ${killed}/${totalEnemies}`);
            
            // Flash effect when kill count changes
            if (this._lastKilledCount !== killed) {
                // Make the effect more noticeable - slightly larger scale and color change
                this.waveEnemiesText.setFill('#FF0000'); // Bright red for emphasis
                
                this.scene.tweens.add({
                    targets: this.waveEnemiesText,
                    scale: 1.4, // Larger scale for better visibility
                    duration: 150,
                    yoyo: true,
                    ease: 'Bounce.Out',
                    onComplete: () => {
                        // Return to normal color after animation
                        this.waveEnemiesText.setFill('#FF8888');
                    }
                });
                
                // Store new value
                this._lastKilledCount = killed;
            }
        }
        
        // Update enemies spawned counter
        if (this.waveEnemiesSpawnedText) {
            // Use the provided spawned count
            const spawned = enemiesSpawned !== undefined ? enemiesSpawned : 0;
            this.waveEnemiesSpawnedText.setText(`Spawned: ${spawned}/${totalEnemies}`);
        }
    }
    
    /**
     * Show boss warning with animation
     */
    showBossWarning() {
        if (this.bossWarningActive) return;
        
        this.bossWarningActive = true;
        
        // Play warning sound if available
        if (this.scene.audioManager) {
            this.scene.audioManager.playSFX('boss_warning', 0.8);
        }
        
        // Flash animation for boss warning
        this.scene.tweens.add({
            targets: this.bossWarning,
            alpha: 1,
            scale: 1.2,
            duration: 1000,
            ease: 'Bounce.Out',
            onComplete: () => {
                // Pulsing animation 
                this.scene.tweens.add({
                    targets: this.bossWarning,
                    scale: 1,
                    alpha: 0.8,
                    duration: 500,
                    yoyo: true,
                    repeat: 3,
                    onComplete: () => {
                        // Fade out
                        this.scene.tweens.add({
                            targets: this.bossWarning,
                            alpha: 0,
                            scale: 0.5,
                            duration: 1000,
                            onComplete: () => {
                                this.bossWarningActive = false;
                            }
                        });
                    }
                });
            }
        });
    }
    
    /**
     * Show the new wave notification
     * @param {number} waveNumber - Wave number
     * @param {number} totalWaves - Total waves
     * @param {boolean} isBossWave - Whether this is a boss wave
     */
    showWaveNotification(waveNumber, totalWaves, isBossWave = false) {
        // Create text for wave notification
        const waveText = isBossWave ? 'BOSS WAVE!' : `WAVE ${waveNumber} / ${totalWaves}`;
        
        const notification = this.scene.add.text(
            GAME_WIDTH / 2, 
            GAME_HEIGHT / 2, 
            waveText, 
            {
                fontFamily: UI_FONT_FAMILY,
                fontSize: isBossWave ? UI_FONT_SIZES.TITLE : UI_FONT_SIZES.LARGE,
                color: isBossWave ? '#FF0000' : '#FFFFFF',
                stroke: '#000000',
                strokeThickness: isBossWave ? 6 : 4,
                align: 'center'
            }
        ).setOrigin(0.5)
         .setDepth(UI_DEPTH + 10)
         .setScrollFactor(0)
         .setAlpha(0)
         .setScale(isBossWave ? 0.5 : 0.8);
        
        // Animation for notification
        if (isBossWave) {
            // Show boss warning first
            this.showBossWarning();
            
            // Then show the boss wave notification with a delay
            this.scene.time.delayedCall(3000, () => {
                this.scene.tweens.add({
                    targets: notification,
                    alpha: 1,
                    scale: 1.2,
                    ease: 'Back.Out',
                    duration: 1000,
                    hold: 1000,
                    yoyo: true,
                    onComplete: () => {
                        notification.destroy();
                    }
                });
            });
        } else {
            // Regular wave notification
            this.scene.tweens.add({
                targets: notification,
                alpha: 1,
                scale: 1,
                ease: 'Back.Out',
                duration: 800,
                hold: 1500,
                yoyo: true,
                onComplete: () => {
                    notification.destroy();
                }
            });
        }
    }
    
    /**
     * Show wave complete notification
     */
    showWaveCompleteNotification() {
        const notification = this.scene.add.text(
            GAME_WIDTH / 2, 
            GAME_HEIGHT / 2, 
            'WAVE COMPLETE!', 
            {
                fontFamily: UI_FONT_FAMILY,
                fontSize: UI_FONT_SIZES.LARGE,
                color: '#00FF00',
                stroke: '#000000',
                strokeThickness: 4,
                align: 'center'
            }
        ).setOrigin(0.5)
         .setDepth(UI_DEPTH + 10)
         .setScrollFactor(0)
         .setAlpha(0)
         .setScale(0.8);
        
        // Animation for wave complete
        this.scene.tweens.add({
            targets: notification,
            alpha: 1,
            scale: 1,
            ease: 'Back.Out',
            duration: 800,
            hold: 1500,
            yoyo: true,
            onComplete: () => {
                notification.destroy();
            }
        });
    }
    
    /**
     * Show the game over screen
     */
    showGameOverScreen() {
        const scene = this.scene;
        const score = scene.score;
        const level = scene.levelSystem.currentLevel;
        
        // Dim background
        scene.add.rectangle(
            GAME_WIDTH / 2, 
            GAME_HEIGHT / 2, 
            GAME_WIDTH, 
            GAME_HEIGHT, 
            0x000000, 
            0.7
        ).setDepth(UI_DEPTH + 10).setScrollFactor(0);
        
        // Game Over text
        scene.add.text(
            GAME_WIDTH / 2, 
            GAME_HEIGHT / 2 - 100, 
            'GAME OVER', 
            { 
                fontSize: UI_FONT_SIZES.TITLE, 
                fontFamily: UI_FONT_FAMILY, 
                fill: UI_COLORS.COOLDOWN, 
                stroke: UI_COLORS.TEXT, 
                strokeThickness: 4 
            }
        ).setOrigin(0.5).setDepth(UI_DEPTH + 11).setScrollFactor(0);
        
        // Score display
        scene.add.text(
            GAME_WIDTH / 2, 
            GAME_HEIGHT / 2, 
            `Score: ${score}`, 
            { 
                fontSize: UI_FONT_SIZES.LARGE, 
                fontFamily: UI_FONT_FAMILY, 
                fill: UI_COLORS.TEXT 
            }
        ).setOrigin(0.5).setDepth(UI_DEPTH + 11).setScrollFactor(0);
        
        // Level display
        scene.add.text(
            GAME_WIDTH / 2, 
            GAME_HEIGHT / 2 + 50, 
            `Level: ${level}`, 
            { 
                fontSize: UI_FONT_SIZES.MEDIUM, 
                fontFamily: UI_FONT_FAMILY, 
                fill: UI_COLORS.TEXT 
            }
        ).setOrigin(0.5).setDepth(UI_DEPTH + 11).setScrollFactor(0);
        
        // Restart button
        const restartButton = scene.add.rectangle(
            GAME_WIDTH / 2, 
            GAME_HEIGHT / 2 + 120, 
            200, 
            50, 
            0x666666
        ).setInteractive({ useHandCursor: true }).setDepth(UI_DEPTH + 11).setScrollFactor(0);
        
        const restartText = scene.add.text(
            GAME_WIDTH / 2, 
            GAME_HEIGHT / 2 + 120, 
            'Restart', 
            { 
                fontSize: UI_FONT_SIZES.MEDIUM, 
                fontFamily: UI_FONT_FAMILY, 
                fill: UI_COLORS.TEXT 
            }
        ).setOrigin(0.5).setDepth(UI_DEPTH + 11).setScrollFactor(0);
        
        // Button interactions
        restartButton.on('pointerover', () => restartButton.fillColor = 0x888888);
        restartButton.on('pointerout', () => restartButton.fillColor = 0x666666);
        restartButton.on('pointerdown', () => {
            scene.scene.start('TitleScene');
        });
    }
    
    /**
     * Update the stage and level information display
     * @param {number} level - Current game level
     */
    updateLevelStageInfo(level) {
        if (!this.stageLevelText) return;
        
        // Calculate which stage we're on (stages are groups of 8 levels each)
        let stage = 1;
        if (level >= 25) {
            stage = 4;
        } else if (level >= 17) {
            stage = 3;
        } else if (level >= 9) {
            stage = 2;
        }
        
        // Update the text
        this.stageLevelText.setText(`Stage ${stage} - Level ${level}`);
        
        // Optional: Change the color based on stage for visual feedback
        switch (stage) {
            case 1:
                this.stageLevelText.setFill('#FFFFFF'); // White for stage 1
                break;
            case 2:
                this.stageLevelText.setFill('#AAFFAA'); // Light green for stage 2
                break;
            case 3:
                this.stageLevelText.setFill('#AAAAFF'); // Light blue for stage 3
                break;
            case 4:
                this.stageLevelText.setFill('#FFAAAA'); // Light red for stage 4
                break;
            default:
                this.stageLevelText.setFill('#FFAA00'); // Orange for higher stages
                break;
        }
    }
    
    /**
     * Update health display
     * @param {number} health - Current health
     * @param {number} maxHealth - Maximum health
     */
    updateHealthDisplay(health, maxHealth) {
        // Ensure health bar is updated correctly (Not shown in current snippet but assuming it exists)
    }
    
    /**
     * Show the pause menu
     */
    showPauseMenu() {
        if (this.isPaused) return;
        console.log("[UIManager] showPauseMenu called");
        this.isPaused = true;

        // Create a container for all pause menu elements, including the overlay
        this.pauseMenuContainer = this.scene.add.container(0, 0) // Position at 0,0 as its contents will be screen-centered
            .setScrollFactor(0)
            .setDepth(UI_DEPTH + 20); // High depth for the whole menu

        // Semi-transparent background overlay - covers the whole screen
        const overlay = this.scene.add.rectangle(
            GAME_WIDTH / 2, GAME_HEIGHT / 2, 
            GAME_WIDTH, GAME_HEIGHT, 
            0x000000, 0.7
        )
        // .setInteractive(); // Remove interactivity from overlay, let buttons handle it

        // Menu background panel (centered)
        const menuBg = this.scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 300, 250, 0x222222, 0.95)
            .setStrokeStyle(2, 0xeeeeee);

        const titleStyle = { fontSize: UI_FONT_SIZES.TITLE || '32px', fontFamily: UI_FONT_FAMILY || 'Arial', fill: '#FFFF00' }; // Bright Yellow
        const buttonTextStyle = { fontSize: UI_FONT_SIZES.LARGE || '24px', fontFamily: UI_FONT_FAMILY || 'Arial', fill: '#FFFF00' }; // Bright Yellow

        const mainCamera = this.scene.cameras.main;
        console.log(`[UIManager] Main Camera scroll: x=${mainCamera.scrollX}, y=${mainCamera.scrollY}, zoom=${mainCamera.zoom}`);

        const targetButtonX = GAME_WIDTH / 2;
        const targetResumeY = GAME_HEIGHT / 2 - 10;
        const targetMainMenuY = GAME_HEIGHT / 2 + 50;
        console.log(`[UIManager] Target Coords: ResumeBtn=(${targetButtonX}, ${targetResumeY}), MainMenuBtn=(${targetButtonX}, ${targetMainMenuY})`);

        const pausedText = this.scene.add.text(targetButtonX, GAME_HEIGHT / 2 - 80, 'Paused', titleStyle)
            .setOrigin(0.5)
            .setScrollFactor(0); // Ensure paused text also has scrollFactor 0

        // Resume Button
        const resumeButtonBg = this.scene.add.rectangle(targetButtonX, targetResumeY, 180, 40, 0x555555)
            .setInteractive({ useHandCursor: true })
            .setScrollFactor(0)
            .on('pointerdown', () => {
                console.log("[UIManager] Resume button clicked (manual resume)");
                this.hidePauseMenu();
                
                // Manually resume systems in GameScene
                if (this.scene.physics && this.scene.physics.world) {
                    this.scene.physics.world.resume();
                    console.log('[Resume Button] GameScene: Physics world resumed.');
                }
                if (this.scene.spawnSystem) {
                    this.scene.spawnSystem.resumeTimers();
                    console.log('[Resume Button] GameScene: SpawnSystem timers resumed.');
                }
                // Resume other systems in GameScene as needed

                this.scene.gameActive = true; 
                console.log(`[Resume Button] GameScene.gameActive set to: ${this.scene.gameActive}`);
            });
        const resumeButtonText = this.scene.add.text(targetButtonX, targetResumeY, 'Resume', buttonTextStyle)
            .setOrigin(0.5)
            .setScrollFactor(0);

        // Main Menu Button
        const mainMenuButtonBg = this.scene.add.rectangle(targetButtonX, targetMainMenuY, 180, 40, 0x555555)
            .setInteractive({ useHandCursor: true })
            .setScrollFactor(0)
            .on('pointerdown', () => {
                console.log("[UIManager] Main Menu button clicked");
                this.hidePauseMenu();
                this.scene.gameActive = false; 
                
                if (this.scene.audioManager && typeof this.scene.audioManager.stopAllActiveSounds === 'function') {
                    this.scene.audioManager.stopAllActiveSounds();
                } else {
                    console.warn('[UIManager] audioManager or stopAllActiveSounds not available.');
                    // Fallback: try to stop music at least
                    if (this.scene.audioManager && typeof this.scene.audioManager.stopMusic === 'function') {
                        this.scene.audioManager.stopMusic(0);
                    }
                }

                this.scene.scene.stop('GameScene');
                this.scene.scene.start('TitleScene');
            });
        const mainMenuButtonText = this.scene.add.text(targetButtonX, targetMainMenuY, 'Main Menu', buttonTextStyle)
            .setOrigin(0.5)
            .setScrollFactor(0);

        this.pauseMenuContainer.add([overlay, menuBg, pausedText]);

        // Store buttons as properties to destroy them later
        this.resumeButtonBg = resumeButtonBg;
        this.resumeButtonText = resumeButtonText;
        this.mainMenuButtonBg = mainMenuButtonBg;
        this.mainMenuButtonText = mainMenuButtonText;

        // Set a very high depth for buttons and log their properties
        const highButtonDepth = UI_DEPTH + 50;
        this.resumeButtonBg.setDepth(highButtonDepth);
        this.resumeButtonText.setDepth(highButtonDepth + 1); 
        this.mainMenuButtonBg.setDepth(highButtonDepth);
        this.mainMenuButtonText.setDepth(highButtonDepth + 1);

        console.log('[UIManager] Resume Btn BG:', {
            x: this.resumeButtonBg.x, y: this.resumeButtonBg.y, 
            visible: this.resumeButtonBg.visible, alpha: this.resumeButtonBg.alpha, depth: this.resumeButtonBg.depth
        });
        console.log('[UIManager] Resume Btn Txt:', {
            x: this.resumeButtonText.x, y: this.resumeButtonText.y, 
            visible: this.resumeButtonText.visible, alpha: this.resumeButtonText.alpha, depth: this.resumeButtonText.depth
        });

    }

    /**
     * Hide the pause menu
     */
    hidePauseMenu() {
        if (!this.isPaused || !this.pauseMenuContainer) return;
        console.log("[UIManager] hidePauseMenu called");
        this.isPaused = false;

        // Destroy the container and its children (overlay, menuBg, pausedText)
        this.pauseMenuContainer.destroy(true); 
        this.pauseMenuContainer = null;

        // Manually destroy buttons if they were added directly to the scene
        // We need a way to reference them. For now, let's assume they are properties of UIManager.
        // This will require storing them as properties when created in showPauseMenu.
        if (this.resumeButtonBg && this.resumeButtonBg.scene) this.resumeButtonBg.destroy();
        if (this.resumeButtonText && this.resumeButtonText.scene) this.resumeButtonText.destroy();
        if (this.mainMenuButtonBg && this.mainMenuButtonBg.scene) this.mainMenuButtonBg.destroy();
        if (this.mainMenuButtonText && this.mainMenuButtonText.scene) this.mainMenuButtonText.destroy();

        this.resumeButtonBg = null;
        this.resumeButtonText = null;
        this.mainMenuButtonBg = null;
        this.mainMenuButtonText = null;
    }
    
    /**
     * Update method called every frame
     */
    update() {
        this.updateCooldownDisplay();
    }
} 