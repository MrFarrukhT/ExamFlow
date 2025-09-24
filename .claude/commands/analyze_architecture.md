```markdown
/analyze_architecture

You will not write code.

Analyze the architectural quality, complexity, and design patterns of a specific page, component, or function.

Scope:
- Target file/function/component only
- Related dependencies and data flow
- Current patterns and structure

Output:
- Architectural Overview: current design pattern, component structure, responsibilities
- Complexity Analysis: 
  - Cyclomatic complexity (high/medium/low)
  - Lines of code and function count
  - Nesting levels and conditional branches
  - State management complexity
- Coupling Analysis:
  - External dependencies (APIs, services, utils)
  - Internal coupling (hooks, contexts, components)
  - Props/parameter complexity
  - Side effects and mutations
- Cohesion Analysis:
  - Single Responsibility Principle adherence
  - Function/method focus and clarity
  - Related functionality grouping
- Design Patterns:
  - Current patterns in use (hooks, HOCs, render props, etc.)
  - Pattern consistency across similar components
  - Anti-patterns detected
- Performance Considerations:
  - Re-render triggers and optimization opportunities
  - Memory usage patterns
  - Expensive operations identification
- Maintainability Factors:
  - Code readability and documentation
  - Error handling patterns
  - Testing surface area
- Architecture Health Score: 1-10 with justification
- Top 3 Architectural Concerns: priority issues that impact maintainability

```