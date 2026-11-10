# @homebase-id/rich-text

The Tiptap schema of journal's editor (`journal/src/components/editor`), shared so the feed's
next article editor, its viewer and the Slate converters use one schema. Headless: no React,
no Yjs. Journal can switch to this package later.

## Taken from journal

| Here | Journal |
|---|---|
| `src/extensions.ts` | `plugins/extensions.ts` |
| `src/SearchAndReplaceExtension.ts` | `plugins/SearchAndReplaceExtension.ts` |
| `src/nodes/*` (all but `feedMarks.ts`) | `nodes/*` with the same names |
| `src/lib/imageEdits.ts`, `footnotes.ts`, `findReplace.ts` | `lib/images/`, `lib/editor/`, `lib/search/` |
| `src/lib/linkPreview.ts` | `isPreviewableUrl` from `lib/editor/linkPreview.ts` |

Issue numbers in comments (`#316`, …) are journal's.

## Changed

- No note links (`NoteLink`) and no live blocks; a code block highlights by the first word of its language.
- `y-prosemirror` is read by plugin key (`src/lib/yjsKeys.ts`), so Yjs is not a dependency.
- Added for the feed's Slate articles: `fileKey`/`fileId` on `image`, a `mention` node and a `kbd` mark.

## Slate converters

`src/slate.ts` converts between this schema and the feed's Slate article bodies.

- `slateToTiptap(body)` reads any stored body: the Plate editor's output, the importers'
  (`strong`/`em` wrappers, `figure`, `image{url}`, raw tag names) and plain strings.
- `tiptapToSlate(doc)` writes the reduced copy old clients read from `body`. It uses only the
  types in `OLD_RENDERER_TYPES` and flattens what the old renderer can't show: a table becomes
  one paragraph per row, a callout a quote, math code, footnotes `[n]` and a closing list.

## Harness

`npm test` runs `test/slate.test.ts` on every file in `test/fixtures`:

| Fixtures | Checks |
|---|---|
| `slate/*.json`, bodies as stored | Converts to a valid document; no word, mention or image lost; `editor-*` files round-trip unchanged |
| `tiptap/*.json`, documents the next editor writes | The reduced copy uses only old-renderer types, keeps every word, mention and image, and is stable when re-converted |

Words, mentions and plain text are read with the feed's own helpers
(`common-app/src/helpers/richTextHelper.ts`). To cover a new case, add a fixture.
