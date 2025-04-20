/**
 * Manages all audio (music and sound effects) in the game
 */
export default class AudioManager {
    constructor(scene) {
        this.scene = scene;
        
        // Keep track of currently playing music
        this.currentMusic = null;
        
        // Volume settings
        this.musicVolume = 0.5;
        this.sfxVolume = 0.7;
        
        // Flag to track if audio is initialized
        this.initialized = false;
        
        // Store loaded audio keys
        this.loadedAudio = new Set();
        
        // Flag to control verbose logging
        this.isDevelopmentMode = true;
        
        // Store placeholder sounds
        this.placeholders = {
            music: null,
            sfx: null
        };
        
        // Stage to BGM mapping (4 stages, 1 BGM per stage)
        this.stageBGM = {
            1: 'bgm_stage1',
            2: 'bgm_stage2',
            3: 'bgm_stage3',
            4: 'bgm_stage4'
        };
    }
    
    /**
     * Initialize audio system and load all assets
     */
    init() {
        if (this.initialized) return;
        
        console.log('Audio system initialized');
        
        // Attempt to unlock audio context with a silent sound on user interaction
        this.unlockAudioContext();
        
        // Set up error handling
        this.scene.load.on('loaderror', (fileObj) => {
            if (this.isDevelopmentMode) {
                console.warn(`Failed to load audio: ${fileObj.key}`);
            }
        });
        
        // Create placeholder sounds
        this.createPlaceholderSounds();
        
        // Load music and sound effects
        this.loadMusic();
        this.loadSoundEffects();

        // Track completed loading
        this.scene.load.on('complete', () => {
            this.initialized = true;
            console.log('Audio loading completed');
        });
        
        // Start loading
        this.scene.load.start();
    }
    
    /**
     * Try to unlock audio context on user interaction
     */
    unlockAudioContext() {
        // Set up a one-time listener for user interaction to unlock audio
        const unlockHandler = () => {
            // Try to resume the audio context
            if (this.scene.sound.context && this.scene.sound.context.state === 'suspended') {
                this.scene.sound.context.resume().then(() => {
                    console.log('Audio context resumed successfully');
                }).catch(error => {
                    console.warn('Failed to resume audio context:', error);
                });
            }
            
            // Remove listeners after first interaction
            document.removeEventListener('click', unlockHandler);
            document.removeEventListener('touchstart', unlockHandler);
            document.removeEventListener('keydown', unlockHandler);
        };
        
        // Add listeners for common user interactions
        document.addEventListener('click', unlockHandler);
        document.addEventListener('touchstart', unlockHandler);
        document.addEventListener('keydown', unlockHandler);
    }
    
    /**
     * Create placeholder sounds for when audio files are missing
     */
    createPlaceholderSounds() {
        try {
            // Instead of using base64 data, use the Phaser sound manager to create empty sounds
            
            // Create simple sounds using browser Audio
            const dummyAudio = new Audio();
            
            // Register the placeholder directly in the sound manager with minimal configuration
            this.scene.sound.add('placeholder_music', {
                loop: false
            });
            
            this.scene.sound.add('placeholder_sfx', {
                loop: false
            });
            
            // Create a special fallback for game over sound
            this.createFallbackGameOverSound();
            
            // Mark as loaded
            this.loadedAudio.add('placeholder_music');
            this.loadedAudio.add('placeholder_sfx');
            
            // Store references to the placeholder keys
            this.placeholders.music = 'placeholder_music';
            this.placeholders.sfx = 'placeholder_sfx';
            
            if (this.isDevelopmentMode) {
                console.log('Placeholder sounds created');
            }
        } catch (error) {
            if (this.isDevelopmentMode) {
                console.warn('Failed to create placeholder sounds:', error);
            }
        }
    }
    
    /**
     * Create a fallback game over sound using WebAudio oscillators
     */
    createFallbackGameOverSound() {
        try {
            // Only create if we have access to AudioContext
            if (!this.scene.sound.context) {
                return;
            }
            
            // Create a simple WebAudio buffer with two low tones
            const ctx = this.scene.sound.context;
            const sampleRate = ctx.sampleRate;
            const duration = 0.3; // 300ms
            const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
            const channel = buffer.getChannelData(0);
            
            // Generate a decreasing tone (sad game over sound)
            for (let i = 0; i < channel.length; i++) {
                const t = i / sampleRate;
                const frequency = 200 - (i / channel.length) * 150; // Descending from 200Hz to 50Hz
                channel[i] = 0.5 * Math.sin(frequency * 2 * Math.PI * t) * 
                             (1 - i / channel.length); // Fade out
            }
            
            // Convert to a sound that Phaser can use
            const sound = {
                isPlaying: false,
                duration: buffer.duration,
                
                // Basic play method to handle the WebAudio buffer
                play: () => {
                    try {
                        const source = ctx.createBufferSource();
                        source.buffer = buffer;
                        
                        const gainNode = ctx.createGain();
                        gainNode.gain.value = 0.3;
                        
                        source.connect(gainNode);
                        gainNode.connect(ctx.destination);
                        
                        source.start(0);
                        return sound;
                    } catch (e) {
                        console.warn('Error playing fallback sound:', e);
                        return sound;
                    }
                }
            };
            
            // Add to scene's sound manager
            this.scene.sound.add('fallback_gameover', sound);
            this.loadedAudio.add('fallback_gameover');
            
            console.log('Fallback game over sound created');
        } catch (error) {
            console.warn('Failed to create fallback game over sound:', error);
        }
    }
    
    /**
     * Safely load an audio file with error handling
     * @param {string} key - Asset key
     * @param {string} path - File path
     */
    safeLoadAudio(key, path) {
        try {
            this.scene.load.audio(key, path);
            
            // Set up success listener for this file
            this.scene.load.once(`filecomplete-audio-${key}`, () => {
                this.loadedAudio.add(key);
                if (this.isDevelopmentMode) {
                    console.log(`Audio loaded: ${key}`);
                }
            });
        } catch (error) {
            if (this.isDevelopmentMode) {
                console.warn(`Error loading audio ${key}: ${error.message}`);
            }
        }
    }
    
    /**
     * Load all music tracks
     */
    loadMusic() {
        // Load the 8 music tracks required by design doc
        this.safeLoadAudio('title_music', 'assets/audio/music/title_theme.mp3');
        this.safeLoadAudio('chat_music', 'assets/audio/music/chat_theme.mp3');
        this.safeLoadAudio('gameover_music', 'assets/audio/music/game_over.mp3');
        this.safeLoadAudio('map_music', 'assets/audio/music/map_theme.mp3');
        
        // 4 BGMs for the 4 stages
        this.safeLoadAudio('bgm_stage1', 'assets/audio/music/stage1.mp3');
        this.safeLoadAudio('bgm_stage2', 'assets/audio/music/stage2.mp3');
        this.safeLoadAudio('bgm_stage3', 'assets/audio/music/stage3.mp3');
        this.safeLoadAudio('bgm_stage4', 'assets/audio/music/stage4.mp3');
    }
    
    /**
     * Load all sound effects
     */
    loadSoundEffects() {
        // Player sounds
        this.safeLoadAudio('level_up', 'assets/audio/sfx/level_up.mp3');
        this.safeLoadAudio('victory', 'assets/audio/sfx/victory.mp3');
        this.safeLoadAudio('player_damage', 'assets/audio/sfx/player_damage.mp3');
        
        // Attack sounds (5 types as per design doc)
        this.safeLoadAudio('attack_melee', 'assets/audio/sfx/attack_melee.mp3');
        this.safeLoadAudio('attack_ranged', 'assets/audio/sfx/attack_ranged.mp3');
        this.safeLoadAudio('attack_magic', 'assets/audio/sfx/attack_magic.mp3');
        this.safeLoadAudio('attack_aoe', 'assets/audio/sfx/attack_aoe.mp3');
        this.safeLoadAudio('attack_special', 'assets/audio/sfx/attack_special.mp3');
        
        // Additional gameplay sounds
        this.safeLoadAudio('pickup', 'assets/audio/sfx/pickup.mp3');
        this.safeLoadAudio('enemy_death', 'assets/audio/sfx/enemy_death.mp3');
        this.safeLoadAudio('boss_spawn', 'assets/audio/sfx/boss_spawn.mp3');
    }
    
    /**
     * Check if an audio key is loaded and available
     * @param {string} key - Asset key to check
     * @returns {boolean} Whether the audio is available
     */
    hasAudio(key) {
        return this.loadedAudio.has(key) && this.scene.cache.audio.exists(key);
    }
    
    /**
     * Force reload a specific audio file (emergency fallback)
     * @param {string} key - Asset key to reload
     * @returns {boolean} Whether the reload was successful
     */
    forceReloadAudio(key) {
        try {
            // Define path mapping for critical sounds
            const criticalAudioPaths = {
                'gameover_music': 'assets/audio/music/game_over.mp3',
                'bgm_stage1': 'assets/audio/music/stage1.mp3',
                'title_music': 'assets/audio/music/title_theme.mp3'
            };
            
            // Check if we have a path for this key
            if (!criticalAudioPaths[key]) {
                return false;
            }
            
            console.log(`Emergency reload of audio: ${key}`);
            
            // Force load directly into the scene's sound system
            const sound = this.scene.sound.add(key);
            
            // Mark as loaded
            this.loadedAudio.add(key);
            
            return true;
        } catch (error) {
            console.warn(`Failed emergency reload of ${key}:`, error);
            return false;
        }
    }
    
    /**
     * Play music track with optional fade-in
     * @param {string} key - Asset key of the music to play
     * @param {boolean} loop - Whether the music should loop (default: true)
     * @param {number} fadeIn - Fade-in duration in ms (default: 1000)
     */
    playMusic(key, loop = true, fadeIn = 1000) {
        // Check if audio is loaded
        if (!this.hasAudio(key)) {
            // For critical audio like game over music, try emergency reload
            if (key === 'gameover_music' || key === 'bgm_stage1' || key === 'title_music') {
                const reloaded = this.forceReloadAudio(key);
                if (!reloaded) {
                    console.log(`Critical music ${key} not available - creating fallback`);
                    
                    // For game over specifically, create a simple tone as absolute fallback
                    if (key === 'gameover_music') {
                        try {
                            // Create a simple tone as fallback
                            const fallbackSound = this.scene.sound.add('fallback_gameover', {
                                loop: false
                            });
                            
                            // Play a simple beep pattern for game over
                            this.scene.time.addEvent({
                                delay: 300,
                                repeat: 2,
                                callback: () => {
                                    try {
                                        this.scene.sound.play('fallback_gameover', {
                                            volume: 0.3
                                        });
                                    } catch (e) { /* ignore */ }
                                }
                            });
                            
                            console.log('Playing fallback game over sound pattern');
                            return;
                        } catch (e) {
                            console.warn('Even fallback sound failed:', e);
                        }
                    }
                }
            } else {
                if (this.isDevelopmentMode) {
                    console.warn(`Music ${key} not available to play, using placeholder.`);
                }
                
                // For game over, just return if we don't have the audio - don't use placeholder
                if (key === 'gameover_music') {
                    console.log('Game over music not available - skipping audio');
                    return;
                }
                
                // Use placeholder if available, otherwise just return
                if (!this.placeholders.music || !this.hasAudio(this.placeholders.music)) {
                    return;
                }
                
                key = this.placeholders.music;
            }
        }
        
        // Stop current music if there is any
        if (this.currentMusic) {
            this.stopMusic(0); // Immediate stop to avoid overlapping audio
        }
        
        try {
            // Create and play the new music
            this.currentMusic = this.scene.sound.add(key, {
                volume: 0,
                loop: loop  // This might not work reliably in some browsers
            });
            
            // For game over music, ensure it plays without error by using a simple config
            if (key === 'gameover_music') {
                try {
                    // Simple play without extra options for most reliable playback
                    this.currentMusic.setVolume(this.musicVolume);
                    this.currentMusic.play();
                    console.log('Game over music started');
                    return;
                } catch (error) {
                    console.warn('Error playing game over music:', error);
                    return;
                }
            }
            
            // Force non-looping behavior with a timeout as a backup plan
            if (!loop && this.currentMusic.duration) {
                // Calculate duration in milliseconds, add 1 second buffer
                const duration = this.currentMusic.duration * 1000 + 1000;
                
                if (this.isDevelopmentMode) {
                    console.log(`Setting backup timeout for non-looping music: ${duration}ms`);
                }
                
                // Set a timeout to stop the music after its duration
                this.scene.time.delayedCall(duration, () => {
                    if (this.currentMusic && this.currentMusic.key === key) {
                        if (this.isDevelopmentMode) {
                            console.log(`Backup timeout triggered - stopping music ${key}`);
                        }
                        this.stopMusic(0);
                    }
                });
            }
            
            // Log loop setting for debugging
            if (this.isDevelopmentMode) {
                console.log(`Playing music ${key} with loop=${loop}`);
            }
            
            // Set a callback for when music ends
            if (!loop) {
                this.currentMusic.once('complete', () => {
                    if (this.isDevelopmentMode) {
                        console.log(`Music ${key} completed (non-looping)`);
                    }
                    this.currentMusic = null;
                });
            }
            
            this.currentMusic.play({loop: loop}); // Explicitly pass loop parameter here too
            
            // Fade in
            if (fadeIn > 0) {
                this.scene.tweens.add({
                    targets: this.currentMusic,
                    volume: this.musicVolume,
                    duration: fadeIn
                });
            } else {
                this.currentMusic.setVolume(this.musicVolume);
            }
            
            if (this.isDevelopmentMode) {
                console.log(`Music ${key} started, duration: ${this.currentMusic.duration}s`);
            }
        } catch (error) {
            if (this.isDevelopmentMode) {
                console.warn(`Error playing music ${key}: ${error.message}`);
            }
            this.currentMusic = null;
        }
    }
    
    /**
     * Stop the current music with optional fade-out
     * @param {number} fadeOut - Fade-out duration in ms (default: 1000)
     */
    stopMusic(fadeOut = 1000) {
        if (!this.currentMusic) return;
        
        try {
            if (fadeOut > 0) {
                // Fade out and stop
                this.scene.tweens.add({
                    targets: this.currentMusic,
                    volume: 0,
                    duration: fadeOut,
                    onComplete: () => {
                        if (this.currentMusic) {
                            this.currentMusic.stop();
                            this.currentMusic = null;
                        }
                    }
                });
            } else {
                // Stop immediately
                this.currentMusic.stop();
                this.currentMusic = null;
            }
        } catch (error) {
            if (this.isDevelopmentMode) {
                console.warn(`Error stopping music: ${error.message}`);
            }
            this.currentMusic = null;
        }
    }
    
    /**
     * Play a sound effect once
     * @param {string} key - Asset key of the sound to play
     * @param {number} volume - Volume override (default: uses sfxVolume)
     */
    playSFX(key, volume = null) {
        // Double check if the audio might still be in the Phaser cache even if our tracking says it's not
        if (!this.hasAudio(key) && this.scene.cache.audio.exists(key)) {
            console.log(`Sound effect ${key} found in cache but not in loadedAudio, adding it back`);
            this.loadedAudio.add(key);
        }
        
        // Check if audio is loaded
        if (!this.hasAudio(key)) {
            if (this.isDevelopmentMode) {
                console.warn(`Sound effect ${key} not available to play, using placeholder.`);
            }
            
            // Try to reload critical SFX on demand
            if (key === 'pickup' || key === 'player_damage' || key === 'enemy_death') {
                this.reloadSFX(key);
            }
            
            // Use placeholder if available, otherwise just return
            if (!this.placeholders.sfx || !this.hasAudio(this.placeholders.sfx)) {
                return;
            }
            
            key = this.placeholders.sfx;
        }
        
        try {
            const sfx = this.scene.sound.add(key, {
                volume: volume !== null ? volume : this.sfxVolume
            });
            
            sfx.play();
            
            // Auto-cleanup
            sfx.once('complete', () => {
                sfx.destroy();
            });
        } catch (error) {
            if (this.isDevelopmentMode) {
                console.warn(`Error playing sound effect ${key}: ${error.message}`);
            }
        }
    }
    
    /**
     * Reload a sound effect that might have been unloaded
     * @param {string} key - The key of the SFX to reload
     */
    reloadSFX(key) {
        // Define the paths for commonly used sound effects
        const sfxPaths = {
            'pickup': 'assets/audio/sfx/pickup.mp3',
            'player_damage': 'assets/audio/sfx/player_damage.mp3',
            'enemy_death': 'assets/audio/sfx/enemy_death.mp3',
            'level_up': 'assets/audio/sfx/level_up.mp3'
        };
        
        if (!sfxPaths[key]) {
            return false;
        }
        
        try {
            // Force add to sound manager
            this.scene.sound.add(key);
            this.loadedAudio.add(key);
            console.log(`Reloaded sound effect: ${key}`);
            return true;
        } catch (error) {
            console.warn(`Failed to reload sound effect ${key}:`, error);
            return false;
        }
    }
    
    /**
     * Play pickup sound effect (used when collecting items)
     * This method is optimized for reliability
     */
    playPickupSound() {
        // Try multiple approaches to ensure pickup sound plays
        try {
            // 1. First try: Use normal playSFX
            this.playSFX('pickup');
            
            // 2. Direct approach if normal method fails
            if (!this.hasAudio('pickup')) {
                // Create a simple tone as fallback for pickup
                const ctx = this.scene.sound.context;
                if (ctx) {
                    const oscillator = ctx.createOscillator();
                    const gain = ctx.createGain();
                    
                    oscillator.frequency.value = 880; // A5 note
                    oscillator.type = 'sine';
                    
                    gain.gain.value = 0.1;
                    
                    oscillator.connect(gain);
                    gain.connect(ctx.destination);
                    
                    oscillator.start();
                    oscillator.stop(ctx.currentTime + 0.1); // 100ms beep
                    
                    console.log('Played fallback pickup tone');
                }
            }
        } catch (error) {
            console.warn('All pickup sound methods failed:', error);
        }
    }
    
    /**
     * Play BGM based on current stage/level
     * @param {number} level - Current game level (1-32)
     */
    playLevelBGM(level) {
        // Always ensure we have a valid level
        level = level || 1;
        
        // Calculate which stage we're on (1-4)
        const stage = Math.ceil(level / 8) || 1; // Default to stage 1 if calculation fails
        const musicKey = this.stageBGM[stage] || 'bgm_stage1';
        
        console.log(`Level ${level} maps to stage ${stage}, trying to play music: ${musicKey}`);
        
        // Always force restart stage1 music for game start
        if (level === 1 && (!this.currentMusic || this.currentMusic.key !== 'bgm_stage1')) {
            console.log('Starting game with stage1 music');
            this.playMusic('bgm_stage1', true);
            return;
        }
        
        // Only change music if we're playing a different track
        if (!this.currentMusic || this.currentMusic.key !== musicKey) {
            try {
                this.playMusic(musicKey);
            } catch (error) {
                console.warn(`Error in playLevelBGM for level ${level}:`, error);
                
                // Fallback to bgm_stage1 if there's an error
                if (musicKey !== 'bgm_stage1') {
                    console.log('Falling back to bgm_stage1');
                    try {
                        this.playMusic('bgm_stage1');
                    } catch (innerError) {
                        console.warn('Failed to play fallback music:', innerError);
                    }
                }
            }
        }
    }
    
    /**
     * Set music volume
     * @param {number} volume - Volume level (0-1)
     */
    setMusicVolume(volume) {
        this.musicVolume = Phaser.Math.Clamp(volume, 0, 1);
        
        if (this.currentMusic) {
            this.currentMusic.setVolume(this.musicVolume);
        }
    }
    
    /**
     * Set sound effects volume
     * @param {number} volume - Volume level (0-1)
     */
    setSFXVolume(volume) {
        this.sfxVolume = Phaser.Math.Clamp(volume, 0, 1);
    }
    
    /**
     * Toggle development mode (verbose logging)
     * @param {boolean} enabled - Whether to enable development mode
     */
    setDevelopmentMode(enabled) {
        this.isDevelopmentMode = enabled;
    }
    
    /**
     * Play level up sound
     */
    playLevelUpSound() {
        this.playSFX('level_up');
    }
    
    /**
     * Play player damage sound
     */
    playPlayerDamageSound() {
        this.playSFX('player_damage');
    }
    
    /**
     * Play victory sound
     */
    playVictorySound() {
        this.playSFX('victory');
    }
    
    /**
     * Play appropriate attack sound based on attack type
     * @param {string} attackType - Type of attack (melee, ranged, magic, aoe, special)
     */
    playAttackSound(attackType) {
        const soundKey = `attack_${attackType}`;
        this.playSFX(soundKey);
    }
} 