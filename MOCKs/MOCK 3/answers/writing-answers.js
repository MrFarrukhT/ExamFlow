// IELTS MOCK 3 - Writing Answers and Sample Responses
// This file contains sample answers and scoring criteria

window.writingAnswers = {
    mock: 3,
    skill: 'writing',
    
    // Task 1 Sample Answer (150+ words)
    task1_sample: `The graph illustrates the number of new businesses established in four different industries in Singapore between 2011 and 2021.

Overall, the technology sector experienced the most dramatic growth throughout the period, while manufacturing showed a declining trend. The retail and finance industries demonstrated moderate but steady increases.

In 2011, all four sectors started at relatively similar levels, with technology businesses numbering approximately 120, retail 100, finance 90, and manufacturing 110. However, their trajectories diverged significantly over the following decade.

The technology sector showed consistent and substantial growth, reaching its peak of around 400 new businesses by 2021, representing more than a threefold increase. Retail businesses also grew steadily, rising to approximately 180 by 2021. Similarly, the finance sector expanded gradually, reaching about 160 new businesses by the end of the period.

In contrast, manufacturing experienced a continuous decline after 2013, falling from its initial 110 businesses to just 60 by 2021, making it the only sector to show negative growth throughout most of the period.

The data clearly demonstrates Singapore's shift toward a technology-driven economy, with traditional manufacturing giving way to more innovative industries.

(Word count: 178)`,

    // Task 2 Sample Answer (250+ words)
    task2_sample: `The debate over whether students should work part-time while studying or focus exclusively on their education is ongoing, with valid arguments supporting both perspectives. While part-time work can provide valuable benefits, I believe students should primarily concentrate on their studies during their academic years.

Proponents of part-time work argue that it provides essential real-world experience and financial independence. Students who work develop crucial life skills such as time management, responsibility, and professional communication. Additionally, part-time employment can help students graduate debt-free or with reduced financial burden, particularly important in countries with high education costs. Work experience also enhances CVs and can provide valuable networking opportunities that may lead to future career prospects.

However, the primary purpose of higher education is academic achievement and intellectual development. Students who focus solely on their studies typically achieve better grades and have more time for research, extracurricular activities, and building relationships with professors. These activities often provide greater long-term benefits than part-time employment. Furthermore, the modern job market increasingly values specialized knowledge and skills, which require dedicated study time to develop properly.

The financial argument for part-time work, while understandable, may be shortsighted. Students who achieve excellent academic results are more likely to secure well-paying graduate positions and scholarships, potentially earning significantly more over their careers than those who sacrificed study time for immediate income.

In conclusion, while part-time work offers certain advantages, the long-term benefits of focusing entirely on academic excellence outweigh the short-term gains of employment. Students should prioritize their education to maximize their future potential.

(Word count: 267)`,
    
    // Scoring criteria
    scoring: {
        task1: {
            total: 20,
            criteria: {
                task_achievement: 5,      // Addresses all parts, clear overview
                coherence_cohesion: 5,    // Logical organization, linking words
                lexical_resource: 5,      // Range of vocabulary, accuracy
                grammar: 5                // Range of structures, accuracy
            },
            word_count_minimum: 150
        },
        task2: {
            total: 20,
            criteria: {
                task_response: 5,         // Position clear, ideas developed
                coherence_cohesion: 5,    // Logical paragraphing, flow
                lexical_resource: 5,      // Appropriate vocabulary range
                grammar: 5                // Complex structures, accuracy
            },
            word_count_minimum: 250
        }
    },
    
    // Assessment guidelines
    assessment: {
        excellent: "Fully addresses the task with clear position and well-developed ideas",
        good: "Addresses the task with mostly relevant ideas and adequate development",
        satisfactory: "Addresses the task with some relevant ideas but limited development",
        needs_improvement: "Partially addresses the task with unclear position or ideas"
    }
};

// Export for use with core.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.writingAnswers;
}
