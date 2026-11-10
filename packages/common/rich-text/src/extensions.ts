/**
 * Tiptap Extensions Configuration
 * 
 * This file contains all Tiptap extension configurations.
 * Add, remove, or modify extensions here to customize the editor.
 */

import { Extension, type AnyExtension, type RawCommands, type CommandProps } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state';
import type { DecorationSet } from '@tiptap/pm/view';
import { Fragment, Slice, type Node as PMNode, type Schema } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Underline from '@tiptap/extension-underline';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextAlign from '@tiptap/extension-text-align';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';

import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Mathematics } from '@tiptap/extension-mathematics';
import { createLowlight } from 'lowlight';
import { SearchAndReplace } from './SearchAndReplaceExtension';
import { ImageSchema } from './nodes/imageSchema';
import { LinkPreview } from './nodes/LinkPreviewNode';
import { Toggle } from './nodes/ToggleNode';
import { Callout } from './nodes/CalloutNode';
import { Gallery } from './nodes/GalleryNode';
import { Footnote, FootnoteReference, Footnotes } from './nodes/FootnoteNodes';
import { FeedMention, Kbd } from './nodes/feedMarks';

// Lowlight for code syntax highlighting. Its grammars load with the first code block (#673).
const lowlight = createLowlight();

// GFM has no headerless table, so an all-empty header line means "no header row" (#446).
const HeaderlessAwareTable = Table.extend({
    parseMarkdown(token, helpers) {
        const header = token.header as { text?: string }[] | undefined;
        const emptyHeader = !!header && header.every((cell) => !cell.text?.trim());
        return this.parent!(emptyHeader ? { ...token, header: undefined } : token, helpers);
    },
});
// The `language` attribute is a fence's whole info string (```html id=k3f9 in journal):
// highlight by its first word, the language.
const codeLanguage = (info: string) => info.trim().split(/\s+/)[0] ?? '';
const infoStringLowlight = {
    ...lowlight,
    registered: (info: string) => lowlight.registered(codeLanguage(info)),
    highlight: (info: string, value: string) => lowlight.highlight(codeLanguage(info), value),
};

let grammars: Promise<void> | undefined;
/** Registers highlight.js's common grammars, fetched once on first use. */
function loadGrammars(): Promise<void> {
    grammars ??= import('./lowlightGrammars').then(
        ({ common }) => {
            lowlight.register(common);
            // A `react` live block's code is JSX, which the javascript grammar highlights (#426).
            lowlight.registerAlias({ javascript: ['react'] });
        },
        (error) => {
            grammars = undefined; // the next code block tries again
            throw error;
        },
    );
    return grammars;
}

/** True when `doc` has a code block, which is when the grammars are worth fetching. */
export function docHasCodeBlock(doc: PMNode): boolean {
    let found = false;
    doc.descendants((node) => {
        if (node.type.name === 'codeBlock') found = true;
        return !found;
    });
    return found;
}

const grammarsLoaded = new PluginKey('grammarsLoaded');

/**
 * CodeBlockLowlight with its grammars fetched on demand (#673): once a note has a code
 * block they load, then a transaction that only carries a meta flag redraws the
 * highlights. It changes no doc, so it writes no Yjs update and leaves the note saved.
 * Until then lowlight knows no language and code shows as plain text.
 */
export const CodeBlockHighlight = CodeBlockLowlight.extend({
    addProseMirrorPlugins() {
        const plugins = this.parent?.() ?? [];
        // CodeBlockLowlight adds its decoration plugin last; it redraws only on a doc change.
        const highlight = (plugins.pop() as Plugin<DecorationSet>).spec.state!;
        const plugin: Plugin<DecorationSet> = new Plugin({
            key: new PluginKey('codeHighlight'),
            state: {
                init: highlight.init,
                apply: (tr, value, oldState, newState) =>
                    tr.getMeta(grammarsLoaded) ? highlight.init({}, newState) : highlight.apply(tr, value, oldState, newState),
            },
            props: { decorations: (state) => plugin.getState(state) },
            view(view) {
                let waiting = false;
                const loadIfNeeded = () => {
                    if (waiting || lowlight.listLanguages().length > 0 || !docHasCodeBlock(view.state.doc)) return;
                    waiting = true;
                    loadGrammars().then(
                        () => { if (!view.isDestroyed) view.dispatch(view.state.tr.setMeta(grammarsLoaded, true)); },
                        () => { waiting = false; },
                    );
                };
                loadIfNeeded();
                return { update: (_, prevState) => { if (view.state.doc !== prevState.doc) loadIfNeeded(); } };
            },
        });
        return [...plugins, plugin];
    },
});

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        duplicateBlock: {
            duplicateBlock: () => ReturnType;
        };
    }
}

const DuplicateBlock = Extension.create({
    name: 'duplicateBlock',
    addCommands() {
        return {
            duplicateBlock: () => ({ state, dispatch }: CommandProps) => {
                const { $from } = state.selection;
                const pos = $from.before($from.depth);
                const end = $from.after($from.depth);
                const node = state.doc.nodeAt(pos);
                if (!node) return false;
                if (dispatch) dispatch(state.tr.insert(end, node.copy(node.content)));
                return true;
            },
        } as Partial<RawCommands>;
    },
    addKeyboardShortcuts() {
        return {
            'Mod-Shift-d': () => this.editor.commands.duplicateBlock(),
        };
    },
});

const IndentExtension = Extension.create({
    name: 'indent',
    addGlobalAttributes() {
        return [{
            types: ['paragraph', 'heading'],
            attributes: {
                indent: {
                    default: 0,
                    parseHTML: element => parseInt(element.getAttribute('data-indent') || '0', 10),
                    renderHTML: attributes => {
                        if (!attributes.indent) return {};
                        return {
                            'data-indent': attributes.indent,
                            style: `padding-left: ${attributes.indent * 2}rem`,
                        };
                    },
                },
            },
        }];
    },
});

/**
 * Deletes an empty top-level textblock at the very START of the document when
 * another block follows it. StarterKit's Backspace (joinBackward) is a no-op
 * there — nothing precedes the block to merge into — so a stray blank line above
 * a list, horizontal rule, or image otherwise can't be removed. Pure command so
 * it's unit-testable at the ProseMirror state level.
 */
export function deleteEmptyLeadingBlock(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
    const { $from, empty } = state.selection;
    if (!empty) return false;
    if ($from.depth !== 1 || !$from.parent.isTextblock) return false; // top-level textblock only
    if ($from.parent.content.size > 0) return false;                  // must be empty
    if ($from.before() !== 0) return false;                           // must be the first block
    if (state.doc.childCount < 2) return false;                       // keep the last block
    if (dispatch) dispatch(state.tr.delete(0, $from.after()));
    return true;
}

const DeleteEmptyLeadingBlock = Extension.create({
    name: 'deleteEmptyLeadingBlock',
    addKeyboardShortcuts() {
        return {
            Backspace: () =>
                this.editor.commands.command(({ state, dispatch }) => deleteEmptyLeadingBlock(state, dispatch)),
        };
    },
});

/**
 * Select All inside a code block (live blocks included) selects just its code.
 * Returns false once the whole code is selected, so a second Mod-a selects the note.
 */
export function selectCodeBlockContent(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
    const { $from, $to } = state.selection;
    if ($from.parent.type.name !== 'codeBlock' || !$from.sameParent($to)) return false;
    const from = $from.start();
    const to = $from.end();
    if (state.selection.from === from && state.selection.to === to) return false;
    if (dispatch) dispatch(state.tr.setSelection(TextSelection.create(state.doc, from, to)));
    return true;
}

const CodeBlockSelectAll = Extension.create({
    name: 'codeBlockSelectAll',
    addKeyboardShortcuts() {
        return {
            'Mod-a': () => this.editor.commands.command(({ state, dispatch }) => selectCodeBlockContent(state, dispatch)),
        };
    },
});

const ClearFormattingShortcut = Extension.create({
    name: 'clearFormatting',
    addKeyboardShortcuts() {
        return {
            'Mod-\\': () => this.editor.chain().clearNodes().unsetAllMarks().run(),
        };
    },
});

const CustomTextAlign = TextAlign.extend({
    addKeyboardShortcuts() {
        return {
            'Mod-Shift-l': () => this.editor.commands.setTextAlign('left'),
            'Mod-Shift-e': () => this.editor.commands.setTextAlign('center'),
            'Mod-Shift-r': () => this.editor.commands.setTextAlign('right'),
            'Mod-Shift-j': () => this.editor.commands.setTextAlign('justify'),
        };
    },
});

function fragmentHasHardBreak(frag: Fragment): boolean {
    let found = false;
    frag.forEach(child => { if (child.type.name === 'hardBreak') found = true; });
    return found;
}

// Split an inline fragment into nodes of `type`, breaking at each hardBreak.
function splitAtHardBreaks(frag: Fragment, type: PMNode['type'], attrs?: PMNode['attrs'], marks?: PMNode['marks']): PMNode[] {
    const out: PMNode[] = [];
    let buffer: PMNode[] = [];
    const flush = () => { out.push(type.create(attrs, buffer.length ? Fragment.fromArray(buffer) : null, marks)); buffer = []; };
    frag.forEach(child => { if (child.type.name === 'hardBreak') flush(); else buffer.push(child); });
    flush();
    return out;
}

function splitBlockFragment(frag: Fragment): Fragment {
    const out: PMNode[] = [];
    frag.forEach(node => {
        if (node.isTextblock && fragmentHasHardBreak(node.content)) {
            out.push(...splitAtHardBreaks(node.content, node.type, node.attrs, node.marks));
        } else if (!node.isText && node.content.size > 0) {
            out.push(node.copy(splitBlockFragment(node.content)));
        } else {
            out.push(node);
        }
    });
    return Fragment.fromArray(out);
}

/**
 * Multi-line content pasted from the web (YouTube comments, Notion, chat apps, …)
 * arrives as a single block whose lines are joined by <br> hard-breaks. Block-level
 * formatting (headings, lists) then applies to the WHOLE block — selecting one line
 * and pressing "Heading 2" converts every line, and toggling a list collapses
 * everything into one un-exitable list item. Splitting those hard-breaks into real
 * paragraphs on paste makes each line independently formattable. Only runs on paste,
 * so soft breaks typed with Shift+Enter inside the editor are left untouched, and
 * code-block pastes (plain text, no hardBreak nodes) pass through unchanged.
 */
export function splitHardBreaksSlice(slice: Slice, schema: Schema): Slice {
    const first = slice.content.firstChild;
    if (!first) return slice;
    if (first.isInline) {
        if (!fragmentHasHardBreak(slice.content)) return slice;
        const paragraphs = splitAtHardBreaks(slice.content, schema.nodes.paragraph);
        // openStart/End = 1 so the first/last lines merge into the surrounding
        // block when pasting into the middle of an existing paragraph.
        return new Slice(Fragment.fromArray(paragraphs), 1, 1);
    }
    return new Slice(splitBlockFragment(slice.content), slice.openStart, slice.openEnd);
}

const SplitHardBreaksOnPaste = Extension.create({
    name: 'splitHardBreaksOnPaste',
    addProseMirrorPlugins() {
        const editor = this.editor;
        return [
            new Plugin({
                key: new PluginKey('splitHardBreaksOnPaste'),
                props: {
                    transformPasted: slice => splitHardBreaksSlice(slice, editor.schema),
                },
            }),
        ];
    },
});

/**
 * Pasted plain text that should become a code block: one whole fenced block
 * (```lang … ```), or bare markup that starts with a tag and ends with one
 * (`svg` when the root is `<svg>`, otherwise `html`). Null for anything else.
 * A fence's `language` is its whole info string, as a markdown import keeps it,
 * so an id or `wide` in it stays with the block (#557).
 */
export function codeBlockFromPaste(text: string): { language: string | null; code: string } | null {
    const trimmed = text.replace(/\r\n?/g, '\n').trim();
    const fence = trimmed.match(/^```([^\n]*)\n([\s\S]*?)\n?```$/);
    // A fence line inside the body means several blocks were pasted; leave those alone.
    if (fence) return /^```/m.test(fence[2]) ? null : { language: fence[1].trim() || null, code: fence[2] };
    // Lower-case tag names only, so pasted JSX (<Component>) stays text.
    if (/^<(!doctype html|[a-z][\w-]*)[\s>]/i.test(trimmed) && !/^<[A-Z]/.test(trimmed) && /<\/[a-z][\w-]*>$/.test(trimmed)) {
        return { language: /^<svg[\s>]/.test(trimmed) ? 'svg' : 'html', code: trimmed };
    }
    return null;
}

/**
 * Pasting a fenced block or bare markup into an empty paragraph makes a code
 * block of it, so an ```html / ```mermaid / <div>… paste previews as a live block
 * instead of landing as literal text.
 */
const PasteAsCodeBlock = Extension.create({
    name: 'pasteAsCodeBlock',
    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('pasteAsCodeBlock'),
                props: {
                    handlePaste(view, event) {
                        const data = event.clipboardData;
                        // VS Code pastes are handled by the code block extension, which knows the language.
                        if (!data || data.types.includes('vscode-editor-data')) return false;
                        const { $from, empty } = view.state.selection;
                        const codeBlock = view.state.schema.nodes.codeBlock;
                        if (!empty || $from.parent.type.name !== 'paragraph' || $from.parent.content.size > 0) return false;
                        if (!$from.node(-1).canReplaceWith($from.index(-1), $from.indexAfter(-1), codeBlock)) return false;
                        const block = codeBlockFromPaste(data.getData('text/plain'));
                        if (!block) return false;
                        const node = codeBlock.create(
                            { language: block.language },
                            block.code ? view.state.schema.text(block.code) : undefined,
                        );
                        view.dispatch(view.state.tr.replaceRangeWith($from.before(), $from.after(), node));
                        return true;
                    },
                },
            }),
        ];
    },
});

/**
 * Type for extension configuration options
 */
export interface ExtensionOptions {
    placeholder?: string;
    linkClass?: string;
    /** Image node; defaults to the headless ImageSchema (the editor passes one with a React node view). */
    image?: typeof ImageSchema;
    /** Link preview card; defaults to the headless LinkPreview (the editor passes one with a React node view). */
    linkPreview?: typeof LinkPreview;
    /** Toggle node; defaults to the headless Toggle (the editor passes one with a React node view). */
    toggle?: typeof Toggle;
    /** Callout node; defaults to the headless Callout (the editor passes one with a React node view). */
    callout?: typeof Callout;
    /** Mention node; defaults to the headless FeedMention (the editor passes one with its suggestion popup). */
    mention?: AnyExtension;
    /** UI-only extensions that add no schema (e.g. the emoji popup), placed after Mathematics. */
    uiExtensions?: AnyExtension[];
}

/**
 * Every extension that contributes a node or mark to the editor schema, plus
 * editor behaviour. With no options it is headless (no React), so the editor,
 * the viewer and the Slate converters share one schema and can't drift.
 */
export function createBaseExtensions(options?: ExtensionOptions) {
    return [
        StarterKit.configure({
            codeBlock: false,
            undoRedo: false,
            link: false,
            underline: false,
            // The footnotes section stays last (#518).
            trailingNode: { notAfter: ['footnotes'] },
        }),

        Placeholder.configure({
            placeholder: options?.placeholder ?? 'Start writing...',
            emptyEditorClass: 'is-editor-empty',
        }),

        Link.configure({
            openOnClick: true,
            autolink: true,
            linkOnPaste: true,
            HTMLAttributes: {
                class: options?.linkClass ?? 'text-blue-500 underline cursor-pointer',
                target: '_blank',
                rel: 'noopener noreferrer',
            },
        }),

        TaskList,

        TaskItem.configure({
            nested: true,
        }),

        options?.image ?? ImageSchema,
        Gallery,

        CodeBlockHighlight.configure({
            lowlight: infoStringLowlight,
        }),

        HeaderlessAwareTable.configure({
            resizable: true,
            lastColumnResizable: true,
        }),

        TableRow,
        TableCell,
        TableHeader,

        Mathematics,
        ...(options?.uiExtensions ?? []),

        Underline,
        Subscript,
        Superscript,
        CustomTextAlign.configure({
            types: ['heading', 'paragraph'],
        }),
        ClearFormattingShortcut,
        CodeBlockSelectAll,
        DuplicateBlock,
        IndentExtension,
        DeleteEmptyLeadingBlock,
        PasteAsCodeBlock,
        SplitHardBreaksOnPaste,
        SearchAndReplace,
        options?.linkPreview ?? LinkPreview,
        options?.toggle ?? Toggle,
        options?.callout ?? Callout,
        FootnoteReference,
        Footnotes,
        Footnote,
        Kbd,
        options?.mention ?? FeedMention,
    ];
}
