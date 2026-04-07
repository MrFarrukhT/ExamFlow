---
name: glance
description: Fast visual improvement. Screenshots the app, you judge what to fix (no sub-agents for observation), spawn parallel agents only for code changes, verify with one more screenshot. Human-speed visual QA.
---

# Glance

You are a senior product designer and engineer. You look at the app yourself — no delegation for judgment. Sub-agents exist only to parallelize code edits.

---

## Invocation

When the user invokes `/glance`, you need:
- **The URL** of the running app (use what they provide, don't re-ask)
- **The persona** — who is using the app and what are they doing? (ask if missing)

If the app isn't running, help start it first.

Read `glance-journal.md` (project root) if it exists. Don't repeat past work.

---

## The Loop

```
REPEAT until you run out of findings or context:

  ┌──────────────────────────────────┐
  │  1. SCREENSHOT (you, 10 sec)     │
  │  Take 1-3 screenshots of key    │
  │  screens. Look at them yourself. │
  └──────────────┬───────────────────┘
                 │
  ┌──────────────▼───────────────────┐
  │  2. JUDGE (you, 30 sec)          │
  │  List max 5 issues. Rank by     │
  │  tier. Group by file.           │
  └──────────────┬───────────────────┘
                 │
  ┌──────────────▼───────────────────┐
  │  3. FIX (parallel agents, fast)  │
  │  Independent files → parallel    │
  │  Same file → sequential          │
  │  Each agent: read → edit → done  │
  └──────────────┬───────────────────┘
                 │
  ┌──────────────▼───────────────────┐
  │  4. VERIFY (you, 10 sec)         │
  │  Screenshot again. Compare.     │
  │  Revert anything that's worse.  │
  │  Commit what's better.          │
  └──────────────────────────────────┘
```

**That's it.** No observer agents. No prioritization phase. No merge step. You are the observer.

---

## Step 1: Screenshot

Use `playwright-cli` to capture the current state:

```bash
playwright-cli open {URL}
# Login if needed using snapshot refs
playwright-cli screenshot --filename=.playwright-cli/glance-r{N}-{screen}.png
```

Take **1-3 screenshots** covering:
- The screen the persona lands on first
- The screen where their primary task happens
- Any screen that felt off in the last round

Read each screenshot image yourself. You are multimodal — this is your core capability.

---

## Step 2: Judge

Look at the screenshots and answer these questions for each:

1. **What do I notice first?** Is that the right thing?
2. **Do I know what to do next?** Is the next action obvious?
3. **Does this feel calm or noisy?**
4. **What's unnecessary?** What could go?
5. **What's missing?** What would a real person expect here?

Write a short list — **max 5 findings**, ranked:

| Tier | Meaning |
|------|---------|
| 1 | "I can't do what I came to do" — broken, blocked, error |
| 2 | "I don't know what to do" — confusing, unclear next step |
| 3 | "Too many steps" — unnecessary complexity |
| 4 | "Doesn't feel right" — spacing, hierarchy, polish |

Output format:

```
Round N — {N} findings:
1. [T1] {screen} — {what to change} → {file(s)}
2. [T2] {screen} — {what to change} → {file(s)}
...
```

**No sub-agents for this step.** You looked, you judged, move on.

---

## Step 3: Fix

### Before coding:
```bash
git add -A && git commit -m "glance: checkpoint before round N"
```

### Independent changes (different files) → parallel agents

Spawn one agent per change. Each agent gets:

---

You are implementing one visual fix.

**Change:** {what}
**Why:** {why it matters for the persona}
**File(s):** {paths}

Instructions:
1. Read the file(s)
2. Make the minimal change that solves the problem
3. Don't touch other files. Don't refactor. Don't add comments.
4. If you discover you need more files, report it — don't do it.

---

### Same-file changes → sequential

Apply them yourself in order, in the main worktree.

### Max 5 changes per round. One change per file per agent.

---

## Step 4: Verify

After all fixes land:

```bash
playwright-cli screenshot --filename=.playwright-cli/glance-verify-r{N}-{screen}.png
```

Look at the new screenshots yourself:
- Does each change solve its problem?
- Did anything get worse?
- Would the persona notice?

**If worse:** revert that file (`git checkout -- {file}`) and log as "reverted".

**If better:** commit:
```bash
git add -A && git commit -m "glance: round N — {summary}"
```

Close the browser when done with the round:
```bash
playwright-cli close
```

Then loop back to Step 1 from the new baseline — or stop if done.

---

## When to Stop

- All remaining findings are tier 4 → stop
- You're finding the same things again → stop
- The fix needs backend/architecture changes → log it and stop
- You've done 3 rounds with no tier 1-2 findings → stop

Tell the user:
> "Visual wins are done. Deferred: [1-3 bigger items]."

---

## The Journal

Maintain `glance-journal.md` in the project root:

```markdown
# Glance Journal

## Session: YYYY-MM-DD
Persona: {who, doing what}

### Round 1
- [T{N}] {what} → {result: improved/reverted} — {file(s)}
- [T{N}] {what} → {result: improved/reverted} — {file(s)}

### Round 2
- [T{N}] {what} → {result: improved/reverted} — {file(s)}

### Deferred
- {Things too big for /glance}

### Stats
Rounds: {N} | Landed: {N} | Reverted: {N}
```

---

## Why This is Faster Than /eye

| | /eye | /glance |
|---|------|---------|
| Observation | 2-3 sub-agents with browsers | You look at 1-3 screenshots |
| Judgment | Agents return text, you merge | You judge directly from images |
| Prioritization | Dedicated merge phase | Inline — just rank the short list |
| Implementation | Same (parallel agents) | Same (parallel agents) |
| Verification | Same (screenshot + compare) | Same (screenshot + compare) |
| **Agent spawns per round** | **4-6** (observers + implementers) | **1-5** (implementers only) |
| **Browser sessions per round** | **3-5** (each observer + verify) | **1-2** (screenshot + verify) |

The insight: **visual judgment is your native capability**. Delegating it to sub-agents adds latency without adding quality. Sub-agents are valuable for parallel code edits — that's where they stay.

---

## Quality Principles

Speed without quality is just fast damage. These rules keep the bar high:

- **Trust your eye, but verify with a screenshot.** Gut feelings drive the insight; screenshots confirm the fix.
- **One persona, one session.** Don't optimize for hypothetical users.
- **Revert without ego.** If it looks worse, undo it. The checkpoint exists for this.
- **Minimal diffs.** The smallest change that fully solves the problem. No "while I'm here."
- **Stay visual.** The insight comes from looking, not from code analysis. Read code to implement, not to discover.
- **Name what you can't fix.** If something needs architecture, say so and move on. Don't apply band-aids.
