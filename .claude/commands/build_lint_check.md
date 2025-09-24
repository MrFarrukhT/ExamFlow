/build_lint_check

You will not write app code.

Goal: verify repo health after all planned steps are complete.

Checks to run:
- TypeScript: tsc --noEmit
- Lint: eslint . (or project config)
- Build: npm run build (or yarn/pnpm equivalent)
- Dependency issues: npm audit --production
- Test smoke: npm test --bail --maxWorkers=2 (quick run only)

Output:
- Pass/Fail per check with command output (summarized)
- Tiny Fixes: minimal diffs if simple errors (types, imports, unused vars)
- Residual Issues: list anything blocking (High/Med/Low severity)
- Verdict: “Repo healthy” or “Fix required before proceed”
