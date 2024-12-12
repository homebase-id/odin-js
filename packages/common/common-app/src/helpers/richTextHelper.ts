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

export const getTextRootsRecursive = (children: RichText | string): string[] => {
  if (!Array.isArray(children)) return [children as string];

  return children
    .map(
      (child) =>
        [
          child.children ? getTextRootsRecursive(child.children as RichText).join(' ') : undefined,
          (child.text || child.value || undefined) as string,
        ]
          .filter(Boolean)
          .join(' ') || ''
    )
    .filter((child) => child.length);
};

export const getPlainTextFromRichText = (message: string | RichText) =>
  getTextRootsRecursive(message).join(' ');

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
  const trimNodeRecursive = (node: Record<string, unknown>): Record<string, unknown> => {
    const newText = (typeof node.text === 'string' && node.text?.trim()) || undefined;
    const newValue = (typeof node.value === 'string' && node.value?.trim()) || undefined;

    return {
      ...node,
      text: newText,
      value: newValue,
      children:
        (Array.isArray(node.children) && node.children?.map(trimNodeRecursive)) || undefined,
    };
  };

  trimmed.push(trimNodeRecursive(richText[0]));
  if (richText.length >= 2) {
    trimmed.push(...richText.slice(1, -1));
    if (richText.length >= 3) trimmed.push(trimNodeRecursive(richText[richText.length - 1]));
  }

  return trimmed;
};

export const ellipsisAtMaxCharOfRichText = (richText: RichText | undefined, maxChar: number) => {
  if (richText === undefined) return [];

  let charCount = 0;
  const result: RichText = [];

  for (let i = 0; i < richText.length; i++) {
    const entry = richText[i];
    if ('text' in entry && typeof entry.text === 'string') {
      if (charCount + entry.text.length > maxChar) {
        entry.text = entry.text.substring(0, maxChar - charCount) + '...';
        return result;
      }

      charCount +=
        ('text' in entry && typeof entry.text === 'string' ? entry.text?.length : undefined) || 0;
    }

    if ('children' in entry && entry.children !== undefined && Array.isArray(entry.children)) {
      entry.children = ellipsisAtMaxCharOfRichText(entry.children, maxChar - charCount);
    }

    result.push(entry);
  }

  return result;
};
