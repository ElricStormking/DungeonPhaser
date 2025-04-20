import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';

/**
 * Victory UI class to display rewards after completing a level
 */
export default class VictoryUI {
    /**
     * Create the Victory UI
     * @param {Phaser.Scene} scene - The scene this UI belongs to
     */
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.visible = false;
        this.rewards = {
            experience: 0,
            coins: 0,
            items: []
        };
        
        // UI elements
        this.background = null;
        this.titleText = null;
        this.nextButton = null; // Next button
        this.mainMenuButton = null;
        
        // Initialize UI elements
        this.create();
    }
    
    /**
     * Create all UI elements but keep them hidden initially
     */
    create() {
        // Calculate camera view dimensions for full screen
        const camera = this.scene.cameras.main;
        const camWidth = camera.width;
        const camHeight = camera.height;
        
        // Create a container for all victory UI elements
        this.container = this.scene.add.container(0, 0);
        this.container.setVisible(false);
        
        // Add semi-transparent overlay for background (match camera dimensions)
        const overlay = this.scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);
        overlay.setOrigin(0, 0);
        overlay.setScrollFactor(0); // Fixed to camera
        this.container.add(overlay);
        
        // Add victory panel background (centered on screen)
        this.background = this.scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'victory_panel');
        this.background.setScale(0.8);
        this.background.setScrollFactor(0); // Fixed to camera
        this.container.add(this.background);
        
        // Add victory title
        const titleStyle = {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        };
        this.titleText = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 200, 'Level Completed!', titleStyle);
        this.titleText.setOrigin(0.5);
        this.titleText.setScrollFactor(0); // Fixed to camera
        this.container.add(this.titleText);
        
        // Add reward displays (will be populated when showing the UI)
        this.experienceText = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, 'Experience: 0', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#FFFFFF'
        });
        this.experienceText.setOrigin(0.5);
        this.experienceText.setScrollFactor(0); // Fixed to camera
        this.container.add(this.experienceText);
        
        this.coinsText = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'Coins: 0', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#FFFF00'
        });
        this.coinsText.setOrigin(0.5);
        this.coinsText.setScrollFactor(0); // Fixed to camera
        this.container.add(this.coinsText);
        
        // Add item slots (for rewards)
        this.itemSlots = [];
        for (let i = 0; i < 3; i++) {
            const x = GAME_WIDTH / 2 - 120 + i * 120;
            const y = GAME_HEIGHT / 2;
            
            // Create item slot background
            const slotBg = this.scene.add.image(x, y, 'item_slot');
            slotBg.setScrollFactor(0); // Fixed to camera
            this.container.add(slotBg);
            
            // Create item image (initially empty)
            const itemImg = this.scene.add.image(x, y, 'empty_item');
            itemImg.setVisible(false);
            itemImg.setScrollFactor(0); // Fixed to camera
            this.container.add(itemImg);
            
            this.itemSlots.push({
                background: slotBg,
                itemImage: itemImg
            });
        }
        
        // Add Next button
        this.nextButton = this.scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 120, 'button_next');
        this.nextButton.setInteractive({ useHandCursor: true });
        this.nextButton.on('pointerover', () => this.nextButton.setScale(1.05));
        this.nextButton.on('pointerout', () => this.nextButton.setScale(1.0));
        this.nextButton.on('pointerdown', () => this.onNext());
        this.nextButton.setScrollFactor(0); // Fixed to camera
        this.container.add(this.nextButton);
        
        this.mainMenuButton = this.scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 180, 'menu_button');
        this.mainMenuButton.setInteractive({ useHandCursor: true });
        this.mainMenuButton.on('pointerover', () => this.mainMenuButton.setScale(1.05));
        this.mainMenuButton.on('pointerout', () => this.mainMenuButton.setScale(1.0));
        this.mainMenuButton.on('pointerdown', () => this.onMainMenu());
        this.mainMenuButton.setScrollFactor(0); // Fixed to camera
        this.container.add(this.mainMenuButton);
        
        // Set depth to ensure it appears above everything else
        this.container.setDepth(1000);
    }
    
    /**
     * Show the victory UI with animations
     * @param {object} rewards - The rewards to display
     * @param {number} level - The completed level number
     */
    show(rewards, level) {
        this.rewards = rewards || {
            experience: 0,
            coins: 0,
            items: []
        };
        
        // Update UI elements with reward information
        this.titleText.setText(`Level ${level} Completed!`);
        this.experienceText.setText(`Experience: +${this.rewards.experience}`);
        this.coinsText.setText(`Coins: +${this.rewards.coins}`);
        
        // Update item slots
        for (let i = 0; i < this.itemSlots.length; i++) {
            const slot = this.itemSlots[i];
            const item = this.rewards.items[i];
            
            if (item) {
                slot.itemImage.setTexture(item.key);
                slot.itemImage.setVisible(true);
            } else {
                slot.itemImage.setVisible(false);
            }
        }
        
        // Make container visible
        this.container.setVisible(true);
        this.visible = true;
        
        // Add reveal animation
        this.container.setAlpha(0);
        this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            duration: 500,
            ease: 'Power2'
        });
        
        // Animate the background panel scaling in
        this.background.setScale(0.5);
        this.scene.tweens.add({
            targets: this.background,
            scale: 0.8,
            duration: 500,
            ease: 'Back.easeOut'
        });
        
        // Play victory sound
        if (this.scene.audioManager) {
            try {
                this.scene.audioManager.playSFX('victory');
            } catch (error) {
                console.warn('Failed to play victory sound:', error);
            }
        }
        
        // Ensure input is captured by the UI and not the game
        this.scene.input.enabled = true;
        this.scene.input.setPollAlways();
    }
    
    /**
     * Hide the victory UI
     */
    hide() {
        if (!this.visible) return;
        
        // Add hide animation
        this.scene.tweens.add({
            targets: this.container,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                this.container.setVisible(false);
                this.visible = false;
            }
        });
    }
    
    /**
     * Go to next level
     */
    onNext() {
        // Play button sound
        if (this.scene.audioManager) {
            try {
                this.scene.audioManager.playSFX('button_click');
            } catch (error) {
                console.warn('Failed to play button sound:', error);
            }
        }
        
        console.log('Next button clicked - transitioning to next level');
        
        // Hide the UI
        this.hide();
        
        // Tell the GameScene to continue to next level
        this.scene.continueToNextLevel();
    }
    
    /**
     * Return to main menu
     */
    onMainMenu() {
        // Play button sound
        if (this.scene.audioManager) {
            try {
                this.scene.audioManager.playSFX('button_click');
            } catch (error) {
                console.warn('Failed to play button sound:', error);
            }
        }
        
        // Hide the UI
        this.hide();
        
        // Return to the title screen
        this.scene.scene.start('TitleScene');
    }
} 