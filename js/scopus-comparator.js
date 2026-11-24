/**
 * Scopus Publication Tracker - Scopus Comparator Module
 * Compares two Scopus exports using EID as the unique identifier
 */

const ScopusComparator = (function () {
    'use strict';

    const JournalQuartileRef = typeof JournalQuartile !== 'undefined' 
        ? JournalQuartile 
        : (typeof require !== 'undefined' ? (function(){ try { return require('./journal-quartile'); } catch(e){ return undefined; } })() : undefined);

    /**
     * Normalizes EID value for accurate matching
     */
    function normalizeEid(eid) {
        if (eid === undefined || eid === null) return null;
        const str = eid.toString().trim();
        if (!str || str.toLowerCase() === 'nan' || str.toLowerCase() === 'null') return null;
        return str.toLowerCase();
    }

    /**
     * Analyzes a dataset for EIDs, missing values, and duplicates
     */
    function analyzeDataset(parsedData, label = 'Dataset') {
        const { rows, eidKey, fileName } = parsedData;

        let missingEidCount = 0;
        let duplicateEidCount = 0;
        const seenEids = new Set();
        const duplicateList = [];
        const missingRows = [];
        const validRows = [];

        rows.forEach((row, index) => {
            const rawEid = row[eidKey];
            const normEid = normalizeEid(rawEid);

            if (!normEid) {
                missingEidCount++;
                missingRows.push({ rowIndex: index + 1, row });
            } else {
                if (seenEids.has(normEid)) {
                    duplicateEidCount++;
                    duplicateList.push({ rowIndex: index + 1, rawEid, normEid, row });
                } else {
                    seenEids.add(normEid);
                    validRows.push(row);
                }
            }
        });

        return {
            label,
            fileName: fileName || label,
            eidKey,
            totalRows: rows.length,
            validEids: seenEids,
            uniqueValidCount: seenEids.size,
            missingEidCount,
            duplicateEidCount,
            duplicateList,
            missingRows,
            validRows,
            allRows: rows
        };
    }

    /**
     * Compares previous week's export with today's export
     * Formula: New Publications = Today's EIDs - Previous Week's EIDs
     * 
     * @param {Object} prevParsedData - Result from ScopusParser for File 1
     * @param {Object} latestParsedData - Result from ScopusParser for File 2
     * @returns {Object} Comparison report with metrics, new publications, and diagnostics
     */
    function compare(prevParsedData, latestParsedData) {
        if (!prevParsedData || !prevParsedData.rows) {
            throw new Error('Previous week export data is required.');
        }
        if (!latestParsedData || !latestParsedData.rows) {
            throw new Error('Latest export data is required.');
        }

        const prevAnalysis = analyzeDataset(prevParsedData, 'Previous Week Export');
        const latestAnalysis = analyzeDataset(latestParsedData, 'Latest Export');

        const prevEidSet = prevAnalysis.validEids;
        const newPublications = [];
        const existingPublications = [];
        const seenNewEids = new Set();
        const seenExistingEids = new Set();

        // Evaluate today's rows
        latestAnalysis.allRows.forEach((row, idx) => {
            const rawEid = row[latestAnalysis.eidKey];
            const normEid = normalizeEid(rawEid);

            if (!normEid) {
                // Missing/invalid EID row - already tracked in latestAnalysis.missingRows
                return;
            }

            // Assign Quartile and SCIE status to row if JournalQuartile module is loaded
            const jq = typeof JournalQuartile !== 'undefined' ? JournalQuartile : JournalQuartileRef;
            if (jq && !row['Quartile']) {
                const qEval = jq.evaluatePublicationQuartile(row);
                row['Quartile'] = qEval.quartile;
                row['SCIE Indexed'] = qEval.isScie ? 'Yes' : 'No';
                row['Journal Ranking'] = qEval.rankingLabel;
                row['_quartileSource'] = qEval.source;
            }

            if (prevEidSet.has(normEid)) {
                // Record already exists in previous export
                if (!seenExistingEids.has(normEid)) {
                    seenExistingEids.add(normEid);
                    existingPublications.push(row);
                }
            } else {
                // Newly added publication!
                // Deduplicate so multiple identical EID entries in today's file don't inflate the new publications count
                if (!seenNewEids.has(normEid)) {
                    seenNewEids.add(normEid);
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
                totalMissingEids: prevAnalysis.missingEidCount + latestAnalysis.missingEidCount,
                duplicateEidsPrevious: prevAnalysis.duplicateEidCount,
                duplicateEidsLatest: latestAnalysis.duplicateEidCount
            },
            newPublications,
            existingPublications,
            prevAnalysis,
            latestAnalysis,
            comparisonTimestamp: new Date().toISOString()
        };
    }

    return {
        compare,
        analyzeDataset,
        normalizeEid
    };
})();

if (typeof window !== 'undefined') {
    window.ScopusComparator = ScopusComparator;
}
if (typeof module !== 'undefined') {
    module.exports = ScopusComparator;
}
