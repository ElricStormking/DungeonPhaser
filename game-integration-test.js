// Game Integration Test Script
// This script verifies that engineer and commander attributes
// from CSV files are correctly applied in the game

/**
 * Helper function to compare values with a tolerance
 * @param {number} a - First value
 * @param {number} b - Second value
 * @param {number} tolerance - Tolerance level (default 0.01)
 * @returns {boolean} True if values are equal within tolerance
 */
function isEqual(a, b, tolerance = 0.01) {
    return Math.abs(a - b) <= tolerance;
}

/**
 * Class to test engineer and commander attributes
 */
class GameAttributesTest {
    constructor(scene) {
        this.scene = scene;
        this.tests = [];
        this.passedTests = 0;
        this.failedTests = 0;
    }

    /**
     * Test that an engineer uses the correct attributes from CSV
     * @param {Object} engineer - Engineer entity
     * @returns {boolean} - True if test passes
     */
    testEngineerAttributes(engineer) {
        if (!engineer) {
            this.logTest('Engineer Entity Test', false, 'Engineer entity is null');
            return false;
        }

        // Get expected attributes from CSV
        const classLoader = this.scene.classLoader || window.gameClassLoader;
        if (!classLoader) {
            this.logTest('Engineer CSV Test', false, 'ClassLoader not available');
            return false;
        }

        const engineerClass = engineer.engineerClass;
        if (!engineerClass || !engineerClass.name) {
            this.logTest('Engineer Class Test', false, 'Engineer has no class name');
            return false;
        }

        const csvData = classLoader.getEngineerClass(engineerClass.name);
        if (!csvData) {
            this.logTest(`Engineer CSV Data (${engineerClass.name})`, false, 'CSV data not found');
            return false;
        }

        // Test color
        let passed = true;
        let failReason = '';

        if (engineer.tintTopLeft !== csvData.color) {
            passed = false;
            failReason += `Color mismatch: entity=${engineer.tintTopLeft}, csv=${csvData.color}. `;
        }

        // Test health if available
        if (engineer.health !== undefined && csvData.health !== undefined) {
            if (engineer.health !== csvData.health && engineer.maxHealth !== csvData.health) {
                passed = false;
                failReason += `Health mismatch: entity=${engineer.health}/${engineer.maxHealth}, csv=${csvData.health}. `;
            }
        }

        // Test damage if available on attack component
        if (engineer.attackDamage !== undefined && csvData.damage !== undefined) {
            if (!isEqual(engineer.attackDamage, csvData.damage)) {
                passed = false;
                failReason += `Damage mismatch: entity=${engineer.attackDamage}, csv=${csvData.damage}. `;
            }
        }

        // Test range if available
        if (engineer.attackRange !== undefined && csvData.range !== undefined) {
            if (!isEqual(engineer.attackRange, csvData.range * 16)) { // Multiply by TILE_SIZE
                passed = false;
                failReason += `Range mismatch: entity=${engineer.attackRange}, csv=${csvData.range * 16}. `;
            }
        }

        // Test cooldown if available
        if (engineer.specialAttackCooldownMax !== undefined && csvData.cooldown !== undefined) {
            if (!isEqual(engineer.specialAttackCooldownMax, csvData.cooldown)) {
                passed = false;
                failReason += `Cooldown mismatch: entity=${engineer.specialAttackCooldownMax}, csv=${csvData.cooldown}. `;
            }
        }

        this.logTest(`Engineer ${engineerClass.name} Attributes`, passed, failReason);
        return passed;
    }

    /**
     * Test that a commander uses the correct attributes from CSV
     * @param {Object} commander - Commander entity
     * @returns {boolean} - True if test passes
     */
    testCommanderAttributes(commander) {
        if (!commander) {
            this.logTest('Commander Entity Test', false, 'Commander entity is null');
            return false;
        }

        // Get expected attributes from CSV
        const classLoader = this.scene.classLoader || window.gameClassLoader;
        if (!classLoader) {
            this.logTest('Commander CSV Test', false, 'ClassLoader not available');
            return false;
        }

        const commanderClass = commander.commanderClass || 
                              (commander.currentHeroClass ? { name: commander.currentHeroClass.name } : null);
        
        if (!commanderClass || !commanderClass.name) {
            this.logTest('Commander Class Test', false, 'Commander has no class name');
            return false;
        }

        const csvData = classLoader.getCommanderClass(commanderClass.name);
        if (!csvData) {
            this.logTest(`Commander CSV Data (${commanderClass.name})`, false, 'CSV data not found');
            return false;
        }

        // Test color
        let passed = true;
        let failReason = '';

        if (commander.tintTopLeft !== csvData.color && commander.color !== csvData.color) {
            passed = false;
            failReason += `Color mismatch: entity=${commander.tintTopLeft || commander.color}, csv=${csvData.color}. `;
        }

        // Test health if available
        if (commander.health !== undefined && csvData.health !== undefined) {
            if (!isEqual(commander.health, csvData.health) && !isEqual(commander.maxHealth, csvData.health)) {
                passed = false;
                failReason += `Health mismatch: entity=${commander.health}/${commander.maxHealth}, csv=${csvData.health}. `;
            }
        }

        // Test damage if available
        if (commander.attackDamage !== undefined && csvData.damage !== undefined) {
            if (!isEqual(commander.attackDamage, csvData.damage)) {
                passed = false;
                failReason += `Damage mismatch: entity=${commander.attackDamage}, csv=${csvData.damage}. `;
            }
        }

        // Test cooldown if available
        if (commander.specialAttackCooldownMax !== undefined && csvData.cooldown !== undefined) {
            if (!isEqual(commander.specialAttackCooldownMax, csvData.cooldown)) {
                passed = false;
                failReason += `Cooldown mismatch: entity=${commander.specialAttackCooldownMax}, csv=${csvData.cooldown}. `;
            }
        }

        this.logTest(`Commander ${commanderClass.name} Attributes`, passed, failReason);
        return passed;
    }

    /**
     * Log a test result
     * @param {string} testName - Name of the test
     * @param {boolean} passed - Whether the test passed
     * @param {string} failReason - Reason for failure if failed
     */
    logTest(testName, passed, failReason = '') {
        if (passed) {
            this.passedTests++;
            console.log(`✅ PASS: ${testName}`);
        } else {
            this.failedTests++;
            console.error(`❌ FAIL: ${testName} - ${failReason}`);
        }
        
        this.tests.push({
            name: testName,
            passed: passed,
            reason: failReason
        });
    }

    /**
     * Run all tests
     * @param {Object} gameState - Game state object with engineers and commander
     */
    runAllTests(gameState) {
        console.log('======= RUNNING GAME INTEGRATION TESTS =======');
        
        // Test commander
        if (gameState.commander) {
            this.testCommanderAttributes(gameState.commander);
        } else if (gameState.player) {
            this.testCommanderAttributes(gameState.player);
        } else {
            this.logTest('Commander Test', false, 'No commander or player found in game state');
        }
        
        // Test engineers/followers
        if (gameState.engineers && gameState.engineers.length > 0) {
            gameState.engineers.slice(0, 3).forEach((engineer, index) => {
                this.testEngineerAttributes(engineer);
            });
        } else if (gameState.followers && gameState.followers.length > 0) {
            gameState.followers.slice(0, 3).forEach((follower, index) => {
                this.testEngineerAttributes(follower);
            });
        } else {
            this.logTest('Engineer Test', false, 'No engineers or followers found in game state');
        }
        
        // Summary
        console.log('\n======= TEST SUMMARY =======');
        console.log(`Passed: ${this.passedTests}, Failed: ${this.failedTests}, Total: ${this.tests.length}`);
        
        return {
            passed: this.passedTests,
            failed: this.failedTests,
            total: this.tests.length,
            tests: this.tests
        };
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameAttributesTest };
}

// Make available globally
window.GameAttributesTest = GameAttributesTest; 