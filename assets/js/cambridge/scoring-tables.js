// Cambridge Score Conversion Tables & Grade Boundaries
// Based on official data from cambridge-score.com
// Extracted from cambridge-student-results.html (ADR-030) for reuse

(function () {
    'use strict';

    // Generate a raw→scale conversion lookup table
    // passRaw = the raw score needed to achieve the pass scale score
    function generateConversionTable(maxRaw, minScale, maxScale, passScale, passRaw) {
        const table = {};
        for (let i = 0; i <= maxRaw; i++) {
            if (i <= passRaw) {
                const ratio = i / passRaw;
                table[i] = Math.round(minScale + ratio * (passScale - minScale));
            } else {
                const ratio = (i - passRaw) / (maxRaw - passRaw);
                table[i] = Math.round(passScale + ratio * (maxScale - passScale));
            }
        }
        return table;
    }

    // Score conversion tables per level and skill
    const CONVERSION_TABLES = {
        'A2-Key': {
            reading:   { max: 30, scale: generateConversionTable(30, 100, 150, 120, 20) },
            writing:   { max: 30, scale: generateConversionTable(30, 100, 150, 120, 18) },
            listening: { max: 25, scale: generateConversionTable(25, 100, 150, 120, 17) },
            speaking:  { max: 45, scale: generateConversionTable(45, 100, 150, 120, 27) }
        },
        'B1-Preliminary': {
            reading:   { max: 32, scale: generateConversionTable(32, 120, 170, 140, 23) },
            writing:   { max: 40, scale: generateConversionTable(40, 120, 170, 140, 24) },
            listening: { max: 25, scale: generateConversionTable(25, 120, 170, 140, 18) },
            speaking:  { max: 30, scale: generateConversionTable(30, 120, 170, 140, 18) }
        },
        'B2-First': {
            reading:       { max: 42, scale: generateConversionTable(42, 140, 190, 160, 24) },
            writing:       { max: 40, scale: generateConversionTable(40, 140, 190, 160, 24) },
            listening:     { max: 30, scale: generateConversionTable(30, 140, 190, 160, 18) },
            speaking:      { max: 60, scale: generateConversionTable(60, 140, 190, 160, 36) },
            useOfEnglish:  { max: 28, scale: generateConversionTable(28, 140, 190, 160, 18) }
        },
        'A1-Movers': {
            readingWriting: { max: 35, scale: generateConversionTable(35, 100, 120, 106, 21) },
            listening:      { max: 25, scale: generateConversionTable(25, 100, 120, 106, 15) },
            speaking:       { max: 15, scale: generateConversionTable(15, 100, 120, 106, 9) }
        }
    };

    // Grade boundaries — scale score thresholds per level
    const GRADE_BOUNDARIES = {
        'A2-Key': {
            'B1': 140, 'A2-Merit': 133, 'A2': 120, 'A1': 100,
            minPass: 120
        },
        'B1-Preliminary': {
            'B2': 160, 'B1-Merit': 153, 'B1': 140, 'A2': 120,
            minPass: 140
        },
        'B2-First': {
            'C1': 180, 'B2-Merit': 173, 'B2': 160, 'B1': 140,
            minPass: 160
        },
        'A1-Movers': {
            'A2': 100,
            minPass: 100
        }
    };

    // Convert a raw score to the Cambridge scale score
    function convertRawToScale(raw, skill, level) {
        if (raw === null || raw === undefined || raw === '') return null;
        const table = CONVERSION_TABLES[level];
        if (!table || !table[skill]) return null;
        const skillData = table[skill];
        const rawScore = Math.min(Math.max(0, parseInt(raw)), skillData.max);
        return skillData.scale[rawScore] || null;
    }

    // Calculate the average scale score across multiple skills
    function calculateOverallScale(scales) {
        const validScales = scales.filter(s => s !== null && s !== undefined);
        if (validScales.length === 0) return null;
        return Math.round(validScales.reduce((a, b) => a + b, 0) / validScales.length);
    }

    // Determine CEFR level from overall scale score
    function getCefrLevel(overallScale, level) {
        const boundaries = GRADE_BOUNDARIES[level];
        if (!boundaries || !overallScale) return '-';
        const sortedGrades = Object.entries(boundaries)
            .filter(([key]) => key !== 'minPass')
            .sort((a, b) => b[1] - a[1]);
        for (const [grade, threshold] of sortedGrades) {
            if (overallScale >= threshold) return grade;
        }
        return 'Below Level';
    }

    // Check if a student passed
    function isPassed(overallScale, level) {
        const boundaries = GRADE_BOUNDARIES[level];
        if (!boundaries || !overallScale) return false;
        return overallScale >= boundaries.minPass;
    }

    // Expose as global CambridgeScoring namespace
    window.CambridgeScoring = {
        CONVERSION_TABLES,
        GRADE_BOUNDARIES,
        convertRawToScale,
        calculateOverallScale,
        getCefrLevel,
        isPassed
    };
})();
