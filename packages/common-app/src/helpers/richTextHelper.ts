import { ReadTimeStats } from '@youfoundation/js-lib/public';
import { RichText } from '@youfoundation/js-lib/core';

const urlAndMentionRegex = new RegExp(/(https?:\/\/[^\s]+|@[^\s]+)/);

const urlRegex = new RegExp(
  /https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d{1,5})?)(\/[^\s]*)?/
);
const mentionRegex = new RegExp(/@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

export const getRichTextFromString = (body: string): RichText | undefined => {
  const splitUpCaption = body.split(urlAndMentionRegex);
  const richText = splitUpCaption
    .map((part) => {
      if (!part || !part.length) return;

      if (urlRegex.test(part)) return { type: 'a', url: part, text: part };
      if (mentionRegex.test(part))
        return { type: 'a', url: `https://${part.slice(1)}`, text: part, odinId: part.slice(1) };
      else return { text: part };
    })
    .filter(Boolean) as RichText;

  return richText.some((part) => part.type) ? richText : undefined;
};

export const getTextRootsRecursive = (children: RichText): string[] => {
  return children
    .map((child) =>
      child.children
        ? getTextRootsRecursive(child.children as RichText).join(' ')
        : (child.text as string)
    )
    .filter((child) => child.length);
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
