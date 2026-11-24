/**
 * Scopus Publication Tracker - Visual Analytics & Charts Module
 * Renders interactive distribution charts using Chart.js
 */

const ScopusCharts = (function () {
    'use strict';

    let yearChartInstance = null;
    let authorChartInstance = null;
    let docTypeChartInstance = null;
    let quartileChartInstance = null;

    /**
     * Destroys existing chart instances
     */
    function destroyCharts() {
        if (yearChartInstance) {
            yearChartInstance.destroy();
            yearChartInstance = null;
        }
        if (authorChartInstance) {
            authorChartInstance.destroy();
            authorChartInstance = null;
        }
        if (docTypeChartInstance) {
            docTypeChartInstance.destroy();
            docTypeChartInstance = null;
        }
        if (quartileChartInstance) {
            quartileChartInstance.destroy();
            quartileChartInstance = null;
        }
    }

    /**
     * Renders Year-wise publication distribution chart
     */
    function renderYearDistribution(canvasId, ritPubs, allLatestPubs) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof Chart === 'undefined') return;

        // Collect all distinct years
        const yearMap = new Map(); // year -> { rit: 0, nonRit: 0 }

        allLatestPubs.forEach(p => {
            const y = (p['Year'] || p['year'] || 'Unknown').toString().trim();
            if (!yearMap.has(y)) {
                yearMap.set(y, { rit: 0, total: 0 });
            }
            yearMap.get(y).total++;
        });

        ritPubs.forEach(p => {
            const y = (p['Year'] || p['year'] || 'Unknown').toString().trim();
            if (yearMap.has(y)) {
                yearMap.get(y).rit++;
            }
        });

        // Sort years chronologically
        const sortedYears = Array.from(yearMap.keys()).sort((a, b) => {
            if (a === 'Unknown') return 1;
            if (b === 'Unknown') return -1;
            return a.localeCompare(b, undefined, { numeric: true });
        });

        const ritCounts = sortedYears.map(y => yearMap.get(y).rit);
        const otherCounts = sortedYears.map(y => yearMap.get(y).total - yearMap.get(y).rit);

        const ctx = canvas.getContext('2d');
        if (yearChartInstance) yearChartInstance.destroy();

        yearChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedYears,
                datasets: [
                    {
                        label: 'RIT Publications',
                        data: ritCounts,
                        backgroundColor: '#6366f1', // Indigo
                        borderRadius: 6
                    },
                    {
                        label: 'Other Institutions',
                        data: otherCounts,
                        backgroundColor: '#cbd5e1', // Slate light
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        padding: 10,
                        backgroundColor: '#1e293b'
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: { stepSize: 1 },
                        grid: { color: '#f1f5f9' }
                    }
                }
            }
        });
    }

    /**
     * Renders Top RIT Authors horizontal bar chart
     */
    function renderTopAuthors(canvasId, uniqueAuthors, limit = 8) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof Chart === 'undefined') return;

        const top = uniqueAuthors.slice(0, limit);
        const labels = top.map(a => a['Author Name']);
        const counts = top.map(a => a['Total Publications']);

        const ctx = canvas.getContext('2d');
        if (authorChartInstance) authorChartInstance.destroy();

        authorChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Publications',
                    data: counts,
                    backgroundColor: '#8b5cf6', // Violet
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b'
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 },
                        grid: { color: '#f1f5f9' }
                    },
                    y: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    /**
     * Renders Document Type breakdown donut chart
     */
    function renderDocTypeBreakdown(canvasId, publications) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof Chart === 'undefined') return;

        const typeMap = new Map();
        publications.forEach(p => {
            const dt = (p['Document Type'] || p['document type'] || 'Article').trim();
            typeMap.set(dt, (typeMap.get(dt) || 0) + 1);
        });

        const labels = Array.from(typeMap.keys());
        const data = Array.from(typeMap.values());
        const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

        const ctx = canvas.getContext('2d');
        if (docTypeChartInstance) docTypeChartInstance.destroy();

        docTypeChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            font: { family: "'Inter', sans-serif", size: 12 },
                            usePointStyle: true
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }

    /**
     * Renders Journal Quartile breakdown (Q1, Q2, Q3, Q4, Conference/Other)
     */
    function renderQuartileBreakdown(canvasId, publications) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof Chart === 'undefined') return;

        let q1Count = 0;
        let q2Count = 0;
        let q3Count = 0;
        let q4Count = 0;
        let confCount = 0;
        let unrankedCount = 0;

        publications.forEach(p => {
            const q = (p['Quartile'] || '').toUpperCase();
            if (q === 'Q1') q1Count++;
            else if (q === 'Q2') q2Count++;
            else if (q === 'Q3') q3Count++;
            else if (q === 'Q4') q4Count++;
            else if (q === 'CONFERENCE') confCount++;
            else unrankedCount++;
        });

        const labels = ['Q1 Articles', 'Q2 Articles', 'Q3 Articles', 'Q4 Articles'];
        const data = [q1Count, q2Count, q3Count, q4Count];
        const colors = ['#10b981', '#3b82f6', '#f59e0b', '#f97316'];

        if (confCount > 0) {
            labels.push('Conference Papers');
            data.push(confCount);
            colors.push('#8b5cf6');
        }
        if (unrankedCount > 0) {
            labels.push('Unranked / Other');
            data.push(unrankedCount);
            colors.push('#94a3b8');
        }

        const ctx = canvas.getContext('2d');
        if (quartileChartInstance) quartileChartInstance.destroy();

        quartileChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const total = data.reduce((a, b) => a + b, 0);
                                const val = context.raw || 0;
                                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                                return ` ${context.label}: ${val} (${pct}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    return {
        renderYearDistribution,
        renderTopAuthors,
        renderDocTypeBreakdown,
        renderQuartileBreakdown,
        destroyCharts
    };
})();

if (typeof window !== 'undefined') {
    window.ScopusCharts = ScopusCharts;
}
