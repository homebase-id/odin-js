import { Lexer, Marked, Token, Tokens } from 'marked';
import { RichText } from '@homebase-id/js-lib/core';
import { getRichTextFromString } from './richTextHelper';

type Node = Record<string, unknown>;
type Marks = { bold?: true; italic?: true; strikethrough?: true };

// Bare URLs and mentions are found by the caption regexes; link definitions stay literal text
const md = new Marked({ gfm: true, tokenizer: { url: () => undefined, def: () => undefined } });

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

const leaves = (text: string, marks: Marks): Node[] =>
  ((getRichTextFromString(text) as Node[] | undefined) ?? [{ text }]).map((part) =>
    part.type ? part : { ...part, ...marks }
  );

const inline = (tokens: Token[] = [], marks: Marks = {}): Node[] =>
  tokens.flatMap((token): Node[] => {
    switch (token.type) {
      case 'strong':
        return inline(token.tokens, { ...marks, bold: true });
      case 'em':
        return inline(token.tokens, { ...marks, italic: true });
      case 'del':
        return inline(token.tokens, { ...marks, strikethrough: true });
      case 'codespan':
        return [{ text: token.text, code: true, ...marks }];
      case 'br':
        return [{ text: '\n', ...marks }];
      case 'escape':
        return [{ text: token.text, ...marks }];
      case 'text':
        return token.tokens ? inline(token.tokens, marks) : leaves(token.text, marks);
      case 'link':
        return isSafeUrl(token.href)
          ? [{ type: 'a', url: token.href, children: inline(token.tokens, marks) }]
          : leaves(token.raw, marks);
      default:
        return leaves(token.raw, marks);
    }
  });

const blocks = (tokens: Token[]): Node[] =>
  tokens.map(toSupported).flatMap((token): Node[] => {
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
            children: token.items.map((item: Tokens.ListItem) => ({
              type: 'li',
              children: blocks(item.tokens),
            })),
          },
        ];
      case 'blockquote':
        return [{ type: 'blockquote', children: blocks(token.tokens ?? []) }];
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
