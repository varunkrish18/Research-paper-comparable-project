/**
 * Scopus Publication Tracker - Exporter Module
 * Handles client-side generation and downloading of Excel (.xlsx) and CSV (.csv) files
 */

const ScopusExporter = (function () {
    'use strict';

    /**
     * Sanitizes rows by removing internal underscore keys (like _originalRow)
     */
    function sanitizeRows(rows) {
        if (!Array.isArray(rows)) return [];
        return rows.map(row => {
            const clean = {};
            for (const key of Object.keys(row)) {
                if (!key.startsWith('_')) {
                    clean[key] = row[key];
                }
            }
            return clean;
        });
    }

    /**
     * Estimates column widths for SheetJS worksheet
     */
    function autoFitColumns(worksheet, data) {
        if (!data || data.length === 0) return;
        const keys = Object.keys(data[0]);
        const colWidths = keys.map(key => {
            let maxLen = key.length;
            // Check first 50 rows
            const sampleSize = Math.min(data.length, 50);
            for (let i = 0; i < sampleSize; i++) {
                const val = data[i][key];
                if (val !== undefined && val !== null) {
                    const strVal = val.toString();
                    if (strVal.length > maxLen) {
                        maxLen = Math.min(strVal.length, 60); // Cap at 60 chars
                    }
                }
            }
            return { wch: Math.max(maxLen + 3, 12) };
        });
        worksheet['!cols'] = colWidths;
    }

    /**
     * Triggers browser download for a Blob
     */
    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 300);
    }

    /**
     * Export rows as Excel (.xlsx) file
     * @param {Array<Object>} rows - Data rows
     * @param {string} filename - Output filename (e.g. 'New_Publications.xlsx')
     * @param {string} sheetName - Worksheet name
     */
    function exportToExcel(rows, filename = 'export.xlsx', sheetName = 'Publications') {
        if (!rows || rows.length === 0) {
            alert('No records available to export.');
            return;
        }

        const sanitized = sanitizeRows(rows);
        const worksheet = XLSX.utils.json_to_sheet(sanitized);
        autoFitColumns(worksheet, sanitized);

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));

        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        if (!filename.toLowerCase().endsWith('.xlsx')) {
            filename += '.xlsx';
        }
        downloadBlob(blob, filename);
    }

    /**
     * Export rows as CSV (.csv) file with UTF-8 BOM
     * @param {Array<Object>} rows - Data rows
     * @param {string} filename - Output filename (e.g. 'New_Publications.csv')
     */
    function exportToCsv(rows, filename = 'export.csv') {
        if (!rows || rows.length === 0) {
            alert('No records available to export.');
            return;
        }

        const sanitized = sanitizeRows(rows);
        const worksheet = XLSX.utils.json_to_sheet(sanitized);
        const csvContent = XLSX.utils.sheet_to_csv(worksheet);

        // Prepend UTF-8 BOM (\uFEFF) so Excel correctly recognizes UTF-8 characters and author names
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });

        if (!filename.toLowerCase().endsWith('.csv')) {
            filename += '.csv';
        }
        downloadBlob(blob, filename);
    }

    return {
        exportToExcel,
        exportToCsv
    };
})();

if (typeof window !== 'undefined') {
    window.ScopusExporter = ScopusExporter;
}
if (typeof module !== 'undefined') {
    module.exports = ScopusExporter;
}
