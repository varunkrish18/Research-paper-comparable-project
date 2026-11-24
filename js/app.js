/**
 * Scopus Publication Tracker - Main Application Controller
 * Handles UI events, state, drag-drop, rendering, pagination, search, and downloads
 */

(function () {
    'use strict';

    // Application State
    const state = {
        file1: null, // Parsed data for previous week
        file2: null, // Parsed data for latest week
        comparisonResult: null,
        ritLatestResult: null,
        ritNewResult: null,
        activeTab: 'overview',
        currentTableType: 'new', // 'new' | 'rit-all' | 'rit-authors'
        
        // Table filtering & pagination state
        searchQuery: '',
        filterYear: 'all',
        filterDocType: 'all',
        filterQuartile: 'all',
        sortColumn: '',
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 15,
        authorsScope: 'new', // 'new' (Step 2 newly added) | 'all' (cumulative)

        // Modal selected record
        selectedRecord: null
    };

    // DOM Elements
    const elements = {
        // Dropzones
        dropzone1: document.getElementById('dropzone1'),
        fileInput1: document.getElementById('fileInput1'),
        fileInfo1: document.getElementById('fileInfo1'),
        fileName1: document.getElementById('fileName1'),
        fileMeta1: document.getElementById('fileMeta1'),
        removeFile1: document.getElementById('removeFile1'),

        dropzone2: document.getElementById('dropzone2'),
        fileInput2: document.getElementById('fileInput2'),
        fileInfo2: document.getElementById('fileInfo2'),
        fileName2: document.getElementById('fileName2'),
        fileMeta2: document.getElementById('fileMeta2'),
        removeFile2: document.getElementById('removeFile2'),

        // Action Buttons
        btnRunAnalysis: document.getElementById('btnRunAnalysis'),
        btnLoadDemo: document.getElementById('btnLoadDemo'),
        btnReset: document.getElementById('btnReset'),

        // Tabs
        tabBtns: document.querySelectorAll('.nav-tab-btn'),
        tabPanes: document.querySelectorAll('.tab-pane'),

        // Loading overlay
        loadingOverlay: document.getElementById('loadingOverlay'),
        loadingText: document.getElementById('loadingText'),

        // Notification toast
        notificationToast: document.getElementById('notificationToast'),
        toastMessage: document.getElementById('toastMessage'),

        // Stats elements in Overview & Dashboard
        statTotalPrev: document.getElementById('statTotalPrev'),
        statTotalLatest: document.getElementById('statTotalLatest'),
        statNewPubs: document.getElementById('statNewPubs'),
        statExistingPubs: document.getElementById('statExistingPubs'),
        statMissingEids: document.getElementById('statMissingEids'),
        statDuplicateEids: document.getElementById('statDuplicateEids'),

        // Combined analysis stats
        statCombinedNew: document.getElementById('statCombinedNew'),
        statCombinedRitNew: document.getElementById('statCombinedRitNew'),
        statCombinedRitTotal: document.getElementById('statCombinedRitTotal'),
        statCombinedRitAuthors: document.getElementById('statCombinedRitAuthors'),

        // Quartile summary stats
        statQ1Count: document.getElementById('statQ1Count'),
        statQ2Count: document.getElementById('statQ2Count'),
        statQ3Count: document.getElementById('statQ3Count'),
        statQ4Count: document.getElementById('statQ4Count'),

        // Tables & Table Controls
        tableSearchInput: document.getElementById('tableSearchInput'),
        tableYearFilter: document.getElementById('tableYearFilter'),
        tableDocTypeFilter: document.getElementById('tableDocTypeFilter'),
        tableQuartileFilter: document.getElementById('tableQuartileFilter'),
        tablePageSize: document.getElementById('tablePageSize'),
        tableSubNav: document.querySelectorAll('.table-subnav-btn'),

        resultsTableHead: document.getElementById('resultsTableHead'),
        resultsTableBody: document.getElementById('resultsTableBody'),
        tableRecordCount: document.getElementById('tableRecordCount'),
        paginationControls: document.getElementById('paginationControls'),

        // Unique Authors Table
        authorsTableBody: document.getElementById('authorsTableBody'),
        authorsSearchInput: document.getElementById('authorsSearchInput'),
        authorsRecordCount: document.getElementById('authorsRecordCount'),

        // Diagnostics elements
        diagContainer: document.getElementById('diagContainer'),

        // Modal
        recordModal: document.getElementById('recordModal'),
        modalTitle: document.getElementById('modalTitle'),
        modalContent: document.getElementById('modalContent'),
        modalCloseBtn: document.getElementById('modalCloseBtn'),

        // 3-Step Hub elements
        btnExportStep1Xlsx: document.getElementById('btnExportStep1Xlsx'),
        btnExportStep2Xlsx: document.getElementById('btnExportStep2Xlsx'),
        hubStep1Count: document.getElementById('hubStep1Count'),
        hubStep2Count: document.getElementById('hubStep2Count'),
        hubQ1Count: document.getElementById('hubQ1Count'),
        hubQ2Count: document.getElementById('hubQ2Count'),
        hubQ3Count: document.getElementById('hubQ3Count'),
        hubQ4Count: document.getElementById('hubQ4Count'),
        hubScieCount: document.getElementById('hubScieCount'),

        // Export Buttons
        btnExportNewXlsx: document.getElementById('btnExportNewXlsx'),
        btnExportNewCsv: document.getElementById('btnExportNewCsv'),
        btnExportRitXlsx: document.getElementById('btnExportRitXlsx'),
        btnExportRitCsv: document.getElementById('btnExportRitCsv'),
        btnExportAuthorsXlsx: document.getElementById('btnExportAuthorsXlsx'),
        btnExportAuthorsCsv: document.getElementById('btnExportAuthorsCsv')
    };

    /**
     * Show notification toast
     */
    function showToast(message, type = 'info') {
        if (!elements.notificationToast) return;
        elements.toastMessage.textContent = message;
        
        elements.notificationToast.className = `fixed bottom-5 right-5 z-50 flex items-center px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all duration-300 transform translate-y-0 opacity-100 ${
            type === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
            type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
            'bg-slate-900 text-white border-slate-700'
        }`;

        setTimeout(() => {
            elements.notificationToast.classList.add('opacity-0', 'translate-y-4');
        }, 4000);
    }

    /**
     * Show or hide loading indicator
     */
    function setLoading(isLoading, text = 'Processing data...') {
        if (!elements.loadingOverlay) return;
        if (isLoading) {
            elements.loadingText.textContent = text;
            elements.loadingOverlay.classList.remove('hidden');
        } else {
            elements.loadingOverlay.classList.add('hidden');
        }
    }

    /**
     * Initialize Dropzones
     */
    function setupDropzone(dropzoneEl, fileInputEl, fileNum) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzoneEl.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzoneEl.classList.add('border-indigo-500', 'bg-indigo-50/50');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzoneEl.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzoneEl.classList.remove('border-indigo-500', 'bg-indigo-50/50');
            });
        });

        dropzoneEl.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileSelection(files[0], fileNum);
            }
        });

        fileInputEl.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelection(e.target.files[0], fileNum);
            }
        });

        dropzoneEl.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            fileInputEl.click();
        });
    }

    /**
     * Handles file selection and parsing
     */
    async function handleFileSelection(file, fileNum) {
        setLoading(true, `Reading and verifying ${file.name}...`);
        try {
            const parsed = await ScopusParser.parseFile(file);
            if (fileNum === 1) {
                state.file1 = parsed;
                displayFileInfo(1, parsed);
            } else {
                state.file2 = parsed;
                displayFileInfo(2, parsed);
            }
            showToast(`Loaded ${file.name} (${parsed.rows.length} records, EID column detected)`, 'success');
            checkReadyToRun();
        } catch (err) {
            console.error('File parsing error:', err);
            showToast(err.message, 'error');
            alert(`File Error:\n${err.message}`);
        } finally {
            setLoading(false);
        }
    }

    /**
     * Updates file info display in the dropzone
     */
    function displayFileInfo(fileNum, parsed) {
        const fileInfoEl = fileNum === 1 ? elements.fileInfo1 : elements.fileInfo2;
        const fileNameEl = fileNum === 1 ? elements.fileName1 : elements.fileName2;
        const fileMetaEl = fileNum === 1 ? elements.fileMeta1 : elements.fileMeta2;
        const dropPromptEl = document.getElementById(`dropPrompt${fileNum}`);

        if (dropPromptEl) dropPromptEl.classList.add('hidden');
        fileInfoEl.classList.remove('hidden');

        fileNameEl.textContent = parsed.fileName;
        const sizeKb = (parsed.fileSize / 1024).toFixed(1);
        fileMetaEl.textContent = `${sizeKb} KB • ${parsed.rows.length} rows • EID: "${parsed.eidKey}"`;
    }

    /**
     * Clears file info
     */
    function clearFile(fileNum) {
        if (fileNum === 1) {
            state.file1 = null;
            elements.fileInput1.value = '';
            elements.fileInfo1.classList.add('hidden');
            const dropPrompt = document.getElementById('dropPrompt1');
            if (dropPrompt) dropPrompt.classList.remove('hidden');
        } else {
            state.file2 = null;
            elements.fileInput2.value = '';
            elements.fileInfo2.classList.add('hidden');
            const dropPrompt = document.getElementById('dropPrompt2');
            if (dropPrompt) dropPrompt.classList.remove('hidden');
        }
        checkReadyToRun();
    }

    /**
     * Enables/disables run button based on file selection
     */
    function checkReadyToRun() {
        if (state.file1 && state.file2) {
            elements.btnRunAnalysis.disabled = false;
            elements.btnRunAnalysis.classList.remove('opacity-50', 'cursor-not-allowed');
            elements.btnRunAnalysis.classList.add('shadow-lg', 'shadow-indigo-500/20');
        } else {
            elements.btnRunAnalysis.disabled = true;
            elements.btnRunAnalysis.classList.add('opacity-50', 'cursor-not-allowed');
            elements.btnRunAnalysis.classList.remove('shadow-lg', 'shadow-indigo-500/20');
        }
    }

    /**
     * Load Demo / Sample Data for instant 1-click evaluation
     */
    function loadDemoData() {
        if (typeof window.SAMPLE_PREVIOUS_WEEK === 'undefined' || typeof window.SAMPLE_LATEST_WEEK === 'undefined') {
            showToast('Sample data not found. Please upload files directly.', 'error');
            return;
        }

        setLoading(true, 'Loading sample Scopus datasets...');

        // Parse previous week sample
        const prevRows = JSON.parse(JSON.stringify(window.SAMPLE_PREVIOUS_WEEK));
        const latestRows = JSON.parse(JSON.stringify(window.SAMPLE_LATEST_WEEK));

        state.file1 = {
            rows: prevRows,
            headers: Object.keys(prevRows[0]),
            eidKey: 'EID',
            fileName: 'sample_previous_week_export.xlsx',
            fileSize: 45200
        };

        state.file2 = {
            rows: latestRows,
            headers: Object.keys(latestRows[0]),
            eidKey: 'EID',
            fileName: 'sample_latest_week_export.xlsx',
            fileSize: 58400
        };

        displayFileInfo(1, state.file1);
        displayFileInfo(2, state.file2);
        checkReadyToRun();

        // Run analysis automatically for immediate feedback
        setTimeout(() => {
            runAnalysis();
            showToast('Sample Scopus datasets loaded and analyzed successfully!', 'success');
        }, 400);
    }

    /**
     * Main analysis execution: Feature 1, Feature 2, Feature 3
     */
    function runAnalysis() {
        if (!state.file1 || !state.file2) {
            alert('Please upload both the Previous Week Export and the Latest Export.');
            return;
        }

        setLoading(true, 'Comparing Scopus datasets and extracting RIT affiliations...');

        setTimeout(() => {
            try {
                // 1. Feature 1: Scopus EID Comparison
                const compResult = ScopusComparator.compare(state.file1, state.file2);
                state.comparisonResult = compResult;

                // 2. Feature 2: RIT Affiliation Extraction for ALL latest publications
                const ritLatest = RitExtractor.processRitPublications(compResult.latestAnalysis.allRows);
                state.ritLatestResult = ritLatest;

                // Extract RIT authors specifically for the NEW publications
                const ritNew = RitExtractor.processRitPublications(compResult.newPublications);
                state.ritNewResult = ritNew;

                // 3. Update Dashboard Stats (Feature 1 & Feature 3)
                updateDashboardStats();

                // 4. Update Year and DocType dropdown filters
                populateFilters();

                // 5. Render active view
                renderCurrentTable();
                renderAuthorsTable();
                renderDiagnostics();

                // 6. Render Charts (Feature 3 Combined Analytics)
                if (typeof ScopusCharts !== 'undefined') {
                    ScopusCharts.renderYearDistribution('chartYearDistribution', ritLatest.ritPublications, compResult.latestAnalysis.allRows);
                    ScopusCharts.renderTopAuthors('chartTopAuthors', ritLatest.uniqueAuthors, 8);
                    ScopusCharts.renderQuartileBreakdown('chartQuartileDistribution', compResult.latestAnalysis.allRows);
                    ScopusCharts.renderDocTypeBreakdown('chartDocTypes', ritLatest.ritPublications);
                }

                // Enable export buttons
                enableExportButtons();

                // Switch to comparison tab if user was on upload screen
                document.getElementById('resultsSection').classList.remove('hidden');
                
                showToast(`Comparison complete: ${compResult.statistics.newPublicationsCount} new publications found, ${ritLatest.totalRitPubs} RIT publications mapped!`, 'success');

                // Smooth scroll to results
                document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
            } catch (err) {
                console.error('Analysis error:', err);
                alert(`Error during analysis: ${err.message}`);
                showToast(err.message, 'error');
            } finally {
                setLoading(false);
            }
        }, 150);
    }

    /**
     * Update metric cards in the dashboard
     */
    function updateDashboardStats() {
        if (!state.comparisonResult || !state.ritLatestResult) return;

        const s = state.comparisonResult.statistics;
        const ritTotal = state.ritLatestResult.totalRitPubs;
        const ritUnique = state.ritLatestResult.totalUniqueAuthors;
        const ritNewCount = state.ritNewResult ? state.ritNewResult.totalRitPubs : 0;

        // Metric cards in Overview
        if (elements.statTotalPrev) elements.statTotalPrev.textContent = s.totalPreviousRecords.toLocaleString();
        if (elements.statTotalLatest) elements.statTotalLatest.textContent = s.totalLatestRecords.toLocaleString();
        if (elements.statNewPubs) elements.statNewPubs.textContent = s.newPublicationsCount.toLocaleString();
        if (elements.statExistingPubs) elements.statExistingPubs.textContent = s.existingPublicationsCount.toLocaleString();
        if (elements.statMissingEids) elements.statMissingEids.textContent = s.totalMissingEids.toLocaleString();
        if (elements.statDuplicateEids) elements.statDuplicateEids.textContent = (s.duplicateEidsPrevious + s.duplicateEidsLatest).toLocaleString();

        // Feature 3: Combined Analysis Summary Cards
        if (elements.statCombinedNew) elements.statCombinedNew.textContent = s.newPublicationsCount.toLocaleString();
        if (elements.statCombinedRitNew) elements.statCombinedRitNew.textContent = ritNewCount.toLocaleString();
        if (elements.statCombinedRitTotal) elements.statCombinedRitTotal.textContent = ritTotal.toLocaleString();
        if (elements.statCombinedRitAuthors) elements.statCombinedRitAuthors.textContent = ritUnique.toLocaleString();

        // 3-Step Hub Metric Elements (Scoped strictly to newly added publications)
        if (elements.hubStep1Count) elements.hubStep1Count.textContent = s.newPublicationsCount.toLocaleString();
        
        // Step 2: RIT Authors strictly from NEWLY ADDED publications
        const ritNewAuthorsCount = state.ritNewResult ? state.ritNewResult.uniqueAuthors.length : 0;
        if (elements.hubStep2Count) elements.hubStep2Count.textContent = ritNewAuthorsCount.toLocaleString();

        // Step 3: Journal Quartile & SCIE Quality Metrics strictly from NEWLY ADDED publications
        if (typeof JournalQuartile !== 'undefined' && state.comparisonResult && state.comparisonResult.newPublications) {
            const qStatsNew = JournalQuartile.summarizeQuartiles(state.comparisonResult.newPublications);
            if (elements.hubQ1Count) elements.hubQ1Count.textContent = qStatsNew.Q1.toLocaleString();
            if (elements.hubQ2Count) elements.hubQ2Count.textContent = qStatsNew.Q2.toLocaleString();
            if (elements.hubQ3Count) elements.hubQ3Count.textContent = qStatsNew.Q3.toLocaleString();
            if (elements.hubQ4Count) elements.hubQ4Count.textContent = qStatsNew.Q4.toLocaleString();
            if (elements.hubScieCount) elements.hubScieCount.textContent = (qStatsNew.SCIE || (qStatsNew.Q1 + qStatsNew.Q2)).toLocaleString();
        }

        // Feature 3: Overall Cumulative Metrics for Latest Export
        if (typeof JournalQuartile !== 'undefined') {
            const qStatsAll = JournalQuartile.summarizeQuartiles(state.comparisonResult.latestAnalysis.allRows);
            if (elements.statQ1Count) elements.statQ1Count.textContent = qStatsAll.Q1.toLocaleString();
            if (elements.statQ2Count) elements.statQ2Count.textContent = qStatsAll.Q2.toLocaleString();
            if (elements.statQ3Count) elements.statQ3Count.textContent = qStatsAll.Q3.toLocaleString();
            if (elements.statQ4Count) elements.statQ4Count.textContent = qStatsAll.Q4.toLocaleString();
        }

        // Update badge counters on tabs
        const badgeNew = document.getElementById('badgeNewPubs');
        const badgeRit = document.getElementById('badgeRitPubs');
        const badgeAuthors = document.getElementById('badgeRitAuthors');
        if (badgeNew) badgeNew.textContent = s.newPublicationsCount;
        if (badgeRit) badgeRit.textContent = ritTotal;
        if (badgeAuthors) badgeAuthors.textContent = ritUnique;
    }

    /**
     * Populate filter dropdowns dynamically based on actual data
     */
    function populateFilters() {
        if (!state.comparisonResult) return;

        const allRows = state.comparisonResult.latestAnalysis.allRows;
        const years = new Set();
        const docTypes = new Set();

        allRows.forEach(r => {
            if (r['Year']) years.add(r['Year'].toString().trim());
            if (r['Document Type']) docTypes.add(r['Document Type'].toString().trim());
        });

        // Populate Years
        if (elements.tableYearFilter) {
            elements.tableYearFilter.innerHTML = '<option value="all">All Years</option>';
            Array.from(years).sort().reverse().forEach(y => {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                elements.tableYearFilter.appendChild(opt);
            });
        }

        // Populate Document Types
        if (elements.tableDocTypeFilter) {
            elements.tableDocTypeFilter.innerHTML = '<option value="all">All Document Types</option>';
            Array.from(docTypes).sort().forEach(dt => {
                const opt = document.createElement('option');
                opt.value = dt;
                opt.textContent = dt;
                elements.tableDocTypeFilter.appendChild(opt);
            });
        }
    }

    /**
     * Determines current active dataset for the main publications table
     */
    function getCurrentDataset() {
        if (!state.comparisonResult) return [];

        if (state.currentTableType === 'new') {
            return state.comparisonResult.newPublications;
        } else if (state.currentTableType === 'rit-all') {
            return state.ritLatestResult ? state.ritLatestResult.ritPublications : [];
        } else if (state.currentTableType === 'rit-new') {
            return state.ritNewResult ? state.ritNewResult.ritPublications : [];
        } else {
            return state.comparisonResult.newPublications;
        }
    }

    /**
     * Renders the main publication results table
     */
    function renderCurrentTable() {
        if (!state.comparisonResult) return;

        const rawData = getCurrentDataset();
        const query = state.searchQuery.toLowerCase().trim();
        const yearFilter = state.filterYear;
        const docTypeFilter = state.filterDocType;

        // Apply Search & Filters
        let filtered = rawData.filter(row => {
            // Year filter
            if (yearFilter !== 'all') {
                const y = (row['Year'] || row['year'] || '').toString().trim();
                if (y !== yearFilter) return false;
            }

            // Doc type filter
            if (docTypeFilter !== 'all') {
                const dt = (row['Document Type'] || row['document type'] || '').toString().trim();
                if (dt !== docTypeFilter) return false;
            }

            // Quartile & SCIE filter (Q1, Q2, Q3, Q4, SCIE, Top Tier, Conference)
            if (state.filterQuartile !== 'all') {
                let q = (row['Quartile'] || (typeof JournalQuartile !== 'undefined' ? JournalQuartile.evaluatePublicationQuartile(row).quartile : 'Unranked')).toUpperCase();
                let isScie = (row['SCIE Indexed'] && row['SCIE Indexed'].includes('Yes')) || 
                             (row['Journal Ranking'] && row['Journal Ranking'].includes('SCIE')) ||
                             (typeof JournalQuartile !== 'undefined' && JournalQuartile.evaluatePublicationQuartile(row).isScie);

                if (state.filterQuartile === 'SCIE') {
                    if (!isScie) return false;
                } else if (state.filterQuartile === 'Q1-Q2') {
                    if (q !== 'Q1' && q !== 'Q2') return false;
                } else if (state.filterQuartile === 'Conference') {
                    if (!q.includes('CONFERENCE')) return false;
                } else {
                    if (q !== state.filterQuartile.toUpperCase()) return false;
                }
            }

            // Search query (search title, authors, RIT authors, EID, DOI, Source title)
            if (query) {
                const title = (row['Title'] || '').toLowerCase();
                const authors = (row['Authors'] || '').toLowerCase();
                const ritAuthors = (row['RIT Authors'] || '').toLowerCase();
                const eid = (row['EID'] || '').toLowerCase();
                const doi = (row['DOI'] || '').toLowerCase();
                const source = (row['Source title'] || '').toLowerCase();

                if (!title.includes(query) && 
                    !authors.includes(query) && 
                    !ritAuthors.includes(query) && 
                    !eid.includes(query) && 
                    !doi.includes(query) && 
                    !source.includes(query)) {
                    return false;
                }
            }

            return true;
        });

        // Apply Sorting
        if (state.sortColumn) {
            filtered.sort((a, b) => {
                let valA = a[state.sortColumn] ?? '';
                let valB = b[state.sortColumn] ?? '';
                if (typeof valA === 'number' && typeof valB === 'number') {
                    return state.sortDirection === 'asc' ? valA - valB : valB - valA;
                }
                valA = valA.toString().toLowerCase();
                valB = valB.toString().toLowerCase();
                return state.sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            });
        }

        // Pagination calculations
        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / state.pageSize) || 1;
        if (state.currentPage > totalPages) state.currentPage = totalPages;
        if (state.currentPage < 1) state.currentPage = 1;

        const startIndex = (state.currentPage - 1) * state.pageSize;
        const endIndex = Math.min(startIndex + state.pageSize, totalItems);
        const pageItems = filtered.slice(startIndex, endIndex);

        // Update Record count text
        if (elements.tableRecordCount) {
            elements.tableRecordCount.textContent = `Showing ${totalItems === 0 ? 0 : startIndex + 1}–${endIndex} of ${totalItems} publications`;
        }

        // Render Table Headers
        renderTableHeaders();

        // Render Table Body
        if (elements.resultsTableBody) {
            if (pageItems.length === 0) {
                elements.resultsTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="px-6 py-12 text-center text-slate-400">
                            <div class="flex flex-col items-center justify-center">
                                <svg class="w-10 h-10 mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                <p class="text-base font-medium text-slate-600">No matching publications found</p>
                                <p class="text-xs text-slate-400 mt-1">Try adjusting your search keywords or filter criteria</p>
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                elements.resultsTableBody.innerHTML = pageItems.map((row, index) => {
                    const rowNum = startIndex + index + 1;
                    const eid = row['EID'] || '—';
                    const title = row['Title'] || 'Untitled Publication';
                    const year = row['Year'] || '—';
                    const docType = row['Document Type'] || 'Article';
                    const sourceTitle = row['Source title'] || '—';
                    const doi = row['DOI'] || '';

                    // Check if row has RIT authors
                    let ritAuthorsDisplay = '';
                    const ritAuthors = row['RIT Authors'] || (RitExtractor.extractRitAuthorsFromRow(row).join('; '));
                    
                    if (ritAuthors) {
                        ritAuthorsDisplay = `
                            <div class="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    <svg class="w-3 h-3 mr-1 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a10.99 10.99 0 013.75-2.288l-1.394-.597L10 4.16l2.394 1.026-1.394.597a10.99 10.99 0 013.75 2.288l2.644-1.13a1 1 0 000-1.84l-7-3z"></path></svg>
                                    RIT Author: ${escapeHtml(ritAuthors)}
                                </span>
                            </div>
                        `;
                    }

                    const allAuthors = row['Authors'] || '—';

                    // Quartile evaluation
                    const quartile = row['Quartile'] || (typeof JournalQuartile !== 'undefined' ? JournalQuartile.evaluatePublicationQuartile(row).quartile : 'Unranked');
                    const qBadgeClass = typeof JournalQuartile !== 'undefined' ? JournalQuartile.getBadgeClass(quartile) : 'bg-slate-100 text-slate-700';
                    const qSource = row['_quartileSource'] || (typeof JournalQuartile !== 'undefined' ? JournalQuartile.evaluatePublicationQuartile(row).source : '');

                    return `
                        <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100 group">
                            <td class="px-4 py-3.5 text-xs text-slate-400 font-mono">${rowNum}</td>
                            <td class="px-4 py-3.5">
                                <span class="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200" title="${escapeHtml(eid)}">
                                    ${escapeHtml(eid)}
                                </span>
                            </td>
                            <td class="px-4 py-3.5 max-w-md">
                                <div class="font-semibold text-sm text-slate-800 leading-snug hover:text-indigo-600 cursor-pointer transition-colors" onclick="window.viewPublicationDetails('${escapeHtml(eid)}')">
                                    ${escapeHtml(title)}
                                </div>
                                <div class="text-xs text-slate-500 mt-1 line-clamp-1" title="${escapeHtml(allAuthors)}">
                                    <span class="font-medium text-slate-600">Authors:</span> ${escapeHtml(allAuthors)}
                                </div>
                                ${ritAuthorsDisplay}
                            </td>
                            <td class="px-4 py-3.5 text-xs text-slate-600">
                                <div class="line-clamp-1 font-medium text-slate-700" title="${escapeHtml(sourceTitle)}">${escapeHtml(sourceTitle)}</div>
                                ${doi ? `<a href="https://doi.org/${encodeURIComponent(doi)}" target="_blank" rel="noopener noreferrer" class="text-xs text-indigo-600 hover:underline inline-flex items-center gap-0.5 mt-0.5">DOI: ${escapeHtml(doi)}</a>` : ''}
                            </td>
                            <td class="px-4 py-3.5 text-center">
                                <div class="flex items-center justify-center gap-1 flex-wrap">
                                    <span class="inline-flex items-center justify-center px-2.5 py-1 text-xs rounded-md border ${qBadgeClass}" title="${escapeHtml(qSource)}">
                                        ${escapeHtml(quartile)}
                                    </span>
                                    ${(row['SCIE Indexed'] === 'Yes' || (row['Journal Ranking'] && row['Journal Ranking'].includes('SCIE')) || (typeof JournalQuartile !== 'undefined' && JournalQuartile.evaluatePublicationQuartile(row).isScie)) ? `
                                        <span class="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black rounded bg-purple-100 text-purple-800 border border-purple-200" title="Indexed in Science Citation Index Expanded (Web of Science)">
                                            SCIE
                                        </span>
                                    ` : ''}
                                </div>
                            </td>
                            <td class="px-4 py-3.5 text-center text-xs font-medium text-slate-700">${escapeHtml(year.toString())}</td>
                            <td class="px-4 py-3.5 text-center">
                                <span class="inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                                    docType.toLowerCase().includes('article') ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                    docType.toLowerCase().includes('conference') ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                    docType.toLowerCase().includes('review') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                    'bg-slate-100 text-slate-600 border border-slate-200'
                                }">
                                    ${escapeHtml(docType)}
                                </span>
                            </td>
                            <td class="px-4 py-3.5 text-right whitespace-nowrap">
                                <button onclick="window.viewPublicationDetails('${escapeHtml(eid)}')" class="inline-flex items-center px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors border border-indigo-200">
                                    Details
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }

        // Render Pagination Controls
        renderPagination(totalPages);
    }

    /**
     * Render Table Headers with sort indicators
     */
    function renderTableHeaders() {
        if (!elements.resultsTableHead) return;

        const headers = [
            { key: '#', label: '#', sortable: false, width: 'w-12 text-left' },
            { key: 'EID', label: 'EID', sortable: true, width: 'w-44 text-left' },
            { key: 'Title', label: 'Publication Title & Authors', sortable: true, width: 'text-left' },
            { key: 'Source title', label: 'Source / Journal', sortable: true, width: 'w-56 text-left' },
            { key: 'Quartile', label: 'Quartile', sortable: true, width: 'w-24 text-center' },
            { key: 'Year', label: 'Year', sortable: true, width: 'w-20 text-center' },
            { key: 'Document Type', label: 'Type', sortable: true, width: 'w-28 text-center' },
            { key: 'actions', label: 'Action', sortable: false, width: 'w-20 text-right' }
        ];

        elements.resultsTableHead.innerHTML = `
            <tr class="bg-slate-50/90 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                ${headers.map(h => {
                    if (!h.sortable) {
                        return `<th class="px-4 py-3.5 ${h.width}">${h.label}</th>`;
                    }
                    const isSorted = state.sortColumn === h.key;
                    const arrow = isSorted ? (state.sortDirection === 'asc' ? '▲' : '▼') : '↕';
                    return `
                        <th class="px-4 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors select-none ${h.width}" onclick="window.handleTableSort('${h.key}')">
                            <div class="flex items-center gap-1 ${h.width.includes('center') ? 'justify-center' : h.width.includes('right') ? 'justify-end' : 'justify-start'}">
                                <span>${h.label}</span>
                                <span class="text-xs ${isSorted ? 'text-indigo-600 font-bold' : 'text-slate-300'}">${arrow}</span>
                            </div>
                        </th>
                    `;
                }).join('')}
            </tr>
        `;
    }

    /**
     * Render Pagination Controls
     */
    function renderPagination(totalPages) {
        if (!elements.paginationControls) return;

        if (totalPages <= 1) {
            elements.paginationControls.innerHTML = '';
            return;
        }

        let pages = [];
        const current = state.currentPage;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= current - 2 && i <= current + 2)) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== '...') {
                pages.push('...');
            }
        }

        elements.paginationControls.innerHTML = `
            <div class="flex items-center gap-1">
                <button ${current === 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : 'onclick="window.changePage(' + (current - 1) + ')"'} class="px-3 py-1.5 text-xs font-medium rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors">
                    Previous
                </button>
                ${pages.map(p => {
                    if (p === '...') {
                        return `<span class="px-2 py-1 text-xs text-slate-400">...</span>`;
                    }
                    const isActive = p === current;
                    return `
                        <button onclick="window.changePage(${p})" class="px-3 py-1.5 text-xs font-semibold rounded ${
                            isActive ? 'bg-indigo-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        } transition-colors">
                            ${p}
                        </button>
                    `;
                }).join('')}
                <button ${current === totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : 'onclick="window.changePage(' + (current + 1) + ')"'} class="px-3 py-1.5 text-xs font-medium rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors">
                    Next
                </button>
            </div>
        `;
    }

    /**
     * Renders the Unique RIT Authors list table
     */
    function renderAuthorsTable() {
        if (!elements.authorsTableBody) return;

        const isNewOnly = state.authorsScope === 'new';
        const sourceResult = (isNewOnly && state.ritNewResult) ? state.ritNewResult : state.ritLatestResult;
        if (!sourceResult) return;

        const query = (elements.authorsSearchInput ? elements.authorsSearchInput.value : '').toLowerCase().trim();
        let authors = sourceResult.uniqueAuthors || [];

        if (query) {
            authors = authors.filter(a => 
                a['Author Name'].toLowerCase().includes(query) ||
                (a['Designation'] && a['Designation'].toLowerCase().includes(query)) ||
                (a['Department'] && a['Department'].toLowerCase().includes(query)) ||
                a['Publication Titles'].toLowerCase().includes(query) ||
                a['EIDs'].toLowerCase().includes(query)
            );
        }

        if (elements.authorsRecordCount) {
            const scopeLabel = isNewOnly ? 'From Newly Added Records (Step 2)' : 'Cumulative From All Records';
            elements.authorsRecordCount.textContent = `Total: ${authors.length} Unique RIT Authors (${scopeLabel})`;
        }

        if (authors.length === 0) {
            elements.authorsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-10 text-center text-slate-400 text-sm">
                        No unique RIT authors found matching your criteria.
                    </td>
                </tr>
            `;
            return;
        }

        elements.authorsTableBody.innerHTML = authors.map((a, idx) => {
            const pubCount = a['Total Publications'];
            const years = a['Publication Years'];
            const designation = a['Designation'] || 'Assistant Professor';
            const department = a['Department'] || 'Department of Engineering';
            const titles = a._publications || [];
            const qCounts = a._quartileCounts || { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };

            let qBadgePills = '';
            if (qCounts.Q1 > 0) qBadgePills += `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Q1: ${qCounts.Q1}</span>`;
            if (qCounts.Q2 > 0) qBadgePills += `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Q2: ${qCounts.Q2}</span>`;
            if (qCounts.Q3 > 0) qBadgePills += `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Q3: ${qCounts.Q3}</span>`;
            if (qCounts.Q4 > 0) qBadgePills += `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">Q4: ${qCounts.Q4}</span>`;

            return `
                <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                    <td class="px-4 py-3.5 text-xs text-slate-400 font-mono">${idx + 1}</td>
                    <td class="px-4 py-3.5">
                        <div class="font-bold text-sm text-slate-800">${escapeHtml(a['Author Name'])}</div>
                        <div class="text-[11px] text-slate-400 font-medium">Rajalakshmi Institute of Technology</div>
                    </td>
                    <td class="px-4 py-3.5">
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            ${escapeHtml(designation)}
                        </span>
                    </td>
                    <td class="px-4 py-3.5">
                        <span class="text-xs text-slate-700 font-medium">
                            ${escapeHtml(department)}
                        </span>
                    </td>
                    <td class="px-4 py-3.5 text-center">
                        <span class="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-full bg-indigo-100 text-indigo-800">
                            ${pubCount} ${pubCount === 1 ? 'Paper' : 'Papers'}
                        </span>
                        ${qBadgePills ? `<div class="mt-1 flex items-center justify-center gap-1 flex-wrap">${qBadgePills}</div>` : ''}
                    </td>
                    <td class="px-4 py-3.5 text-center text-xs font-medium text-slate-600">
                        ${escapeHtml(years)}
                    </td>
                    <td class="px-4 py-3.5">
                        <div class="text-xs text-slate-700 max-w-lg space-y-1">
                            ${titles.map(t => {
                                const qBadge = t.quartile && t.quartile !== 'Unranked' ? `<span class="px-1 py-0.2 rounded text-[10px] font-bold border ${JournalQuartile.getBadgeClass(t.quartile)}">${t.quartile}</span>` : '';
                                return `
                                <div class="flex items-start gap-1.5">
                                    <span class="text-indigo-500 font-bold">•</span>
                                    <span class="hover:text-indigo-600 cursor-pointer" onclick="window.viewPublicationDetails('${escapeHtml(t.eid)}')">
                                        ${escapeHtml(t.title)} (${escapeHtml(t.year ? t.year.toString() : '—')})
                                    </span>
                                    ${qBadge}
                                </div>
                            `}).join('')}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Render Diagnostics & Validation Tab
     */
    function renderDiagnostics() {
        if (!elements.diagContainer || !state.comparisonResult) return;

        const prevA = state.comparisonResult.prevAnalysis;
        const latestA = state.comparisonResult.latestAnalysis;

        elements.diagContainer.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Previous File Diagnostics -->
                <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h4 class="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                            File 1: ${escapeHtml(prevA.fileName)}
                        </h4>
                        <span class="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">EID Column: "${escapeHtml(prevA.eidKey)}"</span>
                    </div>
                    <dl class="mt-4 space-y-2 text-xs">
                        <div class="flex justify-between py-1 border-b border-slate-50">
                            <dt class="text-slate-500">Total Rows Processed:</dt>
                            <dd class="font-semibold text-slate-800">${prevA.totalRows}</dd>
                        </div>
                        <div class="flex justify-between py-1 border-b border-slate-50">
                            <dt class="text-slate-500">Valid Unique EIDs:</dt>
                            <dd class="font-semibold text-emerald-600">${prevA.uniqueValidCount}</dd>
                        </div>
                        <div class="flex justify-between py-1 border-b border-slate-50">
                            <dt class="text-slate-500">Missing / Blank EID Rows:</dt>
                            <dd class="font-semibold ${prevA.missingEidCount > 0 ? 'text-amber-600' : 'text-slate-800'}">${prevA.missingEidCount}</dd>
                        </div>
                        <div class="flex justify-between py-1">
                            <dt class="text-slate-500">Duplicate EID Rows:</dt>
                            <dd class="font-semibold ${prevA.duplicateEidCount > 0 ? 'text-amber-600' : 'text-slate-800'}">${prevA.duplicateEidCount}</dd>
                        </div>
                    </dl>
                </div>

                <!-- Latest File Diagnostics -->
                <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h4 class="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                            File 2: ${escapeHtml(latestA.fileName)}
                        </h4>
                        <span class="text-xs font-mono bg-indigo-50 px-2 py-0.5 rounded text-indigo-700">EID Column: "${escapeHtml(latestA.eidKey)}"</span>
                    </div>
                    <dl class="mt-4 space-y-2 text-xs">
                        <div class="flex justify-between py-1 border-b border-slate-50">
                            <dt class="text-slate-500">Total Rows Processed:</dt>
                            <dd class="font-semibold text-slate-800">${latestA.totalRows}</dd>
                        </div>
                        <div class="flex justify-between py-1 border-b border-slate-50">
                            <dt class="text-slate-500">Valid Unique EIDs:</dt>
                            <dd class="font-semibold text-emerald-600">${latestA.uniqueValidCount}</dd>
                        </div>
                        <div class="flex justify-between py-1 border-b border-slate-50">
                            <dt class="text-slate-500">Missing / Blank EID Rows:</dt>
                            <dd class="font-semibold ${latestA.missingEidCount > 0 ? 'text-amber-600' : 'text-slate-800'}">${latestA.missingEidCount}</dd>
                        </div>
                        <div class="flex justify-between py-1">
                            <dt class="text-slate-500">Duplicate EID Rows:</dt>
                            <dd class="font-semibold ${latestA.duplicateEidCount > 0 ? 'text-amber-600' : 'text-slate-800'}">${latestA.duplicateEidCount}</dd>
                        </div>
                    </dl>
                </div>
            </div>

            <!-- Validation Messages -->
            <div class="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1">
                <div class="font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
                    Data Integrity & Scopus Format Compliance Check:
                </div>
                <p>• EID comparison performed case-insensitively with automatic whitespace stripping.</p>
                <p>• All original columns from the latest export are preserved 100% untouched for export.</p>
                <p>• RIT authors extracted strictly from individual author-to-affiliation tuples inside <code>Authors with affiliations</code>.</p>
                <p>• Sister institutions (e.g. Rajalakshmi Engineering College) are strictly excluded from RIT matching.</p>
            </div>
        `;
    }

    /**
     * Modal for viewing full details of a publication
     */
    window.viewPublicationDetails = function (eid) {
        if (!state.comparisonResult) return;
        const allRows = state.comparisonResult.latestAnalysis.allRows;
        const normTarget = eid.toString().trim().toLowerCase();
        const found = allRows.find(r => (r['EID'] || r['eid'] || '').toString().trim().toLowerCase() === normTarget);

        if (!found) {
            alert('Publication record not found.');
            return;
        }

        const ritAuthors = RitExtractor.extractRitAuthorsFromRow(found);
        const qInfo = typeof JournalQuartile !== 'undefined' ? JournalQuartile.evaluatePublicationQuartile(found) : null;
        const quartile = found['Quartile'] || (qInfo ? qInfo.quartile : 'Unranked');
        const qBadgeClass = typeof JournalQuartile !== 'undefined' ? JournalQuartile.getBadgeClass(quartile) : 'bg-slate-100 text-slate-700';

        elements.modalTitle.textContent = found['Title'] || 'Publication Record';

        let html = `
            <div class="space-y-4">
                <div class="flex items-center gap-2 flex-wrap pb-3 border-b border-slate-100">
                    <span class="px-2.5 py-1 rounded bg-slate-100 font-mono text-xs font-semibold text-slate-800">EID: ${escapeHtml(found['EID'] || '—')}</span>
                    <span class="px-2.5 py-1 rounded bg-indigo-50 text-xs font-semibold text-indigo-700">Year: ${escapeHtml((found['Year'] || '—').toString())}</span>
                    <span class="px-2.5 py-1 rounded bg-purple-50 text-xs font-semibold text-purple-700">Type: ${escapeHtml(found['Document Type'] || 'Article')}</span>
                    <span class="px-2.5 py-1 rounded text-xs border ${qBadgeClass}" title="${escapeHtml(qInfo?.source || '')}">Quartile: ${escapeHtml(quartile)}</span>
                    ${found['DOI'] ? `<a href="https://doi.org/${encodeURIComponent(found['DOI'])}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 rounded bg-emerald-50 text-xs font-semibold text-emerald-700 hover:underline">DOI: ${escapeHtml(found['DOI'])} ↗</a>` : ''}
                </div>

                ${ritAuthors.length > 0 ? `
                    <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                        <div class="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <svg class="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a10.99 10.99 0 013.75-2.288l-1.394-.597L10 4.16l2.394 1.026-1.394.597a10.99 10.99 0 013.75 2.288l2.644-1.13a1 1 0 000-1.84l-7-3z"></path></svg>
                            Rajalakshmi Institute of Technology (RIT) Affiliated Authors:
                        </div>
                        <div class="text-sm font-semibold text-indigo-800">
                            ${escapeHtml(ritAuthors.join('; '))}
                        </div>
                    </div>
                ` : ''}

                <div>
                    <h5 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Authors</h5>
                    <p class="text-sm text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100">${escapeHtml(found['Authors'] || '—')}</p>
                </div>

                <div>
                    <h5 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Source Title / Journal</h5>
                    <p class="text-sm font-medium text-slate-800">${escapeHtml(found['Source title'] || '—')}</p>
                </div>

                <div>
                    <h5 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Authors with affiliations</h5>
                    <p class="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100 leading-relaxed font-mono">${escapeHtml(found['Authors with affiliations'] || '—')}</p>
                </div>

                ${found['Abstract'] ? `
                    <div>
                        <h5 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Abstract</h5>
                        <p class="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded border border-slate-100 max-h-48 overflow-y-auto">${escapeHtml(found['Abstract'])}</p>
                    </div>
                ` : ''}

                <!-- Full Metadata Field Table -->
                <details class="text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <summary class="cursor-pointer font-medium text-indigo-600 hover:text-indigo-800 py-1">View All Metadata Fields (${Object.keys(found).length} fields)</summary>
                    <div class="mt-2 border border-slate-200 rounded max-h-60 overflow-y-auto">
                        <table class="w-full text-left text-xs divide-y divide-slate-200">
                            <thead class="bg-slate-100 text-slate-600 sticky top-0 font-semibold">
                                <tr>
                                    <th class="p-2 w-1/3">Column Header</th>
                                    <th class="p-2">Value</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 font-mono">
                                ${Object.keys(found).filter(k => !k.startsWith('_')).map(k => `
                                    <tr>
                                        <td class="p-2 font-medium text-slate-700 bg-slate-50">${escapeHtml(k)}</td>
                                        <td class="p-2 text-slate-600 break-words">${escapeHtml(found[k]?.toString() || '')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </details>
            </div>
        `;

        elements.modalContent.innerHTML = html;
        elements.recordModal.classList.remove('hidden');
    };

    /**
     * Close record modal
     */
    function closeModal() {
        if (elements.recordModal) {
            elements.recordModal.classList.add('hidden');
        }
    }

    /**
     * Filter table by Quartile tier directly from hub or badges (strictly on newly added publications)
     */
    window.filterByQuartile = function (tier) {
        state.filterQuartile = tier;
        if (elements.tableQuartileFilter) {
            elements.tableQuartileFilter.value = tier;
        }
        state.currentTableType = 'new'; // Target newly added publications
        state.currentPage = 1;
        switchTab('comparison');
        switchTableSubNav('new');
        renderCurrentTable();
    };

    /**
     * Switch Authors Table scope between 'new' (from newly added publications) and 'all' (cumulative)
     */
    window.switchAuthorsScope = function (scope) {
        state.authorsScope = scope;
        const btnNew = document.getElementById('btnAuthorsScopeNew');
        const btnAll = document.getElementById('btnAuthorsScopeAll');
        if (btnNew && btnAll) {
            if (scope === 'new') {
                btnNew.className = 'px-2.5 py-1 text-xs font-bold rounded-md bg-white text-indigo-700 shadow-sm transition-all';
                btnAll.className = 'px-2.5 py-1 text-xs font-semibold rounded-md text-slate-600 hover:text-slate-900 transition-all';
            } else {
                btnAll.className = 'px-2.5 py-1 text-xs font-bold rounded-md bg-white text-indigo-700 shadow-sm transition-all';
                btnNew.className = 'px-2.5 py-1 text-xs font-semibold rounded-md text-slate-600 hover:text-slate-900 transition-all';
            }
        }
        renderAuthorsTable();
    };

    /**
     * Table sort handler
     */
    window.handleTableSort = function (columnKey) {
        if (state.sortColumn === columnKey) {
            state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            state.sortColumn = columnKey;
            state.sortDirection = 'asc';
        }
        renderCurrentTable();
    };

    /**
     * Page navigation handler
     */
    window.changePage = function (pageNum) {
        state.currentPage = pageNum;
        renderCurrentTable();
    };

    /**
     * Switch Sub-navigation dataset for table (New Pubs vs All RIT vs New RIT)
     */
    function switchTableSubNav(type) {
        state.currentTableType = type;
        state.currentPage = 1;

        elements.tableSubNav.forEach(btn => {
            if (btn.dataset.type === type) {
                btn.className = 'table-subnav-btn px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white shadow-sm';
            } else {
                btn.className = 'table-subnav-btn px-4 py-2 text-xs font-semibold rounded-lg bg-white text-slate-600 border border-slate-200 hover:bg-slate-50';
            }
        });

        renderCurrentTable();
    }

    /**
     * Tab navigation switcher
     */
    function switchTab(tabId) {
        state.activeTab = tabId;

        elements.tabBtns.forEach(btn => {
            const isActive = btn.dataset.tab === tabId;
            if (isActive) {
                btn.className = 'nav-tab-btn flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white shadow-sm transition-all';
            } else {
                btn.className = 'nav-tab-btn flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition-all';
            }
        });

        elements.tabPanes.forEach(pane => {
            if (pane.id === `tabPane-${tabId}`) {
                pane.classList.remove('hidden');
            } else {
                pane.classList.add('hidden');
            }
        });

        // Trigger chart resize if entering charts tab
        if (tabId === 'combined' && state.ritLatestResult && typeof ScopusCharts !== 'undefined') {
            setTimeout(() => {
                ScopusCharts.renderYearDistribution('chartYearDistribution', state.ritLatestResult.ritPublications, state.comparisonResult.latestAnalysis.allRows);
                ScopusCharts.renderTopAuthors('chartTopAuthors', state.ritLatestResult.uniqueAuthors, 8);
                ScopusCharts.renderQuartileBreakdown('chartQuartileDistribution', state.comparisonResult.latestAnalysis.allRows);
                ScopusCharts.renderDocTypeBreakdown('chartDocTypes', state.ritLatestResult.ritPublications);
            }, 100);
        }
    }

    /**
     * Enables export buttons and attaches dataset export handlers
     */
    function enableExportButtons() {
        const btns = [
            elements.btnExportStep1Xlsx, elements.btnExportStep2Xlsx,
            elements.btnExportNewXlsx, elements.btnExportNewCsv,
            elements.btnExportRitXlsx, elements.btnExportRitCsv,
            elements.btnExportAuthorsXlsx, elements.btnExportAuthorsCsv
        ];
        btns.forEach(b => {
            if (b) {
                b.disabled = false;
                b.classList.remove('opacity-40', 'cursor-not-allowed');
            }
        });
    }

    /**
     * Reset everything to clean initial state
     */
    function resetApplication() {
        if (!confirm('Are you sure you want to reset all uploaded data and results?')) {
            return;
        }

        state.file1 = null;
        state.file2 = null;
        state.comparisonResult = null;
        state.ritLatestResult = null;
        state.ritNewResult = null;
        state.searchQuery = '';
        state.filterYear = 'all';
        state.filterDocType = 'all';
        state.currentPage = 1;

        clearFile(1);
        clearFile(2);

        document.getElementById('resultsSection').classList.add('hidden');
        if (typeof ScopusCharts !== 'undefined') {
            ScopusCharts.destroyCharts();
        }

        switchTab('overview');
        showToast('Application reset. Ready for new files.', 'info');
    }

    /**
     * Helper to escape HTML characters
     */
    function escapeHtml(text) {
        if (text === undefined || text === null) return '';
        return text.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Initialize Event Listeners
     */
    function init() {
        // Dropzones
        setupDropzone(elements.dropzone1, elements.fileInput1, 1);
        setupDropzone(elements.dropzone2, elements.fileInput2, 2);

        if (elements.removeFile1) elements.removeFile1.addEventListener('click', (e) => { e.stopPropagation(); clearFile(1); });
        if (elements.removeFile2) elements.removeFile2.addEventListener('click', (e) => { e.stopPropagation(); clearFile(2); });

        // Action buttons
        if (elements.btnRunAnalysis) elements.btnRunAnalysis.addEventListener('click', runAnalysis);
        if (elements.btnLoadDemo) elements.btnLoadDemo.addEventListener('click', loadDemoData);
        if (elements.btnReset) elements.btnReset.addEventListener('click', resetApplication);

        // Tab Navigation
        elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        // Table Sub Navigation
        elements.tableSubNav.forEach(btn => {
            btn.addEventListener('click', () => switchTableSubNav(btn.dataset.type));
        });

        // Search & Filter Listeners
        if (elements.tableSearchInput) {
            elements.tableSearchInput.addEventListener('input', (e) => {
                state.searchQuery = e.target.value;
                state.currentPage = 1;
                renderCurrentTable();
            });
        }

        if (elements.tableYearFilter) {
            elements.tableYearFilter.addEventListener('change', (e) => {
                state.filterYear = e.target.value;
                state.currentPage = 1;
                renderCurrentTable();
            });
        }

        if (elements.tableDocTypeFilter) {
            elements.tableDocTypeFilter.addEventListener('change', (e) => {
                state.filterDocType = e.target.value;
                state.currentPage = 1;
                renderCurrentTable();
            });
        }

        if (elements.tableQuartileFilter) {
            elements.tableQuartileFilter.addEventListener('change', (e) => {
                state.filterQuartile = e.target.value;
                state.currentPage = 1;
                renderCurrentTable();
            });
        }

        if (elements.tablePageSize) {
            elements.tablePageSize.addEventListener('change', (e) => {
                state.pageSize = parseInt(e.target.value, 10);
                state.currentPage = 1;
                renderCurrentTable();
            });
        }

        if (elements.authorsSearchInput) {
            elements.authorsSearchInput.addEventListener('input', () => {
                renderAuthorsTable();
            });
        }

        // Modal Close Listeners
        if (elements.modalCloseBtn) elements.modalCloseBtn.addEventListener('click', closeModal);
        if (elements.recordModal) {
            elements.recordModal.addEventListener('click', (e) => {
                if (e.target === elements.recordModal) closeModal();
            });
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });

        // Export Event Listeners
        // Step 1: Newly Added Publications (EID diff)
        if (elements.btnExportStep1Xlsx) {
            elements.btnExportStep1Xlsx.addEventListener('click', () => {
                if (!state.comparisonResult) return;
                ScopusExporter.exportToExcel(state.comparisonResult.newPublications, 'New_Publications.xlsx', 'New_Publications');
                showToast('Downloaded Step 1: New_Publications.xlsx', 'success');
            });
        }

        // Step 2: RIT Authors strictly from NEWLY ADDED publications (Name, Designation, Department)
        if (elements.btnExportStep2Xlsx) {
            elements.btnExportStep2Xlsx.addEventListener('click', () => {
                if (!state.ritNewResult || !state.ritNewResult.ritAuthorRows || state.ritNewResult.ritAuthorRows.length === 0) {
                    showToast('No RIT authors found in the newly added publications.', 'info');
                    return;
                }
                const authorRows = state.ritNewResult.ritAuthorRows;
                ScopusExporter.exportToExcel(authorRows, 'New_RIT_Authors_and_Publications.xlsx', 'New_RIT_Authors');
                showToast('Downloaded Step 2: New_RIT_Authors_and_Publications.xlsx (From Newly Added Records)', 'success');
            });
        }

        // 1. New Publications (Standard Export)
        if (elements.btnExportNewXlsx) {
            elements.btnExportNewXlsx.addEventListener('click', () => {
                if (!state.comparisonResult) return;
                ScopusExporter.exportToExcel(state.comparisonResult.newPublications, 'New_Publications.xlsx', 'New_Publications');
                showToast('Downloaded New_Publications.xlsx', 'success');
            });
        }
        if (elements.btnExportNewCsv) {
            elements.btnExportNewCsv.addEventListener('click', () => {
                if (!state.comparisonResult) return;
                ScopusExporter.exportToCsv(state.comparisonResult.newPublications, 'New_Publications.csv');
                showToast('Downloaded New_Publications.csv', 'success');
            });
        }

        // 2. RIT Publications
        if (elements.btnExportRitXlsx) {
            elements.btnExportRitXlsx.addEventListener('click', () => {
                if (!state.ritLatestResult) return;
                ScopusExporter.exportToExcel(state.ritLatestResult.ritPublications, 'RIT_Publications.xlsx', 'RIT_Publications');
                showToast('Downloaded RIT_Publications.xlsx', 'success');
            });
        }
        if (elements.btnExportRitCsv) {
            elements.btnExportRitCsv.addEventListener('click', () => {
                if (!state.ritLatestResult) return;
                ScopusExporter.exportToCsv(state.ritLatestResult.ritPublications, 'RIT_Publications.csv');
                showToast('Downloaded RIT_Publications.csv', 'success');
            });
        }

        // 3. RIT Unique Authors
        if (elements.btnExportAuthorsXlsx) {
            elements.btnExportAuthorsXlsx.addEventListener('click', () => {
                if (!state.ritLatestResult) return;
                ScopusExporter.exportToExcel(state.ritLatestResult.uniqueAuthors, 'RIT_Unique_Authors.xlsx', 'RIT_Authors');
                showToast('Downloaded RIT_Unique_Authors.xlsx', 'success');
            });
        }
        if (elements.btnExportAuthorsCsv) {
            elements.btnExportAuthorsCsv.addEventListener('click', () => {
                if (!state.ritLatestResult) return;
                ScopusExporter.exportToCsv(state.ritLatestResult.uniqueAuthors, 'RIT_Unique_Authors.csv');
                showToast('Downloaded RIT_Unique_Authors.csv', 'success');
            });
        }

        console.log('Scopus Publication Tracker initialized.');
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
