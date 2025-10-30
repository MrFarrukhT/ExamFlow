// Cambridge B2 First - Reading & Use of English Answer Key
// Mock Test 1

window.testAnswers = {
    // Part 1: Questions 1-5 (Multiple choice - notices/signs)
    '1': 'B',  // Young children are not allowed to be on the platform alone
    '2': 'B',  // take part in organising the party they have chosen to attend  
    '3': 'A',  // Sally should meet Jenny if she's available at the new time
    '4': 'C',  // Customers who still want to see the concert should keep their tickets
    '5': 'A',  // Anyone can join the club even if they haven't played before

    // Part 2: Questions 6-10 (Matching people to competitions)
    '6': 'G',  // Carla → Talented teens (painting, display work, professional advice)
    '7': 'C',  // Marco → New talent (guitar, free, live audience)
    '8': 'H',  // Alicia → Young stars (ballet, progress assessment, apply online)
    '9': 'B',  // Rick → Talent direct (teenage writers, serious, work experience)
    '10': 'E', // Sonia → All stars (drama/acting, free, win training)

    // Part 3: Questions 11-15 (Multiple choice - Tara Redman text)
    '11': 'B', // explaining how her life has changed
    '12': 'D', // do something more creative
    '13': 'C', // glad that she hadn't got a loan from the bank
    '14': 'D', // having contact with colleagues
    '15': 'C', // Did lots of paperwork today. Maybe I'll hire someone...

    // Part 4: Questions 16-20 (Sentence insertion - Bonnethead shark)
    '16': 'F', // In fact, about half of its diet is based on it
    '17': 'E', // She'd heard reports of divers seeing them eating seagrass
    '18': 'D', // They did this under careful conditions in a laboratory
    '19': 'H', // This proved that they were getting enough energy from the food
    '20': 'B', // It also shows the need for careful management of the places where seagrass grows

    // Part 5: Questions 21-26 (Vocabulary cloze - Moyenne Island)
    '21': 'B', // covered
    '22': 'A', // charged
    '23': 'B', // allowed
    '24': 'C', // aim
    '25': 'A', // known
    '26': 'C', // part

    // Part 6: Questions 27-32 (Open cloze - Travel blog)
    '27': 'what',   // wasn't sure what to expect
    '28': 'the',    // to the top of a hill
    '29': 'There',  // There was a beautiful view
    '30': 'where',  // showing me on a map where we were
    '31': 'had',    // I had run ten kilometres
    '32': 'If'      // If you ever go to Reykjavik
};

// Test configuration
window.testConfig = {
    testName: 'Cambridge B2 First - Reading & Use of English',
    testLevel: 'B2 First',
    totalQuestions: 32,
    totalParts: 6,
    timeLimit: 75, // minutes
    parts: [
        { partNum: 1, questionRange: '1-5', type: 'Multiple choice' },
        { partNum: 2, questionRange: '6-10', type: 'Matching' },
        { partNum: 3, questionRange: '11-15', type: 'Multiple choice' },
        { partNum: 4, questionRange: '16-20', type: 'Sentence insertion' },
        { partNum: 5, questionRange: '21-26', type: 'Multiple choice cloze' },
        { partNum: 6, questionRange: '27-32', type: 'Open cloze' }
    ]
};
