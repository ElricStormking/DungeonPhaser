// CSV Test Script for class-stats.csv and commander-stats.csv
// This script will verify that attributes are correctly loaded

// Simulate the Phaser Scene and cache
class MockScene {
    constructor() {
        this.cache = {
            text: new Map()
        };
        this.load = {
            text: (key, path) => {
                console.log(`Loading ${path} as ${key}`);
                // This would normally load the file, but for testing we'll use a fetch
                this.loadTextFile(key, path);
            }
        };
    }

    async loadTextFile(key, path) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load ${path}: ${response.statusText}`);
            }
            const text = await response.text();
            this.cache.text.set(key, text);
            console.log(`Successfully loaded ${path}`);
            
            // If both files are loaded, run the test
            if (this.cache.text.has('classStats') && this.cache.text.has('commanderStats')) {
                runTest(this);
            }
        } catch (error) {
            console.error(`Error loading ${path}:`, error);
        }
    }
}

// Simplified ClassLoader for testing
class ClassLoader {
    constructor(scene) {
        this.scene = scene;
        this.engineerClasses = {};
        this.commanderClasses = {};
        this.loaded = false;
    }

    preload() {
        this.scene.load.text('classStats', 'class-stats.csv');
        this.scene.load.text('commanderStats', 'commander-stats.csv');
    }

    loadAndTest() {
        this.loadEngineerClasses();
        this.loadCommanderClasses();
        this.loaded = true;
        
        // Display loaded data
        this.displayLoadedClasses();
    }
    
    loadEngineerClasses() {
        const csvContent = this.scene.cache.text.get('classStats');
        if (!csvContent) {
            console.error('Failed to load class-stats.csv');
            return;
        }

        this.parseCSV(csvContent, 'engineer');
    }
    
    loadCommanderClasses() {
        const csvContent = this.scene.cache.text.get('commanderStats');
        if (!csvContent) {
            console.error('Failed to load commander-stats.csv');
            return;
        }

        this.parseCSV(csvContent, 'commander');
    }

    parseCSV(csvContent, fileType) {
        const lines = csvContent.split('\n');
        if (lines.length < 2) {
            console.error(`CSV file for ${fileType} has insufficient data`);
            return;
        }

        // Parse headers
        const headers = lines[0].split(',').map(h => h.trim());
        console.log(`Headers for ${fileType}:`, headers);

        // Process each line
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const values = lines[i].split(',').map(v => v.trim());
            const classData = {};
            
            // Map values to keys based on headers
            headers.forEach((header, index) => {
                if (index < values.length) {
                    let value = values[index];
                    
                    // Convert numeric values to numbers
                    if (['damage', 'range', 'speed', 'cooldown', 'health'].includes(header.toLowerCase())) {
                        value = parseFloat(value) || 0;
                    }
                    
                    // Convert color to hex number
                    if (header.toLowerCase() === 'color' && value.startsWith('#')) {
                        classData.colorHex = value; // Store original hex
                        value = parseInt(value.replace('#', '0x'));
                    }
                    
                    classData[header.toLowerCase()] = value;
                }
            });
            
            // Store by type
            const type = classData.type?.toLowerCase();
            const name = classData.name;
            
            if (type && name) {
                const key = this.getClassKey(name);
                
                if (type === 'engineer') {
                    this.engineerClasses[key] = classData;
                } else if (type === 'commander') {
                    this.commanderClasses[key] = classData;
                }
            }
        }
    }

    getClassKey(name) {
        return name.toLowerCase().replace(/\s+/g, '');
    }
    
    displayLoadedClasses() {
        console.log('====== ENGINEER CLASSES ======');
        Object.keys(this.engineerClasses).forEach(key => {
            const classData = this.engineerClasses[key];
            console.log(`${classData.name}:`);
            console.log(`  Type: ${classData.type}`);
            console.log(`  Color: ${classData.colorHex} (${classData.color.toString(16)})`);
            console.log(`  Damage: ${classData.damage}`);
            console.log(`  Range: ${classData.range}`);
            console.log(`  Speed: ${classData.speed}`);
            console.log(`  Cooldown: ${classData.cooldown}`);
            console.log(`  Health: ${classData.health}`);
            console.log(`  Attack Style: ${classData.attackstyle}`);
            console.log(`  Special Ability: ${classData.specialability}`);
            console.log('------------------------');
        });
        
        console.log('\n====== COMMANDER CLASSES ======');
        Object.keys(this.commanderClasses).forEach(key => {
            const classData = this.commanderClasses[key];
            console.log(`${classData.name}:`);
            console.log(`  Type: ${classData.type}`);
            console.log(`  Color: ${classData.colorHex} (${classData.color.toString(16)})`);
            console.log(`  Damage: ${classData.damage}`);
            console.log(`  Range: ${classData.range}`);
            console.log(`  Speed: ${classData.speed}`);
            console.log(`  Cooldown: ${classData.cooldown}`);
            console.log(`  Health: ${classData.health}`);
            console.log(`  Attack Style: ${classData.attackstyle}`);
            console.log(`  Special Ability: ${classData.specialability}`);
            console.log('------------------------');
        });
    }
}

// Run test function
function runTest(scene) {
    console.log('Running CSV load test...');
    const classLoader = new ClassLoader(scene);
    classLoader.loadAndTest();
    
    // Verification checks
    verifyLoadedClasses(classLoader);
}

// Verification function
function verifyLoadedClasses(classLoader) {
    let errorCount = 0;
    
    // Check if we have the expected number of classes
    const engineerCount = Object.keys(classLoader.engineerClasses).length;
    const commanderCount = Object.keys(classLoader.commanderClasses).length;
    
    console.log(`\n====== VERIFICATION RESULTS ======`);
    console.log(`Found ${engineerCount} engineer classes and ${commanderCount} commander classes.`);
    
    // Verify specific fields from a few classes
    if (classLoader.engineerClasses.chronotemporal) {
        const chronotemporal = classLoader.engineerClasses.chronotemporal;
        if (chronotemporal.damage !== 0) {
            console.error(`ERROR: Chronotemporal damage should be 0, found ${chronotemporal.damage}`);
            errorCount++;
        }
        if (chronotemporal.colorHex !== '#C78FFF') {
            console.error(`ERROR: Chronotemporal color should be #C78FFF, found ${chronotemporal.colorHex}`);
            errorCount++;
        }
    } else {
        console.error(`ERROR: Chronotemporal engineer class not found`);
        errorCount++;
    }
    
    if (classLoader.commanderClasses.warrior) {
        const warrior = classLoader.commanderClasses.warrior;
        if (warrior.health !== 50) {
            console.error(`ERROR: Warrior health should be 50, found ${warrior.health}`);
            errorCount++;
        }
        if (warrior.attackstyle !== 'Melee') {
            console.error(`ERROR: Warrior attack style should be Melee, found ${warrior.attackstyle}`);
            errorCount++;
        }
    } else {
        console.error(`ERROR: Warrior commander class not found`);
        errorCount++;
    }
    
    // Final result
    if (errorCount === 0) {
        console.log('✅ VERIFICATION SUCCESSFUL: All CSV data loaded correctly!');
    } else {
        console.log(`❌ VERIFICATION FAILED: Found ${errorCount} errors in the loaded data.`);
    }
}

// Start the test
console.log('Starting CSV test...');
const scene = new MockScene();
scene.load.text('classStats', 'class-stats.csv');
scene.load.text('commanderStats', 'commander-stats.csv'); 