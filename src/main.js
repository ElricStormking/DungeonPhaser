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
    scene: [TitleScene, GameScene, StoryScene] // Add scenes here
};

// Initialize the game when the window loads
window.onload = function() {
    console.log('Creating Phaser game instance...');
    try {
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