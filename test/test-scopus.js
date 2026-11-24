// Refined author parser and extractor test
const assert = require('assert');

const RIT_REGEX = /\brajalakshmi\s+institute\s+of\s+technology\b/i;

function isRitAffiliation(text) {
    if (!text) return false;
    return RIT_REGEX.test(text);
}

/**
 * Extracts author names from Scopus 'Authors' column
 * Handles "LastName, F.M.; LastName2, F." or "LastName, F.M., LastName2, F."
 */
function parseAuthorList(authorsStr) {
    if (!authorsStr || typeof authorsStr !== 'string') return [];
    const trimmed = authorsStr.trim();
    if (!trimmed) return [];

    // If authors are separated by semicolons
    if (trimmed.includes(';')) {
        return trimmed.split(';').map(a => a.trim()).filter(Boolean);
    }

    // If separated by commas, identify Lastname, Initials pairs
    const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
    const authors = [];
    let i = 0;
    while (i < parts.length) {
        // If current part + next part look like "LastName" and "Initials."
        // Initial pattern: "V." or "V.K." or "V. K." or "V" or "John"
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
 * Extract author name from an author-affiliation chunk
 * Format in Scopus:
 * e.g. "Chinnammal V., Rajalakshmi Institute of Technology, Department of ECE, Chennai"
 * e.g. "Chinnammal, V., Rajalakshmi Institute of Technology, Department of ECE, Chennai"
 * e.g. "Chinnammal, V., Department of ECE, Rajalakshmi Institute of Technology, Chennai"
 */
function extractAuthorFromChunk(chunk, knownAuthors = []) {
    if (!chunk || !isRitAffiliation(chunk)) return null;

    const trimmedChunk = chunk.trim();

    // Strategy 1: Check known authors from 'Authors' column
    if (knownAuthors && knownAuthors.length > 0) {
        for (const author of knownAuthors) {
            const cleanAuthor = author.replace(/[\s,.-]/g, '').toLowerCase();
            // Take the first 60 chars of the chunk
            const chunkHead = trimmedChunk.substring(0, Math.max(author.length + 20, 60)).replace(/[\s,.-]/g, '').toLowerCase();
            if (chunkHead.startsWith(cleanAuthor) || chunkHead.includes(cleanAuthor)) {
                return author;
            }
        }
    }

    // Strategy 2: Extract text before the affiliation / department / institution
    // Find where "Rajalakshmi Institute of Technology" or "Department" or "School" starts
    const affilKeywords = /(?:,\s*)?(?:Rajalakshmi\s+Institute\s+of\s+Technology|Department\s+of|Dept\.?\s+of|School\s+of|Centre\s+for|Center\s+for)/i;
    const match = trimmedChunk.match(affilKeywords);
    if (match && match.index > 0) {
        const potentialName = trimmedChunk.substring(0, match.index).trim();
        // Clean trailing commas/periods
        const cleaned = potentialName.replace(/^[,;\s]+|[,;\s]+$/g, '');
        if (cleaned.length > 0) {
            return cleaned;
        }
    }

    // Strategy 3: Split by comma
    const parts = trimmedChunk.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
        // e.g. "Chinnammal", "V.", "Rajalakshmi Institute of Technology..."
        if (/^[A-Z]\.?(\s*[A-Z]\.?)*$/i.test(parts[1])) {
            return `${parts[0]}, ${parts[1]}`;
        }
        return parts[0];
    }

    return parts[0] || null;
}

/**
 * Robust extraction of RIT authors from a record
 */
function extractRitAuthors(row) {
    const colKeys = Object.keys(row);
    
    // Find "Authors with affiliations"
    const affilKey = colKeys.find(k => 
        k.trim().toLowerCase().replace(/[\s_\-]+/g, ' ') === 'authors with affiliations'
    ) || colKeys.find(k => 
        k.toLowerCase().includes('authors with affiliations')
    );

    const affiliationsRaw = affilKey ? (row[affilKey] || '') : '';
    if (!affiliationsRaw || typeof affiliationsRaw !== 'string') return [];

    // Find "Authors" column
    const authorsKey = colKeys.find(k => k.trim().toLowerCase() === 'authors');
    const knownAuthors = authorsKey ? parseAuthorList(row[authorsKey]) : [];

    // Split by semicolons (standard Scopus delimiter for author-affiliation pairs)
    const chunks = affiliationsRaw.split(';').map(c => c.trim()).filter(Boolean);

    const ritAuthors = [];
    const seen = new Set();

    for (const chunk of chunks) {
        if (!isRitAffiliation(chunk)) continue;

        const authorName = extractAuthorFromChunk(chunk, knownAuthors);
        if (authorName) {
            const normKey = authorName.toLowerCase().replace(/[\s,.-]/g, '');
            if (!seen.has(normKey)) {
                seen.add(normKey);
                ritAuthors.push(authorName);
            }
        }
    }

    return ritAuthors;
}

// Test cases
console.log('--- Testing Refined RIT Affiliation Extraction ---');

const testCases = [
    {
        name: 'Single RIT author (Chinnammal V.) without Authors column',
        row: {
            'Authors with affiliations': 'Chinnammal V., Rajalakshmi Institute of Technology, Department of ECE, Tamil Nadu, Chennai, India',
            'EID': '2-s2.0-85100000001'
        },
        expected: ['Chinnammal V.']
    },
    {
        name: 'Single RIT author with Authors column (Chinnammal, V.)',
        row: {
            'Authors': 'Chinnammal, V.',
            'Authors with affiliations': 'Chinnammal V., Rajalakshmi Institute of Technology, Department of ECE, Tamil Nadu, Chennai, India',
            'EID': '2-s2.0-85100000001'
        },
        expected: ['Chinnammal, V.']
    },
    {
        name: 'Multiple authors, only one from RIT',
        row: {
            'Authors': 'Chinnammal, V.; Ramesh, K.',
            'Authors with affiliations': 'Chinnammal V., Rajalakshmi Institute of Technology, Department of ECE, Tamil Nadu, Chennai, India; Ramesh K., Anna University, Department of EEE, Chennai, India',
            'EID': '2-s2.0-85100000002'
        },
        expected: ['Chinnammal, V.']
    },
    {
        name: 'Multiple authors, two from RIT, one from external',
        row: {
            'Authors': 'Anand, R.; Chinnammal, V.; Kumar, S.',
            'Authors with affiliations': 'Anand R., Rajalakshmi Institute of Technology, Department of CSE, Chennai, India; Chinnammal V., Rajalakshmi Institute of Technology, Department of ECE, Chennai, India; Kumar S., Indian Institute of Technology Madras, Department of Physics, Chennai, India',
            'EID': '2-s2.0-85100000003'
        },
        expected: ['Anand, R.', 'Chinnammal, V.']
    },
    {
        name: 'Multiple authors, department listed before institution',
        row: {
            'Authors': 'Sundaram, M.',
            'Authors with affiliations': 'Sundaram M., Department of Mechanical Engineering, Rajalakshmi Institute of Technology, Chennai, India',
            'EID': '2-s2.0-85100000004'
        },
        expected: ['Sundaram, M.']
    },
    {
        name: 'Non-RIT publication',
        row: {
            'Authors': 'John, D.; Smith, A.',
            'Authors with affiliations': 'John D., Stanford University, USA; Smith A., MIT, USA',
            'EID': '2-s2.0-85100000005'
        },
        expected: []
    },
    {
        name: 'Rajalakshmi Engineering College (REC) should NOT match RIT!',
        row: {
            'Authors': 'Ramesh, K.',
            'Authors with affiliations': 'Ramesh K., Rajalakshmi Engineering College, Department of IT, Thandalam, Chennai, India',
            'EID': '2-s2.0-85100000006'
        },
        expected: []
    }
];

let passed = 0;
for (const tc of testCases) {
    const result = extractRitAuthors(tc.row);
    console.log(`Test: ${tc.name}`);
    console.log(`  Extracted: ${JSON.stringify(result)}`);
    console.log(`  Expected:  ${JSON.stringify(tc.expected)}`);
    assert.deepStrictEqual(result, tc.expected, `Mismatch in test: ${tc.name}`);
    passed++;
}

console.log(`\nAll ${passed} tests passed successfully!`);
