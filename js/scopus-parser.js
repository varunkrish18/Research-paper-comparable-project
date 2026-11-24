/**
 * Scopus Publication Tracker - Scopus Parser Module
 * Handles robust parsing of Excel (.xlsx, .xls) and CSV files locally in the browser
 */

const ScopusParser = (function () {
    'use strict';

    /**
     * Cleans up header strings: removes UTF-8 BOM, trims, normalizes internal spaces
     */
    function cleanHeader(header) {
        if (!header) return '';
        return header.toString()
            .replace(/^\uFEFF/, '') // Strip UTF-8 BOM
            .trim();
    }

    /**
     * Finds the EID column key from an object regardless of case or minor formatting
     */
    function findEidKey(row) {
        if (!row || typeof row !== 'object') return null;
        const keys = Object.keys(row);
        
        // Exact match
        let found = keys.find(k => cleanHeader(k).toLowerCase() === 'eid');
        if (found) return found;

        // Strip non-alphanumeric
        found = keys.find(k => cleanHeader(k).toLowerCase().replace(/[^a-z0-9]/g, '') === 'eid');
        if (found) return found;

        // Partial match with word boundary
        found = keys.find(k => /\beid\b/i.test(cleanHeader(k)));
        return found || null;
    }

    /**
     * Normalizes EID value for accurate matching: trims, case-insensitive
     */
    function normalizeEid(eid) {
        if (eid === undefined || eid === null) return null;
        const str = eid.toString().trim();
        if (!str || str.toLowerCase() === 'nan' || str.toLowerCase() === 'null') return null;
        return str.toLowerCase();
    }

    /**
     * Parses a File or ArrayBuffer into an array of row objects
     * @param {File|ArrayBuffer} fileOrBuffer
     * @returns {Promise<{ rows: Array<Object>, headers: Array<string>, eidKey: string, fileName: string, fileSize: number }>}
     */
    function parseFile(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                return reject(new Error('No file provided.'));
            }

            const fileName = file.name || 'uploaded_file';
            const fileSize = file.size || 0;

            const reader = new FileReader();

            reader.onload = function (e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    
                    // Parse with SheetJS
                    const workbook = XLSX.read(data, {
                        type: 'array',
                        cellDates: true,
                        raw: false // read values as formatted strings to preserve text accurately
                    });

                    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                        return reject(new Error(`The file "${fileName}" does not contain any sheets.`));
                    }

                    // Read the first worksheet
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];

                    // Convert to JSON array of objects with raw headers
                    const rawRows = XLSX.utils.sheet_to_json(worksheet, {
                        defval: '', // default value for empty cells
                        raw: false
                    });

                    if (!rawRows || rawRows.length === 0) {
                        return reject(new Error(`The file "${fileName}" is empty or has no data rows.`));
                    }

                    // Clean headers on each row
                    const cleanedRows = rawRows.map(row => {
                        const newRow = {};
                        for (const key of Object.keys(row)) {
                            newRow[cleanHeader(key)] = typeof row[key] === 'string' ? row[key].trim() : (row[key] ?? '');
                        }
                        return newRow;
                    });

                    // Detect EID column
                    const firstRow = cleanedRows[0];
                    const eidKey = findEidKey(firstRow);
                    const headers = Object.keys(firstRow);

                    if (!eidKey) {
                        const available = headers.slice(0, 8).join(', ');
                        return reject(new Error(
                            `Invalid Scopus export: Could not find an "EID" column in "${fileName}".\nDetected columns: [${available}...]\nPlease ensure you uploaded a valid Scopus export file.`
                        ));
                    }

                    resolve({
                        rows: cleanedRows,
                        headers,
                        eidKey,
                        fileName,
                        fileSize,
                        sheetName: firstSheetName
                    });
                } catch (err) {
                    console.error('Error parsing file:', err);
                    reject(new Error(`Failed to parse "${fileName}": ${err.message}`));
                }
            };

            reader.onerror = function () {
                reject(new Error(`File reading error: Failed to read "${fileName}".`));
            };

            reader.readAsArrayBuffer(file);
        });
    }

    return {
        parseFile,
        findEidKey,
        normalizeEid,
        cleanHeader
    };
})();

if (typeof window !== 'undefined') {
    window.ScopusParser = ScopusParser;
}
if (typeof module !== 'undefined') {
    module.exports = ScopusParser;
}
