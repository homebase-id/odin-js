/**
 * Schema-only image extension: node attrs for pending uploads, float alignment
 * and drag-resized width. No node view — the editor layers one on top (see
 * editorExtensions.ts) so headless code (the agent edit engine, #316) can
 * build the schema without pulling in React.
 */
import Image from "@tiptap/extension-image";
import { editDataAttrs, parseEditData, readEdits } from "../lib/imageEdits";
import { ALIGN_STYLE, type ImageAlign } from "./imageLayout";

export const ImageSchema = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // Feed images are payloads of the post (`pst_rtei<n>`), not URLs: `fileKey` names the
      // payload and `fileId` the file when it is not the post itself. The viewer resolves `src`.
      fileKey: {
        default: null,
        parseHTML: element => element.getAttribute("data-file-key"),
        renderHTML: attributes => (attributes.fileKey ? { "data-file-key": attributes.fileKey } : {}),
      },
      fileId: {
        default: null,
        parseHTML: element => element.getAttribute("data-file-id"),
        renderHTML: attributes => (attributes.fileId ? { "data-file-id": attributes.fileId } : {}),
      },
      "data-pending-id": {
        default: null,
        parseHTML: element => element.getAttribute("data-pending-id"),
        renderHTML: attributes => {
          if (!attributes["data-pending-id"]) return {};
          return { "data-pending-id": attributes["data-pending-id"] };
        },
      },
      // Float alignment, set from the toolbar that appears on a selected
      // image. Distinct from the paragraph's TextAlign, which only shifts
      // the image within its line — a float lets the text wrap around it.
      align: {
        default: null,
        parseHTML: element => element.getAttribute("data-align"),
        renderHTML: attributes => {
          const css = ALIGN_STYLE[attributes.align as ImageAlign];
          if (!css) return {};
          return {
            "data-align": attributes.align,
            style: Object.entries(css).map(([k, v]) => `${k}: ${v}`).join("; "),
          };
        },
      },
      // Rendered width in px, set by dragging one of the image's corner
      // handles. Lives on the node, so it persists in the Yjs doc like any
      // other attr. No height: leaving it auto keeps the aspect ratio.
      // Caption under the image (#583). null = show the alt text; "" = hidden;
      // anything else replaces the alt text. A plain string attr, not a figure
      // node, so the node stays inline and existing notes need no migration.
      caption: {
        default: null,
        parseHTML: element => element.getAttribute("data-caption"),
        renderHTML: attributes => {
          if (attributes.caption === null || attributes.caption === undefined) return {};
          return { "data-caption": attributes.caption };
        },
      },
      // Non-destructive crop, rotate and flip (#584), applied at display time;
      // null = unedited. See src/lib/images/imageEdits.ts.
      crop: {
        default: null,
        parseHTML: element => parseEditData(name => element.getAttribute(name)).crop,
        renderHTML: () => ({}),
      },
      rotate: {
        default: null,
        parseHTML: element => parseEditData(name => element.getAttribute(name)).rotate || null,
        renderHTML: () => ({}),
      },
      flipH: {
        default: null,
        parseHTML: element => parseEditData(name => element.getAttribute(name)).flipH || null,
        renderHTML: () => ({}),
      },
      flipV: {
        default: null,
        parseHTML: element => parseEditData(name => element.getAttribute(name)).flipV || null,
        // All four render as one set of data attributes.
        renderHTML: attributes => Object.fromEntries(editDataAttrs(readEdits(attributes))),
      },
      width: {
        default: null,
        parseHTML: element => {
          const w = parseInt(element.style.width || element.getAttribute("width") || "", 10);
          return Number.isFinite(w) ? w : null;
        },
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return { style: `width: ${attributes.width}px` };
        },
      },
    };
  },
}).configure({
  inline: true,
  allowBase64: true,
});
