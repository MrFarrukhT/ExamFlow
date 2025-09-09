// IELTS MOCK 9 - Writing Answers and Sample Responses
// This file contains sample answers and scoring criteria

window.writingAnswers = {
    mock: 9,
    skill: 'writing',
    
    // Task 1 Sample Answer (150+ words)
    task1_sample: `The table illustrates the consumption of five different food types in Brazil, India, and Australia, comparing data from 1961 and 2011.

Overall, all three countries experienced increases in most food categories over the 50-year period, with Brazil showing the most dramatic changes across all food types.

In Brazil, the consumption of dairy and eggs more than doubled from 185g to 446g, while meat consumption more than tripled from 92g to 290g. Fruit and vegetables also increased substantially from 515g to 706g. Grain consumption rose moderately from 262g to 315g, and sugar and fat intake increased from 147g to 260g.

India showed significant increases in fruit and vegetables (from 199g to 450g) and dairy and eggs (from 108g to 235g). Grain consumption rose from 378g to 416g, and sugar and fat intake increased slightly from 108g to 129g. Notably, meat consumption remained extremely low, rising only from 17g to 29g.

Australia was the only country to show a decrease in any category, with grain consumption falling from 283g to 239g. However, meat consumption increased from 343g to 423g, and fruit and vegetables rose from 480g to 661g. Dairy and eggs consumption decreased slightly from 742g to 670g, while sugar and fat intake increased from 173g to 208g.

(Word count: 203)`,

    // Task 2 Sample Answer (250+ words)
    task2_sample: `The question of whether running one's own business is preferable to working for someone else is complex, with valid arguments on both sides. While entrepreneurship offers certain advantages, I believe that for most people, traditional employment provides greater security and work-life balance.

Proponents of entrepreneurship argue that business ownership offers unlimited earning potential and complete control over one's professional destiny. Successful entrepreneurs like Steve Jobs and Elon Musk demonstrate how innovative thinking and risk-taking can lead to extraordinary wealth and influence. Additionally, business owners can make decisions quickly without bureaucratic constraints and have the flexibility to pursue their vision without compromise.

However, the reality for most entrepreneurs is far more challenging. Statistics show that approximately 90% of startups fail within the first five years, often leaving founders with significant debt and financial stress. Unlike employees who receive regular salaries, entrepreneurs face unpredictable income streams and must handle all aspects of business operations, from marketing to accounting. This often results in 60-80 hour work weeks and constant stress about cash flow and competition.

Traditional employment, conversely, offers predictable income, structured career progression, and valuable benefits such as health insurance and retirement plans. Employees can focus on their expertise rather than worrying about administrative tasks and can typically maintain better work-life balance. Many large corporations also provide opportunities for professional development and innovation within a supportive framework.

In conclusion, while entrepreneurship may suit certain personality types and circumstances, the security, structure, and balanced lifestyle offered by traditional employment make it the better choice for most individuals.

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
