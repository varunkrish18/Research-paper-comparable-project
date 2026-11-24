/**
 * Scopus Publication Tracker - RIT Affiliation Extractor Module
 * Identifies and maps authors affiliated with Rajalakshmi Institute of Technology
 */

const RitExtractor = (function () {
    'use strict';

    const JournalQuartileRef = typeof JournalQuartile !== 'undefined' 
        ? JournalQuartile 
        : (typeof require !== 'undefined' ? (function(){ try { return require('./journal-quartile'); } catch(e){ return undefined; } })() : undefined);

    // Regex for matching Rajalakshmi Institute of Technology case-insensitively with flexible whitespace/punctuation
    const RIT_INSTITUTION_REGEX = /\brajalakshmi\s+institute\s+of\s+technology\b/i;

    // Standard RIT Faculty Designation and Department Lookup Directory
    const RIT_FACULTY_DIRECTORY = {
        'chinnammal v': { designation: 'Professor & HOD', department: 'Department of Electronics and Communication Engineering (ECE)' },
        'chinnammal, v': { designation: 'Professor & HOD', department: 'Department of Electronics and Communication Engineering (ECE)' },
        'anand r': { designation: 'Associate Professor', department: 'Department of Computer Science and Engineering (CSE)' },
        'anand, r': { designation: 'Associate Professor', department: 'Department of Computer Science and Engineering (CSE)' },
        'sundaram m': { designation: 'Professor', department: 'Department of Mechanical Engineering' },
        'sundaram, m': { designation: 'Professor', department: 'Department of Mechanical Engineering' },
        'kavitha s': { designation: 'Associate Professor & Head', department: 'Department of Artificial Intelligence and Data Science (AI & DS)' },
        'kavitha, s': { designation: 'Associate Professor & Head', department: 'Department of Artificial Intelligence and Data Science (AI & DS)' },
        'rajesh k': { designation: 'Associate Professor', department: 'Department of Electronics and Communication Engineering (ECE)' },
        'rajesh, k': { designation: 'Associate Professor', department: 'Department of Electronics and Communication Engineering (ECE)' },
        'karthikeyan b': { designation: 'Associate Professor', department: 'Department of Electrical and Electronics Engineering (EEE)' },
        'karthikeyan, b': { designation: 'Associate Professor', department: 'Department of Electrical and Electronics Engineering (EEE)' },
        'deepika m': { designation: 'Assistant Professor', department: 'Department of Artificial Intelligence and Data Science (AI & DS)' },
        'deepika, m': { designation: 'Assistant Professor', department: 'Department of Artificial Intelligence and Data Science (AI & DS)' },
        'priyadharshini k': { designation: 'Assistant Professor', department: 'Department of Artificial Intelligence and Data Science (AI & DS)' },
        'priyadharshini, k': { designation: 'Assistant Professor', department: 'Department of Artificial Intelligence and Data Science (AI & DS)' },
        'divya r': { designation: 'Assistant Professor', department: 'Department of Electronics and Communication Engineering (ECE)' },
        'divya, r': { designation: 'Assistant Professor', department: 'Department of Electronics and Communication Engineering (ECE)' },
        'venkatesh p': { designation: 'Assistant Professor', department: 'Department of Mechanical Engineering' },
        'venkatesh, p': { designation: 'Assistant Professor', department: 'Department of Mechanical Engineering' },
        'senthil v': { designation: 'Assistant Professor', department: 'Department of Electronics and Communication Engineering (ECE)' },
        'senthil, v': { designation: 'Assistant Professor', department: 'Department of Electronics and Communication Engineering (ECE)' },
        'murugan t': { designation: 'Associate Professor', department: 'Department of Mechanical Engineering' },
        'murugan, t': { designation: 'Associate Professor', department: 'Department of Mechanical Engineering' },
        'balaji n': { designation: 'Assistant Professor', department: 'Department of Information Technology (IT)' },
        'balaji, n': { designation: 'Assistant Professor', department: 'Department of Information Technology (IT)' },
        'premkumar p': { designation: 'Assistant Professor', department: 'Department of Computer Science and Engineering (CSE)' },
        'premkumar, p': { designation: 'Assistant Professor', department: 'Department of Computer Science and Engineering (CSE)' },
        'saravanan m': { designation: 'Assistant Professor', department: 'Department of Electronics and Communication Engineering (ECE)' },
        'saravanan, m': { designation: 'Assistant Professor', department: 'Department of Electronics and Communication Engineering (ECE)' }
    };

    /**
     * Extracts Department from affiliation text chunk
     */
    function extractDepartment(chunk) {
        if (!chunk) return 'Department of Engineering';

        // 1. Direct regex match for "Department of ..." or "Dept. of ..."
        const deptMatch = chunk.match(/(?:Department|Dept\.?|School|Division|Centre|Center)\s+of\s+([^,;\.]+)/i);
        if (deptMatch && deptMatch[1]) {
            let dept = deptMatch[1].trim();
            dept = dept.replace(/\s*Rajalakshmi\s*Institute.*$/i, '').trim();
            dept = dept.replace(/\s*Tamil\s*Nadu.*$/i, '').trim();
            dept = dept.replace(/\s*Chennai.*$/i, '').trim();
            if (dept.length > 1) {
                return `Department of ${dept}`;
            }
        }

        // 2. Acronym match (e.g. "Department of ECE", "CSE", "IT", "EEE", "Mech")
        const acronyms = [
            { regex: /\b(?:ECE|Electronics\s+and\s+Communication)\b/i, name: 'Department of Electronics and Communication Engineering (ECE)' },
            { regex: /\b(?:CSE|Computer\s+Science)\b/i, name: 'Department of Computer Science and Engineering (CSE)' },
            { regex: /\b(?:AI\s*&?\s*DS|Artificial\s+Intelligence)\b/i, name: 'Department of Artificial Intelligence and Data Science (AI & DS)' },
            { regex: /\b(?:Mechanical|MECH)\b/i, name: 'Department of Mechanical Engineering' },
            { regex: /\b(?:EEE|Electrical\s+and\s+Electronics)\b/i, name: 'Department of Electrical and Electronics Engineering (EEE)' },
            { regex: /\b(?:IT|Information\s+Technology)\b/i, name: 'Department of Information Technology (IT)' }
        ];

        for (const a of acronyms) {
            if (a.regex.test(chunk)) {
                return a.name;
            }
        }

        return 'Department of Engineering';
    }

    /**
     * Extracts Designation from affiliation chunk or directory lookup
     */
    function extractDesignation(authorName, chunk) {
        // 1. Check in raw affiliation text
        if (chunk) {
            if (/\b(?:Professor\s*&\s*HOD|Professor\s+and\s+Head|Head\s+of\s+the\s+Department|HOD)\b/i.test(chunk)) {
                return 'Professor & HOD';
            }
            if (/\b(?:Associate\s+Professor)\b/i.test(chunk)) {
                return 'Associate Professor';
            }
            if (/\b(?:Assistant\s+Professor)\b/i.test(chunk)) {
                return 'Assistant Professor';
            }
            if (/\b(?:Professor)\b/i.test(chunk)) {
                return 'Professor';
            }
            if (/\b(?:Principal|Dean)\b/i.test(chunk)) {
                return 'Professor & Dean';
            }
            if (/\b(?:Research\s+Scholar|Ph\.?D\.?\s+Scholar)\b/i.test(chunk)) {
                return 'Research Scholar';
            }
        }

        // 2. Check in RIT Faculty Directory by author name
        if (authorName) {
            const cleanName = authorName.toLowerCase().replace(/[\.,\s]/g, ' ').replace(/\s+/g, ' ').trim();
            for (const [key, val] of Object.entries(RIT_FACULTY_DIRECTORY)) {
                const cleanKey = key.replace(/[\.,\s]/g, ' ').replace(/\s+/g, ' ').trim();
                if (cleanName === cleanKey || cleanName.includes(cleanKey) || cleanKey.includes(cleanName)) {
                    return val.designation;
                }
            }
        }

        // 3. If author has Dr. in name
        if (authorName && /\bDr\.?\b/i.test(authorName)) {
            return 'Associate Professor';
        }

        // Default academic title
        return 'Assistant Professor';
    }

    /**
     * Checks if a text snippet represents Rajalakshmi Institute of Technology
     */
    function isRitAffiliation(text) {
        if (!text || typeof text !== 'string') return false;
        return RIT_INSTITUTION_REGEX.test(text);
    }

    /**
     * Finds column key from row based on predicate or regex
     */
    function findColumnKey(row, pattern) {
        if (!row) return null;
        const keys = Object.keys(row);
        return keys.find(k => pattern.test(k.trim())) || null;
    }

    /**
     * Extracts author names from Scopus 'Authors' column
     */
    function parseAuthorList(authorsStr) {
        if (!authorsStr || typeof authorsStr !== 'string') return [];
        const trimmed = authorsStr.trim();
        if (!trimmed) return [];

        if (trimmed.includes(';')) {
            return trimmed.split(';').map(a => a.trim()).filter(Boolean);
        }

        // When authors are comma-separated in "Lastname, Initials" form
        const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
        const authors = [];
        let i = 0;
        while (i < parts.length) {
            if (i + 1 < parts.length && /^[A-Z]\.?(\s*[A-Z]\.?)*$/i.test(parts[i + 1])) {
                authors.push(`${parts[i]}, ${parts[i + 1]}`);
                i += 2;
            } else {
                authors.push(parts[i]);
                i += 1;
            }
        }
        return authors.length > 0 ? authors : [trimmed];
    }

    /**
     * Extracts author name from an author-affiliation chunk
     * Scopus format: "Chinnammal V., Rajalakshmi Institute of Technology, Department of ECE, Chennai, India"
     * Or: "Chinnammal, V., Department of ECE, Rajalakshmi Institute of Technology, Chennai, India"
     */
    function extractAuthorFromChunk(chunk, knownAuthors = []) {
        if (!chunk || !isRitAffiliation(chunk)) return null;

        const trimmedChunk = chunk.trim();

        // 1. Cross-reference with known author names from 'Authors' column
        if (knownAuthors && knownAuthors.length > 0) {
            for (const author of knownAuthors) {
                const cleanAuthor = author.replace(/[\s,.-]/g, '').toLowerCase();
                const chunkPrefix = trimmedChunk.substring(0, Math.max(author.length + 20, 60))
                    .replace(/[\s,.-]/g, '').toLowerCase();
                if (chunkPrefix.startsWith(cleanAuthor) || chunkPrefix.includes(cleanAuthor)) {
                    return author;
                }
            }
        }

        // 2. Identify text before the institution or department delimiter
        const affilDelimiters = /(?:,\s*)?(?:Rajalakshmi\s+Institute\s+of\s+Technology|Department\s+of|Dept\.?\s+of|School\s+of|Centre\s+for|Center\s+for|Division\s+of)/i;
        const match = trimmedChunk.match(affilDelimiters);
        if (match && match.index > 0) {
            const rawAuthorName = trimmedChunk.substring(0, match.index).trim();
            const cleaned = rawAuthorName.replace(/^[,;\s]+|[,;\s]+$/g, '');
            if (cleaned.length > 0) {
                return cleaned;
            }
        }

        // 3. Fallback: comma split
        const parts = trimmedChunk.split(',').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
            if (/^[A-Z]\.?(\s*[A-Z]\.?)*$/i.test(parts[1])) {
                return `${parts[0]}, ${parts[1]}`;
            }
            return parts[0];
        }

        return parts[0] || null;
    }

    /**
     * Extracts all RIT authors from a single Scopus publication row
     * @param {Object} row - Scopus row object
     * @returns {Array<string>} List of author names mapped to RIT
     */
    function extractRitAuthorsFromRow(row) {
        if (!row) return [];

        const affilColKey = findColumnKey(row, /^authors\s+with\s+affiliations$/i) ||
                            findColumnKey(row, /authors\s+with\s+affiliations/i);

        const affiliationsRaw = affilColKey ? (row[affilColKey] || '') : '';
        if (!affiliationsRaw || typeof affiliationsRaw !== 'string') return [];

        // Scopus separates author-affiliation records with semicolons
        const chunks = affiliationsRaw.split(';').map(c => c.trim()).filter(Boolean);

        const authorsColKey = findColumnKey(row, /^authors$/i);
        const knownAuthors = authorsColKey ? parseAuthorList(row[authorsColKey]) : [];

        const ritAuthors = [];
        const seen = new Set();

        for (const chunk of chunks) {
            if (!isRitAffiliation(chunk)) continue;

            const authorName = extractAuthorFromChunk(chunk, knownAuthors);
            if (authorName) {
                const norm = authorName.toLowerCase().replace(/[\s,.-]/g, '');
                if (!seen.has(norm)) {
                    seen.add(norm);
                    ritAuthors.push(authorName);
                }
            }
        }

        return ritAuthors;
    }

    /**
     * Filters and formats publications containing at least one RIT author
     * @param {Array<Object>} rows - Array of publication rows
     * @returns {{ ritPublications: Array<Object>, uniqueAuthors: Array<Object>, ritAuthorRows: Array<Object>, totalRitPubs: number, totalUniqueAuthors: number }}
     */
    function processRitPublications(rows) {
        if (!Array.isArray(rows)) return { ritPublications: [], uniqueAuthors: [], ritAuthorRows: [], totalRitPubs: 0, totalUniqueAuthors: 0 };

        const ritPublications = [];
        const ritAuthorRows = []; // Step 2 Output: Flattened (Author, Paper) records with Name, Designation, Department
        const authorPubMap = new Map(); // normalizedAuthor -> author stats

        rows.forEach(row => {
            const ritAuthors = extractRitAuthorsFromRow(row);

            if (ritAuthors.length > 0) {
                // Find column keys flexibly
                const eidKey = findColumnKey(row, /^eid$/i) || 'EID';
                const titleKey = findColumnKey(row, /^title$/i) || 'Title';
                const yearKey = findColumnKey(row, /^year$/i) || 'Year';
                const authorsKey = findColumnKey(row, /^authors$/i) || 'Authors';
                const affilKey = findColumnKey(row, /^affiliations$/i) || 'Affiliations';
                const authorsAffilKey = findColumnKey(row, /^authors\s+with\s+affiliations$/i) || 'Authors with affiliations';
                const doiKey = findColumnKey(row, /^doi$/i) || 'DOI';
                const sourceKey = findColumnKey(row, /^source\s+title$/i) || 'Source title';
                const docTypeKey = findColumnKey(row, /^document\s+type$/i) || 'Document Type';

                const eid = row[eidKey] || '';
                const title = row[titleKey] || '';
                const year = row[yearKey] || '';
                const sourceTitle = row[sourceKey] || '';
                const doi = row[doiKey] || '';
                const allAuthors = row[authorsKey] || '';
                const affilRaw = row[authorsAffilKey] || '';
                const ritAuthorsString = ritAuthors.join('; ');

                // Determine Quartile and SCIE status
                const jq = typeof JournalQuartile !== 'undefined' ? JournalQuartile : JournalQuartileRef;
                let quartile = row['Quartile'] || '';
                let isScie = false;
                let rankingLabel = 'Unranked';

                if (jq) {
                    const qEval = jq.evaluatePublicationQuartile(row);
                    if (!quartile) quartile = qEval.quartile;
                    isScie = qEval.isScie;
                    rankingLabel = qEval.rankingLabel || quartile;
                }
                if (!quartile) quartile = 'Unranked';

                // Find corresponding affiliation chunk for each RIT author to extract Department & Designation
                const chunks = affilRaw ? affilRaw.split(';').map(c => c.trim()).filter(Boolean) : [];

                ritAuthors.forEach(author => {
                    // Match chunk corresponding to this author
                    const matchedChunk = chunks.find(c => isRitAffiliation(c) && c.toLowerCase().includes(author.toLowerCase().replace(/[\.,\s]/g, ''))) ||
                                         chunks.find(c => isRitAffiliation(c)) || '';

                    const department = extractDepartment(matchedChunk);
                    const designation = extractDesignation(author, matchedChunk);

                    // Step 2 Record
                    ritAuthorRows.push({
                        'Author Name': author,
                        'Designation': designation,
                        'Department': department,
                        'Institution': 'Rajalakshmi Institute of Technology',
                        'Paper Title': title,
                        'EID': eid,
                        'Year': year,
                        'Source title': sourceTitle,
                        'Quartile': quartile,
                        'SCIE Indexed': isScie ? 'Yes' : 'No',
                        'Journal Ranking': rankingLabel,
                        'DOI': doi,
                        'All Authors': allAuthors
                    });

                    // Track in Unique Authors Map
                    const normAuthor = author.toLowerCase().replace(/[\s,.-]/g, '');
                    if (!authorPubMap.has(normAuthor)) {
                        authorPubMap.set(normAuthor, {
                            authorName: author,
                            normAuthor,
                            designation: designation,
                            department: department,
                            totalPublications: 0,
                            publications: [],
                            eids: [],
                            years: new Set(),
                            scieCount: 0,
                            quartileCounts: { Q1: 0, Q2: 0, Q3: 0, Q4: 0, Other: 0 }
                        });
                    }

                    const record = authorPubMap.get(normAuthor);
                    record.totalPublications++;
                    record.publications.push({ title, eid, year, quartile, rankingLabel });
                    if (eid) record.eids.push(eid);
                    if (year) record.years.add(year.toString());
                    if (isScie) record.scieCount++;
                    if (record.quartileCounts[quartile] !== undefined) {
                        record.quartileCounts[quartile]++;
                    } else {
                        record.quartileCounts.Other++;
                    }
                });

                // Build standardized RIT publication object matching Feature 2 specs
                const formattedRecord = {
                    'EID': eid,
                    'Title': title,
                    'Year': year,
                    'Authors': allAuthors,
                    'RIT Authors': ritAuthorsString,
                    'Quartile': quartile,
                    'Journal Ranking': rankingLabel,
                    'Authors with affiliations': affilRaw,
                    'Affiliations': row[affilKey] || '',
                    'DOI': doi,
                    'Source title': sourceTitle,
                    'Document Type': row[docTypeKey] || ''
                };

                // Also copy any other original columns from row to avoid losing information
                for (const k of Object.keys(row)) {
                    if (!(k in formattedRecord)) {
                        formattedRecord[k] = row[k];
                    }
                }

                // Attach original row and extracted array for UI access
                formattedRecord._originalRow = row;
                formattedRecord._ritAuthorsList = ritAuthors;

                ritPublications.push(formattedRecord);
            }
        });

        // Convert author map to structured unique author list
        const uniqueAuthors = Array.from(authorPubMap.values()).map(a => {
            const sortedYears = Array.from(a.years).sort().reverse();
            const qStr = `Q1: ${a.quartileCounts.Q1}, Q2: ${a.quartileCounts.Q2}, Q3: ${a.quartileCounts.Q3}, Q4: ${a.quartileCounts.Q4}, SCIE: ${a.scieCount}`;
            return {
                'Author Name': a.authorName,
                'Designation': a.designation,
                'Department': a.department,
                'Institution': 'Rajalakshmi Institute of Technology',
                'Total Publications': a.totalPublications,
                'Quartile Breakdown': qStr,
                'SCIE Publications': a.scieCount,
                'Publication Years': sortedYears.join(', '),
                'Latest Publication Year': sortedYears[0] || 'N/A',
                'Publication Titles': a.publications.map(p => p.title).join('; '),
                'EIDs': a.eids.join('; '),
                _quartileCounts: a.quartileCounts,
                _publications: a.publications
            };
        }).sort((a, b) => b['Total Publications'] - a['Total Publications'] || a['Author Name'].localeCompare(b['Author Name']));

        return {
            ritPublications,
            uniqueAuthors,
            ritAuthorRows,
            totalRitPubs: ritPublications.length,
            totalUniqueAuthors: uniqueAuthors.length
        };
    }

    return {
        isRitAffiliation,
        extractRitAuthorsFromRow,
        processRitPublications,
        parseAuthorList,
        extractDepartment,
        extractDesignation,
        RIT_FACULTY_DIRECTORY
    };
})();

if (typeof window !== 'undefined') {
    window.RitExtractor = RitExtractor;
}
if (typeof module !== 'undefined') {
    module.exports = RitExtractor;
}
