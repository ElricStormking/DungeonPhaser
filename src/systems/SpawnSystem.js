import { TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT } from '../constants.js';
import Enemy from '../entities/Enemy.js';
import Pickup from '../entities/Pickup.js';

/**
 * Handles spawning of pickups, enemies, and engineers
 */
export default class SpawnSystem {
    constructor(scene) {
        this.scene = scene;
        
        // Spawn settings
        this.enemySpawnDelay = 2000;
        this.engineerSpawnDelay = 15000;
        
        // Wave management
        this.currentStage = 1;
        this.currentLevel = 1;
        this.currentWave = 0;
        this.totalWaves = 5;
        this.waveActive = false;
        this.enemiesRemainingInWave = 0;
        this.enemiesSpawnedInWave = 0;  // Track enemies spawned in current wave
        this.enemiesKilledInWave = 0;   // Track enemies actually killed in current wave
        this.totalEnemies = 0;          // Total enemies planned for this wave
        this.waveSpawnInterval = null;
        this.waveCooldown = false;
        this.bossDefeated = false;
        
        // Setup spawn timers
        this.setupTimers();
    }
    
    /**
     * Setup the spawn timers
     */
    setupTimers() {
        // Regular engineer spawns
        this.engineerTimer = this.scene.time.addEvent({
            delay: this.engineerSpawnDelay,
            callback: this.spawnEngineer,
            callbackScope: this,
            loop: true
        });
        
        // Initialize wave state
        this.resetWaveState();
        
        // Initial delay before first wave
        this.scene.time.delayedCall(3000, () => {
            console.log("[SpawnSystem] Initial delay complete, starting first wave");
            this.startNextWave();
        });
    }
    
    /**
     * Reset the wave state completely
     */
    resetWaveState() {
        console.log("[SpawnSystem] Resetting wave state");
        // Set to wave 0 so first wave will be 1
        this.currentWave = 0;
        this.enemiesRemainingInWave = 0;
        this.enemiesSpawnedInWave = 0;
        this.enemiesKilledInWave = 0;
        this.totalEnemies = 0;
        this.waveActive = false;
        this.waveCooldown = false;
        
        // Clear any existing timers to prevent overlaps
        if (this.waveSpawnInterval) {
            this.waveSpawnInterval.remove();
            this.waveSpawnInterval = null;
        }
        
        if (this.nextWaveTimer) {
            this.nextWaveTimer.remove();
            this.nextWaveTimer = null;
        }
    }
    
    /**
     * Start the next wave
     */
    startNextWave() {
        if (this.scene.gameOver) return;
        
        // If we're already in a wave or cooldown, don't start another one
        if (this.waveActive || this.waveCooldown) {
            console.log(`[SpawnSystem] Cannot start next wave - active: ${this.waveActive}, cooldown: ${this.waveCooldown}`);
            return;
        }
        
        // Clean up any existing wave interval
        if (this.waveSpawnInterval) {
            this.waveSpawnInterval.remove();
            this.waveSpawnInterval = null;
        }
        
        this.currentWave++;
        this.waveActive = true;
        this.enemiesSpawnedInWave = 0;
        this.enemiesKilledInWave = 0;
        
        // Check if this is a boss wave
        const bossLevels = [4, 12, 20, 28];
        const isBossWave = this.currentWave === this.totalWaves && bossLevels.includes(this.currentLevel);
        
        console.log(`[SpawnSystem] Starting wave ${this.currentWave}/${this.totalWaves} (boss: ${isBossWave}) for level ${this.currentLevel}`);
        
        if (isBossWave) {
            // Determine stageNumber for the boss
            let stageNumber;
            if (this.currentLevel === 4) stageNumber = 1;      // Summoner
            else if (this.currentLevel === 12) stageNumber = 2; // Berserker
            else if (this.currentLevel === 20) stageNumber = 3; // Alchemist
            else if (this.currentLevel === 28) stageNumber = 4; // Lich King
            else stageNumber = 1; // Default fallback, though should not be reached with current logic

            this.spawnBoss(stageNumber);
            this.enemiesRemainingInWave = 1; // The boss is the only "enemy" for this wave count
            this.totalEnemies = 1;
            this.enemiesSpawnedInWave = 1; // Boss is spawned immediately
            this.enemiesKilledInWave = 0;

            // Update UI for boss wave
            if (this.scene.uiManager) {
                this.scene.uiManager.updateWaveInfo(
                    this.currentWave,
                    this.totalWaves,
                    this.enemiesRemainingInWave, // Should be 1 (the boss)
                    this.totalEnemies,          // Should be 1
                    this.enemiesSpawnedInWave,   // Should be 1
                    this.enemiesKilledInWave    // Should be 0
                );
            }
            // No waveSpawnInterval needed for boss, completion handled by boss death
        } else {
            this.startRegularWave();
        }
        
        // Update UI manager with wave information
        if (this.scene.uiManager) {
            // Show wave notification
            this.scene.uiManager.showWaveNotification(isBossWave ? 'BOSS WAVE!' : `WAVE ${this.currentWave} / ${this.totalWaves}`);
        } else {
            // Fallback to old notification if UIManager isn't available
            this.showWaveNotification(isBossWave ? 'BOSS WAVE!' : `WAVE ${this.currentWave} / ${this.totalWaves}`);
        }
    }
    
    /**
     * Start a regular enemy wave
     */
    startRegularWave() {
        // Get wave configuration based on current level and wave
        const waveConfig = this.getWaveConfiguration();
        
        // Reset counters for new wave
        this.enemiesRemainingInWave = waveConfig.totalEnemies;
        this.enemiesSpawnedInWave = 0; 
        this.enemiesKilledInWave = 0;  
        this.totalEnemies = waveConfig.totalEnemies;
        
        console.log(`[SpawnSystem] Starting wave ${this.currentWave} with ${this.totalEnemies} enemies. Kill count reset to 0.`);
        
        // Update UI with initial wave information
        if (this.scene.uiManager) {
            this.scene.uiManager.updateWaveInfo(
                this.currentWave,
                this.totalWaves,
                this.enemiesRemainingInWave,
                this.totalEnemies,
                this.enemiesSpawnedInWave,
                this.enemiesKilledInWave
            );
        }
        
        // Force-spawn multiple enemies immediately (25% of the wave) to make the wave visible
        const initialSpawnCount = Math.max(3, Math.ceil(this.totalEnemies * 0.25));
        console.log(`[SpawnSystem] Force-spawning ${initialSpawnCount} enemies immediately for wave visibility`);
        
        for (let i = 0; i < initialSpawnCount && this.enemiesRemainingInWave > 0; i++) {
            const enemyType = this.selectEnemyTypeForWave(waveConfig);
            const enemy = this.spawnEnemyOfType(enemyType);
            
            // Only count valid spawns
            if (enemy) {
                this.enemiesRemainingInWave--;
                this.enemiesSpawnedInWave++;
            }
        }
        
        // Update UI after initial spawns
        if (this.scene.uiManager) {
            this.scene.uiManager.updateWaveInfo(
                this.currentWave,
                this.totalWaves,
                this.enemiesRemainingInWave,
                this.totalEnemies,
                this.enemiesSpawnedInWave,
                this.enemiesKilledInWave
            );
        }
        
        // Create wave spawn interval with a bit of delay to separate from initial spawns
        this.scene.time.delayedCall(1500, () => {
            if (!this.waveActive) return; // Check if wave was completed during delay
            
            this.waveSpawnInterval = this.scene.time.addEvent({
                delay: 800,  // Spawn every 800ms
                callback: () => {
                    if (this.scene.gameOver || !this.waveActive) {
                        if (this.waveSpawnInterval) {
                            this.waveSpawnInterval.remove();
                            this.waveSpawnInterval = null;
                        }
                        return;
                    }
                    
                    // Log wave status periodically
                    if (this.enemiesRemainingInWave % 5 === 0 || this.enemiesRemainingInWave <= 3) {
                        console.log(`[SpawnSystem] Wave ${this.currentWave} status - Remaining: ${this.enemiesRemainingInWave}, Spawned: ${this.enemiesSpawnedInWave}, Killed: ${this.enemiesKilledInWave}, Active: ${this.getActiveEnemyCount()}`);
                    }
                    
                    // Spawn enemies if there's room
                    if (this.getActiveEnemyCount() < 15 && this.enemiesRemainingInWave > 0) {
                        const enemyType = this.selectEnemyTypeForWave(waveConfig);
                        const enemy = this.spawnEnemyOfType(enemyType);
                        
                        if (enemy) {
                            this.enemiesRemainingInWave--;
                            this.enemiesSpawnedInWave++;
                            
                            // Update UI with remaining enemies count
                            if (this.scene.uiManager) {
                                this.scene.uiManager.updateWaveInfo(
                                    this.currentWave,
                                    this.totalWaves,
                                    this.enemiesRemainingInWave,
                                    this.totalEnemies,
                                    this.enemiesSpawnedInWave,
                                    this.enemiesKilledInWave
                                );
                            }
                        }
                    }
                    
                    // Check for wave completion
                    this.checkWaveCompletion();
                },
                callbackScope: this,
                loop: true
            });
        });
        
        // Safety timeout - force complete the wave after 2 minutes if stuck
        this.waveTimeoutTimer = this.scene.time.delayedCall(120000, () => {
            if (this.waveActive && this.currentWave > 0) {
                console.log(`[SpawnSystem] SAFETY TIMEOUT: Wave ${this.currentWave} took too long, forcing completion`);
                this.forceCompleteWave();
            }
        });
    }
    
    /**
     * Check if the current wave is complete
     */
    checkWaveCompletion() {
        // Only check if we're in an active wave
        if (!this.waveActive) return;
        
        // Wave is complete when all enemies are spawned and no active enemies remain
        if (this.enemiesRemainingInWave <= 0 && this.getActiveEnemyCount() === 0) {
            // Additional debug to help diagnose issues
            console.log(`[SpawnSystem] Wave ${this.currentWave} completion check: Remaining=${this.enemiesRemainingInWave}, Active=${this.getActiveEnemyCount()}, Spawned=${this.enemiesSpawnedInWave}, Killed=${this.enemiesKilledInWave}`);
            
            // Make sure at least some enemies were killed - safeguard against bugs
            if (this.enemiesKilledInWave >= Math.max(1, this.enemiesSpawnedInWave * 0.5)) {
                console.log(`[SpawnSystem] Wave ${this.currentWave} completion criteria met - Completing wave`);
                this.completeWave();
            } else {
                console.log(`[SpawnSystem] Wave ${this.currentWave} has no active enemies but kill count too low (${this.enemiesKilledInWave}/${this.enemiesSpawnedInWave}), forcing progress`);
                this.forceCompleteWave();
            }
        }
    }
    
    /**
     * Force complete the current wave (for recovery from stuck states)
     */
    forceCompleteWave() {
        // Kill any remaining enemies
        if (this.scene.enemies) {
            this.scene.enemies.getChildren().forEach(enemy => {
                if (enemy.active) {
                    enemy.die();
                }
            });
        }
        
        // If we had too few enemies killed, artificially increase the counter
        if (this.enemiesKilledInWave < this.enemiesSpawnedInWave) {
            console.log(`[SpawnSystem] Artificially adjusting kill count from ${this.enemiesKilledInWave} to ${this.enemiesSpawnedInWave} to complete wave`);
            this.enemiesKilledInWave = this.enemiesSpawnedInWave;
        }
        
        // Complete the wave
        this.completeWave();
    }
    
    /**
     * Complete the current wave
     */
    completeWave() {
        // Cleanup timers
        if (this.waveSpawnInterval) {
            this.waveSpawnInterval.remove();
            this.waveSpawnInterval = null;
        }
        
        if (this.waveTimeoutTimer) {
            this.waveTimeoutTimer.remove();
            this.waveTimeoutTimer = null;
        }
        
        // Prevent multiple completeWave calls for the same wave
        if (!this.waveActive) {
            console.log(`[SpawnSystem] Ignoring duplicate wave completion call for wave ${this.currentWave}`);
            return;
        }
        
        this.waveActive = false;
        this.waveCooldown = true;
        
        // Debug log for wave completion
        console.log(`[SpawnSystem] Wave ${this.currentWave} complete! Final stats:
            - Total enemies: ${this.totalEnemies}
            - Spawned: ${this.enemiesSpawnedInWave}
            - Killed: ${this.enemiesKilledInWave}`);
        
        // Final UI update when wave is complete
        if (this.scene.uiManager) {
            // For visual clarity at wave completion, show all enemies as killed
            // but maintain the actual count for debugging
            const actualKilled = this.enemiesKilledInWave;
            this.enemiesKilledInWave = this.enemiesSpawnedInWave;
            
            // Update to show all enemies are killed (0 remaining)
            this.scene.uiManager.updateWaveInfo(
                this.currentWave,
                this.totalWaves,
                0, // No enemies remaining
                this.totalEnemies, // Total enemies planned for wave
                this.enemiesSpawnedInWave, // All spawned
                this.enemiesSpawnedInWave // All considered killed at wave end
            );
            
            // Show wave complete notification
            this.scene.uiManager.showWaveCompleteNotification();
            
            // Restore actual count for debugging
            this.enemiesKilledInWave = actualKilled;
        } else {
            this.showWaveNotification('WAVE COMPLETE!');
        }
        
        // Reward the player
        this.spawnPickup();
        if (this.currentWave >= 3) {
            this.spawnEngineer();
        }
        
        // Check if all waves are complete
        console.log(`[SpawnSystem] Checking if level is complete: wave ${this.currentWave} of ${this.totalWaves}`);
        if (this.currentWave >= this.totalWaves) {
            // Level complete, prepare for next level
            console.log(`[SpawnSystem] All ${this.totalWaves} waves completed! Moving to level completion.`);
            this.scene.time.delayedCall(3000, () => {
                this.completeLevel();
            });
        } else {
            // Make sure any previous timer is cleared
            if (this.nextWaveTimer) {
                this.nextWaveTimer.remove();
            }
            
            // Cooldown between waves
            console.log(`[SpawnSystem] Starting cooldown after wave ${this.currentWave}, next wave will be ${this.currentWave + 1}`);
            this.nextWaveTimer = this.scene.time.delayedCall(5000, () => {
                console.log(`[SpawnSystem] Cooldown complete after wave ${this.currentWave}, starting next wave`);
                this.waveCooldown = false;
                this.startNextWave();
            });
        }
    }
    
    /**
     * Complete the current level
     */
    completeLevel() {
        // Before incrementing, store the completed level number
        const completedLevel = this.currentLevel;
        
        // Increment level
        this.currentLevel++;
        
        console.log(`[SpawnSystem] LEVEL PROGRESSION: Completed level ${completedLevel}, incremented to ${this.currentLevel}`);
        
        // Update level in UI
        if (this.scene.updateLevel) {
            this.scene.updateLevel(this.currentLevel);
        }
        
        // Reset wave counter
        this.currentWave = 0;
        this.bossDefeated = false;
        
        // Play victory sound
        if (this.scene.audioManager) {
            this.scene.audioManager.playVictorySound();
        }
        
        // Show level complete notification with animation - use completedLevel instead of currentLevel-1
        const levelText = this.scene.add.text(
            this.scene.cameras.main.worldView.centerX,
            this.scene.cameras.main.worldView.centerY,
            `LEVEL ${completedLevel} COMPLETE!`,
            {
                fontSize: '36px',
                fontFamily: 'Arial',
                color: '#FFFF00',
                stroke: '#000000',
                strokeThickness: 6,
                align: 'center'
            }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(100)
         .setAlpha(0)
         .setScale(0.5);
        
        // Log the level completion for debugging
        console.log(`[SpawnSystem] Showing level completion: LEVEL ${completedLevel} COMPLETE!`);
        
        // Zoom and fade animation
        this.scene.tweens.add({
            targets: levelText,
            alpha: 1,
            scale: 1,
            ease: 'Back.easeOut',
            duration: 1000,
            hold: 2000,
            yoyo: true,
            onComplete: () => {
                levelText.destroy();
                
                // Show Victory UI
                if (this.scene.victoryUI) {
                    this.scene.showVictoryUI();
                } else {
                    // Fall back to the old implementation if Victory UI isn't available
                    this.showWaveNotification(`LEVEL ${this.currentLevel} STARTED!`);
                    
                    // Prepare for first wave of next level
                    this.scene.time.delayedCall(1000, () => {
                        this.startNextWave();
                    });
                }
            }
        });
    }
    
    /**
     * Get the configuration for the current wave
     */
    getWaveConfiguration() {
        // Default configuration
        const config = {
            melee: 10,
            dasher: 0,
            bomber: 0,
            shooter: 0,
            mage: 0,
            totalEnemies: 10
        };
        
        // Determine stage (1-4) and stage progress (early, mid, late)
        const stage = Math.ceil(this.currentLevel / 8);
        const stageProgress = this.currentLevel % 8;
        const stagePhase = stageProgress <= 2 ? 'early' : 
                         (stageProgress <= 5 ? 'mid' : 'late');
        
        // Adjust config based on the wave and level design
        switch (stage) {
            case 1: // Forest Realm
                if (stagePhase === 'early') {
                    switch (this.currentWave) {
                        case 1: config.melee = 10; break;
                        case 2: config.melee = 6; config.dasher = 4; break;
                        case 3: config.melee = 8; config.dasher = 6; config.shooter = 2; break;
                        case 4: config.melee = 6; config.dasher = 8; config.shooter = 4; break;
                        case 5: config.melee = 10; config.dasher = 10; config.shooter = 6; break;
                    }
                } else if (stagePhase === 'mid') {
                    switch (this.currentWave) {
                        case 1: config.melee = 10; config.dasher = 6; config.shooter = 4; break;
                        case 2: config.melee = 8; config.dasher = 8; config.shooter = 6; config.bomber = 2; break;
                        case 3: config.melee = 6; config.dasher = 10; config.shooter = 6; config.bomber = 4; break;
                        case 4: config.melee = 12; config.dasher = 8; config.shooter = 8; config.bomber = 4; break;
                        case 5: config.melee = 10; config.dasher = 12; config.shooter = 8; config.bomber = 6; config.mage = 2; break;
                    }
                } else { // Late - boss level coming up
                    switch (this.currentWave) {
                        case 1: config.melee = 16; config.dasher = 10; config.shooter = 6; break;
                        case 2: config.melee = 12; config.dasher = 12; config.shooter = 10; config.bomber = 6; break;
                        case 3: config.melee = 10; config.dasher = 10; config.shooter = 8; config.bomber = 8; config.mage = 4; break;
                        case 4: config.melee = 14; config.dasher = 14; config.shooter = 10; config.bomber = 8; config.mage = 6; break;
                        // Wave 5 is boss wave
                    }
                }
                break;
                
            case 2: // Mountain Caverns
                if (stagePhase === 'early') {
                    switch (this.currentWave) {
                        case 1: config.melee = 14; config.dasher = 10; config.shooter = 6; break;
                        case 2: config.melee = 12; config.dasher = 12; config.shooter = 8; config.bomber = 4; break;
                        case 3: config.melee = 10; config.dasher = 14; config.shooter = 10; config.bomber = 6; config.mage = 2; break;
                        case 4: config.melee = 14; config.dasher = 12; config.shooter = 12; config.bomber = 6; config.mage = 4; break;
                        case 5: config.melee = 16; config.dasher = 16; config.shooter = 10; config.bomber = 8; config.mage = 4; break;
                    }
                } else if (stagePhase === 'mid') {
                    switch (this.currentWave) {
                        case 1: config.melee = 16; config.dasher = 14; config.shooter = 10; config.bomber = 6; config.mage = 4; break;
                        case 2: config.melee = 14; config.dasher = 16; config.shooter = 12; config.bomber = 8; config.mage = 6; break;
                        case 3: config.melee = 18; config.dasher = 14; config.shooter = 14; config.bomber = 8; config.mage = 6; break;
                        case 4: config.melee = 16; config.dasher = 18; config.shooter = 14; config.bomber = 10; config.mage = 8; break;
                        case 5: config.melee = 20; config.dasher = 16; config.shooter = 16; config.bomber = 12; config.mage = 8; break;
                    }
                } else { // Late
                    switch (this.currentWave) {
                        case 1: config.melee = 20; config.dasher = 18; config.shooter = 14; config.bomber = 10; config.mage = 8; break;
                        case 2: config.melee = 24; config.dasher = 20; config.shooter = 16; config.bomber = 12; config.mage = 10; break;
                        case 3: config.melee = 20; config.dasher = 24; config.shooter = 18; config.bomber = 14; config.mage = 12; break;
                        case 4: config.melee = 28; config.dasher = 22; config.shooter = 20; config.bomber = 16; config.mage = 14; break;
                        // Wave 5 is boss wave
                    }
                }
                break;
                
            case 3: // Magical Academy
                if (stagePhase === 'early') {
                    switch (this.currentWave) {
                        case 1: config.melee = 20; config.dasher = 18; config.shooter = 16; config.bomber = 10; config.mage = 8; break;
                        case 2: config.melee = 24; config.dasher = 20; config.shooter = 18; config.bomber = 12; config.mage = 10; break;
                        case 3: config.melee = 22; config.dasher = 24; config.shooter = 20; config.bomber = 14; config.mage = 12; break;
                        case 4: config.melee = 26; config.dasher = 22; config.shooter = 22; config.bomber = 16; config.mage = 14; break;
                        case 5: config.melee = 28; config.dasher = 26; config.shooter = 24; config.bomber = 18; config.mage = 16; break;
                    }
                } else if (stagePhase === 'mid') {
                    switch (this.currentWave) {
                        case 1: config.melee = 30; config.dasher = 24; config.shooter = 24; config.bomber = 16; config.mage = 14; break;
                        case 2: config.melee = 26; config.dasher = 30; config.shooter = 26; config.bomber = 18; config.mage = 16; break;
                        case 3: config.melee = 32; config.dasher = 28; config.shooter = 28; config.bomber = 20; config.mage = 18; break;
                        case 4: config.melee = 28; config.dasher = 32; config.shooter = 30; config.bomber = 22; config.mage = 20; break;
                        case 5: config.melee = 34; config.dasher = 30; config.shooter = 32; config.bomber = 24; config.mage = 22; break;
                    }
                } else { // Late
                    switch (this.currentWave) {
                        case 1: config.melee = 30; config.dasher = 34; config.shooter = 30; config.bomber = 24; config.mage = 22; break;
                        case 2: config.melee = 36; config.dasher = 32; config.shooter = 32; config.bomber = 26; config.mage = 24; break;
                        case 3: config.melee = 32; config.dasher = 36; config.shooter = 34; config.bomber = 28; config.mage = 26; break;
                        case 4: config.melee = 38; config.dasher = 34; config.shooter = 36; config.bomber = 30; config.mage = 28; break;
                        // Wave 5 is boss wave
                    }
                }
                break;
                
            case 4: // Necropolis
                if (stagePhase === 'early') {
                    switch (this.currentWave) {
                        case 1: config.melee = 36; config.dasher = 32; config.shooter = 30; config.bomber = 24; config.mage = 20; break;
                        case 2: config.melee = 38; config.dasher = 36; config.shooter = 32; config.bomber = 26; config.mage = 22; break;
                        case 3: config.melee = 40; config.dasher = 38; config.shooter = 34; config.bomber = 28; config.mage = 24; break;
                        case 4: config.melee = 42; config.dasher = 40; config.shooter = 36; config.bomber = 30; config.mage = 26; break;
                        case 5: config.melee = 44; config.dasher = 42; config.shooter = 38; config.bomber = 32; config.mage = 28; break;
                    }
                } else if (stagePhase === 'mid') {
                    switch (this.currentWave) {
                        case 1: config.melee = 46; config.dasher = 40; config.shooter = 38; config.bomber = 30; config.mage = 28; break;
                        case 2: config.melee = 44; config.dasher = 44; config.shooter = 40; config.bomber = 32; config.mage = 30; break;
                        case 3: config.melee = 48; config.dasher = 42; config.shooter = 42; config.bomber = 34; config.mage = 32; break;
                        case 4: config.melee = 46; config.dasher = 46; config.shooter = 44; config.bomber = 36; config.mage = 34; break;
                        case 5: config.melee = 50; config.dasher = 48; config.shooter = 46; config.bomber = 38; config.mage = 36; break;
                    }
                } else { // Late - Final Boss
                    switch (this.currentWave) {
                        case 1: config.melee = 50; config.dasher = 46; config.shooter = 44; config.bomber = 36; config.mage = 34; break;
                        case 2: config.melee = 52; config.dasher = 50; config.shooter = 46; config.bomber = 38; config.mage = 36; break;
                        case 3: config.melee = 54; config.dasher = 52; config.shooter = 48; config.bomber = 40; config.mage = 38; break;
                        case 4: config.melee = 56; config.dasher = 54; config.shooter = 50; config.bomber = 42; config.mage = 40; break;
                        // Wave 5 is the final boss
                    }
                }
                break;

            default: // Fallback for very high levels if not explicitly defined
                config.melee = 10 + (this.currentLevel * 2) + (this.currentWave * 2);
                config.dasher = 5 + this.currentLevel + this.currentWave;
                config.shooter = 3 + this.currentLevel + this.currentWave;
                config.bomber = 2 + Math.floor(this.currentLevel / 2) + this.currentWave;
                config.mage = 1 + Math.floor(this.currentLevel / 3) + Math.floor(this.currentWave / 2);
                config.totalEnemies = config.melee + config.dasher + config.bomber + config.shooter + config.mage;
                break;
        }

        // Recalculate total enemies if not set or if it's different from sum
        const currentTotalCalculated = config.melee + config.dasher + config.bomber + config.shooter + config.mage;
        if (config.totalEnemies !== currentTotalCalculated) {
            // console.warn(`[SpawnSystem] Discrepancy in totalEnemies for L${this.currentLevel} W${this.currentWave}. Stated: ${config.totalEnemies}, Calculated: ${currentTotalCalculated}. Using calculated sum.`);
            config.totalEnemies = currentTotalCalculated;
        }
        
        // Store the original total before reduction
        const originalTotalEnemies = config.totalEnemies;

        // Reduce total enemy count to 70%
        const newTotalEnemies = Math.max(1, Math.floor(originalTotalEnemies * 0.7)); // Ensure at least 1 enemy

        // If originalTotalEnemies is 0, newTotalEnemies will be 0, ratio is irrelevant or 1.
        const reductionRatio = originalTotalEnemies > 0 ? newTotalEnemies / originalTotalEnemies : 1;

        config.melee = Math.round(config.melee * reductionRatio);
        config.dasher = Math.round(config.dasher * reductionRatio);
        config.bomber = Math.round(config.bomber * reductionRatio);
        config.shooter = Math.round(config.shooter * reductionRatio);
        config.mage = Math.round(config.mage * reductionRatio);

        // Final total enemies based on rounded individual counts
        config.totalEnemies = config.melee + config.dasher + config.bomber + config.shooter + config.mage;
        
        // Ensure totalEnemies is not less than 1 if any individual type is > 0
        if (config.totalEnemies === 0 && (config.melee > 0 || config.dasher > 0 || config.bomber > 0 || config.shooter > 0 || config.mage > 0)) {
            // If all rounded to 0 but some were > 0, set total to 1 and make the first available type 1
            config.totalEnemies = 1;
            if (originalTotalEnemies > 0) { // only if there were enemies to begin with
                if (Math.round(originalTotalEnemies * 0.7) === 0) { // if 70% rounded to 0
                     if (config.melee > 0 || (config.melee === 0 && config.dasher === 0 && config.bomber === 0 && config.shooter === 0 && config.mage === 0 && originalTotalEnemies > 0 && (config.melee / originalTotalEnemies > 0) ) ) config.melee = 1;
                     else if (config.dasher > 0 || (config.dasher === 0 && config.bomber === 0 && config.shooter === 0 && config.mage === 0 && originalTotalEnemies > 0 && (config.dasher / originalTotalEnemies > 0) )) config.dasher = 1;
                     else if (config.bomber > 0 || (config.bomber === 0 && config.shooter === 0 && config.mage === 0 && originalTotalEnemies > 0 && (config.bomber / originalTotalEnemies > 0) )) config.bomber = 1;
                     else if (config.shooter > 0 || (config.shooter === 0 && config.mage === 0 && originalTotalEnemies > 0 && (config.shooter / originalTotalEnemies > 0) )) config.shooter = 1;
                     else if (config.mage > 0 || (config.mage === 0 && originalTotalEnemies > 0 && (config.mage / originalTotalEnemies > 0) )) config.mage = 1;
                     else { // If all were zero initially, but originalTotal was > 0 (e.g. only one type of enemy that rounded down)
                        config.melee = 1; // Default to melee
                     }
                }
            }
        }

        console.log(`[SpawnSystem] L${this.currentLevel} W${this.currentWave}: Original total enemies: ${originalTotalEnemies}, Reduced to: ${config.totalEnemies} (Ratio: ${reductionRatio.toFixed(2)})`);
        console.log(`[SpawnSystem] Final Config: Melee-${config.melee}, Dasher-${config.dasher}, Bomber-${config.bomber}, Shooter-${config.shooter}, Mage-${config.mage}`);

        return config;
    }
    
    /**
     * Select an enemy type to spawn based on the wave configuration
     */
    selectEnemyTypeForWave(waveConfig) {
        const types = ['melee', 'dasher', 'bomber', 'shooter', 'mage'];
        const counts = [
            waveConfig.melee, 
            waveConfig.dasher, 
            waveConfig.bomber, 
            waveConfig.shooter, 
            waveConfig.mage
        ];
        
        // Create a weighted selection based on remaining enemy counts
        const totalWeight = counts.reduce((a, b) => a + b, 0);
        let random = Phaser.Math.Between(1, totalWeight);
        
        for (let i = 0; i < types.length; i++) {
            random -= counts[i];
            if (random <= 0 && counts[i] > 0) {
                return types[i];
            }
        }
        
        // Fallback
        return 'melee';
    }
    
    /**
     * Spawn an enemy of a specific type
     */
    spawnEnemyOfType(type) {
        if (this.scene.gameOver) return;
        
        let x, y;
        const side = Phaser.Math.Between(0, 3);
        const buffer = TILE_SIZE * 2;
        
        // Spawn outside the world bounds initially
        switch (side) {
            case 0: x = Phaser.Math.Between(0, WORLD_WIDTH); y = -buffer; break; // Top
            case 1: x = WORLD_WIDTH + buffer; y = Phaser.Math.Between(0, WORLD_HEIGHT); break; // Right
            case 2: x = Phaser.Math.Between(0, WORLD_WIDTH); y = WORLD_HEIGHT + buffer; break; // Bottom
            case 3: x = -buffer; y = Phaser.Math.Between(0, WORLD_HEIGHT); break; // Left
        }
        
        // Create enemy with type and level-appropriate difficulty
        const enemy = Enemy.createEnemy(this.scene, x, y, this.currentLevel, type);
        this.scene.enemies.add(enemy);
        
        return enemy;
    }
    
    /**
     * Spawn a boss based on the stage number
     * @param {number} stageNumber - The stage number (1-4)
     * @returns {Enemy} The spawned boss
     */
    spawnBoss(stageNumber) {
        // Calculate spawn position - far enough from player to give reaction time
        const distanceFromPlayer = TILE_SIZE * 15;
        const randomAngle = Math.random() * Math.PI * 2;
        const spawnX = this.scene.player.x + Math.cos(randomAngle) * distanceFromPlayer;
        const spawnY = this.scene.player.y + Math.sin(randomAngle) * distanceFromPlayer;
        
        // Use the Enemy factory method to create the boss with all the enhancements
        const boss = Enemy.createBoss(this.scene, spawnX, spawnY, stageNumber);
        
        // Add boss to enemies group
        this.scene.enemies.add(boss);
        
        // Make sure any added enemies are tracked properly in the wave
        if (this.waveActive) {
            // Boss counts more in wave progress
            this.enemiesSpawnedInWave += 5;
            this.totalEnemies += 5;
            
            // Update UI with the new enemy counts
            if (this.scene.uiManager) {
                this.scene.uiManager.updateWaveInfo(
                    this.currentWave,
                    this.totalWaves,
                    this.enemiesRemainingInWave,
                    this.totalEnemies,
                    this.enemiesSpawnedInWave,
                    this.enemiesKilledInWave
                );
            }
        }
        
        return boss;
    }
    
    /**
     * Show a wave notification on screen
     */
    showWaveNotification(text) {
        const notification = this.scene.add.text(
            WORLD_WIDTH / 2, 
            WORLD_HEIGHT / 2, 
            text, 
            {
                fontFamily: 'Arial',
                fontSize: '28px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4,
                align: 'center'
            }
        ).setOrigin(0.5);
        
        // Make it float up and fade out
        this.scene.tweens.add({
            targets: notification,
            alpha: 0,
            y: notification.y - 100,
            duration: 2500,
            onComplete: () => notification.destroy()
        });
    }
    
    /**
     * Get the current number of active enemies
     */
    getActiveEnemyCount() {
        return this.scene.enemies.countActive();
    }
    
    /**
     * Spawn a pickup at a random position
     */
    spawnPickup() {
        if (this.scene.pickups.countActive() >= 10) return; // Limit the number of active pickups
        
        // Find a safe, open space for the pickup
        const spawnPosition = this.findOpenSpawnLocation(16, 16);
        
        if (!spawnPosition) {
            console.warn('Could not find open space for pickup spawn');
            return null;
        }
        
        // Create pickup sprite
        const pickup = this.scene.pickups.create(
            spawnPosition.x, 
            spawnPosition.y, 
            'pickup'
        );
        
        if (!pickup) {
            console.warn('Failed to create pickup sprite');
            return null;
        }
        
        // Set collision body size
        pickup.body.setSize(16, 16);
        
        // Store random exp value (1-5)
        const expValue = Phaser.Math.Between(1, 5);
        pickup.setData('expValue', expValue);
        
        // Add a pulsing effect to the pickup
        this.scene.tweens.add({
            targets: pickup,
            scale: 1.2,
            duration: 750,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Ensure the AudioManager is ready for pickups
        if (this.scene.audioManager) {
            // Preload the pickup sound to ensure it's ready when needed
            this.scene.audioManager.reloadSFX('pickup');
        }
        
        return pickup;
    }
    
    /**
     * Spawn an engineer at a valid position
     */
    spawnEngineer() {
        if (this.scene.gameOver) return;
        
        let x, y;
        let validPosition = false;
        let attempts = 0;
        const maxAttempts = 50;
        
        while (!validPosition && attempts < maxAttempts) {
            // Generate random position within world bounds
            x = Phaser.Math.Between(TILE_SIZE * 2, WORLD_WIDTH - TILE_SIZE * 2);
            y = Phaser.Math.Between(TILE_SIZE * 2, WORLD_HEIGHT - TILE_SIZE * 2);
            attempts++;
            
            // Check if position is valid (not overlapping with other objects)
            // Use a larger minimum distance for engineers
            validPosition = this.isValidSpawnPosition(x, y, TILE_SIZE * 2);
            
            // Additional check: Don't spawn too close to enemies
            if (validPosition) {
                this.scene.enemies.children.each(enemy => {
                    if (enemy.active && Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) < TILE_SIZE * 3) {
                        validPosition = false;
                    }
                });
            }
        }
        
        if (validPosition) {
            // Get random engineer class
            const engineerClasses = this.scene.engineerClasses;
            const classKeys = Object.keys(engineerClasses);
            const randomClass = engineerClasses[classKeys[Phaser.Math.Between(0, classKeys.length - 1)]];
            
            // Create the engineer pickup
            const engineer = Pickup.createEngineer(this.scene, x, y, randomClass);
            this.scene.engineers.add(engineer);
            
            return engineer;
        } else {
            console.warn('Could not find valid position for engineer after', maxAttempts, 'attempts.');
            return null;
        }
    }
    
    /**
     * Check if a position is valid for spawning (not too close to other objects)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} minDistance - Minimum distance from other objects
     * @returns {boolean} Whether the position is valid
     */
    isValidSpawnPosition(x, y, minDistance) {
        const player = this.scene.player;
        
        // Out of bounds check
        if (x < TILE_SIZE/2 || x > WORLD_WIDTH - TILE_SIZE/2 || 
            y < TILE_SIZE/2 || y > WORLD_HEIGHT - TILE_SIZE/2) {
            return false;
        }
        
        // Check distance from player
        if (Phaser.Math.Distance.Between(x, y, player.x, player.y) < minDistance) {
            return false;
        }
        
        // Check distance from followers
        let overlappingFollower = false;
        this.scene.followersGroup.children.each(follower => {
            if (Phaser.Math.Distance.Between(x, y, follower.x, follower.y) < minDistance) {
                overlappingFollower = true;
            }
        });
        if (overlappingFollower) return false;
        
        // Check distance from existing pickups
        let overlappingPickup = false;
        this.scene.pickups.children.each(pickup => {
            if (pickup.active && Phaser.Math.Distance.Between(x, y, pickup.x, pickup.y) < minDistance) {
                overlappingPickup = true;
            }
        });
        if (overlappingPickup) return false;
        
        // Check distance from existing engineers
        let overlappingEngineer = false;
        this.scene.engineers.children.each(engineer => {
            if (engineer.active && Phaser.Math.Distance.Between(x, y, engineer.x, engineer.y) < minDistance) {
                overlappingEngineer = true;
            }
        });
        if (overlappingEngineer) return false;
        
        return true;
    }
    
    /**
     * Adjust enemy spawn rate based on game difficulty
     * @param {number} level - Current game level
     */
    adjustEnemySpawnRate(level) {
        // Gradually decrease spawn delay as level increases
        this.enemySpawnDelay = Math.max(500, 2000 - (level * 100));
        
        // Update timer if it exists
        if (this.enemyTimer) {
            this.enemyTimer.delay = this.enemySpawnDelay;
        }
    }
    
    /**
     * Get current level number
     */
    getCurrentLevel() {
        return this.currentLevel;
    }
    
    /**
     * Get current wave number
     */
    getCurrentWave() {
        return this.currentWave;
    }
    
    /**
     * Destroy all timers when shutting down
     */
    destroy() {
        if (this.enemyTimer) this.enemyTimer.remove();
        if (this.engineerTimer) this.engineerTimer.remove();
        if (this.waveSpawnInterval) this.waveSpawnInterval.remove();
    }
    
    /**
     * Find an open location for spawning objects
     * @param {number} width - Width of the object to spawn
     * @param {number} height - Height of the object to spawn
     * @param {boolean} avoidPlayerArea - Whether to avoid spawning near the player
     * @returns {Object|null} Position {x, y} or null if no position found
     */
    findOpenSpawnLocation(width = 32, height = 32, avoidPlayerArea = true) {
        // Default to half tile size if dimensions not provided
        width = width || TILE_SIZE / 2;
        height = height || TILE_SIZE / 2;
        
        const maxAttempts = 50;
        let attempts = 0;
        
        // Get player position for distance check
        let playerX = 0, playerY = 0;
        const minPlayerDistance = avoidPlayerArea ? TILE_SIZE * 5 : 0;
        
        if (this.scene.player) {
            playerX = this.scene.player.x;
            playerY = this.scene.player.y;
        }
        
        while (attempts < maxAttempts) {
            // Generate random position within world bounds
            const x = Phaser.Math.Between(
                width + TILE_SIZE, 
                WORLD_WIDTH - width - TILE_SIZE
            );
            
            const y = Phaser.Math.Between(
                height + TILE_SIZE, 
                WORLD_HEIGHT - height - TILE_SIZE
            );
            
            // Check distance from player
            if (avoidPlayerArea) {
                const dx = x - playerX;
                const dy = y - playerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < minPlayerDistance) {
                    attempts++;
                    continue; // Too close to player
                }
            }
            
            // Check for collisions with existing objects
            const rect = new Phaser.Geom.Rectangle(
                x - width/2, 
                y - height/2, 
                width, 
                height
            );
            
            // Simple overlap check with active objects
            let collision = false;
            
            // Check enemies
            if (this.scene.enemies) {
                const enemies = this.scene.enemies.getChildren();
                for (let i = 0; i < enemies.length; i++) {
                    const enemy = enemies[i];
                    if (enemy.active && Phaser.Geom.Rectangle.Overlaps(
                        rect,
                        new Phaser.Geom.Rectangle(
                            enemy.x - enemy.width/2,
                            enemy.y - enemy.height/2,
                            enemy.width,
                            enemy.height
                        )
                    )) {
                        collision = true;
                        break;
                    }
                }
            }
            
            // Check pickups
            if (!collision && this.scene.pickups) {
                const pickups = this.scene.pickups.getChildren();
                for (let i = 0; i < pickups.length; i++) {
                    const pickup = pickups[i];
                    if (pickup.active && Phaser.Geom.Rectangle.Overlaps(
                        rect,
                        new Phaser.Geom.Rectangle(
                            pickup.x - pickup.width/2,
                            pickup.y - pickup.height/2,
                            pickup.width,
                            pickup.height
                        )
                    )) {
                        collision = true;
                        break;
                    }
                }
            }
            
            // If no collision found, return this position
            if (!collision) {
                return { x, y };
            }
            
            attempts++;
        }
        
        // No suitable position found after max attempts
        return null;
    }
    
    /**
     * Spawn an enemy at a specific position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} type - Enemy type
     * @returns {Enemy} The spawned enemy
     */
    spawnEnemyAtPosition(x, y, type) {
        if (this.scene.gameOver) return null;
        
        // Clamp coordinates to stay within world bounds
        x = Phaser.Math.Clamp(x, TILE_SIZE, WORLD_WIDTH - TILE_SIZE);
        y = Phaser.Math.Clamp(y, TILE_SIZE, WORLD_HEIGHT - TILE_SIZE);
        
        // Create enemy with type and level-appropriate difficulty
        const enemy = Enemy.createEnemy(this.scene, x, y, this.currentLevel, type);
        this.scene.enemies.add(enemy);
        
        // Make sure any added enemies are tracked properly in the wave
        if (this.waveActive) {
            this.enemiesSpawnedInWave++;
            this.totalEnemies++;
            
            // Update UI with the new enemy counts
            if (this.scene.uiManager) {
                this.scene.uiManager.updateWaveInfo(
                    this.currentWave,
                    this.totalWaves,
                    this.enemiesRemainingInWave,
                    this.totalEnemies,
                    this.enemiesSpawnedInWave,
                    this.enemiesKilledInWave
                );
            }
        }
        
        return enemy;
    }
    
    /**
     * Pause all timers (used when Victory UI is shown)
     */
    pauseTimers() {
        console.log('[SpawnSystem] Pausing all timers');
        
        // Pause engineer spawn timer
        if (this.engineerTimer) {
            this.engineerTimer.paused = true;
        }
        
        // Pause wave spawn interval if active
        if (this.waveSpawnInterval) {
            this.waveSpawnInterval.paused = true;
        }
        
        // Note: We only pause specific known timers that we have references to
        // Attempting to pause all timers via getAllTimers causes crashes
    }
    
    /**
     * Resume all timers that were paused
     */
    resumeTimers() {
        console.log('[SpawnSystem] Resuming all timers');
        
        // Resume engineer spawn timer
        if (this.engineerTimer) {
            this.engineerTimer.paused = false;
        }
        
        // Resume wave spawn interval if it exists
        if (this.waveSpawnInterval) {
            this.waveSpawnInterval.paused = false;
        }
        
        // Note: We only resume specific known timers that we have references to
    }
    
    /**
     * Start a new level
     * @param {number} level - The level number to start
     */
    startNewLevel(level) {
        console.log(`[SpawnSystem] Starting new level: ${level}`);
        
        // Update current level
        this.currentLevel = level || this.currentLevel + 1;
        
        // Reset all wave state
        this.resetWaveState();
        
        // Initial delay before first wave of the new level
        this.scene.time.delayedCall(3000, () => {
            console.log(`[SpawnSystem] Starting first wave of level ${this.currentLevel}`);
            if (!this.scene.gameOver && this.scene.gameActive) {
                this.startNextWave();
            }
        });
        
        return true;
    }
} 