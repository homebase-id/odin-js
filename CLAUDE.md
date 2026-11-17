# CLAUDE.md

Guidance for Claude Code (and other agents) working in odin-js, the Homebase web apps and libraries.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them; don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked, no abstractions for single-use code, no configurability nobody asked for.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it. Would a senior engineer call it overcomplicated? Then simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

- Don't "improve" adjacent code, comments or formatting, and don't refactor what isn't broken. Match the existing style.
- Remove imports, variables and functions that your change made unused. Mention pre-existing dead code; don't delete it unless asked.
- Every changed line should trace directly to the request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

- "Add validation" → write tests for invalid inputs, then make them pass. "Fix the bug" → a test that reproduces it, then make it pass.
- For multi-step work, state a brief plan: `1. [step] → verify: [check]`.

## Discussions

If I push back and you still think you're right, hold the position and explain why. Don't cave because I disagreed. If a real argument changed your mind, say what changed it.

## Debugging & root cause

Don't ship a workaround that hides a symptom before you know the cause. Get evidence first: a stack trace, a failing test, a network log, a React profiler sample. If you can't capture any, add the logging that will, rather than patching around the symptom.

Symptom patches to avoid:

- `try { … } catch {}` around code that's misbehaving, so the error stops surfacing.
- A `setTimeout`, an extra `useEffect` or a forced re-render that makes a glitch "go away" without explaining why it helped.
- `useMemo`/`useRef` snapshots of a value because "otherwise it loops": fix what changes identity every render.
- Hiding or reverting the feature that exposed the bug while the bug stays.

## Project overview

npm workspaces (root `package.json`):

- `packages/libs/js-lib`: the Homebase client (`@homebase-id/js-lib`: `core`, `public`, `helpers`, …). Published to GitHub Packages by `release-libs.yml` on push to main.
- `packages/libs/ui-lib`: shared UI primitives.
- `packages/common/common-app`: shared app code (feed/post components, the article viewer in `src/richText/`, hooks, providers). Consumed as source, no build step.
- `packages/common/rich-text-editor`: the Slate editor.
- `packages/apps/*`: `owner-app`, `feed-app`, `public-app`, `community-app`, `chat-app`, `mail-app`, `login-app`, `provisioning-app`, `web-drop-app`. Vite + React.

Articles published from Journal carry a Tiptap `bodyDoc` next to the Slate `body` (`js-lib/src/public/posts/ArticleBody/`). `ArticleBody` in common-app shows `bodyDoc` through `ArticleDocRenderer` while it still matches `body`, otherwise the Slate renderer. Its fixtures live in `js-lib/.../ArticleBody/fixtures/tiptap/`.

Tailwind: each app compiles the class names in common-app and ui-lib with its own Tailwind config, so a class in shared code must mean the same thing in every app that compiles it. Check the version of each app that consumes it before using version-specific syntax.

## Commands

```bash
npm i                                   # also runs patch-package (patches/)
npm run build:libs                      # js-lib + ui-lib; apps see js-lib changes only after this
npm start -w packages/apps/feed-app     # dev server (https, dev.dotyou.cloud certs at the repo root)
npm run build -w packages/apps/feed-app
npm exec -w packages/common/common-app -- vitest run   # its `test` script is watch mode
npm run test -w packages/libs/js-lib
npm run lint -w <workspace>
npx tsc --noEmit -p packages/common/common-app # has pre-existing errors: compare counts, don't add new ones
```

Run what your change touches: the workspaces you changed and the apps that consume them. CI (`ci.yml`) runs `npm ci`, `build:libs`, the full build, tests and lint on every PR to main.

Running the apps against a real identity needs odin-core locally; it proxies public-app :3000, owner-app :3001 and feed-app :3002.

## Stacked PRs

GitHub's native stacked PRs, driven by `gh stack` (`gh extension install github/gh-stack`, then `gh stack --help`). Each branch targets the one below it, so each layer is reviewed on its own diff and the stack merges atomically.

Use a stack only when one PR is too big to review in one sitting and splits cleanly into layers (dependency upgrades below, the feature that needs them above). Two independent changes are two PRs, not a stack.

- Bottom layers first. Every layer is correct on its own: main stays green if the layers above never merge.
- If two layers can only be reviewed together, they're one PR.
- CI must be green on every layer; `gh stack rebase` after main moves (a layer that is BEHIND blocks the merge).
- Branch names never contain `/`; the bleeding deploys can't handle it.

## Opening a PR

- Title: `TYPE: description` (`feat`, `fix`, `refactor`, `doc`, `cicd`; see CONTRIBUTING.md).
- UI changes: say what you checked visually (which apps, phone and desktop widths, light and dark) and attach before/after screenshots.
- A bug fix says what proved the root cause.
- No AI attribution in commits, PR bodies or comments.

## Comments

Default to none. Don't restate what the code says, don't narrate how it got here, and don't put issue or PR numbers in source (`git blame` links them). Do write one terse line for a *why* the code can't show: a landmine, an ordering constraint, a workaround for someone else's bug, a deliberate simplification and its limit. Put reasoning in the PR description.

## UI quality

- Use the app's color tokens (`background`, `page-background`, `foreground`, `primary`) and opacity steps, not hardcoded colors, so light and dark both work.
- Works at 390px wide with no horizontal page scroll; wide content (tables, code) scrolls inside its own box.
- Visible keyboard focus, `alt` on meaningful images, labels on icon buttons (`sr-only` text as elsewhere), `prefers-reduced-motion` respected.
- User-facing strings go through `t()`.
