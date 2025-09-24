/docs_update

You may write docs only.

Goal: update project documentation for this feature/change.

Output:
- Goal: 1–2 sentences in plain language
- Acceptance Criteria: 3–6 bullets (Given/When/Then style)
- Data Flow: short sequence or diagram-like list (before vs after if changed)
- Risks: top 2–3 risks + mitigations
- Rollback Steps: how to disable/revert (flags, migrations, config)
- Observability: what logs/metrics/traces were added and how to check them
- File: /docs/specs/<FEATURE>.md (create if not exists)
- If architecture/design decision: /docs/adr/XXXX-<title>.md (Context/Decision/Consequences)
