import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';
import { createGameTextures } from '../utils/textureGenerator.js';
import AudioManager from '../audio/AudioManager.js';

export default class TitleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TitleScene' });
        console.log('TitleScene constructor called');
        this.audioManager = null;
        this.audioInitialized = false;
    }
    
    preload() {
        console.log('TitleScene preload started');
        createGameTextures(this); // Generate textures
        
        // Load assets from main_menu.json
        this.load.image('background', './assets/images/ui/TitleMenu/background.png');
        this.load.image('button1_01', './assets/images/ui/TitleMenu/button1_newgame01.png');
        this.load.image('button2_01', './assets/images/ui/TitleMenu/button2_continue01.png');
        this.load.image('button3_01', './assets/images/ui/TitleMenu/button3_setting01.png');
        this.load.image('button4_01', './assets/images/ui/TitleMenu/button4_exit01.png');
        
        // Load the actual logo
        this.load.image('LOGO3', './assets/images/ui/TitleMenu/logo3.png');
        
        // Initialize audio manager but don't play anything yet
        try {
            this.audioManager = new AudioManager(this);
            this.audioManager.init();
        } catch (error) {
            console.warn('Failed to initialize audio system:', error);
        }
        
        console.log('TitleScene assets created');
    }
    
    create() {
        console.log('TitleScene create started');
        
        // Create the main menu scene based on main_menu.json
        const background = this.add.image(963, 540, 'background');
        
        // Add actual game logo
        const logo = this.add.image(427, 246, 'LOGO3')
            .setScale(0.5);
        
        // Play button
        const playButton = this.add.image(427, 493, 'button1_01')
            .setInteractive({ useHandCursor: true });
        
        // Options button    
        const optionsButton = this.add.image(427, 618, 'button2_01')
            .setInteractive({ useHandCursor: true });
        
        // Help button
        const helpButton = this.add.image(427, 752, 'button3_01')
            .setInteractive({ useHandCursor: true });
        
        // Exit button
        const exitButton = this.add.image(427, 890, 'button4_01')
            .setInteractive({ useHandCursor: true });
        
        // Button hover effects
        const buttons = [playButton, optionsButton, helpButton, exitButton];
        buttons.forEach(button => {
            button.on('pointerover', () => {
                button.setScale(1.05);
            });
            
            button.on('pointerout', () => {
                button.setScale(1.0);
            });
        });
        
        // Play button action - start the game
        playButton.on('pointerdown', () => {
            // Play audio if not initialized
            if (this.audioManager && !this.audioInitialized) {
                try {
                    console.log('User interaction detected, starting title music (non-looping)');
                    this.audioManager.playMusic('title_music', false);
                    this.audioInitialized = true;
                } catch (error) {
                    console.warn('Failed to play title music:', error);
                }
            }
            
            // Show character selection
            this.showCharacterSelection();
        });
        
        // Other button actions (placeholders)
        optionsButton.on('pointerdown', () => {
            console.log('Options button clicked');
            // Play a selection sound
            if (this.audioManager) {
                try {
                    this.audioManager.playSFX('pickup');
                } catch (error) {
                    console.warn('Failed to play pickup sound:', error);
                }
            }
        });
        
        helpButton.on('pointerdown', () => {
            console.log('Help button clicked');
            // Play a selection sound
            if (this.audioManager) {
                try {
                    this.audioManager.playSFX('pickup');
                } catch (error) {
                    console.warn('Failed to play pickup sound:', error);
                }
            }
        });
        
        exitButton.on('pointerdown', () => {
            console.log('Exit button clicked');
            // Play a selection sound
            if (this.audioManager) {
                try {
                    this.audioManager.playSFX('pickup');
                } catch (error) {
                    console.warn('Failed to play pickup sound:', error);
                }
            }
        });
            
        console.log('TitleScene create completed');
    }
    
    showCharacterSelection() {
        // Hide main menu elements (we'll create a transition)
        this.children.list.forEach(child => {
            this.tweens.add({
                targets: child,
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    child.setVisible(false);
                }
            });
        });
        
        // Wait for fade out to complete
        this.time.delayedCall(300, () => {
            // Background remains visible
            const background = this.add.image(963, 540, 'background').setAlpha(0);
            
            // Fade in background
            this.tweens.add({
                targets: background,
                alpha: 1,
                duration: 300
            });
            
            // Add logo to character selection screen
            const logo = this.add.image(GAME_WIDTH / 2, 120, 'LOGO3')
                .setScale(0.3)
                .setAlpha(0);
                
            // Add selection subtitle
            const selectionTitle = this.add.text(GAME_WIDTH / 2, 200, 'Choose Your Character', {
                fontSize: '28px', 
                fontFamily: 'Arial', 
                fill: '#FFFFFF',
                stroke: '#000000', 
                strokeThickness: 3
            }).setOrigin(0.5).setAlpha(0);
            
            // Fade in title and logo
            this.tweens.add({
                targets: [logo, selectionTitle],
                alpha: 1,
                duration: 300
            });
            
            // Define characters directly here or import from heroClasses.js
            const characters = [
                { name: 'Warrior', key: 'warrior', color: 0xFF0000, desc: 'Sword sweep: damages nearby enemies' }, 
                { name: 'Archer', key: 'archer', color: 0x00FF00, desc: 'Multi-shot: fires arrows in all directions' },
                { name: 'Mage', key: 'mage', color: 0x00FFFF, desc: 'Frost Nova: freezes nearby enemies' } 
            ];
            
            // Character buttons
            const charButtons = [];
            const charTexts = [];
            
            characters.forEach((char, index) => {
                const x = GAME_WIDTH / 2;
                const y = 300 + index * 120;
                
                // Button background using UI assets
                const button = this.add.image(x, y, 'button1_01').setOrigin(0.5).setAlpha(0);
                
                // Character icon
                const icon = this.add.rectangle(x - 120, y, 40, 40, char.color).setOrigin(0.5).setAlpha(0);
                
                // Character name and description
                const nameText = this.add.text(x, y - 15, char.name, { 
                    fontSize: '24px', 
                    fontFamily: 'Arial', 
                    fill: '#FFFFFF',
                    stroke: '#000000',
                    strokeThickness: 3
                }).setOrigin(0.5, 0.5).setAlpha(0);
                
                const descText = this.add.text(x, y + 15, char.desc, { 
                    fontSize: '14px', 
                    fontFamily: 'Arial', 
                    fill: '#CCCCCC',
                    stroke: '#000000',
                    strokeThickness: 2
                }).setOrigin(0.5, 0.5).setAlpha(0);
                
                // Add to arrays for animation
                charButtons.push(button);
                charTexts.push(icon, nameText, descText);
                
                // Make interactive
                button.setInteractive({ useHandCursor: true })
                    .on('pointerover', () => button.setScale(1.05))
                    .on('pointerout', () => button.setScale(1.0))
                    .on('pointerdown', () => {
                        console.log('Character selected:', char.name);
                        
                        // Play a selection sound
                        if (this.audioManager) {
                            try {
                                this.audioManager.playSFX('pickup');
                            } catch (error) {
                                console.warn('Failed to play pickup sound:', error);
                            }
                        }
                        
                        // Stop title music with immediate stop (no fade)
                        if (this.audioManager) {
                            try {
                                console.log('Stopping title music');
                                this.audioManager.stopMusic(0); // Immediate stop with no fade
                            } catch (error) {
                                console.warn('Failed to stop title music:', error);
                            }
                        }
                        
                        // Fade out everything
                        this.tweens.add({
                            targets: [...this.children.list],
                            alpha: 0,
                            duration: 300,
                            onComplete: () => {
                                // Pass the selected hero key to the next scene
                                this.scene.start('GameScene', { selectedHeroKey: char.key }); 
                            }
                        });
                    });
            });
            
            // Fade in buttons sequentially
            this.tweens.add({
                targets: charButtons,
                alpha: 1,
                duration: 300,
                delay: this.tweens.stagger(100)
            });
            
            // Fade in text elements
            this.tweens.add({
                targets: charTexts,
                alpha: 1,
                duration: 300,
                delay: this.tweens.stagger(50)
            });
            
            // Back button
            const backButton = this.add.image(427, 700, 'button4_01')
                .setInteractive({ useHandCursor: true })
                .setOrigin(0.5)
                .setAlpha(0);
                
            this.add.text(427, 700, 'BACK', { 
                fontSize: '24px', 
                fontFamily: 'Arial', 
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5).setAlpha(0);
            
            // Fade in back button
            this.tweens.add({
                targets: [backButton, backButton.text],
                alpha: 1,
                duration: 300,
                delay: 500
            });
            
            // Back button hover effects
            backButton.on('pointerover', () => backButton.setScale(1.05));
            backButton.on('pointerout', () => backButton.setScale(1.0));
            
            // Back button action
            backButton.on('pointerdown', () => {
                // Play a selection sound
                if (this.audioManager) {
                    try {
                        this.audioManager.playSFX('pickup');
                    } catch (error) {
                        console.warn('Failed to play pickup sound:', error);
                    }
                }
                
                // Restart the scene
                this.scene.restart();
            });
        });
    }
} 