// Test script for Scopus Comparator Logic
const assert = require('assert');

function normalizeEid(eid) {
    if (eid === undefined || eid === null) return null;
    const str = eid.toString().trim();
    if (!str || str.toLowerCase() === 'nan' || str.toLowerCase() === 'null') return null;
    return str.toLowerCase();
}

function findEidColumnKey(row) {
    if (!row) return null;
    const keys = Object.keys(row);
    // Exact or normalized match for 'eid'
    return keys.find(k => k.trim().toLowerCase() === 'eid') ||
           keys.find(k => k.trim().toLowerCase().replace(/[^a-z]/g, '') === 'eid');
}

function analyzeDataset(rows, fileName = 'dataset') {
    if (!Array.isArray(rows) || rows.length === 0) {
        return {
            valid: false,
            error: `${fileName} is empty or contains no records.`,
            rows: [],
            validEids: new Set(),
            missingEidCount: 0,
            duplicateEidCount: 0,
            uniqueValidCount: 0,
            eidMap: new Map()
        };
    }

    const firstRow = rows[0];
    const eidKey = findEidColumnKey(firstRow);

    if (!eidKey) {
        const availableCols = Object.keys(firstRow).slice(0, 10).join(', ');
        return {
            valid: false,
            error: `Missing 'EID' column in ${fileName}. Detected columns: [${availableCols}]...`,
            rows: [],
            validEids: new Set(),
            missingEidCount: 0,
            duplicateEidCount: 0,
            uniqueValidCount: 0,
            eidMap: new Map()
        };
    }

    let missingEidCount = 0;
    let duplicateEidCount = 0;
    const eidMap = new Map(); // normalizedEid -> first row
    const seenEids = new Set();
    const duplicateList = [];
    const missingRows = [];

    rows.forEach((row, index) => {
        const rawEid = row[eidKey];
        const normEid = normalizeEid(rawEid);

        if (!normEid) {
            missingEidCount++;
            missingRows.push({ rowIndex: index + 1, row });
        } else {
            if (seenEids.has(normEid)) {
                duplicateEidCount++;
                duplicateList.push({ rowIndex: index + 1, eid: rawEid, normEid });
            } else {
                seenEids.add(normEid);
                eidMap.set(normEid, { rowIndex: index + 1, row });
            }
        }
    });

    return {
        valid: true,
        fileName,
        eidKey,
        totalRows: rows.length,
        validEids: seenEids,
        uniqueValidCount: seenEids.size,
        missingEidCount,
        duplicateEidCount,
        duplicateList,
        missingRows,
        eidMap,
        originalRows: rows
    };
}

function compareScopusExports(prevRows, latestRows) {
    const prevAnalysis = analyzeDataset(prevRows, 'Previous Week Export');
    const latestAnalysis = analyzeDataset(latestRows, 'Latest Export');

    if (!prevAnalysis.valid) {
        return { success: false, error: prevAnalysis.error, step: 'prev-file-validation' };
    }
    if (!latestAnalysis.valid) {
        return { success: false, error: latestAnalysis.error, step: 'latest-file-validation' };
    }

    const prevEids = prevAnalysis.validEids;
    const newPublications = [];
    const existingPublications = [];
    const seenInNew = new Set();

    // Iterate through latest rows to find new publications
    // Formula: New Publications = Today's EIDs - Previous Week's EIDs
    latestAnalysis.originalRows.forEach((row, idx) => {
        const rawEid = row[latestAnalysis.eidKey];
        const normEid = normalizeEid(rawEid);

        if (!normEid) {
            // Missing EID
            return;
        }

        if (prevEids.has(normEid)) {
            existingPublications.push(row);
        } else {
            // It's a new publication! Deduplicate so duplicate rows in latest don't inflate
            if (!seenInNew.has(normEid)) {
                seenInNew.add(normEid);
                newPublications.push(row);
            }
        }
    });

    return {
        success: true,
        statistics: {
            totalPreviousRecords: prevAnalysis.totalRows,
            totalLatestRecords: latestAnalysis.totalRows,
            uniquePreviousEids: prevAnalysis.uniqueValidCount,
            uniqueLatestEids: latestAnalysis.uniqueValidCount,
            newPublicationsCount: newPublications.length,
            existingPublicationsCount: existingPublications.length,
            missingEidsPrevious: prevAnalysis.missingEidCount,
            missingEidsLatest: latestAnalysis.missingEidCount,
            duplicateEidsPrevious: prevAnalysis.duplicateEidCount,
            duplicateEidsLatest: latestAnalysis.duplicateEidCount
        },
        newPublications,
        existingPublications,
        prevAnalysis,
        latestAnalysis
    };
}

// TEST CASES
console.log('--- Testing Scopus Comparison Logic ---');

const prevData = [
    { 'EID': '2-s2.0-85001', 'Title': 'Paper 1', 'Year': '2023' },
    { 'EID': '2-s2.0-85002', 'Title': 'Paper 2', 'Year': '2023' },
    { 'EID': '2-S2.0-85003 ', 'Title': 'Paper 3 (has space and uppercase)', 'Year': '2024' },
    { 'EID': '', 'Title': 'Missing EID Row', 'Year': '2024' }
];

const latestData = [
    { 'EID': '2-s2.0-85001', 'Title': 'Paper 1', 'Year': '2023' }, // Existing
    { 'EID': '2-s2.0-85003', 'Title': 'Paper 3', 'Year': '2024' },  // Existing (matched case-insensitively & trimmed)
    { 'EID': '2-s2.0-85004', 'Title': 'Paper 4 New', 'Year': '2024' }, // NEW
    { 'EID': '2-s2.0-85004', 'Title': 'Paper 4 Duplicate', 'Year': '2024' }, // Duplicate in latest
    { 'EID': '2-s2.0-85005', 'Title': 'Paper 5 New', 'Year': '2024' }, // NEW
    { 'EID': null, 'Title': 'Paper 6 No EID', 'Year': '2024' } // Missing
];

const compResult = compareScopusExports(prevData, latestData);
console.log('Comparison Result Stats:', compResult.statistics);
assert.strictEqual(compResult.success, true);
assert.strictEqual(compResult.statistics.newPublicationsCount, 2, 'Should have exactly 2 new publications');
assert.strictEqual(compResult.statistics.missingEidsPrevious, 1, 'Previous should have 1 missing EID');
assert.strictEqual(compResult.statistics.missingEidsLatest, 1, 'Latest should have 1 missing EID');
assert.strictEqual(compResult.statistics.duplicateEidsLatest, 1, 'Latest should have 1 duplicate EID');

console.log('All comparison logic assertions passed successfully!\n');
