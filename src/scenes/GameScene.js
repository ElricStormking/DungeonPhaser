import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT, UI_PADDING, WAVE_COUNT } from '../constants.js';
import { createGameTextures } from '../utils/textureGenerator.js';
import * as Helpers from '../utils/helpers.js';
import { heroClasses } from '../data/heroClasses.js';
import { engineerClasses } from '../data/engineerClasses.js';
import ResourceManager from '../utils/ResourceManager.js';

// Import our new modular systems
import Player from '../entities/Player.js';
import FollowerFactory from '../entities/FollowerFactory.js';
import EntityFactory from '../entities/EntityFactory.js';
import MovementSystem from '../systems/MovementSystem.js';
import SpawnSystem from '../systems/SpawnSystem.js';
import CombatSystem from '../systems/CombatSystem.js';
import LevelSystem from '../systems/LevelSystem.js';
import UIManager from '../ui/UIManager.js';
import TerrainSystem from '../systems/TerrainSystem.js';
import AudioManager from '../audio/AudioManager.js';
import VictoryUI from '../ui/VictoryUI.js';

/**
 * Main game scene that coordinates all game systems and entities
 */
export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        // Game state properties
        this.player = null;
        this.followers = []; // Array to track follower sprites for movement order
        this.followersGroup = null; // Physics group for followers
        this.enemies = null;
        this.pickups = null;
        this.bullets = null;
        this.engineers = null; // Collectible engineers group

        this.score = 0;
        this.gameOver = false;
        this.gameActive = true;
        this.selectedHeroKey = 'warrior'; // Default hero
        
        // Helper reference for access by other systems
        this.helpers = Helpers;
        this.engineerClasses = engineerClasses; // Make engineer classes available to other systems
        
        // Systems will be initialized in create()
        this.movementSystem = null;
        this.spawnSystem = null;
        this.combatSystem = null;
        this.levelSystem = null;
        this.uiManager = null;
        this.followerFactory = null;
        this.terrainSystem = null; // New terrain system
        this.audioManager = null; // New audio system
        this.entityFactory = null;
        this.resourceManager = null; // Resource manager for object pooling
        this.victoryUI = null;  // Victory UI for level completion
    }
    
    /**
     * Initialize game data from scene parameters
     * @param {object} data - Data passed from previous scene
     */
    init(data) {
        console.log('GameScene init');
        
        // Get selected hero from TitleScene
        this.selectedHeroKey = data.selectedHeroKey || 'warrior'; 
        
        // Check if we should skip intro story (already shown in TitleScene)
        this.skipIntroStory = data.skipIntroStory || false;
        
        // Reset state variables that persist across scene restarts
        this.resetGameState();
    }

    /**
     * Reset all game state variables to initial values
     */
    resetGameState() {
        this.gameOver = false;
        this.gameActive = true;
        this.score = 0;
        this.followers = [];
        
        // Systems will reset themselves in create()
        console.log('Game state reset for hero:', this.selectedHeroKey);
    }

    /**
     * Load assets and prepare textures
     */
    preload() {
        console.log('GameScene preload - Starting preload process');
        
        // Initialize audio manager
        if (!this.audioManager) {
            console.log('Initializing AudioManager in GameScene preload');
            this.audioManager = new AudioManager(this);
            this.audioManager.init();
        }
        
        // Load all map backgrounds
        this.load.image('gamemap_01', 'assets/images/backgrounds/gamemap_01.jpg');
        this.load.image('gamemap_02', 'assets/images/backgrounds/gamemap_02.jpg');
        this.load.image('gamemap_03', 'assets/images/backgrounds/gamemap_03.jpg');
        this.load.image('gamemap_04', 'assets/images/backgrounds/gamemap_04.jpg');
        
        // Load character assets - only load for the selected hero
        const heroKey = this.selectedHeroKey || 'warrior';
        console.log(`Loading assets for selected hero: ${heroKey}`);
        
        // Load the selected hero's spritesheet
        this.load.spritesheet(heroKey, `assets/images/characters/${heroKey}.png`, {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        // Load engineer class sprite sheets
        console.log('Loading Chronotemporal spritesheet');
        this.load.spritesheet('Chronotemporal', 'assets/images/characters/Chronotemporal.png', {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        console.log('Loading Voltaic spritesheet');
        this.load.spritesheet('Voltaic', 'assets/images/characters/Voltaic.png', {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        console.log('Loading Thunder Mage spritesheet');
        this.load.spritesheet('Thunder Mage', 'assets/images/characters/Thunder Mage.png', {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        console.log('Loading Sniper spritesheet');
        this.load.spritesheet('Sniper', 'assets/images/characters/Sniper.png', {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        console.log('Loading Ice Mage spritesheet');
        this.load.spritesheet('Ice Mage', 'assets/images/characters/Ice Mage.png', {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        console.log('Loading Dark Mage spritesheet');
        this.load.spritesheet('Dark Mage', 'assets/images/characters/Dark Mage.png', {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        console.log('Loading Ninja spritesheet');
        this.load.spritesheet('Ninja', 'assets/images/characters/Ninja.png', {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        console.log('Loading Shotgunner spritesheet');
        this.load.spritesheet('Shotgunner', 'assets/images/characters/Shotgunner.png', {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        console.log('Loading Goblin Trapper spritesheet');
        this.load.spritesheet('Goblin Trapper', 'assets/images/characters/Goblin Trapper.png', {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        console.log('Loading Shaman spritesheet');
        this.load.spritesheet('Shaman', 'assets/images/characters/Shaman.png', {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        console.log('Loading Holy Bard spritesheet');
        this.load.spritesheet('Holy Bard', 'assets/images/characters/Holy Bard.png', {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        console.log('Loading Shroom Pixie spritesheet');
        this.load.spritesheet('Shroom Pixie', 'assets/images/characters/Shroom Pixie.png', {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        // Load Victory UI assets
        console.log('Loading Victory UI assets');
        this.load.image('victory_panel', 'assets/images/ui/VictoryUI/reward_panel.png');
        this.load.image('item_slot', 'assets/images/ui/VictoryUI/reward_panel.png'); // Using reward_panel as fallback
        this.load.image('empty_item', 'assets/images/ui/VictoryUI/star_empty.png'); // Using star_empty as fallback
        this.load.image('continue_button', 'assets/images/ui/VictoryUI/button_next.png');
        this.load.image('button_next', 'assets/images/ui/VictoryUI/button_next.png'); // Load for new Next button
        this.load.image('menu_button', 'assets/images/ui/VictoryUI/button_menu.png');
        this.load.image('experience_icon', 'assets/images/ui/VictoryUI/star_filled.png'); // Using star_filled as fallback
        this.load.image('coin_icon', 'assets/images/ui/VictoryUI/star_filled.png'); // Using star_filled as fallback
        
        // Load example reward items - temporarily use existing assets as fallbacks
        this.load.image('item_potion', 'assets/images/ui/VictoryUI/star_filled.png');
        this.load.image('item_weapon', 'assets/images/ui/VictoryUI/star_filled.png');
        this.load.image('item_armor', 'assets/images/ui/VictoryUI/star_filled.png');
        
        // Optional star rating assets
        this.load.image('star_empty', 'assets/images/ui/VictoryUI/star_empty.png');
        this.load.image('star_filled', 'assets/images/ui/VictoryUI/star_filled.png');
        
        // Load enemy assets
        this.load.spritesheet('enemy', 'assets/images/enemies/basic_enemy.png', {
            frameWidth: 32,
            frameHeight: 32
        });
        
        // Load boss assets
        this.load.spritesheet('boss_summoner', 'assets/images/boss/boss_summoner.png', {
            frameWidth: 76, 
            frameHeight: 76
        });
        this.load.spritesheet('boss_berserker', 'assets/images/boss/boss_berserker.png', {
            frameWidth: 76, 
            frameHeight: 76
        });
        this.load.spritesheet('boss_alchemist', 'assets/images/boss/boss_alchemist.png', {
            frameWidth: 76, 
            frameHeight: 76
        });
        this.load.spritesheet('boss_lichking', 'assets/images/boss/boss_lichking.png', {
            frameWidth: 76, 
            frameHeight: 76
        });
        
        // Load combat assets
        this.load.image('bullet', 'assets/images/projectiles/particle.png');
        this.load.image('particle', 'assets/images/effects/particle.png');
        this.load.image('arrow', 'assets/images/projectiles/arrow.png');
        
        console.log('GameScene preload - Assets loaded');
    }

    /**
     * Create all game objects, systems, and set up the game world
     */
    create() {
        console.log('GameScene create - Starting game scene setup');
        console.log(`Selected hero class: ${this.selectedHeroKey}`);
        console.log("⭐⭐⭐ GameScene CREATE called ⭐⭐⭐");

        // Initialize resource manager first for other systems to use
        this.resourceManager = new ResourceManager(this);
        console.log('Resource manager initialized');

        // Create the game map - directly use imported constants 
        
        // Add background image (default to stage 1)
        this.updateBackgroundForLevel(1);
        
        // Set world bounds
        this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // Make sure title music is stopped before playing level music
        if (this.audioManager) {
            // This ensures any previous music (like title music) is completely stopped
            console.log('GameScene: Forcibly stopping any running music before level start');
            this.audioManager.stopMusic(0);
        }

        // --- Create Terrain System ---
        this.terrainSystem = new TerrainSystem(this);
        this.terrainSystem.createTerrain();

        // --- Set Hero Class ---
        const currentHeroClass = heroClasses[this.selectedHeroKey];
        if (!currentHeroClass) {
            console.warn(`Hero key "${this.selectedHeroKey}" not found, defaulting to warrior.`);
            this.selectedHeroKey = 'warrior';
        }
        
        // Verify hero class has key property that matches selection
        if (currentHeroClass && (!currentHeroClass.key || currentHeroClass.key !== this.selectedHeroKey)) {
            console.warn(`Hero class key mismatch. Selected: ${this.selectedHeroKey}, Class key: ${currentHeroClass.key}`);
            // Fix the key to match selection
            currentHeroClass.key = this.selectedHeroKey;
        }
        
        console.log('Selected hero:', this.selectedHeroKey, 'Hero class:', currentHeroClass?.name, 'Key:', currentHeroClass?.key);
        
        // --- Create Physics Groups ---
        this.createGroups();

        // --- Create Player ---
        this.createPlayer(currentHeroClass);
        
        // --- Create Camera ---
        this.setupCamera();
        
        // --- Create Systems ---
        this.createSystems();
        
        // --- Set up UI ---
        this.setupUI();
        
        // --- Create Victory UI ---
        this.victoryUI = new VictoryUI(this);

        // --- Setup Input ---
        this.setupInput();

        // --- Setup Collisions ---
        this.combatSystem.setupCollisions();
        
        // Set initial level
        this.currentLevel = 1;
        
        // Ensure audio context is unlocked by user interaction before playing music
        this.input.once('pointerdown', () => {
            console.log('User interaction detected, trying to play level music');
            this.startLevelMusic();
        });
        
        // Decide whether to show intro stories or start gameplay directly
        this.time.delayedCall(500, () => {
            if (this.skipIntroStory) {
                console.log('🚀 Game starting: Skipping intro story (already shown)');
                // Only show level 1 story if needed and start gameplay
                if (this.showLevelStory(1)) {
                    // If a story is shown, it will handle the transition to gameplay
                    console.log('Showing level 1 story only');
                } else {
                    // If no story shown, start gameplay directly
                    console.log('No level 1 story found, starting gameplay directly');
                    this.startActualGameplay();
                }
            } else {
                console.log('🚀 Game starting: First showing level0 story, then continuing to level1');
                // Show both level0 and level1 stories in sequence
                this.showInitialStories();
            }
        });
        
        console.log('GameScene create completed');
    }
    
    /**
     * Create all physics groups
     */
    createGroups() {
        // Group for followers
        this.followersGroup = this.physics.add.group({
            runChildUpdate: true
         });
        
        // Group for enemies
        this.enemies = this.physics.add.group({
            runChildUpdate: true
        });
        
        // Group for pickups
         this.pickups = this.physics.add.group({ 
            maxSize: 10
        }); 
        
        // Group for projectiles
         this.bullets = this.physics.add.group({ 
              runChildUpdate: true, 
            maxSize: 50,
            collideWorldBounds: true,
            bounceX: 0,
            bounceY: 0
        });
        
        // Group for engineer collectibles
        this.engineers = this.physics.add.group({
            maxSize: 5
        });

        // Set debug configuration if needed
        console.log("Bullets group created:", this.bullets);
        // Enable collision debug logging
        this.physics.world.on('collide', (obj1, obj2) => {
            if ((obj1.body && obj1.body.gameObject && obj1.body.gameObject.texture && obj1.body.gameObject.texture.key === 'arrow') ||
                (obj2.body && obj2.body.gameObject && obj2.body.gameObject.texture && obj2.body.gameObject.texture.key === 'arrow')) {
                console.log('Arrow collision detected between:', obj1, obj2);
            }
        });
    }
    
    /**
     * Create the player character
     * @param {object} heroClass - The selected hero class data
     */
    createPlayer(heroClass) {
        // Start player near the center of the larger world
        const startX = Math.floor(WORLD_WIDTH / 2 / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
        const startY = Math.floor(WORLD_HEIGHT / 2 / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
        
        // Validate hero class data
        if (!heroClass) {
            console.error('No hero class provided to createPlayer');
            heroClass = heroClasses['warrior']; // Fallback to warrior
        }
        
        // Ensure the hero class has the key property
        if (!heroClass.key) {
            console.warn(`Hero class ${heroClass.name} missing key property, setting to: ${this.selectedHeroKey}`);
            heroClass.key = this.selectedHeroKey;
        }
        
        // Debug logs
        console.log(`Creating player with hero class: ${heroClass.name}, texture key: ${heroClass.key}`);
        
        // Delegate to entity factory instead of directly creating Player
        if (!this.entityFactory) {
            // Create entity factory if not already available
            this.entityFactory = new EntityFactory(this);
        }
        
        // Use factory to create player
        this.player = this.entityFactory.createPlayer(startX, startY, heroClass);
        console.log('Player created at:', this.player.x, this.player.y);
        
        return this.player;
    }

    /**
     * Set up the camera to follow the player
     */
    setupCamera() {
        const camera = this.cameras.main;
        
        // Set camera bounds to match the world size
        camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // Calculate zoom to fit game canvas size
        const zoomX = GAME_WIDTH / camera.width;
        const zoomY = GAME_HEIGHT / camera.height;
        const zoom = Math.min(zoomX, zoomY);
        camera.setZoom(zoom);
        
        // Enable camera follow with smoother lerp values
        camera.startFollow(this.player, true, 0.08, 0.08);
        
        // Add a slight deadzone to prevent small movements from scrolling the camera
        camera.setDeadzone(100, 100);
        
        // Add camera fade-in effect on start
        camera.fadeIn(1000, 0, 0, 0);
        
        console.log('Camera setup with calculated zoom level:', zoom);
    }
    
    /**
     * Set up keyboard input and touch controls
     */
    setupInput() {
        // Make WASD/arrows move the player
        this.cursorKeys = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            attack: Phaser.Input.Keyboard.KeyCodes.SPACE,
            special: Phaser.Input.Keyboard.KeyCodes.SHIFT,
            chrono: Phaser.Input.Keyboard.KeyCodes.C,
            voltaic: Phaser.Input.Keyboard.KeyCodes.V,
            darkMage: Phaser.Input.Keyboard.KeyCodes.M,
            ninja: Phaser.Input.Keyboard.KeyCodes.N,
            shotgunner: Phaser.Input.Keyboard.KeyCodes.G,
            goblinTrapper: Phaser.Input.Keyboard.KeyCodes.T,
            shaman: Phaser.Input.Keyboard.KeyCodes.H,
            holyBard: Phaser.Input.Keyboard.KeyCodes.B,
            shroomPixie: Phaser.Input.Keyboard.KeyCodes.P
        });
        
        // Enable pointer input for touch/mouse
        this.input.addPointer(3); // Support up to 3 touch points
        
        // Add debug key for Chronotemporal follower
        this.chronoKey = this.input.keyboard.addKey('C');
        this.input.keyboard.on('keydown-C', () => {
            console.log('C key pressed - creating Chronotemporal follower');
            this.addChronotemporalFollower();
        });
        
        // Add debug key for Voltaic follower
        this.voltaicKey = this.input.keyboard.addKey('V');
        this.input.keyboard.on('keydown-V', () => {
            console.log('V key pressed - creating Voltaic follower');
            this.addVoltaicFollower();
        });
        
        // Add debug key for Dark Mage follower
        this.darkMageKey = this.input.keyboard.addKey('M');
        this.input.keyboard.on('keydown-M', () => {
            console.log('M key pressed - creating Dark Mage follower');
            this.addDarkMageFollower();
        });
        
        // Add debug key for Ninja follower
        this.ninjaKey = this.input.keyboard.addKey('N');
        this.input.keyboard.on('keydown-N', () => {
            console.log('N key pressed - creating Ninja follower');
            this.addNinjaFollower();
        });
        
        // Add debug key for Shotgunner follower
        this.shotgunnerKey = this.input.keyboard.addKey('G');
        this.input.keyboard.on('keydown-G', () => {
            console.log('G key pressed - creating Shotgunner follower');
            this.addShotgunnerFollower();
        });
        
        // Add debug key for Goblin Trapper follower
        this.goblinTrapperKey = this.input.keyboard.addKey('T');
        this.input.keyboard.on('keydown-T', () => {
            console.log('T key pressed - creating Goblin Trapper follower');
            this.addGoblinTrapperFollower();
        });
        
        // Add debug key for Shaman follower
        this.shamanKey = this.input.keyboard.addKey('H');
        this.input.keyboard.on('keydown-H', () => {
            console.log('H key pressed - creating Shaman follower');
            this.addShamanFollower();
        });
        
        // Add debug key for Holy Bard follower
        this.holyBardKey = this.input.keyboard.addKey('B');
        this.input.keyboard.on('keydown-B', () => {
            console.log('B key pressed - creating Holy Bard follower');
            this.addHolyBardFollower();
        });
        
        // Add debug key for Shroom Pixie follower
        this.shroomPixieKey = this.input.keyboard.addKey('P');
        this.input.keyboard.on('keydown-P', () => {
            console.log('P key pressed - creating Shroom Pixie follower');
            this.addShroomPixieFollower();
        });
        
        // Add debug keys for spawning bosses (1-4)
        this.input.keyboard.on('keydown-ONE', () => {
            if (this.gameActive && !this.gameOver) {
                console.log('Spawning Stage 1 Boss (Summoner)');
                this.spawnSystem.spawnBoss(1);
            }
        });
        
        this.input.keyboard.on('keydown-TWO', () => {
            if (this.gameActive && !this.gameOver) {
                console.log('Spawning Stage 2 Boss (Berserker)');
                this.spawnSystem.spawnBoss(2);
            }
        });
        
        this.input.keyboard.on('keydown-THREE', () => {
            if (this.gameActive && !this.gameOver) {
                console.log('Spawning Stage 3 Boss (Mad Alchemist)');
                this.spawnSystem.spawnBoss(3);
            }
        });
        
        this.input.keyboard.on('keydown-FOUR', () => {
            if (this.gameActive && !this.gameOver) {
                console.log('Spawning Stage 4 Boss (Lich King)');
                this.spawnSystem.spawnBoss(4);
            }
        });
        
        // Listen for game pause
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.gameActive && !this.gameOver) {
                console.log('Attempting to pause game (manual pause)...');
                this.gameActive = false; 
                
                if (this.physics && this.physics.world) {
                    this.physics.world.pause(); 
                    console.log('GameScene: Physics world paused.');
                }
                if (this.spawnSystem) {
                    this.spawnSystem.pauseTimers();
                    console.log('GameScene: SpawnSystem timers paused.');
                }
                if (this.player && typeof this.player.stopActions === 'function') {
                    this.player.stopActions();
                } else if (this.player) {
                    console.warn('Player.stopActions() is not a function or player is null');
                }

                // Enable input debugging when pause menu is shown
                // this.input.enableDebug(true, 0xff00ff); // Magenta for debug lines
                // console.log("Phaser Input Debugger ENABLED for GameScene");

                // TEST: Add a simple interactive rectangle to GameScene directly
                if (this.testInteractiveRect) { 
                    try { this.testInteractiveRect.destroy(); } catch(e){} 
                }
                this.testInteractiveRect = this.add.rectangle(150, 150, 100, 100, 0xff0000, 0.8)
                    .setInteractive({ useHandCursor: true })
                    .setScrollFactor(0)
                    .setDepth(9999); // Ensure it is on top
                this.testInteractiveRect.on('pointerdown', () => {
                    console.log("!!!!!!!!!! GameScene TEST RECTANGLE CLICKED !!!!!!!!!!");
                });
                console.log("GameScene: Added TEST INTERACTIVE RECTANGLE. Interactive:", this.testInteractiveRect.input.enabled);

                if (this.uiManager) {
                    this.uiManager.showPauseMenu();
                } else {
                    console.error("UIManager not available to show pause menu!");
                    // If UIManager fails, revert to active state and resume systems
                    this.gameActive = true; 
                    if (this.physics && this.physics.world) this.physics.world.resume();
                    if (this.spawnSystem) this.spawnSystem.resumeTimers();
                }
            } else if (!this.gameActive && this.uiManager && this.uiManager.isPaused) {
                console.log('Attempting to resume game via ESC from pause menu (manual resume)...');
                this.uiManager.hidePauseMenu();
                
                // Disable input debugging when menu is hidden
                // this.input.enableDebug(false);
                // console.log("Phaser Input Debugger DISABLED for GameScene");

                // Clean up the test rectangle
                if (this.testInteractiveRect) {
                    try { this.testInteractiveRect.destroy(); } catch(e){}
                    this.testInteractiveRect = null;
                }

                if (this.physics && this.physics.world) {
                    this.physics.world.resume();
                    console.log('GameScene: Physics world resumed.');
                }
                if (this.spawnSystem) {
                    this.spawnSystem.resumeTimers();
                    console.log('GameScene: SpawnSystem timers resumed.');
                }
                // Resume other systems

                this.gameActive = true;
                console.log(`[ESC Resume] GameScene.gameActive set to: ${this.gameActive}`);
            }
        });
        
        // Listen for pointer events
        this.input.on('pointerdown', (pointer) => {
            if (!this.player || !this.gameActive || this.gameOver) return;
            
            // Get target position in world coordinates, accounting for camera
            const targetPosition = new Phaser.Math.Vector2(
                pointer.worldX,
                pointer.worldY
            );
            
            if (pointer.leftButtonDown()) {
                // Left click for basic attack
                this.player.performBasicAttack(targetPosition);
            } else if (pointer.rightButtonDown()) {
                // Right click for special attack
                this.player.useSpecialAttack(this.enemies, this.helpers);
            }
        });
    }
    
    /**
     * Create and initialize all game systems
     */
    createSystems() {
        // Create follower factory
        this.followerFactory = new FollowerFactory(this);
        
        // Create movement system
        this.movementSystem = new MovementSystem(this);
        
        // Create UI manager only if it doesn't exist yet
        if (!this.uiManager) {
            this.uiManager = new UIManager(this);
        }
        
        // Create spawn system
        this.spawnSystem = new SpawnSystem(this);
        
        // Initialize wave information in the UI
        if (this.uiManager && this.spawnSystem) {
            this.uiManager.updateWaveInfo(
                this.spawnSystem.currentWave,
                this.spawnSystem.totalWaves,
                0,  // No enemies yet
                0   // No enemies yet
            );
        }
        
        // Create combat system
        this.combatSystem = new CombatSystem(this);
        
        // Create level system after UI manager (to appear on top of the UI background)
        this.levelSystem = new LevelSystem(this);
        this.levelSystem.createUI();
        this.currentLevel = this.levelSystem.currentLevel; // Sync current level
        
        // Initialize audio manager if it doesn't exist
        if (!this.audioManager) {
            console.log('Creating AudioManager in createSystems');
            this.audioManager = new AudioManager(this);
            this.audioManager.init();
        }

        // Create global/boss animations here after textures are loaded
        /* Commenting out summoner boss animation creation
        if (this.textures.exists('boss_summoner')) {
            if (!this.anims.exists('boss_summoner_walk')) {
                this.anims.create({
                    key: 'boss_summoner_walk',
                    frames: this.anims.generateFrameNumbers('boss_summoner', { start: 0, end: 3 }),
                    frameRate: 8,
                    repeat: -1
                });
                console.log('[GameScene] Created animation: boss_summoner_walk');
            }
        } else {
            console.warn('[GameScene] Texture "boss_summoner" not found during createSystems. Animation not created.');
        }
        */
    }
    
    /**
     * Set up UI elements
     */
    setupUI() {
        // Use existing UI manager instead of creating a new one
        if (!this.uiManager) {
            this.uiManager = new UIManager(this);
        }
        
        // Set initial UI values
        this.uiManager.updateScore(this.score);
        
        // Initialize stage/level display
        this.uiManager.updateLevelStageInfo(this.currentLevel);
        
        // Initialize health bar management
        this.updateHealthDisplay();
    }
    
    /**
     * Update health display
     */
    updateHealthDisplay() {
        if (!this.player || !this.uiManager) return;
        
        // Use the UI manager to update health display if needed
        this.uiManager.updateHealthDisplay(this.player.health, this.player.maxHealth);
    }
    
    /**
     * Main update loop called every frame
     * @param {number} time - Current time
     * @param {number} delta - Time since last update
     */
    update(time, delta) {
        // Skip gameplay updates if the game is over or paused
        if (this.gameOver || !this.gameActive) {
            // Even when game is paused, we still want to update UI elements
            if (this.uiManager) this.uiManager.update();
            if (!this.gameActive && !this.gameOver) {
                // console.log(`GameScene update: SKIPPING due to !gameActive (gameActive: ${this.gameActive}, gameOver: ${this.gameOver})`);
            }
            return;
        }

        // Update player and related gameplay elements
        if (this.player && this.player.active) {
            // Update player entity
        this.player.update(time, delta);
        
            // Handle input for player
        this.handleInput(time);
        
            // Update movement system
        this.movementSystem.update(time, delta);
        }

        // Update other game systems
        if (this.terrainSystem) {
            this.terrainSystem.update();
        }
        
        // Update UI
        if (this.uiManager) {
        this.uiManager.update();
        }
        
        // Update health display
        this.updateHealthDisplay();
    }
    
    /**
     * Handle player input
     * @param {number} time - Current time
     */
    handleInput(time) {
        // Handle movement input
        this.movementSystem.handleInput(this.cursorKeys);

        // Special Attack
        if (Phaser.Input.Keyboard.JustDown(this.wasd.special)) {
             this.useSpecialAttack();
        }
        
        // Basic Attack (Keyboard)
        if (Phaser.Input.Keyboard.JustDown(this.wasd.attack)) {
            this.handleBasicAttack(null);
        }
    }
    
    /**
     * Handle basic attack input
     * @param {Phaser.Input.Pointer} pointer - Mouse pointer or null for keyboard attack
     */
    handleBasicAttack(pointer) {
        let targetPosition = null;
        
        if (pointer) {
            targetPosition = {
                x: pointer.worldX,
                y: pointer.worldY
            };
        }
        
        this.player.performBasicAttack(targetPosition);
    }
    
    /**
     * Use the player's special attack
     */
    useSpecialAttack() {
        this.player.useSpecialAttack(this.enemies, this.helpers);
    }
    
    /**
     * Add experience points to level up
     * @param {number} amount - Amount of experience to add
     */
    addExperience(amount) {
        this.levelSystem.addExperience(amount);
    }
    
    /**
     * Create a projectile (delegate to combat system)
     */
    shootProjectile(x, y, dirX, dirY, texture) {
        return this.combatSystem.shootProjectile(x, y, dirX, dirY, texture);
    }
    
    /**
     * Create a poison cloud (delegates to helper but adds pooling)
     */
    createPoisonCloud(x, y, radius) {
        // If we have a resource manager, use it for particle emitters
        if (this.resourceManager) {
            return this.helpers.createPoisonCloudPooled(this, x, y, radius, this.resourceManager);
        } else {
            return this.helpers.createPoisonCloud(this, x, y, radius);
        }
    }
    
    /**
     * Create a timed explosion at the specified location
     * @param {number} x - X position
     * @param {number} y - Y position 
     * @param {number} radius - Explosion radius
     * @param {number} delay - Delay before explosion (ms)
     * @param {number} damage - Damage amount
     */
    createTimedExplosion(x, y, radius, delay, damage) {
        // If we have a resource manager, use it for graphics objects
        if (this.resourceManager) {
            return this.helpers.createTimedExplosionPooled(this, x, y, radius, delay, damage, this.resourceManager);
        } else {
            return this.helpers.createTimedExplosion(this, x, y, radius, delay, damage);
        }
    }
    
    /**
     * Handle game over state
     */
     handleGameOver() {
         if (this.gameOver) return;
        
         console.log("GAME OVER triggered");
         this.gameOver = true;
         this.physics.pause();
        
         // Stop timed events
         this.time.removeAllEvents(); 

        // Visual feedback for game over
        this.cameras.main.shake(500, 0.05);
        this.cameras.main.flash(300, 255, 0, 0);
        
        // Make sure we have the audio manager initialized
        if (!this.audioManager) {
            console.warn("AudioManager not available for game over");
            // Create one if needed
            try {
                this.audioManager = new AudioManager(this);
                this.audioManager.init();
            } catch (error) {
                console.error("Failed to initialize AudioManager:", error);
            }
        }

        // Try multiple approaches to ensure game over sound plays
        // 1. First attempt - stop current music and play game over music
        if (this.audioManager) {
            // Immediately stop any playing music
            this.audioManager.stopMusic(0);
            
            // Use a short delay to ensure the music has stopped
            this.time.delayedCall(100, () => {
                console.log("Playing game over music...");
                // For game over, we want to play once with no fade in
                this.audioManager.playMusic('gameover_music', false, 0);
            });
            
            // 2. Backup approach with longer delay in case first attempt fails
            this.time.delayedCall(500, () => {
                // Only try again if we're still in game over state
                if (this.gameOver && (!this.audioManager.currentMusic || 
                    this.audioManager.currentMusic.key !== 'gameover_music')) {
                    console.log("Retry playing game over music...");
                    this.audioManager.playMusic('gameover_music', false, 0);
                }
            });
            
            // 3. Last resort with absolute fallback beep pattern
            this.time.delayedCall(1000, () => {
                if (this.gameOver && (!this.audioManager.currentMusic || 
                    this.audioManager.currentMusic.key !== 'gameover_music')) {
                    console.log("Using last resort fallback for game over sound");
                    
                    // Play a simple beep pattern as absolute fallback
                    try {
                        this.sound.play('fallback_gameover', { volume: 0.3 });
                        this.time.delayedCall(400, () => {
                            try {
                                this.sound.play('fallback_gameover', { volume: 0.3 });
                            } catch (e) {}
                        });
                    } catch (e) {}
            }
        });
    }

        // Show Game Over UI
        this.uiManager.showGameOverScreen();
    }

    /**
     * Update level display
     */
    updateLevel(level) {
        // Update wave info and current level
        this.currentLevel = level;
        
        // Update the stage/level display
        if (this.uiManager) {
            this.uiManager.updateLevelStageInfo(level);
        }
        
        // Update the LevelSystem's level
        if (this.levelSystem) {
            this.levelSystem.currentLevel = level;
            if (this.levelSystem.levelText) {
                this.levelSystem.levelText.setText(`Level: ${level}`);
            }
        }
        
        // Check if we need to change the music (new stage)
        if (this.audioManager) {
            this.audioManager.playLevelBGM(level);
        }
        
        // Update background image for the current level
        this.updateBackgroundForLevel(level);
        
        // Adjust game difficulty based on level
        this.spawnSystem.adjustEnemySpawnRate(level);
    }

    /**
     * Show the victory UI with rewards when a level is completed
     */
    showVictoryUI() {
        // Only show if we're not in game over state
        if (this.gameOver) return;
        
        // The current level has already been incremented at this point,
        // so we need to show the completed level (current - 1)
        const completedLevel = this.currentLevel - 1;
        
        console.log(`Showing victory UI for completed level ${completedLevel}`);
        
        // Fully pause the game when showing Victory UI
        this.gameActive = false;
        this.physics.pause(); // Pause physics engine
        
        // Stop any ongoing timers that might spawn enemies
        if (this.spawnSystem) {
            this.spawnSystem.pauseTimers();
        }
        
        // Calculate rewards based on level, player performance, etc.
        const experienceReward = 100 * completedLevel;
        const coinReward = 50 * completedLevel;
        
        // Example item rewards (for demonstration)
        const itemRewards = [];
        
        // Give different items based on level
        if (completedLevel % 3 === 0) {
            // Every 3rd level gives a potion
            itemRewards.push({
                key: 'item_potion',
                name: 'Health Potion',
                description: 'Restores 50 health'
            });
        }
        
        if (completedLevel % 5 === 0) {
            // Every 5th level gives a weapon
            itemRewards.push({
                key: 'item_weapon',
                name: 'Weapon Upgrade',
                description: '+10% damage'
            });
        }
        
        if (completedLevel % 8 === 0) {
            // Every 8th level (boss levels) gives armor
            itemRewards.push({
                key: 'item_armor',
                name: 'Armor Upgrade',
                description: '+15% defense'
            });
        }
        
        // Show the UI with rewards
        this.victoryUI.show({
            experience: experienceReward,
            coins: coinReward,
            items: itemRewards
        }, completedLevel);
        
        // Apply the experience to the player
        if (this.levelSystem) {
            this.levelSystem.addExperience(experienceReward);
        }
    }
    
    /**
     * Continue to the next level after victory
     */
    continueToNextLevel() {
        console.log(`Continuing from completed level ${this.currentLevel - 1} to level ${this.currentLevel}`);
        
        // Hide the UI first
        if (this.victoryUI && this.victoryUI.visible) {
            this.victoryUI.hide();
        }
        
        // Check if there's a story to show before the next level
        // We use the current level rather than currentLevel+1 because the level
        // has already been incremented in SpawnSystem.completeLevel
        if (this.showLevelStory(this.currentLevel)) {
            // The showLevelStory method will handle the transition to the next level when the story ends
            console.log(`Showing story for level ${this.currentLevel} before starting gameplay`);
            return;
        }
        
        // If no story to show, continue directly to the next level
        this.startNextLevel();
    }
    
    /**
     * Show story dialog using RenJS before starting a level
     * @param {number} level - The level to show story for
     * @returns {boolean} - Whether a story was shown
     */
    showLevelStory(level) {
        console.log(`⭐ Checking for story content for level ${level}...`);
        
        // Skip level0 story if we've already shown it in TitleScene
        if (level === 0 && this.skipIntroStory) {
            console.log('Skipping level0 story (already shown in TitleScene)');
            return false;
        }
        
        // Add flag to track if we're coming from level0 story
        if (this.justCompletedLevel0 && level === 1) {
            console.log('Just completed level0 story, skipping level1 story for now');
            this.justCompletedLevel0 = false;
            return false;
        }
        
        // Special handling for level 1 - show intro story (level0) first
        // But only if we haven't already shown it in TitleScene
        if (level === 1 && !this.skipIntroStory) {
            console.log('🔹 Level 1 detected - attempting to show level0 intro story');
            
            // Store current level info to resume after story
            this.pendingLevel = level;
            
            // Launch story scene with level0
            try {
                console.log('🔹 Pausing GameScene to show level0 story');
                // Pause current game
                this.scene.pause();
                
                // Debug: Check if StoryScene exists
                const storySceneKey = 'StoryScene';
                if (!this.scene.get(storySceneKey)) {
                    console.error('❌ StoryScene does not exist in the scene manager!');
                    return false;
                }
                
                // First stop any existing StoryScene to ensure a clean state
                console.log('🔹 Stopping any existing StoryScene to ensure clean state');
                this.scene.stop(storySceneKey);
                
                console.log('🔹 Launching fresh StoryScene with level 0');
                // Launch story scene with level0
                this.scene.launch(storySceneKey, { 
                    level: 0, // Use level 0 for intro story
                    onComplete: () => {
                        console.log('✅ Intro story (level0) completed, starting level 1 gameplay');
                        // Set flag to indicate we just completed level0 story
                        this.justCompletedLevel0 = true;
                        this.scene.resume();
                        this.startNextLevel();
                    }
                });
                
                return true;
            } catch (error) {
                console.error('❌ Failed to show level0 intro story:', error);
                console.error('Error stack:', error.stack);
                // Fall back to regular level 1 story if level0 fails
            }
        }
        
        // Store current level info to resume after story
        this.pendingLevel = level;
        
        // Start the story scene for this level
        try {
            // Pause current game
            this.scene.pause();
            
            // First stop any existing StoryScene to ensure a clean state
            console.log('🔹 Stopping any existing StoryScene to ensure clean state');
            this.scene.stop('StoryScene');
            
            // Launch story scene
            console.log(`🔹 Launching fresh StoryScene with level ${level}`);
            this.scene.launch('StoryScene', { 
                level: level,
                onComplete: () => {
                    console.log(`Story for level ${level} completed, starting gameplay`);
                    this.scene.resume();
                    this.startNextLevel();
                }
            });
            
            return true;
        } catch (error) {
            console.error('Failed to show story:', error);
            return false;
        }
    }
    
    /**
     * Start the next level gameplay (after story or directly)
     */
    startNextLevel() {
        // Resume game systems
        this.gameActive = true;
        this.physics.resume(); // Resume physics engine
        
        // Set the level number (from pending level or increment current)
        if (this.pendingLevel) {
            // Use the pending level directly without incrementing
            this.currentLevel = this.pendingLevel;
            this.pendingLevel = null;
            console.log(`Using pending level: ${this.currentLevel}`);
        }
        // Don't increment currentLevel here as it's already been incremented in SpawnSystem.completeLevel
        // else {
        //     this.currentLevel++;
        // }
        
        console.log(`Starting gameplay for level: ${this.currentLevel}`);
        
        // Update background and music for new level
        this.updateBackgroundForLevel(this.currentLevel);
        this.startLevelMusic();
        
        // Increase player/follower stats for the new level if needed
        if (this.player) {
            // Example: Increase max health on level-up
            this.player.maxHealth += 5;
            this.player.health = this.player.maxHealth; // Heal to full
        }
        
        // Update UI to show new level
        this.updateLevel(this.currentLevel);
        
        // Reset wave counter and start new level
        if (this.spawnSystem) {
            try {
                console.log('Resuming timers and starting new level');
                this.spawnSystem.resumeTimers(); // Resume any paused timers
                this.spawnSystem.startNewLevel(this.currentLevel);
            } catch (error) {
                console.error('Error starting new level:', error);
                // Fallback approach if error occurs
                this.time.delayedCall(500, () => {
                    console.log('Fallback: Starting new level with delay');
                    this.spawnSystem.startNewLevel(this.currentLevel);
                });
            }
        }
        
        // Remove all remaining enemies
        if (this.enemies) {
            this.enemies.clear(true, true);
        }
        
        // Create a new pickup to start the level
        if (this.spawnSystem) {
            try {
                this.spawnSystem.spawnPickup();
            } catch (error) {
                console.error('Error spawning pickup:', error);
            }
        }
        
        // Ensure game is active
        console.log('Game resumed - gameActive:', this.gameActive);
    }

    /**
     * Start level music
     */
    startLevelMusic() {
        // If audio manager isn't initialized, try to initialize it
        if (!this.audioManager) {
            console.log('AudioManager not found, attempting to initialize...');
            try {
                this.audioManager = new AudioManager(this);
                this.audioManager.init();
            } catch (error) {
                console.error('Failed to initialize AudioManager:', error);
            return;
        }
        }
        
        if (!this.audioManager.initialized) {
            console.warn('Cannot play level music - audio manager not fully initialized');
            return;
        }
        
        console.log(`Starting level music for level ${this.currentLevel}`);
        
        try {
            // Use the proper method to play level-based music
            this.audioManager.playLevelBGM(this.currentLevel);
        } catch (error) {
            console.warn('Error playing level BGM:', error);
        }
    }

    /**
     * Update the background image based on the current level/stage
     * @param {number} level - Current game level
     */
    updateBackgroundForLevel(level) {
        // Directly use imported constants
        
        // Determine which background to use based on level
        let backgroundKey = 'gamemap_01';
        
        if (level >= 25) {
            backgroundKey = 'gamemap_04';  // Stage 4 (levels 25-32)
        } else if (level >= 17) {
            backgroundKey = 'gamemap_03';  // Stage 3 (levels 17-24)
        } else if (level >= 9) {
            backgroundKey = 'gamemap_02';  // Stage 2 (levels 9-16)
        }
        
        console.log(`Setting background for level ${level}: ${backgroundKey}`);
        
        // Remove previous background if it exists
        if (this.background) {
            this.background.destroy();
        }
        
        // Create new background with appropriate image
        this.background = this.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, backgroundKey);
        this.background.setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT);
        this.background.setDepth(-10); // Set a negative depth to ensure it renders below terrain
    }

    /**
     * Clean up resources on scene shutdown
     */
    shutdown() {
        super.shutdown();
        
        // Clean up pooled resources
        if (this.resourceManager) {
            console.log('Cleaning up resource manager pools');
            this.resourceManager.cleanup();
        }
    }

    /**
     * Show initial stories in the correct sequence
     * First level0, then level1
     */
    showInitialStories() {
        // Skip if we've already shown the intro story in TitleScene
        if (this.skipIntroStory) {
            console.log('🔹 Skipping intro stories (already shown in TitleScene)');
            this.startActualGameplay();
            return;
        }
        
        console.log('🔹 Starting story sequence: level0 -> level1');
        
        // First show level0 (intro)
        // Pause current game
        this.scene.pause();
        
        // First stop any existing StoryScene to ensure a clean state
        console.log('🔹 Stopping any existing StoryScene to ensure clean state');
        this.scene.stop('StoryScene');
        
        // Launch story scene with level0 explicitly
        console.log('🔹 Launching fresh StoryScene with level 0');
        this.scene.launch('StoryScene', { 
            level: 0, // Explicitly use level 0
            onComplete: () => {
                console.log('✅ Level 0 story completed, will now show level1 story');
                
                // Resume momentarily to launch level1 story
                this.scene.resume();
                
                // Wait a moment before showing level1 story
                this.time.delayedCall(100, () => {
                    // Now show level1 story
                    this.scene.pause();
                    
                    // Stop level0 StoryScene
                    console.log('🔹 Stopping level0 StoryScene');
                    this.scene.stop('StoryScene');
                    
                    console.log('🔹 Launching fresh StoryScene with level 1');
                    this.scene.launch('StoryScene', { 
                        level: 1, // Now show level 1
                        onComplete: () => {
                            console.log('✅ Level 1 story completed, resuming gameplay');
                            this.scene.resume();
                            // Start actual gameplay
                            this.startActualGameplay();
                        }
                    });
                });
            }
        });
    }
    
    /**
     * Force show level0 story at any time
     * This can be called from developer console for testing
     */
    forceShowLevel0Story() {
        console.log('🔸 FORCED: Showing level0 story');
        
        // Pause current game
        this.scene.pause();
        
        // First stop any existing StoryScene to ensure a clean state
        console.log('🔹 Stopping any existing StoryScene to ensure clean state');
        this.scene.stop('StoryScene');
        
        // Launch story scene with level0 explicitly
        console.log('🔹 Launching fresh StoryScene with level 0');
        this.scene.launch('StoryScene', { 
            level: 0, // Explicitly use level 0 for intro story
            onComplete: () => {
                console.log('✅ Level 0 story completed (forced mode)');
                // Resume the game scene
                this.scene.resume();
            }
        });
    }
    
    /**
     * Force show level1 story at any time
     * This can be called from developer console for testing
     */
    forceShowLevel1Story() {
        console.log('🔸 FORCED: Showing level1 story');
        
        // Pause current game
        this.scene.pause();
        
        // First stop any existing StoryScene to ensure a clean state
        console.log('🔹 Stopping any existing StoryScene to ensure clean state');
        this.scene.stop('StoryScene');
        
        // Launch story scene with level1 explicitly
        console.log('🔹 Launching fresh StoryScene with level 1');
        this.scene.launch('StoryScene', { 
            level: 1, // Explicitly use level 1 for story
            onComplete: () => {
                console.log('✅ Level 1 story completed (forced mode)');
                // Resume the game scene
                this.scene.resume();
            }
        });
    }
    
    /**
     * Start actual gameplay after all intro stories
     */
    startActualGameplay() {
        console.log('🎮 Starting actual gameplay');
        
        // Create first pickup
        this.spawnSystem.spawnPickup();
        
        // Start level music
        if (this.audioManager && this.audioManager.initialized) {
            this.startLevelMusic();
        }
    }
} 