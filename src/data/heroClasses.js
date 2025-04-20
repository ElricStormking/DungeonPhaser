import { TILE_SIZE } from '../constants.js';
// TODO: Import or pass shootProjectile and createExplosion

// Hero classes with different abilities
export const heroClasses = {
    warrior: {
        key: 'warrior',
        name: 'Warrior',
        color: 0x00FFFF, // Note: TitleScene uses 0xFF0000, game uses 0x00FFFF. Standardize?
        specialAttack: function(scene, player, enemies, helpers) { // Pass needed functions/data
            // Sword sweep (damages all nearby enemies)
            const range = TILE_SIZE * 3;
            let enemiesHit = 0;
            
            // Create spinning sword effect - 360 degrees
            const numSwords = 6; // Number of sword sprites to create for the spin
            const swordLength = range * 0.9;
            
            for (let i = 0; i < numSwords; i++) {
                // Create sword sprite
                const startAngle = (i * (Math.PI * 2 / numSwords));
                const sword = scene.add.sprite(player.x, player.y, 'bullet');
                sword.setTint(0xFFFF00);
                sword.setAlpha(0.7);
                sword.setScale(3, 0.5); // Long and thin like a sword
                sword.setOrigin(0, 0.5); // Set origin to left-center for rotation
                sword.setDepth(player.depth + 1);
                
                // Set initial angle
                sword.rotation = startAngle;
                
                // Add rotation animation - offset the start time for each sword
                scene.tweens.add({
                    targets: sword,
                    rotation: startAngle + Math.PI * 2, // Full 360 degree rotation
                    duration: 500,
                    ease: 'Sine.easeInOut',
                    delay: i * (500 / numSwords), // Stagger the start times
                    onUpdate: function(tween) {
                        // Add particles along the sword edge for trail effect
                        if (tween.progress > 0.05 && tween.progress < 0.95) {
                            try {
                                const tipX = sword.x + Math.cos(sword.rotation) * swordLength;
                                const tipY = sword.y + Math.sin(sword.rotation) * swordLength;
                                
                                // Add particle at tip of sword
                                const particles = scene.add.particles(tipX, tipY, 'particle', {
                                    lifespan: 300,
                                    scale: { start: 0.4, end: 0 },
                                    quantity: 1,
                                    alpha: { start: 0.7, end: 0 },
                                    tint: 0xFFFF00
                                });
                                
                                // Clean up particles
                                scene.time.delayedCall(300, () => {
                                    if (particles) particles.destroy();
                                });
                            } catch (e) {
                                // Continue even if particles can't be created
                            }
                        }
                    },
                    onComplete: () => sword.destroy()
                });
            }
            
            // Check for enemies in range and damage them
            for (let i = 0; i < enemies.getLength(); i++) {
                const enemy = enemies.getChildren()[i];
                const distance = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
                
                if (distance <= range) {
                    helpers.createExplosion(scene, enemy.x, enemy.y, 0xFFFF00);
                    // Damage enemy instead of just destroying
                    helpers.damageEnemy(scene, enemy, 5); // Example damage value
                    
                    // Knockback effect
                    const knockbackAngle = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);
                    if (enemy.body) {
                        enemy.body.velocity.x += Math.cos(knockbackAngle) * 150;
                        enemy.body.velocity.y += Math.sin(knockbackAngle) * 150;
                        scene.tweens.add({
                            targets: enemy.body.velocity,
                            x: '*=0.5',
                            y: '*=0.5',
                            duration: 300
                        });
                    }
                    
                    enemiesHit++;
                }
            }
            
            return enemiesHit > 0;
        }
    },
    archer: {
        key: 'archer',
        name: 'Archer',
        color: 0x00FF00,
        specialAttack: function(scene, player, enemies, helpers) {
            // Fire arrows in 8 directions
            const directions = [
                {x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}, {x: -1, y: 1},
                {x: -1, y: 0}, {x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}
            ];
            
            // Normalize diagonal directions for consistent speed
            directions.forEach(dir => {
                if (dir.x !== 0 && dir.y !== 0) {
                    const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
                    dir.x /= length;
                    dir.y /= length;
                }
            });
            
            // Fire arrows manually instead of using shootProjectile
            directions.forEach(dir => {
                // Create arrow directly
                const arrow = scene.add.sprite(player.x, player.y, 'arrow');
                arrow.setScale(1.2);
                
                // Add physics
                scene.physics.world.enable(arrow);
                scene.bullets.add(arrow);
                
                // Set properties for collision detection
                arrow.damage = 3;
                arrow.isEnemyProjectile = false; // Ensure it's recognized as a player projectile
                arrow.setData('type', 'arrow'); // Add a type for potential filtering
                
                // Set size for better collision detection
                arrow.body.setSize(16, 4);  // Adjust size to match arrow shape
                
                // Set properties
                arrow.rotation = Math.atan2(dir.y, dir.x);
                
                // Set velocity
                const speed = 500;
                arrow.body.velocity.x = dir.x * speed;
                arrow.body.velocity.y = dir.y * speed;
                
                // Apply visual effect
                arrow.setTint(0x00FF00);
                
                // Cleanup after 2 seconds
                scene.time.delayedCall(2000, () => {
                    if (arrow && arrow.active) {
                        arrow.destroy();
                    }
                });
            });
            
            return true;
        }
    },
    mage: {
        key: 'mage',
        name: 'Mage',
        color: 0xFF00FF, // Note: TitleScene uses 0x00FFFF, game uses 0xFF00FF. Standardize?
        specialAttack: function(scene, player, enemies, helpers) { // Pass needed functions/data
            // Freeze all enemies temporarily
            if (enemies.getLength() === 0) return false;
            
            enemies.getChildren().forEach(enemy => {
                if (!enemy.active) return; // Check if enemy is active
                
                // Store original speed if not already frozen
                 if (!enemy.isFrozen) { 
                    // Visual effect
                    enemy.setTint(0x00FFFF);
                    enemy.isFrozen = true; // Custom flag to manage state

                    if (!enemy.originalSpeed) {
                        enemy.originalSpeed = enemy.speed; // Assuming speed property exists
                    }

                    // Stop enemy
                    enemy.body.velocity.x = 0;
                    enemy.body.velocity.y = 0;
                    enemy.speed = 0; // Update speed property if used
                    
                    // Unfreeze after a delay
                    scene.time.delayedCall(2000, () => {
                        if (enemy.active) {
                            enemy.clearTint();
                            enemy.isFrozen = false;
                            // Restore original movement toward player (if it has speed)
                            if (enemy.originalSpeed) { 
                                enemy.speed = enemy.originalSpeed; 
                                scene.physics.moveToObject(enemy, player, enemy.speed); 
                            } 
                        }
                    });
                }
            });
            
            return true;
        }
    }
}; 