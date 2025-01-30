import { ReadTimeStats } from '@homebase-id/js-lib/public';
import { RichText } from '@homebase-id/js-lib/core';

const urlAndMentionRegex = new RegExp(/(https?:\/\/[^\s]+|(?:^|\s|[\r\n])@[^\s]+)/);

const urlRegex = new RegExp(
  /https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d{1,5})?)(\/[^\s]*)?/
);
const mentionRegex = new RegExp(/(?:^|\s|[\r\n])(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);

export const getRichTextFromString = (body: string): RichText | undefined => {
  const splitUpCaption = body.split(urlAndMentionRegex);
  const richTextBlocks = splitUpCaption
    .map((part) => {
      if (!part || !part.length) return;

      if (urlRegex.test(part)) return { type: 'a', url: part, text: part };
      if (mentionRegex.test(part)) {
        if (part.slice(0, 1) === ' ') {
          return [{ text: part.slice(0, 1) }, { type: 'mention', value: part.slice(2) }];
        }
        return { type: 'mention', value: part.slice(1) };
      } else return { text: part };
    })
    .filter(Boolean);

  const richText = richTextBlocks.flat() as RichText;

  return richText.some((part) => part.type) ? richText : undefined;
};

export const getTextRootsRecursive = (
  children: RichText | string | undefined,
  keepNewLines?: boolean
): string[] => {
  if (!children) return [];
  if (!Array.isArray(children)) return [children as string];

  return children
    .map(
      (child) =>
        [
          child.children
            ? getTextRootsRecursive(child.children as RichText).join(keepNewLines ? '\n' : ' ')
            : undefined,
          (child.text || child.value || undefined) as string,
        ]
          .filter(Boolean)
          .join(' ') || ''
    )
    .filter((child) => child.length);
};

export const getPlainTextFromRichText = (
  message: string | RichText | undefined,
  keepNewLines?: boolean
) => {
  if (!message) return undefined;
  return getTextRootsRecursive(message, keepNewLines).join(keepNewLines ? '\n' : ' ');
};

export const getReadingTime = (body?: RichText | string): ReadTimeStats | undefined => {
  if (!body) return;

  const words =
    typeof body === 'string'
      ? body.split(' ')
      : getTextRootsRecursive(body).flatMap((entry) => entry.split(' '));
  const wordsCount = words.length;

  return {
    words: wordsCount,
    minutes: Math.ceil(wordsCount / 200),
  };
};

export const findMentionedInRichText = (richText: RichText | undefined): string[] => {
  if (!richText) return [];

  const checkNode = (node: Record<string, unknown>): string[] => {
    if (node.type === 'mention' && node.value && typeof node.value === 'string') {
      return [node.value];
    }

    if (node.children && Array.isArray(node.children)) {
      return node.children?.flatMap(checkNode) || [];
    }
    return [];
  };

  return richText.flatMap(checkNode);
};

export const trimRichText = (richText: RichText | undefined): RichText | undefined => {
  if (!richText) return;

  const trimmed: RichText = [];
  const trimNode = (node: Record<string, unknown>): Record<string, unknown> => {
    const newText =
      (node && typeof node.text === 'string' ? node.text?.trim() : undefined) ?? undefined;
    const newValue =
      (node && typeof node.value === 'string' ? node.value?.trim() : undefined) ?? undefined;

    return {
      ...node,
      text: newText,
      value: newValue,
    };
  };

  trimmed.push(trimNode(richText[0]));
  if (richText.length >= 2) {
    trimmed.push(...richText.slice(1, richText.length >= 3 ? -1 : undefined));
    if (richText.length >= 3) trimmed.push(trimNode(richText[richText.length - 1]));
  }

  return trimmed;
};

export const ellipsisAtMaxCharOfRichText = (richText: RichText | undefined, maxChar: number) => {
  if (richText === undefined) return [];

  const recursiveEllipsisAtMaxCharOfRichText = (richText: RichText, maxChar: number) => {
    let charCount = 0;
    const result: RichText = [];

    for (let i = 0; i < richText.length; i++) {
      if (charCount >= maxChar) return [result, charCount] as const;

      const node = { ...richText[i] };
      if ('text' in node && typeof node.text === 'string') {
        if (charCount + node.text.length > maxChar) {
          node.text = node.text.substring(0, maxChar - charCount) + '...';
          result.push(node);
          return [result, charCount + node.text.length] as const;
        }

        charCount +=
          ('text' in node && typeof node.text === 'string' ? node.text?.length : undefined) || 0;
      }

      if ('children' in node && node.children !== undefined && Array.isArray(node.children)) {
        const [newChildren, childrenCharCount] = recursiveEllipsisAtMaxCharOfRichText(
          node.children,
          maxChar - charCount
        );
        charCount += childrenCharCount;
        node.children = newChildren;
      }

      result.push(node);
    }

    return [result, charCount] as const;
  };
  return recursiveEllipsisAtMaxCharOfRichText(richText, maxChar)[0];
};

export const isRichTextEqual = (a: RichText | undefined, b: RichText | undefined) => {
  if (!a && !b) return true;
  if (!a || !b) return false;

  if (a.length !== b.length) return false;
  // check types of each root item
  for (let i = 0; i < a.length; i++) {
    if (a[i].type !== b[i].type) return false;
  }

  if (getPlainTextFromRichText(a) === getPlainTextFromRichText(b)) return true;

  return false;
};

export const isEmptyRichText = (richText: RichText | undefined) => {
  const plainText = getPlainTextFromRichText(richText);
  return !plainText || !plainText?.length || plainText === '';
};
