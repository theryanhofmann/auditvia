"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runA11yScan_1 = require("./runA11yScan");
async function testScan() {
    try {
        console.log('Testing accessibility scan...');
        const result = await (0, runA11yScan_1.runA11yScan)('https://example.com');
        console.log('Scan completed successfully!');
        console.log('Score:', result.score);
        console.log('Issues found:', result.issues.length);
        console.log('Sample issue:', result.issues[0]?.description || 'No issues found');
    }
    catch (error) {
        console.error('Test failed:', error);
    }
}
testScan();
