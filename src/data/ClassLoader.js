import { TILE_SIZE } from '../constants.js';

export default class ClassLoader {
    constructor(scene) {
        this.scene = scene;
        this.engineerClasses = {};
        this.commanderClasses = {};
        this.loaded = false;
        this.useTextAreas = false; // Flag to check if we're using text areas instead of file loading
    }

    preload() {
        // Check if text areas exist for offline loading
        if (document.getElementById('engineerClassesData') && 
            document.getElementById('commanderClassesData')) {
            this.useTextAreas = true;
            console.log('Using text areas for class data loading');
            return; // No need to preload files
        }
        
        // Standard file loading
        this.scene.load.text('classStats', 'assets/data/class-stats.csv');
        this.scene.load.text('commanderStats', 'assets/data/commander-stats.csv');
    }

    load() {
        if (this.loaded) {
            console.log("ClassLoader already loaded, skipping load()");
            return;
        }
        
        console.log("Starting ClassLoader.load()");
        
        let engineerCSV, commanderCSV;
        
        if (this.useTextAreas) {
            // Load from text areas
            console.log("Loading from text areas...");
            engineerCSV = document.getElementById('engineerClassesData')?.textContent;
            commanderCSV = document.getElementById('commanderClassesData')?.textContent;
        } else {
            // Load from game cache
            console.log("Loading from game cache...");
            try {
                engineerCSV = this.scene.cache.text.get('classStats');
                console.log("Engineer CSV loaded:", engineerCSV ? engineerCSV.substring(0, 100) + "..." : "Failed");
                console.log("Engineer CSV length:", engineerCSV ? engineerCSV.length : 0);
                
                commanderCSV = this.scene.cache.text.get('commanderStats');
                console.log("Commander CSV loaded:", commanderCSV ? commanderCSV.substring(0, 100) + "..." : "Failed");
                console.log("Commander CSV length:", commanderCSV ? commanderCSV.length : 0);
                
                // Check specifically for commander CSV issues
                if (!commanderCSV) {
                    console.error("Failed to load commander CSV from cache");
                    console.log("Available cache keys:", Object.keys(this.scene.cache.text.entries));
                } else if (commanderCSV.length === 0) {
                    console.error("Commander CSV is empty");
                }
            } catch (error) {
                console.error("Error loading CSV files from cache:", error);
            }
        }
        
        // Load engineer classes
        if (!engineerCSV) {
            console.error('Failed to load engineer class data');
            this.loadDefaultEngineerClasses();
        } else {
            this.parseCSV(engineerCSV, 'engineer');
            // If parsing failed or didn't find any valid classes, use defaults
            if (Object.keys(this.engineerClasses).length === 0) {
                console.error('Failed to parse any engineer classes from CSV, using defaults');
                this.loadDefaultEngineerClasses();
            }
        }
        
        // Load commander classes
        console.log("Processing commander CSV data...");
        if (!commanderCSV) {
            console.error('Failed to load commander class data, using defaults');
            this.loadDefaultCommanderClasses();
        } else {
            console.log(`Commander CSV data exists, length: ${commanderCSV.length}`);
            this.parseCSV(commanderCSV, 'commander');
            // If parsing failed or didn't find any valid classes, use defaults
            if (Object.keys(this.commanderClasses).length === 0) {
                console.error('Failed to parse any commander classes from CSV, using defaults');
                this.loadDefaultCommanderClasses();
            } else {
                console.log(`Successfully parsed ${Object.keys(this.commanderClasses).length} commander classes from CSV`);
                // Detailed dump of warrior class if present
                if (this.commanderClasses['warrior']) {
                    console.log("Warrior class details:", JSON.stringify(this.commanderClasses['warrior'], null, 2));
                }
            }
        }
        
        this.loaded = true; // Set to true regardless, since we'll have default data at minimum
        
        console.log('Loaded', Object.keys(this.engineerClasses).length, 'engineer classes and', 
                    Object.keys(this.commanderClasses).length, 'commander classes');
        console.log('Engineer class keys:', Object.keys(this.engineerClasses));
        console.log('Commander class keys:', Object.keys(this.commanderClasses));
    }

    parseCSV(csvContent, fileType) {
        console.log(`Starting to parse ${fileType} CSV with content length: ${csvContent.length}`);

        const lines = csvContent.split('\n');
        if (lines.length < 2) {
            console.error(`CSV file for ${fileType} has insufficient data, only ${lines.length} lines`);
            return;
        }

        // Parse headers
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Log the headers for debugging
        console.log(`CSV headers for ${fileType}:`, headers);

        // Process each line
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) {
                console.log(`Skipping empty line ${i} in ${fileType} CSV`);
                continue;
            }
            
            const values = lines[i].split(',').map(v => v.trim());
            const classData = {};
            
            console.log(`Processing line ${i} in ${fileType} CSV: ${lines[i].substring(0, 50)}...`);
            console.log(`Values length: ${values.length}, Headers length: ${headers.length}`);
            
            // Map values to keys based on headers
            headers.forEach((header, index) => {
                if (index < values.length) {
                    let value = values[index];
                    let headerLower = header.toLowerCase();
                    
                    // Debug output each field
                    console.log(`  Field ${header}: '${value}'`);
                    
                    // Convert numeric values
                    if (['damage', 'range', 'speed', 'cooldown', 'health'].includes(headerLower)) {
                        const originalValue = value;
                        value = parseFloat(value) || 0;
                        console.log(`  Converting field ${header} from '${originalValue}' to number: ${value}`);
                    }
                    
                    // Convert color to hex number
                    if (headerLower === 'color' && value.startsWith('#')) {
                        const originalValue = value;
                        value = parseInt(value.replace('#', '0x'));
                        console.log(`  Converting color from '${originalValue}' to hex number: ${value.toString(16)}`);
                    }
                    
                    // Store value with both original case and lowercase
                    classData[headerLower] = value;
                    
                    // Also store it with its original case
                    classData[header] = value;
                    
                    // And store common variations for key fields
                    if (headerLower === 'attackstyle') {
                        classData.attack_style = value;
                        classData.attackStyle = value;
                    } else if (headerLower === 'specialability') {
                        classData.special_ability = value;
                        classData.specialAbility = value;
                    }
                }
            });

            // Add special attack function based on class type and special ability
            this.addSpecialAttackFunction(classData);
            
            // Store by type
            let type = null;
            if (classData.type) {
                type = classData.type.toLowerCase();
            } else if (classData.Type) {
                type = classData.Type.toLowerCase();
            }
            
            let name = classData.name || classData.Name;
            
            console.log(`Class data: Type=${type}, Name=${name}`);
            if (type && name) {
                const key = this.getClassKey(name);
                console.log(`  Converted to key: ${key}`);
                
                if (type === 'engineer') {
                    this.engineerClasses[key] = classData;
                    console.log(`  Added to engineerClasses with key '${key}'`);
                } else if (type === 'commander') {
                    this.commanderClasses[key] = classData;
                    console.log(`  Added to commanderClasses with key '${key}'`);
                    // Extra debug for range value
                    console.log(`  Commander ${key} range value: ${classData.range} (${typeof classData.range})`);
                }
            }
        }
    }

    getClassKey(name) {
        // Convert to lowercase and remove spaces for a consistent key
        return name.toLowerCase().replace(/\s+/g, '');
    }

    addSpecialAttackFunction(classData) {
        // Only process if special ability information exists
        let specialAbility = classData.specialability || classData.SpecialAbility;
        
        if (!specialAbility) {
            console.log(`No special ability defined for ${classData.name || 'unnamed class'}`);
            return;
        }

        // Log what we're doing
        console.log(`Adding special attack function for ${classData.name}, ability: ${specialAbility}`);
        
        // Create special attack function based on specialAbility value
        // This maps the text description to an actual function
        let specialAttackFn = null;
        
        switch (specialAbility.toLowerCase()) {
            case 'chain lightning':
                specialAttackFn = (scene, entity, enemies) => {
                    console.log('Executing Chain Lightning special attack');
                    
                    // Convert range to proper number
                    let range = parseFloat(classData.range) || TILE_SIZE * 4;
                    let damage = parseFloat(classData.damage) || 2;
                    
                    // Find entity position
                    const sprite = entity.sprite || entity;
                    if (!sprite || !sprite.active) return false;
                    
                    // Find closest enemy
                    let closest = null;
                    let closestDist = Infinity;
                    
                    enemies.forEach(enemy => {
                        if (!enemy.active) return;
                        
                        const dist = Phaser.Math.Distance.Between(
                            sprite.x, sprite.y, enemy.x, enemy.y
                        );
                        
                        if (dist < closestDist && dist <= range) {
                            closestDist = dist;
                            closest = enemy;
                        }
                    });
                    
                    if (!closest) return false; // No enemies in range
                    
                    // Create lightning to first enemy
                    const lightning1 = scene.add.line(
                        0, 0, 
                        sprite.x, sprite.y,
                        closest.x, closest.y,
                        0x00FFFF
                    );
                    lightning1.setLineWidth(3);
                    lightning1.setOrigin(0, 0);
                    
                    // Damage first enemy
                    if (closest.damage) {
                        closest.damage(damage);
                    } else {
                        closest.health -= damage;
                    }
                    
                    // Find second closest enemy excluding the first
                    let secondTarget = null;
                    let secondDist = Infinity;
                    
                    enemies.forEach(enemy => {
                        if (!enemy.active || enemy === closest) return;
                        
                        const dist = Phaser.Math.Distance.Between(
                            closest.x, closest.y, enemy.x, enemy.y
                        );
                        
                        if (dist < secondDist && dist <= range) {
                            secondDist = dist;
                            secondTarget = enemy;
                        }
                    });
                    
                    // If we found a second target, chain lightning
                    if (secondTarget) {
                        // Create lightning to second enemy
                        const lightning2 = scene.add.line(
                            0, 0, 
                            closest.x, closest.y,
                            secondTarget.x, secondTarget.y,
                            0x00FFFF
                        );
                        lightning2.setLineWidth(3);
                        lightning2.setOrigin(0, 0);
                        
                        // Damage second enemy
                        if (secondTarget.damage) {
                            secondTarget.damage(damage);
                        } else {
                            secondTarget.health -= damage;
                        }
                        
                        // Find third closest enemy excluding first two
                        let thirdTarget = null;
                        let thirdDist = Infinity;
                        
                        enemies.forEach(enemy => {
                            if (!enemy.active || enemy === closest || enemy === secondTarget) return;
                            
                            const dist = Phaser.Math.Distance.Between(
                                secondTarget.x, secondTarget.y, enemy.x, enemy.y
                            );
                            
                            if (dist < thirdDist && dist <= range) {
                                thirdDist = dist;
                                thirdTarget = enemy;
                            }
                        });
                        
                        // If we found a third target, chain lightning again
                        if (thirdTarget) {
                            // Create lightning to third enemy
                            const lightning3 = scene.add.line(
                                0, 0, 
                                secondTarget.x, secondTarget.y,
                                thirdTarget.x, thirdTarget.y,
                                0x00FFFF
                            );
                            lightning3.setLineWidth(3);
                            lightning3.setOrigin(0, 0);
                            
                            // Damage third enemy
                            if (thirdTarget.damage) {
                                thirdTarget.damage(damage);
                            } else {
                                thirdTarget.health -= damage;
                            }
                            
                            // Fade out and remove third lightning
                            scene.tweens.add({
                                targets: lightning3,
                                alpha: 0,
                                duration: 500,
                                onComplete: () => lightning3.destroy()
                            });
                        }
                        
                        // Fade out and remove second lightning
                        scene.tweens.add({
                            targets: lightning2,
                            alpha: 0,
                            duration: 500,
                            onComplete: () => lightning2.destroy()
                        });
                    }
                    
                    // Fade out and remove first lightning
                    scene.tweens.add({
                        targets: lightning1,
                        alpha: 0,
                        duration: 500,
                        onComplete: () => lightning1.destroy()
                    });
                    
                    return true; // Attack executed
                };
                break;
                
            case 'timeburst':
            case 'time burst':
                specialAttackFn = (scene, entity, enemies) => {
                    console.log('Executing Timeburst special attack');
                    
                    // Convert range to proper number
                    let range = parseFloat(classData.range) || TILE_SIZE * 4;
                    
                    // Find entity position
                    const sprite = entity.sprite || entity;
                    if (!sprite || !sprite.active) return false;
                    
                    // Create visual effect
                    const circle = scene.add.circle(
                        sprite.x, sprite.y, range, 0xC78FFF, 0.3
                    );
                    
                    // Find enemies in range
                    let affected = 0;
                    
                    enemies.forEach(enemy => {
                        if (!enemy.active) return;
                        
                        const dist = Phaser.Math.Distance.Between(
                            sprite.x, sprite.y, enemy.x, enemy.y
                        );
                        
                        if (dist <= range) {
                            // Apply slow effect
                            affected++;
                            enemy.setTint(0xC78FFF);
                            
                            // Store original speed if not already slowed
                            if (!enemy.originalSpeed) {
                                if (enemy.speed) {
                                    enemy.originalSpeed = enemy.speed;
                                    enemy.speed *= 0.3; // Slow to 30%
                                } else if (enemy.body && enemy.body.speed) {
                                    enemy.originalSpeed = enemy.body.speed;
                                    enemy.body.speed *= 0.3;
                                }
                            }
                            
                            // Create particles for visual effect
                            const particles = scene.add.particles('particle');
                            const emitter = particles.createEmitter({
                                x: enemy.x,
                                y: enemy.y,
                                follow: enemy,
                                speed: { min: 20, max: 40 },
                                scale: { start: 0.3, end: 0 },
                                lifespan: 500,
                                quantity: 1,
                                frequency: 100,
                                tint: 0xC78FFF
                            });
                            
                            // Restore speed after a delay
                            scene.time.delayedCall(2000, () => {
                                if (enemy.active) {
                                    enemy.clearTint();
                                    if (enemy.originalSpeed) {
                                        if (enemy.speed) {
                                            enemy.speed = enemy.originalSpeed;
                                        } else if (enemy.body && enemy.body.speed) {
                                            enemy.body.speed = enemy.originalSpeed;
                                        }
                                        delete enemy.originalSpeed;
                                    }
                                }
                                
                                // Stop particles
                                emitter.stop();
                                scene.time.delayedCall(500, () => {
                                    particles.destroy();
                                });
                            });
                        }
                    });
                    
                    // Fade out circle effect
                    scene.tweens.add({
                        targets: circle,
                        alpha: 0,
                        duration: 500,
                        onComplete: () => circle.destroy()
                    });
                    
                    return affected > 0; // Return true if any enemies were affected
                };
                break;
                
            case 'multishot':
            case 'multi-shot':
                specialAttackFn = (scene, entity, enemies) => {
                    console.log('Executing Multishot special attack');
                    
                    // Find entity position
                    const sprite = entity.sprite || entity;
                    if (!sprite || !sprite.active) return false;
                    
                    // Get damage from class data
                    const damage = parseFloat(classData.damage) || 1;
                    
                    // Shoot projectiles in multiple directions
                    const directions = [
                        { x: 0, y: -1 },  // Up
                        { x: 1, y: -1 },  // Up-Right
                        { x: 1, y: 0 },   // Right
                        { x: 1, y: 1 },   // Down-Right
                        { x: 0, y: 1 },   // Down
                        { x: -1, y: 1 },  // Down-Left
                        { x: -1, y: 0 },  // Left
                        { x: -1, y: -1 }  // Up-Left
                    ];
                    
                    directions.forEach(dir => {
                        // Create arrow projectile
                        const arrow = scene.physics.add.sprite(sprite.x, sprite.y, 'arrow');
                        arrow.damage = damage;
                        arrow.lifespan = 1000;
                        arrow.setScale(0.5);
                        
                        // Set angle based on direction
                        const angle = Math.atan2(dir.y, dir.x);
                        arrow.rotation = angle;
                        
                        // Set velocity
                        const speed = 300;
                        arrow.setVelocity(
                            Math.cos(angle) * speed,
                            Math.sin(angle) * speed
                        );
                        
                        // Add to projectiles group if it exists
                        if (scene.projectiles) {
                            scene.projectiles.add(arrow);
                        }
                        
                        // Destroy after lifespan
                        scene.time.delayedCall(arrow.lifespan, () => {
                            arrow.destroy();
                        });
                        
                        // Set collision with enemies
                        scene.physics.add.overlap(arrow, enemies, (arrow, enemy) => {
                            // Apply damage
                            if (enemy.damage) {
                                enemy.damage(arrow.damage);
                            } else if (enemy.health) {
                                enemy.health -= arrow.damage;
                            }
                            
                            // Create hit effect
                            const particles = scene.add.particles('particle');
                            const emitter = particles.createEmitter({
                                x: arrow.x,
                                y: arrow.y,
                                speed: { min: 20, max: 40 },
                                scale: { start: 0.3, end: 0 },
                                lifespan: 300,
                                quantity: 5,
                                tint: 0xFFFF00
                            });
                            
                            // Clean up particles
                            emitter.explode();
                            scene.time.delayedCall(300, () => {
                                particles.destroy();
                            });
                            
                            // Destroy arrow
                            arrow.destroy();
                        });
                    });
                    
                    return true; // Attack executed
                };
                break;
                
            default:
                // Create a simple fallback attack
                specialAttackFn = (scene, entity, enemies) => {
                    console.log(`Executing default attack for ${specialAbility}`);
                    
                    // Convert range and damage
                    let range = parseFloat(classData.range) || TILE_SIZE * 3;
                    let damage = parseFloat(classData.damage) || 1;
                    
                    // Find entity position
                    const sprite = entity.sprite || entity;
                    if (!sprite || !sprite.active) return false;
                    
                    // Find enemies in range
                    let hitCount = 0;
                    
                    enemies.forEach(enemy => {
                        if (!enemy.active) return;
                        
                        const dist = Phaser.Math.Distance.Between(
                            sprite.x, sprite.y, enemy.x, enemy.y
                        );
                        
                        if (dist <= range) {
                            // Apply damage
                            hitCount++;
                            
                            if (enemy.damage) {
                                enemy.damage(damage);
                            } else {
                                enemy.health -= damage;
                            }
                            
                            // Create hit effect
                            const particles = scene.add.particles('particle');
                            const emitter = particles.createEmitter({
                                x: enemy.x,
                                y: enemy.y,
                                speed: { min: 20, max: 40 },
                                scale: { start: 0.3, end: 0 },
                                lifespan: 300,
                                quantity: 5,
                                tint: 0xFFFFFF
                            });
                            
                            // Clean up particles
                            emitter.explode();
                            scene.time.delayedCall(300, () => {
                                particles.destroy();
                            });
                        }
                    });
                    
                    // Create visual effect
                    const circle = scene.add.circle(
                        sprite.x, sprite.y, range, 0x888888, 0.3
                    );
                    
                    // Fade out circle effect
                    scene.tweens.add({
                        targets: circle,
                        alpha: 0,
                        duration: 500,
                        onComplete: () => circle.destroy()
                    });
                    
                    return hitCount > 0; // Return true if any enemies were affected
                };
                break;
        }
        
        // Assign the function to the class data
        classData.specialAttack = specialAttackFn;
    }

    getEngineerClass(name) {
        const key = this.getClassKey(name);
        return this.engineerClasses[key];
    }
    
    getCommanderClass(name) {
        const key = this.getClassKey(name);
        return this.commanderClasses[key];
    }
    
    getAllEngineerClasses() {
        return Object.values(this.engineerClasses);
    }
    
    getAllCommanderClasses() {
        return Object.values(this.commanderClasses);
    }
    
    static createTextAreaWithCSVData(id, csvData) {
        // Create hidden text area for CSV data
        const textArea = document.createElement('textarea');
        textArea.id = id;
        textArea.style.display = 'none';
        textArea.value = csvData;
        document.body.appendChild(textArea);
        return textArea;
    }
    
    static setupOfflineData(engineerCSV, commanderCSV) {
        // Create hidden text areas for offline data loading
        ClassLoader.createTextAreaWithCSVData('engineerClassesData', engineerCSV);
        ClassLoader.createTextAreaWithCSVData('commanderClassesData', commanderCSV);
    }
    
    loadDefaultEngineerClasses() {
        // Default engineer classes if CSV loading fails
        this.engineerClasses = {
            chronotemporal: {
                name: 'Chronotemporal',
                type: 'engineer',
                color: 0xC78FFF,
                range: TILE_SIZE * 4,
                damage: 2,
                cooldown: 3000,
                specialability: 'Timeburst',
                description: 'Slows nearby enemies temporarily',
                specialAttack: null, // Will be populated by addSpecialAttackFunction
            },
            voltaic: {
                name: 'Voltaic',
                type: 'engineer',
                color: 0x00FFFF,
                range: TILE_SIZE * 6,
                damage: 2,
                cooldown: 4000,
                specialability: 'Chain Lightning',
                description: 'Electric attacks that chain to nearby enemies',
                specialAttack: null, // Will be populated by addSpecialAttackFunction
            },
            arbalester: {
                name: 'Arbalester',
                type: 'engineer',
                color: 0xFFCC00,
                range: TILE_SIZE * 8,
                damage: 1,
                cooldown: 3000,
                specialability: 'Multishot',
                description: 'Fires arrows in all directions',
                specialAttack: null, // Will be populated by addSpecialAttackFunction
            }
        };
        
        // Add special attack functions
        Object.values(this.engineerClasses).forEach(classData => {
            this.addSpecialAttackFunction(classData);
        });
    }
    
    loadDefaultCommanderClasses() {
        // Default commander classes if CSV loading fails
        this.commanderClasses = {
            warrior: {
                name: 'Warrior',
                type: 'commander',
                color: 0xFF0000,
                range: TILE_SIZE * 3,
                damage: 3,
                cooldown: 5000,
                specialability: 'Whirlwind',
                description: 'Spins and damages all nearby enemies',
                health: 100,
                speed: 200,
                specialAttack: null, // Will be populated by addSpecialAttackFunction
            },
            archer: {
                name: 'Archer',
                type: 'commander',
                color: 0x00FF00,
                range: TILE_SIZE * 8,
                damage: 2,
                cooldown: 3000,
                specialability: 'Multishot',
                description: 'Fires arrows in all directions',
                health: 80,
                speed: 220,
                specialAttack: null, // Will be populated by addSpecialAttackFunction
            },
            mage: {
                name: 'Mage',
                type: 'commander',
                color: 0x00FFFF,
                range: TILE_SIZE * 5,
                damage: 4,
                cooldown: 6000,
                specialability: 'Frost Nova',
                description: 'Freezes all nearby enemies',
                health: 70,
                speed: 180,
                specialAttack: null, // Will be populated by addSpecialAttackFunction
            }
        };
        
        // Add special attack functions
        Object.values(this.commanderClasses).forEach(classData => {
            this.addSpecialAttackFunction(classData);
        });
    }
} 