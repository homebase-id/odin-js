import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import { findMatchesInText, nextMatchIndex, prevMatchIndex } from './lib/findReplace';

export const searchPluginKey = new PluginKey('searchAndReplace');

interface SearchPluginState {
    searchTerm: string;
    caseSensitive: boolean;
    wholeWord: boolean;
    results: { from: number; to: number }[];
    currentIndex: number;
    decorationSet: DecorationSet;
}

interface SearchMeta {
    type: 'setSearch' | 'next' | 'prev' | 'clear';
    searchTerm?: string;
    caseSensitive?: boolean;
    wholeWord?: boolean;
}

function getTextMapping(node: PMNode, basePos: number): { text: string; positions: number[] } {
    let text = '';
    const positions: number[] = [];

    node.forEach((child, offset) => {
        if (child.isText && child.text) {
            for (let i = 0; i < child.text.length; i++) {
                positions.push(basePos + offset + i);
            }
            text += child.text;
        }
    });

    return { text, positions };
}

function findMatchesInDoc(
    doc: PMNode,
    searchTerm: string,
    caseSensitive: boolean,
    wholeWord: boolean,
): { from: number; to: number }[] {
    if (!searchTerm) return [];

    const results: { from: number; to: number }[] = [];

    doc.descendants((node, pos) => {
        if (node.isTextblock) {
            const { text, positions } = getTextMapping(node, pos + 1);
            if (!text || positions.length === 0) return;

            const matches = findMatchesInText(text, searchTerm, caseSensitive, wholeWord);

            for (const match of matches) {
                const endIdx = match.index + match.length - 1;
                if (match.index < positions.length && endIdx < positions.length) {
                    results.push({
                        from: positions[match.index],
                        to: positions[endIdx] + 1,
                    });
                }
            }
        }
    });

    return results;
}

function createDecorations(
    doc: PMNode,
    results: { from: number; to: number }[],
    currentIndex: number,
): DecorationSet {
    if (results.length === 0) return DecorationSet.empty;

    const decorations = results.map((result, i) =>
        Decoration.inline(result.from, result.to, {
            class: i === currentIndex
                ? 'search-highlight search-highlight-current'
                : 'search-highlight',
        }),
    );

    return DecorationSet.create(doc, decorations);
}

function createEmptyState(): SearchPluginState {
    return {
        searchTerm: '',
        caseSensitive: false,
        wholeWord: false,
        results: [],
        currentIndex: -1,
        decorationSet: DecorationSet.empty,
    };
}

function recalculate(
    doc: PMNode,
    searchTerm: string,
    caseSensitive: boolean,
    wholeWord: boolean,
    prevIndex: number,
): SearchPluginState {
    const results = findMatchesInDoc(doc, searchTerm, caseSensitive, wholeWord);
    const currentIndex = results.length > 0
        ? Math.min(Math.max(prevIndex, 0), results.length - 1)
        : -1;

    return {
        searchTerm,
        caseSensitive,
        wholeWord,
        results,
        currentIndex,
        decorationSet: createDecorations(doc, results, currentIndex),
    };
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        searchAndReplace: {
            openFind: () => ReturnType;
            openReplace: () => ReturnType;
            closeSearch: () => ReturnType;
            updateSearch: (opts: {
                searchTerm: string;
                caseSensitive: boolean;
                wholeWord: boolean;
            }) => ReturnType;
            goToNextMatch: () => ReturnType;
            goToPrevMatch: () => ReturnType;
            replaceCurrentMatch: (replaceTerm: string) => ReturnType;
            replaceAllMatches: (replaceTerm: string) => ReturnType;
        };
    }

    interface Storage {
        searchAndReplace: {
            isOpen: boolean;
            isReplaceOpen: boolean;
        };
    }
}

export const SearchAndReplace = Extension.create({
    name: 'searchAndReplace',

    addStorage() {
        return {
            isOpen: false,
            isReplaceOpen: false,
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: searchPluginKey,
                state: {
                    init(): SearchPluginState {
                        return createEmptyState();
                    },
                    apply(tr: Transaction, oldState: SearchPluginState): SearchPluginState {
                        const meta = tr.getMeta(searchPluginKey) as SearchMeta | undefined;

                        if (meta) {
                            switch (meta.type) {
                                case 'setSearch':
                                    return recalculate(
                                        tr.doc,
                                        meta.searchTerm ?? oldState.searchTerm,
                                        meta.caseSensitive ?? oldState.caseSensitive,
                                        meta.wholeWord ?? oldState.wholeWord,
                                        0,
                                    );
                                case 'next':
                                    if (oldState.results.length === 0) return oldState;
                                    {
                                        const idx = nextMatchIndex(oldState.currentIndex, oldState.results.length);
                                        return {
                                            ...oldState,
                                            currentIndex: idx,
                                            decorationSet: createDecorations(tr.doc, oldState.results, idx),
                                        };
                                    }
                                case 'prev':
                                    if (oldState.results.length === 0) return oldState;
                                    {
                                        const idx = prevMatchIndex(oldState.currentIndex, oldState.results.length);
                                        return {
                                            ...oldState,
                                            currentIndex: idx,
                                            decorationSet: createDecorations(tr.doc, oldState.results, idx),
                                        };
                                    }
                                case 'clear':
                                    return createEmptyState();
                            }
                        }

                        if (tr.docChanged && oldState.searchTerm) {
                            return recalculate(
                                tr.doc,
                                oldState.searchTerm,
                                oldState.caseSensitive,
                                oldState.wholeWord,
                                oldState.currentIndex,
                            );
                        }

                        return oldState;
                    },
                },
                props: {
                    decorations(state) {
                        return searchPluginKey.getState(state)?.decorationSet ?? DecorationSet.empty;
                    },
                },
            }),
        ];
    },

    addCommands() {
        return {
            openFind:
                () =>
                ({ editor }) => {
                    editor.storage.searchAndReplace.isOpen = true;
                    editor.storage.searchAndReplace.isReplaceOpen = false;
                    editor.view.dispatch(editor.state.tr);
                    return true;
                },

            openReplace:
                () =>
                ({ editor }) => {
                    editor.storage.searchAndReplace.isOpen = true;
                    editor.storage.searchAndReplace.isReplaceOpen = true;
                    editor.view.dispatch(editor.state.tr);
                    return true;
                },

            closeSearch:
                () =>
                ({ editor }) => {
                    editor.storage.searchAndReplace.isOpen = false;
                    editor.storage.searchAndReplace.isReplaceOpen = false;
                    editor.view.dispatch(
                        editor.state.tr.setMeta(searchPluginKey, { type: 'clear' } as SearchMeta),
                    );
                    return true;
                },

            updateSearch:
                (opts) =>
                ({ editor }) => {
                    editor.view.dispatch(
                        editor.state.tr.setMeta(searchPluginKey, {
                            type: 'setSearch',
                            searchTerm: opts.searchTerm,
                            caseSensitive: opts.caseSensitive,
                            wholeWord: opts.wholeWord,
                        } as SearchMeta),
                    );
                    return true;
                },

            goToNextMatch:
                () =>
                ({ editor }) => {
                    const pluginState = searchPluginKey.getState(editor.state) as SearchPluginState | undefined;
                    if (!pluginState || pluginState.results.length === 0) return false;

                    editor.view.dispatch(
                        editor.state.tr.setMeta(searchPluginKey, { type: 'next' } as SearchMeta),
                    );

                    const newState = searchPluginKey.getState(editor.state) as SearchPluginState | undefined;
                    if (newState && newState.currentIndex >= 0 && newState.results[newState.currentIndex]) {
                        editor.chain().setTextSelection(newState.results[newState.currentIndex].from).scrollIntoView().run();
                    }

                    return true;
                },

            goToPrevMatch:
                () =>
                ({ editor }) => {
                    const pluginState = searchPluginKey.getState(editor.state) as SearchPluginState | undefined;
                    if (!pluginState || pluginState.results.length === 0) return false;

                    editor.view.dispatch(
                        editor.state.tr.setMeta(searchPluginKey, { type: 'prev' } as SearchMeta),
                    );

                    const newState = searchPluginKey.getState(editor.state) as SearchPluginState | undefined;
                    if (newState && newState.currentIndex >= 0 && newState.results[newState.currentIndex]) {
                        editor.chain().setTextSelection(newState.results[newState.currentIndex].from).scrollIntoView().run();
                    }

                    return true;
                },

            replaceCurrentMatch:
                (replaceTerm) =>
                ({ tr, dispatch, state, commands }) => {
                    const pluginState = searchPluginKey.getState(state) as SearchPluginState | undefined;
                    if (!pluginState || pluginState.currentIndex < 0) return false;

                    const match = pluginState.results[pluginState.currentIndex];
                    if (!match) return false;

                    if (dispatch) {
                        tr.insertText(replaceTerm, match.from, match.to);

                        const newState = recalculate(
                            tr.doc,
                            pluginState.searchTerm,
                            pluginState.caseSensitive,
                            pluginState.wholeWord,
                            pluginState.currentIndex,
                        );
                        const nextMatch = newState.results[newState.currentIndex];
                        if (nextMatch) {
                            commands.setTextSelection(nextMatch.from);
                        }
                        commands.scrollIntoView();
                    }

                    return true;
                },

            replaceAllMatches:
                (replaceTerm) =>
                ({ tr, dispatch, state }) => {
                    const pluginState = searchPluginKey.getState(state) as SearchPluginState | undefined;
                    if (!pluginState || pluginState.results.length === 0) return false;

                    if (dispatch) {
                        const sorted = [...pluginState.results].sort((a, b) => b.from - a.from);
                        for (const { from, to } of sorted) {
                            tr.insertText(replaceTerm, from, to);
                        }
                    }

                    return true;
                },
        };
    },

    addKeyboardShortcuts() {
        return {
            'Mod-f': () => {
                this.editor.commands.openFind();
                return true;
            },
            'Mod-h': () => {
                this.editor.commands.openReplace();
                return true;
            },
            Escape: () => {
                if (this.editor.storage.searchAndReplace.isOpen) {
                    this.editor.commands.closeSearch();
                    return true;
                }
                return false;
            },
        };
    },
});
