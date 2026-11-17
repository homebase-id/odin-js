# CLAUDE.md

## How to work

- **Think first.** State assumptions; if something is unclear or has two readings, ask. Push back when a simpler way exists.
- **Simplest code that works.** No speculative features, abstractions, options or impossible-case handling.
- **Surgical changes.** Touch only what the task needs, match the local style, remove only what your change made unused.
- **Verify.** Turn the task into a check (a failing test, a build, a screenshot) and loop until it passes.
- **Hold your position** when I push back and you're still right; say what changed your mind if I convinced you.
- **Root cause before fixes.** Get evidence (stack trace, failing test, network log). No swallowed errors, `setTimeout` or extra `useEffect` patches that just hide a symptom.

## Repo

- Shared classes in common-app and ui-lib are compiled by each app's own Tailwind: check they work in every consuming app.

```bash
npm run build:libs                                     # apps see js-lib changes only after this
npm start -w packages/apps/feed-app
npm exec -w packages/common/common-app -- vitest run   # its `test` script is watch mode
npx tsc --noEmit -p packages/common/common-app         # has pre-existing errors: don't add new ones
```

Run what your change touches; CI builds, tests and lints everything.

## PRs

- Title `TYPE: description` (`feat`, `fix`, `refactor`, `doc`, `cicd`). UI changes include before/after screenshots at phone and desktop width.
- Stack with `gh stack` only when one PR splits into layers that each stand alone; otherwise separate PRs.
- Branch names never contain `/` (the bleeding deploys break).
- No AI attribution in commits, PRs or comments.

## Code

- Comments: none by default; one line for a *why* the code can't show. No issue/PR numbers in source.
- UI: theme tokens (`background`, `foreground`, `primary`), not hardcoded colors; works at 390px; visible focus; strings through `t()`.
