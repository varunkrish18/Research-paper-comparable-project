/**
 * End-to-End Test Suite for Scopus Publication Tracker
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ScopusComparator = require('../js/scopus-comparator');
const RitExtractor = require('../js/rit-extractor');
const JournalQuartile = require('../js/journal-quartile');
const { SAMPLE_PREVIOUS_WEEK, SAMPLE_LATEST_WEEK } = require('../js/sample-data');

console.log('=====================================================');
console.log('   SCOPUS PUBLICATION TRACKER - VERIFICATION SUITE   ');
console.log('=====================================================\n');

// 1. Test Comparator on Sample Files
console.log('[TEST 1] Testing Scopus EID Comparison Logic...');

const prevData = {
    rows: SAMPLE_PREVIOUS_WEEK,
    headers: Object.keys(SAMPLE_PREVIOUS_WEEK[0]),
    eidKey: 'EID',
    fileName: 'scopus_previous_week.xlsx'
};

const latestData = {
    rows: SAMPLE_LATEST_WEEK,
    headers: Object.keys(SAMPLE_LATEST_WEEK[0]),
    eidKey: 'EID',
    fileName: 'scopus_latest_week.xlsx'
};

const compResult = ScopusComparator.compare(prevData, latestData);

console.log('  -> Total records in previous export:', compResult.statistics.totalPreviousRecords);
console.log('  -> Total records in latest export:', compResult.statistics.totalLatestRecords);
console.log('  -> Newly added publications count:', compResult.statistics.newPublicationsCount);
console.log('  -> Existing publications count:', compResult.statistics.existingPublicationsCount);
console.log('  -> Missing/invalid EIDs in previous:', compResult.statistics.missingEidsPrevious);
console.log('  -> Missing/invalid EIDs in latest:', compResult.statistics.missingEidsLatest);
console.log('  -> Duplicate EIDs in latest:', compResult.statistics.duplicateEidsLatest);

assert.strictEqual(compResult.success, true);
assert.strictEqual(compResult.statistics.totalPreviousRecords, 15);
assert.strictEqual(compResult.statistics.totalLatestRecords, 22);
assert.strictEqual(compResult.statistics.newPublicationsCount, 6, 'Must find exactly 6 new publications');
assert.strictEqual(compResult.statistics.missingEidsPrevious, 1, 'Previous has 1 missing EID row');
assert.strictEqual(compResult.statistics.missingEidsLatest, 1, 'Latest has 1 missing EID row');
assert.strictEqual(compResult.statistics.duplicateEidsLatest, 1, 'Latest has 1 duplicate EID row');
console.log('  ✓ Test 1 Passed: Comparison metrics and deduplication validated.\n');

// 2. Test RIT Affiliation Extraction
console.log('[TEST 2] Testing RIT Author Affiliation Extraction...');

const ritProcessed = RitExtractor.processRitPublications(compResult.latestAnalysis.allRows);
console.log('  -> Total RIT Publications in Latest Export:', ritProcessed.totalRitPubs);
console.log('  -> Total Unique RIT Authors:', ritProcessed.totalUniqueAuthors);

assert(ritProcessed.totalRitPubs > 0, 'Must identify RIT publications');
assert(ritProcessed.totalUniqueAuthors > 0, 'Must identify unique RIT authors');

// Verify that each RIT publication contains 'RIT Authors' column
const sampleRitPub = ritProcessed.ritPublications[0];
console.log('  -> Sample RIT Publication EID:', sampleRitPub['EID']);
console.log('  -> Sample Extracted RIT Authors:', sampleRitPub['RIT Authors']);

const requiredCols = [
    'EID', 'Title', 'Year', 'Authors', 'RIT Authors',
    'Authors with affiliations', 'Affiliations', 'DOI',
    'Source title', 'Document Type'
];

for (const col of requiredCols) {
    assert(col in sampleRitPub, `Missing required column "${col}" in RIT Publications output`);
}
console.log('  ✓ Test 2 Passed: All 10 required RIT publication columns verified.\n');

// 3. Test That Non-RIT Authors Are Not Included in RIT Authors Column
console.log('[TEST 3] Testing Negative Filtering (Non-RIT authors excluded)...');

// Paper 1: Chinnammal V. (RIT), Anand R. (RIT), Ramesh K. (Anna University)
const paper1 = ritProcessed.ritPublications.find(p => p['EID'] === '2-s2.0-85148000001');
assert(paper1, 'Paper 1 must be present in RIT publications');
assert(paper1['RIT Authors'].includes('Chinnammal'), 'Chinnammal must be in RIT Authors');
assert(paper1['RIT Authors'].includes('Anand'), 'Anand must be in RIT Authors');
assert(!paper1['RIT Authors'].includes('Ramesh'), 'Ramesh (Anna University) must NOT be in RIT Authors');
console.log('  ✓ Test 3 Passed: External authors strictly excluded from RIT Authors column.\n');

// 4. Test RIT vs Rajalakshmi Engineering College (REC)
console.log('[TEST 4] Testing Sister Institution Disambiguation...');
const recPaper = ritProcessed.ritPublications.find(p => p['EID'] === '2-s2.0-85148000007');
assert.strictEqual(recPaper, undefined, 'Rajalakshmi Engineering College (REC) papers must NOT be counted as RIT!');
console.log('  ✓ Test 4 Passed: REC paper correctly excluded from RIT results.\n');

// 5. Test Unique Authors List Structure
console.log('[TEST 5] Testing Unique Authors List Structure...');
const authorList = ritProcessed.uniqueAuthors;
assert(authorList.length >= 5, 'Should have multiple unique authors');

const topAuthor = authorList[0];
console.log('  -> Top RIT Author:', topAuthor['Author Name'], '| Publications:', topAuthor['Total Publications']);
assert('Author Name' in topAuthor);
assert('Total Publications' in topAuthor);
assert('Publication Years' in topAuthor);
assert('Publication Titles' in topAuthor);
assert('EIDs' in topAuthor);
console.log('  ✓ Test 5 Passed: Unique author list structure verified.\n');

// 6. Test RIT Authors in NEW Publications
console.log('[TEST 6] Testing RIT Authors in Newly Added Publications...');
const ritInNew = RitExtractor.processRitPublications(compResult.newPublications);
console.log('  -> Newly Added RIT Publications:', ritInNew.totalRitPubs);
assert.strictEqual(ritInNew.totalRitPubs, 4, 'Should identify exactly 4 new RIT publications out of 6 new publications');
console.log('  ✓ Test 6 Passed: Combined analysis cross-matrix verified.\n');

// 7. Test Export Generation (XLSX and CSV with BOM)
console.log('[TEST 7] Testing XLSX and CSV Generation...');
const outDir = path.join(__dirname, '..', 'sample-files', 'test-output');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Export 1: New Publications
const wsNew = XLSX.utils.json_to_sheet(compResult.newPublications);
const wbNew = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbNew, wsNew, 'New_Publications');
XLSX.writeFile(wbNew, path.join(outDir, 'New_Publications.xlsx'));
fs.writeFileSync(path.join(outDir, 'New_Publications.csv'), '\uFEFF' + XLSX.utils.sheet_to_csv(wsNew), 'utf8');

// Export 2: RIT Publications
const wsRit = XLSX.utils.json_to_sheet(ritProcessed.ritPublications);
const wbRit = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbRit, wsRit, 'RIT_Publications');
XLSX.writeFile(wbRit, path.join(outDir, 'RIT_Publications.xlsx'));
fs.writeFileSync(path.join(outDir, 'RIT_Publications.csv'), '\uFEFF' + XLSX.utils.sheet_to_csv(wsRit), 'utf8');

// Export 3: Unique Authors
const wsAuthors = XLSX.utils.json_to_sheet(ritProcessed.uniqueAuthors);
const wbAuthors = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbAuthors, wsAuthors, 'RIT_Unique_Authors');
XLSX.writeFile(wbAuthors, path.join(outDir, 'RIT_Unique_Authors.xlsx'));
fs.writeFileSync(path.join(outDir, 'RIT_Unique_Authors.csv'), '\uFEFF' + XLSX.utils.sheet_to_csv(wsAuthors), 'utf8');

assert(fs.existsSync(path.join(outDir, 'New_Publications.xlsx')));
assert(fs.existsSync(path.join(outDir, 'New_Publications.csv')));
assert(fs.existsSync(path.join(outDir, 'RIT_Publications.xlsx')));
assert(fs.existsSync(path.join(outDir, 'RIT_Publications.csv')));
assert(fs.existsSync(path.join(outDir, 'RIT_Unique_Authors.xlsx')));
assert(fs.existsSync(path.join(outDir, 'RIT_Unique_Authors.csv')));

console.log('  ✓ Test 7 Passed: All 6 output files successfully created and verified.\n');

// 8. Test Journal Quartile Classification (Q1, Q2, Q3, Q4)
console.log('[TEST 8] Testing Journal Quartile (Q1 / Q2 / Q3 / Q4) Classification...');

// Test 8a: Verify individual journal classifications
const q1Sample = JournalQuartile.evaluatePublicationQuartile({
    'Source title': 'IEEE Transactions on Industrial Informatics',
    'Document Type': 'Article'
});
console.log('  -> IEEE Transactions on Industrial Informatics:', q1Sample.quartile);
assert.strictEqual(q1Sample.quartile, 'Q1');

const q2Sample = JournalQuartile.evaluatePublicationQuartile({
    'Source title': 'Materials and Manufacturing Processes',
    'Document Type': 'Article'
});
console.log('  -> Materials and Manufacturing Processes:', q2Sample.quartile);
assert.strictEqual(q2Sample.quartile, 'Q2');

const q3Sample = JournalQuartile.evaluatePublicationQuartile({
    'Source title': 'Microwave and Optical Technology Letters',
    'Document Type': 'Article'
});
console.log('  -> Microwave and Optical Technology Letters:', q3Sample.quartile);
assert.strictEqual(q3Sample.quartile, 'Q3');

const q4Sample = JournalQuartile.evaluatePublicationQuartile({
    'Source title': 'Journal of Circuits, Systems and Computers',
    'Document Type': 'Article'
});
console.log('  -> Journal of Circuits, Systems and Computers:', q4Sample.quartile);
assert.strictEqual(q4Sample.quartile, 'Q4');

const confSample = JournalQuartile.evaluatePublicationQuartile({
    'Source title': '2023 International Conference on Computer Communication and Informatics (ICCCI)',
    'Document Type': 'Conference Paper'
});
console.log('  -> Conference Paper:', confSample.quartile);
assert.strictEqual(confSample.quartile, 'Conference');

// Test 8b: Direct column detection (if file has Quartile column)
const directColSample = JournalQuartile.evaluatePublicationQuartile({
    'Source title': 'Custom Regional Journal',
    'Document Type': 'Article',
    'Quartile': 'Q2'
});
assert.strictEqual(directColSample.quartile, 'Q2');

// Test 8c: CiteScore Percentile mapping (>=75 -> Q1)
const percentileSample = JournalQuartile.evaluatePublicationQuartile({
    'Source title': 'Unlisted Applied Science Journal',
    'Document Type': 'Article',
    'CiteScore Percentile': '88'
});
assert.strictEqual(percentileSample.quartile, 'Q1');

// Test 8d: Verify Quartile is present in RIT publications output
assert('Quartile' in sampleRitPub, 'RIT publication output must include Quartile column');
console.log('  -> RIT Publication Quartile in output dataset:', sampleRitPub['Quartile']);

console.log('  ✓ Test 8 Passed: Journal Quartile (Q1/Q2/Q3/Q4) classification validated.\n');

// 9. Test Step 2: RIT Author Name, Designation, and Department Extraction from NEWLY ADDED publications
console.log('[TEST 9] Testing Step 2: Author Name, Designation, and Department Extraction from NEWLY ADDED publications...');
assert(ritInNew.ritAuthorRows.length > 0, 'Must produce ritAuthorRows for newly added records');
const sampleNewAuthorRow = ritInNew.ritAuthorRows[0];
console.log('  -> Sample New RIT Author Row:', {
    'Author Name': sampleNewAuthorRow['Author Name'],
    'Designation': sampleNewAuthorRow['Designation'],
    'Department': sampleNewAuthorRow['Department'],
    'Paper Title': sampleNewAuthorRow['Paper Title'],
    'Quartile': sampleNewAuthorRow['Quartile'],
    'SCIE Indexed': sampleNewAuthorRow['SCIE Indexed']
});

assert(sampleNewAuthorRow['Author Name'], 'Must have Author Name');
assert(sampleNewAuthorRow['Designation'], 'Must have Designation');
assert(sampleNewAuthorRow['Department'], 'Must have Department');
assert.strictEqual(ritInNew.totalRitPubs, 4, 'Must identify 4 RIT publications in new records');

// Generate Step 2 Excel file from newly added records
const wsStep2 = XLSX.utils.json_to_sheet(ritInNew.ritAuthorRows);
const wbStep2 = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbStep2, wsStep2, 'New_RIT_Authors');
XLSX.writeFile(wbStep2, path.join(outDir, 'New_RIT_Authors_and_Publications.xlsx'));
assert(fs.existsSync(path.join(outDir, 'New_RIT_Authors_and_Publications.xlsx')), 'New_RIT_Authors_and_Publications.xlsx must exist');
console.log('  ✓ Test 9 Passed: Step 2 RIT Author details & Excel generation from newly added records verified.\n');

// 10. Test Step 3: SCIE Indexing & Clarivate Ranking from NEWLY ADDED publications
console.log('[TEST 10] Testing Step 3: SCIE Ranking Detection from NEWLY ADDED publications...');
const scieSample = JournalQuartile.evaluatePublicationQuartile({
    'Source title': 'IEEE Transactions on Industrial Informatics',
    'Document Type': 'Article'
});
console.log('  -> IEEE Trans. Industrial Informatics SCIE status:', scieSample.isScie, '| Label:', scieSample.rankingLabel);
assert.strictEqual(scieSample.isScie, true);
assert(scieSample.rankingLabel.includes('SCIE'), 'Must include SCIE in ranking label');

const qStatsNew = JournalQuartile.summarizeQuartiles(compResult.newPublications);
console.log('  -> Newly Added Publications Quartile & SCIE Summary:', {
    Q1: qStatsNew.Q1,
    Q2: qStatsNew.Q2,
    Q3: qStatsNew.Q3,
    Q4: qStatsNew.Q4,
    SCIE: qStatsNew.SCIE,
    totalNew: compResult.newPublications.length
});
assert.strictEqual(compResult.newPublications.length, 6, 'Must have 6 newly added publications');
assert(qStatsNew.Q1 > 0, 'Must identify Q1 articles in newly added publications');
assert(qStatsNew.Q2 > 0, 'Must identify Q2 articles in newly added publications');
assert(qStatsNew.SCIE > 0, 'Must identify SCIE articles in newly added publications');

// Verify that each newly added publication has Quartile and SCIE status populated
compResult.newPublications.forEach(p => {
    assert(p['Quartile'], `Publication ${p['EID']} must have Quartile`);
    assert(p['SCIE Indexed'], `Publication ${p['EID']} must have SCIE status`);
});
console.log('  ✓ Test 10 Passed: Step 3 Q1/Q2/Q3/Q4 and SCIE classification from newly added records verified.\n');

console.log('=====================================================');
console.log('   ALL 10 TESTS COMPLETED SUCCESSFULLY WITH ZERO ERRORS ');
console.log('=====================================================');
