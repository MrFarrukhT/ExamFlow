# Question Bank Schema

This document is the authoritative reference for the JSON structure of
Zarmet Olympiada question banks. Every file under
`content/{lang}/{skill}.json` must conform to this schema.

Defined in ADR-034 (`architect-decisions.md`).

---

## File-level fields

```json
{
  "id": "english-c1-reading",
  "language": "en",
  "languageLabel": "English",
  "level": "C1",
  "skill": "reading",
  "title": "Cambridge C1 Advanced — Reading and Use of English",
  "durationMinutes": 90,
  "instructions": "Read the instructions for each part carefully. You have 90 minutes to complete this paper.",
  "parts": [ /* see below */ ],
  "scoring": {
    "mode": "per-question-points",
    "totalPoints": 80
  }
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Stable, kebab-case, matches `{lang}-{level}-{skill}` |
| `language` | string | yes | ISO 639-1 code: `en`, `de` |
| `languageLabel` | string | yes | Display label: "English", "German" |
| `level` | string | yes | `C1` for this app |
| `skill` | string | yes | `reading` or `listening` |
| `title` | string | yes | Full exam paper title |
| `durationMinutes` | number | yes | Official exam duration (90 for CAE RUoE, 65 for Goethe Lesen, 40 for either listening) |
| `instructions` | string | no | Top-level instructions shown on the first page |
| `parts` | array | yes | One or more `Part` objects |
| `scoring` | object | yes | See Scoring section |

---

## Part object

```json
{
  "id": "part1",
  "title": "Part 1 — Multiple-choice cloze",
  "instructions": "For questions 1-8, read the text below and decide which answer (A, B, C or D) best fits each gap.",
  "passage": {
    "type": "text",
    "content": "An author's dilemma\n\nIt can come as [[GAP:q1]] surprise to a literary critic that the author of a novel is sometimes willing to..."
  },
  "audio": null,
  "questions": [ /* see below */ ]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Stable part ID: `part1`, `part-listening-3`, etc. |
| `title` | string | yes | Shown at the top of the part |
| `instructions` | string | no | Part-specific instructions |
| `passage` | object \| null | no | Text/HTML/image passage — `null` if no passage (e.g., standalone listening questions) |
| `audio` | object \| null | no | Audio for listening parts — `null` for reading |
| `questions` | array | yes | The questions in this part |

### Passage object

```json
{
  "type": "text",
  "content": "... plain text with [[GAP:q1]] markers for inline gap fills ..."
}
```

- `type`: `"text"` (default, plain text with optional inline gap markers) or `"html"` (sanitized HTML for formatted passages)
- `content`: The passage body
- Inline gap markers `[[GAP:qID]]` are replaced with an input field bound to that question's ID

### Audio object

```json
{
  "src": "audio/part1.mp3",
  "maxPlays": 2,
  "note": "You will hear each extract twice."
}
```

- `src`: Relative path under the language's `audio/` folder
- `maxPlays`: Integer. Use `1` for played-once parts (standard in Goethe Hören Teil 1), `2` for played-twice (standard elsewhere)
- `note`: Optional line of text shown next to the player

---

## Question types

All question objects share these base fields:

```json
{
  "id": "q1",
  "type": "multiple-choice",
  "prompt": "Question 1",
  "points": 1,
  "answer": "..."
}
```

- `id`: **Must be stable and unique across the whole file** (live-save relies on this). Convention: `q1`, `q2`, ... numbered sequentially across parts
- `type`: One of the types below
- `prompt`: Display text for the question
- `points`: Points awarded for correct answer (default `1`)
- `answer`: Correct answer — format varies by type, see below. **Stripped from the version served to the client.**

### `multiple-choice`

```json
{
  "id": "q1",
  "type": "multiple-choice",
  "prompt": "1",
  "options": [
    { "key": "A", "text": "considerable" },
    { "key": "B", "text": "substantial" },
    { "key": "C", "text": "extensive" },
    { "key": "D", "text": "generous" }
  ],
  "answer": "B",
  "points": 1
}
```

- `options`: Array of `{key, text}` — usually A/B/C/D but free-form
- `answer`: String — the correct option key

### `multiple-choice-multi`

Same as `multiple-choice` but:
- `answer`: Array of keys, e.g. `["A", "C"]`
- Client must show checkboxes, not radio buttons
- Full points only if all correct keys selected and no incorrect keys

### `gap-fill` / `open-cloze`

```json
{
  "id": "q9",
  "type": "gap-fill",
  "prompt": "Gap 9",
  "answer": ["in", "In"],
  "points": 1
}
```

- `answer`: Array of acceptable strings. Match is case-insensitive by default
- Set `"caseSensitive": true` to require exact case
- `open-cloze` is an alias for `gap-fill` (CAE Part 2 terminology)

### `word-formation`

```json
{
  "id": "q17",
  "type": "word-formation",
  "prompt": "17",
  "rootWord": "KNOW",
  "answer": ["unknown", "Unknown"],
  "points": 1
}
```

- `rootWord`: The capitalized base word shown next to the gap
- `answer`: Array of acceptable transformations (typically just one)

### `key-word-transformation`

```json
{
  "id": "q25",
  "type": "key-word-transformation",
  "prompt": "They didn't have enough money to buy the car.",
  "keyWord": "AFFORD",
  "leadIn": "They __________ the car.",
  "answer": {
    "required": ["could", "not", "afford"],
    "maxWords": 6,
    "alternatives": [
      ["could", "n't", "afford"],
      ["were", "unable", "to", "afford"]
    ]
  },
  "points": 2
}
```

- `keyWord`: The word that must appear (unchanged) in the student's rewrite
- `leadIn`: The partial sentence with a gap
- `answer.required`: Words that must appear in order
- `answer.maxWords`: Upper bound (CAE standard: 2–5 or 3–6 words)
- `answer.alternatives`: Other acceptable word sequences

### `matching`

```json
{
  "id": "q37",
  "type": "matching",
  "prompt": "37. mentions a sense of isolation early in the trip",
  "answer": "C",
  "points": 1
}
```

- Options come from the part-level `matchingOptions` field (shared across all matching questions in that part):

```json
{
  "id": "part7",
  "matchingOptions": [
    { "key": "A", "text": "Writer A" },
    { "key": "B", "text": "Writer B" },
    { "key": "C", "text": "Writer C" },
    { "key": "D", "text": "Writer D" }
  ],
  "questions": [ /* each with type: "matching", answer: "A|B|C|D" */ ]
}
```

### `true-false`

```json
{
  "id": "q45",
  "type": "true-false",
  "prompt": "The speaker thinks the deadline is unrealistic.",
  "answer": "true",
  "points": 1
}
```

- `answer`: `"true"`, `"false"`, or `"not-given"` (if the part allows not-given)

### `sentence-completion`

```json
{
  "id": "q20",
  "type": "sentence-completion",
  "prompt": "The researcher described the finding as __________ .",
  "maxWords": 3,
  "answer": ["unprecedented", "groundbreaking"],
  "points": 1
}
```

- For listening sentence completion (CAE Listening Part 2, Goethe Hören gap fills)
- `maxWords`: Soft limit shown to the student, enforced at scoring

### `gapped-text`

For CAE Reading Part 7 — students slot detached paragraphs (A-G) into numbered gaps in a passage.

At the **part level** add a `paragraphBank`:

```json
{
  "id": "part7",
  "title": "Part 7 — Gapped text",
  "instructions": "Six paragraphs have been removed from the article. Choose from the paragraphs A-G the one which fits each gap. There is one extra paragraph which you do not need to use.",
  "passage": {
    "type": "text",
    "content": "Scottish Wildcat\n\n[[SLOT:q41]]\n\nHowever, the physical differences are tangible... [[SLOT:q42]] ..."
  },
  "paragraphBank": [
    { "key": "A", "text": "The nuthatch of one to its nearest ferny burrow..." },
    { "key": "B", "text": "It was during the nineteenth century that..." },
    { "key": "C", "text": "Despite this, hunting remains a concern..." },
    { "key": "D", "text": "..." },
    { "key": "E", "text": "..." },
    { "key": "F", "text": "..." },
    { "key": "G", "text": "..." }
  ],
  "questions": [
    { "id": "q41", "type": "gapped-text", "prompt": "41", "answer": "C", "points": 1 },
    { "id": "q42", "type": "gapped-text", "prompt": "42", "answer": "A", "points": 1 }
  ]
}
```

- `paragraphBank`: Array of `{key, text}` objects. Keys are usually A-G. Exactly one extra paragraph is standard.
- Passage uses `[[SLOT:qID]]` markers where each gap lives. The renderer replaces each marker with a drop-zone bound to that question.
- `answer`: The correct paragraph key (string).
- Scoring: Exact string match (same as `matching`).
- Rendering: Click a slot, then click a paragraph in the bank to assign it. Click a filled slot to release its paragraph back to the bank.

---

## Part-level: `taskGroups` (for Listening Part 4)

CAE Listening Part 4 has **two independent matching tasks** scored against the same audio. Rather than modeling them as two separate parts, use `taskGroups`:

```json
{
  "id": "part-listening-4",
  "title": "Part 4 — Multiple matching",
  "instructions": "You will hear five short extracts in which people are talking about changing their jobs.",
  "audio": {
    "src": "audio/part4.mp3",
    "autoPlay": true
  },
  "taskGroups": [
    {
      "id": "task1",
      "instructions": "Task 1: For questions 21-25, choose from the list A-H what reason each speaker gives for changing their job.",
      "options": [
        { "key": "A", "text": "unfriendly colleagues" },
        { "key": "B", "text": "poor holiday entitlement" },
        { "key": "C", "text": "lacking a sense of purpose" }
      ],
      "questions": [
        { "id": "q21", "type": "matching", "prompt": "Speaker 1", "answer": "C", "points": 1 }
      ]
    },
    {
      "id": "task2",
      "instructions": "Task 2: For questions 26-30, choose from the list A-H how each speaker feels about their new job.",
      "options": [
        { "key": "A", "text": "encouraged by early results" },
        { "key": "B", "text": "hopeful about future success" },
        { "key": "C", "text": "delighted by a change in lifestyle" }
      ],
      "questions": [
        { "id": "q26", "type": "matching", "prompt": "Speaker 1", "answer": "C", "points": 1 }
      ]
    }
  ]
}
```

**Rules:**
- `taskGroups` and `questions` are **mutually exclusive** on a part — only one is used. The server will refuse to load a part that has both populated.
- Each task group has its own `instructions`, its own `options` (shared across all matching questions in that task), and its own `questions` array.
- Question IDs must still be unique across the whole file (the server validates this).
- Scoring walks `taskGroups[*].questions` when present. Totals roll up to the part's score, which rolls up to the file's `scoring.totalPoints`.

---

## Scoring

```json
{
  "mode": "per-question-points",
  "totalPoints": 80
}
```

- `mode`: Currently only `per-question-points` is supported
- `totalPoints`: The sum of `points` across all questions. The server should cross-check this on load and warn if it mismatches

---

## Answer stripping (server responsibility)

When the server serves a content file to the client, it MUST remove every `answer` field, every `points` field, and the `scoring.totalPoints` field. The client never sees correct answers. Scoring happens only in the submit handler, which reads the full file server-side.

Enforced by `stripAnswerKey()` in `server.js`.

---

## Validation rules

1. Every `id` is unique within its scope (part IDs unique per file, question IDs unique per file)
2. `durationMinutes` is a positive integer
3. Every question has a `type` from the registry
4. Every answer matches the expected format for its type
5. `scoring.totalPoints` equals the sum of question `points`

The server loads files at startup. If a file fails validation, the server logs a loud error and refuses to serve that language/skill until fixed.
