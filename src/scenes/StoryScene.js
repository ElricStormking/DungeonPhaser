import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';

/**
 * Scene for displaying story dialogs between game levels
 * This version uses RenJS V2 format to load and display story content
 */
export default class StoryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StoryScene' });
        this.onCompleteCallback = null;
        this.currentActionIndex = 0;
        this.storyActions = [];
        this.characters = {};
        this.backgrounds = {};
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
        this.currentActionIndex = 0;
        
        // Stop any currently playing music from the game
        this.stopGameMusic();
    }

    /**
     * Stop any music playing in other scenes
     */
    stopGameMusic() {
        console.log('Stopping any existing game music');
        
        // Stop music in all active scenes
        const activeScenes = this.scene.manager.getScenes(true);
        activeScenes.forEach(scene => {
            // Skip our own scene
            if (scene.scene.key === 'StoryScene') return;
            
            console.log(`Checking for music in scene: ${scene.scene.key}`);
            
            // Try to access common music properties
            if (scene.music && typeof scene.music.stop === 'function') {
                console.log(`Stopping music in scene: ${scene.scene.key}`);
                scene.music.stop();
            }
            
            // Try the bgMusic property
            if (scene.bgMusic && typeof scene.bgMusic.stop === 'function') {
                console.log(`Stopping bgMusic in scene: ${scene.scene.key}`);
                scene.bgMusic.stop();
            }
            
            // Try a direct sound property
            if (scene.sound && typeof scene.sound.stopAll === 'function') {
                console.log(`Stopping all sounds in scene: ${scene.scene.key}`);
                scene.sound.stopAll();
            }
            
            // Look for AudioManager
            if (scene.audioManager && typeof scene.audioManager.stopMusic === 'function') {
                console.log(`Stopping music via AudioManager in scene: ${scene.scene.key}`);
                scene.audioManager.stopMusic();
            }
        });
        
        // As a fallback, use our scene's sound manager
        if (this.sound && typeof this.sound.stopAll === 'function') {
            // Just stop music, not all sounds
            this.stopAllMusic();
        }
    }

    /**
     * Load story assets 
     */
    preload() {
        console.log(`Preloading story assets for level ${this.level}...`);
        
        // Load config file
        this.load.json('story-config', 'assets/RenJs/RJ_levelStory/config.json');
        
        // Load character definitions
        this.load.json('characters-def', 'assets/RenJs/RJ_levelStory/characters.json');
        
        // Load background definitions
        this.load.json('backgrounds-def', 'assets/RenJs/RJ_levelStory/backgrounds.json');
        
        // Load story script for this level
        this.load.json('story-script', `assets/RenJs/RJ_levelStory/level${this.level}/yaju_script.json`);
        
        // Load textbox GUI elements
        this.load.image('textbox', 'assets/RenJs/gui/textbox.png');
        this.load.image('namebox', 'assets/RenJs/gui/namebox.png');
        
        // We'll load character and background images in create() after parsing JSON
    }
    
    /**
     * Create the story display
     */
    create() {
        console.log('Creating RenJS V2 story display');
        
        // Stop any existing game music again (in case it was started after init)
        this.stopGameMusic();
        
        // Parse config
        const config = this.cache.json.get('story-config');
        console.log('Loaded story config:', config);
        
        // Parse character definitions
        const characterDefs = this.cache.json.get('characters-def');
        console.log('Loaded character definitions:', characterDefs);
        
        // Parse background definitions
        const backgroundDefs = this.cache.json.get('backgrounds-def');
        console.log('Loaded background definitions:', backgroundDefs);
        
        // Parse story script
        const storyScript = this.cache.json.get('story-script');
        console.log('Loaded story script:', storyScript);
        
        // Create character containers first
        for (const charId in characterDefs) {
            this.characters[charId] = {
                displayName: characterDefs[charId].displayName,
                sprites: {},
                container: this.add.container(0, 0),
                currentSprite: null
            };
        }
        
        // Store story actions
        const sceneName = config.startScene;
        if (storyScript[sceneName]) {
            this.storyActions = storyScript[sceneName];
            console.log(`Loaded ${this.storyActions.length} story actions for scene ${sceneName}`);
        } else {
            console.error(`Scene ${sceneName} not found in story script`);
            this.storyActions = [];
        }
        
        // Create character container
        this.characterContainer = this.add.container(GAME_WIDTH/2, GAME_HEIGHT/2);
        
        // Add character containers to the main container
        for (const charId in this.characters) {
            this.characterContainer.add(this.characters[charId].container);
        }
        
        // Pre-load all character and background images needed for this scene
        this.preloadSceneAssets(characterDefs, backgroundDefs);
    }

    /**
     * Load assets needed for this scene specifically
     */
    preloadSceneAssets(characterDefs, backgroundDefs) {
        console.log("Preloading specific assets for this scene");
        
        // Use the global path resolver if available
        const resolvePath = window.resolveAssetPath || (path => path);
        
        // Add completion handler
        this.load.on('complete', () => {
            console.log("Assets loaded completely, creating sprites");
            this.createSprites(characterDefs, backgroundDefs);
        });
        
        // Add progress handler
        this.load.on('progress', (value) => {
            console.log(`Loading progress: ${Math.floor(value * 100)}%`);
        });

        // Add error handler for loading failures
        this.load.on('loaderror', (fileObj) => {
            console.error(`Error loading file: ${fileObj.src}`);
            console.error(`File key: ${fileObj.key}, Type: ${fileObj.type}`);
            // Create a placeholder for the missing asset
            this.createPlaceholderAsset(fileObj);
        });
        
        // Save loader reference - we'll use this to modify base URL
        const originalBaseURL = this.load.baseURL;
        this.load.baseURL = '';
        
        // Log the characters we're loading
        console.log("Character definitions to load:", characterDefs);
        
        // Create placeholder textures for all characters in case they fail to load
        for (const charId in characterDefs) {
            const character = characterDefs[charId];
            console.log(`Processing character: ${charId}, displayName: ${character.displayName}`);
            
            // Load all looks for this character
            for (const lookId in character.looks) {
                const look = character.looks[lookId];
                const imageKey = `char-${charId}-${lookId}`;
                const imageName = look.image;
                
                // Force absolute path without server prefix
                const imagePath = `./assets/RenJs/characters/${imageName}`;
                
                console.log(`Loading character image: ${imagePath} as ${imageKey}`);
                
                // Create a placeholder first in case loading fails
                this.createPlaceholderCharacter(imageKey, charId);
                
                // Now try to load the actual image with direct path
                this.load.image(imageKey, imagePath);
            }
        }
        
        // Log the backgrounds we're loading
        console.log("Background definitions to load:", backgroundDefs);
        
        // Create placeholder textures for all backgrounds in case they fail to load
        for (const bgId in backgroundDefs) {
            const background = backgroundDefs[bgId];
            const imageKey = `bg-${bgId}`;
            const imageName = background.image;
            
            // Force absolute path without server prefix
            const imagePath = `./assets/RenJs/backgrounds/${imageName}`;
            
            console.log(`Loading background image: ${imagePath} as ${imageKey}`);
            
            // Create a placeholder first in case loading fails
            this.createPlaceholderBackground(imageKey, bgId);
            
            // Now try to load the actual image with direct path
            this.load.image(imageKey, imagePath);
        }
        
        // Create dialog box UI
        this.createDialogBox();
        
        // Start the loader
        this.load.start();
        
        // Restore original base URL
        this.load.baseURL = originalBaseURL;
    }

    /**
     * Create placeholder character
     */
    createPlaceholderCharacter(key, charId) {
        console.log(`Creating placeholder for character: ${charId}`);
        
        try {
            // Use canvas for more reliable texture generation
            const width = 100;
            const height = 200;
            
            // Create a canvas
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            // Fill background
            ctx.fillStyle = '#ff00ff'; // Magenta color for missing assets
            ctx.fillRect(0, 0, width, height);
            
            // Add border
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, width, height);
            
            // Add text
            ctx.fillStyle = '#000000';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Missing', width/2, height/2 - 10);
            ctx.fillText(charId, width/2, height/2 + 10);
            
            // Create a unique placeholder key to avoid conflicts
            const placeholderKey = `placeholder-${key}-${Date.now()}`;
            
            // Check if the texture exists before adding
            if (this.textures.exists(key)) {
                console.log(`Texture ${key} already exists, using placeholder: ${placeholderKey}`);
                // Add the canvas with a different placeholder key
                this.textures.addCanvas(placeholderKey, canvas);
                return placeholderKey;
            } else {
                // Create a texture from the canvas
                this.textures.addCanvas(key, canvas);
                console.log(`Created placeholder texture for ${key} using canvas`);
                return key;
            }
        } catch (e) {
            console.error(`Error creating placeholder character: ${e.message}`);
            return null;
        }
    }

    /**
     * Create placeholder background
     */
    createPlaceholderBackground(key, bgId) {
        console.log(`Creating placeholder for background: ${bgId}`);
        
        try {
            // Use canvas for more reliable texture generation
            // Create a canvas
            const canvas = document.createElement('canvas');
            canvas.width = GAME_WIDTH;
            canvas.height = GAME_HEIGHT;
            const ctx = canvas.getContext('2d');
            
            // Fill background
            ctx.fillStyle = '#6b8cff'; // Blue color for missing backgrounds
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            
            // Add a grid pattern
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            for (let x = 0; x < GAME_WIDTH; x += 50) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, GAME_HEIGHT);
                ctx.stroke();
            }
            for (let y = 0; y < GAME_HEIGHT; y += 50) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(GAME_WIDTH, y);
                ctx.stroke();
            }
            
            // Add text
            ctx.fillStyle = '#000000';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Missing Background', GAME_WIDTH/2, GAME_HEIGHT/2 - 15);
            ctx.fillText(bgId, GAME_WIDTH/2, GAME_HEIGHT/2 + 15);
            
            // Create a unique placeholder key to avoid conflicts
            const placeholderKey = `placeholder-${key}-${Date.now()}`;
            
            // Check if the texture exists before adding
            if (this.textures.exists(key)) {
                console.log(`Texture ${key} already exists, using placeholder: ${placeholderKey}`);
                // Add the canvas with a different placeholder key
                this.textures.addCanvas(placeholderKey, canvas);
                return placeholderKey;
            } else {
                // Create a texture from the canvas
                this.textures.addCanvas(key, canvas);
                console.log(`Created placeholder texture for ${key} using canvas`);
                return key;
            }
        } catch (e) {
            console.error(`Error creating placeholder background: ${e.message}`);
            return null;
        }
    }

    /**
     * Create placeholders for missing assets
     */
    createPlaceholderAsset(fileObj) {
        const key = fileObj.key;
        
        console.log(`Creating placeholder for missing asset: ${key}`);
        
        try {
            if (key.startsWith('char-')) {
                // Extract character ID from the key (format: char-CharId-lookId)
                const parts = key.split('-');
                if (parts.length >= 2) {
                    const charId = parts[1];
                    const placeholderKey = this.createPlaceholderCharacter(key, charId);
                    
                    // Return the placeholder key so it can be used instead
                    return placeholderKey;
                }
            } else if (key.startsWith('bg-')) {
                // Extract background ID from the key (format: bg-BgId)
                const parts = key.split('-');
                if (parts.length >= 2) {
                    const bgId = parts[1];
                    const placeholderKey = this.createPlaceholderBackground(key, bgId);
                    
                    // Return the placeholder key so it can be used instead
                    return placeholderKey;
                }
            }
        } catch (e) {
            console.error(`Error in createPlaceholderAsset: ${e.message}`);
            return null;
        }
        
        return null;
    }

    /**
     * Create all sprites after assets are loaded
     */
    createSprites(characterDefs, backgroundDefs) {
        console.log("Creating sprites from loaded assets");
        
        // Directly load the known characters
        this.loadKnownCharacters();
        
        // Create character sprites
        for (const charId in characterDefs) {
            const character = characterDefs[charId];
            
            // Create sprites for all looks
            for (const lookId in character.looks) {
                const imageKey = `char-${charId}-${lookId}`;
                
                // Check if the texture exists
                if (this.textures.exists(imageKey)) {
                    console.log(`Creating sprite for ${imageKey}`);
                    const sprite = this.add.image(0, 0, imageKey);
                    sprite.visible = false;
                    this.characters[charId].sprites[lookId] = sprite;
                    this.characters[charId].container.add(sprite);
                } else {
                    console.warn(`Texture ${imageKey} does not exist, checking for placeholder`);
                    
                    // Check for placeholder texture
                    const placeholderPattern = new RegExp(`^placeholder-${imageKey}-\\d+$`);
                    const placeholderKeys = Object.keys(this.textures.list).filter(key => 
                        placeholderPattern.test(key)
                    );
                    
                    if (placeholderKeys.length > 0) {
                        const placeholderKey = placeholderKeys[0];
                        console.log(`Using placeholder: ${placeholderKey}`);
                        const sprite = this.add.image(0, 0, placeholderKey);
                        sprite.visible = false;
                        this.characters[charId].sprites[lookId] = sprite;
                        this.characters[charId].container.add(sprite);
                    } else {
                        console.error(`No texture or placeholder found for ${imageKey}`);
                    }
                }
            }
        }
        
        // Store background image keys
        for (const bgId in backgroundDefs) {
            this.backgrounds[bgId] = `bg-${bgId}`;
        }
        
        // Process the first action
        this.processNextAction();
        
        // Add click listener for advancing dialog
        this.input.on('pointerdown', () => {
            if (this.isDialogActive) {
                this.processNextAction();
            }
        });
        
        // Add keyboard listener for advancing dialog
        this.input.keyboard.on('keydown-SPACE', () => {
            if (this.isDialogActive) {
                this.processNextAction();
            }
        });
    }
    
    /**
     * Load known working characters directly
     */
    loadKnownCharacters() {
        console.log("Loading known characters directly using DOM methods");
        
        // Debug file existence
        this.debugFileExistence();
        
        // Direct loading of Lucy
        if (this.characters.Lucy) {
            this.loadCharacterWithDOM('Lucy');
        }
        
        // Direct loading of Keisha
        if (this.characters.Keisha) {
            this.loadCharacterWithDOM('Keisha');
        }
    }
    
    /**
     * Load a character using direct DOM methods to bypass Phaser loader
     */
    loadCharacterWithDOM(charId) {
        console.log(`Loading ${charId} with DOM method`);
        
        // Create HTML Image element
        const img = new Image();
        const imagePath = `assets/RenJs/characters/${charId}.png`;
        
        img.onload = () => {
            console.log(`✅ Successfully loaded ${charId} image at ${imagePath}, size: ${img.width}x${img.height}`);
            
            try {
                // Create texture directly
                if (this.textures.exists(`${charId}-dom`)) {
                    this.textures.remove(`${charId}-dom`);
                }
                
                // Add the image as a texture
                this.textures.addImage(`${charId}-dom`, img);
                console.log(`✅ Created texture ${charId}-dom`);
                
                // Create sprite with the new texture
                const sprite = this.add.image(0, 0, `${charId}-dom`);
                console.log(`✅ Created sprite for ${charId}`);
                
                // Configure the sprite
                sprite.visible = false;
                sprite.setOrigin(0.5, 0.5);
                
                // Store in character object
                if (!this.characters[charId].sprites) {
                    this.characters[charId].sprites = {};
                }
                this.characters[charId].sprites.default = sprite;
                
                // Add to container
                this.characters[charId].container.add(sprite);
                console.log(`✅ Added ${charId} sprite to container`);
                
                // Log character structure for debugging
                console.log(`Character ${charId} structure:`, this.characters[charId]);
            } catch (error) {
                console.error(`❌ Error creating sprite for ${charId}:`, error);
            }
        };
        
        img.onerror = () => {
            console.error(`❌ Failed to load ${charId} image from ${imagePath}`);
            
            // Try alternative paths
            const alternativePaths = [
                `./assets/RenJs/characters/${charId}.png`,
                `../assets/RenJs/characters/${charId}.png`,
                `/assets/RenJs/characters/${charId}.png`
            ];
            
            console.log(`Trying alternative paths for ${charId}:`, alternativePaths);
            this.tryLoadImageFromPaths(charId, alternativePaths, 0);
        };
        
        // Start loading
        console.log(`Starting to load ${charId} from ${imagePath}`);
        img.src = imagePath;
    }
    
    /**
     * Try loading image from alternative paths
     */
    tryLoadImageFromPaths(charId, paths, index) {
        if (index >= paths.length) {
            console.error(`❌ All alternative paths failed for ${charId}`);
            return;
        }
        
        const path = paths[index];
        console.log(`Trying path ${index+1}/${paths.length} for ${charId}: ${path}`);
        
        const img = new Image();
        img.onload = () => {
            console.log(`✅ Success with alternative path for ${charId}: ${path}`);
            
            try {
                // Create texture directly
                if (this.textures.exists(`${charId}-dom`)) {
                    this.textures.remove(`${charId}-dom`);
                }
                
                // Add the image as a texture
                this.textures.addImage(`${charId}-dom`, img);
                
                // Create sprite with the new texture
                const sprite = this.add.image(0, 0, `${charId}-dom`);
                
                // Configure the sprite
                sprite.visible = false;
                sprite.setOrigin(0.5, 0.5);
                
                // Store in character object
                if (!this.characters[charId].sprites) {
                    this.characters[charId].sprites = {};
                }
                this.characters[charId].sprites.default = sprite;
                
                // Add to container
                this.characters[charId].container.add(sprite);
            } catch (error) {
                console.error(`❌ Error creating sprite for ${charId} with alternative path:`, error);
            }
        };
        
        img.onerror = () => {
            console.log(`❌ Failed with path ${path} for ${charId}`);
            // Try next path
            this.tryLoadImageFromPaths(charId, paths, index + 1);
        };
        
        img.src = path;
    }
    
    /**
     * Handle setBackground action
     */
    handleSetBackground(params) {
        console.log('Setting background:', params.name);
        
        // --------- NEW: Direct background loading approach ---------
        // Skip the texture lookup and load directly
        this.loadBackgroundDirectly(params.name);
        return;
        // ----------------------------------------------------------
        
        const bgKey = this.backgrounds[params.name];
        
        if (bgKey) {
            // Remove previous background if exists
            if (this.currentBackground) {
                this.currentBackground.destroy();
            }
            
            // Try to load directly if the texture doesn't exist
            if (!this.textures.exists(bgKey)) {
                console.log(`Background texture ${bgKey} doesn't exist, loading directly`);
                this.loadBackgroundDirectly(params.name, bgKey);
                return;
            }
            
            // Create new background
            this.currentBackground = this.add.image(GAME_WIDTH/2, GAME_HEIGHT/2, bgKey);
            
            // Scale to fit screen
            const scaleX = GAME_WIDTH / this.currentBackground.width;
            const scaleY = GAME_HEIGHT / this.currentBackground.height;
            const scale = Math.max(scaleX, scaleY);
            this.currentBackground.setScale(scale);
            
            // Move to back
            this.currentBackground.setDepth(-1);
        } else {
            console.error(`Background ${params.name} not found`);
        }
    }
    
    /**
     * Load background directly using DOM methods
     */
    loadBackgroundDirectly(backgroundId, bgKey = null) {
        console.log(`🔄 Loading background directly: "${backgroundId}"`);
        
        // Create HTML Image element
        const img = new Image();
        
        // Try only PNG files - these backgrounds are only in PNG format
        const imagePaths = [
            `assets/RenJs/backgrounds/${backgroundId}.png`,
            `./assets/RenJs/backgrounds/${backgroundId}.png`
        ];
        
        console.log(`🔍 Will try these PNG paths:`, imagePaths);
        
        // Set a random key if none provided
        const textureKey = bgKey || `bg-${backgroundId}-${Date.now()}`;
        
        // Track if any image loaded successfully
        let loadSuccess = false;
        
        // Try each path
        this.tryBackgroundPaths(imagePaths, 0, textureKey, backgroundId);
    }
    
    /**
     * Try background paths one by one
     */
    tryBackgroundPaths(paths, index, textureKey, backgroundId) {
        if (index >= paths.length) {
            console.error(`❌ FAILED: All paths failed for background ${backgroundId}`);
            return;
        }
        
        const path = paths[index];
        console.log(`⏳ Trying path ${index+1}/${paths.length}: ${path}`);
        
        const img = new Image();
        
        img.onload = () => {
            console.log(`✅ SUCCESS: Background loaded from ${path} (${img.width}x${img.height})`);
            
            try {
                // Remove previous background
                if (this.currentBackground) {
                    this.currentBackground.destroy();
                }
                
                // Create a new texture or replace existing one
                if (this.textures.exists(textureKey)) {
                    this.textures.remove(textureKey);
                }
                
                // Create texture
                this.textures.addImage(textureKey, img);
                
                // Create image
                this.currentBackground = this.add.image(GAME_WIDTH/2, GAME_HEIGHT/2, textureKey);
                
                // Scale to fit
                const scaleX = GAME_WIDTH / this.currentBackground.width;
                const scaleY = GAME_HEIGHT / this.currentBackground.height;
                const scale = Math.max(scaleX, scaleY);
                this.currentBackground.setScale(scale);
                
                // Move to back
                this.currentBackground.setDepth(-1);
                
                // Log success
                console.log(`✅ Background ${backgroundId} set successfully!`);
                
                // REMOVED: Don't check for JPG version anymore
            } catch (error) {
                console.error(`❌ Error creating background:`, error);
                // Try next path on error
                this.tryBackgroundPaths(paths, index + 1, textureKey, backgroundId);
            }
        };
        
        img.onerror = () => {
            console.log(`❌ Failed to load from: ${path}`);
            // Try next path
            this.tryBackgroundPaths(paths, index + 1, textureKey, backgroundId);
        };
        
        img.src = path;
    }
    
    /**
     * Debug file existence
     */
    debugFileExistence() {
        console.log("🔍 Testing asset existence...");
        
        // Test all relevant backgrounds from backgrounds.json
        // We'll test ONLY PNG files since that's what we have
        const backgroundsToTest = ['Courtyard', 'Forest', 'Stable'];
        const characterPaths = [
            'assets/RenJs/characters/Lucy.png',
            'assets/RenJs/characters/Keisha.png'
        ];
        
        // Test each background with PNG format only
        backgroundsToTest.forEach(bgName => {
            const bgPaths = [
                `assets/RenJs/backgrounds/${bgName}.png`,
                `./assets/RenJs/backgrounds/${bgName}.png`
            ];
            
            console.log(`🔍 Testing background: ${bgName}`);
            
            // Try each path
            bgPaths.forEach(path => {
                const img = new Image();
                img.onload = () => console.log(`✅ EXISTS: ${path} (${img.width}x${img.height})`);
                img.onerror = () => console.log(`❌ MISSING: ${path}`);
                img.src = path;
                
                // Also use fetch to test
                fetch(path)
                    .then(response => {
                        if (response.ok) {
                            console.log(`✅ FETCH SUCCESS: ${path}`);
                        } else {
                            console.log(`❌ FETCH ERROR (${response.status}): ${path}`);
                        }
                    })
                    .catch(err => console.log(`❌ FETCH FAILED: ${path} - ${err.message}`));
            });
        });
        
        // Test characters
        characterPaths.forEach(path => {
            const img = new Image();
            img.onload = () => console.log(`✅ EXISTS: ${path} (${img.width}x${img.height})`);
            img.onerror = () => console.log(`❌ MISSING: ${path}`);
            img.src = path;
        });
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
        
        // Hide initially
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
     * Process the next action in the story
     */
    processNextAction() {
        if (this.currentActionIndex >= this.storyActions.length) {
            this.completeStory();
            return;
        }
        
        const action = this.storyActions[this.currentActionIndex];
        this.currentActionIndex++;
        
        // Process different action types
        if (action.setBackground) {
            this.handleSetBackground(action.setBackground);
        }
        else if (action.showCharacter) {
            this.handleShowCharacter(action.showCharacter);
        }
        else if (action.hideAllCharacters) {
            this.handleHideAllCharacters(action.hideAllCharacters);
        }
        else if (action.playMusic) {
            this.handlePlayMusic(action.playMusic);
        }
        else if (action.stopMusic) {
            this.handleStopMusic(action.stopMusic);
        }
        else if (action.say) {
            this.handleSay(action.say);
            return; // Stop processing more actions after dialog
        }
        else if (action.narrate) {
            this.handleNarrate(action.narrate);
            return; // Stop processing more actions after dialog
        }
        else if (action.wait) {
            this.handleWait(action.wait);
            return; // Stop processing more actions after wait
        }
        else if (action.endGame) {
            this.completeStory();
            return;
        }
        
        // Continue to next action immediately for non-blocking actions
        this.processNextAction();
    }
    
    /**
     * Handle showCharacter action
     */
    handleShowCharacter(params) {
        console.log('Showing character:', params);
        const character = this.characters[params.name];
        
            if (character) {
            // Hide current sprite if any
            if (character.currentSprite) {
                character.currentSprite.visible = false;
            }
            
            // Show the specified look
            const sprite = character.sprites[params.look || 'default'];
            if (sprite) {
                sprite.visible = true;
                character.currentSprite = sprite;
                
                // Position the character
                switch (params.position) {
                    case 'left':
                        character.container.x = -GAME_WIDTH/4;
                        break;
                    case 'right':
                        character.container.x = GAME_WIDTH/4;
                        break;
                    default: // center
                        character.container.x = 0;
                }
            } else {
                console.error(`Look ${params.look} not found for character ${params.name}`);
            }
        } else {
            console.error(`Character ${params.name} not found`);
        }
    }
    
    /**
     * Handle hideAllCharacters action
     */
    handleHideAllCharacters(params) {
        console.log('Hiding all characters');
        
        // Hide all character sprites
        for (const charId in this.characters) {
            const character = this.characters[charId];
            
            if (character.currentSprite) {
                character.currentSprite.visible = false;
                character.currentSprite = null;
            }
        }
    }
    
    /**
     * Handle say action
     */
    handleSay(params) {
        console.log('Character says:', params);
        const character = this.characters[params.character];
        
        if (character) {
            // Set name in the name box
            this.nameText.setText(character.displayName);
        
        // Set dialog text
            this.dialogText.setText(params.text);
            
            // Show dialog UI
            this.showDialog();
        } else {
            console.error(`Character ${params.character} not found`);
            this.processNextAction(); // Continue anyway
        }
    }
    
    /**
     * Handle narrate action
     */
    handleNarrate(text) {
        console.log('Narration:', text);
        
        // Hide name box for narration
        this.nameBox.visible = false;
        this.nameText.visible = false;
        
        // Set narration text
        this.dialogText.setText(text);
        
        // Show dialog UI
        this.showDialog();
    }
    
    /**
     * Handle wait action
     */
    handleWait(params) {
        console.log('Waiting for', params.time, 'ms');
        this.time.delayedCall(params.time, () => {
            this.processNextAction();
        });
    }
    
    /**
     * Handle playMusic action
     */
    handlePlayMusic(params) {
        console.log('Playing music:', params.name);
        
        // Stop any existing game music again, for extra safety
        this.stopGameMusic();
        
        // Normalize music name for loading
        let musicName = params.name.replace(/ /g, '_');
        
        // Special case for "Pixelated Farewell" to ensure it matches the exact filename
        if (params.name === "Pixelated Farewell") {
            musicName = "Pixelated_Farewell";
            console.log('Using exact filename match for Pixelated Farewell:', musicName);
        }
        
        // Create array of relative paths - ALWAYS use ./ to enforce local paths
        const musicPaths = [
            `./assets/RenJs/music/${musicName}.mp3`,
            `./assets/RenJs/music/${musicName}.ogg`,
            `./assets/RenJs/music/${musicName}.wav`
        ];
        
        // Log paths being tried for debugging
        console.log(`Trying to load music from local paths:`, musicPaths);
        
        // Test file existence in debug mode
        if (window.PIXEL_DEBUG) {
            this.testAudioFileExistence(musicPaths);
        }
        
        // DIRECT APPROACH: Use HTML5 Audio
        this.tryLoadAudio(musicPaths, 0, { ...params, music: musicName });
    }
    
    /**
     * Test if audio files exist (for debugging only)
     */
    testAudioFileExistence(paths) {
        console.log("🔍 Testing audio file existence...");
        
        paths.forEach(path => {
            fetch(path)
                .then(response => {
                    if (response.ok) {
                        console.log(`✅ AUDIO EXISTS: ${path}`);
                    } else {
                        console.log(`❌ AUDIO MISSING (${response.status}): ${path}`);
                    }
                })
                .catch(err => console.log(`❌ AUDIO FETCH FAILED: ${path} - ${err.message}`));
        });
    }
    
    /**
     * Try loading audio from array of paths
     */
    tryLoadAudio(paths, index, params) {
        // If we've tried all the paths, we should stop
        if (index >= paths.length) {
            console.error(`Failed to load audio after trying all formats for: ${params.music || 'unknown'}`);
            this.processNextAction();
            return;
        }
        
        const audioPath = paths[index];
        console.log(`Attempting to load audio from local path: ${audioPath}`);
        
        const audio = new Audio();
        
        // Setup event handlers
        audio.addEventListener('canplaythrough', () => {
            console.log(`Successfully loaded audio from: ${audioPath}`);
            this.playAudioElement(audio, params);
        }, { once: true });
        
        audio.addEventListener('error', (e) => {
            console.error(`Failed to load audio: ${audioPath}`, e);
            console.log(`Trying next format option (${index + 1}/${paths.length})`);
            // Try next format after a short delay
            setTimeout(() => {
                this.tryLoadAudio(paths, index + 1, params);
            }, 100);
        }, { once: true });
        
        // Start loading
        try {
            audio.src = audioPath;
            audio.load();
        } catch (error) {
            console.error(`Error setting audio source: ${error.message}`);
            // Try next format immediately on error
            this.tryLoadAudio(paths, index + 1, params);
        }
    }
    
    /**
     * Play loaded audio element
     */
    playAudioElement(audioElement, params) {
        try {
            // Stop any currently playing music
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
            }
            
            // Set up the audio element
            this.currentAudio = audioElement;
            this.currentAudio.loop = params.loop || false;
            this.currentAudio.volume = params.volume || 1.0;
            
            // Play the audio
            const playPromise = this.currentAudio.play();
            
            // Handle autoplay restrictions in browsers
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error(`Error playing audio: ${error}`);
                    // Add a play button if autoplay is blocked
                    if (error.name === 'NotAllowedError') {
                        this.addPlayButton();
                    }
                });
            }
            
            // Continue to next action
            this.processNextAction();
        } catch (error) {
            console.error(`Error with audio playback: ${error.message}`);
            this.processNextAction();
        }
    }
    
    /**
     * Debug music file existence
     */
    debugMusicFileExistence(musicName) {
        // Not using this method anymore
        return;
    }
    
    /**
     * Try loading music in alternative formats
     */
    tryAlternativeMusicFormats(params) {
        // Not using this method anymore
        this.processNextAction();
    }
    
    /**
     * Load music files sequentially
     */
    loadMusicSequentially(files, index, params, musicKey, originalBaseURL) {
        // Not using this method anymore
        this.processNextAction();
    }
    
    /**
     * Play loaded music
     */
    playLoadedMusic(params, musicKey) {
        // Not using this method anymore
        this.processNextAction();
    }
    
    /**
     * Play music that's already loaded
     */
    playMusic(params) {
        // Not using this method anymore
        this.processNextAction();
    }
    
    /**
     * Handle stopMusic action
     */
    handleStopMusic(params) {
        console.log('Stopping music');
        
        // Check if there's music playing
        if (this.currentMusic && this.currentMusic.stop) {
            // Handle Phaser sound object
            if (params.fadeOut) {
                // Fade out the music
                this.tweens.add({
                    targets: this.currentMusic,
                    volume: 0,
                    duration: params.fadeOut,
                    onComplete: () => {
                        this.currentMusic.stop();
                        this.currentMusic = null;
                    }
                });
            } else {
                // Stop immediately
                this.currentMusic.stop();
                this.currentMusic = null;
            }
        } else if (this.currentAudio) {
            // Handle HTML Audio element
            if (params.fadeOut) {
                // Fade out using a tween on a proxy object
                const audioProxy = { volume: this.currentAudio.volume };
                this.tweens.add({
                    targets: audioProxy,
                    volume: 0,
                    duration: params.fadeOut,
                    onUpdate: () => {
                        this.currentAudio.volume = audioProxy.volume;
                    },
                    onComplete: () => {
                        this.currentAudio.pause();
                        this.currentAudio.currentTime = 0;
                        this.currentAudio = null;
                    }
                });
            } else {
                // Stop immediately
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
                this.currentAudio = null;
            }
        }
    }
    
    /**
     * Complete the story and return to game
     */
    completeStory() {
        console.log('Story completed');
        this.hideDialog();
        
        // Stop any playing music when the story completes
        this.stopAllMusic();
        
        if (this.onCompleteCallback) {
            this.onCompleteCallback();
        }
        
        this.scene.stop();
    }
    
    /**
     * Stop all playing music and audio
     */
    stopAllMusic() {
        console.log('Stopping all music and audio');
        
        // Stop HTML Audio element if it exists
        if (this.currentAudio) {
            console.log('Stopping HTML Audio element');
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        
        // Also stop Phaser sound if it exists (legacy support)
        if (this.currentMusic && this.currentMusic.stop) {
            console.log('Stopping Phaser sound object');
            this.currentMusic.stop();
            this.currentMusic = null;
        }
        
        // Clear any audio buttons that might have been added
        const musicButtons = document.querySelectorAll('button[data-purpose="play-music"]');
        musicButtons.forEach(button => button.remove());
    }
    
    /**
     * Add a play button if autoplay is blocked
     */
    addPlayButton() {
        const button = document.createElement('button');
        button.textContent = 'Play Music';
        button.style.position = 'absolute';
        button.style.top = '10px';
        button.style.right = '10px';
        button.style.zIndex = '1000';
        button.dataset.purpose = 'play-music'; // Add attribute for easier selection
        button.addEventListener('click', () => {
            if (this.currentAudio) {
                this.currentAudio.play();
                button.remove();
            }
        });
        document.body.appendChild(button);
    }
} 