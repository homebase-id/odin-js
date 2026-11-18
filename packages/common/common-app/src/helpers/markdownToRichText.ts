import { Lexer, Marked, Token, Tokens } from 'marked';
import { RichText } from '@homebase-id/js-lib/core';
import { getRichTextFromString } from './richTextHelper';

type Node = Record<string, unknown>;
type Marks = { bold?: true; italic?: true; strikethrough?: true };

// Bare URLs and mentions are found by the caption regexes; link definitions stay literal text
const md = new Marked({
  gfm: true,
  tokenizer: {
    url: (src) => {
      const url = src.match(/^https?:\/\/[^\s<]+/)?.[0];
      return url ? ({ type: 'text', raw: url, text: url } as unknown as Tokens.Link) : undefined;
    },
    del: (src) => (src.startsWith('~~') ? false : undefined),
    def: () => undefined,
  },
});

const isSafeUrl = (url: string) => /^(https?:|mailto:)/i.test(url.trim());

const literal = (raw: string, inline = false): Tokens.Paragraph => {
  const text = raw.replace(/\n+$/, '');
  const tokens: Token[] = inline
    ? Lexer.lexInline(text, md.defaults)
    : [{ type: 'text', raw: text, text } as Tokens.Text];
  return { type: 'paragraph', raw, text, tokens };
};

// Unsupported blocks, setext headings and lists not starting at 1 (`2024. What a year`) stay text
const toSupported = (token: Token): Token => {
  switch (token.type) {
    case 'heading':
      return /^ {0,3}#/.test(token.raw) ? token : literal(token.raw, true);
    case 'list':
      return token.ordered && token.start !== 1 ? literal(token.raw, true) : token;
    case 'code':
      return token.codeBlockStyle === 'indented' ? literal(token.raw) : token;
    case 'paragraph':
    case 'text':
    case 'space':
    case 'hr':
    case 'blockquote':
      return token;
    default:
      return literal(token.raw);
  }
};

const isPlain = (token: Token) =>
  token.type === 'space' ||
  (token.type === 'paragraph' &&
    !!token.tokens?.every((inline) => ['text', 'br', 'image', 'html'].includes(inline.type)));

const leaves = (text: string, marks: Marks, inLink: boolean): Node[] =>
  ((!inLink && (getRichTextFromString(text) as Node[] | undefined)) || [{ text }]).map((part) =>
    part.type ? part : { ...part, ...marks }
  );

const inline = (tokens: Token[] = [], marks: Marks = {}, inLink = false): Node[] =>
  tokens.flatMap((token): Node[] => {
    switch (token.type) {
      case 'strong':
        return inline(token.tokens, { ...marks, bold: true }, inLink);
      case 'em':
        return inline(token.tokens, { ...marks, italic: true }, inLink);
      case 'del':
        return inline(token.tokens, { ...marks, strikethrough: true }, inLink);
      case 'codespan':
        return [{ text: token.text, code: true, ...marks }];
      case 'br':
        return [{ text: '\n', ...marks }];
      case 'escape':
        return [{ text: token.text, ...marks }];
      case 'text':
        return token.tokens
          ? inline(token.tokens, marks, inLink)
          : leaves(token.text, marks, inLink);
      case 'link':
        return isSafeUrl(token.href)
          ? [{ type: 'a', url: token.href, children: inline(token.tokens, marks, true) }]
          : leaves(token.raw, marks, inLink);
      default:
        return leaves(token.raw, marks, inLink);
    }
  });

const blocks = (tokens: Token[]): Node[] =>
  tokens.flatMap((token): Node[] => {
    switch (token.type) {
      case 'space':
        return [];
      case 'paragraph':
        return [{ type: 'p', children: inline(token.tokens) }];
      case 'text':
        return inline(token.tokens);
      case 'heading':
        return [{ type: `h${Math.min(token.depth, 3)}`, children: inline(token.tokens) }];
      case 'list':
        return [
          {
            type: token.ordered ? 'ol' : 'ul',
            children: token.items.map((item: Tokens.ListItem) => {
              const box = item.task && item.raw.match(/\[[ xX]\] +/)?.[0];
              if (box)
                (item.tokens[0] as Tokens.Text)?.tokens?.unshift({
                  type: 'text',
                  raw: box,
                  text: box,
                });
              return { type: 'li', children: blocks(item.tokens.map(toSupported)) };
            }),
          },
        ];
      case 'blockquote':
        return [{ type: 'blockquote', children: blocks((token.tokens ?? []).map(toSupported)) }];
      case 'code':
        return [
          {
            type: 'code_block',
            children: token.text
              .split('\n')
              .map((line: string) => ({ type: 'code_line', children: [{ text: line }] })),
          },
        ];
      case 'hr':
        return [{ type: 'hr', children: [{ text: '' }] }];
      default:
        return [];
    }
  });

export const markdownToRichText = (caption: string): RichText | undefined => {
  const tokens = md.lexer(caption).map(toSupported);
  if (tokens.every(isPlain)) return getRichTextFromString(caption);

  return blocks(tokens) as RichText;
};

// Before Markdown, captions with a link or mention got the flat tree of getRichTextFromString
export const spilledCaptionRichText = (caption: string, tree?: RichText): RichText | undefined =>
  tree?.some((node) => node.type && node.type !== 'a' && node.type !== 'mention')
    ? tree
    : markdownToRichText(caption);
