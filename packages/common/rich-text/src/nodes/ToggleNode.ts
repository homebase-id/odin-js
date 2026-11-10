/**
 * Toggle (collapsible) block (#159) — schema only. The React node view
 * (ToggleNodeView) is layered on in editorExtensions.ts so headless code keeps
 * a React-free schema. Open/closed is view-local state and never stored.
 */
import { Node, decodeHtmlEntities, getTextBetween, getTextSerializersFromSchema, mergeAttributes } from '@tiptap/core';
import { inListItem, parseMarkdownBody } from './markdownParse';

const isSummary = (n: ChildNode) => n.nodeName === 'SUMMARY';

// What fragmentToMarkdown emits before the body of a toggle.
const TOGGLE_MARKDOWN_OPEN = /^<details>\n<summary>(.*)<\/summary>\n\n/;

export const Toggle = Node.create({
  name: 'toggle',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      summary: {
        default: '',
        parseHTML: (el) =>
          el.getAttribute('data-summary') ?? Array.from(el.childNodes).find(isSummary)?.textContent?.trim() ?? '',
        renderHTML: (attrs) => ({ 'data-summary': attrs.summary }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div[data-type="toggle"]' },
      {
        tag: 'details',
        // The <summary> is the title attribute, not body content.
        contentElement: (el) => {
          const body = el.ownerDocument.createElement('div');
          el.childNodes.forEach((child) => {
            if (!isSummary(child)) body.appendChild(child.cloneNode(true));
          });
          return body;
        },
      },
    ];
  },

  // Markdown -> toggle (#392). Only the agent edit engine parses markdown.
  markdownTokenizer: {
    name: 'toggle',
    level: 'block',
    // Line where the next candidate starts, so marked ends a paragraph before it.
    start: (src) => {
      const at = src.indexOf('\n<details>\n<summary>');
      return at < 0 ? -1 : at + 1;
    },
    tokenize(src, tokens, lexer) {
      const open = TOGGLE_MARKDOWN_OPEN.exec(src);
      if (!open || inListItem(tokens)) return undefined;
      // Toggles nest, so count <details> lines to find the close of this one.
      const tag = /^<(\/?)details>$/gm;
      let depth = 0;
      let close = tag.exec(src);
      while (close) {
        depth += close[1] ? -1 : 1;
        if (depth === 0) break;
        close = tag.exec(src);
      }
      if (!close) return undefined;
      const body = src.slice(open[0].length, close.index);
      if (!body.endsWith('\n\n')) return undefined;
      return {
        type: 'toggle',
        raw: src.slice(0, tag.lastIndex),
        summary: decodeHtmlEntities(open[1]),
        tokens: lexer.blockTokens(body.slice(0, -2)),
      };
    },
  },

  parseMarkdown: (token, helpers) =>
    helpers.createNode('toggle', { summary: token.summary }, parseMarkdownBody(token.tokens, helpers)),

  // editor.getText() (live note-list preview + search index) would otherwise
  // skip the title, since it's an attribute.
  renderText({ node }) {
    const body = getTextBetween(node, { from: 0, to: node.content.size }, {
      textSerializers: getTextSerializersFromSchema(node.type.schema),
    });
    return [node.attrs.summary, body].filter(Boolean).join('\n\n');
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'toggle' }), 0];
  },
});
