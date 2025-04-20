import { TILE_SIZE, GAME_WIDTH, GAME_HEIGHT, WORLD_WIDTH, WORLD_HEIGHT } from '../constants.js';
// Importing helper functions instead of passing them
import { createLightningEffect, createJaggedLine, damageEnemy, safeDestroy } from '../utils/helpers.js';

// Engineer follower classes with unique abilities
export const engineerClasses = {
    chronotemporal: {
        name: 'Chronotemporal',
        color: 0xC78FFF, // Purple
        ability: 'Timeburst',
        description: 'Slows nearby enemies temporarily',
        specialAttack: function(scene, follower, enemies, helpers) {
            const range = TILE_SIZE * 4;
            let affected = 0;
            
            enemies.getChildren().forEach(enemy => {
                if (!enemy.active) return;
                const distance = Phaser.Math.Distance.Between(follower.x, follower.y, enemy.x, enemy.y);
                
                if (distance <= range && !enemy.isFrozen) {
                    enemy.setTint(0xAA88FF);
                    enemy.isFrozen = true;
                    
                    if (!enemy.originalSpeed) {
                        enemy.originalSpeed = enemy.speed;
                    }
                    enemy.speed = enemy.originalSpeed * 0.3;
                    enemy.body.velocity.x *= 0.3; // Also affect current velocity
                    enemy.body.velocity.y *= 0.3;
                    
                    // Use a reference to emitter for proper cleanup
                    let emitter = scene.particleManager?.get() || scene.add.particles(enemy.x, enemy.y, 'particle', {
                        speed: { min: 20, max: 40 },
                        scale: { start: 0.4, end: 0 },
                        lifespan: 1000,
                        quantity: 1,
                        frequency: 100,
                        tint: 0xAA88FF,
                        emitting: true // Keep emitting for follow effect
                    });
                    
                    // Store reference on enemy for cleanup
                    enemy.frozenEmitter = emitter;

                    let slowTimer = scene.time.addEvent({
                        delay: 100,
                        callback: () => {
                            if (enemy.active && enemy.isFrozen && emitter && !emitter.destroyed) {
                                emitter.setPosition(enemy.x, enemy.y); // Update position
                            } else {
                                if (emitter && !emitter.destroyed) {
                                    emitter.stop(); // Stop emitting
                                    // Destroy emitter after particles fade
                                    scene.time.delayedCall(1000, () => safeDestroy(emitter)); 
                                }
                                if (slowTimer) slowTimer.remove();
                            }
                        },
                        loop: true 
                    });
                    
                    // Store reference on enemy
                    enemy.slowTimer = slowTimer;
                    
                    scene.time.delayedCall(2000, () => {
                        if (enemy.active) {
                            enemy.clearTint();
                            enemy.isFrozen = false;
                            if (enemy.originalSpeed) { 
                                enemy.speed = enemy.originalSpeed; 
                                // Re-apply velocity towards player if needed
                                // scene.physics.moveToObject(enemy, scene.player, enemy.speed); 
                            }
                        }
                        
                        // Clean up references
                        if (enemy.slowTimer) {
                            enemy.slowTimer.remove();
                            enemy.slowTimer = null;
                        }
                        
                        if (enemy.frozenEmitter && !enemy.frozenEmitter.destroyed) { 
                            enemy.frozenEmitter.stop();
                            scene.time.delayedCall(1000, () => safeDestroy(enemy.frozenEmitter));
                            enemy.frozenEmitter = null;
                        }
                    });
                    
                    affected++;
                }
            });
            
            if (affected > 0) {
                const timeEffect = scene.add.graphics();
                timeEffect.fillStyle(0xAA88FF, 0.3);
                timeEffect.fillCircle(follower.x, follower.y, range);
                scene.tweens.add({
                    targets: timeEffect,
                    alpha: 0,
                    duration: 500,
                    onComplete: () => safeDestroy(timeEffect)
                });
            }
            return affected > 0;
        }
    },
    voltaic: {
        name: 'Voltaic',
        color: 0x00FFFF, // Cyan
        ability: 'Chain Lightning',
        description: 'Electric attacks that chain to nearby enemies',
        specialAttack: function(scene, follower, enemies, helpers) {
            if (enemies.getLength() === 0) return false;
            
            let closestEnemy = scene.physics.closest(follower, enemies.getChildren());
            if (!closestEnemy || Phaser.Math.Distance.Between(follower.x, follower.y, closestEnemy.x, closestEnemy.y) > TILE_SIZE * 5) {
                 return false;
            }

            const maxChain = 3;
            const chainRange = TILE_SIZE * 4;
            const chainedEnemies = new Set();
            const lightningGraphics = [];
            let currentTarget = closestEnemy;
            let sourcePos = { x: follower.x, y: follower.y };

            for (let i = 0; i < maxChain; i++) {
                if (!currentTarget || !currentTarget.active || chainedEnemies.has(currentTarget)) {
                    break; // Stop chaining if target is invalid or already hit
                }

                createLightningEffect(scene, sourcePos.x, sourcePos.y, currentTarget.x, currentTarget.y, lightningGraphics);
                damageEnemy(scene, currentTarget, 1);
                chainedEnemies.add(currentTarget);
                
                sourcePos = { x: currentTarget.x, y: currentTarget.y };
                
                // Find next closest enemy not already chained
                let nextTarget = null;
                let minDistance = chainRange;
                enemies.getChildren().forEach(enemy => {
                    if (enemy.active && !chainedEnemies.has(enemy)) {
                        const distance = Phaser.Math.Distance.Between(sourcePos.x, sourcePos.y, enemy.x, enemy.y);
                        if (distance < minDistance) {
                            minDistance = distance;
                            nextTarget = enemy;
                        }
                    }
                });
                currentTarget = nextTarget; 
            }

            // Use timeout to clean up graphics
            scene.time.delayedCall(200, () => { // Reduced delay for faster cleanup
                lightningGraphics.forEach(line => safeDestroy(line));
            });
            
            return chainedEnemies.size > 0;
        }
    },
     iceMage: {
        name: 'Ice Mage',
        color: 0xB0E0E6, // Powder Blue
        ability: 'Frost Nova',
        description: 'Creates an expanding ring of ice that freezes enemies',
        specialAttack: function(scene, follower, enemies, helpers) {
            const novaRadius = TILE_SIZE * 5;
            const hitEnemies = new Set(); // Track enemies hit in this nova

            // Create visual effect for the frost nova
            const nova = scene.add.graphics();
            nova.fillStyle(0xB0E0E6, 0.3);
            nova.fillCircle(follower.x, follower.y, 10);
            
            // Animate the nova expanding outward
            scene.tweens.add({
                targets: nova,
                scale: novaRadius / 10,
                duration: 500,
                onUpdate: () => {
                    const currentRadius = 10 * nova.scale;
                    
                    enemies.getChildren().forEach(enemy => {
                        if (!enemy.active || hitEnemies.has(enemy)) return;
                        
                        const distance = Phaser.Math.Distance.Between(follower.x, follower.y, enemy.x, enemy.y);
                        
                        // Freeze enemies as the nova expands
                        if (distance <= currentRadius && !enemy.isFrozen) { 
                            hitEnemies.add(enemy);
                            enemy.isFrozen = true;
                            enemy.setTint(0xB0E0E6);
                            
                            if (!enemy.originalSpeed) {
                                enemy.originalSpeed = enemy.speed;
                            }
                            
                            // Completely stop the enemy
                            enemy.body.velocity.x = 0;
                            enemy.body.velocity.y = 0;
                            enemy.speed = 0;
                            
                            // Add ice particle effect
                            const emitter = scene.particleManager?.get() || scene.add.particles(enemy.x, enemy.y, 'particle', {
                                speed: { min: 10, max: 20 },
                                scale: { start: 0.5, end: 0 },
                                lifespan: 1000,
                                quantity: 1,
                                frequency: 200,
                                tint: 0xB0E0E6
                            });
                            
                            // Store reference on enemy for cleanup
                            enemy.frostEmitter = emitter;
                            
                            // Deal damage when hit
                            damageEnemy(scene, enemy, 1);
                            
                            // Unfreeze after delay
                            scene.time.delayedCall(2500, () => {
                                if (enemy.active && enemy.isFrozen) {
                                    enemy.clearTint();
                                    enemy.isFrozen = false;
                                    if (enemy.originalSpeed) {
                                         enemy.speed = enemy.originalSpeed; 
                                    }
                                }
                                
                                if (enemy.frostEmitter) {
                                    enemy.frostEmitter.stop();
                                    scene.time.delayedCall(1000, () => safeDestroy(enemy.frostEmitter));
                                    enemy.frostEmitter = null;
                                }
                            });
                        }
                    });
                },
                onComplete: () => {
                    scene.tweens.add({ 
                        targets: nova, 
                        alpha: 0, 
                        duration: 300, 
                        onComplete: () => safeDestroy(nova) 
                    });
                }
            });
            
            return true;
        }
    },
    ninja: {
        name: 'Ninja',
        color: 0x696969, // Dark Gray
        ability: 'Gear Throw',
        description: 'Throws deadly spinning gears that pierce through enemies',
        specialAttack: function(scene, follower, enemies, helpers) {
            if (enemies.getLength() === 0) return false;
            
            const directions = [
                { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
            ];
            
            // Track active gears for potential cleanup
            const activeGears = [];
            
            directions.forEach(dir => {
                // Get bullet from pool if available
                const gear = scene.bullets.create(follower.x, follower.y, 'bullet');
                if (!gear) return; // Pool might be empty

                activeGears.push(gear);
                gear.setActive(true).setVisible(true);
                gear.setTint(0x696969);
                gear.setScale(1.3);
                
                const speed = 250;
                gear.body.velocity.x = dir.x * speed;
                gear.body.velocity.y = dir.y * speed;
                
                // Custom properties for piercing logic
                gear.isPiercing = true;
                gear.pierceCount = 0;
                gear.maxPierces = 3;
                gear.damage = 2;
                gear.hitEnemies = new Set(); // Track enemies hit by this gear
                gear.type = 'gear'; // Identify type if needed

                // Use a single gear rotation tween
                const rotateTween = scene.tweens.add({
                    targets: gear,
                    angle: 360,
                    duration: 1000,
                    repeat: -1,
                    ease: 'Linear'
                });
                
                // Store tween reference for cleanup
                gear.rotateTween = rotateTween;

                // Trail effect (use object pooling if available)
                const trailEmitter = scene.particleManager?.get() || scene.add.particles(gear.x, gear.y, 'particle', {
                    speed: 10,
                    scale: { start: 0.2, end: 0 },
                    blendMode: 'ADD',
                    lifespan: 200,
                    tint: 0x696969,
                    follow: gear // Use the built-in follow property
                });
                
                // Store emitter reference on gear
                gear.trailEmitter = trailEmitter;

                // Add cleanup for both emitter and tween on destroy
                gear.once('destroy', () => {
                    if (gear.trailEmitter) safeDestroy(gear.trailEmitter);
                    if (gear.rotateTween && gear.rotateTween.isPlaying()) gear.rotateTween.stop();
                });
                
                // Safety timer for bullets that don't hit anything
                scene.time.delayedCall(5000, () => {
                    if (gear.active) {
                        safeDestroy(gear);
                    }
                });
            });
            
            return true;
        }
    },
     holyBard: {
        name: 'Holy Bard',
        color: 0xFFD700, // Gold
        ability: 'Shrapnel Field',
        description: 'Creates a field of holy energy that damages enemies',
        specialAttack: function(scene, follower, enemies, helpers) {
            const fieldRadius = TILE_SIZE * 3;
            const fieldDuration = 3000; // 3 seconds
            const damageInterval = 500; // 0.5 seconds
            const ticks = fieldDuration / damageInterval;

            const field = scene.add.graphics();
            field.fillStyle(0xFFD700, 0.3);
            field.fillCircle(follower.x, follower.y, fieldRadius);
            scene.tweens.add({ targets: field, alpha: 0.1, duration: 500, yoyo: true, repeat: fieldDuration/1000 -1, onComplete: () => field.destroy() });

            const emitter = scene.add.particles(follower.x, follower.y, 'particle', {
                speed: { min: 30, max: 70 }, scale: { start: 0.4, end: 0 },
                lifespan: 1000, quantity: 2, frequency: 100, tint: 0xFFD700,
                emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, fieldRadius), quantity: 12 }
            });
             if (!emitter) return false;
             // Stop emitting and destroy after duration
             scene.time.delayedCall(fieldDuration, () => {
                 if (emitter) emitter.stop();
                 scene.time.delayedCall(1000, () => { if (emitter) emitter.destroy(); }); // Delay destroy for fade
             });

            let tickCount = 0;
            const damageTimer = scene.time.addEvent({
                delay: damageInterval,
                callback: () => {
                    enemies.getChildren().forEach(enemy => {
                        if (!enemy.active) return;
                        const distance = Phaser.Math.Distance.Between(follower.x, follower.y, enemy.x, enemy.y);
                        if (distance <= fieldRadius) {
                            helpers.damageEnemy(scene, enemy, 1);
                            // Add visual effect on enemy
                            const flash = scene.add.sprite(enemy.x, enemy.y, 'particle').setTint(0xFFD700).setScale(1.5);
                            scene.tweens.add({ targets: flash, alpha: 0, scale: 0.5, duration: 300, onComplete: () => flash.destroy() });
                        }
                    });
                    tickCount++;
                    if (tickCount >= ticks) {
                        damageTimer.remove();
                        emitter.stop();
                    }
                },
                loop: true
            });
            return true;
        }
    },
    darkMage: {
        name: 'Dark Mage',
        color: 0x800080, // Purple
        ability: 'Aether Beam',
        description: 'Channels dark energy beams that damage enemies in a short line',
        specialAttack: function(scene, follower, enemies, helpers) {
            if (enemies.getLength() === 0) return false;

            // Current beam length is WORLD_WIDTH / 3
            // Reducing to 1/3 of that = WORLD_WIDTH / 9
            const beamLength = WORLD_WIDTH / 9; 
            const beamWidth = TILE_SIZE;

            let closestEnemy = scene.physics.closest(follower, enemies.getChildren());
            if (!closestEnemy) return false;

            // Calculate distance to closest enemy
            const distanceToEnemy = Phaser.Math.Distance.Between(
                follower.x, follower.y, 
                closestEnemy.x, closestEnemy.y
            );

            // Only attack if enemy is within beam range
            if (distanceToEnemy > beamLength) {
                return false; // Enemy too far away, don't attack
            }

            const angle = Phaser.Math.Angle.Between(follower.x, follower.y, closestEnemy.x, closestEnemy.y);
            const endX = follower.x + Math.cos(angle) * beamLength;
            const endY = follower.y + Math.sin(angle) * beamLength;
            const beamLine = new Phaser.Geom.Line(follower.x, follower.y, endX, endY);

            // Collect all visual elements for batch cleanup
            const visualElements = [];

            // Visuals
            const beam = scene.add.graphics();
            visualElements.push(beam);
            beam.lineStyle(6, 0x800080, 0.8);
            beam.strokeLineShape(beamLine);
            
            const glowBeam = scene.add.graphics();
            visualElements.push(glowBeam);
            glowBeam.lineStyle(12, 0x800080, 0.3);
            glowBeam.strokeLineShape(beamLine);
            
            // Tween to fade out beams
            scene.tweens.add({ 
                targets: [beam, glowBeam], 
                alpha: 0, 
                duration: 500, 
                onComplete: () => {
                    visualElements.forEach(element => safeDestroy(element));
                }
            });

            // Particles - use object pooling if available
            const beamParticles = scene.particleManager?.get() || scene.add.particles(0, 0, 'particle', {
                speed: { min: 10, max: 50 }, 
                scale: { start: 0.4, end: 0 },
                blendMode: 'ADD', 
                lifespan: 500, 
                tint: 0x800080,
                emitting: false // Don't start emitting
            });
            visualElements.push(beamParticles);

            const points = beamLine.getPoints(10); // Fewer points for shorter beam
            points.forEach(p => beamParticles.emitParticleAt(p.x, p.y, 3)); // Emit at points

            // Damage
            let hitCount = 0;
            enemies.getChildren().forEach(enemy => {
                if (!enemy.active) return;
                // More robust check: distance from enemy center to the line segment
                const enemyPoint = new Phaser.Geom.Point(enemy.x, enemy.y);
                if (Phaser.Geom.Intersects.LineToCircle(beamLine, new Phaser.Geom.Circle(enemy.x, enemy.y, TILE_SIZE / 2))) {
                    damageEnemy(scene, enemy, 3);
                    hitCount++;
                    // Visual impact
                    const impact = scene.add.sprite(enemy.x, enemy.y, 'particle').setTint(0x800080).setScale(2);
                    visualElements.push(impact);
                    scene.tweens.add({ 
                        targets: impact, 
                        alpha: 0, 
                        scale: 0.5, 
                        duration: 300, 
                        onComplete: () => safeDestroy(impact)
                    });
                }
            });
            
            // Destroy all visual elements after effect completes
            scene.time.delayedCall(500, () => {
                visualElements.forEach(element => {
                    if (!element.destroyed) safeDestroy(element);
                });
            });
            
            return hitCount > 0;
        }
    },
    shotgunner: {
        name: 'Shotgunner',
        color: 0xA52A2A, // Brown
        ability: 'Ember Spray',
        description: 'Fires a spray of deadly embers in a cone',
        specialAttack: function(scene, follower, enemies, helpers) {
            if (enemies.getLength() === 0) return false;

            let closestEnemy = scene.physics.closest(follower, enemies.getChildren());
            if (!closestEnemy) return false;

            const angle = Phaser.Math.Angle.Between(follower.x, follower.y, closestEnemy.x, closestEnemy.y);
            const spreadRadians = Math.PI / 4; // 45 degrees
            const shotRange = TILE_SIZE * 5;

            // Visual Cone
            const cone = scene.add.graphics();
            cone.fillStyle(0xA52A2A, 0.3);
            cone.beginPath();
            cone.moveTo(follower.x, follower.y);
            cone.arc(follower.x, follower.y, shotRange, angle - spreadRadians / 2, angle + spreadRadians / 2, false);
            cone.closePath();
            cone.fill();
            scene.tweens.add({ targets: cone, alpha: 0, duration: 300, onComplete: () => cone.destroy() });

            // Particles
            const emitter = scene.add.particles(follower.x, follower.y, 'particle', {
                speed: { min: 100, max: 200 }, scale: { start: 0.4, end: 0 }, lifespan: 500,
                tint: [0xFF4500, 0xFF8C00, 0xFFD700], 
                angle: { min: Phaser.Math.RadToDeg(angle - spreadRadians / 2), max: Phaser.Math.RadToDeg(angle + spreadRadians / 2) }, 
                emitting: false // Don't start emitting
            });
             if (!emitter) return false;

            emitter.explode(15); // Fire once
            // Destroy after lifespan
            scene.time.delayedCall(600, () => { if (emitter) emitter.destroy(); });

            // Damage
            let hitCount = 0;
            enemies.getChildren().forEach(enemy => {
                if (!enemy.active) return;

                const distance = Phaser.Math.Distance.Between(follower.x, follower.y, enemy.x, enemy.y);
                const enemyAngle = Phaser.Math.Angle.Between(follower.x, follower.y, enemy.x, enemy.y);
                const angleDiff = Phaser.Math.Angle.Wrap(enemyAngle - angle); // Difference from center of cone

                // Check if within range and angle spread
                if (distance <= shotRange && Math.abs(angleDiff) <= spreadRadians / 2) {
                    // Damage falls off with distance
                    const damageMultiplier = Math.max(0, 1 - (distance / shotRange)); 
                    const damage = Math.max(1, Math.round(3 * damageMultiplier));
                    helpers.damageEnemy(scene, enemy, damage);
                    hitCount++;
                }
            });
            return hitCount > 0;
        }
    },
    sniper: {
        name: 'Sniper',
        color: 0x708090, // Slate Gray
        ability: 'Piston Punch',
        description: 'Fires a high-powered shot that deals massive damage to a single target',
        specialAttack: function(scene, follower, enemies, helpers) { // Pass bullets group
             if (enemies.getLength() === 0) return false;

            // Target enemy with highest health, fallback to closest
            let targetEnemy = enemies.getChildren().reduce((target, enemy) => {
                 if (!enemy.active) return target;
                 return (!target || enemy.health > target.health) ? enemy : target;
             }, null);

            if (!targetEnemy) {
                 targetEnemy = scene.physics.closest(follower, enemies.getChildren());
            }
            if (!targetEnemy) return false;

            const angle = Phaser.Math.Angle.Between(follower.x, follower.y, targetEnemy.x, targetEnemy.y);

            // Laser Sight Visual
            const laserSight = scene.add.graphics();
            laserSight.lineStyle(1, 0xFF0000, 0.7);
            laserSight.lineBetween(follower.x, follower.y, targetEnemy.x, targetEnemy.y);
            
            scene.time.delayedCall(300, () => {
                laserSight.destroy();
                
                // Create Bullet (using bullet group)
                const bullet = scene.bullets.create(follower.x, follower.y, 'bullet');
                if (!bullet) return; // Pool empty

                bullet.setActive(true).setVisible(true);
                bullet.setTint(0x708090).setScale(1.5);
                
                const speed = 500;
                bullet.body.velocity.x = Math.cos(angle) * speed;
                bullet.body.velocity.y = Math.sin(angle) * speed;
                
                // Sniper bullet properties (handle in collision)
                bullet.isSniper = true;
                bullet.damage = 6;
                bullet.target = targetEnemy; // Mark the intended target
                bullet.type = 'sniper';

                // Trail effect
                 const trailEmitter = scene.add.particles(bullet.x, bullet.y, 'particle', {
                      speed: 10, scale: { start: 0.2, end: 0 }, blendMode: 'ADD', 
                      lifespan: 200, tint: 0x708090, 
                      follow: bullet // Use follow property
                  });
                  if (!trailEmitter) return;

                  bullet.on('destroy', () => { 
                      if (trailEmitter) trailEmitter.destroy(); 
                  });

                 // Set a lifespan or max distance for the bullet
                 bullet.lifespan = 2000; // Destroy after 2 seconds if it hits nothing
                 scene.time.delayedCall(bullet.lifespan, () => { if (bullet.active) bullet.destroy(); });
            });
            return true;
        }
    },
    shroomPixie: {
        name: 'Shroom Pixie',
        color: 0xFF69B4, // Hot Pink
        ability: 'Pressure Blast',
        description: 'Creates exploding mushrooms that release toxic spores',
        specialAttack: function(scene, follower, enemies, helpers) {
            // Reduced from 3 to 2 mushroom bombs
            const mushroomCount = 2;
            let mushroomsPlaced = 0;
            
            // Visual properties for mushroom bombs
            const mushroomRadius = TILE_SIZE * 2;
            const explosionDelay = 3000;
            const damage = 3;

            // Place both mushrooms near the follower instead of near enemies
            for (let i = 0; i < mushroomCount; i++) {
                const angle = Math.PI * 2 * (i / mushroomCount); // Evenly space the mushrooms
                const distance = Phaser.Math.Between(TILE_SIZE * 2, TILE_SIZE * 3);
                
                // Use WORLD dimensions instead of GAME dimensions to properly clamp positions
                let mushroomX = Phaser.Math.Clamp(
                    follower.x + Math.cos(angle) * distance, 
                    TILE_SIZE, 
                    WORLD_WIDTH - TILE_SIZE
                );
                let mushroomY = Phaser.Math.Clamp(
                    follower.y + Math.sin(angle) * distance, 
                    TILE_SIZE, 
                    WORLD_HEIGHT - TILE_SIZE
                );
                
                // Create mushroom visual effect before explosion
                const mushroom = scene.add.sprite(mushroomX, mushroomY, 'particle');
                mushroom.setTint(0xFF69B4);
                mushroom.setScale(2);
                mushroom.setAlpha(0.7);
                
                scene.tweens.add({
                    targets: mushroom,
                    alpha: 0.8,
                    scale: 2.5,
                    duration: 500,
                    yoyo: true,
                    repeat: 2,
                    onComplete: () => mushroom.destroy()
                });
                
                // Create a custom timed explosion with mushroom-themed colors
                createCustomTimedExplosion(scene, mushroomX, mushroomY, mushroomRadius, explosionDelay, damage, 0xFF69B4);
                mushroomsPlaced++;
            }
            
            // Helper function for custom timed explosion with mushroom colors
            function createCustomTimedExplosion(scene, x, y, radius, delay, damage, color) {
                // Create a container to group all visual elements and ensure they stay aligned
                const container = scene.add.container(x, y);
                
                // Create visual indicator for the timed bomb (mushroom-themed)
                const indicator = scene.add.sprite(0, 0, 'particle');
                indicator.setTint(color);
                indicator.setScale(radius / 16); // Adjust scale based on radius
                indicator.setAlpha(0.5); // Increased from 0.3 to 0.5 for more visibility
                
                // Add a ring to make the explosion area more obvious
                // Use a sprite instead of graphics for better scaling behavior
                const ringSize = radius * 2; // Diameter
                const ringTexture = createCircleTexture(scene, ringSize, color);
                const ringIndicator = scene.add.sprite(0, 0, ringTexture);
                ringIndicator.setAlpha(0.4);
                
                // Add both to the container
                container.add([ringIndicator, indicator]);
                
                // Add countdown text (outside container to avoid scaling issues)
                const countdownText = scene.add.text(x, y, (delay / 1000).toFixed(1), {
                    fontSize: '24px',
                    fontFamily: 'Arial',
                    fill: '#FFFFFF',
                    stroke: '#000000',
                    strokeThickness: 3
                }).setOrigin(0.5);
                
                // Pulsing effect for the container
                scene.tweens.add({
                    targets: container,
                    scale: 1.1,
                    duration: 500,
                    yoyo: true,
                    repeat: -1
                });
                
                // Also tween the alpha for the ring indicator separately
                scene.tweens.add({
                    targets: ringIndicator,
                    alpha: 0.6,
                    duration: 500,
                    yoyo: true,
                    repeat: -1
                });
                
                // Update countdown text
                let remainingTime = delay;
                const updateInterval = 100; // Update every 100ms
                const countdownTimer = scene.time.addEvent({
                    delay: updateInterval,
                    callback: () => {
                        remainingTime -= updateInterval;
                        countdownText.setText((remainingTime / 1000).toFixed(1));
                    },
                    repeat: Math.floor(delay / updateInterval) - 1
                });
                
                // Trigger explosion after delay
                scene.time.delayedCall(delay, () => {
                    // Stop and clean up countdown elements
                    if (countdownTimer && countdownTimer.active) countdownTimer.remove();
                    container.destroy(); // This will destroy both indicator and ringIndicator
                    countdownText.destroy();
                    
                    // Create explosion effect with mushroom color - larger and more obvious
                    const explosion = scene.add.sprite(x, y, 'particle');
                    explosion.setTint(color);
                    explosion.setScale(radius / 12); // Larger scale for more obvious explosion
                    explosion.setAlpha(0.8); // Increased from 0.7 to 0.8 for more visibility
                    
                    // Add an explosion ring for more obvious effect
                    const explosionRing = scene.add.sprite(x, y, ringTexture);
                    explosionRing.setAlpha(0.7);
                    
                    // Add particle effect with mushroom color
                    const particles = scene.add.particles(x, y, 'particle', {
                        speed: { min: 70, max: 220 }, // Increased particle speed
                        scale: { start: 1.5, end: 0 }, // Larger starting particle size
                        lifespan: 800,
                        quantity: 40, // Increased from 30 to 40 particles
                        tint: [color, 0xFFAADD, 0xFFDDEE], // Mushroom-themed particle colors
                        blendMode: 'ADD',
                        emitting: false
                    });
                    
                    particles.explode(40);
                    
                    // Damage enemies within radius
                    scene.enemies.getChildren().forEach(enemy => {
                        if (!enemy.active) return;
                        
                        const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
                        if (distance <= radius) {
                            // Apply damage
                            if (enemy.damage) {
                                enemy.damage(damage);
                            } else {
                                enemy.health -= damage;
                            }
                            
                            // Add knockback effect
                            const angle = Phaser.Math.Angle.Between(x, y, enemy.x, enemy.y);
                            const knockbackForce = 200 * (1 - distance / radius); // More force closer to center
                            
                            if (enemy.body) {
                                enemy.body.velocity.x += Math.cos(angle) * knockbackForce;
                                enemy.body.velocity.y += Math.sin(angle) * knockbackForce;
                            }
                        }
                    });
                    
                    // Fade out and cleanup
                    scene.tweens.add({
                        targets: [explosion, explosionRing],
                        alpha: 0,
                        scale: 1.5,
                        duration: 500,
                        onComplete: () => {
                            explosion.destroy();
                            explosionRing.destroy();
                            scene.time.delayedCall(800, () => {
                                if (particles && particles.active) particles.destroy();
                            });
                        }
                    });
                });
                
                // Helper function to create a circular texture for the ring
                function createCircleTexture(scene, size, color) {
                    const textureName = `circle_${color}_${size}`;
                    
                    // Check if texture already exists
                    if (scene.textures.exists(textureName)) {
                        return textureName;
                    }
                    
                    // Create the texture
                    const graphics = scene.make.graphics({x: 0, y: 0, add: false});
                    graphics.lineStyle(3, color, 1);
                    graphics.strokeCircle(size/2, size/2, size/2 - 2); // Subtract line width to fit
                    
                    graphics.generateTexture(textureName, size, size);
                    graphics.destroy();
                    
                    return textureName;
                }
            }
            
            return mushroomsPlaced > 0;
        }
    },
    thunderMage: {
        name: 'Thunder Mage',
        color: 0xFFD700, // Gold
        ability: 'Lightning Strike',
        description: 'Summons lightning bolts that damage enemies',
        specialAttack: function(scene, follower, enemies, helpers) {
            if (enemies.getLength() === 0) return false;
            
            const strikeRange = TILE_SIZE * 6;
            const hitEnemies = new Set();
            let affected = 0;
            
            // Find up to 3 random enemies within range
            const nearbyEnemies = enemies.getChildren()
                .filter(enemy => {
                    if (!enemy.active) return false;
                    const distance = Phaser.Math.Distance.Between(
                        follower.x, follower.y, enemy.x, enemy.y
                    );
                    return distance <= strikeRange;
                })
                .sort(() => 0.5 - Math.random()) // Randomize order
                .slice(0, 3); // Take up to 3
            
            if (nearbyEnemies.length === 0) return false;
            
            // Create lightning strikes for each target
            nearbyEnemies.forEach(enemy => {
                hitEnemies.add(enemy);
                
                // Create a lightning strike effect
                const strikeGraphics = createLightningEffect(
                    scene, 
                    enemy.x, enemy.y - 200, // Start above the enemy
                    enemy.x, enemy.y,       // End at the enemy
                    [],                     // Array to collect graphics objects
                    0xFFD700,               // Gold color
                    3                       // Line width
                );
                
                // Flash the enemy white
                enemy.setTint(0xFFFFFF);
                scene.time.delayedCall(150, () => {
                    if (enemy.active) enemy.clearTint();
                });
                
                // Damage the enemy
                damageEnemy(scene, enemy, 2);
                
                // Create a local explosion effect
                const explosion = scene.add.graphics();
                explosion.fillStyle(0xFFD700, 0.7);
                explosion.fillCircle(enemy.x, enemy.y, 20);
                
                // Animate the explosion
                scene.tweens.add({
                    targets: explosion,
                    alpha: 0,
                    scale: 2,
                    duration: 300,
                    onComplete: () => safeDestroy(explosion)
                });
                
                // Clean up lightning after a short delay
                scene.time.delayedCall(200, () => {
                    // Fix: Check if strikeGraphics is an array before using forEach
                    if (Array.isArray(strikeGraphics)) {
                        strikeGraphics.forEach(line => safeDestroy(line));
                    } else if (strikeGraphics) {
                        // If it's a single graphics object, just destroy it
                        safeDestroy(strikeGraphics);
                    }
                });
                
                affected++;
            });
            
            // Create a thunder sound effect
            if (scene.audioManager) {
                try {
                    scene.audioManager.playSFX('special');
                } catch (error) {
                    console.warn('Failed to play thunder sound:', error);
                }
            }
            
            return affected > 0;
        }
    },
    goblinTrapper: {
        name: 'Goblin Trapper',
        color: 0x32CD32, // Lime Green
        ability: 'Mega Bomb',
        description: 'Places a powerful bomb that explodes after 6s. 15s cooldown.',
        specialAttack: function(scene, follower, enemies, helpers) {
            // Single bomb with quicker explosion and halved explosion radius
            const mineCount = 1;
            let minesPlaced = 0;
            
            // Mine properties
            const mineRadius = TILE_SIZE * 7.5; // Halved from previous 15
            const explosionDelay = 6000; // Reduced to 6 seconds
            const damage = 8; // Keep the same damage
            
            // Place the bomb near the goblin trapper
            const distance = TILE_SIZE * 1.5; // Closer to the follower
            const angle = Math.random() * Math.PI * 2; // Random direction
            
            // Use WORLD dimensions instead of GAME dimensions to properly clamp positions
            let mineX = Phaser.Math.Clamp(
                follower.x + Math.cos(angle) * distance, 
                TILE_SIZE, 
                WORLD_WIDTH - TILE_SIZE
            );
            let mineY = Phaser.Math.Clamp(
                follower.y + Math.sin(angle) * distance, 
                TILE_SIZE, 
                WORLD_HEIGHT - TILE_SIZE
            );
            
            // Create a more impressive-looking mine visual
            const mine = scene.add.graphics();
            mine.lineStyle(3, 0x32CD32, 1);
            mine.strokeCircle(mineX, mineY, mineRadius * 0.15); // Slightly larger relative to new radius
            mine.fillStyle(0x32CD32, 0.4);
            mine.fillCircle(mineX, mineY, mineRadius * 0.15);
            
            // Add a pulsing ring to indicate explosion area
            const explosionIndicator = scene.add.graphics();
            explosionIndicator.lineStyle(2, 0x32CD32, 0.3);
            explosionIndicator.strokeCircle(mineX, mineY, mineRadius);
            
            // Add countdown text
            const countdownText = scene.add.text(mineX, mineY, (explosionDelay / 1000).toFixed(1), {
                fontSize: '24px',
                fontFamily: 'Arial',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5);
            
            // Blinking effect for both the mine and area indicator - faster for shorter countdown
            scene.tweens.add({
                targets: [mine, explosionIndicator],
                alpha: 0.1,
                duration: 400,
                yoyo: true,
                repeat: Math.floor(explosionDelay / 800) // Faster pulse for shorter countdown
            });
            
            // Update countdown text
            const updateInterval = 1000; // Update every second
            const countdownTimer = scene.time.addEvent({
                delay: updateInterval,
                callback: () => {
                    const remainingTime = Math.max(0, (countdownTimer.getOverallRemaining() / 1000)).toFixed(1);
                    countdownText.setText(remainingTime);
                },
                repeat: Math.floor(explosionDelay / updateInterval) - 1
            });
            
            // Trigger explosion after delay
            scene.time.delayedCall(explosionDelay, () => {
                // Clean up visuals
                mine.destroy();
                explosionIndicator.destroy();
                countdownText.destroy();
                
                // Create explosion effect with green color
                const explosion = scene.add.sprite(mineX, mineY, 'particle');
                explosion.setTint(0x32CD32);
                explosion.setScale(mineRadius / 20); // Adjusted scale for the smaller radius
                explosion.setAlpha(0.8);
                
                // Add explosion ring - Fix: use fixed position coordinates
                const explosionRing = scene.add.graphics();
                explosionRing.lineStyle(5, 0x32CD32, 0.7);
                explosionRing.strokeCircle(mineX, mineY, mineRadius);
                
                // Add particles for explosion
                const particles = scene.add.particles(mineX, mineY, 'particle', {
                    speed: { min: 100, max: 400 },
                    scale: { start: 2, end: 0 },
                    lifespan: 1200,
                    quantity: 50, // Reduced for smaller explosion
                    tint: [0x32CD32, 0x228B22, 0x006400, 0xADFF2F],
                    blendMode: 'ADD',
                    emitting: false
                });
                
                particles.explode(50);
                
                // Damage enemies within the radius
                scene.enemies.getChildren().forEach(enemy => {
                    if (!enemy.active) return;
                    
                    const distance = Phaser.Math.Distance.Between(mineX, mineY, enemy.x, enemy.y);
                    if (distance <= mineRadius) {
                        // Apply damage with falloff based on distance
                        const damageMultiplier = 1 - (distance / mineRadius) * 0.5; // Less falloff (min 50% damage at edge)
                        const scaledDamage = Math.ceil(damage * damageMultiplier);
                        helpers.damageEnemy(scene, enemy, scaledDamage);
                        
                        // Add knockback effect
                        const angle = Phaser.Math.Angle.Between(mineX, mineY, enemy.x, enemy.y);
                        const knockbackForce = 300 * (1 - distance / mineRadius);
                        
                        if (enemy.body) {
                            enemy.body.velocity.x += Math.cos(angle) * knockbackForce;
                            enemy.body.velocity.y += Math.sin(angle) * knockbackForce;
                        }
                    }
                });
                
                // Fade out and cleanup
                scene.tweens.add({
                    targets: [explosion, explosionRing],
                    alpha: 0,
                    scale: {
                        getStart: (target) => {
                            // Only scale the explosion sprite, not the graphics ring
                            return target === explosion ? 1 : 1;
                        },
                        getEnd: (target) => {
                            // Only scale the explosion sprite, not the graphics ring
                            return target === explosion ? 2 : 1;
                        }
                    },
                    duration: 800,
                    onComplete: () => {
                        explosion.destroy();
                        explosionRing.destroy();
                        scene.time.delayedCall(1200, () => {
                            if (particles && particles.active) particles.destroy();
                        });
                    }
                });
            });
            
            minesPlaced++;
            return minesPlaced > 0;
        }
    },
    shaman: {
        name: 'Shaman',
        color: 0x556B2F, // Dark Olive Green
        ability: 'Corrosion Cloud',
        description: 'Creates poisonous clouds that damage enemies over time',
        specialAttack: function(scene, follower, enemies, helpers) {
            if (enemies.getLength() === 0) return false;
            
            // Max distance the cloud can be placed from the shaman
            const maxDistanceFromShaman = TILE_SIZE * 4;
            const cloudRadius = TILE_SIZE * 3;
            
            // Find densest cluster of enemies, but only consider enemies near the shaman
            let bestLocation = { x: follower.x, y: follower.y };
            let maxScore = -1;
            
            // Get nearby enemies
            const nearbyEnemies = enemies.getChildren().filter(e => 
                e.active && Phaser.Math.Distance.Between(follower.x, follower.y, e.x, e.y) <= maxDistanceFromShaman
            );
            
            // If no nearby enemies, place cloud at shaman's position
            if (nearbyEnemies.length === 0) {
                scene.createPoisonCloud(follower.x, follower.y, cloudRadius);
                return true;
            }
            
            // Check around nearby enemies for the densest cluster
            nearbyEnemies.forEach(center => {
                let score = 0;
                enemies.getChildren().forEach(enemy => {
                    if (enemy.active && Phaser.Math.Distance.Between(center.x, center.y, enemy.x, enemy.y) <= cloudRadius) {
                        score++;
                    }
                });
                
                // Also consider distance from shaman (prefer closer locations)
                const distanceFromShaman = Phaser.Math.Distance.Between(follower.x, follower.y, center.x, center.y);
                if (distanceFromShaman <= maxDistanceFromShaman && score > maxScore) {
                    maxScore = score;
                    bestLocation = { x: center.x, y: center.y };
                }
            });
            
            // Clamp location to world bounds
            bestLocation.x = Phaser.Math.Clamp(bestLocation.x, cloudRadius, WORLD_WIDTH - cloudRadius);
            bestLocation.y = Phaser.Math.Clamp(bestLocation.y, cloudRadius, WORLD_HEIGHT - cloudRadius);

            // Final check to ensure cloud is within max distance
            const finalDistance = Phaser.Math.Distance.Between(follower.x, follower.y, bestLocation.x, bestLocation.y);
            if (finalDistance > maxDistanceFromShaman) {
                // If too far, move the cloud position closer to the shaman
                const angle = Phaser.Math.Angle.Between(follower.x, follower.y, bestLocation.x, bestLocation.y);
                bestLocation.x = follower.x + Math.cos(angle) * maxDistanceFromShaman;
                bestLocation.y = follower.y + Math.sin(angle) * maxDistanceFromShaman;
                
                // Clamp again after adjustment
                bestLocation.x = Phaser.Math.Clamp(bestLocation.x, cloudRadius, WORLD_WIDTH - cloudRadius);
                bestLocation.y = Phaser.Math.Clamp(bestLocation.y, cloudRadius, WORLD_HEIGHT - cloudRadius);
            }

            // Add a visual indicator showing connection between shaman and cloud
            const connector = scene.add.graphics();
            connector.lineStyle(3, 0x556B2F, 0.6);
            connector.lineBetween(follower.x, follower.y, bestLocation.x, bestLocation.y);
            scene.tweens.add({
                targets: connector,
                alpha: 0,
                duration: 1000,
                onComplete: () => connector.destroy()
            });

            scene.createPoisonCloud(bestLocation.x, bestLocation.y, cloudRadius);
            return true;
        }
    }
}; 