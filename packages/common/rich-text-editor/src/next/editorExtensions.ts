/**
 * The next article editor's extensions: the shared schema (createBaseExtensions) with React node
 * views, the slash menu, mention suggestions, image files and undo, the way journal's
 * editorExtensions.ts layers its editor onto the headless schema.
 */
import { Extension, type Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { ReactNodeViewRenderer } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import { UndoRedo } from '@tiptap/extensions';
import {
  Callout,
  createBaseExtensions,
  FeedMention,
  ImageSchema,
  LinkPreview,
  Toggle,
} from '@homebase-id/rich-text';
import { CodeBlockHighlight } from '@homebase-id/rich-text/src/extensions';
import { ImageNodeView } from './nodes/ImageNodeView';
import { CalloutNodeView } from './nodes/CalloutNodeView';
import { ToggleNodeView } from './nodes/ToggleNodeView';
import { LinkPreviewNodeView } from './nodes/LinkPreviewNodeView';
import { CodeBlockNodeView } from './nodes/CodeBlockNodeView';
import { filterSlashItems, type SlashItem } from './slashItems';
import { MentionList, SlashList, type MentionItem } from './suggestionLists';
import { suggestionPopup } from './suggestionPopup';
import { ALLOWED_IMAGE_TYPES } from './imageIngest';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageFiles: {
      /** Processes the image files and inserts them at `pos`, or at the selection. */
      insertImageFiles: (files: File[], pos?: number) => ReturnType;
      /** The same, as one gallery (a single file stays a plain image). */
      insertImageGallery: (files: File[]) => ReturnType;
    };
  }
}

const imageFilesOf = (list?: FileList | null) =>
  Array.from(list ?? []).filter((file) => ALLOWED_IMAGE_TYPES.includes(file.type));

/** Image files dropped, pasted or picked go to `insert`, which adds them to the article. */
type InsertImages = (editor: Editor, files: File[], pos?: number, gallery?: boolean) => void;

const ImageFiles = Extension.create<{ insert: InsertImages }>({
  name: 'imageFiles',
  addOptions: () => ({ insert: () => undefined }),
  addCommands() {
    return {
      insertImageFiles: (files, pos) => () => {
        this.options.insert(this.editor, files, pos);
        return true;
      },
      insertImageGallery: (files) => () => {
        this.options.insert(this.editor, files, undefined, true);
        return true;
      },
    };
  },
  addProseMirrorPlugins() {
    const { editor, options } = this;
    return [
      new Plugin({
        key: new PluginKey('imageFiles'),
        props: {
          handlePaste: (_view, event) => {
            const files = imageFilesOf(event.clipboardData?.files);
            if (!files.length) return false;
            options.insert(editor, files);
            return true;
          },
          handleDrop: (view, event, _slice, moved) => {
            const files = moved ? [] : imageFilesOf(event.dataTransfer?.files);
            if (!files.length) return false;
            event.preventDefault();
            const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
            options.insert(editor, files, pos);
            return true;
          },
        },
      }),
    ];
  },
});

const SlashCommands = Extension.create({
  name: 'slashCommands',
  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        // Its own key: the default one is the mention suggestion's
        pluginKey: new PluginKey('slashCommands'),
        char: '/',
        items: ({ query }) => filterSlashItems(query),
        command: ({ editor, range, props }) => props.run({ editor, range }),
        render: suggestionPopup(SlashList),
      }),
    ];
  },
});

const ImageWithView = ImageSchema.extend({
  addNodeView: () => ReactNodeViewRenderer(ImageNodeView),
});
const CalloutWithView = Callout.extend({
  addNodeView: () => ReactNodeViewRenderer(CalloutNodeView),
});
const ToggleWithView = Toggle.extend({
  addNodeView: () => ReactNodeViewRenderer(ToggleNodeView),
});
const LinkPreviewWithView = LinkPreview.extend({
  addNodeView: () => ReactNodeViewRenderer(LinkPreviewNodeView),
});
const CodeBlockWithView = CodeBlockHighlight.extend({
  addNodeView: () => ReactNodeViewRenderer(CodeBlockNodeView),
});

export const createArticleEditorExtensions = ({
  placeholder,
  mentionables,
  insertImages,
}: {
  placeholder?: string;
  /** Read when the mention popup opens, so the list can change after the editor is made */
  mentionables: () => MentionItem[];
  insertImages: InsertImages;
}) => {
  const mention = FeedMention.configure({
    suggestion: {
      char: '@',
      items: ({ query }) => {
        const q = query.toLowerCase();
        return mentionables()
          .filter((m) => m.id.toLowerCase().includes(q) || m.label.toLowerCase().includes(q))
          .slice(0, 10);
      },
      render: suggestionPopup(MentionList),
    },
  });

  const extensions = createBaseExtensions({
    placeholder,
    linkClass: 'text-primary underline',
    image: ImageWithView,
    callout: CalloutWithView,
    toggle: ToggleWithView,
    linkPreview: LinkPreviewWithView,
    mention,
    // StarterKit's undo is off in the shared schema (journal undoes through Yjs)
    uiExtensions: [UndoRedo, SlashCommands, ImageFiles.configure({ insert: insertImages })],
  });
  // The code block is configured in the shared extensions: extend it in place so its lowlight carries over
  return extensions.map((ext) =>
    ext.name === CodeBlockHighlight.name ? CodeBlockWithView.configure(ext.options) : ext
  );
};
