import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';
import TitleScene from './scenes/TitleScene.js';
import GameScene from './scenes/GameScene.js';
import StoryScene from './scenes/StoryScene.js';

// Configure the game
const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: GAME_HEIGHT
    },
    backgroundColor: '#222222',
    parent: 'game-container',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false // Set to true for collision debugging
        }
    },
    // Add loader configuration to fix server path issues
    loader: {
        baseURL: './', // Set explicit base URL to use relative paths
        crossOrigin: 'anonymous',
        maxParallelDownloads: 32,
        path: '' // Empty path to prevent automatic path additions
    },
    scene: [TitleScene, GameScene, StoryScene] // Add scenes here
};

// Initialize the game when the window loads
window.onload = function() {
    // Remove any server port from document's base URL
    const removeServerPortFromPaths = () => {
        // Create a global interceptor for all URL resolutions
        window.resolveAssetPath = function(url) {
            if (!url) return url;
            // Remove server port and ensure proper relative path
            return url.replace(/https?:\/\/[^\/]+\//, './')
                     .replace(/:[0-9]+\//, '/')
                     .replace(/^\//, './');
        };
        
        // Override XMLHttpRequest to clean URLs
        const originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function() {
            if (arguments[1] && typeof arguments[1] === 'string') {
                arguments[1] = window.resolveAssetPath(arguments[1]);
            }
            return originalXHROpen.apply(this, arguments);
        };
        
        // Override fetch to clean URLs
        const originalFetch = window.fetch;
        window.fetch = function() {
            if (arguments[0] && typeof arguments[0] === 'string') {
                arguments[0] = window.resolveAssetPath(arguments[0]);
            }
            return originalFetch.apply(this, arguments);
        };
        
        // Patch Phaser's path resolver to avoid server-prefixed paths
        const originalGetURL = Phaser.Loader.FileTypesManager.getURL;
        Phaser.Loader.FileTypesManager.getURL = function(file, url) {
            const result = originalGetURL.call(this, file, url);
            return window.resolveAssetPath(result);
        };
        
        // Patch Image loading
        const originalAddImage = Phaser.Loader.FileTypes.ImageFile.prototype.load;
        Phaser.Loader.FileTypes.ImageFile.prototype.load = function() {
            if (this.src && typeof this.src === 'string') {
                this.src = window.resolveAssetPath(this.src);
            }
            return originalAddImage.call(this);
        };
        
        // Patch Audio element creation
        const originalAddAudio = Phaser.Loader.FileTypes.AudioFile.prototype.load;
        Phaser.Loader.FileTypes.AudioFile.prototype.load = function() {
            // Ensure src URLs are cleaned
            if (this.src && Array.isArray(this.src)) {
                this.src = this.src.map(url => {
                    if (typeof url === 'string') {
                        return window.resolveAssetPath(url);
                    }
                    return url;
                });
            }
            return originalAddAudio.call(this);
        };
        
        // Patch JSON loading
        const originalAddJSON = Phaser.Loader.FileTypes.JSONFile.prototype.load;
        Phaser.Loader.FileTypes.JSONFile.prototype.load = function() {
            if (this.src && typeof this.src === 'string') {
                this.src = window.resolveAssetPath(this.src);
            }
            return originalAddJSON.call(this);
        };
        
        // Patch Sprite loading
        const originalAddSpritesheet = Phaser.Loader.FileTypes.SpriteSheetFile.prototype.load;
        Phaser.Loader.FileTypes.SpriteSheetFile.prototype.load = function() {
            if (this.src && typeof this.src === 'string') {
                this.src = window.resolveAssetPath(this.src);
            }
            return originalAddSpritesheet.call(this);
        };
        
        // Log what we've done
        console.log('Patched all asset loading to prevent server-prefixed paths');
    };
    
    console.log('Creating Phaser game instance...');
    try {
        // Apply path fix before creating game
        removeServerPortFromPaths();
        
        const game = new Phaser.Game(config);
        console.log('Phaser game instance created!');
        
        // Hide loading message
        const loadingMsg = document.getElementById('loading-message');
        if (loadingMsg) loadingMsg.style.display = 'none';

    } catch (error) {
        console.error('Error creating game instance:', error);
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.innerHTML = `<strong>Error:</strong> ${error.message}<br>
                                  <small>${error.stack}</small><br><br>
                                  <button onclick="location.reload()">Reload Page</button>`;
            errorElement.style.display = 'block';
        }
        const loadingMsg = document.getElementById('loading-message');
        if (loadingMsg) loadingMsg.style.display = 'none';
    }
};

// Global game settings
window.pixelArtGame = {
    version: '0.1.0',
    debug: false
}; 