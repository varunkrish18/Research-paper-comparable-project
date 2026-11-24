# Scopus Research Publication Tracker & Institutional Comparison Tool

A modern, professional, academic-grade web application designed to track and compare Scopus research publication exports, identify newly added publications, and extract research publications and authors associated with **Rajalakshmi Institute of Technology (RIT)**.

---

## 🌟 Key Capabilities

### 1. Feature 1: Scopus Export Comparison (EID-Based)
- **Comparison Metric**: Compares records strictly using Scopus **`EID`** (Electronic Identifier) as the unique identifier.
- **Formula**:
  $$\text{New Publications} = \text{Today's EIDs} - \text{Previous Week's EIDs}$$
- **Normalization**: Case-insensitive and trimmed whitespace matching (`eid.toString().trim().toLowerCase()`).
- **Data Integrity**: 100% of the original columns and complete row data from today's export are preserved verbatim without modification or fabrication.
- **Diagnostics**:
  - Handles duplicate EIDs without inflating counts.
  - Detects and reports missing/invalid/blank EID records.
  - Automatically validates column presence across varying column orders and header casing variations (`EID`, `eid`, `Eid`).

### 2. Feature 2: Rajalakshmi Institute of Technology (RIT) Author Filtering
- **Primary Source**: Extracted from the `Authors with affiliations` column.
- **Accurate Author-to-Affiliation Mapping**:
  - Matches institution name: `Rajalakshmi Institute of Technology` (case-insensitive, accommodating spacing/punctuation variations).
  - Isolates individual author-affiliation pairs (separated by semicolons `;`).
  - Cross-references with the `Authors` column and isolates the specific author name tied to RIT.
  - **Excludes non-RIT co-authors**: Authors affiliated only with other institutions (e.g. Anna University, IIT Madras) are excluded from the `RIT Authors` field.
  - **Sister Institution Safeguard**: Excludes non-matching sister institutions such as Rajalakshmi Engineering College (REC).
  - Handles multi-author RIT collaborations and retains author appearance across multiple publications.
- **Standardized Output Columns**:
  - `EID`
  - `Title`
  - `Year`
  - `Authors` (all authors listed originally)
  - `RIT Authors` (only authors mapped to Rajalakshmi Institute of Technology)
  - `Authors with affiliations`
  - `Affiliations`
  - `DOI`
  - `Source title`
  - `Document Type`
  - *(All remaining original Scopus columns preserved)*

### 3. Feature 3: Journal Quartile (Q1 / Q2 / Q3 / Q4) Classification
- **Automatic Quality Ranking**: Determines whether each released article comes under **Q1, Q2, Q3, or Q4** according to Scopus CiteScore and SCImago journal rankings.
- **Intelligent Multi-Tiered Matching**:
  - Direct column detection (`Quartile`, `SJR Quartile`, `CiteScore Quartile`).
  - CiteScore percentile calculation ($\ge 75 \rightarrow \text{Q1}$, $50-74 \rightarrow \text{Q2}$, $25-49 \rightarrow \text{Q3}$, $< 25 \rightarrow \text{Q4}$).
  - Comprehensive built-in database covering hundreds of academic journals across IEEE, Elsevier, Springer Nature, Wiley, ACM, MDPI, etc.
  - Distinguishes journal **Articles & Reviews** from **Conference Papers**.
- **Interactive UI Badges & Filters**:
  - Color-coded badges: Q1 (Emerald), Q2 (Blue), Q3 (Amber), Q4 (Orange), Conference (Purple).
  - Quartile filtering dropdown in tables (`Q1 Only`, `Q2 Only`, `Q3 Only`, `Q4 Only`, `Top Tier Q1 & Q2`).
  - Included as a standard column in all table views and generated Excel (`.xlsx`) & CSV exports.

### 4. Feature 4: Combined Analytics & Institutional Summary
- Real-time KPI summary cards:
  - Total newly added publications
  - Number of newly added publications associated with RIT
  - Total RIT-associated publications in today's export
  - Number of unique RIT authors
  - **Q1, Q2, Q3, and Q4 publication quality metrics**
  - Year-wise publication distribution
- Interactive visual charts (powered by Chart.js):
  - **Year-wise Publication Distribution** (RIT vs Other Institutions)
  - **Top Contributing RIT Authors Leaderboard** (with author-level Q1–Q4 breakdowns)
  - **Journal Quartile Distribution** (Q1, Q2, Q3, Q4, Conference)
  - **Document Type Breakdown** (Articles, Conference Papers, Reviews, etc.)

### 5. Downloadable Output Datasets
The application generates the required export files in both **Excel (`.xlsx`)** and **CSV (`.csv`)** formats (with UTF-8 BOM encoding for proper international character display in Microsoft Excel):
1. **`New_Publications.xlsx` / `.csv` (Step 1)**: Publications present in today's export but absent in previous week's export, identified using EID with all original Scopus columns preserved.
2. **`New_RIT_Authors_and_Publications.xlsx` (Step 2)**: All authors affiliated with Rajalakshmi Institute of Technology identified **from the newly added records**, featuring their **Name**, **Designation**, **Department**, Paper Title, EID, Year, Journal, Quartile, SCIE status, and DOI.
3. **`RIT_Publications.xlsx` / `.csv`**: All publications having at least one author affiliated with Rajalakshmi Institute of Technology (cumulative).
4. **`RIT_Unique_Authors.xlsx` / `.csv`**: A deduplicated directory of authors associated with Rajalakshmi Institute of Technology.

---

## 🔒 Security & Privacy Guarantee

- **100% In-Browser Client-Side Processing**: All parsing, comparison, and file generation happen strictly in the browser memory using SheetJS (`xlsx`).
- **Zero Server Uploads**: Research data is never transmitted across the network, preserving academic privacy and confidential unpublished citation tracking.

---

## 📁 Directory Structure

```
research-project/
├── index.html                  # Main responsive web dashboard
├── css/
│   └── styles.css              # Custom styling, typography, responsive rules
├── js/
│   ├── scopus-parser.js        # Browser-based file reader & header normalization
│   ├── journal-quartile.js     # Automatic Q1/Q2/Q3/Q4 journal quartile classifier
│   ├── scopus-comparator.js    # Set-based EID comparator & duplicate/missing detector
│   ├── rit-extractor.js        # RIT institution matcher & author affiliation mapper
│   ├── exporter.js             # Client-side XLSX & CSV download generator
│   ├── charts.js               # Interactive Chart.js visualizations
│   ├── sample-data.js          # Built-in realistic sample Scopus exports
│   └── app.js                  # Application controller, drag-drop, pagination, search
├── vendor/
│   ├── xlsx.full.min.js        # SheetJS standalone bundle (offline ready)
│   └── chart.umd.js            # Chart.js standalone bundle (offline ready)
├── sample-files/
│   ├── scopus_previous_week.csv
│   ├── scopus_previous_week.xlsx
│   ├── scopus_latest_week.csv
│   └── scopus_latest_week.xlsx
├── test/
│   ├── test-scopus.js          # Unit tests for affiliation extraction
│   ├── test-comparator.js      # Unit tests for comparator logic
│   ├── test-export.js          # Unit tests for Excel and CSV writing
│   └── test-suite.js           # Full end-to-end integration test suite
├── serve.js                    # Lightweight local HTTP server (zero dependencies)
└── README.md                   # Complete documentation and user guide
```

---

## 🚀 How to Run Locally

You can run this application using any of the following methods:

### Method 1: Instant Direct Launch (No Server Needed)
Simply open **`index.html`** by double-clicking it or dragging it into any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari).

### Method 2: Using Built-in Node Server
```bash
node serve.js
```
Then open: [http://localhost:3000](http://localhost:3000)

### Method 3: Using Python
```bash
python -m http.server 3000
```
Then open: [http://localhost:3000](http://localhost:3000)

---

## 🧪 Automated Testing & Verification

A comprehensive automated test suite is included. To run all unit and integration tests:

```bash
node test/test-suite.js
```

### Verified Test Cases:
- `[TEST 1]` EID comparison, duplicate detection, and missing EID reporting.
- `[TEST 2]` Extraction of all 10 required columns for RIT publications.
- `[TEST 3]` Negative filtering: non-RIT co-authors are excluded from `RIT Authors`.
- `[TEST 4]` Disambiguation: Rajalakshmi Engineering College (REC) correctly rejected.
- `[TEST 5]` Deduplicated unique author summary generation.
- `[TEST 6]` Cross-matrix evaluation: RIT publications within newly added records.
- `[TEST 7]` XLSX and CSV generation with UTF-8 BOM encoding.
- `[TEST 8]` Journal Quartile (Q1 / Q2 / Q3 / Q4) classification.
- `[TEST 9]` Step 2: Author Name, Designation, and Department extraction & Excel generation.
- `[TEST 10]` Step 3: SCIE indexing detection & Clarivate Web of Science ranking.

---

## 💡 Quick Start with Demo Data

1. Open the application.
2. Click the **"Load Demo Data"** button in the top navigation bar.
3. The application will instantly load pre-configured realistic Scopus exports containing:
   - Baseline publications from previous week.
   - Newly added publications (RIT and non-RIT).
   - Duplicate EID edge cases.
   - Missing EID edge cases.
4. Review the comparison dashboard, explore RIT author mappings, view interactive charts, and test downloading the generated datasets.
