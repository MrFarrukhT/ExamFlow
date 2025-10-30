// Cambridge B2 First - Listening Answer Key
// Mock Test 1

window.testAnswers = {
    // Part 1: Questions 1-7 (Multiple choice with images)
    // Based on typical B2 First listening content
    '1': 'C',  // Which TV programme - Nature/Animals
    '2': 'B',  // What belonged to writer - Desk
    '3': 'C',  // What time arrive home - 9:00
    '4': 'A',  // Which film - Musical/Dance
    '5': 'B',  // Which job - Reporter/Journalist
    '6': 'B',  // How much for jeans - £30
    '7': 'C',  // Final event - Running

    // Part 2: Questions 8-13 (Multiple choice - short conversations)
    '8': 'B',   // Lecture - impressed by speaker
    '9': 'B',   // Weekend - did well at new activity
    '10': 'A',  // Museums - no need to go anymore
    '11': 'B',  // Party - nice to meet old friends
    '12': 'B',  // University - managing time properly
    '13': 'C',  // Chess - well organised

    // Part 3: Questions 14-19 (Gap fill - note completion)
    '14': ['wedding', 'a wedding'],
    '15': ['magazines', 'magazine'],
    '16': ['white'],
    '17': ['gardens', 'garden', 'botanical gardens'],
    '18': ['weather', 'the weather', 'temperature'],
    '19': ['janeflowers', 'jane.flowers', 'jflowers'],

    // Part 4: Questions 20-25 (Multiple choice - interview)
    '20': 'C',  // Job like Alan's - make demonstration disc
    '21': 'A',  // Voice is - clear
    '22': 'C',  // Presenters need to - find out about music on other programmes
    '23': 'A',  // Presenters should - give information about music
    '24': 'B',  // Disadvantage - can't say exactly what he thinks
    '25': 'B',  // Future plans - start own radio station
};

// Test configuration
window.testConfig = {
    testName: 'Cambridge B2 First - Listening',
    testLevel: 'B2 First',
    totalQuestions: 25,
    totalParts: 4,
    timeLimit: 40, // minutes (approximately - includes audio playback time)
    parts: [
        { partNum: 1, questionRange: '1-7', type: 'Multiple choice (images)', questions: 7 },
        { partNum: 2, questionRange: '8-13', type: 'Multiple choice (conversations)', questions: 6 },
        { partNum: 3, questionRange: '14-19', type: 'Gap fill', questions: 6 },
        { partNum: 4, questionRange: '20-25', type: 'Multiple choice (interview)', questions: 6 }
    ],
    instructions: {
        general: 'You will hear each recording TWICE',
        part1: 'For each question, choose the correct picture (A, B, or C)',
        part2: 'For each question, choose the correct answer (A, B, or C)',
        part3: 'Write one or two words or a number or a date or a time',
        part4: 'For each question, choose the correct answer (A, B, or C)'
    }
};
