// Test for Step 2 (RIT Author Name, Designation, Department) & Step 3 (Q1, Q2, Q3, Q4, SCIE)
const assert = require('assert');

// RIT Faculty Designation and Department Lookup Directory
const RIT_FACULTY_DIRECTORY = {
    'chinnammal v': { designation: 'Professor & HOD', department: 'Department of ECE' },
    'chinnammal, v': { designation: 'Professor & HOD', department: 'Department of ECE' },
    'anand r': { designation: 'Associate Professor', department: 'Department of CSE' },
    'anand, r': { designation: 'Associate Professor', department: 'Department of CSE' },
    'sundaram m': { designation: 'Professor', department: 'Department of Mechanical Engineering' },
    'sundaram, m': { designation: 'Professor', department: 'Department of Mechanical Engineering' },
    'kavitha s': { designation: 'Associate Professor & Head', department: 'Department of AI & DS' },
    'kavitha, s': { designation: 'Associate Professor & Head', department: 'Department of AI & DS' },
    'rajesh k': { designation: 'Associate Professor', department: 'Department of ECE' },
    'rajesh, k': { designation: 'Associate Professor', department: 'Department of ECE' },
    'karthikeyan b': { designation: 'Associate Professor', department: 'Department of EEE' },
    'karthikeyan, b': { designation: 'Associate Professor', department: 'Department of EEE' },
    'deepika m': { designation: 'Assistant Professor', department: 'Department of AI & DS' },
    'deepika, m': { designation: 'Assistant Professor', department: 'Department of AI & DS' },
    'priyadharshini k': { designation: 'Assistant Professor', department: 'Department of AI & DS' },
    'priyadharshini, k': { designation: 'Assistant Professor', department: 'Department of AI & DS' },
    'divya r': { designation: 'Assistant Professor', department: 'Department of ECE' },
    'divya, r': { designation: 'Assistant Professor', department: 'Department of ECE' },
    'venkatesh p': { designation: 'Assistant Professor', department: 'Department of Mechanical Engineering' },
    'venkatesh, p': { designation: 'Assistant Professor', department: 'Department of Mechanical Engineering' },
    'senthil v': { designation: 'Assistant Professor', department: 'Department of ECE' },
    'senthil, v': { designation: 'Assistant Professor', department: 'Department of ECE' },
    'murugan t': { designation: 'Associate Professor', department: 'Department of Mechanical Engineering' },
    'murugan, t': { designation: 'Associate Professor', department: 'Department of Mechanical Engineering' },
    'balaji n': { designation: 'Assistant Professor', department: 'Department of IT' },
    'balaji, n': { designation: 'Assistant Professor', department: 'Department of IT' },
    'premkumar p': { designation: 'Assistant Professor', department: 'Department of CSE' },
    'premkumar, p': { designation: 'Assistant Professor', department: 'Department of CSE' },
    'saravanan m': { designation: 'Assistant Professor', department: 'Department of ECE' },
    'saravanan, m': { designation: 'Assistant Professor', department: 'Department of ECE' }
};

/**
 * Extracts Department from affiliation chunk
 */
function extractDepartment(chunk) {
    if (!chunk) return 'Department of Engineering';

    // 1. Direct regex match for "Department of ..." or "Dept. of ..."
    const deptMatch = chunk.match(/(?:Department|Dept\.?|School|Division|Centre|Center)\s+of\s+([^,;\.]+)/i);
    if (deptMatch && deptMatch[1]) {
        let dept = deptMatch[1].trim();
        // Clean trailing institution name if merged
        dept = dept.replace(/\s*Rajalakshmi\s*Institute.*$/i, '').trim();
        dept = dept.replace(/\s*Tamil\s*Nadu.*$/i, '').trim();
        dept = dept.replace(/\s*Chennai.*$/i, '').trim();
        if (dept.length > 1) {
            return `Department of ${dept}`;
        }
    }

    // 2. Acronym match (e.g. "Department of ECE", "ECE Department", "CSE", "IT", "EEE", "Mech")
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
 * Extracts Designation from chunk or directory
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

// TEST CASES
console.log('--- Testing Department & Designation Extraction ---');

const test1 = 'Chinnammal V., Rajalakshmi Institute of Technology, Department of ECE, Tamil Nadu, Chennai, India';
const dept1 = extractDepartment(test1);
const desig1 = extractDesignation('Chinnammal V.', test1);
console.log('Test 1:', { author: 'Chinnammal V.', designation: desig1, department: dept1 });
assert(dept1.includes('ECE'));
assert.strictEqual(desig1, 'Professor & HOD');

const test2 = 'Dr. Anand R., Associate Professor, Department of Computer Science and Engineering, Rajalakshmi Institute of Technology, Chennai, India';
const dept2 = extractDepartment(test2);
const desig2 = extractDesignation('Anand R.', test2);
console.log('Test 2:', { author: 'Anand R.', designation: desig2, department: dept2 });
assert(dept2.includes('Computer Science'));
assert.strictEqual(desig2, 'Associate Professor');

const test3 = 'Sundaram M., Rajalakshmi Institute of Technology, Department of Mechanical Engineering, Chennai, India';
const dept3 = extractDepartment(test3);
const desig3 = extractDesignation('Sundaram M.', test3);
console.log('Test 3:', { author: 'Sundaram M.', designation: desig3, department: dept3 });
assert(dept3.includes('Mechanical'));
assert.strictEqual(desig3, 'Professor');

console.log('All Department and Designation extraction tests passed successfully!');
