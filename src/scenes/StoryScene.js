import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';

/**
 * Scene for displaying story dialogs between game levels
 * This version uses only programmatically created graphics with no external image loading
 */
export default class StoryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StoryScene' });
        this.onCompleteCallback = null;
        this.currentDialogIndex = 0;
        this.dialogTexts = [];
        this.characters = {};
        this.isDialogActive = false;
    }

    /**
     * Initialize with data from the caller scene
     * @param {object} data - Scene init data
     */
    init(data) {
        console.log('StoryScene init with data:', data);
        this.level = data.level || 1;
        this.onCompleteCallback = data.onComplete || null;
        this.currentDialogIndex = 0;
    }

    /**
     * Create programmatic assets instead of loading from files
     */
    preload() {
        console.log(`Preloading story assets for level ${this.level} (programmatic version)...`);
        // No external assets to preload - everything is created programmatically
    }
    
    /**
     * Create the simple dialog display
     */
    create() {
        console.log('Creating simple story dialog display');
        
        // Setup hardcoded dialog based on level
        this.setupDialog();
        
        // Create background using Phaser graphics
        this.createBackground();
        
        // Create character container
        this.characterContainer = this.add.container(GAME_WIDTH/2, GAME_HEIGHT/2);
        
        // Create dialog box
        this.createDialogBox();
        
        // Setup characters programmatically
        this.setupCharacters();
        
        // Show first dialog
        this.showNextDialog();
        
        // Add click listener for advancing dialog
        this.input.on('pointerdown', () => {
            if (this.isDialogActive) {
                this.showNextDialog();
            }
        });
        
        // Add keyboard listener for advancing dialog
        this.input.keyboard.on('keydown-SPACE', () => {
            if (this.isDialogActive) {
                this.showNextDialog();
            }
        });
    }
    
    /**
     * Create programmatic background
     */
    createBackground() {
        // Create a graphics object for the background
        this.backgroundGraphics = this.add.graphics();
        
        // Create different backgrounds
        this.backgrounds = {
            courtyard: () => {
                this.backgroundGraphics.clear();
                
                // Sky gradient
                const skyHeight = GAME_HEIGHT * 0.7;
                for (let y = 0; y < skyHeight; y++) {
                    const t = y / skyHeight;
                    const r = Math.floor(135 + (1-t) * 120);
                    const g = Math.floor(206 + (1-t) * 49);
                    const b = Math.floor(235);
                    const color = Phaser.Display.Color.GetColor(r, g, b);
                    
                    this.backgroundGraphics.lineStyle(1, color);
                    this.backgroundGraphics.lineBetween(0, y, GAME_WIDTH, y);
                }
                
                // Ground
                this.backgroundGraphics.fillStyle(0x7da652);
                this.backgroundGraphics.fillRect(0, skyHeight, GAME_WIDTH, GAME_HEIGHT - skyHeight);
                
                // Add some trees
                this.backgroundGraphics.fillStyle(0x216b21);
                for (let i = 0; i < 5; i++) {
                    const x = 100 + i * 250;
                    const treeHeight = 150 + Math.random() * 100;
                    this.backgroundGraphics.fillRect(x, skyHeight - treeHeight, 50, treeHeight);
                }
                
                // Add a simple path
                this.backgroundGraphics.fillStyle(0xc2a37c);
                this.backgroundGraphics.fillRect(GAME_WIDTH/2 - 100, skyHeight, 200, GAME_HEIGHT - skyHeight);
            },
            black: () => {
                this.backgroundGraphics.clear();
                this.backgroundGraphics.fillStyle(0x000000);
                this.backgroundGraphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            }
        };
        
        // Set default background
        this.backgrounds.courtyard();
    }
    
    /**
     * Setup characters for display
     */
    setupCharacters() {
        // Create Lucy character using graphics
        const lucyContainer = this.add.container(0, 0);
        
        // Create different states/expressions
        const normalExpression = this.createCharacterSprite('#FFC0CB', false); // pink
        const happyExpression = this.createCharacterSprite('#FFC0CB', true); // pink with smile
        
        // Add to container but hide initially
        lucyContainer.add(normalExpression);
        lucyContainer.add(happyExpression);
        normalExpression.visible = false;
        happyExpression.visible = false;
        
        // Store reference to the character
        this.characters.lucy = {
            container: lucyContainer,
            name: '露西',
            states: {
                normal: normalExpression,
                happy: happyExpression
            },
            currentState: null
        };
        
        // Add to character container
        this.characterContainer.add(lucyContainer);
    }
    
    /**
     * Create a character sprite using graphics
     */
    createCharacterSprite(color, isHappy) {
        const container = this.add.container(0, 50);
        
        // Create a graphics object for the character
        const graphics = this.add.graphics();
        
        // Head
        graphics.fillStyle(Phaser.Display.Color.HexStringToColor(color).color);
        graphics.fillCircle(0, -50, 40);
        
        // Body
        graphics.fillRect(-30, 0, 60, 100);
        
        // Eyes
        graphics.fillStyle(0x000000);
        graphics.fillCircle(-15, -60, 5);
        graphics.fillCircle(15, -60, 5);
        
        // Mouth
        if (isHappy) {
            // Happy smile
            graphics.lineStyle(3, 0x000000);
            graphics.beginPath();
            graphics.arc(0, -40, 20, 0, Math.PI, false);
            graphics.strokePath();
        } else {
            // Neutral mouth
            graphics.fillRect(-15, -40, 30, 3);
        }
        
        container.add(graphics);
        return container;
    }
    
    /**
     * Create the dialog box UI
     */
    createDialogBox() {
        // Create dialog box background
        this.dialogBox = this.add.rectangle(
            GAME_WIDTH/2, 
            GAME_HEIGHT - 150, 
            GAME_WIDTH - 100, 
            200, 
            0x000000, 
            0.7
        );
        
        // Add rounded corners
        this.dialogBox.setStrokeStyle(2, 0xffffff);
        
        // Character name box
        this.nameBox = this.add.rectangle(
            150, 
            GAME_HEIGHT - 250, 
            200, 
            50, 
            0x6600cc, 
            0.9
        );
        this.nameBox.setStrokeStyle(2, 0xffffff);
        
        // Character name text
        this.nameText = this.add.text(
            150, 
            GAME_HEIGHT - 250, 
            '', 
            { 
                fontFamily: 'Arial', 
                fontSize: '24px', 
                color: '#ffffff',
                align: 'center'
            }
        );
        this.nameText.setOrigin(0.5);
        
        // Dialog text
        this.dialogText = this.add.text(
            120, 
            GAME_HEIGHT - 180, 
            '', 
            { 
                fontFamily: 'Arial', 
                fontSize: '24px', 
                color: '#ffffff',
                wordWrap: { width: GAME_WIDTH - 150 }
            }
        );
        
        // Initially hide dialog elements
        this.hideDialog();
    }
    
    /**
     * Hide the dialog UI
     */
    hideDialog() {
        this.dialogBox.visible = false;
        this.nameBox.visible = false;
        this.nameText.visible = false;
        this.dialogText.visible = false;
        this.isDialogActive = false;
    }
    
    /**
     * Show the dialog UI
     */
    showDialog() {
        this.dialogBox.visible = true;
        this.nameBox.visible = true;
        this.nameText.visible = true;
        this.dialogText.visible = true;
        this.isDialogActive = true;
    }
    
    /**
     * Setup dialog content based on level
     */
    setupDialog() {
        // Different dialog for each level
        if (this.level === 1) {
            this.dialogTexts = [
                { 
                    character: 'lucy', 
                    state: 'normal',
                    text: '嗨，很高兴见到你！要喝茶吗？',
                    background: 'courtyard'
                },
                { 
                    character: 'lucy', 
                    state: 'happy',
                    text: '一起喝杯茶，放松一下吧！',
                    background: 'courtyard'
                }
            ];
        } else {
            // Default dialog if no specific level content
            this.dialogTexts = [
                { 
                    character: 'lucy', 
                    state: 'normal',
                    text: `欢迎来到第 ${this.level} 关卡!`,
                    background: 'courtyard'
                }
            ];
        }
    }
    
    /**
     * Show the next dialog in sequence
     */
    showNextDialog() {
        if (this.currentDialogIndex >= this.dialogTexts.length) {
            this.completeStory();
            return;
        }
        
        const dialog = this.dialogTexts[this.currentDialogIndex];
        
        // Set background if specified
        if (dialog.background && this.backgrounds[dialog.background]) {
            this.backgrounds[dialog.background]();
        }
        
        // Show character if specified
        if (dialog.character) {
            const character = this.characters[dialog.character];
            if (character) {
                // Hide previous state if any
                if (character.currentState) {
                    character.currentState.visible = false;
                }
                
                // Set character state/expression if specified
                if (dialog.state && character.states[dialog.state]) {
                    character.states[dialog.state].visible = true;
                    character.currentState = character.states[dialog.state];
                }
                
                // Set name in the name box
                this.nameText.setText(character.name);
            }
        }
        
        // Set dialog text
        this.dialogText.setText(dialog.text);
        
        // Show dialog UI
        this.showDialog();
        
        // Move to next dialog
        this.currentDialogIndex++;
    }
    
    /**
     * Complete the story and return to the game
     */
    completeStory() {
        console.log('Completing story and returning to game...');
        
        // Hide dialog
        this.hideDialog();
        
        // Call the completion callback if provided
        if (this.onCompleteCallback) {
            this.onCompleteCallback();
        }
        
        // End this scene
        this.scene.stop();
    }
} 