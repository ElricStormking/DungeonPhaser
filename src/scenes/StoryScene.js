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
        console.log('🔸 StoryScene init with data:', data);
        
        // IMPORTANT: Default to level 0 if not specified, not level 1
        if (data.level === undefined || data.level === null) {
            console.error('❌ CRITICAL ERROR: No level specified in StoryScene data! Defaulting to level 0.');
            this.level = 0;
        } else {
            this.level = data.level;
        }
        
        console.log(`🔸 StoryScene initialized with LEVEL ${this.level} - Will display level${this.level} story`);
        this.onCompleteCallback = data.onComplete || null;
        this.currentActionIndex = 0;
        
        // Initialize key properties to prevent errors
        this.storyActions = [];
        this.characters = {};
        this.backgrounds = {};
        this.isDialogActive = false;
        
        // Stop any currently playing music from the game
        try {
            this.stopGameMusic();
        } catch (e) {
            console.error("Error stopping music:", e);
        }
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
        console.log(`🔹 StoryScene preloading assets for LEVEL ${this.level}...`);
        
        // Force level to be an integer to avoid any string/number conversion issues
        const safeLevel = parseInt(this.level, 10);
        if (isNaN(safeLevel)) {
            console.error(`❌ CRITICAL ERROR: Level "${this.level}" is not a valid number!`);
            this.level = 0; // Default to level 0 on error
        } else {
            this.level = safeLevel;
        }
        
        console.log(`✅ Using LEVEL ${this.level} for story script loading`);
        
        // Load config file
        this.load.json('story-config', './assets/RenJs/RJ_levelStory/config.json');
        
        // Load character definitions
        this.load.json('characters-def', './assets/RenJs/RJ_levelStory/characters.json');
        
        // Load background definitions
        this.load.json('backgrounds-def', './assets/RenJs/RJ_levelStory/backgrounds.json');
        
        // Load story script for this level with very explicit handling
        let scriptPath = '';
        
        // Special case for level 0 (intro) - use the correct file name
        if (this.level === 0) {
            console.log('🔹 LOADING LEVEL 0 (INTRO) STORY SCRIPT');
            scriptPath = './assets/RenJs/RJ_levelStory/level0/yaju_script0.json';
            console.log(`🔹 LEVEL 0 PATH: ${scriptPath}`);
            
        } else {
            // Normal level script loading
            scriptPath = `./assets/RenJs/RJ_levelStory/level${this.level}/yaju_script${this.level}.json`;
            console.log(`🔹 LEVEL ${this.level} PATH: ${scriptPath}`);
        }
        
        // Add very explicit loading key with level number to avoid confusion
        const scriptKey = `story-script-level-${this.level}`;
        console.log(`🔹 Using key "${scriptKey}" for story script`);
        
        // Load the script with the level-specific key
        this.load.json(scriptKey, scriptPath);
        
        // Load textbox GUI elements
        this.load.image('textbox', './assets/RenJs/gui/textbox.png');
        this.load.image('namebox', './assets/RenJs/gui/namebox.png');
        
        // Add file load error handler
        this.load.on('loaderror', (fileObj) => {
            console.error(`❌ Error loading file: ${fileObj.key}, URL: ${fileObj.url}`);
        });
        
        // Add file load success handler
        this.load.on('filecomplete', (key, type, data) => {
            if (key === scriptKey) {
                console.log(`✅ Successfully loaded story script: ${key} for LEVEL ${this.level}`);
            }
        });
        
        // We'll load character and background images in create() after parsing JSON
    }
    
    /**
     * Create the story display
     */
    create() {
        console.log(`🔹 StoryScene create started for LEVEL ${this.level}`);
        
        try {
            // Stop any existing game music again (in case it was started after init)
            this.stopGameMusic();
            
            // Parse config
            const config = this.cache.json.get('story-config');
            console.log('✅ Loaded story config:', config);
            
            // Parse character definitions
            const characterDefs = this.cache.json.get('characters-def');
            console.log('✅ Loaded character definitions for:', Object.keys(characterDefs).join(', '));
            
            // Initialize the characters object before using it
            this.characters = {};
            
            // Create character containers first
            for (const charId in characterDefs) {
                this.characters[charId] = {
                    displayName: characterDefs[charId].displayName,
                    sprites: {},
                    container: this.add.container(0, 0),
                    currentSprite: null
                };
            }
            
            // Parse background definitions
            const backgroundDefs = this.cache.json.get('backgrounds-def');
            console.log('✅ Loaded background definitions for:', Object.keys(backgroundDefs).join(', '));
            
            // Test if file exists locally after initializing characters
            console.log(`🔍 Testing if Courtyard.png exists...`);
            try {
                const img = new Image();
                img.onload = () => console.log(`✅ Courtyard.png background exists`);
                img.onerror = () => console.log(`❌ Courtyard.png background is missing`);
                img.src = `./assets/RenJs/backgrounds/Courtyard.png`;
            } catch (e) {
                console.error('Error testing background image:', e);
            }
            
            // Parse story script with proper error handling
            let storyScript = null;
            let rawStoryScript = null;
            const originalLevel = this.level;
            let effectiveLevel = originalLevel; // This will be the level whose script is actually used

            const primaryScriptKey = `story-script-level-${originalLevel}`;
            console.log(`🔍 Attempting to get script for original LEVEL ${originalLevel} using key "${primaryScriptKey}"`);
            rawStoryScript = this.cache.json.get(primaryScriptKey);

            if (!rawStoryScript) {
                console.warn(`☢️ Story script for LEVEL ${originalLevel} (key: ${primaryScriptKey}) not found in cache. Attempting fallback to LEVEL 1.`);
                effectiveLevel = 1; // Fallback to level 1
                const fallbackScriptKey = `story-script-level-${effectiveLevel}`;
                rawStoryScript = this.cache.json.get(fallbackScriptKey);

                if (!rawStoryScript) {
                    console.error(`❌ Fallback script for LEVEL 1 (key: ${fallbackScriptKey}) also not found. Using emergency script.`);
                    const errorMsg = `Story for Level ${originalLevel} is missing. Fallback to Level 1 story also failed.`;
                    storyScript = {
                        actions: [
                            { type: "text", content: errorMsg },
                            { type: "endGame" }
                        ]
                    };
                } else {
                    console.log(`✅ Successfully loaded FALLBACK script for LEVEL 1 (key: ${fallbackScriptKey}) from cache. Will use this for Level ${originalLevel}.`);
                }
            } else {
                console.log(`✅ Successfully loaded script for original LEVEL ${originalLevel} (key: ${primaryScriptKey}) from cache.`);
            }

            // If storyScript is not yet set (i.e., not an emergency script from above) AND rawStoryScript exists (either original or fallback)
            if (!storyScript && rawStoryScript) {
                console.log(`Attempting to parse rawStoryScript for effective LEVEL ${effectiveLevel}:`, rawStoryScript);
                const scriptAccessKey = `yaju_script${effectiveLevel}`;

                if (rawStoryScript.scripts && rawStoryScript.scripts[scriptAccessKey]) {
                    storyScript = rawStoryScript.scripts[scriptAccessKey];
                    console.log(`SUCCESS: Parsed from rawStoryScript.scripts.${scriptAccessKey}`);
                } else if (rawStoryScript.scenes && rawStoryScript.scenes.yaju_scene) {
                    storyScript = rawStoryScript.scenes.yaju_scene;
                    console.log(`SUCCESS: Parsed from rawStoryScript.scenes.yaju_scene (used for effective level ${effectiveLevel})`);
                } else if (rawStoryScript[scriptAccessKey]) {
                    storyScript = rawStoryScript[scriptAccessKey];
                    console.log(`SUCCESS: Parsed from rawStoryScript.${scriptAccessKey}`);
                } else if (rawStoryScript.yaju_scene) {
                    storyScript = rawStoryScript.yaju_scene;
                    console.log(`SUCCESS: Parsed from rawStoryScript.yaju_scene (used for effective level ${effectiveLevel})`);
                } else if (rawStoryScript.actions && Array.isArray(rawStoryScript.actions)) {
                    storyScript = rawStoryScript; // Assumes rawStoryScript itself is the script object
                    console.log(`SUCCESS: Parsed from rawStoryScript.actions (raw script is the storyScript for effective level ${effectiveLevel})`);
                } else {
                    let foundInSubKey = false;
                    for (const keyInRaw in rawStoryScript) {
                        if (rawStoryScript[keyInRaw] && rawStoryScript[keyInRaw].actions && Array.isArray(rawStoryScript[keyInRaw].actions)) {
                            storyScript = rawStoryScript[keyInRaw];
                            console.log(`SUCCESS: Parsed from rawStoryScript.${keyInRaw}.actions (found in sub-key for effective level ${effectiveLevel})`);
                            foundInSubKey = true;
                            break;
                        }
                    }
                    if (!foundInSubKey) {
                        console.warn(`WARN: Could not find a valid script structure within rawStoryScript for effective LEVEL ${effectiveLevel}.`);
                        // storyScript remains null here, will trigger emergency script creation below.
                    }
                }

                // If after all checks, storyScript or storyScript.actions is invalid from the raw script
                if (!storyScript || !storyScript.actions || !Array.isArray(storyScript.actions)) {
                    console.error(`Error: Parsed storyScript for effective LEVEL ${effectiveLevel} is invalid or has no actions. Creating emergency script.`);
                    const errorMsg = `Script for Level ${originalLevel} was missing or invalid. Fallback to Level 1 script was also missing or invalid.`;
                    storyScript = {
                        actions: [
                            { type: "text", content: errorMsg },
                            { type: "endGame" }
                        ]
                    };
                }
            } else if (!storyScript) { // This case handles if rawStoryScript was null for both original and fallback.
                 console.error(`Critical: Both original and fallback L1 scripts were missing from cache. Using emergency script.`);
                 const criticalErrorMsg = `Story for Level ${originalLevel} is missing. Fallback to Level 1 story also failed.`;
                 storyScript = {
                     actions: [
                         { type: "text", content: criticalErrorMsg },
                         { type: "endGame" }
                     ]
                 };
            }
            
            // Store story actions directly from the parsed structure
            this.storyActions = (storyScript && Array.isArray(storyScript.actions)) ? storyScript.actions : [];
            if (this.storyActions.length === 0) {
                 console.warn(`WARN: Final storyActions array is empty for original level ${originalLevel} (effective script level ${effectiveLevel}). An error message should have been displayed if it was an emergency script.`);
            }
            console.log(`Loaded ${this.storyActions.length} story actions. Original requested level: ${originalLevel}, Effective script content from level: ${effectiveLevel}.`);
            
            // Create character container
            this.characterContainer = this.add.container(GAME_WIDTH/2, GAME_HEIGHT/2);
            
            // Add character containers to the main container
            for (const charId in this.characters) {
                this.characterContainer.add(this.characters[charId].container);
            }
            
            // Pre-load all character and background images needed for this scene
            this.preloadSceneAssets(characterDefs, backgroundDefs);
        } catch (error) {
            console.error('Error parsing story script:', error);
            storyScript = { actions: [] };
        }
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
        
        // Extract required characters from the story script for this level
        const requiredCharacters = new Set();
        
        try {
            // Get characters that are actually used in this level's story
            if (this.storyActions && Array.isArray(this.storyActions)) {
                this.storyActions.forEach(action => {
                    if ((action.type === 'show' && action.character) || 
                        (action.type === 'say' && action.character)) {
                        requiredCharacters.add(action.character);
                        console.log(`Found required character in story: ${action.character}`);
                    }
                });
            }
        } catch (e) {
            console.error("Error identifying required characters:", e);
        }
        
        console.log("Required characters for this level:", Array.from(requiredCharacters));
        
        // Create placeholder textures for all characters in case they fail to load
        for (const charId in characterDefs) {
            const character = characterDefs[charId];
            console.log(`Processing character: ${charId}, displayName: ${character.displayName}`);
            
            // Load all looks for this character
            for (const lookId in character.looks) {
                const look = character.looks[lookId];
                const imageKey = `char-${charId}-${lookId}`;
                const imageName = look.image;
                
                // Force absolute path without server prefix - use ./ to ensure local loading
                const imagePath = `./assets/RenJs/characters/${imageName}`;
                
                console.log(`Loading character image: ${imagePath} as ${imageKey}`);
                
                // Create a placeholder first in case loading fails
                this.createPlaceholderCharacter(imageKey, charId);
                
                // Now try to load the actual image with direct path
                this.load.image(imageKey, imagePath);
            }
        }
        
        // Also directly load all required characters with DOM method to ensure they work
        if (requiredCharacters.size > 0) {
            console.log("Adding direct loading for all required characters");
            // We'll load these without waiting for the load completion
            requiredCharacters.forEach(charId => {
                const directPaths = [
                    `./assets/RenJs/characters/${charId}.png`,
                    `assets/RenJs/characters/${charId}.png`,
                    `/assets/RenJs/characters/${charId}.png`
                ];
                console.log(`Setting up direct DOM loading for required character: ${charId}`);
                
                // Test if the file exists first
                this.testFileWithDOM(directPaths, 0, charId);
            });
        }
        
        // Log the backgrounds we're loading
        console.log("Background definitions to load:", backgroundDefs);
        
        // Create placeholder textures for all backgrounds in case they fail to load
        for (const bgId in backgroundDefs) {
            const background = backgroundDefs[bgId];
            const imageKey = `bg-${bgId}`;
            const imageName = background.image;
            
            // Force absolute path without server prefix - use ./ to ensure local loading
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
     * Test if a file exists using DOM Image and preload if it does
     */
    testFileWithDOM(paths, index, charId) {
        if (index >= paths.length) {
            console.error(`❌ All paths failed for character: ${charId}`);
            return;
        }
        
        const path = paths[index];
        console.log(`Testing file existence for ${charId} using path: ${path}`);
        
        const img = new Image();
        img.onload = () => {
            console.log(`✅ Character file exists: ${path} (${img.width}x${img.height})`);
            
            // File exists, now load it using DOM method
            this.preloadCharacterWithDOM(charId, path);
        };
        
        img.onerror = () => {
            console.log(`❌ Character file not found at: ${path}`);
            // Try next path
            this.testFileWithDOM(paths, index + 1, charId);
        };
        
        img.src = path;
    }
    
    /**
     * Preload a character using HTML DOM Image element
     */
    preloadCharacterWithDOM(charId, path) {
        console.log(`Preloading character with DOM: ${charId} from ${path}`);
        
        // Create an image element to load the character
        const img = new Image();
        
        img.onload = () => {
            console.log(`✅ DOM preloaded character: ${charId} (${img.width}x${img.height})`);
            
            try {
                // Create texture key that will be used by the character system
                const textureKey = `char-${charId}-default`;
                
                // Add the image as a texture if it doesn't exist
                if (!this.textures.exists(textureKey)) {
                    this.textures.addImage(textureKey, img);
                    console.log(`✅ Created texture ${textureKey} for character ${charId}`);
                } else {
                    console.log(`Texture ${textureKey} already exists`);
                }
            } catch (error) {
                console.error(`❌ Error creating texture for ${charId}:`, error);
            }
        };
        
        img.onerror = () => {
            console.error(`❌ DOM preload failed for character: ${charId} at ${path}`);
        };
        
        // Start loading
        img.src = path;
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
        
        // Ensure characters object exists
        if (!this.characters) {
            console.log("Characters object not initialized, creating it now");
            this.characters = {};
        }
        
        // Ensure character container exists
        if (!this.characterContainer) {
            console.log("Character container not initialized, creating it now");
            this.characterContainer = this.add.container(GAME_WIDTH/2, GAME_HEIGHT/2);
        }
        
        // Create dialog box UI first so it's available
        console.log("Creating dialog box UI");
        this.createDialogBox();
        
        // Extract characters needed for this level's story
        const requiredCharacters = new Set();
        
        // Ensure storyActions exists
        if (!this.storyActions) {
            console.log("Story actions not defined, creating empty array");
            this.storyActions = [];
        }
        
        // Log each character in the script and add to required set
        try {
            this.storyActions.forEach(action => {
                if ((action.type === 'show' && action.character) || 
                    (action.type === 'say' && action.character)) {
                    requiredCharacters.add(action.character);
                    console.log(`Character needed in story: ${action.character}`);
                }
            });
        } catch (e) {
            console.error("Error checking story characters:", e);
        }
        
        console.log("Required characters for this level:", Array.from(requiredCharacters));
        
        // Create character entries in the characters object for required characters 
        // if they don't exist yet
        requiredCharacters.forEach(charId => {
            if (!this.characters[charId]) {
                console.log(`Creating character object for required character: ${charId}`);
                this.characters[charId] = {
                    displayName: charId,
                    sprites: {},
                    container: this.add.container(0, 0)
                };
                this.characterContainer.add(this.characters[charId].container);
            }
        });
        
        // Initiate loading the known characters (returns promises)
        const characterLoadPromises = this.loadKnownCharacters();
        
        // Create character sprites for assets loaded via Phaser loader 
        for (const charId in characterDefs) {
            // Skip characters already handled by direct loading
            if (requiredCharacters.has(charId)) {
                console.log(`Skipping Phaser loader processing for ${charId}, already being handled as required character`);
                continue;
            }

            const character = characterDefs[charId];
            
            // Create character object if it doesn't exist yet
            if (!this.characters[charId]) {
                console.log(`Creating character object for ${charId} from characterDefs`);
                this.characters[charId] = {
                    displayName: character.displayName || charId,
                    sprites: {},
                    container: this.add.container(0, 0)
                };
                this.characterContainer.add(this.characters[charId].container);
            }
            
            // Create sprites for all looks
            for (const lookId in character.looks) {
                const imageKey = `char-${charId}-${lookId}`;
                
                // Skip if sprite already exists for this look
                if (this.characters[charId].sprites[lookId]) {
                    console.log(`Sprite for ${charId} with look ${lookId} already exists, skipping`);
                    continue;
                }
                
                // Try different possible texture keys
                const possibleTextureKeys = [
                    imageKey,
                    `${charId}-dom`,
                    `${charId}-${lookId}`,
                    `${charId}`
                ];
                
                // Find first existing texture
                const existingKey = possibleTextureKeys.find(key => this.textures.exists(key));
                
                if (existingKey) {
                    console.log(`Creating sprite for ${charId} with look ${lookId} using texture ${existingKey}`);
                    const sprite = this.add.image(0, 0, existingKey);
                    sprite.visible = false;
                    this.characters[charId].sprites[lookId] = sprite;
                    this.characters[charId].container.add(sprite);
                } else {
                    console.warn(`No texture found for ${charId} with look ${lookId}, checking for placeholder`);
                    
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
                        console.error(`No texture or placeholder found for ${imageKey}, creating emergency placeholder`);
                        
                        // Create emergency placeholder
                        const placeholderKey = this.createPlaceholderCharacter(`emergency-${charId}-${lookId}`, charId);
                        if (placeholderKey) {
                            const sprite = this.add.image(0, 0, placeholderKey);
                            sprite.visible = false;
                            this.characters[charId].sprites[lookId] = sprite;
                            this.characters[charId].container.add(sprite);
                        }
                    }
                }
            }
        }
        
        // Store background image keys
        for (const bgId in backgroundDefs) {
            this.backgrounds[bgId] = `bg-${bgId}`;
        }
        
        // Wait for essential characters loaded via DOM to be ready
        Promise.all(characterLoadPromises)
            .then(() => {
                console.log("✅ Essential characters loaded via DOM.");
                // Now that essential characters are ready, process the first action
                console.log("Starting story action processing...");
                this.processNextAction();
            })
            .catch(error => {
                console.error("❌ Error loading essential characters via DOM:", error);
                // Create emergency placeholders for required characters
                this.createEmergencyCharacterPlaceholders();
                console.log("Proceeding with story processing using placeholders...");
                this.processNextAction();
            });

        // --- Refined Input Listeners ---
        this.input.off('pointerdown'); // Remove previous listener if any
        this.input.on('pointerdown', (pointer) => {
            console.log(`Global pointer down event. Dialog active: ${this.isDialogActive}`);
            // Only advance if a dialog is currently displayed
            if (this.isDialogActive) {
                // Prevent this click from triggering other listeners immediately
                // (e.g., the dialogBox listener added in handleSay)
                // pointer.event.stopPropagation(); // Might be needed if bubbling is the issue

                this.hideDialog(); // Hides UI, sets isDialogActive = false
                // Use a small delay to prevent immediate re-processing
                this.time.delayedCall(50, () => { 
                    this.processNextAction();
                }); 
            }
        }, this);

        this.input.keyboard.off('keydown-SPACE'); // Remove previous listener if any
        this.input.keyboard.on('keydown-SPACE', (event) => {
            console.log(`Global Space key event. Dialog active: ${this.isDialogActive}`);
             // Only advance if a dialog is currently displayed
            if (this.isDialogActive) {
                // event.stopPropagation(); // Might be needed

                this.hideDialog();
                 // Use a small delay
                this.time.delayedCall(50, () => {
                    this.processNextAction();
                });
            }
        }, this);
        // --- End Refined Input Listeners ---
    }
    
    /**
     * Create emergency placeholders for essential characters if they fail to load
     */
    createEmergencyCharacterPlaceholders() {
        // Extract characters needed for the current story
        const storyCharacters = new Set();
        if (this.storyActions && Array.isArray(this.storyActions)) {
            this.storyActions.forEach(action => {
                if ((action.type === 'show' && action.character) || 
                    (action.type === 'say' && action.character)) {
                    storyCharacters.add(action.character);
                }
            });
        }
        
        // Add default essential characters 
        const essentialCharacters = ['Lucy', 'Keisha', 'Sandy', 'Jenna'];
        essentialCharacters.forEach(char => storyCharacters.add(char));
        
        console.log('🚨 Creating emergency placeholders for characters:', Array.from(storyCharacters));
        
        if (!this.characters) {
            console.log('🚨 Characters object not initialized, creating it');
            this.characters = {};
        }
        
        if (!this.characterContainer) {
            console.log('🚨 Character container not initialized, creating it');
            this.characterContainer = this.add.container(GAME_WIDTH/2, GAME_HEIGHT/2);
        }
        
        storyCharacters.forEach(charId => {
            if (!this.characters[charId] || !this.characters[charId].sprites || !this.characters[charId].sprites.default) {
                console.log(`🚨 Creating emergency placeholder for character: ${charId}`);
                
                // Create character object if it doesn't exist
                if (!this.characters[charId]) {
                    this.characters[charId] = {
                        displayName: charId,
                        sprites: {},
                        container: this.add.container(0, 0)
                    };
                    
                    // Add container to character container
                    if (this.characterContainer) {
                        this.characterContainer.add(this.characters[charId].container);
                    }
                }
                
                // Create a placeholder sprite
                const placeholderKey = this.createPlaceholderCharacter(`emergency-${charId}`, charId);
                
                if (placeholderKey) {
                    const sprite = this.add.image(0, 0, placeholderKey);
                    sprite.visible = false;
                    
                    // Add sprite to character
                    this.characters[charId].sprites.default = sprite;
                    this.characters[charId].container.add(sprite);
                }
            }
        });
    }

    /**
     * Load known working characters directly
     * @returns {Promise[]} An array of promises for character loading
     */
    loadKnownCharacters() {
        console.log("Loading known characters directly using DOM methods");
        const loadPromises = [];
        
        // Get all characters needed for current story
        const charactersNeeded = new Set();
        if (this.storyActions && Array.isArray(this.storyActions)) {
            this.storyActions.forEach(action => {
                if ((action.type === 'show' && action.character) || 
                    (action.type === 'say' && action.character)) {
                    charactersNeeded.add(action.character);
                }
            });
        }
        
        console.log("Characters needed for current story:", Array.from(charactersNeeded));
        
        // Debug file existence
        this.debugFileExistence();
        
        // Direct loading of all essential characters
        charactersNeeded.forEach(charId => {
            if (this.characters[charId]) {
                loadPromises.push(this.loadCharacterWithDOM(charId));
            } else {
                console.log(`Character object for ${charId} does not exist yet, creating it`);
                this.characters[charId] = {
                    displayName: charId,
                    sprites: {},
                    container: this.add.container(0, 0)
                };
                this.characterContainer.add(this.characters[charId].container);
                loadPromises.push(this.loadCharacterWithDOM(charId));
            }
        });
        
        // Add specific checks for Lucy, Keisha, Sandy, and Jenna as they are explicitly handled
        if (!charactersNeeded.has('Lucy') && this.characters.Lucy) {
            loadPromises.push(this.loadCharacterWithDOM('Lucy'));
        }
        
        if (!charactersNeeded.has('Keisha') && this.characters.Keisha) {
            loadPromises.push(this.loadCharacterWithDOM('Keisha'));
        }
        
        if (!charactersNeeded.has('Sandy') && this.characters.Sandy) {
            loadPromises.push(this.loadCharacterWithDOM('Sandy'));
        }
        
        if (!charactersNeeded.has('Jenna') && this.characters.Jenna) {
            loadPromises.push(this.loadCharacterWithDOM('Jenna'));
        }

        return loadPromises; // Return the array of promises
    }
    
    /**
     * Load a character using direct DOM methods to bypass Phaser loader
     */
    loadCharacterWithDOM(charId) {
        return new Promise((resolve, reject) => { // Return a Promise
            console.log(`Loading ${charId} with DOM method`);
            
            // Create HTML Image element
            const img = new Image();
            const imagePath = `assets/RenJs/characters/${charId}.png`;
            
            img.onload = () => {
                console.log(`✅ Successfully loaded ${charId} image at ${imagePath}, size: ${img.width}x${img.height}`);
                
                try {
                    // Create texture keys
                    const textureKeys = [
                        `${charId}-dom`,           // Basic DOM-loaded texture key
                        `char-${charId}-default`   // RenJs V2 format expected key
                    ];
                    
                    // Remove any existing textures with these keys
                    textureKeys.forEach(key => {
                        if (this.textures.exists(key)) {
                            this.textures.remove(key);
                        }
                    });
                    
                    // Create the textures with all required keys
                    textureKeys.forEach(key => {
                        this.textures.addImage(key, img);
                        console.log(`✅ Created texture: ${key}`);
                    });
                    
                    // Make sure character object exists
                    if (!this.characters[charId]) {
                        console.warn(`Character object for ${charId} not found, creating.`);
                        this.characters[charId] = { 
                            sprites: {}, 
                            container: this.add.container(0, 0),
                            displayName: charId // Add display name if needed
                        };
                        this.characterContainer.add(this.characters[charId].container);
                    } else if (!this.characters[charId].sprites) {
                        this.characters[charId].sprites = {};
                    }
                    
                    // Check if sprite for 'default' look already exists
                    if (this.characters[charId].sprites.default) {
                        console.log(`Default sprite for ${charId} already exists, updating texture`);
                        
                        // Update existing sprite with the new texture
                        this.characters[charId].sprites.default.setTexture(`${charId}-dom`);
                    } else {
                        // Create new sprite with the texture
                        const sprite = this.add.image(0, 0, `${charId}-dom`);
                        console.log(`✅ Created sprite for ${charId}`);
                        
                        // Configure the sprite
                        sprite.visible = false;
                        sprite.setOrigin(0.5, 0.5);
                        
                        // Store with 'default' key
                        this.characters[charId].sprites.default = sprite;
                        
                        // Add to container if not already there
                        this.characters[charId].container.add(sprite);
                    }
                    
                    // Log character structure for debugging
                    console.log(`Character ${charId} structure:`, this.characters[charId]);
                    resolve(); // Resolve the promise on success
                } catch (error) {
                    console.error(`❌ Error creating sprite for ${charId}:`, error);
                    reject(error); // Reject the promise on error
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
                // Modify tryLoadImageFromPaths to also return a promise or handle resolve/reject
                this.tryLoadImageFromPaths(charId, alternativePaths, 0)
                    .then(resolve) // Resolve if alternative path works
                    .catch(reject); // Reject if all alternatives fail
            };
            
            // Start loading
            console.log(`Starting to load ${charId} from ${imagePath}`);
            img.src = imagePath;
        });
    }
    
    /**
     * Try loading image from alternative paths
     */
    tryLoadImageFromPaths(charId, paths, index) {
        return new Promise((resolve, reject) => { // Return a Promise
            if (index >= paths.length) {
                console.error(`❌ All alternative paths failed for ${charId}`);
                reject(new Error('All alternative paths failed')); // Reject if no paths left
                return;
            }
            
            const path = paths[index];
            console.log(`Trying path ${index+1}/${paths.length} for ${charId}: ${path}`);
            
            const img = new Image();
            img.onload = () => {
                console.log(`✅ Success with alternative path for ${charId}: ${path}`);
                
                try {
                    // Create all the texture keys needed for RenJs V2 format
                    const textureKeys = [
                        `${charId}-dom`,           // Basic DOM-loaded texture key
                        `char-${charId}-default`   // RenJs V2 format expected key
                    ];
                    
                    // Remove any existing textures
                    textureKeys.forEach(key => {
                        if (this.textures.exists(key)) {
                            this.textures.remove(key);
                        }
                    });
                    
                    // Create textures with all required keys
                    textureKeys.forEach(key => {
                        this.textures.addImage(key, img);
                        console.log(`Created texture ${key} for ${charId}`);
                    });
                    
                    // Make sure character object exists
                    if (!this.characters[charId]) {
                        console.log(`Character object for ${charId} doesn't exist, creating it`);
                        this.characters[charId] = { 
                            displayName: charId,
                            sprites: {}, 
                            container: this.add.container(0, 0)
                        };
                        this.characterContainer.add(this.characters[charId].container);
                    } else if (!this.characters[charId].sprites) {
                        this.characters[charId].sprites = {};
                    }
                    
                    // Check if sprite already exists
                    if (this.characters[charId].sprites.default) {
                        console.log(`Default sprite for ${charId} already exists, updating texture`);
                        this.characters[charId].sprites.default.setTexture(`${charId}-dom`);
                    } else {
                        // Create new sprite
                        const sprite = this.add.image(0, 0, `${charId}-dom`);
                        sprite.visible = false;
                        sprite.setOrigin(0.5, 0.5);
                        
                        // Add to character
                        this.characters[charId].sprites.default = sprite;
                        
                        // Add to container
                        if (!this.characters[charId].container) {
                            this.characters[charId].container = this.add.container(0, 0);
                            this.characterContainer.add(this.characters[charId].container);
                        }
                        
                        this.characters[charId].container.add(sprite);
                        console.log(`Created and added sprite for ${charId} with look 'default'`);
                    }
                    
                    resolve(); // Resolve on success
                } catch (error) {
                    console.error(`❌ Error creating sprite for ${charId} with alternative path:`, error);
                    reject(error); // Reject on error during sprite creation
                }
            };
            
            img.onerror = () => {
                console.log(`❌ Failed with path ${path} for ${charId}`);
                // Try next path recursively, passing resolve/reject
                this.tryLoadImageFromPaths(charId, paths, index + 1)
                    .then(resolve)
                    .catch(reject);
            };
            
            // Start loading
            img.src = path;
        });
    }
    
    /**
     * Handle setBackground action
     */
    handleSetBackground(params) {
        // Extract the background name based on format
        const backgroundName = params.name || (params.setBackground ? params.setBackground.name : null);
        
        if (!backgroundName) {
            console.error('No background name provided in action:', params);
            return;
        }
        
        console.log(`Setting background: ${backgroundName}`);
        
        // --------- NEW: Direct background loading approach ---------
        // Skip the texture lookup and load directly
        this.loadBackgroundDirectly(backgroundName);
        return;
        // ----------------------------------------------------------
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
            `./assets/RenJs/backgrounds/${backgroundId}.png`,
            `assets/RenJs/backgrounds/${backgroundId}.png`
        ];
        
        // Ensure all paths are local
        const localPaths = imagePaths.map(path => this.ensureLocalPath(path));
        
        console.log(`🔍 Will try these PNG paths:`, localPaths);
        
        // Set a random key if none provided
        const textureKey = bgKey || `bg-${backgroundId}-${Date.now()}`;
        
        // Try each path
        this.tryBackgroundPaths(localPaths, 0, textureKey, backgroundId);
    }
    
    /**
     * Try background paths one by one
     */
    tryBackgroundPaths(paths, index, textureKey, backgroundId) {
        if (index >= paths.length) {
            console.error(`❌ FAILED: All paths failed for background ${backgroundId}`);
            return;
        }
        
        // Ensure path is local
        const path = this.ensureLocalPath(paths[index]);
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
        
        // Extract characters from story actions
        const storyCharacters = new Set();
        if (this.storyActions && Array.isArray(this.storyActions)) {
            this.storyActions.forEach(action => {
                if ((action.type === 'show' && action.character) || 
                    (action.type === 'say' && action.character)) {
                    storyCharacters.add(action.character);
                }
            });
        }
        
        // Test all relevant backgrounds from backgrounds.json
        // We'll test ONLY PNG files since that's what we have
        const backgroundsToTest = ['Courtyard', 'Forest', 'Stable'];
        
        // Generate character paths from story actions
        const characterPaths = [];
        storyCharacters.forEach(charName => {
            characterPaths.push(`./assets/RenJs/characters/${charName}.png`);
        });
        
        // Add default characters that are explicitly checked in loadKnownCharacters
        ['Lucy', 'Keisha', 'Sandy', 'Jenna'].forEach(charName => {
            if (!storyCharacters.has(charName)) {
                characterPaths.push(`./assets/RenJs/characters/${charName}.png`);
            }
        });
        
        console.log(`Testing existence of character files: ${characterPaths.join(', ')}`);
        
        // Test each background with PNG format only
        backgroundsToTest.forEach(bgName => {
            const bgPaths = [
                `./assets/RenJs/backgrounds/${bgName}.png`,
                `assets/RenJs/backgrounds/${bgName}.png`
            ];
            
            console.log(`🔍 Testing background: ${bgName}`);
            
            // Try each path using Image load test
            bgPaths.forEach(path => {
                const localPath = this.ensureLocalPath(path);
                const img = new Image();
                img.onload = () => console.log(`✅ EXISTS: ${localPath} (${img.width}x${img.height})`);
                img.onerror = () => console.log(`❌ MISSING: ${localPath}`);
                img.src = localPath;
                
                // Remove fetch tests as they cause server path issues
            });
        });
        
        // Test characters
        characterPaths.forEach(path => {
            const localPath = this.ensureLocalPath(path);
            console.log(`🔍 Testing character file: ${localPath}`);
            const img = new Image();
            img.onload = () => console.log(`✅ EXISTS: ${localPath} (${img.width}x${img.height})`);
            img.onerror = () => console.log(`❌ MISSING: ${localPath}`);
            img.src = localPath;
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
        // Make sure storyActions exists
        if (!this.storyActions) {
            console.error("Story actions not defined");
            this.completeStory();
            return;
        }
        
        if (this.currentActionIndex >= this.storyActions.length) {
            console.log(`Reached end of story actions (index ${this.currentActionIndex} of ${this.storyActions.length})`);
            this.completeStory();
            return;
        }
        
        const action = this.storyActions[this.currentActionIndex];
        if (!action) {
            console.error(`Action at index ${this.currentActionIndex} is undefined`);
            this.completeStory();
            return;
        }
        
        console.log(`Processing action #${this.currentActionIndex + 1}/${this.storyActions.length}:`, action);
        this.currentActionIndex++;
        
        // Handle different action formats (both direct objects and type-property based)
        if (action.type) {
            // RenJS v2 format with explicit type
            console.log(`Action type: ${action.type}`);
            
            switch (action.type) {
                case 'scene':
                    this.handleSetBackground(action);
                    break;
                case 'show':
                    this.handleShowCharacter(action);
                    break;
                case 'hide':
                    // This could be for a specific character or all characters
                    if (action.character) {
                        // Hide a specific character
                        const character = this.characters[action.character];
                        if (character && character.currentSprite) {
                            console.log(`Hiding character: ${action.character}`);
                            character.currentSprite.visible = false;
                            character.currentSprite = null;
                        }
                    } else {
                        // Hide all characters if no specific character is mentioned
                        console.log('No character specified in hide action, hiding all characters');
                        this.handleHideAllCharacters(action);
                    }
                    break;
                case 'hideAll':
                    this.handleHideAllCharacters(action);
                    break;
                case 'music':
                    if (action.action === 'play') {
                        this.handlePlayMusic(action);
                    } else if (action.action === 'stop') {
                        this.handleStopMusic(action);
                    }
                    break;
                case 'say':
                    this.handleSay(action);
                    return; // Stop processing more actions after dialog
                case 'text':
                    this.handleNarrate(action.content);
                    return; // Stop processing more actions after dialog
                case 'wait':
                    this.handleWait(action);
                    return; // Stop processing more actions after wait
                case 'endGame':
                    this.completeStory();
                    return;
                default:
                    console.warn(`Unknown action type: ${action.type}`, action);
                    break;
            }
        } 
        // Legacy format with direct properties
        else if (action.setBackground) {
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
        else {
            console.warn('Unknown action format:', action);
        }
        
        // Continue to next action immediately for non-blocking actions
        this.processNextAction();
    }
    
    /**
     * Handle showCharacter action
     */
    handleShowCharacter(params) {
        const characterName = params.character || params.name; // Handle both RenJS v2 ('character') and potential legacy ('name') format
        console.log(`Showing character: ${characterName}`, params); // Log the actual name
        
        // Initialize character if not already done
        if (!this.characters[characterName]) {
            console.log(`Character ${characterName} not initialized yet, creating it`);
            this.characters[characterName] = {
                displayName: characterName, // Use character name as display name by default
                sprites: {},
                container: this.add.container(0, 0),
                currentSprite: null
            };
            
            // Add to character container
            if (this.characterContainer) {
                this.characterContainer.add(this.characters[characterName].container);
            }
        }
        
        const character = this.characters[characterName];
        
        // Hide current sprite if any
        if (character.currentSprite) {
            character.currentSprite.visible = false;
        }
        
        // Show the specified look
        const lookName = params.look || 'default'; // Get look name
        let sprite = character.sprites[lookName]; // Access sprite using look name
        
        // If sprite doesn't exist, try different approaches to find/create it
        if (!sprite) {
            console.log(`Sprite for ${characterName} with look ${lookName} not found, trying alternatives`);
            
            // Try different texture key formats
            const possibleTextureKeys = [
                `char-${characterName}-${lookName}`,
                `${characterName}-dom`,
                `${characterName}-${lookName}`,
                `${characterName}`,
                `placeholder-char-${characterName}-${lookName}`
            ];
            
            // Find the first existing texture
            const existingTextureKey = possibleTextureKeys.find(key => this.textures.exists(key));
            
            if (existingTextureKey) {
                console.log(`Found existing texture ${existingTextureKey} for ${characterName}`);
                
                // Create a sprite with this texture
                sprite = this.add.image(0, 0, existingTextureKey);
                sprite.setOrigin(0.5, 0.5);
                
                // Add the sprite to the character
                character.sprites[lookName] = sprite;
                character.container.add(sprite);
            } else {
                // Last resort - create a placeholder
                console.error(`No texture found for character ${characterName}, creating emergency placeholder`);
                const placeholderKey = this.createPlaceholderCharacter(`emergency-${characterName}-${lookName}`, characterName);
                
                if (placeholderKey) {
                    sprite = this.add.image(0, 0, placeholderKey);
                    sprite.setOrigin(0.5, 0.5);
                    character.sprites[lookName] = sprite;
                    character.container.add(sprite);
                } else {
                    console.error(`Failed to create placeholder for ${characterName}`);
                    return; // Skip the rest if we can't create a sprite
                }
            }
        }
        
        // Apply transition if specified
        if (params.transition === 'fadeIn' && this.tweens) {
            sprite.alpha = 0;
            sprite.visible = true;
            
            this.tweens.add({
                targets: sprite,
                alpha: 1,
                duration: params.transitionDuration || 300
            });
        } else {
            // Show sprite immediately
            sprite.visible = true;
            sprite.alpha = 1;
        }
        
        // Update the current sprite reference
        character.currentSprite = sprite;
        
        // Position the character
        const position = params.position || 'center'; // Get position
        console.log(`[${characterName}] Setting position to: ${position}`); // Log position
        switch (position) {
            case 'left':
                character.container.x = -GAME_WIDTH/4;
                break;
            case 'right':
                character.container.x = GAME_WIDTH/4;
                break;
            default: // center
                character.container.x = 0;
        }
        
        console.log(`Successfully showed ${characterName} look ${lookName} at ${position}`);
    }
    
    /**
     * Handle hideAllCharacters action
     */
    handleHideAllCharacters(params) {
        console.log('Hiding all characters:', params);
        
        // Get transition type if specified
        const transition = params.transition || 
                          (params.hideAllCharacters ? params.hideAllCharacters.transition : null);
        
        // Log the transition if specified
        if (transition) {
            console.log(`Using transition: ${transition}`);
        }
        
        // Hide all character sprites
        for (const charId in this.characters) {
            const character = this.characters[charId];
            
            if (character.currentSprite) {
                if (transition === 'fadeOut' && this.tweens) {
                    // Use a fade out transition
                    this.tweens.add({
                        targets: character.currentSprite,
                        alpha: 0,
                        duration: params.transitionDuration || 300,
                        onComplete: () => {
                character.currentSprite.visible = false;
                            character.currentSprite.alpha = 1; // Reset alpha for future use
                character.currentSprite = null;
                        }
                    });
                } else {
                    // Immediately hide
                    character.currentSprite.visible = false;
                    character.currentSprite = null;
                }
            }
        }
    }
    
    /**
     * Handle say action
     */
    handleSay(params) {
        console.log('Handle say:', params);
        
        // Extract character and text based on format
        const character = params.character || (params.say ? params.say.character : null);
        // Determine which property contains the text (can be content or text)
        const dialogText = params.text || params.content || 
                         (params.say ? (params.say.text || params.say.content) : null);
        
        if (!dialogText) {
            console.error('No dialog text found in say action', params);
            this.processNextAction();
            return;
        }
        
        if (!character) {
            console.warn('No character specified for dialog, using narration style');
            this.handleNarrate(dialogText);
            return;
        }

        console.log(`Character "${character}" says: "${dialogText}"`);
        
        // Show the dialog
        this.dialogText.setText(dialogText);
        
        // Get the display name from character definitions if available
        let displayName = character;
        
        // Try to get the proper display name
        if (this.characters[character]) {
            // If we have a character object, get its displayName
            displayName = this.characters[character].displayName || character;
        }
        
        // Set the display name in the dialog
        console.log(`Using display name "${displayName}" for character "${character}"`);
        this.nameText.setText(displayName);
            
        // Make sure dialog UI is created before showing
        if (!this.dialogBox) {
            console.warn('Dialog box not created yet, creating it now');
            this.createDialogBox();
        }
        
        this.showDialog();
        
        // --- Add Local Input Handler using .once() ---
        // Remove any previous listener first (safety) 
        this.input.off('pointerdown', this.advanceDialog, this); 
        this.input.keyboard.off('keydown-SPACE', this.advanceDialog, this);

        // Add .once listeners for this specific dialog instance
        console.log('Adding .once input listeners for advanceDialog');
        this.input.once('pointerdown', this.advanceDialog, this);
        this.input.keyboard.once('keydown-SPACE', this.advanceDialog, this);
        // --- End Local Input Handler ---

        // Note: We don't call processNextAction here; the advanceDialog method will do it.
    }
    
    // New helper function to advance dialog
    advanceDialog(event) {
        console.log('advanceDialog called by input.');

        // Check if dialog is actually active (safety check)
        if (!this.isDialogActive) {
            console.log('advanceDialog called but dialog not active, ignoring.');
            return; 
        }

        // Stop propagation to prevent global listeners from firing immediately
        if (event && typeof event.stopPropagation === 'function') {
             console.log('Stopping event propagation in advanceDialog');
             event.stopPropagation();
        } else {
            // For keyboard events or if event is missing
             console.log('Input event object missing or has no stopPropagation method.');
        }

        // Remove listeners now that dialog is advancing (safety measure, .once should handle it)
        this.input.off('pointerdown', this.advanceDialog, this);
        this.input.keyboard.off('keydown-SPACE', this.advanceDialog, this);

        // Hide dialog
        this.hideDialog();

        // Process next action (keeping the small delay)
        this.time.delayedCall(50, () => {
            this.processNextAction();
        });
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
     * Handle music playback
     */
    handlePlayMusic(params) {
        console.log('Handle play music:', params);
        
        // Get the music name
        const musicName = params.name;
        if (!musicName) {
            console.error('No music name provided in music action', params);
            this.processNextAction();
            return;
        }
        
        // === OPTIMIZATION FOR DIRECT GAME MUSIC PATHS ===
        // Check if this is one of the direct game music paths (e.g., 'stage1')
        const gameMusic = ['stage1', 'stage2', 'stage3', 'stage4', 'title_theme', 'map_theme', 'chat_theme', 'victory_theme', 'game_over'];
        if (gameMusic.includes(musicName)) {
            console.log(`Recognized game music: ${musicName}, loading directly from assets/audio/music folder`);
            // Try to play directly from the game's audio folder
            const audioPath = `assets/audio/music/${musicName}.mp3`;
            
            // Create audio element
            const audio = new Audio(audioPath);
            audio.volume = params.volume !== undefined ? params.volume : 1.0;
            audio.loop = params.loop !== undefined ? params.loop : true;
            
            // Handle loading
            audio.onloadeddata = () => {
                console.log(`✅ Successfully loaded game music: ${musicName}`);
                
                // Stop any existing music
                this.stopAllMusic();
                
                // Store for later cleanup
                this.currentAudio = audio;
                
                // Play the audio
                const playPromise = audio.play();
                if (playPromise) {
                    playPromise.catch(error => {
                        console.error(`❌ Error playing game music ${musicName}:`, error);
                        this.addPlayButton(); // Add a play button as fallback
                    });
                }
                
                // Continue to next action
                this.processNextAction();
            };
            
            // Handle errors
            audio.onerror = (error) => {
                console.error(`❌ Error loading game music ${musicName}:`, error);
                // Add a play button as fallback
                this.addPlayButton();
                // Continue to next action
                this.processNextAction();
            };
            
            // Start loading
            return;
        }
        
        // === ORIGINAL RenJS MUSIC LOADING LOGIC ===
        console.log(`Attempting to load music '${musicName}' directly using HTML5 Audio.`);
        this.loadAudioDirectly(params); 
        // We will let loadAudioDirectly handle calling processNextAction on success/failure/autoplay block.
        // So we don't call it here.
    }
    
    /**
     * Test if audio files exist (for debugging only)
     */
    testAudioFileExistence(paths) {
        console.log("🔍 Testing audio file existence...");
        
        // For debugging purposes only - log the paths we're going to try
        paths.forEach(path => {
            console.log(`Will try to load: ${path}`);
        });
    }
    
    /**
     * Load music files sequentially
     * @param {Array} files - Array of file paths to try
     * @param {number} index - Current index in the files array
     * @param {Object} params - Parameters for audio playback
     * @param {string} musicKey - Key for caching the music in Phaser
     */
    loadMusicSequentially(files, index, params, musicKey) {
        if (index >= files.length) {
            console.error(`Failed to load music file ${params.name} after trying all formats.`);
            // Try direct HTML5 Audio as last resort
            console.log("Phaser audio loading failed, trying HTML5 Audio directly");
            this.loadAudioDirectly(params);
            return;
        }
        
        let filePath = files[index]; // <-- filePath comes from the 'files' array
        console.log(`Trying to load music file (${index + 1}/${files.length}): ${filePath}`);
        console.log(`Original filePath for ${musicKey}: ${filePath}`);
        
        // Explicitly ensure the path is relative before loading
        filePath = this.ensureRelativePath(filePath);
        console.log(`Cleaned filePath for ${musicKey}: ${filePath}`);

        // Clear previous listeners if any
        this.load.off('complete', null, this);
        
        // Setup success and failure handlers
        this.load.once('filecomplete-audio-' + musicKey, () => {
            console.log(`✅ Successfully loaded music: ${filePath}`);
            this.playLoadedMusic(params, musicKey);
        });
        
        this.load.once('loaderror', (fileObj) => {
            if (fileObj.key === musicKey) {
                console.log(`❌ Error loading music file: ${filePath}`);
                // Try the next format
                this.loadMusicSequentially(files, index + 1, params, musicKey);
            }
        });
        
        // Start loading - just use the path directly
        try {
            this.load.audio(musicKey, filePath);
            console.log(`Starting load with cleaned path: ${filePath}`);
            this.load.start();
        } catch (e) {
            console.error(`Exception loading music: ${e.message}`);
            // Try next format
            this.loadMusicSequentially(files, index + 1, params, musicKey);
        }
    }
    
    /**
     * Play loaded music
     * @param {Object} params - Music playback parameters
     * @param {string} musicKey - Key for the loaded music
     */
    playLoadedMusic(params, musicKey) {
        // Stop any currently playing music
        this.stopAllMusic();
        
        // Create music object
        try {
            const music = this.sound.add(musicKey, {
                loop: params.loop !== undefined ? params.loop : true,
                volume: params.volume !== undefined ? params.volume : 1.0
            });
            
            console.log(`Playing music: ${params.name}, loop: ${music.loop}, volume: ${music.volume}`);
        
            // Use a try-catch block with Promise handling for modern browsers
            try {
                const playPromise = music.play();
                
                if (playPromise && typeof playPromise.then === 'function') {
                    playPromise
                        .then(() => {
                            console.log(`Phaser music playback started successfully`);
                            // Store reference to stop later
                            this.currentMusic = music;
                            // Continue to next action
                            this.processNextAction();
                        })
                        .catch(error => {
                            console.error(`Error playing music with Phaser: ${error}`);
                            
                            // Try fallback with HTML5 Audio element
                            console.log("Trying direct HTML5 Audio method as fallback");
                            this.loadAudioDirectly(params);
                        });
                } else {
                    // For older Phaser versions that don't return promises
                    console.log(`Phaser music started (legacy mode)`);
                    this.currentMusic = music;
                    this.processNextAction();
                }
            } catch (e) {
                console.error(`Exception playing music: ${e.message}`);
                
                // Try fallback with HTML5 Audio element
                console.log("Trying direct HTML5 Audio method as fallback");
                this.loadAudioDirectly(params);
                }
        } catch (e) {
            console.error(`Error creating music: ${e.message}`);
            
            // Try fallback with HTML5 Audio element
            console.log("Trying direct HTML5 Audio method as fallback");
            this.loadAudioDirectly(params);
        }
    }
    
    /**
     * Try loading audio directly with HTML5 Audio 
     * @param {Object} params - Audio parameters
     * @param {number} index - Index for format to try
     */
    loadAudioDirectly(params, index = 0) {
        // If we've tried all formats, give up and continue the story
        if (index >= 3) {
            console.error(`Failed to load audio directly after trying all formats`);
            console.log("Could not play audio, continuing story");
            // Add a play button anyway as a last resort
            window.userHasInteracted = false; // Force button to appear
            this.addPlayButton();
            this.processNextAction();
            return;
        }
        
        // Get file extension based on index
        const formats = ['mp3', 'ogg', 'wav'];
        // Use underscore version of name
        const name = params.name.replace(/\s+/g, '_');
        
        const format = formats[index];
        
        // ONLY try the specified path
        const path = `assets/RenJs/music/${name}.${format}`;
        
        console.log(`Trying direct audio loading: ${path}`);
        
        // Create new audio element
        const audio = new Audio();
        let loaded = false;
        
        // Set up success handler
        audio.oncanplaythrough = () => {
            if (loaded) return;
            loaded = true;
            
            console.log(`✅ Successfully loaded audio directly: ${path}`);
            
            // Play the audio
            audio.loop = params.loop !== undefined ? params.loop : true;
            audio.volume = params.volume !== undefined ? params.volume : 1.0;
            
            // Store for later stopping
            this.currentAudio = audio;
            
            try {
                const playPromise = audio.play();
                
                if (playPromise && typeof playPromise.then === 'function') {
                    playPromise
                        .then(() => {
                            console.log(`Audio playback started for ${name}`);
                            // Continue with story
                            this.processNextAction();
                        })
                        .catch(error => {
                            console.error(`Error playing audio: ${error.message}`);
                            
                            // Check if this was an autoplay policy failure
                            if (error.name === 'NotAllowedError') {
                                console.log("Autoplay blocked by browser, adding play button");
                                // Store the audio globally so button can access it
                                window.pendingAudio = audio;
                                // Add a play button for user interaction
                                this.addPlayButton();
                                // Continue with story
                                this.processNextAction();
                            } else {
                                // For other errors, try next format
                                this.loadAudioDirectly(params, index + 1);
                            }
                        });
                } else {
                    // Older browsers might not support promises
                    console.log(`Audio started (legacy mode)`);
                    this.processNextAction();
                }
            } catch (e) {
                console.error(`Exception when playing audio: ${e}`);
                // Add a play button as fallback
                window.pendingAudio = audio;
                this.addPlayButton();
                this.processNextAction();
            }
        };
        
        // Set up error handler
        audio.onerror = () => {
            console.log(`❌ Failed to load audio format ${format}: ${path}`);
            // Try next format
            this.loadAudioDirectly(params, index + 1);
        };
        
        // Try to load using simple relative path
        try {
            audio.src = path;
            audio.load();
        } catch (e) {
            console.error(`Exception when loading audio: ${e}`);
            this.loadAudioDirectly(params, index + 1);
        }
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
        // Check if the user has already interacted with the page
        if (window.userHasInteracted) {
            console.log("User has already interacted, no need for play button");
            return;
        }
        
        // Remove any existing buttons first
        const existingButtons = document.querySelectorAll('button[data-purpose="play-music"]');
        existingButtons.forEach(button => button.remove());
        
        // Create a new styled button
        const button = document.createElement('button');
        button.textContent = '▶ Play Music';
        button.dataset.purpose = 'play-music'; // Add attribute for easier selection
        
        // Style the button
        Object.assign(button.style, {
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: '1000',
            padding: '8px 16px',
            backgroundColor: '#4a90e2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        });
        
        // Add hover effect
        button.onmouseover = () => {
            button.style.backgroundColor = '#357ae8';
        };
        button.onmouseout = () => {
            button.style.backgroundColor = '#4a90e2';
        };
        
        // Add click handler
        button.addEventListener('click', () => {
            // Set flag that user has interacted with the page
            window.userHasInteracted = true;
            
            // Play current audio if it exists
            if (this.currentAudio) {
                this.currentAudio.play()
                    .then(() => {
                        console.log('Audio playback started by user interaction');
                        button.remove();
                    })
                    .catch(err => {
                        console.error('Still failed to play audio:', err);
                    });
            }
            
            // Also try to play any pending audio stored in window
            if (window.pendingAudio) {
                window.pendingAudio.play()
                    .then(() => {
                        console.log('Pending audio playback started');
                        window.pendingAudio = null;
                        button.remove();
                    })
                    .catch(err => {
                        console.error('Failed to play pending audio:', err);
                    });
            }
        });
        
        // Add to document
        document.body.appendChild(button);
        console.log("Play button added to DOM");
    }
    
    /**
     * Ensure a path is a local file path without server prefixes
     * @param {string} path - Path to sanitize
     * @returns {string} - Sanitized local path
     */
    ensureLocalPath(path) {
        if (!path) return path;
        
        // Remove server and port references more aggressively
        let localPath = path
            .replace(/^https?:\/\/[^\/]+\//, './') // Remove http(s)://domain.com/
            .replace(/:[0-9]+\//, '/') // Remove :port/
            .replace(/^\//, './'); // Replace leading / with ./
        
        // Remove any localhost or 127.0.0.1 references
        localPath = localPath
            .replace(/^(https?:\/\/)?(localhost|127\.0\.0\.1)(:[0-9]+)?\//, './');
            
        // Remove any remaining server port references (like :5500)
        localPath = localPath.replace(/:[0-9]+\//g, '/');
        
        // Make sure it starts with ./ or assets/
        if (!localPath.startsWith('./') && !localPath.startsWith('assets/')) {
            localPath = './' + localPath.replace(/^\.*\/+/, '');
        }
        
        // Final check to remove any multiple slashes
        localPath = localPath.replace(/\/+/g, '/');
        
        // If it doesn't start with ./ now, add it
        if (!localPath.startsWith('./')) {
            localPath = './' + localPath;
        }
        
        return localPath;
    }

    // Helper function to ensure path is relative
    ensureRelativePath(url) {
        if (!url) return url;
        // Remove potential http/https prefix and server/port
        let relativePath = url.replace(/^(?:https?:)?\/\/[^\/]+/, ''); 
        // Ensure it starts with './' if it starts with '/'
        if (relativePath.startsWith('/') && !relativePath.startsWith('//')) {
             relativePath = '.' + relativePath;
        }
        // Or ensure it starts with './' if it doesn't start with './' or '../'
        else if (!relativePath.startsWith('./') && !relativePath.startsWith('../')) {
             // Check if it looks like a path segment (e.g., 'assets/...')
             if (!relativePath.includes(':') && !relativePath.startsWith('/')) { 
                 relativePath = './' + relativePath;
             }
        }
        // Simple check: if it still contains ':', it might be wrong
        if (relativePath.includes(':')) {
            console.warn(`Path might still be absolute after cleaning: ${relativePath}`);
            // Attempt a more aggressive cleanup if needed, e.g., find 'assets/'
             const assetsIndex = relativePath.indexOf('assets/');
             if (assetsIndex !== -1) {
                relativePath = './' + relativePath.substring(assetsIndex);
             }
        }
        return relativePath;
    }
} 