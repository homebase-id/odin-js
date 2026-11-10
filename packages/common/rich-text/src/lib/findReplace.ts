export interface TextMatch {
    index: number;
    length: number;
}

const ESCAPE_REGEX = /[.*+?^${}()|[\]\\]/g;

export function escapeRegex(str: string): string {
    ESCAPE_REGEX.lastIndex = 0;
    return str.replace(ESCAPE_REGEX, '\\$&');
}

export function findMatchesInText(
    text: string,
    searchTerm: string,
    caseSensitive: boolean,
    wholeWord: boolean,
): TextMatch[] {
    if (!searchTerm || !text) return [];

    const escaped = escapeRegex(searchTerm);
    const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
    const flags = caseSensitive ? 'g' : 'gi';

    let regex: RegExp;
    try {
        regex = new RegExp(pattern, flags);
    } catch {
        return [];
    }

    const matches: TextMatch[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
        matches.push({ index: match.index, length: match[0].length });
        if (match.index === regex.lastIndex) regex.lastIndex++;
    }

    return matches;
}

export function nextMatchIndex(current: number, total: number): number {
    if (total === 0) return -1;
    return (current + 1) % total;
}

export function prevMatchIndex(current: number, total: number): number {
    if (total === 0) return -1;
    return (current - 1 + total) % total;
}
