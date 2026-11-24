// Test script for XLSX and CSV export using SheetJS
const XLSX = require('xlsx');
const fs = require('fs');
const assert = require('assert');

const testRows = [
    {
        'EID': '2-s2.0-85190000001',
        'Title': 'IoT-based Smart Energy Monitoring System',
        'Year': 2024,
        'Authors': 'Chinnammal, V.; Anand, R.',
        'RIT Authors': 'Chinnammal, V.; Anand, R.',
        'Authors with affiliations': 'Chinnammal V., Rajalakshmi Institute of Technology, Department of ECE, Chennai, India; Anand R., Rajalakshmi Institute of Technology, Department of CSE, Chennai, India',
        'Affiliations': 'Rajalakshmi Institute of Technology, Chennai, India',
        'DOI': '10.1109/ACCESS.2024.1001',
        'Source title': 'IEEE Access',
        'Document Type': 'Article'
    }
];

// Test writing to Excel buffer
const ws = XLSX.utils.json_to_sheet(testRows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'RIT_Publications');
const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
assert(excelBuffer.length > 0, 'Excel buffer must not be empty');

// Test reading it back
const readWb = XLSX.read(excelBuffer, { type: 'buffer' });
const readSheet = readWb.Sheets['RIT_Publications'];
const readRows = XLSX.utils.sheet_to_json(readSheet);
assert.strictEqual(readRows.length, 1);
assert.strictEqual(readRows[0]['EID'], '2-s2.0-85190000001');
assert.strictEqual(readRows[0]['RIT Authors'], 'Chinnammal, V.; Anand, R.');

// Test CSV generation with BOM for Excel UTF-8 compatibility
const csvString = '\uFEFF' + XLSX.utils.sheet_to_csv(ws);
assert(csvString.includes('Chinnammal, V.'), 'CSV must contain author');

console.log('SheetJS export test passed successfully!');
