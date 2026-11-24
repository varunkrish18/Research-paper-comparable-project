/**
 * Scopus Publication Tracker - Journal Quartile Classifier Module
 * Identifies whether an article comes under Q1, Q2, Q3, or Q4 based on
 * direct export columns, metric percentiles, and an extensive Scopus/SCImago journal index.
 */

const JournalQuartile = (function () {
    'use strict';

    // In-memory user overrides (journal normalized name -> quartile)
    const userOverrides = new Map();

    /**
     * Comprehensive Scopus & SCImago Journal Quartile Index
     * Indexed by normalized title and common aliases/ISSNs.
     * Covers top Engineering, Computer Science, AI, ECE, Mechanical,
     * Materials, Energy, Physics, Biotechnology, and Interdisciplinary journals.
     */
    const JOURNAL_QUARTILE_DB = {
        // --- IEEE Transactions & Major Journals ---
        "ieee transactions on industrial informatics": "Q1",
        "ieee internet of things journal": "Q1",
        "ieee transactions on transportation electrification": "Q1",
        "ieee transactions on circuits and systems i: regular papers": "Q1",
        "ieee transactions on circuits and systems i": "Q1",
        "ieee transactions on circuits and systems ii: express briefs": "Q2",
        "ieee transactions on pattern analysis and machine intelligence": "Q1",
        "ieee transactions on neural networks and learning systems": "Q1",
        "ieee transactions on image processing": "Q1",
        "ieee transactions on cybernetics": "Q1",
        "ieee transactions on smart grid": "Q1",
        "ieee transactions on power systems": "Q1",
        "ieee transactions on power electronics": "Q1",
        "ieee transactions on vehicular technology": "Q1",
        "ieee transactions on wireless communications": "Q1",
        "ieee transactions on communications": "Q1",
        "ieee transactions on mobile computing": "Q1",
        "ieee transactions on knowledge and data engineering": "Q1",
        "ieee transactions on software engineering": "Q1",
        "ieee transactions on computers": "Q1",
        "ieee transactions on computer-aided design of integrated circuits and systems": "Q1",
        "ieee transactions on microwave theory and techniques": "Q1",
        "ieee transactions on antennas and propagation": "Q1",
        "ieee transactions on electron devices": "Q1",
        "ieee transactions on biomedical engineering": "Q1",
        "ieee transactions on medical imaging": "Q1",
        "ieee access": "Q1",
        "ieee sensors journal": "Q1",
        "ieee communications letters": "Q2",
        "ieee wireless communications letters": "Q1",
        "ieee embedded systems letters": "Q2",
        "ieee signal processing letters": "Q2",
        "ieee antennas and wireless propagation letters": "Q1",
        "ieee electron device letters": "Q1",
        "ieee computer architecture letters": "Q2",
        "ieee intelligent systems": "Q1",
        "ieee network": "Q1",
        "ieee wireless communications": "Q1",
        "ieee communications magazine": "Q1",
        "ieee signal processing magazine": "Q1",
        "ieee industrial electronics magazine": "Q1",
        "ieee spectrum": "Q2",
        "ieee micro": "Q2",

        // --- Elsevier / ScienceDirect ---
        "expert systems with applications": "Q1",
        "solar energy materials and solar cells": "Q1",
        "computers in biology and medicine": "Q1",
        "journal of manufacturing processes": "Q1",
        "renewable energy": "Q1",
        "materials letters": "Q2",
        "energy": "Q1",
        "applied energy": "Q1",
        "journal of cleaner production": "Q1",
        "knowledge-based systems": "Q1",
        "information sciences": "Q1",
        "neurocomputing": "Q1",
        "artificial intelligence": "Q1",
        "pattern recognition": "Q1",
        "computer methods and programs in biomedicine": "Q1",
        "computers and electrical engineering": "Q1",
        "engineering applications of artificial intelligence": "Q1",
        "applied soft computing": "Q1",
        "neural networks": "Q1",
        "signal processing": "Q1",
        "image and vision computing": "Q1",
        "computer vision and image understanding": "Q1",
        "journal of systems architecture": "Q1",
        "microprocessors and microsystems": "Q2",
        "future generation computer systems": "Q1",
        "computer networks": "Q1",
        "computer communications": "Q1",
        "ad hoc networks": "Q1",
        "journal of network and computer applications": "Q1",
        "journal of energy storage": "Q1",
        "materials science and engineering: a": "Q1",
        "materials science and engineering a": "Q1",
        "materials science and engineering: b": "Q2",
        "materials and design": "Q1",
        "composites part b: engineering": "Q1",
        "composites part b": "Q1",
        "composites part a: applied science and manufacturing": "Q1",
        "wear": "Q1",
        "tribology international": "Q1",
        "international journal of heat and mass transfer": "Q1",
        "applied thermal engineering": "Q1",
        "energy conversion and management": "Q1",
        "journal of power sources": "Q1",
        "chemosphere": "Q1",
        "science of the total environment": "Q1",
        "environmental pollution": "Q1",
        "water research": "Q1",
        "desalination": "Q1",
        "separation and purification technology": "Q1",
        "journal of membrane science": "Q1",
        "chemical engineering journal": "Q1",
        "bioresource technology": "Q1",
        "international journal of hydrogen energy": "Q1",
        "sustainable energy technologies and assessments": "Q1",
        "journal of building engineering": "Q1",
        "structures": "Q1",
        "construction and building materials": "Q1",
        "automation in construction": "Q1",
        "measurement": "Q1",
        "sensors and actuators a: physical": "Q1",
        "sensors and actuators b: chemical": "Q1",
        "optics and laser technology": "Q1",
        "optics and lasers in engineering": "Q1",
        "optics communications": "Q2",
        "optical fiber technology": "Q2",
        "results in physics": "Q2",
        "alexandria engineering journal": "Q1",
        "ain shams engineering journal": "Q1",
        "heliyon": "Q1",
        "materials today: proceedings": "Q3",
        "materials today proceedings": "Q3",
        "procedia computer science": "Q3",

        // --- Nature / Springer / Springer Nature ---
        "nature": "Q1",
        "nature communications": "Q1",
        "nature machine intelligence": "Q1",
        "nature materials": "Q1",
        "nature electronics": "Q1",
        "nature energy": "Q1",
        "nature nanotechnology": "Q1",
        "nature biomedical engineering": "Q1",
        "nature photonics": "Q1",
        "scientific reports": "Q1",
        "applied physics a: materials science and processing": "Q2",
        "applied physics a": "Q2",
        "applied physics b": "Q2",
        "soft computing": "Q2",
        "neural computing and applications": "Q1",
        "journal of ambient intelligence and humanized computing": "Q2",
        "wireless personal communications": "Q3",
        "journal of electronic testing": "Q3",
        "cluster computing": "Q1",
        "computing": "Q2",
        "the visual computer": "Q2",
        "multimedia tools and applications": "Q1",
        "telecommunication systems": "Q2",
        "peer-to-peer networking and applications": "Q2",
        "mobile networks and applications": "Q2",
        "annals of telecommunications": "Q2",
        "journal of supercomputing": "Q2",
        "international journal of speech technology": "Q3",
        "innovations in systems and software engineering": "Q3",
        "journal of materials science": "Q1",
        "journal of materials science: materials in electronics": "Q2",
        "journal of materials science materials in electronics": "Q2",
        "journal of thermal analysis and calorimetry": "Q1",
        "metallurgical and materials transactions a": "Q1",
        "clean technologies and environmental policy": "Q2",
        "environmental science and pollution research": "Q1",
        "biomass conversion and biorefinery": "Q2",
        "meccanica": "Q2",
        "experimental mechanics": "Q1",
        "nonlinear dynamics": "Q1",
        "journal of intelligent & robotic systems": "Q1",
        "journal of intelligent and robotic systems": "Q1",
        "international journal of advanced manufacturing technology": "Q1",
        "journal of mechanical science and technology": "Q2",
        "sadhana": "Q2",
        "sadhana - academy proceedings in engineering sciences": "Q2",

        // --- American Physical Society (APS) ---
        "physical review letters": "Q1",
        "physical review a": "Q1",
        "physical review b": "Q1",
        "physical review c": "Q1",
        "physical review d": "Q1",
        "physical review e": "Q1",
        "physical review applied": "Q1",
        "physical review materials": "Q1",
        "physical review research": "Q1",
        "reviews of modern physics": "Q1",

        // --- ACM (Association for Computing Machinery) ---
        "acm computing surveys": "Q1",
        "communications of the acm": "Q1",
        "acm transactions on computer systems": "Q1",
        "acm transactions on software engineering and methodology": "Q1",
        "acm transactions on database systems": "Q1",
        "acm transactions on information systems": "Q1",
        "acm transactions on graphics": "Q1",
        "acm transactions on intelligent systems and technology": "Q1",
        "acm transactions on computer-human interaction": "Q1",
        "acm transactions on multimedia computing, communications, and applications": "Q1",
        "acm transactions on embedded computing systems": "Q2",
        "acm transactions on sensor networks": "Q1",
        "acm transactions on cyber-physical systems": "Q2",
        "acm transactions on internet technology": "Q1",
        "acm transactions on privacy and security": "Q1",

        // --- Oxford / Cambridge / PNAS / Science ---
        "bioinformatics": "Q1",
        "briefings in bioinformatics": "Q1",
        "nucleic acids research": "Q1",
        "gigascience": "Q1",
        "pnas": "Q1",
        "proceedings of the national academy of sciences": "Q1",
        "proceedings of the national academy of sciences of the united states of america": "Q1",
        "science": "Q1",
        "science advances": "Q1",
        "science robotics": "Q1",

        // --- Wiley & Hindawi ---
        "microwave and optical technology letters": "Q3",
        "advanced materials": "Q1",
        "advanced functional materials": "Q1",
        "advanced energy materials": "Q1",
        "small": "Q1",
        "angewandte chemie international edition": "Q1",
        "international journal of energy research": "Q1",
        "international journal of communication systems": "Q2",
        "international journal of circuit theory and applications": "Q2",
        "concurrency and computation: practice and experience": "Q3",
        "expert systems": "Q2",
        "security and privacy": "Q3",
        "computational intelligence": "Q2",
        "internet technology letters": "Q3",
        "journal of software: evolution and process": "Q2",
        "software: practice and experience": "Q1",
        "international transactions on electrical energy systems": "Q2",
        "wireless communications and mobile computing": "Q3",
        "security and communication networks": "Q3",
        "journal of advanced transportation": "Q2",
        "shock and vibration": "Q2",

        // --- Taylor & Francis ---
        "materials and manufacturing processes": "Q2",
        "energy sources, part a: recovery, utilization, and environmental effects": "Q2",
        "combustion science and technology": "Q2",
        "heat transfer engineering": "Q2",
        "international journal of sustainable engineering": "Q2",
        "machining science and technology": "Q2",
        "inverse problems in science and engineering": "Q2",
        "journal of experimental & theoretical artificial intelligence": "Q2",
        "enterprise information systems": "Q1",
        "journal of intelligent transportation systems": "Q1",
        "international journal of electronics": "Q3",
        "international journal of remote sensing": "Q1",

        // --- MDPI ---
        "sensors": "Q1",
        "energies": "Q1",
        "applied sciences": "Q2",
        "materials": "Q1",
        "sustainability": "Q1",
        "electronics": "Q2",
        "micromachines": "Q2",
        "algorithms": "Q2",
        "computers": "Q2",
        "information": "Q2",
        "symmetry": "Q2",
        "mathematics": "Q1",
        "processes": "Q2",
        "molecules": "Q1",
        "batteries": "Q2",
        "appl. sci.": "Q2",
        "appl sci": "Q2",

        // --- AIP / IOP Publishing ---
        "applied physics letters": "Q1",
        "journal of applied physics": "Q1",
        "review of scientific instruments": "Q1",
        "aip advances": "Q2",
        "journal of physics: condensed matter": "Q1",
        "journal of physics d: applied physics": "Q1",
        "materials research express": "Q2",
        "nanotechnology": "Q1",
        "smart materials and structures": "Q1",
        "measurement science and technology": "Q1",
        "iop conference series: materials science and engineering": "Q4",
        "journal of physics: conference series": "Q4",

        // --- World Scientific & Other Known Q3/Q4 Publishers ---
        "circuit world": "Q3",
        "journal of circuits, systems and computers": "Q4",
        "international journal of modern physics b": "Q3",
        "modern physics letters b": "Q3",
        "journal of electronic materials": "Q2",
        "journal of computational electronics": "Q2",
        "journal of electrical engineering & technology": "Q2",
        "journal of power electronics": "Q2",
        "transactions of the indian institute of metals": "Q2",
        "indian journal of pure & applied physics": "Q4",
        "indian journal of engineering & materials sciences": "Q4",
        "indian journal of chemical technology": "Q4"
    };

    /**
     * Normalizes a journal title string for robust dictionary matching
     */
    function normalizeJournalTitle(title) {
        if (!title || typeof title !== 'string') return '';
        let norm = title.toLowerCase().trim();

        // Strip leading "the "
        norm = norm.replace(/^the\s+/i, '');

        // Remove publication years if appended in brackets or commas
        norm = norm.replace(/\s*\(\d{4}\)/g, '');

        // Normalize dashes, hyphens, and slashes
        norm = norm.replace(/[–—]/g, '-');

        // Normalize multiple spaces
        norm = norm.replace(/\s+/g, ' ').trim();

        return norm;
    }

    /**
     * Checks if a document type is typically ranked by journal quartiles (Article, Review, Letter)
     */
    function isJournalDocument(docType) {
        if (!docType || typeof docType !== 'string') return true; // default to true
        const dt = docType.toLowerCase().trim();
        return dt.includes('article') || 
               dt.includes('review') || 
               dt.includes('letter') || 
               dt.includes('editorial') ||
               dt.includes('note') ||
               dt.includes('short survey');
    }

    /**
     * Extracts existing Quartile from row if provided in Scopus file
     */
    function findDirectQuartileColumn(row) {
        if (!row || typeof row !== 'object') return null;
        const keys = Object.keys(row);

        // Pattern for quartile column headers
        const qPatterns = [
            /^quartile$/i,
            /^journal\s*quartile$/i,
            /^sjr\s*quartile$/i,
            /^citescore\s*quartile$/i,
            /^citescore\s*highest\s*quartile$/i,
            /^source\s*quartile$/i,
            /^q\s*ranking$/i,
            /^q\s*rank$/i,
            /^scimago\s*quartile$/i
        ];

        for (const pattern of qPatterns) {
            const foundKey = keys.find(k => pattern.test(k.trim()));
            if (foundKey && row[foundKey]) {
                const val = row[foundKey].toString().trim().toUpperCase();
                // Validate Q1, Q2, Q3, Q4
                const m = val.match(/\b(Q[1-4])\b/i);
                if (m) {
                    return m[1].toUpperCase();
                }
            }
        }

        // Check if CiteScore Percentile or SJR Percentile exists
        const percentileKey = keys.find(k => /(citescore\s*)?percentile/i.test(k.trim()));
        if (percentileKey && row[percentileKey]) {
            const pVal = parseFloat(row[percentileKey]);
            if (!isNaN(pVal)) {
                if (pVal >= 75) return 'Q1';
                if (pVal >= 50) return 'Q2';
                if (pVal >= 25) return 'Q3';
                return 'Q4';
            }
        }

        return null;
    }

    /**
     * Look up quartile from built-in database with multiple fallback strategies
     */
    function lookupQuartile(sourceTitle) {
        if (!sourceTitle) return null;

        const cleanTitle = normalizeJournalTitle(sourceTitle);

        // 1. Check user manual overrides first
        if (userOverrides.has(cleanTitle)) {
            return { quartile: userOverrides.get(cleanTitle), source: 'User Override' };
        }

        // 2. Direct exact match in dictionary
        if (JOURNAL_QUARTILE_DB[cleanTitle]) {
            return { quartile: JOURNAL_QUARTILE_DB[cleanTitle], source: 'Scopus/SCImago Database' };
        }

        // 3. Match without colon subtitles
        // e.g. "Expert Systems with Applications: An International Journal" -> "Expert Systems with Applications"
        if (cleanTitle.includes(':')) {
            const mainTitle = cleanTitle.split(':')[0].trim();
            if (JOURNAL_QUARTILE_DB[mainTitle]) {
                return { quartile: JOURNAL_QUARTILE_DB[mainTitle], source: 'Scopus/SCImago Database (Title Match)' };
            }
        }

        // 4. Match without comma subtitles
        if (cleanTitle.includes(',')) {
            const mainTitle = cleanTitle.split(',')[0].trim();
            if (JOURNAL_QUARTILE_DB[mainTitle]) {
                return { quartile: JOURNAL_QUARTILE_DB[mainTitle], source: 'Scopus/SCImago Database (Title Match)' };
            }
        }

        // 5. Match without parentheses
        const noParens = cleanTitle.replace(/\s*\([^)]*\)/g, '').trim();
        if (JOURNAL_QUARTILE_DB[noParens]) {
            return { quartile: JOURNAL_QUARTILE_DB[noParens], source: 'Scopus/SCImago Database (Title Match)' };
        }

        // 6. Fuzzy substring match for major prefixes (e.g. IEEE Transactions on...)
        for (const [dbTitle, q] of Object.entries(JOURNAL_QUARTILE_DB)) {
            if (dbTitle.length > 15 && (cleanTitle.startsWith(dbTitle) || dbTitle.startsWith(cleanTitle))) {
                return { quartile: q, source: 'Scopus/SCImago Database (Fuzzy Match)' };
            }
        }

        return null;
    }

    /**
     * Determines whether an article comes under Q1, Q2, Q3, Q4, or SCIE.
     * 
     * @param {Object} row - Scopus publication record
     * @returns {{ quartile: string, isScie: boolean, rankingLabel: string, isArticle: boolean, source: string, badgeClass: string }}
     */
    function evaluatePublicationQuartile(row) {
        if (!row) {
            return {
                quartile: 'N/A',
                isScie: false,
                rankingLabel: 'N/A',
                isArticle: false,
                source: 'No Data',
                badgeClass: 'bg-slate-100 text-slate-600 border-slate-200'
            };
        }

        // 1. Identify Document Type
        const docTypeKey = Object.keys(row).find(k => /^document\s*type$/i.test(k.trim())) || 'Document Type';
        const rawDocType = (row[docTypeKey] || '').toString().trim();
        const isArticle = isJournalDocument(rawDocType);

        // Check if file explicitly has SCIE / Web of Science in any column
        let explicitScie = false;
        for (const k of Object.keys(row)) {
            const v = (row[k] || '').toString();
            if (/\b(?:SCIE|Science\s+Citation\s+Index\s+Expanded|Web\s+of\s+Science|WoS)\b/i.test(v) ||
                /\b(?:scie|wos)\b/i.test(k)) {
                explicitScie = true;
                break;
            }
        }

        // If conference paper and no journal quartile, mark as Conference
        if (!isArticle && (rawDocType.toLowerCase().includes('conference') || rawDocType.toLowerCase().includes('proceeding'))) {
            return {
                quartile: 'Conference',
                isScie: explicitScie,
                rankingLabel: 'Conference',
                isArticle: false,
                documentType: rawDocType,
                source: 'Conference Proceedings',
                badgeClass: 'bg-slate-100 text-slate-700 border-slate-300'
            };
        }

        // 2. Check if file has a direct Quartile column
        const directColQ = findDirectQuartileColumn(row);
        if (directColQ) {
            // Journals in Q1/Q2/Q3/Q4 are generally in SCIE
            const isScie = explicitScie || ['Q1', 'Q2', 'Q3', 'Q4'].includes(directColQ);
            return {
                quartile: directColQ,
                isScie: isScie,
                rankingLabel: isScie ? `${directColQ} (SCIE)` : directColQ,
                isArticle: true,
                documentType: rawDocType || 'Article',
                source: 'File Export Column',
                badgeClass: getBadgeClass(directColQ)
            };
        }

        // 3. Extract Source Title (Journal Name)
        const sourceTitleKey = Object.keys(row).find(k => /^source\s*title$/i.test(k.trim())) || 'Source title';
        const sourceTitle = (row[sourceTitleKey] || '').toString().trim();

        // 4. Lookup in Journal Database
        const dbResult = lookupQuartile(sourceTitle);
        if (dbResult) {
            const q = dbResult.quartile;
            // Recognized international journals in our database are indexed in SCIE
            const isScie = true;
            return {
                quartile: q,
                isScie: isScie,
                rankingLabel: `${q} (SCIE)`,
                isArticle: true,
                documentType: rawDocType || 'Article',
                source: dbResult.source,
                sourceTitle,
                badgeClass: getBadgeClass(q)
            };
        }

        // 5. Non-matched Article / Unranked
        if (isArticle) {
            return {
                quartile: explicitScie ? 'SCIE' : 'Unranked',
                isScie: explicitScie,
                rankingLabel: explicitScie ? 'SCIE (Indexed)' : 'Unranked',
                isArticle: true,
                documentType: rawDocType || 'Article',
                source: explicitScie ? 'Web of Science (SCIE)' : 'Journal not yet matched in index',
                sourceTitle,
                badgeClass: explicitScie ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold' : 'bg-slate-100 text-slate-500 border-slate-200'
            };
        } else {
            return {
                quartile: rawDocType || 'Non-Article',
                isScie: explicitScie,
                rankingLabel: rawDocType || 'Non-Article',
                isArticle: false,
                documentType: rawDocType,
                source: 'Non-Article Publication',
                badgeClass: 'bg-slate-100 text-slate-600 border-slate-200'
            };
        }
    }

    /**
     * Get Tailwind badge classes for Quartile display
     */
    function getBadgeClass(quartile) {
        switch (quartile?.toUpperCase()) {
            case 'Q1':
                return 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/30 font-bold';
            case 'Q2':
                return 'bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-400/30 font-bold';
            case 'Q3':
                return 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-400/30 font-bold';
            case 'Q4':
                return 'bg-orange-50 text-orange-800 border-orange-300 ring-1 ring-orange-400/30 font-bold';
            case 'SCIE':
                return 'bg-indigo-50 text-indigo-800 border-indigo-300 ring-1 ring-indigo-400/30 font-bold';
            case 'CONFERENCE':
                return 'bg-purple-50 text-purple-700 border-purple-200 font-medium';
            default:
                return 'bg-slate-100 text-slate-600 border-slate-200 font-medium';
        }
    }

    /**
     * Allows user to manually override or assign quartile to a journal
     */
    function setJournalOverride(journalTitle, quartile) {
        if (!journalTitle) return;
        const norm = normalizeJournalTitle(journalTitle);
        userOverrides.set(norm, quartile.toUpperCase());
    }

    /**
     * Get statistics summary of quartiles for a dataset
     */
    function summarizeQuartiles(publications) {
        const stats = {
            Q1: 0,
            Q2: 0,
            Q3: 0,
            Q4: 0,
            SCIE: 0,
            Conference: 0,
            Unranked: 0,
            totalArticles: 0,
            totalPublications: publications.length
        };

        publications.forEach(p => {
            const evalRes = evaluatePublicationQuartile(p);
            const q = p['Quartile'] || evalRes.quartile;
            if (evalRes.isScie || (p['SCIE Indexed'] && p['SCIE Indexed'].includes('Yes'))) {
                stats.SCIE++;
            }
            if (q === 'Q1') { stats.Q1++; stats.totalArticles++; }
            else if (q === 'Q2') { stats.Q2++; stats.totalArticles++; }
            else if (q === 'Q3') { stats.Q3++; stats.totalArticles++; }
            else if (q === 'Q4') { stats.Q4++; stats.totalArticles++; }
            else if (q === 'Conference') { stats.Conference++; }
            else { stats.Unranked++; if (isJournalDocument(p['Document Type'])) stats.totalArticles++; }
        });

        return stats;
    }

    return {
        evaluatePublicationQuartile,
        getBadgeClass,
        normalizeJournalTitle,
        lookupQuartile,
        setJournalOverride,
        summarizeQuartiles,
        isJournalDocument,
        JOURNAL_QUARTILE_DB
    };
})();

if (typeof window !== 'undefined') {
    window.JournalQuartile = JournalQuartile;
}
if (typeof module !== 'undefined') {
    module.exports = JournalQuartile;
}
