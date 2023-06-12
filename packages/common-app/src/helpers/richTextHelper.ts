import { ReadTimeStats, RichText } from '@youfoundation/js-lib/public';

const urlRegex = new RegExp(/(https?:\/\/[^\s]+)/);

export const getRichTextFromString = (body: string): RichText | undefined => {
  const splitUpCaption = body.split(urlRegex);
  const richText = splitUpCaption
    .map((part) => {
      if (!part || !part.length) return;

      if (urlRegex.test(part)) return { type: 'a', url: part };
      else return { text: part };
    })
    .filter(Boolean) as RichText;

  return richText.some((part) => part.type) ? richText : undefined;
};

const getTextRootsRecursive = (children: RichText): string[] => {
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
