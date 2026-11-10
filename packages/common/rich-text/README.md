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
